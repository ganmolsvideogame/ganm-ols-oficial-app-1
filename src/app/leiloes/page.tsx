import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsToBRL } from "@/lib/utils/price";
import { closeExpiredAuctions } from "@/lib/auctions";
import {
  calculateMinBidCents,
  DEFAULT_AUCTION_INCREMENT_PERCENT,
} from "@/lib/config/commerce";

export const dynamic = "force-dynamic";

type AuctionRow = {
  id: string;
  title: string;
  price_cents: number | null;
  platform: string | null;
  family: string | null;
  created_at: string | null;
  auction_increment_percent: number | null;
  auction_end_at: string | null;
};

export default async function Page() {
  const supabase = createAdminClient();
  await closeExpiredAuctions();
  const { data } = await supabase
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, platform, family, created_at, auction_increment_percent, auction_end_at"
    )
    .in("status", ["active", "paused"])
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .eq("listing_type", "auction")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false });

  const auctions = (data ?? []) as AuctionRow[];
  const auctionIds = auctions.map((auction) => auction.id);
  const { data: bidsData } =
    auctionIds.length > 0
      ? await supabase
          .from("bids")
          .select("listing_id, amount_cents")
          .in("listing_id", auctionIds)
          .order("amount_cents", { ascending: false })
      : { data: [] };

  const highestBidByListing = new Map<string, number>();
  (bidsData ?? []).forEach((bid) => {
    const listingId = String((bid as { listing_id: string }).listing_id);
    const amount = (bid as { amount_cents: number }).amount_cents;
    if (!highestBidByListing.has(listingId)) {
      highestBidByListing.set(listingId, amount);
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Lances</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Programacao de lances e lotes especiais para colecionadores.
          </p>
        </div>
        <Link
          href="/vender"
          className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white"
        >
          Quero listar em lances
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {auctions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhum lance programado no momento.
          </div>
        ) : (
          auctions.map((auction) => {
            const highestBid = highestBidByListing.get(auction.id);
            const incrementPercent =
              typeof auction.auction_increment_percent === "number"
                ? auction.auction_increment_percent
                : DEFAULT_AUCTION_INCREMENT_PERCENT;
            const baseAmount = highestBid ?? auction.price_cents ?? 0;
            const minBid = calculateMinBidCents(baseAmount, incrementPercent);
            const endsAt = auction.auction_end_at
              ? new Date(auction.auction_end_at)
              : null;
            const isEnded =
              endsAt && !Number.isNaN(endsAt.getTime())
                ? endsAt <= new Date()
                : false;

            return (
              <div
                key={auction.id}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="rounded-full border border-zinc-200 px-3 py-1">
                    {auction.platform || "Sem plataforma"}
                  </span>
                  <span>{isEnded ? "Encerrado" : "Ao vivo"}</span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-zinc-900">
                  {auction.title}
                </h2>
                <div className="mt-3 space-y-2 text-sm text-zinc-600">
                  <p>
                    Lance atual:{" "}
                    <span className="font-semibold text-zinc-900">
                      {formatCentsToBRL(baseAmount)}
                    </span>
                  </p>
                  <p>
                    Lance minimo:{" "}
                    <span className="font-semibold text-zinc-900">
                      {formatCentsToBRL(minBid)}
                    </span>
                  </p>
                  <p>
                    Termina em:{" "}
                    <span className="font-semibold text-zinc-900">
                      {endsAt ? endsAt.toLocaleString("pt-BR") : "Sem data"}
                    </span>
                  </p>
                </div>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/contato?assunto=lances"
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Receber alerta
                  </Link>
                  <Link
                    href={`/produto/${auction.id}`}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                  >
                    Ver detalhes
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
