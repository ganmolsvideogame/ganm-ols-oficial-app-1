import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { readStoreProfileData } from "@/lib/store-profile";

export const dynamic = "force-dynamic";

type SellerRow = {
  id: string;
  display_name: string | null;
  city: string | null;
  state: string | null;
};

function formatLocation(city: string | null, state: string | null) {
  const label = `${city ?? ""} ${state ?? ""}`.trim();
  return label || "Localizacao nao informada";
}

export default async function Page() {
  const admin = createAdminClient();

  // Best-effort: get a "directory" of stores based on the most recent active listings.
  const { data: listingSellers } = await admin
    .from("listings_with_boost")
    .select("seller_user_id")
    .eq("status", "active")
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .order("created_at", { ascending: false })
    .limit(250);

  const sellerCounts = new Map<string, number>();
  (listingSellers ?? []).forEach((row) => {
    const sellerId = String((row as { seller_user_id?: string }).seller_user_id ?? "").trim();
    if (!sellerId) {
      return;
    }
    sellerCounts.set(sellerId, (sellerCounts.get(sellerId) ?? 0) + 1);
  });

  const sellerIds = Array.from(sellerCounts.keys()).slice(0, 24);
  const { data: sellersData } =
    sellerIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name, city, state")
          .in("id", sellerIds)
      : { data: [] };

  const sellers = (sellersData ?? []) as SellerRow[];
  const authMetadataEntries = await Promise.all(
    sellerIds.map(async (sellerId) => {
      const { data } = await admin.auth.admin.getUserById(sellerId);
      return [sellerId, readStoreProfileData(data.user?.user_metadata)] as const;
    })
  );
  const storeProfilesBySellerId = new Map(authMetadataEntries);
  const sortedSellers = sellerIds
    .map((id) => sellers.find((row) => row.id === id) ?? null)
    .filter(Boolean) as SellerRow[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Lojas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Explore vendedores ativos e acompanhe novidades na loja de cada um.
        </p>
      </div>

      {sortedSellers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Ainda nao encontramos lojas ativas para listar aqui.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSellers.map((seller) => (
            (() => {
              const storeProfile = storeProfilesBySellerId.get(seller.id);
              const storeAvatarUrl = storeProfile?.storeAvatarPath
                ? admin.storage
                    .from("store-images")
                    .getPublicUrl(storeProfile.storeAvatarPath).data.publicUrl
                : null;

              return (
                <Link
                  key={seller.id}
                  href={`/lojas/${seller.id}`}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-100">
                      {storeAvatarUrl ? (
                        <img
                          src={storeAvatarUrl}
                          alt={seller.display_name?.trim() || "Loja"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-500">
                          {(seller.display_name?.trim().charAt(0) || "L").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Loja do vendedor
                      </p>
                      <h2 className="mt-1 break-words text-lg font-semibold text-zinc-900">
                        {seller.display_name?.trim() || "Vendedor"}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatLocation(seller.city, seller.state)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-zinc-600">
                    {storeProfile?.storeBio?.trim() ||
                      "Loja ativa na GANM OLS com produtos e ofertas para acompanhar."}
                  </p>
                  <p className="mt-3 text-xs text-zinc-500">
                    {sellerCounts.get(seller.id) ?? 0} anuncio{(sellerCounts.get(seller.id) ?? 0) === 1 ? "" : "s"} recente{(sellerCounts.get(seller.id) ?? 0) === 1 ? "" : "s"}
                  </p>
                </Link>
              );
            })()
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/buscar"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Buscar anuncios
        </Link>
        <Link
          href="/vender/comece"
          className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
        >
          Quero vender
        </Link>
      </div>
    </div>
  );
}
