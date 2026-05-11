"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { formatCentsToBRL } from "@/lib/utils/price";

type FavoriteListing = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  platform: string | null;
  family: string | null;
  condition: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  status: string | null;
};

export type FavoriteRow = {
  id: string;
  listing_id: string;
  created_at: string | null;
  listings: FavoriteListing[] | null;
};

function formatCondition(value: string | null | undefined) {
  if (!value) {
    return "Sem condicao";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatShipping(isAvailable: boolean | null | undefined, isFree: boolean | null | undefined) {
  if (isFree) {
    return "Frete gratis";
  }
  return isAvailable === false ? "Envio a combinar" : "Envio disponivel";
}

export default function FavoritesClient({ initial }: { initial: FavoriteRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const remove = async (favoriteId: string) => {
    if (busyId) {
      return;
    }
    setError("");
    setBusyId(favoriteId);
    try {
      const { error: delError } = await supabase
        .from("listing_favorites")
        .delete()
        .eq("id", favoriteId);
      if (delError) {
        throw delError;
      }
      setItems((prev) => prev.filter((row) => row.id !== favoriteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover favorito.");
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
        Nenhum favorito salvo ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((fav) => {
          const listing = fav.listings?.[0] ?? null;
          const href = listing?.id ? `/produto/${listing.id}` : "/buscar";
          const shippingLabel = formatShipping(
            listing?.shipping_available,
            listing?.free_shipping
          );
          const shippingClass = listing?.free_shipping ? "text-emerald-600" : "text-zinc-500";

          return (
            <div
              key={fav.id}
              className="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <Link href={href} className="group block">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-50">
                  {listing?.thumbnail_url ? (
                    <img
                      src={listing.thumbnail_url}
                      alt={listing.title ?? "Produto"}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                      Sem foto
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {listing?.title ?? "Anuncio indisponivel"}
                  </h3>
                  <p className="text-lg font-semibold text-zinc-900">
                    {formatCentsToBRL(listing?.price_cents ?? 0)}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span>{formatCondition(listing?.condition)}</span>
                    <span className={shippingClass}>{shippingLabel}</span>
                    {listing?.status && listing.status !== "active" ? (
                      <span className="text-amber-700">Indisponivel</span>
                    ) : null}
                  </div>
                </div>
              </Link>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => remove(fav.id)}
                  disabled={busyId === fav.id}
                  className="w-full rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyId === fav.id ? "Removendo..." : "Remover dos favoritos"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

