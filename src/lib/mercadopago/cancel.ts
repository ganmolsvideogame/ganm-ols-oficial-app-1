import "server-only";

import { createPaymentClient } from "@/lib/mercadopago/client";
import { buildIdempotencyKey } from "@/lib/mercadopago/idempotency";

type CancelResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function cancelPayment(
  paymentId: string,
  options?: { idempotencyKey?: string }
): Promise<CancelResult> {
  try {
    const paymentClient = createPaymentClient();
    const response = await paymentClient.cancel({
      id: paymentId,
      requestOptions: {
        idempotencyKey:
          options?.idempotencyKey ??
          buildIdempotencyKey(`mp:cancel:${String(paymentId)}`),
      },
    });

    return { ok: true, status: 200, data: response };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: serializeError(error),
    };
  }
}

