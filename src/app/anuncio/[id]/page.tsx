import Link from "next/link";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { FAMILIES } from "@/lib/mock/data";
import { closeExpiredAuctions } from "@/lib/auctions";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

type ListingRow = {
  id: string;
  title: string;
  price_cents: number | null;
  condition: string | null;
  family: string | null;
  platform: string | null;
  model: string | null;
  description: string | null;
  status: string | null;
  listing_type: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  seller_user_id: string;
  created_at: string | null;
  auction_increment_percent: number | null;
  auction_end_at: string | null;
};

type ListingImageRow = {
  id: string;
  path: string;
  sort_order: number | null;
};

type BidRow = {
  id: string;
  amount_cents: number;
  created_at: string | null;
};

type SellerRow = {
  display_name: string | null;
  email: string | null;
};

function formatCondition(value: string | null) {
  if (!value) {
    return "Sem condicao";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatShipping(isAvailable: boolean | null, isFree: boolean | null) {
  if (isFree) {
    return "Frete gratis";
  }
  return isAvailable === false ? "Envio a combinar" : "Envio disponivel";
}

export default async function Page({ params }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await closeExpiredAuctions();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Detalhes do anuncio
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Faca login para ver os detalhes do anuncio.
          </p>
        </div>
        <Link
          href="/entrar"
          className="inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Entrar na conta
        </Link>
      </div>
    );
  }

  const { data: listingData } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, condition, family, platform, model, description, status, listing_type, shipping_available, free_shipping, seller_user_id, created_at, auction_increment_percent, auction_end_at"
    )
    .eq("id", params.id)
    .maybeSingle();

  const listing = listingData as ListingRow | null;

  if (!listing) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Anuncio nao encontrado
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Este anuncio nao esta mais disponivel.
          </p>
        </div>
        <Link
          href="/vender"
          className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  const { data: isAdminData, error: adminError } = await supabase.rpc("is_admin");
  const isAdmin = adminError ? false : isAdminData === true;
  const isOwner = listing.seller_user_id === user.id;

  if (!isAdmin && !isOwner) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Acesso negado
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Voce nao tem permissao para ver este anuncio.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Voltar para a home
        </Link>
      </div>
    );
  }

  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );

  const { data: imagesData } = await supabase
    .from("listing_images")
    .select("id, path, sort_order")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const images = (imagesData ?? []) as ListingImageRow[];
  const imageUrls = images.map((image) => ({
    id: image.id,
    url: supabase.storage.from("listing-images").getPublicUrl(image.path).data
      .publicUrl,
  }));

  const isAuction = listing.listing_type === "auction";
  const { data: bidsData } = isAuction
    ? await supabase
        .from("bids")
        .select("id, amount_cents, created_at")
        .eq("listing_id", listing.id)
        .order("amount_cents", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const bids = (bidsData ?? []) as BidRow[];

  const { data: sellerProfile } = isAdmin
    ? await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", listing.seller_user_id)
        .maybeSingle()
    : { data: null };

  const seller = sellerProfile as SellerRow | null;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Detalhes do anuncio
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
              {listing.title}
            </h1>
          </div>
          <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600">
            {listing.status ?? "active"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          {imageUrls.length > 0 ? (
            <img
              src={imageUrls[0].url}
              alt={listing.title}
              className="h-80 w-full rounded-3xl object-cover"
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400">
              Sem imagem
            </div>
          )}
          {imageUrls.length > 1 ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {imageUrls.slice(1).map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={listing.title}
                  className="h-24 w-full rounded-2xl object-cover"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {familyLabelBySlug[listing.family ?? ""] ??
                listing.family ??
                "Plataforma"}
            </p>
            <p className="text-sm text-zinc-600">
              {listing.platform || "Sem plataforma"}
            </p>
            <p className="text-sm text-zinc-600">
              Modelo: {listing.model || "Sem modelo"}
            </p>
          </div>
          <div className="text-3xl font-semibold text-zinc-900">
            {formatCentsToBRL(listing.price_cents ?? 0)}
          </div>
          <div className="space-y-2 text-sm text-zinc-600">
            <p>Condicao: {formatCondition(listing.condition)}</p>
            <p>
              Envio: {formatShipping(listing.shipping_available, listing.free_shipping)}
            </p>
            <p>Tipo: {listing.listing_type ?? "now"}</p>
          </div>
          <div className="space-y-2 text-sm text-zinc-600">
            <p>Descricao:</p>
            <p>{listing.description || "Sem descricao."}</p>
          </div>
          {seller ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Vendedor
              </p>
              <p className="mt-2 text-base font-semibold text-zinc-900">
                {seller.display_name || seller.email || "Vendedor"}
              </p>
              <p className="text-xs text-zinc-500">{seller.email || ""}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link
              href={isAdmin ? ADMIN_PATHS.dashboard : "/vender"}
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
            >
              Voltar ao painel
            </Link>
            <Link
              href={`/produto/${listing.id}`}
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Ver pagina publica
            </Link>
          </div>
        </div>
      </div>

      {isAuction ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Lances recebidos
            </h2>
            <span className="text-xs text-zinc-500">
              Incremento: {listing.auction_increment_percent ?? 25}%
            </span>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Encerramento
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              {listing.auction_end_at
                ? new Date(listing.auction_end_at).toLocaleString("pt-BR")
                : "Sem data definida"}
            </p>
            <p className="mt-4 text-sm text-zinc-600">
              Maior lance:{" "}
              <span className="font-semibold text-zinc-900">
                {formatCentsToBRL(bids[0]?.amount_cents ?? listing.price_cents ?? 0)}
              </span>
            </p>
          </div>
          {bids.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum lance registrado ainda.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Lance
                  </p>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    {formatCentsToBRL(bid.amount_cents)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {bid.created_at
                      ? new Date(bid.created_at).toLocaleString("pt-BR")
                      : "Agora mesmo"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
