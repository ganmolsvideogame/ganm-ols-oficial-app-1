import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUYER_APPROVAL_DAYS, CANCEL_REASONS } from "@/lib/config/commerce";
import { refundPayment } from "@/lib/mercadopago/refund";
import { cancelLabel } from "@/lib/superfrete/api";

function buildRedirect(request: Request, params?: Record<string, string>) {
  const url = new URL("/compras", request.url);
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
  const reason = String(formData.get("reason") ?? "").trim();

  if (!orderId) {
    return buildRedirect(request, { error: "Pedido invalido." });
  }

  if (!reason || !CANCEL_REASONS.includes(reason)) {
    return buildRedirect(request, { error: "Selecione um motivo valido." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, { error: "Sessao expirada." });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, status, shipping_status, delivered_at, buyer_approval_deadline_at, buyer_user_id, seller_user_id, cancel_status, mp_payment_id, superfrete_tag_id, superfrete_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return buildRedirect(request, { error: "Pedido nao encontrado." });
  }

  const isBuyer = order.buyer_user_id === user.id;
  if (!isBuyer) {
    return buildRedirect(request, { error: "Sem permissao." });
  }

  if (order.shipping_status === "shipped") {
    return buildRedirect(request, {
      error: "Nao e possivel cancelar apos o envio.",
    });
  }

  if (order.shipping_status === "delivered") {
    const deadline = order.buyer_approval_deadline_at
      ? new Date(order.buyer_approval_deadline_at)
      : order.delivered_at
        ? new Date(
            new Date(order.delivered_at).getTime() +
              BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
          )
        : null;
    if (!deadline || deadline < new Date()) {
      return buildRedirect(request, {
        error: "Prazo de devolucao expirado.",
      });
    }
  }

  if (order.status === "cancelled" || order.status === "canceled") {
    return buildRedirect(request, { error: "Pedido ja cancelado." });
  }

  const now = new Date();
  const adminReason = reason;
  const updatePayload: Record<string, unknown> = {
    status: "cancelled",
    shipping_status: "cancelled",
    cancel_status: "approved",
    cancel_requested_by: "buyer",
    cancel_requested_at: now.toISOString(),
    cancel_response_by: "system",
    cancel_response_at: now.toISOString(),
    cancel_deadline_at: null,
    cancel_reason: adminReason,
  };

  await admin.from("orders").update(updatePayload).eq("id", orderId);

  await admin.from("order_events").insert({
    order_id: orderId,
    status: "cancelled",
    note: adminReason,
    created_by: user.id,
  });

  const notifications = [
    order.buyer_user_id
      ? {
          user_id: order.buyer_user_id,
          title: "Pedido cancelado",
          body: "Seu pedido foi cancelado.",
          link: "/compras",
        }
      : null,
    order.seller_user_id
      ? {
          user_id: order.seller_user_id,
          title: "Pedido cancelado",
          body: "O comprador cancelou o pedido.",
          link: "/vender",
        }
      : null,
  ].filter(Boolean);

  if (notifications.length > 0) {
    await admin.from("notifications").insert(notifications);
  }

  await admin.from("admin_audit_logs").insert({
    actor_id: user.id,
    action: "order_cancelled_by_buyer",
    target_type: "order",
    target_id: orderId,
    details: {
      buyer_user_id: order.buyer_user_id,
      seller_user_id: order.seller_user_id,
      mp_payment_id: order.mp_payment_id,
      reason: adminReason,
    },
  });

  if (order.mp_payment_id) {
    const refund = await refundPayment(String(order.mp_payment_id));
    await admin.from("payment_events").insert({
      order_id: orderId,
      provider: "mercadopago",
      event_type: "refund",
      status: refund.ok ? "success" : "error",
      payload: refund.ok ? refund.data : { error: refund.error },
    });
  }

  const tagId = order.superfrete_tag_id || order.superfrete_id;
  const shippingBlocked =
    order.shipping_status === "shipped" || order.shipping_status === "delivered";
  if (tagId && !shippingBlocked) {
    try {
      const result = await cancelLabel(
        tagId,
        "Cancelamento/Reembolso do pedido no Marketplace"
      );
      await admin
        .from("orders")
        .update({
          superfrete_status: result.status ?? "cancelled",
          shipping_canceled_at: new Date().toISOString(),
          shipping_cancel_failed: false,
          shipping_manual_action: false,
          superfrete_last_error: null,
        })
        .eq("id", orderId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro SuperFrete";
      await admin
        .from("orders")
        .update({
          shipping_cancel_failed: true,
          superfrete_last_error: message,
        })
        .eq("id", orderId);
    }
  } else if (tagId && shippingBlocked) {
    await admin
      .from("orders")
      .update({
        shipping_manual_action: true,
        superfrete_last_error: "Etiqueta ja postada; cancelamento manual.",
      })
      .eq("id", orderId);
  }

  return buildRedirect(request, { success: "Pedido cancelado." });
}
