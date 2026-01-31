import Link from "next/link";

import { FAMILIES, SUBCATEGORIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
};

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

export default async function Page({ params }: PageProps) {
  const supabase = await createClient();
  const family = FAMILIES.find((item) => item.slug === params.slug);
  const subcategories = SUBCATEGORIES[params.slug] ?? [];

  let listingQuery = supabase
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .eq("status", "active")
    .eq("moderation_status", "approved");

  if (family?.name) {
    listingQuery = listingQuery.or(
      `family.eq.${params.slug},family.ilike.%${family.name}%`
    );
  } else {
    listingQuery = listingQuery.eq("family", params.slug);
  }

  const { data } = await listingQuery
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false });

  const listings = (data ?? []) as ListingRow[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Plataforma
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {family?.name ?? "Plataforma nao encontrada"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {family?.description ??
            "Veja outras familias e encontre seus consoles favoritos."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {subcategories.map((subcategory) => (
          <Link
            key={subcategory}
            href={`/buscar?familia=${params.slug}&sub=${encodeURIComponent(
              subcategory.toLowerCase()
            )}`}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600"
          >
            {subcategory}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhum anuncio encontrado para esta familia.
          </div>
        ) : (
          listings.map((item) => (
            <ListingCard
              key={item.id}
              href={`/produto/${item.id}`}
              title={item.title}
              priceCents={item.price_cents}
              thumbnailUrl={item.thumbnail_url}
              platformFallback={item.platform}
              condition={item.condition}
              shippingAvailable={item.shipping_available}
              freeShipping={item.free_shipping}
              familyLabel={family?.name ?? item.family ?? "Plataforma"}
            />
          ))
        )}
      </div>
    </div>
  );
}
