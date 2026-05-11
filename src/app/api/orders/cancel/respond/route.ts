import { NextResponse } from "next/server";

import { createPaymentClient } from "@/lib/mercadopago/client";
import { cancelPayment } from "@/lib/mercadopago/cancel";
import { refundPayment } from "@/lib/mercadopago/refund";
import { cancelLabel } from "@/lib/superfrete/api";
import { sendAdminEventAlertEmail } from "@/lib/brevo/admin-alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

function buildRedirect(request: Request, params?: Record<string, string>) {
  const url = new URL("/vender", request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

function normalizeStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function findLatestPaymentIdByExternalReference(externalReference: string) {
  const ref = String(externalReference ?? "").trim();
  if (!ref) {
    return null;
  }
  try {
    const paymentClient = createPaymentClient();
    const search = (await paymentClient.search({
      options: {
        external_reference: ref,
        sort: "date_created",
        criteria: "desc",
        limit: 10,
        offset: 0,
      },
    })) as { results?: Array<{ id?: unknown }> };
    const results = Array.isArray(search?.results) ? search.results : [];
    const id = results
      .map((item) => String(item?.id ?? "").trim())
      .find(Boolean);
    return id || null;
  } catch {
    return null;
  }
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
    updatePayload.superfrete_tracking = null;
    updatePayload.superfrete_print_url = null;
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

  const notifications = [notifyBuyer, notifySeller].filter(
    (item): item is {
      user_id: string;
      title: string;
      body: string;
      link: string;
    } => Boolean(item)
  );
  if (notifications.length > 0) {
    await insertNotificationsWithPush(admin, notifications);
  }

  try {
    const origin = new URL(request.url).origin;
    const adminAlert = await sendAdminEventAlertEmail({
      admin,
      subject:
        decision === "approve"
          ? `Cancelamento aprovado: ${orderId.slice(0, 8).toUpperCase()}`
          : `Cancelamento rejeitado: ${orderId.slice(0, 8).toUpperCase()}`,
      eyebrow:
        decision === "approve" ? "Cancelamento aprovado" : "Cancelamento rejeitado",
      title:
        decision === "approve"
          ? `Pedido ${orderId.slice(0, 8).toUpperCase()} foi cancelado`
          : `Pedido ${orderId.slice(0, 8).toUpperCase()} segue ativo`,
      intro: "A decisao do vendedor para um pedido importante foi registrada.",
      body: [
        `Pedido: ${orderId}`,
        `Vendedor: ${user.id}`,
        `Comprador: ${String(order.buyer_user_id ?? "Nao informado")}`,
        `Decisao: ${decision === "approve" ? "Aprovar cancelamento" : "Rejeitar cancelamento"}`,
        `Motivo informado: ${reason || "Nao informado"}`,
      ],
      actionLabel: "Abrir pedidos",
      actionPath: "/painel-ganm-ols/pedidos",
      origin,
      tags: ["admin-alert", "order-cancel-response", `decision:${decision}`],
    });

    await admin.from("system_events").insert({
      event_type: "admin_order_cancel_response_email_sent",
      entity_type: "order",
      entity_id: orderId,
      actor_id: user.id,
      metadata: {
        result: adminAlert,
        decision,
        reason,
      },
    });
  } catch (err) {
    console.warn("Admin order cancel response email failed:", err);
  }

  if (decision === "approve") {
    let paymentId = order.mp_payment_id ? String(order.mp_payment_id).trim() : null;
    if (!paymentId) {
      paymentId = await findLatestPaymentIdByExternalReference(orderId);
    }

    if (paymentId) {
      // Safety: if this payment id is shared across multiple orders (cart checkout),
      // avoid auto-refund (would refund the whole payment) and require manual action.
      const { data: sharedOrders } = await admin
        .from("orders")
        .select("id")
        .eq("mp_payment_id", paymentId)
        .limit(3);
      const isShared = (sharedOrders ?? []).length > 1;

      if (isShared) {
        await admin.from("payment_events").insert({
          order_id: orderId,
          provider: "mercadopago",
          event_type: "refund",
          status: "error",
          payload: {
            payment_id: paymentId,
            error:
              "Pagamento compartilhado (carrinho). Reembolso/cancelamento deve ser feito manualmente.",
          },
        });
      } else {
        let paymentStatus: string | null = null;
        try {
          const paymentClient = createPaymentClient();
          const payment = (await paymentClient.get({ id: paymentId })) as {
            status?: unknown;
          };
          paymentStatus = normalizeStatus(payment.status);
        } catch {
          paymentStatus = null;
        }

        const cancelableStatuses = new Set([
          "pending",
          "in_process",
          "in_mediation",
          "authorized",
        ]);

        if (paymentStatus === "approved") {
          const refund = await refundPayment(String(paymentId));
          await admin.from("payment_events").insert({
            order_id: orderId,
            provider: "mercadopago",
            event_type: "refund",
            status: refund.ok ? "success" : "error",
            payload: refund.ok ? refund.data : { error: refund.error },
          });
        } else if (paymentStatus && cancelableStatuses.has(paymentStatus)) {
          const cancel = await cancelPayment(String(paymentId));
          await admin.from("payment_events").insert({
            order_id: orderId,
            provider: "mercadopago",
            event_type: "cancel",
            status: cancel.ok ? "success" : "error",
            payload: cancel.ok ? cancel.data : { error: cancel.error },
          });
        } else if (!paymentStatus) {
          // Best-effort: try cancel first; if that fails, try refund.
          const cancel = await cancelPayment(String(paymentId));
          if (cancel.ok) {
            await admin.from("payment_events").insert({
              order_id: orderId,
              provider: "mercadopago",
              event_type: "cancel",
              status: "success",
              payload: cancel.data,
            });
          } else {
            const refund = await refundPayment(String(paymentId));
            await admin.from("payment_events").insert({
              order_id: orderId,
              provider: "mercadopago",
              event_type: "refund",
              status: refund.ok ? "success" : "error",
              payload: refund.ok ? refund.data : { error: refund.error ?? cancel.error },
            });
          }
        }
      }
    }
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
            superfrete_tracking: null,
            superfrete_print_url: null,
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
