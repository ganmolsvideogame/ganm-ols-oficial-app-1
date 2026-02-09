import { NextResponse } from "next/server";

import { getBaseUrl, getMercadoPagoAccessToken } from "@/lib/mercadopago/env";
import { createAdminClient } from "@/lib/supabase/admin";

type PaymentSearchResponse = {
  results?: Array<{ id?: number | string }>;
};

async function fetchPaymentsByPreference(preferenceId: string) {
  const accessToken = getMercadoPagoAccessToken();
  const url = new URL("https://api.mercadopago.com/v1/payments/search");
  url.searchParams.set("preference_id", preferenceId);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as PaymentSearchResponse;
  const results = Array.isArray(data.results) ? data.results : [];
  return results
    .map((item) => (item?.id ? String(item.id) : ""))
    .filter(Boolean);
}

async function reconcilePreference(
  baseUrl: string,
  preferenceId: string
): Promise<number> {
  const paymentIds = await fetchPaymentsByPreference(preferenceId);
  let processed = 0;
  for (const paymentId of paymentIds) {
    await fetch(`${baseUrl}/api/mercadopago/webhook?id=${paymentId}`, {
      method: "GET",
      cache: "no-store",
    });
    processed += 1;
  }
  return processed;
}

export async function GET(request: Request) {
  const admin = createAdminClient();
  const baseUrl = getBaseUrl(request);
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id")?.trim() || null;
  const preferenceIdParam = url.searchParams.get("preference_id")?.trim() || null;

  const preferences = new Set<string>();

  if (orderId) {
    const { data: order } = await admin
      .from("orders")
      .select("mp_preference_id")
      .eq("id", orderId)
      .maybeSingle();
    if (order?.mp_preference_id) {
      preferences.add(order.mp_preference_id);
    }
  } else if (preferenceIdParam) {
    preferences.add(preferenceIdParam);
  } else {
    const { data: orders } = await admin
      .from("orders")
      .select("mp_preference_id")
      .eq("status", "pending")
      .not("mp_preference_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(25);
    (orders ?? []).forEach((order) => {
      if (order.mp_preference_id) {
        preferences.add(order.mp_preference_id);
      }
    });

    const { data: cartCheckouts } = await admin
      .from("cart_checkouts")
      .select("mp_preference_id")
      .eq("status", "pending")
      .not("mp_preference_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(25);
    (cartCheckouts ?? []).forEach((checkout) => {
      if (checkout.mp_preference_id) {
        preferences.add(checkout.mp_preference_id);
      }
    });
  }

  let processed = 0;
  for (const preferenceId of preferences) {
    processed += await reconcilePreference(baseUrl, preferenceId);
  }

  return NextResponse.json({
    ok: true,
    preferences: Array.from(preferences),
    processed,
  });
}
