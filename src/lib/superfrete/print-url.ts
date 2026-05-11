function encodeBase64(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8").toString("base64");
  }
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(value)));
  }
  throw new Error("Base64 encoder indisponivel");
}

export function buildSuperfretePrintUrl(orderId: string | null | undefined) {
  const normalized = String(orderId ?? "").trim();
  if (!normalized) {
    return null;
  }

  const payload = JSON.stringify({ order_id: normalized });
  const encoded = encodeBase64(payload);
  return `https://etiqueta.superfrete.com/_etiqueta/pdf/${encoded}?format=A4`;
}
