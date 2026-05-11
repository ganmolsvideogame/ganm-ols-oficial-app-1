import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUYER_APPROVAL_DAYS, CANCEL_REASONS } from "@/lib/config/commerce";
import { createPaymentClient } from "@/lib/mercadopago/client";
import { cancelPayment } from "@/lib/mercadopago/cancel";
import { refundPayment } from "@/lib/mercadopago/refund";
import { cancelLabel } from "@/lib/superfrete/api";
import { sendAdminEventAlertEmail } from "@/lib/brevo/admin-alerts";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

function buildRedirect(request: Request, params?: Record<string, string>) {
  const url = new URL("/compras", request.url);
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
      "id, listing_id, quantity, status, shipping_status, delivered_at, buyer_approval_deadline_at, buyer_user_id, seller_user_id, cancel_status, mp_payment_id, mp_preference_id, superfrete_tag_id, superfrete_id"
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

  if (
    order.status === "cancelled" ||
    order.status === "canceled" ||
    order.cancel_status === "approved"
  ) {
    return buildRedirect(request, { error: "Pedido ja cancelado." });
  }

  // If this order belongs to a cart checkout (multiple orders per payment),
  // we cancel the whole checkout to keep payment/refund consistent.
  const { data: cartCheckout } = await admin
    .from("cart_checkouts")
    .select("id, order_ids, mp_payment_id, mp_preference_id, status")
    .contains("order_ids", [orderId])
    .maybeSingle();

  let paymentId: string | null = order.mp_payment_id
    ? String(order.mp_payment_id).trim()
    : null;

  let orderIds = cartCheckout?.order_ids?.length
    ? cartCheckout.order_ids.map((id: unknown) => String(id))
    : [orderId];

  if (!paymentId && cartCheckout?.mp_payment_id) {
    paymentId = String(cartCheckout.mp_payment_id).trim();
  }

  // Expand to all orders sharing the same Mercado Pago payment id (if available).
  if (paymentId) {
    const { data: siblingOrders } = await admin
      .from("orders")
      .select("id")
      .eq("buyer_user_id", user.id)
      .eq("mp_payment_id", paymentId)
      .limit(50);
    const siblingIds = (siblingOrders ?? []).map((row) => row.id);
    orderIds = Array.from(new Set([...orderIds, ...siblingIds]));
  }

  const { data: ordersData } = await admin
    .from("orders")
    .select(
      "id, listing_id, quantity, status, shipping_status, delivered_at, buyer_approval_deadline_at, buyer_user_id, seller_user_id, cancel_status, mp_payment_id, mp_preference_id, superfrete_tag_id, superfrete_id"
    )
    .in("id", orderIds);
  const orders = (ordersData ?? []).filter(
    (row) => row?.buyer_user_id === user.id
  );

  if (!orders.length) {
    return buildRedirect(request, { error: "Pedido nao encontrado." });
  }

  // Block if any order in this payment/checkout is already shipped (partial refunds not supported).
  for (const candidate of orders) {
    if (candidate.shipping_status === "shipped") {
      return buildRedirect(request, {
        error: "Nao e possivel cancelar apos o envio.",
      });
    }

    if (candidate.shipping_status === "delivered") {
      const deadline = candidate.buyer_approval_deadline_at
        ? new Date(candidate.buyer_approval_deadline_at)
        : candidate.delivered_at
          ? new Date(
              new Date(candidate.delivered_at).getTime() +
                BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
            )
          : null;
      if (!deadline || deadline < new Date()) {
        return buildRedirect(request, {
          error: "Prazo de devolucao expirado.",
        });
      }
    }
  }

  const externalReference = cartCheckout?.id ?? orderId;
  if (!paymentId) {
    paymentId = await findLatestPaymentIdByExternalReference(externalReference);
  }

  const now = new Date();
  const adminReason = reason;
  const updatePayload: Record<string, unknown> = {
    status: "cancelled",
    shipping_status: "cancelled",
    superfrete_tracking: null,
    superfrete_print_url: null,
    cancel_status: "approved",
    cancel_requested_by: "buyer",
    cancel_requested_at: now.toISOString(),
    cancel_response_by: "system",
    cancel_response_at: now.toISOString(),
    cancel_deadline_at: null,
    cancel_reason: adminReason,
  };

  const orderIdsToCancel = orders.map((row) => row.id);
  await admin.from("orders").update(updatePayload).in("id", orderIdsToCancel);

  await admin.from("order_events").insert(
    orders.map((row) => ({
      order_id: row.id,
      status: "cancelled",
      note: adminReason,
      created_by: user.id,
    }))
  );

  // Restore inventory only if we are canceling an order that was already approved.
  const approvedOrders = orders.filter((row) => normalizeStatus(row.status) === "approved");
  if (approvedOrders.length > 0) {
    const listingIds = Array.from(
      new Set(
        approvedOrders
          .map((row) => String(row.listing_id ?? "").trim())
          .filter(Boolean)
      )
    );
    if (listingIds.length > 0) {
      const { data: listingsData } = await admin
        .from("listings")
        .select("id, quantity_available, status")
        .in("id", listingIds);
      const listings = listingsData ?? [];
      const listingMap = new Map(
        listings.map((row) => [row.id, row] as const)
      );
      for (const row of approvedOrders) {
        const listingId = String(row.listing_id ?? "").trim();
        const listing = listingMap.get(listingId);
        if (!listing) {
          continue;
        }
        const currentQuantity =
          typeof listing.quantity_available === "number"
            ? listing.quantity_available
            : 0;
        const restoreQuantity =
          typeof row.quantity === "number" && row.quantity > 0 ? row.quantity : 1;
        const nextQuantity = currentQuantity + restoreQuantity;
        const listingUpdate: Record<string, unknown> = {
          quantity_available: nextQuantity,
        };
        if (nextQuantity > 0 && listing.status === "paused") {
          listingUpdate.status = "active";
        }
        await admin.from("listings").update(listingUpdate).eq("id", listingId);
      }
    }
  }

  const notifications = [];
  for (const row of orders) {
    if (row.buyer_user_id) {
      notifications.push({
        user_id: row.buyer_user_id,
        title: "Pedido cancelado",
        body: "Seu pedido foi cancelado.",
        link: "/compras",
        type: "orders",
      });
    }
    if (row.seller_user_id) {
      notifications.push({
        user_id: row.seller_user_id,
        title: "Pedido cancelado",
        body: "O comprador cancelou o pedido.",
        link: "/vender",
        type: "orders",
      });
    }
  }

  if (notifications.length > 0) {
    await insertNotificationsWithPush(admin, notifications);
  }

  await admin.from("admin_audit_logs").insert({
    actor_id: user.id,
    action: "order_cancelled_by_buyer",
    target_type: "order",
    target_id: orderId,
    details: {
      buyer_user_id: user.id,
      mp_payment_id: paymentId,
      mp_preference_id: order.mp_preference_id ?? cartCheckout?.mp_preference_id ?? null,
      order_ids: orderIdsToCancel,
      reason: adminReason,
    },
  });

  try {
    const origin = new URL(request.url).origin;
    const adminAlert = await sendAdminEventAlertEmail({
      admin,
      subject: `Cancelamento solicitado: ${orderId.slice(0, 8).toUpperCase()}`,
      eyebrow: "Cancelamento solicitado",
      title: `Pedido ${orderId.slice(0, 8).toUpperCase()} cancelado pelo comprador`,
      intro: "Um evento importante de pedido acabou de acontecer na GANM OLS.",
      body: [
        `Pedido: ${orderId}`,
        `Comprador: ${user.id}`,
        `Vendedor: ${String(order.seller_user_id ?? "Nao informado")}`,
        `Motivo: ${adminReason}`,
      ],
      actionLabel: "Abrir pedidos",
      actionPath: "/painel-ganm-ols/pedidos",
      origin,
      tags: ["admin-alert", "order-cancel-request"],
    });

    await admin.from("system_events").insert({
      event_type: "admin_order_cancel_request_email_sent",
      entity_type: "order",
      entity_id: orderId,
      actor_id: user.id,
      metadata: {
        result: adminAlert,
        reason: adminReason,
      },
    });
  } catch (err) {
    console.warn("Admin order cancel request email failed:", err);
  }

  // Mercado Pago: refund if already approved; otherwise cancel the payment (void).
  let paymentStatus: string | null = null;
  let paymentAction: "refund" | "cancel" | null = null;
  let paymentActionOk: boolean | null = null;
  let paymentActionError: string | null = null;
  let paymentActionPayload: unknown = null;

  if (paymentId) {
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
      paymentAction = "refund";
      const refund = await refundPayment(String(paymentId));
      paymentActionOk = refund.ok;
      paymentActionError = refund.ok ? null : refund.error ?? "Erro ao reembolsar";
      paymentActionPayload = refund.ok ? refund.data : { error: refund.error };
    } else if (paymentStatus && cancelableStatuses.has(paymentStatus)) {
      paymentAction = "cancel";
      const cancel = await cancelPayment(String(paymentId));
      paymentActionOk = cancel.ok;
      paymentActionError = cancel.ok ? null : cancel.error ?? "Erro ao cancelar pagamento";
      paymentActionPayload = cancel.ok ? cancel.data : { error: cancel.error };
    } else if (!paymentStatus) {
      // Best-effort: try cancel first; if that fails, try refund.
      paymentAction = "cancel";
      const cancel = await cancelPayment(String(paymentId));
      if (cancel.ok) {
        paymentActionOk = true;
        paymentActionPayload = cancel.data;
      } else {
        const refund = await refundPayment(String(paymentId));
        paymentAction = "refund";
        paymentActionOk = refund.ok;
        paymentActionError = refund.ok ? null : refund.error ?? cancel.error ?? null;
        paymentActionPayload = refund.ok ? refund.data : { error: refund.error ?? cancel.error };
      }
    } else {
      paymentAction = null;
      paymentActionOk = null;
    }

    if (paymentAction) {
      await admin.from("payment_events").insert(
        orders.map((row) => ({
          order_id: row.id,
          provider: "mercadopago",
          event_type: paymentAction,
          status: paymentActionOk ? "success" : "error",
          payload: {
            payment_id: paymentId,
            payment_status: paymentStatus,
            result: paymentActionPayload,
            error: paymentActionOk ? null : paymentActionError,
          },
        }))
      );
    }

    if (paymentActionOk === false) {
      const { data: admins } = await admin.from("admins").select("user_id");
      const adminIds = (admins ?? [])
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id));
      const adminNotifications = adminIds.map((adminId) => ({
        user_id: adminId,
        title: "Reembolso pendente",
        body: `Falha ao ${paymentAction === "refund" ? "reembolsar" : "cancelar"} pagamento do pedido ${orderId.slice(0, 8).toUpperCase()}.`,
        link: "/painel-ganm-ols/pedidos",
        type: "orders",
      }));
      if (adminNotifications.length > 0) {
        await insertNotificationsWithPush(admin, adminNotifications);
      }
    }
  }

  // SuperFrete cancellation per order.
  for (const row of orders) {
    const tagId = row.superfrete_tag_id || row.superfrete_id;
    const shippingBlocked =
      row.shipping_status === "shipped" || row.shipping_status === "delivered";
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
          .eq("id", row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro SuperFrete";
        await admin
          .from("orders")
          .update({
            shipping_cancel_failed: true,
            superfrete_last_error: message,
          })
          .eq("id", row.id);
      }
    } else if (tagId && shippingBlocked) {
      await admin
        .from("orders")
        .update({
          shipping_manual_action: true,
          superfrete_last_error: "Etiqueta ja postada; cancelamento manual.",
        })
        .eq("id", row.id);
    }
  }

  if (cartCheckout?.id) {
    await admin
      .from("cart_checkouts")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartCheckout.id);
  }

  const successMessage =
    paymentActionOk === false
      ? "Pedido cancelado. Reembolso em processamento."
      : "Pedido cancelado.";

  return buildRedirect(request, { success: successMessage });
}
