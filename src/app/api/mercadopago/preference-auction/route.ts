import { NextResponse } from "next/server";

import { createPreferenceClient } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function buildRedirect(
  request: Request,
  path: string,
  params?: Record<string, string>
) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

function getBaseUrl(request: Request) {
  const envBaseUrl = process.env.APP_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl;
  }
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || url.host;
  return `${proto}://${host}`;
}

async function handlePreferenceAuction(request: Request, orderId: string) {
  if (!orderId) {
    return buildRedirect(request, "/compras", {
      error: "Pedido invalido",
    });
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const checkoutPath = `/checkout/lances?order_id=${orderId}`;

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para continuar",
      redirect_to: checkoutPath,
    });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select(
      "id, amount_cents, status, buyer_user_id, seller_user_id, payment_deadline_at, mp_preference_id, listings(id, title, listing_type, status)"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return buildRedirect(request, "/compras", {
      error: "Pedido nao encontrado",
    });
  }

  if (order.buyer_user_id !== user.id) {
    return buildRedirect(request, "/compras", {
      error: "Sem permissao para este pedido",
    });
  }

  const listing = order.listings?.[0] ?? null;

  if (!listing || listing.listing_type !== "auction") {
    return buildRedirect(request, "/compras", {
      error: "Este pedido nao e de lances",
    });
  }

  if (order.status && order.status !== "pending") {
    return buildRedirect(request, "/compras", {
      status: order.status,
      order_id: orderId,
    });
  }

  if (!order.amount_cents || order.amount_cents <= 0) {
    return buildRedirect(request, "/compras", {
      error: "Valor invalido para pagamento",
    });
  }

  if (order.payment_deadline_at) {
    const deadline = new Date(order.payment_deadline_at);
    if (!Number.isNaN(deadline.getTime()) && deadline <= new Date()) {
      return buildRedirect(request, "/compras", {
        error: "O prazo de pagamento deste pedido expirou",
      });
    }
  }

  const baseUrl = getBaseUrl(request);
  const preferencePayload = {
    external_reference: order.id,
    items: [
      {
        id: listing.id ?? order.id,
        title: listing.title ?? "Lances vencidos",
        quantity: 1,
        currency_id: "BRL",
        unit_price: order.amount_cents / 100,
      },
    ],
    payer: user.email ? { email: user.email } : undefined,
    back_urls: {
      success: `${baseUrl}/checkout/retorno?status=approved&order_id=${order.id}`,
      pending: `${baseUrl}/checkout/retorno?status=pending&order_id=${order.id}`,
      failure: `${baseUrl}/checkout/retorno?status=rejected&order_id=${order.id}`,
    },
    auto_return: "approved",
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
    metadata: {
      order_id: order.id,
      listing_id: listing.id ?? null,
      buyer_id: user.id,
      flow: "auction_payment",
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
    return buildRedirect(request, checkoutPath, {
      error: message,
    });
  }

  const initPoint =
    preferenceResult.init_point || preferenceResult.sandbox_init_point;
  if (!initPoint) {
    return buildRedirect(request, checkoutPath, {
      error: "Checkout indisponivel",
    });
  }

  await admin
    .from("orders")
    .update({ mp_preference_id: preferenceResult.id ?? order.mp_preference_id })
    .eq("id", order.id);

  const notifications = [
    {
      user_id: user.id,
      title: "Pagamento iniciado",
      body: `Finalize o pagamento do pedido ${order.id}.`,
      link: checkoutPath,
    },
    {
      user_id: order.seller_user_id,
      title: "Pagamento iniciado",
      body: `O comprador iniciou o pagamento do pedido ${order.id}.`,
      link: "/vender",
    },
  ];

  const { data: admins } = await admin.from("admins").select("user_id");
  const adminIds = (admins ?? [])
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id));
  adminIds.forEach((adminId) => {
    notifications.push({
      user_id: adminId,
      title: "Pagamento iniciado",
      body: `Pagamento iniciado para o pedido ${order.id}.`,
      link: "/painel-ganm-ols/controle",
    });
  });

  await admin.from("notifications").insert(notifications);

  return NextResponse.redirect(initPoint, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const orderId = String(formData.get("order_id") ?? "").trim();
  return handlePreferenceAuction(request, orderId);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = String(url.searchParams.get("order_id") ?? "").trim();
  return handlePreferenceAuction(request, orderId);
}
