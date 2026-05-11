import { NextResponse } from "next/server";

import { getResolvedAffiliateProductBySlug } from "@/lib/affiliate/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyPendingCookies, createRouteClient } from "@/lib/supabase/route";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        slug?: string;
        sessionId?: string;
        path?: string;
      }
    | null;

  const slug = String(payload?.slug ?? "").trim();
  const sessionId = String(payload?.sessionId ?? "").trim();
  const path = String(payload?.path ?? "").trim();

  if (!slug || !sessionId) {
    return NextResponse.json(
      { ok: false, error: "Missing slug or sessionId" },
      { status: 400 }
    );
  }

  const product = await getResolvedAffiliateProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { supabase, pendingCookies } = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("analytics_events").insert({
    event_type: "affiliate_view",
    user_id: user?.id ?? null,
    session_id: sessionId,
    metadata: {
      affiliate_product_slug: product.slug,
      affiliate_product_title: product.title,
      partner_name: product.partnerName,
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
