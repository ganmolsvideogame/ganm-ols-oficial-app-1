import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getOrderInfo, getPrintableUrl } from "@/lib/superfrete/api";

type RefreshPayload = {
  order_ids?: string[];
};

export async function POST(request: Request) {
  const payload = (await request.json()) as RefreshPayload;
  const orderIds = Array.isArray(payload.order_ids)
    ? payload.order_ids.filter(Boolean)
    : [];

  if (orderIds.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessao expirada" }, { status: 401 });
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, buyer_user_id, seller_user_id, superfrete_id, superfrete_status, superfrete_print_url, superfrete_tracking"
    )
    .in("id", orderIds)
    .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`);

  if (!orders || orders.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;

  for (const order of orders.slice(0, 5)) {
    if (!order.superfrete_id) {
      continue;
    }
    const alreadyReleased =
      order.superfrete_status === "released" &&
      Boolean(order.superfrete_print_url);
    if (alreadyReleased) {
      continue;
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
        .eq("id", order.id);
      updated += 1;
    } catch {
      // Ignore individual refresh errors to avoid blocking others.
    }
  }

  return NextResponse.json({ updated });
}
