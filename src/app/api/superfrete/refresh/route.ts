import { NextResponse } from "next/server";

import { sendBrevoShippingUpdateEmails } from "@/lib/brevo/order-emails";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { refreshOrderSuperfrete } from "@/lib/superfrete/refresh";

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
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, { error: "Sessao expirada" });
  }

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, seller_user_id, listing_id, buyer_user_id, quantity, shipping_service_id, shipping_status, shipping_tracking, superfrete_id, superfrete_tag_id, superfrete_status, superfrete_tracking, superfrete_print_url"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.seller_user_id !== user.id) {
    return buildRedirect(request, { error: "Pedido nao encontrado" });
  }

  try {
    const result = await refreshOrderSuperfrete(admin, order);
    const { data: refreshedOrder } = await admin
      .from("orders")
      .select(
        "id, buyer_user_id, seller_user_id, listing_id, shipping_status, shipping_tracking, superfrete_id, superfrete_status, superfrete_tracking, superfrete_print_url"
      )
      .eq("id", orderId)
      .maybeSingle();
    if (refreshedOrder) {
      await sendBrevoShippingUpdateEmails(admin, [refreshedOrder]);
    }
    if (!result.ok && result.message) {
      return buildRedirect(request, { error: result.message });
    }
    return buildRedirect(request, { success: "Etiqueta atualizada" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro SuperFrete";
    return buildRedirect(request, { error: message });
  }
}
