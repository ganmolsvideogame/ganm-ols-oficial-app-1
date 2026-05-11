import Link from "next/link";

import { FAMILIES } from "@/lib/mock/data";
import { buildListingPath } from "@/lib/listings/url";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

type ListingRow = {
  id: string;
  title: string;
  price_cents: number | null;
  condition: string | null;
  family: string | null;
  platform: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  thumbnail_url: string | null;
};

export default async function Page() {
  const supabase = await createClient();
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );

  const { data } = await supabase
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .lte("price_cents", 10000)
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  const listings = (data ?? []) as ListingRow[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Menos de R$100</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Selecao de anuncios com preco ate R$100.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhum anuncio encontrado nesse valor agora.
          </div>
        ) : (
          listings.map((item) => (
            <ListingCard
              key={item.id}
              href={buildListingPath(item.id, item.title)}
              title={item.title}
              priceCents={item.price_cents}
              thumbnailUrl={item.thumbnail_url}
              platformFallback={item.platform}
              condition={item.condition}
              shippingAvailable={item.shipping_available}
              freeShipping={item.free_shipping}
              familyLabel={
                familyLabelBySlug[item.family ?? ""] ?? item.family ?? "Plataforma"
              }
              tag="Ate R$100"
            />
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/ofertas"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Ver ofertas
        </Link>
        <Link
          href="/buscar"
          className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
        >
          Buscar anuncios
        </Link>
      </div>
    </div>
  );
}
