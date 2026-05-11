export type MetaCatalogEventInput = {
  catalogId: string;
  title?: string | null;
  priceCents?: number | null;
  quantity?: number | null;
  category?: string | null;
  brand?: string | null;
};

function normalizeMoney(value: number | null | undefined) {
  const cents = Number(value ?? 0);
  if (!Number.isFinite(cents) || cents <= 0) {
    return 0;
  }
  return Number((cents / 100).toFixed(2));
}

export function buildMetaCatalogListingId(listingId: string) {
  return `listing-${String(listingId).trim()}`;
}

export function buildMetaCatalogAffiliateId(slug: string) {
  return `affiliate-${String(slug).trim()}`;
}

export function buildMetaCatalogEventPayload(input: MetaCatalogEventInput) {
  const catalogId = String(input.catalogId ?? "").trim();
  const quantity =
    typeof input.quantity === "number" && input.quantity > 0 ? input.quantity : 1;
  const value = normalizeMoney(input.priceCents);
  const itemPrice = quantity > 0 ? Number((value / quantity).toFixed(2)) : value;

  const payload: Record<string, unknown> = {
    content_ids: [catalogId],
    content_type: "product",
    contents: [
      {
        id: catalogId,
        quantity,
        item_price: itemPrice,
      },
    ],
    currency: "BRL",
    value,
  };

  if (input.title) {
    payload.content_name = input.title;
  }

  if (input.category) {
    payload.content_category = input.category;
  }

  if (input.brand) {
    payload.brand = input.brand;
  }

  return payload;
}
