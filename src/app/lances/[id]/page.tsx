import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

type BidRow = {
  id: string;
  bidder_user_id: string | null;
  amount_cents: number | null;
  created_at: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

export default async function AuctionDetailsPage({ params }: PageProps) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const listingId = params.id;
  if (!listingId) {
    redirect("/leiloes");
  }

  const { data: listing, error } = await admin
    .from("listings")
    .select(
      "id, title, price_cents, status, listing_type, auction_end_at, auction_closed_at, auction_final_bid_cents, auction_winner_user_id, thumbnail_url, seller_user_id"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing || listing.listing_type !== "auction") {
    redirect("/leiloes");
  }

  const { data: bidsData } = await admin
    .from("bids")
    .select("id, bidder_user_id, amount_cents, created_at")
    .eq("listing_id", listingId)
    .order("amount_cents", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(50);

  const bids = (bidsData ?? []) as BidRow[];
  const topBid = bids[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Lances
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            {listing.title ?? "Leilao"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Anuncio #{listing.id.slice(0, 8)}
          </p>
        </div>
        <Link
          href="/leiloes"
          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
        >
          Voltar aos leiloes
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-[120px_1fr]">
            <div className="h-28 w-28 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {listing.thumbnail_url ? (
                <img
                  src={listing.thumbnail_url}
                  alt={listing.title ?? "Leilao"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                  Sem foto
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm text-zinc-600">
              <p className="text-base font-semibold text-zinc-900">
                {listing.title ?? "Leilao"}
              </p>
              <p>Status: {listing.status ?? "ativo"}</p>
              <p>Inicio: {formatCentsToBRL(listing.price_cents ?? 0)}</p>
              <p>Encerra em: {formatDateTime(listing.auction_end_at)}</p>
              {listing.auction_closed_at ? (
                <p>Encerrado em: {formatDateTime(listing.auction_closed_at)}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Lance atual</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-600">
            <p>
              Maior lance:{" "}
              <span className="font-semibold text-zinc-900">
                {formatCentsToBRL(topBid?.amount_cents ?? listing.price_cents ?? 0)}
              </span>
            </p>
            <p>Ultimo lance: {formatDateTime(topBid?.created_at)}</p>
            {listing.auction_final_bid_cents ? (
              <p>Final: {formatCentsToBRL(listing.auction_final_bid_cents)}</p>
            ) : null}
          </div>
          {listing.status === "active" ? (
            <Link
              href={`/produto/${listing.id}`}
              className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Ver anuncio
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Historico de lances</h2>
        <div className="mt-4 space-y-3">
          {bids.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
              Nenhum lance registrado ainda.
            </div>
          ) : (
            bids.map((bid, index) => (
              <div
                key={bid.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {index === 0 ? "Lance lider" : "Lance"}
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-900">
                  {formatCentsToBRL(bid.amount_cents ?? 0)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {bid.bidder_user_id
                    ? `Usuario ${bid.bidder_user_id.slice(0, 6)}`
                    : "Usuario"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateTime(bid.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
