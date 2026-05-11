import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type BrevoAggregatedReport = {
  requests: number;
  delivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
};

type BrevoUserEventsSummary = {
  deliveredUsers: number;
  openedUsers: number;
  clickedUsers: number;
};

type AdminRow = {
  user_id: string | null;
  email: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  address_line1?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  role?: string | null;
};

type ListingRow = {
  seller_user_id: string | null;
};

type BrevoEventRow = {
  email?: string;
  event?: string;
};

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getRangeDays(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
    label: `Ultimos ${days} dias`,
  };
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

async function fetchBrevoJson(path: string) {
  const apiKey = process.env.BREVO_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    headers: {
      "api-key": apiKey,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Brevo report request failed with ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

async function fetchBrevoAggregated(
  tag: string,
  startDate: string,
  endDate: string
) {
  const data = await fetchBrevoJson(
    `/smtp/statistics/aggregatedReport?startDate=${encodeURIComponent(
      startDate
    )}&endDate=${encodeURIComponent(endDate)}&tag=${encodeURIComponent(tag)}`
  );

  return {
    requests: Number(data?.requests ?? 0),
    delivered: Number(data?.delivered ?? 0),
    uniqueOpens: Number(data?.uniqueOpens ?? 0),
    uniqueClicks: Number(data?.uniqueClicks ?? 0),
  } satisfies BrevoAggregatedReport;
}

async function fetchBrevoUniqueUsers(params: {
  tag: string;
  startDate: string;
  endDate: string;
  excludedEmails: Set<string>;
}) {
  const data = await fetchBrevoJson(
    `/smtp/statistics/events?limit=500&startDate=${encodeURIComponent(
      params.startDate
    )}&endDate=${encodeURIComponent(params.endDate)}&tags=${encodeURIComponent(
      params.tag
    )}`
  );

  const events = Array.isArray(data?.events)
    ? (data.events as BrevoEventRow[])
    : [];

  const delivered = new Set<string>();
  const opened = new Set<string>();
  const clicked = new Set<string>();

  for (const row of events) {
    const email = normalizeEmail(row.email);
    if (!email || params.excludedEmails.has(email)) {
      continue;
    }

    if (row.event === "delivered") {
      delivered.add(email);
    }
    if (row.event === "opened") {
      opened.add(email);
    }
    if (row.event === "clicks") {
      clicked.add(email);
    }
  }

  return {
    deliveredUsers: delivered.size,
    openedUsers: opened.size,
    clickedUsers: clicked.size,
  } satisfies BrevoUserEventsSummary;
}

async function loadAdminEmails() {
  const admin = createAdminClient();
  const { data: adminsData } = await admin.from("admins").select("user_id, email");

  const adminRows = (adminsData ?? []) as AdminRow[];
  const adminUserIds = adminRows
    .map((row) => String(row.user_id ?? "").trim())
    .filter(Boolean);

  const adminEmails = new Set<string>();

  adminRows.forEach((row) => {
    const email = normalizeEmail(row.email);
    if (email) {
      adminEmails.add(email);
    }
  });

  if (adminUserIds.length > 0) {
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", adminUserIds);

    (profileRows ?? []).forEach((row) => {
      const email = normalizeEmail((row as ProfileRow).email);
      if (email) {
        adminEmails.add(email);
      }
    });
  }

  return adminEmails;
}

export async function loadSellerFunnelSnapshot(days = 30) {
  const admin = createAdminClient();
  const range = getRangeDays(days);

  const [{ data: sellersData }, { data: listingsData }, { count: paidOrders }, adminEmails] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, email, address_line1, district, city, state, zipcode, role")
        .eq("role", "seller"),
      admin.from("listings").select("seller_user_id"),
      admin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "paid", "shipped", "delivered"]),
      loadAdminEmails(),
    ]);

  const sellers = (sellersData ?? []) as ProfileRow[];
  const listings = (listingsData ?? []) as ListingRow[];

  const sellersWithCompleteAddress = sellers.filter((seller) =>
    [
      seller.address_line1,
      seller.district,
      seller.city,
      seller.state,
      seller.zipcode,
    ].every((value) => String(value ?? "").trim())
  ).length;

  const sellersWithListings = new Set(
    listings
      .map((listing) => String(listing.seller_user_id ?? "").trim())
      .filter(Boolean)
  ).size;

  const [
    lifecycleAggregated,
    lifecycleUsers,
    profileReminderAggregated,
    profileReminderUsers,
  ] = await Promise.all([
    fetchBrevoAggregated("seller-lifecycle", range.startDate, range.endDate),
    fetchBrevoUniqueUsers({
      tag: "seller-lifecycle",
      startDate: range.startDate,
      endDate: range.endDate,
      excludedEmails: adminEmails,
    }),
    fetchBrevoAggregated(
      "seller-profile-reminder",
      range.startDate,
      range.endDate
    ),
    fetchBrevoUniqueUsers({
      tag: "seller-profile-reminder",
      startDate: range.startDate,
      endDate: range.endDate,
      excludedEmails: adminEmails,
    }),
  ]);

  return {
    periodLabel: range.label,
    sellers: sellers.length,
    sellersWithCompleteAddress,
    sellersWithListings,
    paidOrders: paidOrders ?? 0,
    lifecycle: {
      ...lifecycleAggregated,
      ...lifecycleUsers,
    },
    profileReminder: {
      ...profileReminderAggregated,
      ...profileReminderUsers,
    },
  };
}
