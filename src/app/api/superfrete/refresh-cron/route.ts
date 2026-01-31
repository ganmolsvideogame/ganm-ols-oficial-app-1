import { NextResponse } from "next/server";

import { refundPayment } from "@/lib/mercadopago/refund";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelLabel, getOrderInfo, getPrintLink } from "@/lib/superfrete/api";

const REFRESH_SECRET = process.env.SUPERFRETE_REFRESH_SECRET;

export async function POST(request: Request) {
  if (!REFRESH_SECRET) {
    return NextResponse.json(
      { error: "Missing SUPERFRETE_REFRESH_SECRET" },
      { status: 500 }
    );
  }

  const token = request.headers.get("x-refresh-token") ?? "";
  if (token !== REFRESH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, status, shipping_status, shipping_post_deadline_at, superfrete_id, superfrete_tag_id, superfrete_status, superfrete_print_url, mp_payment_id, buyer_user_id, seller_user_id, listing_id"
    )
    .eq("status", "approved")
    .not("superfrete_id", "is", null)
    .or("superfrete_status.neq.released,superfrete_print_url.is.null")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!orders || orders.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;

  const now = new Date();

  for (const order of orders) {
    if (!order.superfrete_id) {
      continue;
    }
    try {
      const info = await getOrderInfo(order.superfrete_id);
      const printOverride =
        info.status === "released"
          ? await getPrintLink(order.superfrete_id)
          : null;
      const printUrl = printOverride?.url || info.printUrl;
      await admin
        .from("orders")
        .update({
          superfrete_status: info.status ?? "pending",
          superfrete_tracking: info.tracking,
          superfrete_print_url: printUrl,
          superfrete_raw_info: info.raw,
        })
        .eq("id", order.id);
      updated += 1;
    } catch {
      // Ignore individual errors to keep the batch running.
    }

  }

  const { data: expiredPostOrders } = await admin
    .from("orders")
    .select(
      "id, shipping_post_deadline_at, superfrete_id, superfrete_tag_id, mp_payment_id, buyer_user_id, seller_user_id"
    )
    .eq("status", "approved")
    .eq("shipping_status", "pending")
    .not("shipping_post_deadline_at", "is", null)
    .lte("shipping_post_deadline_at", now.toISOString())
    .limit(20);

  if (expiredPostOrders && expiredPostOrders.length > 0) {
    for (const order of expiredPostOrders) {
      const tagId = order.superfrete_tag_id || order.superfrete_id;
      if (tagId) {
        try {
          await cancelLabel(tagId, "Prazo de postagem expirado");
        } catch {
          // Ignore cancel errors; refund should still proceed.
        }
      }
      let refundResult: { ok: boolean; status: number; data?: unknown; error?: string } | null =
        null;
      if (order.mp_payment_id) {
        refundResult = await refundPayment(String(order.mp_payment_id));
        await admin.from("payment_events").insert({
          order_id: order.id,
          provider: "mercadopago",
          event_type: "refund",
          status: refundResult.ok ? "success" : "error",
          payload: refundResult.ok
            ? refundResult.data
            : { error: refundResult.error },
        });
      }
      await admin
        .from("orders")
        .update({
          status: "cancelled",
          shipping_status: "cancelled",
          cancel_status: "approved",
          cancel_reason: "Prazo de postagem expirado",
          cancel_requested_by: "system",
          cancel_requested_at: now.toISOString(),
          cancel_response_by: "system",
          cancel_response_at: now.toISOString(),
          shipping_canceled_at: now.toISOString(),
        })
        .eq("id", order.id);
      await admin.from("order_events").insert({
        order_id: order.id,
        status: "cancelled",
        note: "Cancelamento automatico por prazo de postagem expirado.",
        created_by: null,
      });
      const notifications = [];
      if (order.buyer_user_id) {
        notifications.push({
          user_id: order.buyer_user_id,
          title: "Pedido cancelado",
          body: "Cancelamento automatico por prazo de postagem expirado.",
          link: "/compras",
        });
      }
      if (order.seller_user_id) {
        notifications.push({
          user_id: order.seller_user_id,
          title: "Pedido cancelado",
          body: "Cancelamento automatico por prazo de postagem expirado.",
          link: "/vender",
        });
      }
      if (notifications.length > 0) {
        await admin.from("notifications").insert(notifications);
      }
    }
  }

  return NextResponse.json({ updated, autoCancelled: expiredPostOrders?.length ?? 0 });
}
