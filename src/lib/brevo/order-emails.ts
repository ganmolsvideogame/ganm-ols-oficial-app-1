import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendBrevoEmail } from "@/lib/brevo/client";
import { sendAdminPurchaseAlertEmail } from "@/lib/brevo/admin-alerts";
import {
  buildOrderApprovedEmail,
  buildShippingLabelReadyEmail,
  buildTrackingAvailableEmail,
} from "@/lib/brevo/templates";
import { buildSuperfretePrintUrl } from "@/lib/superfrete/print-url";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

type OrderEmailRow = {
  id: string;
  buyer_user_id: string | null;
  seller_user_id: string | null;
  listing_id: string | null;
  amount_cents?: number | null;
  quantity?: number | null;
};

type OrderShippingEmailRow = OrderEmailRow & {
  shipping_tracking?: string | null;
  superfrete_tracking?: string | null;
  shipping_status?: string | null;
  superfrete_id?: string | null;
  superfrete_status?: string | null;
  superfrete_print_url?: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
};

type BrevoEventType =
  | "payment_email_buyer"
  | "payment_email_seller"
  | "payment_email_admin"
  | "shipping_label_seller"
  | "tracking_buyer";

function normalizeBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000"
  );
}

async function persistBrevoEvent(params: {
  admin: SupabaseClient;
  orderId: string;
  eventType: BrevoEventType;
  status: "success" | "error" | "skipped";
  payload: Record<string, unknown>;
}) {
  await params.admin.from("payment_events").insert({
    order_id: params.orderId,
    provider: "brevo",
    event_type: params.eventType,
    status: params.status,
    payload: params.payload,
  });
}

function buildMaps(params: {
  profiles: ProfileRow[];
  listings: ListingRow[];
}) {
  return {
    profileMap: new Map(params.profiles.map((profile) => [profile.id, profile])),
    listingMap: new Map(params.listings.map((listing) => [listing.id, listing])),
  };
}

async function loadOrderContext(
  admin: SupabaseClient,
  orders: Array<{ buyer_user_id: string | null; seller_user_id: string | null; listing_id: string | null }>
) {
  const profileIds = Array.from(
    new Set(
      orders
        .flatMap((order) => [order.buyer_user_id, order.seller_user_id])
        .filter((value): value is string => Boolean(value))
    )
  );
  const listingIds = Array.from(
    new Set(
      orders
        .map((order) => order.listing_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: profilesData } = profileIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", profileIds)
    : { data: [] };
  const { data: listingsData } = listingIds.length
    ? await admin.from("listings").select("id, title").in("id", listingIds)
    : { data: [] };

  return buildMaps({
    profiles: (profilesData ?? []) as ProfileRow[],
    listings: (listingsData ?? []) as ListingRow[],
  });
}

function getTrackingCode(order: OrderShippingEmailRow) {
  const shippingTracking = String(order.shipping_tracking ?? "").trim();
  if (shippingTracking) {
    return shippingTracking;
  }
  const superfreteTracking = String(order.superfrete_tracking ?? "").trim();
  return superfreteTracking || null;
}

function getPrintUrl(order: OrderShippingEmailRow) {
  return (
    buildSuperfretePrintUrl(order.superfrete_id) ||
    String(order.superfrete_print_url ?? "").trim() ||
    null
  );
}

async function loadExistingBrevoEvents(
  admin: SupabaseClient,
  orderIds: string[],
  eventTypes: BrevoEventType[]
) {
  const { data } = await admin
    .from("payment_events")
    .select("order_id, event_type")
    .eq("provider", "brevo")
    .eq("status", "success")
    .in("event_type", eventTypes)
    .in("order_id", orderIds);

  return new Set((data ?? []).map((row) => `${row.order_id}:${row.event_type}`));
}

async function loadExistingOrderEvents(
  admin: SupabaseClient,
  orderIds: string[],
  statuses: string[]
) {
  const { data } = await admin
    .from("order_events")
    .select("order_id, status")
    .in("order_id", orderIds)
    .in("status", statuses);

  return new Set((data ?? []).map((row) => `${row.order_id}:${row.status}`));
}

export async function sendBrevoApprovedOrderEmails(
  admin: SupabaseClient,
  orders: OrderEmailRow[]
) {
  if (orders.length === 0) {
    return;
  }

  const orderIds = orders.map((order) => order.id);
  const existingEventKeys = await loadExistingBrevoEvents(
    admin,
    orderIds,
    ["payment_email_buyer", "payment_email_seller", "payment_email_admin"]
  );

  const { profileMap, listingMap } = await loadOrderContext(admin, orders);
  const baseUrl = normalizeBaseUrl();

  for (const order of orders) {
    const listingTitle =
      (order.listing_id ? listingMap.get(order.listing_id)?.title : null) ||
      "seu pedido";

    const buyerProfile = order.buyer_user_id
      ? profileMap.get(order.buyer_user_id)
      : null;
    const sellerProfile = order.seller_user_id
      ? profileMap.get(order.seller_user_id)
      : null;

    const recipients: Array<{
      eventType: BrevoEventType;
      role: "buyer" | "seller";
      profile: ProfileRow | null | undefined;
      actionUrl: string;
    }> = [
      {
        eventType: "payment_email_buyer",
        role: "buyer",
        profile: buyerProfile,
        actionUrl: new URL(`/compras/${order.id}`, baseUrl).toString(),
      },
      {
        eventType: "payment_email_seller",
        role: "seller",
        profile: sellerProfile,
        actionUrl: new URL(`/vender/vendas/${order.id}`, baseUrl).toString(),
      },
    ];

    for (const recipient of recipients) {
      const eventKey = `${order.id}:${recipient.eventType}`;
      if (existingEventKeys.has(eventKey)) {
        continue;
      }

      const email = String(recipient.profile?.email ?? "").trim().toLowerCase();
      if (!email) {
        await persistBrevoEvent({
          admin,
          orderId: order.id,
          eventType: recipient.eventType,
          status: "skipped",
          payload: {
            reason: "missing_recipient_email",
            role: recipient.role,
          },
        });
        continue;
      }

      const template = buildOrderApprovedEmail({
        displayName: recipient.profile?.display_name ?? "",
        listingTitle,
        orderId: order.id,
        actionUrl: recipient.actionUrl,
        role: recipient.role,
      });

      const result = await sendBrevoEmail({
        to: [
          {
            email,
            name: recipient.profile?.display_name || undefined,
          },
        ],
        subject: template.subject,
        htmlContent: template.html,
        textContent: template.text,
        tags: ["order-approved", `role:${recipient.role}`],
      });

      await persistBrevoEvent({
        admin,
        orderId: order.id,
        eventType: recipient.eventType,
        status: result.ok ? "success" : result.skipped ? "skipped" : "error",
        payload: {
          role: recipient.role,
          result,
        },
      });
    }

    const adminEventKey = `${order.id}:payment_email_admin`;
    if (!existingEventKeys.has(adminEventKey)) {
      const adminResult = await sendAdminPurchaseAlertEmail({
        admin,
        orderId: order.id,
        listingTitle,
        buyerName: buyerProfile?.display_name,
        buyerEmail: buyerProfile?.email,
        sellerName: sellerProfile?.display_name,
        sellerEmail: sellerProfile?.email,
        amountCents: order.amount_cents ?? null,
        quantity: order.quantity ?? 1,
        origin: baseUrl,
      });

      await persistBrevoEvent({
        admin,
        orderId: order.id,
        eventType: "payment_email_admin",
        status: adminResult.ok
          ? "success"
          : adminResult.skipped
            ? "skipped"
            : "error",
        payload: {
          result: adminResult,
        },
      });
    }
  }
}

export async function sendBrevoShippingUpdateEmails(
  admin: SupabaseClient,
  orders: OrderShippingEmailRow[]
) {
  if (orders.length === 0) {
    return;
  }

  const orderIds = orders.map((order) => order.id);
  const existingBrevoEventKeys = await loadExistingBrevoEvents(admin, orderIds, [
    "shipping_label_seller",
    "tracking_buyer",
  ]);
  const existingOrderEventKeys = await loadExistingOrderEvents(admin, orderIds, [
    "shipping_label_ready",
    "tracking_available",
  ]);
  const { profileMap, listingMap } = await loadOrderContext(admin, orders);
  const baseUrl = normalizeBaseUrl();

  for (const order of orders) {
    const listingTitle =
      (order.listing_id ? listingMap.get(order.listing_id)?.title : null) ||
      "seu pedido";
    const sellerProfile = order.seller_user_id
      ? profileMap.get(order.seller_user_id)
      : null;
    const buyerProfile = order.buyer_user_id
      ? profileMap.get(order.buyer_user_id)
      : null;

    const printUrl = getPrintUrl(order);
    const trackingCode = getTrackingCode(order);
    const sellerActionUrl = new URL(`/vender/vendas/${order.id}`, baseUrl).toString();
    const buyerActionUrl = new URL(`/compras/${order.id}`, baseUrl).toString();

    if (
      printUrl &&
      String(order.superfrete_status ?? "").toLowerCase() === "released" &&
      !existingBrevoEventKeys.has(`${order.id}:shipping_label_seller`)
    ) {
      const sellerEmail = String(sellerProfile?.email ?? "").trim().toLowerCase();
      if (!sellerEmail) {
        await persistBrevoEvent({
          admin,
          orderId: order.id,
          eventType: "shipping_label_seller",
          status: "skipped",
          payload: { reason: "missing_seller_email" },
        });
      } else {
        const template = buildShippingLabelReadyEmail({
          displayName: sellerProfile?.display_name ?? "",
          listingTitle,
          orderId: order.id,
          actionUrl: sellerActionUrl,
          printUrl,
        });
        const result = await sendBrevoEmail({
          to: [{ email: sellerEmail, name: sellerProfile?.display_name || undefined }],
          subject: template.subject,
          htmlContent: template.html,
          textContent: template.text,
          tags: ["shipping-label", "seller"],
        });

        await persistBrevoEvent({
          admin,
          orderId: order.id,
          eventType: "shipping_label_seller",
          status: result.ok ? "success" : result.skipped ? "skipped" : "error",
          payload: { result, print_url: printUrl },
        });

        if (result.ok) {
          if (!existingOrderEventKeys.has(`${order.id}:shipping_label_ready`)) {
            await admin.from("order_events").insert({
              order_id: order.id,
              status: "shipping_label_ready",
              note: "Etiqueta liberada para impressao.",
              created_by: null,
            });
            existingOrderEventKeys.add(`${order.id}:shipping_label_ready`);
          }
          if (order.seller_user_id) {
            await insertNotificationsWithPush(admin, {
              user_id: order.seller_user_id,
              title: "Etiqueta liberada",
              body: `A etiqueta de ${listingTitle} ja pode ser impressa.`,
              link: `/vender/vendas/${order.id}`,
              type: "orders",
            });
          }
          existingBrevoEventKeys.add(`${order.id}:shipping_label_seller`);
        }
      }
    }

    if (trackingCode && !existingBrevoEventKeys.has(`${order.id}:tracking_buyer`)) {
      const buyerEmail = String(buyerProfile?.email ?? "").trim().toLowerCase();
      if (!buyerEmail) {
        await persistBrevoEvent({
          admin,
          orderId: order.id,
          eventType: "tracking_buyer",
          status: "skipped",
          payload: { reason: "missing_buyer_email" },
        });
      } else {
        const template = buildTrackingAvailableEmail({
          displayName: buyerProfile?.display_name ?? "",
          listingTitle,
          orderId: order.id,
          trackingCode,
          actionUrl: buyerActionUrl,
        });
        const result = await sendBrevoEmail({
          to: [{ email: buyerEmail, name: buyerProfile?.display_name || undefined }],
          subject: template.subject,
          htmlContent: template.html,
          textContent: template.text,
          tags: ["tracking", "buyer"],
        });

        await persistBrevoEvent({
          admin,
          orderId: order.id,
          eventType: "tracking_buyer",
          status: result.ok ? "success" : result.skipped ? "skipped" : "error",
          payload: { result, tracking_code: trackingCode },
        });

        if (result.ok) {
          if (!existingOrderEventKeys.has(`${order.id}:tracking_available`)) {
            await admin.from("order_events").insert({
              order_id: order.id,
              status: "tracking_available",
              note: `Codigo de rastreio disponivel: ${trackingCode}.`,
              created_by: null,
            });
            existingOrderEventKeys.add(`${order.id}:tracking_available`);
          }
          if (order.buyer_user_id) {
            await insertNotificationsWithPush(admin, {
              user_id: order.buyer_user_id,
              title: "Rastreio disponivel",
              body: `Seu pedido de ${listingTitle} agora possui rastreio.`,
              link: `/compras/${order.id}`,
              type: "orders",
            });
          }
          existingBrevoEventKeys.add(`${order.id}:tracking_buyer`);
        }
      }
    }
  }
}
