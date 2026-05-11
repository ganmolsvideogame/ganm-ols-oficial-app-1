import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendBrevoEmail } from "@/lib/brevo/client";
import { buildAbandonedCartEmail } from "@/lib/brevo/templates";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

type CartRow = {
  id: string;
  user_id: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CartItemListing = {
  title: string | null;
};

type CartItemRow = {
  cart_id: string;
  quantity: number | null;
  updated_at: string | null;
  listings: CartItemListing | CartItemListing[] | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type CartCheckoutRow = {
  buyer_user_id: string;
  status: string | null;
  created_at: string | null;
};

type SystemEventRow = {
  entity_id: string | null;
  created_at: string | null;
};

function normalizeBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.ganmols.com"
  );
}

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

function normalizeDelayHours(value: string | undefined) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

function normalizeLimit(value: number | undefined) {
  return Number.isFinite(value) && value && value > 0 ? value : 20;
}

export async function sendBrevoAbandonedCartEmails(
  admin: SupabaseClient,
  options?: { delayHours?: number; limit?: number; notificationsEnabled?: boolean }
) {
  const delayHours =
    options?.delayHours ??
    normalizeDelayHours(process.env.BREVO_ABANDONED_CART_DELAY_HOURS);
  const limit = normalizeLimit(options?.limit);
  const notificationsEnabled = options?.notificationsEnabled ?? true;
  const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000);

  const { data: cartsData } = await admin
    .from("carts")
    .select("id, user_id, status, created_at, updated_at")
    .eq("status", "open")
    .lte("updated_at", cutoff.toISOString())
    .order("updated_at", { ascending: true })
    .limit(limit * 3);

  const carts = (cartsData ?? []) as CartRow[];
  if (carts.length === 0) {
    return { processed: 0, sent: 0 };
  }

  const cartIds = carts.map((cart) => cart.id);
  const buyerIds = Array.from(new Set(carts.map((cart) => cart.user_id)));

  const [{ data: itemsData }, { data: profilesData }, { data: checkoutsData }, { data: eventsData }] =
    await Promise.all([
      admin
        .from("cart_items")
        .select("cart_id, quantity, updated_at, listings(title)")
        .in("cart_id", cartIds),
      admin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", buyerIds),
      admin
        .from("cart_checkouts")
        .select("buyer_user_id, status, created_at")
        .in("buyer_user_id", buyerIds)
        .order("created_at", { ascending: false }),
      admin
        .from("system_events")
        .select("entity_id, created_at")
        .eq("event_type", "abandoned_cart_email_sent")
        .eq("entity_type", "cart")
        .in("entity_id", cartIds),
    ]);

  const items = (itemsData ?? []) as CartItemRow[];
  const profiles = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );
  const checkouts = (checkoutsData ?? []) as CartCheckoutRow[];
  const recentCheckoutMap = new Map<string, CartCheckoutRow[]>();
  for (const checkout of checkouts) {
    const current = recentCheckoutMap.get(checkout.buyer_user_id) ?? [];
    current.push(checkout);
    recentCheckoutMap.set(checkout.buyer_user_id, current);
  }
  const sentEventsMap = new Map<string, Date[]>();
  for (const event of (eventsData ?? []) as SystemEventRow[]) {
    if (!event.entity_id) {
      continue;
    }
    const createdAt = parseDate(event.created_at);
    if (!createdAt) {
      continue;
    }
    const current = sentEventsMap.get(event.entity_id) ?? [];
    current.push(createdAt);
    sentEventsMap.set(event.entity_id, current);
  }

  const itemsByCart = new Map<string, CartItemRow[]>();
  for (const item of items) {
    const current = itemsByCart.get(item.cart_id) ?? [];
    current.push(item);
    itemsByCart.set(item.cart_id, current);
  }

  let processed = 0;
  let sent = 0;

  for (const cart of carts) {
    if (sent >= limit) {
      break;
    }

    const cartItems = itemsByCart.get(cart.id) ?? [];
    if (cartItems.length === 0) {
      continue;
    }

    const cartUpdatedAt = parseDate(cart.updated_at) || parseDate(cart.created_at);
    const itemDates = cartItems
      .map((item) => parseDate(item.updated_at))
      .filter((date): date is Date => Boolean(date));
    const lastActivity = new Date(
      Math.max(
        cartUpdatedAt?.getTime() ?? 0,
        ...itemDates.map((date) => date.getTime())
      )
    );

    if (lastActivity > cutoff) {
      continue;
    }

    const profile = profiles.get(cart.user_id);
    const email = String(profile?.email ?? "").trim().toLowerCase();
    if (!email) {
      continue;
    }

    const hasRecentCheckout = (recentCheckoutMap.get(cart.user_id) ?? []).some(
      (checkout) => {
        const checkoutDate = parseDate(checkout.created_at);
        const status = String(checkout.status ?? "").toLowerCase();
        return (
          Boolean(checkoutDate) &&
          checkoutDate!.getTime() >= lastActivity.getTime() &&
          (status === "pending" || status === "approved")
        );
      }
    );

    if (hasRecentCheckout) {
      continue;
    }

    const alreadySentAfterLastActivity = (sentEventsMap.get(cart.id) ?? []).some(
      (date) => date.getTime() >= lastActivity.getTime()
    );
    if (alreadySentAfterLastActivity) {
      continue;
    }

    const listingTitles = cartItems
      .map((item) => {
        const listing = Array.isArray(item.listings)
          ? (item.listings[0] ?? null)
          : item.listings;
        return String(listing?.title ?? "").trim();
      })
      .filter(Boolean);
    const totalItems = cartItems.reduce(
      (sum, item) => sum + Math.max(1, item.quantity ?? 1),
      0
    );

    const template = buildAbandonedCartEmail({
      displayName: profile?.display_name ?? "",
      itemCount: totalItems,
      listingTitles,
      actionUrl: new URL("/carrinho", normalizeBaseUrl()).toString(),
    });

    const result = await sendBrevoEmail({
      to: [{ email, name: profile?.display_name || undefined }],
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      tags: ["abandoned-cart", "buyer"],
    });

    await admin.from("system_events").insert({
      event_type: "abandoned_cart_email_sent",
      entity_type: "cart",
      entity_id: cart.id,
      actor_id: cart.user_id,
      metadata: {
        email,
        item_count: totalItems,
        last_activity_at: lastActivity.toISOString(),
        result,
      },
    });

    processed += 1;

    if (result.ok) {
      if (notificationsEnabled) {
        await insertNotificationsWithPush(admin, {
          user_id: cart.user_id,
          title: "Seu carrinho continua ativo",
          body: "Seus itens seguem disponiveis para concluir a compra.",
          link: "/carrinho",
          type: "orders",
        });
      }
      sent += 1;
    }
  }

  return { processed, sent };
}
