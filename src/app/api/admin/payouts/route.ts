import { NextResponse } from "next/server";

import { ADMIN_PATHS } from "@/lib/config/admin";
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

export async function POST(request: Request) {
  const formData = await request.formData();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();

  if (!requestId || !action) {
    return buildRedirect(request, ADMIN_PATHS.dashboard, {
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

  const admin = createAdminClient();
  const { data: payoutRequest, error } = await admin
    .from("payout_requests")
    .select("order_ids")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !payoutRequest) {
    return buildRedirect(request, ADMIN_PATHS.dashboard, {
      error: "Solicitacao nao encontrada",
    });
  }

  const orderIds = (payoutRequest.order_ids ?? []) as string[];
  const nowIso = new Date().toISOString();

  if (action === "paid") {
    await admin
      .from("payout_requests")
      .update({ status: "paid", paid_at: nowIso })
      .eq("id", requestId);

    if (orderIds.length > 0) {
      await admin
        .from("orders")
        .update({ payout_status: "paid", payout_paid_at: nowIso })
        .in("id", orderIds);
    }
  } else if (action === "reject") {
    await admin
      .from("payout_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (orderIds.length > 0) {
      await admin
        .from("orders")
        .update({ payout_status: "hold", payout_requested_at: null })
        .in("id", orderIds);
    }
  } else {
    return buildRedirect(request, ADMIN_PATHS.dashboard, {
      error: "Acao desconhecida",
    });
  }

  return buildRedirect(request, ADMIN_PATHS.dashboard, {
    success: "Solicitacao atualizada",
  });
}
