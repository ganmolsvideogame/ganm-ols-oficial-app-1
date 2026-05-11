import "server-only";

import { getMercadoPagoAccessToken } from "@/lib/mercadopago/env";
import { buildIdempotencyKey } from "@/lib/mercadopago/idempotency";

type RefundResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export async function refundPayment(
  paymentId: string,
  options?: { idempotencyKey?: string }
): Promise<RefundResult> {
  let accessToken = "";
  try {
    accessToken = getMercadoPagoAccessToken();
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Missing MERCADOPAGO_ACCESS_TOKEN.",
    };
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key":
          options?.idempotencyKey ??
          buildIdempotencyKey(`mp:refund:${String(paymentId)}`),
      },
    }
  );

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: typeof data === "string" ? data : JSON.stringify(data),
    };
  }

  return { ok: true, status: response.status, data };
}
