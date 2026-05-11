import Link from "next/link";

import { requireAdmin } from "@/lib/admin/require-admin";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type AuctionListingRow = {
  id: string;
  title: string | null;
  seller_user_id: string;
  status: string | null;
  price_cents: number | null;
  auction_end_at: string | null;
  auction_closed_at: string | null;
  auction_final_bid_cents: number | null;
  auction_winner_user_id: string | null;
  created_at: string | null;
};

type BidRow = {
  id: string;
  listing_id: string;
  bidder_user_id: string;
  amount_cents: number | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

function isSameDay(value: string | null, reference: Date) {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.toDateString() === reference.toDateString();
}

function statusTone(value: string | null | undefined) {
  const status = String(value ?? "").toLowerCase();
  if (["active"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["paused", "pending_review"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["sold", "closed", "cancelled", "canceled"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-zinc-200 bg-white text-zinc-700";
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { supabase } = await requireAdmin();

  const { data: listingsData } = await supabase
    .from("listings")
    .select(
      "id, title, seller_user_id, status, price_cents, auction_end_at, auction_closed_at, auction_final_bid_cents, auction_winner_user_id, created_at"
    )
    .eq("listing_type", "auction")
    .order("created_at", { ascending: false })
    .limit(250);

  const listings = (listingsData ?? []) as AuctionListingRow[];
  const listingIds = Array.from(new Set(listings.map((listing) => listing.id)));

  const { data: bidsData } =
    listingIds.length > 0
      ? await supabase
          .from("bids")
          .select("id, listing_id, bidder_user_id, amount_cents, created_at")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const bids = (bidsData ?? []) as BidRow[];

  const userIds = Array.from(
    new Set(
      [
        ...listings.map((listing) => listing.seller_user_id),
        ...listings
          .map((listing) => listing.auction_winner_user_id)
          .filter((value): value is string => Boolean(value)),
        ...bids.map((bid) => bid.bidder_user_id),
      ].filter(Boolean)
    )
  );

  const { data: profilesData } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds)
      : { data: [] };

  const profiles = (profilesData ?? []) as ProfileRow[];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const bidsByListing = new Map<string, BidRow[]>();
  for (const bid of bids) {
    const current = bidsByListing.get(bid.listing_id) ?? [];
    current.push(bid);
    bidsByListing.set(bid.listing_id, current);
  }

  const now = new Date();
  const activeCount = listings.filter((listing) => listing.status === "active").length;
  const closingTodayCount = listings.filter((listing) =>
    isSameDay(listing.auction_end_at, now)
  ).length;
  const closedCount = listings.filter((listing) => Boolean(listing.auction_closed_at)).length;

  return (
    <main className="space-y-8">
      {resolvedSearchParams?.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {resolvedSearchParams.error}
        </div>
      ) : null}
      {resolvedSearchParams?.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {resolvedSearchParams.success}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Leiloes", value: listings.length },
          { label: "Ativos", value: activeCount },
          { label: "Encerrando hoje", value: closingTodayCount },
          { label: "Encerrados", value: closedCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Leiloes
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Monitoramento de lances</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Acompanhe maior lance e finalize leiloes quando necessario.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum leilao encontrado.
            </div>
          ) : (
            listings.map((listing) => {
              const listingBids = bidsByListing.get(listing.id) ?? [];
              const topBid = listingBids.reduce<BidRow | null>((highest, current) => {
                if (!highest) {
                  return current;
                }
                return (current.amount_cents ?? 0) > (highest.amount_cents ?? 0)
                  ? current
                  : highest;
              }, null);

              const seller = profileMap.get(listing.seller_user_id);
              const sellerLabel =
                seller?.display_name || seller?.email || listing.seller_user_id.slice(0, 8);
              const winnerId = listing.auction_winner_user_id || topBid?.bidder_user_id || null;
              const winner = winnerId ? profileMap.get(winnerId) : null;
              const winnerLabel = winner
                ? winner.display_name || winner.email || winnerId?.slice(0, 8)
                : "Sem vencedor";
              const status = listing.status ?? "paused";
              const isActive = status === "active";

              return (
                <div
                  key={listing.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Leilao {listing.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {listing.title || "Sem titulo"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">Vendedor: {sellerLabel}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        Lance inicial: {formatCentsToBRL(listing.price_cents ?? 0)} | Maior lance:{" "}
                        {formatCentsToBRL(
                          topBid?.amount_cents ?? listing.auction_final_bid_cents ?? 0
                        )}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Vencedor: {winnerLabel} | Fim em {formatDateTime(listing.auction_end_at)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Encerrado em {formatDateTime(listing.auction_closed_at)} | Lances: {listingBids.length}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(status)}`}>
                      {status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/anuncio/${listing.id}`}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      Ver anuncio
                    </Link>
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input type="hidden" name="action" value={isActive ? "pause" : "activate"} />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.auctions} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {isActive ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                    {isActive ? (
                      <form action="/api/admin/listings" method="post">
                        <input type="hidden" name="listing_id" value={listing.id} />
                        <input type="hidden" name="action" value="end_auction" />
                        <input type="hidden" name="redirect_to" value={ADMIN_PATHS.auctions} />
                        <button
                          type="submit"
                          className="rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-700"
                        >
                          Encerrar agora
                        </button>
                      </form>
                    ) : null}
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.auctions} />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
