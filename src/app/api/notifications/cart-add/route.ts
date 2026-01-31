import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  if (adminIds.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const buyerLabel = profile?.display_name || profile?.email || "Um usuario";
  const title = "Item adicionado ao carrinho";
  const bodyText = listing?.title
    ? `${buyerLabel} adicionou ${listing.title} ao carrinho.`
    : `${buyerLabel} adicionou um item ao carrinho.`;

  const notifications = adminIds.map((adminId) => ({
    user_id: adminId,
    title,
    body: bodyText,
    link: listing?.id ? `/produto/${listing.id}` : null,
    type: "carts",
  }));

  const { error: insertError } = await admin
    .from("notifications")
    .insert(notifications);

  if (insertError) {
    const fallbackNotifications = adminIds.map((adminId) => ({
      user_id: adminId,
      title,
      body: bodyText,
      link: listing?.id ? `/produto/${listing.id}` : null,
    }));
    await admin.from("notifications").insert(fallbackNotifications);
  }

  return NextResponse.json({ ok: true });
}
