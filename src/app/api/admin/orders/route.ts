import { NextResponse } from "next/server";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { BUYER_APPROVAL_DAYS } from "@/lib/config/commerce";
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

export async function POST(request: Request) {
  const formData = await request.formData();
  const orderId = String(formData.get("order_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!orderId || !action) {
    return buildRedirect(request, ADMIN_PATHS.orders, {
      error: "Acao invalida",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, ADMIN_PATHS.login, {
      error: "Faca login para acessar o admin",
    });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    return buildRedirect(request, ADMIN_PATHS.login, {
      error: "Sem permissao para acessar o admin",
    });
  }

  let errorMessage: string | null = null;
  let successMessage = "Pedido atualizado";
  let nextStatus = status || "pending";

  if (action === "set_status") {
    const updatePayload: Record<string, string | null> = {
      status: nextStatus,
    };

    if (nextStatus === "shipped") {
      updatePayload.shipping_status = "shipped";
    }
    if (nextStatus === "delivered") {
      const deliveredAt = new Date();
      updatePayload.shipping_status = "delivered";
      updatePayload.delivered_at = deliveredAt.toISOString();
      updatePayload.available_at = new Date(
        deliveredAt.getTime() + BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      updatePayload.buyer_approval_deadline_at = new Date(
        deliveredAt.getTime() + BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
    }
    if (nextStatus === "cancelled" || nextStatus === "canceled") {
      updatePayload.cancel_reason = note || "Cancelamento manual";
    }

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);
    errorMessage = error?.message ?? null;
  } else if (action === "add_event") {
    const { error } = await supabase.from("order_events").insert({
      order_id: orderId,
      status: status || "info",
      note: note || null,
      created_by: user.id,
    });
    errorMessage = error?.message ?? null;
    successMessage = "Evento registrado";
  } else {
    return buildRedirect(request, ADMIN_PATHS.orders, {
      error: "Acao desconhecida",
    });
  }

  if (errorMessage) {
    return buildRedirect(request, ADMIN_PATHS.orders, {
      error: errorMessage,
    });
  }

  if (action === "set_status") {
    await supabase.from("order_events").insert({
      order_id: orderId,
      status: nextStatus,
      note: note || null,
      created_by: user.id,
    });

    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_user_id, seller_user_id, listing_id")
      .eq("id", orderId)
      .maybeSingle();
    const { data: listing } = order?.listing_id
      ? await supabase
          .from("listings")
          .select("title")
          .eq("id", order.listing_id)
          .maybeSingle()
      : { data: null };

    const statusLabels: Record<string, string> = {
      pending: "pendente",
      approved: "aprovado",
      paid: "pago",
      shipped: "enviado",
      delivered: "entregue",
      cancelled: "cancelado",
      canceled: "cancelado",
    };
    const statusLabel = statusLabels[nextStatus] ?? nextStatus;
    const title = listing?.title ?? "pedido";
    const link = order?.listing_id ? `/produto/${order.listing_id}` : null;
    const notifications = [];

    if (order?.buyer_user_id) {
      notifications.push({
        user_id: order.buyer_user_id,
        title: "Atualizacao do pedido",
        body: `Status atualizado para ${statusLabel} em ${title}.`,
        link,
      });
    }
    if (order?.seller_user_id) {
      notifications.push({
        user_id: order.seller_user_id,
        title: "Atualizacao de venda",
        body: `Status atualizado para ${statusLabel} em ${title}.`,
        link,
      });
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  }

  await supabase.from("admin_audit_logs").insert({
    actor_id: user.id,
    action,
    target_type: "order",
    target_id: orderId,
    details: { status, note },
  });

  return buildRedirect(request, ADMIN_PATHS.orders, {
    success: successMessage,
  });
}
