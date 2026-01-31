import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  calculateShipping,
  calculateShippingOptions,
} from "@/lib/shipping/superfrete";
import { resolvePackageDimensions } from "@/lib/shipping/presets";

type QuoteRequest = {
  listing_id?: string;
};

function normalizeZipcode(value: string | undefined | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as QuoteRequest;
  const listingId = String(payload.listing_id ?? "").trim();

  if (!listingId) {
    return NextResponse.json({ error: "Anuncio invalido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      "id, price_cents, seller_user_id, shipping_available, free_shipping, family, package_weight_grams, package_length_cm, package_width_cm, package_height_cm"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing) {
    return NextResponse.json({ error: "Anuncio nao encontrado" }, { status: 404 });
  }

  if (listing.shipping_available === false) {
    return NextResponse.json({ error: "Envio indisponivel" }, { status: 400 });
  }

  if (listing.free_shipping) {
    return NextResponse.json({
      shipping_cost_cents: 0,
      service_name: "Frete gratis",
      estimated_days: null,
      is_free: true,
      shipping_options: [],
    });
  }

  const { data: buyerProfile } = await supabase
    .from("profiles")
    .select("zipcode")
    .eq("id", user.id)
    .maybeSingle();

  const buyerZipcode = normalizeZipcode(buyerProfile?.zipcode);
  if (!buyerZipcode || buyerZipcode.length < 8) {
    return NextResponse.json({ error: "Informe seu CEP" }, { status: 400 });
  }

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("zipcode")
    .eq("id", listing.seller_user_id)
    .maybeSingle();

  const sellerZipcode = normalizeZipcode(sellerProfile?.zipcode);
  if (!sellerZipcode || sellerZipcode.length < 8) {
    return NextResponse.json(
      { error: "CEP do vendedor nao configurado" },
      { status: 400 }
    );
  }

  try {
    const dimensions = resolvePackageDimensions({
      family: listing.family,
      package_weight_grams: listing.package_weight_grams,
      package_length_cm: listing.package_length_cm,
      package_width_cm: listing.package_width_cm,
      package_height_cm: listing.package_height_cm,
    });

    const options = await calculateShippingOptions({
      fromZipcode: sellerZipcode,
      toZipcode: buyerZipcode,
      weightGrams: dimensions.weightGrams,
      lengthCm: dimensions.lengthCm,
      widthCm: dimensions.widthCm,
      heightCm: dimensions.heightCm,
      insuranceValueCents: listing.price_cents ?? 0,
    });

    const quote =
      options[0] ??
      (await calculateShipping({
        fromZipcode: sellerZipcode,
        toZipcode: buyerZipcode,
        weightGrams: dimensions.weightGrams,
        lengthCm: dimensions.lengthCm,
        widthCm: dimensions.widthCm,
        heightCm: dimensions.heightCm,
        insuranceValueCents: listing.price_cents ?? 0,
      }));

    return NextResponse.json({
      shipping_cost_cents: quote.priceCents,
      service_id: quote.serviceId,
      service_name: quote.serviceName,
      estimated_days: quote.estimatedDays,
      carrier: quote.carrier,
      is_free: false,
      shipping_options: options.map((option) => ({
        shipping_cost_cents: option.priceCents,
        service_id: option.serviceId,
        service_name: option.serviceName,
        estimated_days: option.estimatedDays,
        carrier: option.carrier,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular frete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

