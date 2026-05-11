import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { applyPendingCookies, createRouteClient } from "@/lib/supabase/route";

const RECENT_VIEW_WINDOW_MS = 6 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        listingId?: string;
        sessionId?: string;
        path?: string;
      }
    | null;

  const listingId = String(payload?.listingId ?? "").trim();
  const sessionId = String(payload?.sessionId ?? "").trim();
  const path = String(payload?.path ?? "").trim();

  if (!listingId || !sessionId) {
    return NextResponse.json(
      { ok: false, error: "Missing listingId or sessionId" },
      { status: 400 }
    );
  }

  const { supabase, pendingCookies } = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const recentCutoff = new Date(
    Date.now() - RECENT_VIEW_WINDOW_MS
  ).toISOString();

  const [{ data: listing }, { data: recentView }] = await Promise.all([
    admin
      .from("listings")
      .select("id, status")
      .eq("id", listingId)
      .maybeSingle(),
    admin
      .from("analytics_events")
      .select("id")
      .eq("event_type", "listing_view")
      .eq("listing_id", listingId)
      .eq("session_id", sessionId)
      .gte("created_at", recentCutoff)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!listing || listing.status !== "active") {
    const response = NextResponse.json({ ok: true, skipped: true });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  if (recentView?.id) {
    const response = NextResponse.json({ ok: true, skipped: true });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  const { error } = await admin.from("analytics_events").insert({
    event_type: "listing_view",
    user_id: user?.id ?? null,
    listing_id: listingId,
    session_id: sessionId,
    metadata: {
      path: path.startsWith("/") ? path : null,
      source: "product_page",
    },
  });

  const response = error
    ? NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    : NextResponse.json({ ok: true });

  applyPendingCookies(response, pendingCookies);
  return response;
}
