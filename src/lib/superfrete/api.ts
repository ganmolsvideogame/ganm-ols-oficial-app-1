import { SuperFreteError, superfreteFetch } from "@/lib/superfrete/client";

type QuotePayload = {
  from: { postal_code: string };
  to: { postal_code: string };
  services: string;
  options?: Record<string, unknown>;
  package: {
    weight: number;
    height: number;
    width: number;
    length: number;
  };
};

export async function quoteFreight(payload: QuotePayload) {
  const result = await superfreteFetch("/api/v0/calculator", {
    method: "POST",
    body: payload,
  });
  return result.data;
}

export async function createCartLabel(payload: Record<string, unknown>) {
  const result = await superfreteFetch("/api/v0/cart", {
    method: "POST",
    body: payload,
  });
  const data = result.data as Record<string, unknown> | null;
  const id =
    typeof data?.id === "number"
      ? String(data.id)
      : typeof data?.id === "string"
        ? data.id
        : null;
  return { id, raw: data };
}

export async function checkoutLabel({ id }: { id: string }) {
  const attempts = [{ id }, { order_id: id }, { orders: [id] }];
  let lastError: unknown = null;
  for (const payload of attempts) {
    try {
      const result = await superfreteFetch("/api/v0/checkout", {
        method: "POST",
        body: payload,
      });
      return { raw: result.data };
    } catch (error) {
      lastError = error;
      if (!(error instanceof SuperFreteError)) {
        break;
      }
      if (error.status !== 400 && error.status !== 422) {
        break;
      }
    }
  }
  throw lastError;
}

export async function getOrderInfo(id: string) {
  const result = await superfreteFetch(`/api/v0/order/info/${id}`, {
    method: "GET",
  });
  const data = result.data as Record<string, unknown> | null;
  const tracking =
    typeof data?.tracking === "string"
      ? data.tracking
      : typeof data?.tracking_code === "string"
        ? data.tracking_code
        : null;
  const printUrl =
    typeof (data?.print as Record<string, unknown> | undefined)?.url === "string"
      ? String((data?.print as Record<string, unknown>).url)
      : typeof data?.print_url === "string"
        ? data.print_url
        : null;
  const status = typeof data?.status === "string" ? data.status : null;
  return { tracking, printUrl, status, raw: data };
}

export async function printTags({ orders }: { orders: string[] }) {
  const result = await superfreteFetch("/api/v0/tag/print", {
    method: "POST",
    body: { orders },
  });
  const data = result.data as Record<string, unknown> | null;
  const url =
    typeof data?.url === "string"
      ? data.url
      : typeof (data?.print as Record<string, unknown> | undefined)?.url ===
          "string"
        ? String((data?.print as Record<string, unknown>).url)
        : null;
  return { url, raw: data };
}

export async function getPrintLink(tagId: string) {
  const printed = await printTags({ orders: [tagId] });
  if (printed.url) {
    return { url: printed.url, raw: printed.raw };
  }
  const info = await getOrderInfo(tagId);
  return { url: info.printUrl, raw: info.raw };
}

export async function getPrintableUrl(orderId: string) {
  return getPrintLink(orderId);
}

export async function cancelLabel(tagId: string, reason: string) {
  const attempts = [
    { id: tagId, reason },
    { id: tagId, motivo: reason },
    { order: tagId, reason },
    { order: tagId, motivo: reason },
  ];
  let lastError: unknown = null;
  for (const payload of attempts) {
    try {
      const result = await superfreteFetch("/api/v0/order/cancel", {
        method: "POST",
        body: payload,
      });
      const data = result.data as Record<string, unknown> | null;
      const status = typeof data?.status === "string" ? data.status : null;
      return { status, raw: data };
    } catch (error) {
      lastError = error;
      if (!(error instanceof SuperFreteError)) {
        break;
      }
      if (error.status !== 400 && error.status !== 422) {
        break;
      }
    }
  }
  throw lastError;
}
