import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getOrderInfo, getPrintableUrl } from "@/lib/superfrete/api";

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

  if (!orderId) {
    return buildRedirect(request, { error: "Pedido invalido" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, { error: "Sessao expirada" });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, seller_user_id, superfrete_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.seller_user_id !== user.id) {
    return buildRedirect(request, { error: "Pedido nao encontrado" });
  }

  if (!order.superfrete_id) {
    return buildRedirect(request, { error: "Etiqueta nao configurada" });
  }

  try {
    const info = await getOrderInfo(order.superfrete_id);
    const printOverride =
      info.status === "released"
        ? await getPrintableUrl(order.superfrete_id)
        : null;
    const printUrl = printOverride?.url || info.printUrl;
    await supabase
      .from("orders")
      .update({
        superfrete_status: info.status ?? "pending",
        superfrete_tracking: info.tracking,
        superfrete_print_url: printUrl,
        superfrete_raw_info: info.raw,
      })
      .eq("id", orderId);
    return buildRedirect(request, { success: "Etiqueta atualizada" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro SuperFrete";
    return buildRedirect(request, { error: message });
  }
}
