import { NextResponse } from "next/server";

import { refundPayment } from "@/lib/mercadopago/refund";
import { cancelLabel } from "@/lib/superfrete/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function buildRedirect(request: Request, params?: Record<string, string>) {
  const url = new URL("/vender", request.url);
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
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!orderId || !decision) {
    return buildRedirect(request, { error: "Acao invalida." });
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
      "id, status, shipping_status, buyer_user_id, seller_user_id, cancel_status, cancel_requested_by, mp_payment_id, superfrete_id, superfrete_tag_id, superfrete_status"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return buildRedirect(request, { error: "Pedido nao encontrado." });
  }

  if (order.cancel_status !== "requested") {
    return buildRedirect(request, { error: "Nao ha cancelamento pendente." });
  }

  const requestedBy = order.cancel_requested_by;
  const isBuyer = order.buyer_user_id === user.id;
  const isSeller = order.seller_user_id === user.id;
  const canRespond =
    (requestedBy === "buyer" && isSeller) ||
    (requestedBy === "seller" && isBuyer);

  if (!canRespond) {
    return buildRedirect(request, { error: "Sem permissao." });
  }

  if (
    order.shipping_status === "shipped" ||
    order.shipping_status === "delivered"
  ) {
    return buildRedirect(request, {
      error: "Nao e possivel cancelar apos o envio.",
    });
  }

  const responseAt = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    cancel_response_by: isBuyer ? "buyer" : "seller",
    cancel_response_at: responseAt,
    cancel_response_reason: reason || null,
  };

  if (decision === "approve") {
    updatePayload.cancel_status = "approved";
    updatePayload.status = "cancelled";
    updatePayload.shipping_status = "cancelled";
  } else if (decision === "reject") {
    updatePayload.cancel_status = "rejected";
  } else {
    return buildRedirect(request, { error: "Acao invalida." });
  }

  await admin.from("orders").update(updatePayload).eq("id", orderId);

  await admin.from("order_events").insert({
    order_id: orderId,
    status: decision === "approve" ? "cancelled" : "cancel_rejected",
    note: reason || null,
    created_by: user.id,
  });

  const notifyBuyer = order.buyer_user_id
    ? {
        user_id: order.buyer_user_id,
        title:
          decision === "approve"
            ? "Cancelamento aprovado"
            : "Cancelamento rejeitado",
        body:
          decision === "approve"
            ? "Seu pedido foi cancelado."
            : "O cancelamento foi rejeitado.",
        link: "/compras",
      }
    : null;
  const notifySeller = order.seller_user_id
    ? {
        user_id: order.seller_user_id,
        title:
          decision === "approve"
            ? "Cancelamento aprovado"
            : "Cancelamento rejeitado",
        body:
          decision === "approve"
            ? "O pedido foi cancelado."
            : "O cancelamento foi rejeitado.",
        link: "/vender",
      }
    : null;

  const notifications = [notifyBuyer, notifySeller].filter(Boolean);
  if (notifications.length > 0) {
    await admin.from("notifications").insert(notifications);
  }

  if (decision === "approve" && order.mp_payment_id) {
    const refund = await refundPayment(String(order.mp_payment_id));
    await admin.from("payment_events").insert({
      order_id: orderId,
      provider: "mercadopago",
      event_type: "refund",
      status: refund.ok ? "success" : "error",
      payload: refund.ok ? refund.data : { error: refund.error },
    });
  }

  if (decision === "approve") {
    const tagId = order.superfrete_tag_id || order.superfrete_id;
    const shippingBlocked =
      order.shipping_status === "shipped" ||
      order.shipping_status === "delivered";
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
        const message =
          error instanceof Error ? error.message : "Erro SuperFrete";
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
  }

  return buildRedirect(request, {
    success: decision === "approve" ? "Pedido cancelado." : "Cancelamento rejeitado.",
  });
}
