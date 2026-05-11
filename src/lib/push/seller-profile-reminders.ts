import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { loadEmailAutomationSettings } from "@/lib/automation/email-settings";
import { insertNotificationsWithPush } from "@/lib/push/delivery";
import {
  collectMissingSellerProfileItems,
  readStoreProfileData,
} from "@/lib/store-profile";

type SellerProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  role: string | null;
};

type ReminderEventRow = {
  actor_id: string | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
};

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type SellerProfileReminderResult = {
  processed: number;
  recipients: number;
  notifications: number;
  pushSent: number;
  pushFailed: number;
  skipped: number;
  reason?: string;
  settings?: Awaited<ReturnType<typeof loadEmailAutomationSettings>>;
};

const REMINDER_EVENT_TYPE = "seller_profile_push_sent";

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function hasRecentReminder(
  events: ReminderEventRow[],
  intervalDays: number
) {
  const latest = events
    .map((event) => parseDate(event.created_at))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  if (!latest) {
    return false;
  }

  return Date.now() - latest.getTime() < intervalDays * 24 * 60 * 60 * 1000;
}

function describeMissingItems(items: string[]) {
  if (items.length === 0) {
    return "perfil incompleto";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} e ${items[1]}`;
  }

  return `${items[0]}, ${items[1]} e mais ${items.length - 2} itens`;
}

async function listAuthUsersByIds(
  admin: SupabaseClient,
  userIds: string[]
) {
  const remaining = new Set(userIds.filter(Boolean));
  const users = new Map<string, AuthUserLike>();
  let page = 1;
  const perPage = 1000;

  while (remaining.size > 0) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const items = data.users ?? [];
    if (items.length === 0) {
      break;
    }

    items.forEach((user) => {
      if (!remaining.has(user.id)) {
        return;
      }

      users.set(user.id, {
        id: user.id,
        email: user.email ?? null,
        user_metadata:
          typeof user.user_metadata === "object" && user.user_metadata
            ? (user.user_metadata as Record<string, unknown>)
            : null,
      });
      remaining.delete(user.id);
    });

    if (items.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function emptyResult(): SellerProfileReminderResult {
  return {
    processed: 0,
    recipients: 0,
    notifications: 0,
    pushSent: 0,
    pushFailed: 0,
    skipped: 0,
  };
}

export async function runSellerProfileReminderAutomation(
  admin: SupabaseClient,
  options?: {
    ignoreFrequencyCap?: boolean;
  }
) {
  const settings = await loadEmailAutomationSettings(admin);
  const result = emptyResult();

  if (!settings.sellerProfileReminderEnabled) {
    return {
      ...result,
      skipped: 1,
      reason: "disabled",
      settings,
    };
  }

  const { data: sellersData, error: sellersError } = await admin
    .from("profiles")
    .select(
      "id, display_name, email, phone, address_line1, district, city, state, zipcode, role"
    )
    .eq("role", "seller")
    .order("created_at", { ascending: true });

  if (sellersError) {
    throw sellersError;
  }

  const sellers = (sellersData ?? []) as SellerProfileRow[];
  if (sellers.length === 0) {
    return {
      ...result,
      reason: "no-sellers",
      settings,
    };
  }

  const sellerIds = sellers.map((seller) => seller.id);
  const [{ data: reminderEventsData, error: reminderEventsError }, authUsers] =
    await Promise.all([
      admin
        .from("system_events")
        .select("actor_id, created_at, metadata")
        .eq("event_type", REMINDER_EVENT_TYPE)
        .in("actor_id", sellerIds)
        .order("created_at", { ascending: false }),
      listAuthUsersByIds(admin, sellerIds),
    ]);

  if (reminderEventsError) {
    throw reminderEventsError;
  }

  const eventsBySeller = new Map<string, ReminderEventRow[]>();
  ((reminderEventsData ?? []) as ReminderEventRow[]).forEach((event) => {
    const actorId = String(event.actor_id ?? "").trim();
    if (!actorId) {
      return;
    }
    const current = eventsBySeller.get(actorId) ?? [];
    current.push(event);
    eventsBySeller.set(actorId, current);
  });

  for (const seller of sellers) {
    const authUser = authUsers.get(seller.id);
    const missingItems = collectMissingSellerProfileItems({
      contact: {
        phone: seller.phone,
        addressLine1: seller.address_line1,
        district: seller.district,
        city: seller.city,
        state: seller.state,
        zipcode: seller.zipcode,
      },
      store: readStoreProfileData(authUser?.user_metadata),
    });

    if (missingItems.length === 0) {
      continue;
    }

    const sellerEvents = eventsBySeller.get(seller.id) ?? [];
    if (
      !options?.ignoreFrequencyCap &&
      hasRecentReminder(sellerEvents, settings.sellerProfileReminderIntervalDays)
    ) {
      result.skipped += 1;
      continue;
    }

    const shortMissingList = describeMissingItems(missingItems);
    const title = "Complete seu perfil de vendedor";
    const body = `Faltam ${shortMissingList} para sua loja vender com mais confianca na GANM OLS.`;

    const notificationResult = await insertNotificationsWithPush(admin, {
      user_id: seller.id,
      title,
      body,
      link: "/conta",
      type: "seller_growth",
    });

    const status = notificationResult.error ? "partial" : "success";
    await admin.from("system_events").insert({
      event_type: REMINDER_EVENT_TYPE,
      actor_id: seller.id,
      entity_type: "profile",
      entity_id: seller.id,
      metadata: {
        missing_items: missingItems,
        status,
        notification_error: notificationResult.error?.message ?? null,
        push_result: notificationResult.pushSummary,
        seller_email: seller.email || authUser?.email || null,
      },
    });

    result.processed += 1;
    result.recipients += 1;
    if (!notificationResult.error) {
      result.notifications += 1;
    }
    result.pushSent += notificationResult.pushSummary.sent;
    result.pushFailed += notificationResult.pushSummary.failed;
  }

  return {
    ...result,
    settings,
  };
}
