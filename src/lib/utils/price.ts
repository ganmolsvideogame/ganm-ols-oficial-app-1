export function parsePriceToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed.replace(/[^\d,\.]/g, "");
  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100);
}

export function formatCentsToBRL(cents: number | null | undefined): string {
  if (!cents || !Number.isFinite(cents)) {
    return "R$ 0,00";
  }

  const value = cents / 100;
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}
