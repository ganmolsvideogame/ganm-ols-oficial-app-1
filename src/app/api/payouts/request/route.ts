import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUYER_APPROVAL_DAYS } from "@/lib/config/commerce";

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

type OrderRow = {
  id: string;
  amount_cents: number | null;
  fee_cents: number | null;
  approved_at: string | null;
  available_at: string | null;
  delivered_at?: string | null;
  buyer_approval_deadline_at?: string | null;
  created_at: string | null;
  status: string | null;
  payout_status: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para solicitar o saque",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, payout_method")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") {
    return buildRedirect(request, "/vender", {
      error: "Seu perfil nao esta como vendedor",
    });
  }

  if (!profile?.payout_method) {
    return buildRedirect(request, "/vender", {
      error: "Configure o metodo de recebimento antes do saque",
    });
  }

  const admin = createAdminClient();
  const { data: ordersData, error: ordersError } = await admin
    .from("orders")
    .select(
      "id, amount_cents, fee_cents, approved_at, available_at, delivered_at, buyer_approval_deadline_at, created_at, status, payout_status"
    )
    .eq("seller_user_id", user.id)
    .eq("status", "approved");

  if (ordersError) {
    return buildRedirect(request, "/vender", {
      error: ordersError.message,
    });
  }

  const orders = (ordersData ?? []) as OrderRow[];
  const now = new Date();
  const eligibleOrders = orders.filter((order) => {
    if (order.payout_status === "requested" || order.payout_status === "paid") {
      return false;
    }
    const availableAt = order.available_at
      ? new Date(order.available_at)
      : order.buyer_approval_deadline_at
        ? new Date(order.buyer_approval_deadline_at)
        : order.delivered_at
          ? new Date(
              new Date(order.delivered_at).getTime() +
                BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
            )
          : null;
    if (!availableAt) {
      return false;
    }
    return availableAt <= now;
  });

  if (eligibleOrders.length === 0) {
    return buildRedirect(request, "/vender", {
      error: "Sem saldo disponivel para saque",
    });
  }

  const orderIds = eligibleOrders.map((order) => order.id);
  const amountCents = eligibleOrders.reduce((sum, order) => {
    const net = (order.amount_cents ?? 0) - (order.fee_cents ?? 0);
    return sum + Math.max(0, net);
  }, 0);

  const { error: payoutError, data: payoutData } = await admin
    .from("payout_requests")
    .insert({
      seller_user_id: user.id,
      amount_cents: amountCents,
      order_ids: orderIds,
      status: "pending",
    })
    .select("id")
    .single();

  if (payoutError) {
    return buildRedirect(request, "/vender", {
      error: payoutError.message,
    });
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({
      payout_status: "requested",
      payout_requested_at: new Date().toISOString(),
    })
    .in("id", orderIds);

  if (updateError) {
    return buildRedirect(request, "/vender", {
      error: updateError.message,
    });
  }

  return buildRedirect(request, "/vender", {
    success: `Solicitacao enviada (${payoutData?.id ?? "ok"})`,
  });
}
