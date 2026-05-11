import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolvePackageDimensions } from "@/lib/shipping/presets";
import {
  checkoutLabel,
  createCartLabel,
  getOrderInfo,
  getPrintLink,
} from "@/lib/superfrete/api";

const DOC_REQUIRED_SERVICES = new Set(["3", "31"]);
const RECREATE_STATUSES = new Set(["canceled", "cancelled", "error"]);

type RefreshableOrder = {
  id: string;
  listing_id?: string | null;
  buyer_user_id?: string | null;
  seller_user_id?: string | null;
  quantity?: number | null;
  shipping_service_id?: string | null;
  superfrete_id?: string | null;
  superfrete_tag_id?: string | null;
  superfrete_status?: string | null;
  superfrete_tracking?: string | null;
  superfrete_print_url?: string | null;
  shipping_status?: string | null;
};

type RefreshResult = {
  ok: boolean;
  message?: string;
  updated: boolean;
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

function isInsufficientBalance(message: string | null) {
  if (!message) {
    return false;
  }
  return (
    message.includes("Sem saldo na carteira") ||
    message.toLowerCase().includes("saldo")
  );
}

function buildReleaseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro ao liberar etiqueta";
}

async function recreateLabel(
  supabase: SupabaseClient,
  order: RefreshableOrder
): Promise<{ id: string; rawCart: Record<string, unknown> | null }> {
  if (!order.listing_id) {
    throw new Error("Pedido sem anuncio para recriar etiqueta.");
  }
  if (!order.buyer_user_id || !order.seller_user_id) {
    throw new Error("Pedido sem comprador ou vendedor para recriar etiqueta.");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "title, price_cents, family, package_weight_grams, package_length_cm, package_width_cm, package_height_cm, shipping_available"
    )
    .eq("id", order.listing_id)
    .maybeSingle();

  if (!listing?.shipping_available) {
    throw new Error("Envio indisponivel para este pedido.");
  }

  if (!order.shipping_service_id) {
    throw new Error("Servico de frete nao informado.");
  }

  const { data: buyerProfile } = await supabase
    .from("profiles")
    .select(
      "zipcode, address_line1, address_line2, district, city, state, phone, display_name, cpf_cnpj"
    )
    .eq("id", order.buyer_user_id)
    .maybeSingle();

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select(
      "zipcode, address_line1, address_line2, district, city, state, phone, display_name"
    )
    .eq("id", order.seller_user_id)
    .maybeSingle();

  const buyerZip = normalizeZipcode(buyerProfile?.zipcode);
  const sellerZip = normalizeZipcode(sellerProfile?.zipcode);
  const buyerDoc = String(buyerProfile?.cpf_cnpj ?? "").trim();
  const serviceId = String(order.shipping_service_id ?? "").trim();
  const requiresDocument = DOC_REQUIRED_SERVICES.has(serviceId);

  if (requiresDocument && !buyerDoc) {
    throw new Error("Documento do comprador obrigatorio.");
  }

  const dimensions = resolvePackageDimensions({
    family: listing.family,
    package_weight_grams: listing.package_weight_grams,
    package_length_cm: listing.package_length_cm,
    package_width_cm: listing.package_width_cm,
    package_height_cm: listing.package_height_cm,
  });

  const payload: Record<string, unknown> = {
    platform: "GANM OLS",
    order: {
      id: order.id,
      description: listing.title || "Pedido GANM OLS",
    },
    service: Number.isFinite(Number(serviceId)) ? Number(serviceId) : serviceId,
    from: {
      name: requireFullName(String(sellerProfile?.display_name ?? ""), "vendedor"),
      phone: String(sellerProfile?.phone ?? "").trim(),
      postal_code: sellerZip,
      address: String(sellerProfile?.address_line1 ?? "").trim(),
      number: extractNumber(String(sellerProfile?.address_line1 ?? "")),
      district: requireDistrict(String(sellerProfile?.district ?? ""), "vendedor"),
      city: String(sellerProfile?.city ?? "").trim(),
      state_abbr: normalizeState(String(sellerProfile?.state ?? "")),
      complement: String(sellerProfile?.address_line2 ?? "").trim() || "",
    },
    to: {
      name: requireFullName(String(buyerProfile?.display_name ?? ""), "comprador"),
      phone: String(buyerProfile?.phone ?? "").trim(),
      postal_code: buyerZip,
      address: String(buyerProfile?.address_line1 ?? "").trim(),
      number: extractNumber(String(buyerProfile?.address_line1 ?? "")),
      district: requireDistrict(String(buyerProfile?.district ?? ""), "comprador"),
      city: String(buyerProfile?.city ?? "").trim(),
      state_abbr: normalizeState(String(buyerProfile?.state ?? "")),
      complement: String(buyerProfile?.address_line2 ?? "").trim() || "",
      document: requiresDocument ? buyerDoc : undefined,
    },
    products: [
      {
        name: listing.title,
        quantity:
          typeof order.quantity === "number" && order.quantity > 0
            ? order.quantity
            : 1,
        unitary_value: (listing.price_cents ?? 0) / 100,
      },
    ],
    volumes: [
      {
        height: dimensions.heightCm,
        width: dimensions.widthCm,
        length: dimensions.lengthCm,
        weight: Math.max(0.01, Number((dimensions.weightGrams / 1000).toFixed(3))),
      },
    ],
    options: requiresDocument ? { non_commercial: true } : undefined,
  };

  const cart = await createCartLabel(payload);
  if (!cart.id) {
    throw new Error("Etiqueta nao criada.");
  }

  return { id: cart.id, rawCart: cart.raw ?? null };
}

export async function refreshOrderSuperfrete(
  supabase: SupabaseClient,
  order: RefreshableOrder
): Promise<RefreshResult> {
  if (!order.superfrete_id && !order.superfrete_tag_id) {
    return {
      ok: false,
      message: "Etiqueta nao configurada para este pedido.",
      updated: false,
    };
  }

  let tagId = order.superfrete_tag_id || order.superfrete_id || null;
  let rawCart: Record<string, unknown> | null = null;
  let info: Awaited<ReturnType<typeof getOrderInfo>> | null = null;
  let releaseError: string | null = null;
  let mustRecreate =
    !tagId ||
    RECREATE_STATUSES.has(String(order.superfrete_status ?? "").toLowerCase());

  if (tagId && !mustRecreate) {
    try {
      info = await getOrderInfo(tagId);
      if (RECREATE_STATUSES.has(String(info.status ?? "").toLowerCase())) {
        mustRecreate = true;
      }
    } catch {
      // If order info fails on stale label, fallback to recreate.
      mustRecreate = true;
    }
  }

  if (mustRecreate) {
    const recreated = await recreateLabel(supabase, order);
    tagId = recreated.id;
    rawCart = recreated.rawCart;
    info = await getOrderInfo(tagId);
    await supabase
      .from("orders")
      .update({
        superfrete_id: tagId,
        superfrete_tag_id: tagId,
        superfrete_status:
          typeof rawCart?.status === "string"
            ? String(rawCart.status)
            : info.status ?? "pending",
        superfrete_raw_cart: rawCart,
        superfrete_last_error: null,
      })
      .eq("id", order.id);
  }

  if (!tagId) {
    return {
      ok: false,
      message: "Etiqueta nao encontrada para atualizacao.",
      updated: false,
    };
  }

  if (!info) {
    info = await getOrderInfo(tagId);
  }

  const shouldTryRelease =
    info.status !== "released" &&
    !info.tracking &&
    !RECREATE_STATUSES.has(String(info.status ?? "").toLowerCase());

  if (shouldTryRelease) {
    try {
      await checkoutLabel({ id: tagId });
      info = await getOrderInfo(tagId);
    } catch (error) {
      releaseError = buildReleaseErrorMessage(error);
      try {
        info = await getOrderInfo(tagId);
      } catch {
        // Keep latest known info.
      }
    }
  }

  const canPrint = info.status === "released" || Boolean(info.tracking);
  const printOverride = canPrint ? await getPrintLink(tagId) : null;
  const printUrl = canPrint ? printOverride?.url || info.printUrl || null : null;
  const trackingCode = info.tracking || null;
  const currentShippingStatus = String(order.shipping_status ?? "").toLowerCase();
  const nextShippingStatus =
    currentShippingStatus === "delivered"
      ? order.shipping_status ?? "delivered"
      : trackingCode
        ? "shipped"
        : order.shipping_status ?? "pending";

  const fallbackStatus = releaseError
    ? isInsufficientBalance(releaseError)
      ? "pending"
      : "error"
    : "pending";

  await supabase
    .from("orders")
    .update({
      superfrete_id: tagId,
      superfrete_tag_id: tagId,
      superfrete_status: info.status ?? fallbackStatus,
      superfrete_tracking: info.tracking,
      superfrete_print_url: printUrl,
      shipping_tracking: trackingCode,
      shipping_status: nextShippingStatus,
      superfrete_raw_info: info.raw,
      superfrete_last_error: releaseError,
    })
    .eq("id", order.id);

  if (releaseError && isInsufficientBalance(releaseError)) {
    return {
      ok: false,
      message:
        "Etiqueta pendente: sem saldo na carteira SuperFrete. Recarregue e tente novamente.",
      updated: true,
    };
  }
  if (releaseError) {
    return {
      ok: false,
      message: `Etiqueta nao liberada: ${releaseError}`,
      updated: true,
    };
  }
  return { ok: true, updated: true };
}
