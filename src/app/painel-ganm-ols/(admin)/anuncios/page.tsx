import Link from "next/link";

import { listAffiliateProducts } from "@/lib/affiliate/catalog";
import { buildAffiliateProductPath } from "@/lib/affiliate/products";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { requireAdmin } from "@/lib/admin/require-admin";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ListingRow = {
  id: string;
  title: string | null;
  price_cents: number | null;
  status: string | null;
  moderation_status: string | null;
  platform: string | null;
  family: string | null;
  seller_user_id: string | null;
  is_featured: boolean | null;
  is_week_offer: boolean | null;
  listing_type: string | null;
  auction_end_at: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleDateString("pt-BR");
}

function formatLabel(value: string | null | undefined) {
  if (!value) {
    return "nao definido";
  }
  return value;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { supabase } = await requireAdmin();

  const { data: listingsData } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, status, moderation_status, platform, family, seller_user_id, is_featured, is_week_offer, listing_type, auction_end_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(250);

  const listings = (listingsData ?? []) as ListingRow[];
  const affiliateProducts = await listAffiliateProducts({ includeInactive: true });
  const sellerIds = Array.from(
    new Set(
      listings
        .map((item) => item.seller_user_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: sellersData } =
    sellerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", sellerIds)
      : { data: [] };

  const sellers = (sellersData ?? []) as ProfileRow[];
  const sellerMap = new Map(sellers.map((seller) => [seller.id, seller]));

  const activeCount = listings.filter((item) => item.status === "active").length;
  const pausedCount = listings.filter((item) => item.status === "paused").length;
  const pendingModerationCount = listings.filter(
    (item) => item.moderation_status === "pending" || item.status === "pending_review"
  ).length;
  const auctionCount = listings.filter(
    (item) => item.listing_type === "auction"
  ).length;

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
          { label: "Total", value: listings.length },
          { label: "Ativos", value: activeCount },
          { label: "Pausados", value: pausedCount },
          { label: "A revisar", value: pendingModerationCount },
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
              Moderacao
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Catalogo de anuncios
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Leiloes ativos: {auctionCount}. Gerencie status e destaque sem sair desta tela.
            </p>
          </div>
          <Link
            href={ADMIN_PATHS.inventory}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Ver estoque
          </Link>
        </div>

        <div className="mt-5 grid gap-4">
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum anuncio encontrado.
            </div>
          ) : (
            listings.map((listing) => {
              const seller = listing.seller_user_id
                ? sellerMap.get(listing.seller_user_id)
                : null;
              const sellerLabel =
                seller?.display_name || seller?.email || "Vendedor sem cadastro";
              const status = listing.status ?? "indefinido";
              const moderationStatus = listing.moderation_status ?? "nao definido";
              const isAuction = listing.listing_type === "auction";
              const isActive = status === "active";

              return (
                <div
                  key={listing.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {listing.platform || "sem plataforma"}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {listing.title || "Sem titulo"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatCentsToBRL(listing.price_cents ?? 0)} • {sellerLabel}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Familia: {formatLabel(listing.family)} • Criado em{" "}
                        {formatDate(listing.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                        Status: {status}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                        Moderacao: {moderationStatus}
                      </span>
                      {listing.is_featured ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                          Destaque
                        </span>
                      ) : null}
                      {listing.is_week_offer ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                          Oferta semana
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/anuncio/${listing.id}`}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      Ver detalhes
                    </Link>
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input
                        type="hidden"
                        name="action"
                        value={listing.is_featured ? "feature_off" : "feature_on"}
                      />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {listing.is_featured ? "Remover destaque" : "Destacar"}
                      </button>
                    </form>
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input
                        type="hidden"
                        name="action"
                        value={listing.is_week_offer ? "offer_off" : "offer_on"}
                      />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {listing.is_week_offer ? "Remover oferta" : "Oferta semana"}
                      </button>
                    </form>
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input type="hidden" name="action" value={isActive ? "pause" : "activate"} />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {isActive ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                    {isAuction && isActive ? (
                      <form action="/api/admin/listings" method="post">
                        <input type="hidden" name="listing_id" value={listing.id} />
                        <input type="hidden" name="action" value="end_auction" />
                        <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                        <button
                          type="submit"
                          className="rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-700"
                        >
                          Encerrar leilao
                        </button>
                      </form>
                    ) : null}
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Arquivar
                      </button>
                    </form>
                  </div>

                  {isAuction ? (
                    <p className="mt-3 text-xs text-zinc-500">
                      Fim do leilao: {formatDate(listing.auction_end_at)}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Afiliacao
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Produtos afiliados
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Gerencie exibicao, destaque e oferta da semana dos produtos afiliados como parte do catalogo.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
            {affiliateProducts.length} produto(s)
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Importacao em massa
          </p>
          <h3 className="mt-2 text-base font-semibold text-zinc-900">
            Importar afiliados por arquivo
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Aceita arquivo ou texto com links do produto e link afiliado do Mercado Livre. Tambem aceita JSON com produtos ja estruturados.
          </p>

          <form
            action="/api/admin/affiliate-products/import"
            method="post"
            encType="multipart/form-data"
            className="mt-4 grid gap-4"
          >
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />

            <label className="grid gap-2 text-sm text-zinc-700">
              <span className="font-medium">Arquivo</span>
              <input
                type="file"
                name="import_file"
                accept=".txt,.csv,.json"
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700"
              />
            </label>

            <label className="grid gap-2 text-sm text-zinc-700">
              <span className="font-medium">Ou cole o conteudo</span>
              <textarea
                name="raw_text"
                rows={7}
                placeholder="Produto: https://www.mercadolivre.com.br/...\nLink de afiliado: https://meli.la/...\n\nProduto: https://www.mercadolivre.com.br/...\nLink de afiliado: https://meli.la/..."
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Importar lote
              </button>
              <p className="text-xs text-zinc-500">
                Para lotes muito grandes, importe em blocos menores para manter a leitura mais estavel.
              </p>
            </div>
          </form>
        </div>

        <div className="mt-5 grid gap-4">
          {affiliateProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum produto afiliado cadastrado.
            </div>
          ) : (
            affiliateProducts.map((product) => {
              const isActive = product.status === "active";

              return (
                <div
                  key={product.slug}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {product.brand}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {product.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatCentsToBRL(product.priceCents)} • {product.categoryLabel}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Familia: {formatLabel(product.familySlug)} • Publicado em{" "}
                        {formatDate(product.publishedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                        Status: {product.status}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                        Moderacao: {product.moderationStatus}
                      </span>
                      {product.showOnHome ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                          Na home
                        </span>
                      ) : null}
                      {product.isFeatured ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                          Destaque
                        </span>
                      ) : null}
                      {product.isWeekOffer ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                          Oferta semana
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={buildAffiliateProductPath(product.slug)}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      Ver pagina
                    </Link>
                    <form action="/api/admin/affiliate-products" method="post">
                      <input type="hidden" name="product_slug" value={product.slug} />
                      <input
                        type="hidden"
                        name="action"
                        value={product.isFeatured ? "feature_off" : "feature_on"}
                      />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {product.isFeatured ? "Remover destaque" : "Destacar"}
                      </button>
                    </form>
                    <form action="/api/admin/affiliate-products" method="post">
                      <input type="hidden" name="product_slug" value={product.slug} />
                      <input
                        type="hidden"
                        name="action"
                        value={product.isWeekOffer ? "offer_off" : "offer_on"}
                      />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {product.isWeekOffer ? "Remover oferta" : "Oferta semana"}
                      </button>
                    </form>
                    <form action="/api/admin/affiliate-products" method="post">
                      <input type="hidden" name="product_slug" value={product.slug} />
                      <input
                        type="hidden"
                        name="action"
                        value={product.showOnHome ? "home_off" : "home_on"}
                      />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {product.showOnHome ? "Remover da home" : "Mostrar na home"}
                      </button>
                    </form>
                    <form action="/api/admin/affiliate-products" method="post">
                      <input type="hidden" name="product_slug" value={product.slug} />
                      <input type="hidden" name="action" value={isActive ? "pause" : "activate"} />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.listings} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {isActive ? "Pausar" : "Ativar"}
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
