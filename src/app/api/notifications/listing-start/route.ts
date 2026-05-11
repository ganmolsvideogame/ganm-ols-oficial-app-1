import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/route";

export async function POST() {
  const { supabase } = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") {
    return NextResponse.json({ ok: false, error: "Seller only" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const { data: recentEvent } = await admin
    .from("system_events")
    .select("created_at")
    .eq("event_type", "seller_listing_started")
    .eq("actor_id", user.id)
    .gte("created_at", recentCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentEvent?.created_at) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await admin.from("system_events").insert({
    event_type: "seller_listing_started",
    entity_type: "profile",
    entity_id: user.id,
    actor_id: user.id,
    metadata: {
      source: "seller_form",
      started_at: now.toISOString(),
    },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
