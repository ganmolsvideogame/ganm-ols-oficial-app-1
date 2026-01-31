"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { formatCentsToBRL } from "@/lib/utils/price";

type ShippingOption = {
  shipping_cost_cents: number;
  service_id: string;
  service_name: string;
  estimated_days: number | null;
  carrier: string | null;
};

type ListingLite = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  status: string | null;
  listing_type: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  quantity_available: number | null;
};

type CartItem = {
  id: string;
  listing_id: string;
  quantity: number | null;
  listings: ListingLite[] | null;
};

type ShippingState = {
  options: ShippingOption[];
  selectedServiceId: string | null;
  selectedCostCents: number;
  loading: boolean;
  error: string | null;
};

export default function CartCheckoutClient() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [stockWarnings, setStockWarnings] = useState<Record<string, string | null>>(
    {}
  );
  const [shippingByListing, setShippingByListing] = useState<
    Record<string, ShippingState>
  >({});

  const loadCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await fetch("/api/cart/checkout", { method: "GET" });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; items?: CartItem[] | null }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Erro ao carregar carrinho.");
      setItems([]);
      setIsLoading(false);
      return;
    }

    const safeItems = (payload?.items ?? []) as CartItem[];
    setItems(safeItems);
    setStockWarnings({});
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const fetchShipping = useCallback(async (listingId: string) => {
    setShippingByListing((prev) => ({
      ...prev,
      [listingId]: {
        options: [],
        selectedServiceId: null,
        selectedCostCents: 0,
        loading: true,
        error: null,
      },
    }));

    const response = await fetch("/api/cart/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          shipping_options?: ShippingOption[];
          shipping_cost_cents?: number;
          service_id?: string;
          error?: string;
        }
      | null;

    if (!response.ok) {
      setShippingByListing((prev) => ({
        ...prev,
        [listingId]: {
          options: [],
          selectedServiceId: null,
          selectedCostCents: 0,
          loading: false,
          error: payload?.error ?? "Erro ao calcular frete.",
        },
      }));
      return;
    }

    const options = payload?.shipping_options ?? [];
    const selectedOption = options[0];
    setShippingByListing((prev) => ({
      ...prev,
      [listingId]: {
        options,
        selectedServiceId: selectedOption?.service_id ?? payload?.service_id ?? null,
        selectedCostCents:
          selectedOption?.shipping_cost_cents ?? payload?.shipping_cost_cents ?? 0,
        loading: false,
        error: null,
      },
    }));
  }, []);

  useEffect(() => {
    items.forEach((item) => {
      const listing = item.listings?.[0] ?? null;
      if (!listing?.shipping_available || listing.free_shipping) {
        return;
      }
      if (shippingByListing[listing.id]) {
        return;
      }
      fetchShipping(listing.id);
    });
  }, [items, fetchShipping, shippingByListing]);

  const updateQuantity = async (itemId: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      await supabase.from("cart_items").delete().eq("id", itemId);
      await loadCart();
      return;
    }

    await supabase
      .from("cart_items")
      .update({
        quantity: nextQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);
    await loadCart();
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("cart_items").delete().eq("id", itemId);
    await loadCart();
  };

  const totals = items.reduce(
    (acc, item) => {
      const listing = item.listings?.[0] ?? null;
      if (!listing) {
        return acc;
      }
      const quantity = item.quantity ?? 0;
      const price = listing.price_cents ?? 0;
      acc.itemsTotal += price * quantity;

      if (listing.shipping_available && !listing.free_shipping) {
        const shipping = shippingByListing[listing.id];
        if (shipping?.selectedCostCents) {
          acc.shippingTotal += shipping.selectedCostCents;
        }
      }
      return acc;
    },
    { itemsTotal: 0, shippingTotal: 0 }
  );

  const canCheckout = items.length > 0 && items.every((item) => {
    const listing = item.listings?.[0] ?? null;
    if (!listing) {
      return false;
    }
    const available =
      typeof listing.quantity_available === "number"
        ? listing.quantity_available
        : null;
    if (available !== null && (item.quantity ?? 0) > available) {
      return false;
    }
    if (listing.status !== "active" || listing.listing_type === "auction") {
      return false;
    }
    if (!listing.shipping_available || listing.free_shipping) {
      return true;
    }
    const shipping = shippingByListing[listing.id];
    return Boolean(shipping?.selectedServiceId);
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
        Carregando carrinho...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
        Seu carrinho esta vazio.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-4">
        {items.map((item) => {
          const listing = item.listings?.[0] ?? null;
          const quantity = item.quantity ?? 0;
          const price = listing?.price_cents ?? 0;
          const shipping = listing ? shippingByListing[listing.id] : null;
          const available =
            typeof listing?.quantity_available === "number"
              ? listing.quantity_available
              : null;
          const canIncrease = available === null ? true : quantity < available;
          const stockWarning = stockWarnings[item.id] ?? null;

          return (
            <div
              key={item.id}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                    {listing?.thumbnail_url ? (
                      <img
                        src={listing.thumbnail_url}
                        alt={listing.title ?? "Produto"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Carrinho
                    </p>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {listing?.title ?? "Anuncio removido"}
                    </h3>
                    <p className="text-sm text-zinc-600">
                      {formatCentsToBRL(price)}
                    </p>
                    {listing?.status !== "active" ? (
                      <p className="text-xs text-amber-600">
                        Anuncio indisponivel
                      </p>
                    ) : null}
                    {listing?.listing_type === "auction" ? (
                      <p className="text-xs text-amber-600">
                        Anuncio em modo de lances
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, quantity - 1)}
                      className="text-base font-semibold text-zinc-500"
                      aria-label="Diminuir quantidade"
                    >
                      -
                    </button>
                    <span className="min-w-[20px] text-center text-sm font-semibold text-zinc-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canIncrease) {
                          setStockWarnings((prev) => ({
                            ...prev,
                            [item.id]: "Nao e possivel adicionar mais deste item.",
                          }));
                          return;
                        }
                        updateQuantity(item.id, quantity + 1);
                      }}
                      className="text-base font-semibold text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Aumentar quantidade"
                      disabled={!canIncrease}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                  >
                    Remover
                  </button>
                </div>
              </div>

              {available !== null && available <= 0 ? (
                <p className="mt-3 text-xs text-rose-600">
                  Produto sem estoque no momento.
                </p>
              ) : null}
              {available !== null && quantity > available ? (
                <p className="mt-3 text-xs text-rose-600">
                  Quantidade acima do estoque disponivel ({available}).
                </p>
              ) : null}
              {stockWarning ? (
                <p className="mt-2 text-xs text-amber-600">{stockWarning}</p>
              ) : null}

              {listing?.shipping_available ? (
                <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Frete
                  </p>
                  {listing.free_shipping ? (
                    <p className="mt-2 text-sm text-emerald-600">
                      Frete gratis para este anuncio.
                    </p>
                  ) : shipping?.loading ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Calculando frete...
                    </p>
                  ) : shipping?.error ? (
                    <p className="mt-2 text-xs text-rose-600">{shipping.error}</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {shipping?.options.map((option) => (
                        <label
                          key={option.service_id}
                          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                        >
                          <span>
                            {option.service_name}{" "}
                            {option.estimated_days
                              ? `(${option.estimated_days} dias)`
                              : ""}
                          </span>
                          <span className="font-semibold text-zinc-900">
                            {formatCentsToBRL(option.shipping_cost_cents)}
                          </span>
                          <input
                            type="radio"
                            name={`shipping_option_${listing.id}`}
                            value={option.service_id}
                            checked={shipping?.selectedServiceId === option.service_id}
                            onChange={() =>
                              setShippingByListing((prev) => ({
                                ...prev,
                                [listing.id]: {
                                  ...(prev[listing.id] ?? shipping),
                                  selectedServiceId: option.service_id,
                                  selectedCostCents: option.shipping_cost_cents,
                                },
                              }))
                            }
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Envio indisponivel para este anuncio.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form
        action="/api/mercadopago/preference-cart"
        method="post"
        className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Resumo do carrinho
        </p>
        <div className="mt-4 space-y-2 text-sm text-zinc-600">
          <div className="flex items-center justify-between">
            <span>Itens</span>
            <span>{formatCentsToBRL(totals.itemsTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Frete</span>
            <span>{formatCentsToBRL(totals.shippingTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold text-zinc-900">
            <span>Total</span>
            <span>{formatCentsToBRL(totals.itemsTotal + totals.shippingTotal)}</span>
          </div>
        </div>

        {items.map((item) => {
          const listing = item.listings?.[0] ?? null;
          if (!listing) {
            return null;
          }
          const selected = shippingByListing[listing.id]?.selectedServiceId ?? "";
          return (
            <input
              key={listing.id}
              type="hidden"
              name={`shipping_service_id[${listing.id}]`}
              value={selected}
              readOnly
            />
          );
        })}

        <button
          type="submit"
          disabled={!canCheckout}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Criar checkout do carrinho
        </button>
        <Link
          href="/carrinho"
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
        >
          Voltar ao carrinho
        </Link>
      </form>
    </div>
  );
}
