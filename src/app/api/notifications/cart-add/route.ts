import { NextResponse } from "next/server";

import { sendBrevoEmail } from "@/lib/brevo/client";
import { buildCartAlertEmail } from "@/lib/brevo/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { listing_id?: string }
    | null;
  const listingId = String(body?.listing_id ?? "").trim();

  if (!listingId) {
    return NextResponse.json({ error: "Listing id required" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, seller_user_id")
    .eq("id", listingId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const admin = createAdminClient();
  const { data: admins } = await admin.from("admins").select("user_id, email");
  const directAdminIds = (admins ?? [])
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id));

  const adminEmails = (admins ?? [])
    .map((row) => row.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));

  let emailResolvedIds: string[] = [];
  if (adminEmails.length > 0) {
    const orFilters = adminEmails.map((email) => `email.ilike.${email}`).join(",");
    const { data: profilesByEmail } = await admin
      .from("profiles")
      .select("id, email")
      .or(orFilters);

    const emailSet = new Set(adminEmails);
    emailResolvedIds = (profilesByEmail ?? [])
      .filter((row) => emailSet.has(String(row.email ?? "").toLowerCase()))
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id));
  }

  const adminIds = Array.from(new Set([...directAdminIds, ...emailResolvedIds]));
  const profileAdminEmails =
    adminIds.length > 0
      ? (
          await admin
            .from("profiles")
            .select("email")
            .in("id", adminIds)
        ).data ?? []
      : [];
  const targetAdminEmails = Array.from(
    new Set(
      [
        ...adminEmails,
        ...profileAdminEmails
          .map((row) => String(row.email ?? "").trim().toLowerCase())
          .filter((value): value is string => Boolean(value)),
      ].filter(Boolean)
    )
  );

  const buyerLabel = profile?.display_name || profile?.email || "Um usuario";
  const title = "Item adicionado ao carrinho";
  const bodyText = listing?.title
    ? `${buyerLabel} adicionou ${listing.title} ao carrinho.`
    : `${buyerLabel} adicionou um item ao carrinho.`;

  const { error: analyticsError } = await admin.from("analytics_events").insert({
    event_type: "add_to_cart",
    user_id: user.id,
    listing_id: listingId,
    metadata: {
      listing_title: listing?.title ?? null,
      seller_user_id: listing?.seller_user_id ?? null,
      actor_label: buyerLabel,
      actor_email: profile?.email ?? user.email ?? null,
      source: "cart_button",
      path: `/produto/${listingId}`,
    },
  });

  if (analyticsError) {
    console.warn("cart-add analytics insert failed:", analyticsError.message);
  }

  if (adminIds.length > 0) {
    const notifications = adminIds.map((adminId) => ({
      user_id: adminId,
      title,
      body: bodyText,
      link: listing?.id ? `/produto/${listing.id}` : null,
      type: "carts",
    }));

    await insertNotificationsWithPush(admin, notifications);
  }

  const baseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    new URL(request.url).origin;
  const productUrl = listing?.id
    ? new URL(`/produto/${listing.id}`, baseUrl).toString()
    : baseUrl;
  const brevoTemplate = buildCartAlertEmail({
    buyerLabel,
    listingTitle: listing?.title ?? "um item",
    actionUrl: productUrl,
  });
  const brevoResult = await sendBrevoEmail({
    to: targetAdminEmails.map((email) => ({ email })),
    subject: brevoTemplate.subject,
    htmlContent: brevoTemplate.html,
    textContent: brevoTemplate.text,
    tags: ["cart-alert", "admin"],
  });

  if (!brevoResult.ok && !brevoResult.skipped) {
    console.warn("Brevo cart alert failed:", brevoResult.error ?? "unknown");
  }

  return NextResponse.json({ ok: true });
}
