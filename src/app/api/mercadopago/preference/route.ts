import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createPreferenceClient } from "@/lib/mercadopago/client";
import { getBaseUrl, shouldSendPayerEmail } from "@/lib/mercadopago/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateFeeCents,
  MIN_LISTING_PRICE_CENTS,
} from "@/lib/config/commerce";
import { calculateShipping } from "@/lib/shipping/superfrete";
import { resolvePackageDimensions } from "@/lib/shipping/presets";
import { createCartLabel } from "@/lib/superfrete/api";

const DOC_REQUIRED_SERVICES = new Set(["3", "31"]);

type CouponResult = {
  id: string;
  code: string;
  discountCents: number;
  redemptionsCount: number | null;
};

function normalizeState(value: string) {
  return value.trim().toUpperCase();
}

function requireFullName(value: string, role: string) {
  const cleaned = value.trim();
  if (!cleaned || !cleaned.includes(" ")) {
    throw new Error(`Informe o nome completo do ${role}.`);
  }
  return cleaned;
}

function requireDistrict(value: string, role: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error(`Informe o bairro do ${role}.`);
  }
  return cleaned;
}

function extractNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? match[1] : "";
}

function normalizeZipcode(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeCoupon(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function buildRedirect(request: Request, path: string, params?: Record<string, string>) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

// getBaseUrl handled in lib/mercadopago/env

async function handlePreference(
  request: Request,
  listingId: string,
  shippingServiceIdInput?: string | null,
  couponCodeInput?: string | null
) {
  if (!listingId) {
    return buildRedirect(request, "/buscar", {
      error: "Anuncio invalido",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const productPath = `/produto/${listingId}`;

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para continuar",
      redirect_to: productPath,
    });
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, seller_user_id, status, listing_type, shipping_available, free_shipping, quantity_available, family, package_weight_grams, package_length_cm, package_width_cm, package_height_cm"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing) {
    return buildRedirect(request, productPath, {
      error: "Anuncio nao encontrado",
    });
  }

  if (listing.status !== "active") {
    return buildRedirect(request, productPath, {
      error: "Anuncio indisponivel",
    });
  }

  if (listing.seller_user_id === user.id) {
    return buildRedirect(request, "/checkout", {
      listing_id: listingId,
      error: "Voce nao pode comprar seu proprio anuncio",
    });
  }

  if (listing.listing_type === "auction") {
    return buildRedirect(request, productPath, {
      error: "Este anuncio esta em modo de lances",
    });
  }

  if (!listing.price_cents) {
    return buildRedirect(request, productPath, {
      error: "Preco invalido para este anuncio",
    });
  }

  if (typeof listing.quantity_available === "number" && listing.quantity_available <= 0) {
    return buildRedirect(request, productPath, {
      error: "Estoque indisponivel",
    });
  }

  if (listing.price_cents < MIN_LISTING_PRICE_CENTS) {
    return buildRedirect(request, productPath, {
      error: "Este anuncio esta abaixo do preco minimo permitido",
    });
  }

  const checkoutPath = "/checkout";
  const couponCode = normalizeCoupon(couponCodeInput);
  let coupon: CouponResult | null = null;
  let discountCents = 0;

  if (couponCode) {
    const { data: couponData } = await supabase
      .from("coupons")
      .select(
        "id, code, percent_off, amount_off_cents, max_redemptions, redemptions_count, starts_at, ends_at, active"
      )
      .ilike("code", couponCode)
      .maybeSingle();

    const now = new Date();
    const startsAt = couponData?.starts_at ? new Date(couponData.starts_at) : null;
    const endsAt = couponData?.ends_at ? new Date(couponData.ends_at) : null;
    const isActive = Boolean(couponData?.active);
    const redemptionLimit =
      typeof couponData?.max_redemptions === "number" &&
      typeof couponData?.redemptions_count === "number" &&
      couponData.redemptions_count >= couponData.max_redemptions;

    if (
      !couponData ||
      !isActive ||
      (startsAt && now < startsAt) ||
      (endsAt && now > endsAt) ||
      redemptionLimit
    ) {
      return buildRedirect(request, checkoutPath, {
        listing_id: listingId,
        error: "Cupom invalido ou expirado",
      });
    }

    if (typeof couponData.percent_off === "number") {
      discountCents = Math.floor(
        (listing.price_cents * couponData.percent_off) / 100
      );
    } else if (typeof couponData.amount_off_cents === "number") {
      discountCents = couponData.amount_off_cents;
    }

    discountCents = Math.max(0, Math.min(discountCents, listing.price_cents));
    if (!discountCents) {
      return buildRedirect(request, checkoutPath, {
        listing_id: listingId,
        error: "Cupom invalido",
      });
    }

    coupon = {
      id: couponData.id,
      code: couponData.code,
      discountCents,
      redemptionsCount: couponData.redemptions_count ?? null,
    };
  }

  const discountedPriceCents = Math.max(
    0,
    listing.price_cents - discountCents
  );
  const feeCents = calculateFeeCents(discountedPriceCents);
  const orderId = randomUUID();
  const baseUrl = getBaseUrl(request);
  const buyerZipcode = normalizeZipcode(
    user.user_metadata?.zipcode || user.user_metadata?.cep
  );
  const { data: buyerProfile } = await supabase
    .from("profiles")
    .select(
      "zipcode, address_line1, address_line2, district, city, state, phone, display_name, cpf_cnpj"
    )
    .eq("id", user.id)
    .maybeSingle();

  const buyerZip = normalizeZipcode(buyerProfile?.zipcode || buyerZipcode);
  const buyerAddressLine = String(buyerProfile?.address_line1 ?? "").trim();
  const buyerAddressLine2 = String(buyerProfile?.address_line2 ?? "").trim();
  const buyerDistrict = String(buyerProfile?.district ?? "").trim();
  const buyerCity = String(buyerProfile?.city ?? "").trim();
  const buyerState = String(buyerProfile?.state ?? "").trim();
  const buyerPhone = String(buyerProfile?.phone ?? "").trim();
  const buyerName = String(buyerProfile?.display_name ?? "").trim();
  const buyerDoc = String(buyerProfile?.cpf_cnpj ?? "").trim();
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select(
      "zipcode, address_line1, address_line2, district, city, state, phone, display_name"
    )
    .eq("id", listing.seller_user_id)
    .maybeSingle();

  const sellerZip = normalizeZipcode(sellerProfile?.zipcode);
  const sellerAddressLine = String(sellerProfile?.address_line1 ?? "").trim();
  const sellerAddressLine2 = String(sellerProfile?.address_line2 ?? "").trim();
  const sellerDistrict = String(sellerProfile?.district ?? "").trim();
  const sellerCity = String(sellerProfile?.city ?? "").trim();
  const sellerState = String(sellerProfile?.state ?? "").trim();
  const sellerPhone = String(sellerProfile?.phone ?? "").trim();
  const sellerName = String(sellerProfile?.display_name ?? "").trim();

  let shippingCostCents = 0;
  const normalizedShippingServiceId = String(
    shippingServiceIdInput ?? ""
  ).trim();
  let shippingServiceId: string | null = null;
  let shippingServiceName: string | null = null;
  let shippingEstimatedDays: number | null = null;
  let shippingProvider: string | null = null;
  let shippingPaidBy: "buyer" | "seller" = "buyer";
  let superfreteId: string | null = null;
  let superfreteStatus: string | null = null;
  let superfreteRawCart: Record<string, unknown> | null = null;

  if (listing.shipping_available) {
    if (!buyerAddressLine || !buyerDistrict || !buyerCity || !buyerState) {
      return buildRedirect(request, "/conta", {
        error: "Informe seu endereco completo para continuar",
        redirect_to: productPath,
      });
    }
    if (!buyerZip || buyerZip.length < 8) {
      return buildRedirect(request, "/conta", {
        error: "Informe seu CEP para calcular o frete",
        redirect_to: productPath,
      });
    }
    if (!sellerZip || sellerZip.length < 8) {
      return buildRedirect(request, productPath, {
        error: "CEP do vendedor nao configurado",
      });
    }
    if (!sellerAddressLine || !sellerCity || !sellerState) {
      return buildRedirect(request, "/conta", {
        error: "Endereco do vendedor incompleto",
        redirect_to: productPath,
      });
    }

    const dimensions = resolvePackageDimensions({
      family: listing.family,
      package_weight_grams: listing.package_weight_grams,
      package_length_cm: listing.package_length_cm,
      package_width_cm: listing.package_width_cm,
      package_height_cm: listing.package_height_cm,
    });

    if (listing.free_shipping) {
      shippingPaidBy = "seller";
    }

    try {
      const quote = await calculateShipping({
        fromZipcode: sellerZip,
        toZipcode: buyerZip,
        weightGrams: dimensions.weightGrams,
        lengthCm: dimensions.lengthCm,
        widthCm: dimensions.widthCm,
        heightCm: dimensions.heightCm,
        insuranceValueCents: listing.price_cents ?? 0,
        serviceId: normalizedShippingServiceId || undefined,
      });
      shippingCostCents = quote.priceCents;
      shippingServiceId = quote.serviceId;
      shippingServiceName = quote.serviceName;
      shippingEstimatedDays = quote.estimatedDays;
      shippingProvider = quote.carrier;

      const serviceIdForLabel =
        normalizedShippingServiceId || quote.serviceId || "";
      if (!serviceIdForLabel) {
        throw new Error("Servico de frete nao informado");
      }
      const requiresDocument = DOC_REQUIRED_SERVICES.has(serviceIdForLabel);
      if (requiresDocument && !buyerDoc) {
        throw new Error(
          "Documento do comprador obrigatorio para este servico"
        );
      }

      const fromName = requireFullName(sellerName, "vendedor");
      const toName = requireFullName(buyerName, "comprador");
      const fromDistrict = requireDistrict(sellerDistrict, "vendedor");
      const toDistrict = requireDistrict(buyerDistrict, "comprador");
      const serviceValue = Number(serviceIdForLabel);
      const weightKg = Math.max(
        0.01,
        Number((dimensions.weightGrams / 1000).toFixed(3))
      );

      const cartPayload: Record<string, unknown> = {
        platform: "GANM OLS",
        service: Number.isFinite(serviceValue) ? serviceValue : serviceIdForLabel,
        from: {
          name: fromName,
          phone: sellerPhone,
          postal_code: sellerZip,
          address: sellerAddressLine,
          number: extractNumber(sellerAddressLine),
          district: fromDistrict,
          city: sellerCity,
          state_abbr: normalizeState(sellerState),
          complement: sellerAddressLine2 || "",
        },
        to: {
          name: toName,
          phone: buyerPhone,
          postal_code: buyerZip,
          address: buyerAddressLine,
          number: extractNumber(buyerAddressLine),
          district: toDistrict,
          city: buyerCity,
          state_abbr: normalizeState(buyerState),
          complement: buyerAddressLine2 || "",
          document: requiresDocument ? buyerDoc : undefined,
        },
        products: [
          {
            name: listing.title,
            quantity: 1,
            unitary_value: (listing.price_cents ?? 0) / 100,
          },
        ],
        volumes: [
          {
            height: dimensions.heightCm,
            width: dimensions.widthCm,
            length: dimensions.lengthCm,
            weight: weightKg,
          },
        ],
        options: requiresDocument ? { non_commercial: true } : undefined,
      };

      const cartResult = await createCartLabel(cartPayload);
      if (!cartResult.id) {
        throw new Error("Etiqueta nao criada");
      }

      superfreteId = cartResult.id;
      const rawStatus =
        typeof cartResult.raw?.status === "string"
          ? cartResult.raw.status
          : null;
      superfreteStatus = rawStatus || "pending";
      superfreteRawCart = cartResult.raw ?? null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao calcular frete";
      return buildRedirect(request, productPath, {
        error: message,
      });
    }
  }

  const preferenceItems = [
    {
      id: listing.id,
      title: listing.title,
      quantity: 1,
      currency_id: "BRL",
      unit_price: discountedPriceCents / 100,
    },
  ];

  if (shippingCostCents > 0 && shippingPaidBy === "buyer") {
    preferenceItems.push({
      id: `${listing.id}-shipping`,
      title: `Frete - ${shippingServiceName ?? "Envio"}`,
      quantity: 1,
      currency_id: "BRL",
      unit_price: shippingCostCents / 100,
    });
  }

  const sendPayerEmail = shouldSendPayerEmail();
  const preferencePayload = {
    external_reference: orderId,
    items: preferenceItems,
    payer: sendPayerEmail && user.email ? { email: user.email } : undefined,
    back_urls: {
      success: `${baseUrl}/checkout/retorno?status=approved&order_id=${orderId}`,
      pending: `${baseUrl}/checkout/retorno?status=pending&order_id=${orderId}`,
      failure: `${baseUrl}/checkout/retorno?status=rejected&order_id=${orderId}`,
    },
    auto_return: "approved",
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
    metadata: {
      listing_id: listing.id,
      buyer_id: user.id,
      shipping_cost_cents: shippingCostCents,
      shipping_service_name: shippingServiceName,
      coupon_code: coupon?.code ?? null,
      discount_cents: discountCents,
    },
  };

  const preferenceClient = createPreferenceClient();
  let preferenceResult: {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  try {
    preferenceResult = await preferenceClient.create({
      body: preferencePayload,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao iniciar pagamento";
    return buildRedirect(request, productPath, {
      error: message,
    });
  }

  const initPoint =
    preferenceResult.init_point || preferenceResult.sandbox_init_point;
  if (!initPoint) {
    return buildRedirect(request, productPath, {
      error: "Checkout indisponivel",
    });
  }

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    listing_id: listing.id,
    buyer_user_id: user.id,
    seller_user_id: listing.seller_user_id,
    amount_cents: discountedPriceCents,
    quantity: 1,
    fee_cents: feeCents,
    status: "pending",
    mp_preference_id: preferenceResult.id ?? null,
    shipping_cost_cents: shippingCostCents,
    shipping_service_id: shippingServiceId,
    shipping_service_name: shippingServiceName,
    shipping_estimated_days: shippingEstimatedDays,
    shipping_provider: shippingProvider,
    shipping_paid_by: shippingPaidBy,
    superfrete_id: superfreteId,
    superfrete_tag_id: superfreteId,
    superfrete_status: superfreteStatus,
    superfrete_raw_cart: superfreteRawCart,
  });

  if (orderError) {
    return buildRedirect(request, productPath, {
      error: orderError.message,
    });
  }

  const admin = createAdminClient();
  const notifications = [
    {
      user_id: user.id,
      title: "Compra nao finalizada",
      body: `Finalize sua compra de ${listing.title} no checkout.`,
      link: `/checkout?listing_id=${listing.id}`,
    },
    {
      user_id: listing.seller_user_id,
      title: "Checkout iniciado",
      body: `Um comprador iniciou o checkout de ${listing.title}.`,
      link: `/vender`,
    },
  ];

  const { data: admins } = await admin.from("admins").select("user_id");
  const adminIds = (admins ?? [])
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id));
  adminIds.forEach((adminId) => {
    notifications.push({
      user_id: adminId,
      title: "Checkout iniciado",
      body: `Checkout iniciado para ${listing.title}.`,
      link: `/painel-ganm-ols/controle`,
    });
  });

  await admin.from("notifications").insert(notifications);

  if (coupon) {
    await supabase.from("coupon_redemptions").insert({
      coupon_id: coupon.id,
      user_id: user.id,
      order_id: orderId,
    });
    if (typeof coupon.redemptionsCount === "number") {
      await supabase
        .from("coupons")
        .update({ redemptions_count: coupon.redemptionsCount + 1 })
        .eq("id", coupon.id);
    }
  }

  return NextResponse.redirect(initPoint, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const shippingServiceId = String(
    formData.get("shipping_service_id") ?? ""
  ).trim();
  const couponCode = String(formData.get("coupon_code") ?? "").trim();
  return handlePreference(request, listingId, shippingServiceId, couponCode);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const listingId = String(url.searchParams.get("listing_id") ?? "").trim();
  const shippingServiceId = String(
    url.searchParams.get("shipping_service_id") ?? ""
  ).trim();
  const couponCode = String(url.searchParams.get("coupon_code") ?? "").trim();
  return handlePreference(request, listingId, shippingServiceId, couponCode);
}
