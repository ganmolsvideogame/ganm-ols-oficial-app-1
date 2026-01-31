import "server-only";
import { randomUUID } from "crypto";

type RefundResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export async function refundPayment(paymentId: string): Promise<RefundResult> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      ok: false,
      status: 500,
      error: "Missing MERCADOPAGO_ACCESS_TOKEN.",
    };
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": randomUUID(),
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
