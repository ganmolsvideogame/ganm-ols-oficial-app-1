import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ListingCard from "@/components/listings/ListingCard";
import {
  buildFamilySubcategoryPath,
  FAMILIES,
  resolveSubcategoryForFamily,
  SUBCATEGORIES,
} from "@/lib/mock/data";
import {
  filterListingsForSubcategory,
  getPublicCatalogListings,
} from "@/lib/listings/public-catalog";
import { buildListingPath } from "@/lib/listings/url";
import { buildAbsoluteUrl } from "@/lib/utils/site";

export const revalidate = 3600;

type PageParams = {
  slug: string;
  subslug: string;
};

type PageProps = {
  params: PageParams | Promise<PageParams>;
};

async function resolvePageData(params: PageParams) {
  const family = FAMILIES.find((item) => item.slug === params.slug);
  const subcategory = resolveSubcategoryForFamily(params.slug, params.subslug);

  if (!family || !subcategory) {
    return null;
  }

  const listings = filterListingsForSubcategory(
    await getPublicCatalogListings(),
    family,
    subcategory
  );

  return { family, subcategory, listings };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const pageData = await resolvePageData(resolvedParams);

  if (!pageData) {
    return {
      title: "Subcategoria nao encontrada | GANM OLS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { family, subcategory, listings } = pageData;
  const canonicalPath = buildFamilySubcategoryPath(family.slug, subcategory);
  const hasListings = listings.length > 0;
  const description = hasListings
    ? `Anuncios de ${subcategory} na categoria ${family.name} da GANM OLS.`
    : `A subcategoria ${subcategory} da familia ${family.name} ainda nao possui anuncios ativos publicados.`;

  return {
    title: `${subcategory} | ${family.name} | GANM OLS`,
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
      title: `${subcategory} | ${family.name}`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${subcategory} | ${family.name}`,
      description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const pageData = await resolvePageData(resolvedParams);

  if (!pageData) {
    notFound();
  }

  const { family, subcategory, listings } = pageData;
  const familySubcategories = SUBCATEGORIES[family.slug] ?? [];

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <Link href="/categorias" className="hover:text-zinc-900">
          Categorias
        </Link>
        <span>/</span>
        <Link href={`/marca/${family.slug}`} className="hover:text-zinc-900">
          {family.name}
        </Link>
        <span>/</span>
        <span className="font-semibold text-zinc-900">{subcategory}</span>
      </nav>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Subcategoria
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{subcategory}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Produtos de {subcategory} dentro da familia {family.name}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/marca/${family.slug}`}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
        >
          Ver tudo em {family.name}
        </Link>
        {familySubcategories.map((item) => {
          const href = buildFamilySubcategoryPath(family.slug, item);
          const isCurrent = item === subcategory;

          return (
            <Link
              key={item}
              href={href}
              className={`rounded-full border px-3 py-1 text-xs ${
                isCurrent
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {item}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhum anuncio encontrado para {subcategory}.
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
              familyLabel={subcategory}
            />
          ))
        )}
      </div>
    </div>
  );
}
