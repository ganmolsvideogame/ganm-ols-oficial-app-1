"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { formatCentsToBRL } from "@/lib/utils/price";
import { notifyCartCount } from "@/lib/cart/events";
import AddToCartButton from "@/components/cart/AddToCartButton";

type ListingLite = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  status: string | null;
  listing_type: string | null;
  quantity_available: number | null;
};

type CartItem = {
  id: string;
  listing_id: string;
  quantity: number | null;
  listings: ListingLite[] | null;
};

type UpsellListing = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  condition: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  family: string | null;
  quantity_available: number | null;
};

export default function CartClient() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [stockWarnings, setStockWarnings] = useState<Record<string, string | null>>(
    {}
  );
  const [suggestions, setSuggestions] = useState<UpsellListing[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNeedsLogin(true);
      setItems([]);
      notifyCartCount(0);
      setIsLoading(false);
      return;
    }

    setNeedsLogin(false);
    const response = await fetch("/api/cart", { method: "GET" });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; cart_id?: string | null; items?: CartItem[] | null }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Erro ao carregar carrinho.");
      setItems([]);
      notifyCartCount(0);
      setIsLoading(false);
      return;
    }

    const nextCartId = payload?.cart_id ?? null;
    const safeItems = (payload?.items ?? []) as CartItem[];
    setCartId(nextCartId);
    setItems(safeItems);
    setStockWarnings({});
    const nextCount = safeItems.reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0
    );
    notifyCartCount(nextCount);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const loadSuggestions = useCallback(
    async (currentItems: CartItem[]) => {
      if (currentItems.length === 0) {
        setSuggestions([]);
        setSuggestionsError(null);
        setSuggestionsLoading(false);
        return;
      }

      setSuggestionsLoading(true);
      setSuggestionsError(null);
      const ids = currentItems.map((item) => item.listing_id).filter(Boolean);
      let query = supabase
        .from("listings")
        .select(
          "id, title, price_cents, thumbnail_url, condition, shipping_available, free_shipping, family, quantity_available, status, listing_type"
        )
        .eq("status", "active")
        .neq("listing_type", "auction")
        .or("quantity_available.is.null,quantity_available.gt.0")
        .limit(6);

      if (ids.length > 0) {
        query = query.not("id", "in", `(${ids.join(",")})`);
      }

      const { data, error: suggestionError } = await query;

      if (suggestionError) {
        setSuggestions([]);
        setSuggestionsError("Erro ao carregar sugestoes.");
      } else {
        setSuggestions((data ?? []) as UpsellListing[]);
      }
      setSuggestionsLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    loadSuggestions(items);
  }, [items, loadSuggestions]);

  const updateQuantity = async (itemId: string, nextQuantity: number) => {
    if (!cartId) {
      return;
    }

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

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
        Carregando carrinho...
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
        <p>Entre para acessar seu carrinho.</p>
        <Link
          href="/entrar?redirect_to=%2Fcarrinho"
          className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
        >
          Entrar na conta
        </Link>
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

  const totalCents = items.reduce((sum, item) => {
    const price = item.listings?.[0]?.price_cents ?? 0;
    return sum + price * (item.quantity ?? 0);
  }, 0);

  const totalItems = items.reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-4">
        {items.map((item) => {
          const listing = item.listings?.[0] ?? null;
          const price = listing?.price_cents ?? 0;
          const quantity = item.quantity ?? 0;
          const isAvailable = listing?.status === "active";
          const isAuction = listing?.listing_type === "auction";
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
                    {!isAvailable ? (
                      <p className="text-xs text-amber-600">
                        Anuncio indisponivel
                      </p>
                    ) : null}
                    {isAuction ? (
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
                  {isAvailable && !isAuction ? (
                    <>
                      <form
                        action="/api/mercadopago/preference"
                        method="post"
                        className="hidden md:block"
                      >
                        <input
                          type="hidden"
                          name="listing_id"
                          value={item.listing_id}
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Comprar
                        </button>
                      </form>
                      <a
                        href={`/api/mercadopago/preference?listing_id=${encodeURIComponent(
                          item.listing_id
                        )}`}
                        className="md:hidden rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Comprar
                      </a>
                    </>
                  ) : null}
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
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Resumo
        </p>
        <div className="mt-4 space-y-2 text-sm text-zinc-600">
          <div className="flex items-center justify-between">
            <span>Itens</span>
            <span>{totalItems}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold text-zinc-900">
            <span>Total</span>
            <span>{formatCentsToBRL(totalCents)}</span>
          </div>
        </div>
        <Link
          href="/checkout/carrinho"
          className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
        >
          Continuar para pagamento
        </Link>
      </div>

      <div className="lg:col-span-2">
        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Adicione ao carrinho
            </h2>
            {suggestionsLoading ? (
              <span className="text-xs text-zinc-500">Carregando...</span>
            ) : null}
          </div>
          {suggestionsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {suggestionsError}
            </div>
          ) : null}
          {!suggestionsLoading && suggestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Sem sugestoes no momento.
            </div>
          ) : null}
          {suggestions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <Link
                    href={`/produto/${suggestion.id}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-50">
                      {suggestion.thumbnail_url ? (
                        <img
                          src={suggestion.thumbnail_url}
                          alt={suggestion.title ?? "Produto"}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                        {suggestion.family ?? "Sugestao"}
                      </p>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {suggestion.title ?? "Produto"}
                      </h3>
                      <p className="text-sm text-zinc-600">
                        {formatCentsToBRL(suggestion.price_cents ?? 0)}
                      </p>
                    </div>
                  </Link>
                  <div className="mt-4">
                    <AddToCartButton
                      listingId={suggestion.id}
                      label="Adicionar"
                      className="w-full rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
