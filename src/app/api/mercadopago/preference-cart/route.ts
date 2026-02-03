import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createPreferenceClient } from "@/lib/mercadopago/client";
import { getBaseUrl } from "@/lib/mercadopago/env";
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

type ListingCheckout = {
  id: string;
  title: string | null;
  price_cents: number | null;
  status: string | null;
  listing_type: string | null;
  seller_user_id: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  quantity_available: number | null;
  family: string | null;
  package_weight_grams: number | null;
  package_length_cm: number | null;
  package_width_cm: number | null;
  package_height_cm: number | null;
};

type ListingRelation = ListingCheckout | ListingCheckout[] | null;

type CartItemRow = {
  id: string;
  listing_id: string;
  quantity: number | null;
  listings: ListingRelation;
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

function parseShippingServiceIds(formData: FormData) {
  const serviceIdMap = new Map<string, string>();
  for (const [key, value] of formData.entries()) {
    const match = /^shipping_service_id\[(.+)\]$/.exec(key);
    if (match) {
      serviceIdMap.set(match[1], String(value ?? "").trim());
    }
  }
  return serviceIdMap;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const shippingServiceMap = parseShippingServiceIds(formData);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para continuar",
      redirect_to: "/checkout/carrinho",
    });
  }

  const admin = createAdminClient();
  const { data: cart, error: cartError } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cartError || !cart?.id) {
    return buildRedirect(request, "/carrinho", {
      error: "Carrinho nao encontrado",
    });
  }

  const { data: items, error: itemsError } = await admin
    .from("cart_items")
    .select(
      "id, listing_id, quantity, listings(id, title, price_cents, status, listing_type, seller_user_id, shipping_available, free_shipping, quantity_available, family, package_weight_grams, package_length_cm, package_width_cm, package_height_cm)"
    )
    .eq("cart_id", cart.id);

  if (itemsError) {
    return buildRedirect(request, "/carrinho", {
      error: "Nao foi possivel carregar o carrinho",
    });
  }

  const cartItems = (items ?? []) as unknown as CartItemRow[];
  if (cartItems.length === 0) {
    return buildRedirect(request, "/carrinho", {
      error: "Carrinho vazio",
    });
  }

  const normalizedItems = cartItems.map((item) => {
    const listing = Array.isArray(item.listings)
      ? (item.listings[0] ?? null)
      : (item.listings ?? null);
    return {
      ...item,
      listings: listing ? [listing] : null,
    };
  });

  const buyerProfile = await admin
    .from("profiles")
    .select(
      "zipcode, address_line1, address_line2, district, city, state, phone, display_name, cpf_cnpj"
    )
    .eq("id", user.id)
    .maybeSingle();

  const buyer = buyerProfile.data;
  const buyerZip = normalizeZipcode(buyer?.zipcode);
  const buyerAddressLine = String(buyer?.address_line1 ?? "").trim();
  const buyerAddressLine2 = String(buyer?.address_line2 ?? "").trim();
  const buyerDistrict = String(buyer?.district ?? "").trim();
  const buyerCity = String(buyer?.city ?? "").trim();
  const buyerState = String(buyer?.state ?? "").trim();
  const buyerPhone = String(buyer?.phone ?? "").trim();
  const buyerName = String(buyer?.display_name ?? "").trim();
  const buyerDoc = String(buyer?.cpf_cnpj ?? "").trim();

  const preferenceItems: Array<{
    id: string;
    title: string;
    quantity: number;
    currency_id: "BRL";
    unit_price: number;
  }> = [];

  const orderRows: Array<Record<string, unknown>> = [];
  const orderIds: string[] = [];
  let totalCents = 0;
  let shippingTotalCents = 0;

  for (const item of normalizedItems) {
    const listing = item.listings?.[0] ?? null;
    if (!listing) {
      return buildRedirect(request, "/checkout/carrinho", {
        error: "Um anuncio do carrinho foi removido",
      });
    }

    if (listing.status !== "active") {
      return buildRedirect(request, "/checkout/carrinho", {
        error: `Anuncio indisponivel: ${listing.title ?? ""}`.trim(),
      });
    }

    if (listing.listing_type === "auction") {
      return buildRedirect(request, "/checkout/carrinho", {
        error: `Anuncio em modo de lances: ${listing.title ?? ""}`.trim(),
      });
    }

    if (listing.seller_user_id === user.id) {
      return buildRedirect(request, "/checkout/carrinho", {
        error: "Voce nao pode comprar seus proprios anuncios",
      });
    }

    if (!listing.price_cents || listing.price_cents < MIN_LISTING_PRICE_CENTS) {
      return buildRedirect(request, "/checkout/carrinho", {
        error: `Preco invalido para ${listing.title ?? "anuncio"}`,
      });
    }

    const quantity = Math.max(1, item.quantity ?? 1);
    if (
      typeof listing.quantity_available === "number" &&
      listing.quantity_available < quantity
    ) {
      return buildRedirect(request, "/checkout/carrinho", {
        error: `Estoque insuficiente para ${listing.title ?? "anuncio"}`,
      });
    }

    let shippingCostCents = 0;
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
          redirect_to: "/checkout/carrinho",
        });
      }
      if (!buyerZip || buyerZip.length < 8) {
        return buildRedirect(request, "/conta", {
          error: "Informe seu CEP para calcular o frete",
          redirect_to: "/checkout/carrinho",
        });
      }

      const { data: sellerProfile } = await admin
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

      if (!sellerZip || sellerZip.length < 8) {
        return buildRedirect(request, "/checkout/carrinho", {
          error: "CEP do vendedor nao configurado",
        });
      }
      if (!sellerAddressLine || !sellerCity || !sellerState) {
        return buildRedirect(request, "/checkout/carrinho", {
          error: "Endereco do vendedor incompleto",
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

      const selectedServiceId =
        shippingServiceMap.get(listing.id) ?? "";

      if (!listing.free_shipping && !selectedServiceId) {
        return buildRedirect(request, "/checkout/carrinho", {
          error: "Escolha o frete para todos os itens",
        });
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
          serviceId: selectedServiceId || undefined,
        });
        shippingCostCents = quote.priceCents;
        shippingServiceId = quote.serviceId;
        shippingServiceName = quote.serviceName;
        shippingEstimatedDays = quote.estimatedDays;
        shippingProvider = quote.carrier;

        const serviceIdForLabel = selectedServiceId || quote.serviceId || "";
        if (!serviceIdForLabel) {
          throw new Error("Servico de frete nao informado");
        }
        const requiresDocument = DOC_REQUIRED_SERVICES.has(serviceIdForLabel);
        if (requiresDocument && !buyerDoc) {
          throw new Error("Documento do comprador obrigatorio para este servico");
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
              name: listing.title ?? "Produto",
              quantity,
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
        return buildRedirect(request, "/checkout/carrinho", {
          error: message,
        });
      }
    }

    const lineAmountCents = (listing.price_cents ?? 0) * quantity;
    totalCents += lineAmountCents;

    preferenceItems.push({
      id: listing.id,
      title: listing.title ?? "Produto",
      quantity,
      currency_id: "BRL",
      unit_price: (listing.price_cents ?? 0) / 100,
    });

    if (shippingCostCents > 0 && shippingPaidBy === "buyer") {
      shippingTotalCents += shippingCostCents;
      preferenceItems.push({
        id: `${listing.id}-shipping`,
        title: `Frete - ${listing.title ?? "Envio"}`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: shippingCostCents / 100,
      });
    }

    const orderId = randomUUID();
    orderIds.push(orderId);
    orderRows.push({
      id: orderId,
      listing_id: listing.id,
      buyer_user_id: user.id,
      seller_user_id: listing.seller_user_id,
      amount_cents: lineAmountCents,
      quantity,
      fee_cents: calculateFeeCents(lineAmountCents),
      status: "pending",
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
  }

  const cartCheckoutId = randomUUID();
  const baseUrl = getBaseUrl(request);
  const preferencePayload = {
    external_reference: cartCheckoutId,
    items: preferenceItems,
    payer: user.email ? { email: user.email } : undefined,
    back_urls: {
      success: `${baseUrl}/checkout/retorno?status=approved&order_id=${cartCheckoutId}`,
      pending: `${baseUrl}/checkout/retorno?status=pending&order_id=${cartCheckoutId}`,
      failure: `${baseUrl}/checkout/retorno?status=rejected&order_id=${cartCheckoutId}`,
    },
    auto_return: "approved",
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
    metadata: {
      cart_checkout_id: cartCheckoutId,
      buyer_id: user.id,
      shipping_total_cents: shippingTotalCents,
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
    return buildRedirect(request, "/checkout/carrinho", {
      error: message,
    });
  }

  const initPoint =
    preferenceResult.init_point || preferenceResult.sandbox_init_point;
  if (!initPoint) {
    return buildRedirect(request, "/checkout/carrinho", {
      error: "Checkout indisponivel",
    });
  }

  const { error: ordersError } = await admin.from("orders").insert(orderRows);
  if (ordersError) {
    return buildRedirect(request, "/checkout/carrinho", {
      error: ordersError.message,
    });
  }

  await admin.from("cart_checkouts").insert({
    id: cartCheckoutId,
    buyer_user_id: user.id,
    status: "pending",
    total_cents: totalCents + shippingTotalCents,
    shipping_total_cents: shippingTotalCents,
    order_ids: orderIds,
    mp_preference_id: preferenceResult.id ?? null,
  });

  await admin
    .from("orders")
    .update({ mp_preference_id: preferenceResult.id ?? null })
    .in("id", orderIds);

  return NextResponse.redirect(initPoint, { status: 303 });
}
