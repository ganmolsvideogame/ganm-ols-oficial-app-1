import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  buildFamilySubcategoryPath,
  FAMILIES,
  SUBCATEGORIES,
} from "@/lib/mock/data";
import {
  filterListingsForFamily,
  getPublicCatalogListings,
} from "@/lib/listings/public-catalog";
import { buildListingPath } from "@/lib/listings/url";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAbsoluteUrl } from "@/lib/utils/site";
import ListingCard from "@/components/listings/ListingCard";

export const revalidate = 3600;

type PageProps = {
  params: { slug: string } | Promise<{ slug: string }>;
};

async function resolvePageData(slug: string) {
  const family = FAMILIES.find((item) => item.slug === slug);

  if (!family) {
    return null;
  }

  const subcategories = SUBCATEGORIES[slug] ?? [];
  const listings = filterListingsForFamily(await getPublicCatalogListings(), family);

  return { family, subcategories, listings };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const pageData = await resolvePageData(resolvedParams.slug);

  if (!pageData) {
    return {
      title: "Plataforma nao encontrada | GANM OLS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { family, listings } = pageData;
  const canonicalPath = `/marca/${family.slug}`;
  const hasListings = listings.length > 0;
  const description = hasListings
    ? `Anuncios de ${family.name} na GANM OLS, com consoles, jogos e colecionaveis publicados por vendedores reais.`
    : `A categoria ${family.name} da GANM OLS ainda nao possui anuncios ativos publicados.`;

  return {
    title: `${family.name} | GANM OLS`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: hasListings
      ? undefined
      : {
          index: false,
          follow: true,
        },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "GANM OLS",
      url: buildAbsoluteUrl(canonicalPath),
      title: `${family.name} | GANM OLS`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${family.name} | GANM OLS`,
      description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const pageData = await resolvePageData(resolvedParams.slug);

  if (!pageData) {
    notFound();
  }

  const { family, subcategories, listings } = pageData;
  const admin = createAdminClient();
  const now = new Date();

  const { data: categorySection } = await admin
    .from("home_sections")
    .select("id, title, description, starts_at, ends_at, is_active")
    .eq("slug", `category-${resolvedParams.slug}`)
    .eq("section_type", "category")
    .maybeSingle();

  const showCategorySection =
    categorySection?.is_active !== false &&
    (!categorySection?.starts_at || new Date(categorySection.starts_at) <= now) &&
    (!categorySection?.ends_at || new Date(categorySection.ends_at) >= now);

  const { data: categoryItems } = showCategorySection && categorySection?.id
    ? await admin
        .from("home_items")
        .select("id, image_url, href")
        .eq("section_id", categorySection.id)
        .order("position", { ascending: true })
        .limit(1)
    : { data: [] };

  const categoryBanner = (categoryItems ?? [])[0];

  return (
    <div className="space-y-8">
      {categoryBanner?.image_url ? (
        <div
          className="mx-auto max-w-[2172px] overflow-hidden bg-white"
          style={{ aspectRatio: "2172 / 724" }}
        >
          {categoryBanner.href ? (
            <Link href={categoryBanner.href} className="block h-full w-full">
              <img
                src={categoryBanner.image_url}
                alt={categorySection?.title || family?.name || "Banner"}
                className="h-full w-full object-contain"
                width={2172}
                height={724}
                loading="eager"
                decoding="async"
              />
            </Link>
          ) : (
            <img
              src={categoryBanner.image_url}
              alt={categorySection?.title || family?.name || "Banner"}
              className="h-full w-full object-contain"
              width={2172}
              height={724}
              loading="eager"
              decoding="async"
            />
          )}
        </div>
      ) : null}

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Plataforma
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {categorySection?.title || family?.name || "Plataforma nao encontrada"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {categorySection?.description ||
            family?.description ||
            "Veja outras familias e encontre seus consoles favoritos."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {subcategories.map((subcategory) => (
          <Link
            key={subcategory}
            href={buildFamilySubcategoryPath(resolvedParams.slug, subcategory)}
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
              href={buildListingPath(item.id, item.title)}
              title={item.title ?? "Anuncio"}
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
