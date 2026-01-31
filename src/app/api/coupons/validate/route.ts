import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type CouponRequest = {
  code?: string;
  listing_id?: string;
};

function normalizeCode(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

export async function POST(request: Request) {
  const payload = (await request.json()) as CouponRequest;
  const code = normalizeCode(payload.code);
  const listingId = String(payload.listing_id ?? "").trim();

  if (!code || !listingId) {
    return NextResponse.json(
      { error: "Informe o cupom e o anuncio." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("price_cents")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing?.price_cents) {
    return NextResponse.json(
      { error: "Anuncio invalido para cupom." },
      { status: 400 }
    );
  }

  const { data: coupon } = await supabase
    .from("coupons")
    .select(
      "id, code, percent_off, amount_off_cents, max_redemptions, redemptions_count, starts_at, ends_at, active"
    )
    .ilike("code", code)
    .maybeSingle();

  if (!coupon || !coupon.active) {
    return NextResponse.json({ error: "Cupom invalido." }, { status: 400 });
  }

  const now = new Date();
  const startsAt = coupon.starts_at ? new Date(coupon.starts_at) : null;
  const endsAt = coupon.ends_at ? new Date(coupon.ends_at) : null;
  if (startsAt && now < startsAt) {
    return NextResponse.json({ error: "Cupom ainda nao iniciou." }, { status: 400 });
  }
  if (endsAt && now > endsAt) {
    return NextResponse.json({ error: "Cupom expirado." }, { status: 400 });
  }

  if (
    typeof coupon.max_redemptions === "number" &&
    typeof coupon.redemptions_count === "number" &&
    coupon.redemptions_count >= coupon.max_redemptions
  ) {
    return NextResponse.json(
      { error: "Cupom esgotado." },
      { status: 400 }
    );
  }

  let discountCents = 0;
  if (typeof coupon.percent_off === "number") {
    discountCents = Math.floor((listing.price_cents * coupon.percent_off) / 100);
  } else if (typeof coupon.amount_off_cents === "number") {
    discountCents = coupon.amount_off_cents;
  }

  discountCents = Math.max(0, Math.min(discountCents, listing.price_cents));

  if (!discountCents) {
    return NextResponse.json({ error: "Cupom invalido." }, { status: 400 });
  }

  return NextResponse.json({
    discount_cents: discountCents,
    message: "Cupom aplicado!",
  });
}
