import type { MetadataRoute } from "next";

import { getAllBlogPosts } from "@/lib/blog/posts";
import { listAffiliateProducts } from "@/lib/affiliate/catalog";
import {
  buildAffiliateProductPath,
} from "@/lib/affiliate/products";
import { buildBlogIndexPath, buildBlogPostPath } from "@/lib/blog/locales";
import {
  buildFamilySubcategoryPath,
  FAMILIES,
  SUBCATEGORIES,
} from "@/lib/mock/data";
import {
  filterListingsForFamily,
  filterListingsForSubcategory,
  getPublicCatalogListings,
} from "@/lib/listings/public-catalog";
import { buildListingPath } from "@/lib/listings/url";
import { buildAbsoluteUrl } from "@/lib/utils/site";

export const revalidate = 3600;

function parseDate(value: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeImageUrl(value: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return buildAbsoluteUrl(trimmed);
  }

  return undefined;
}

function buildStaticRoutes({
  indexableFamilySlugs,
  indexableSubcategoryKeys,
}: {
  indexableFamilySlugs: Set<string>;
  indexableSubcategoryKeys: Set<string>;
}): MetadataRoute.Sitemap {
  return [
    {
      url: buildAbsoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildAbsoluteUrl("/categorias"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: buildAbsoluteUrl("/blog"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildAbsoluteUrl("/parceiros"),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: buildAbsoluteUrl(buildBlogIndexPath("en")),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: buildAbsoluteUrl("/lojas"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: buildAbsoluteUrl("/compra-protegida"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: buildAbsoluteUrl("/valores"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: buildAbsoluteUrl("/contato"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: buildAbsoluteUrl("/excluir-conta"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: buildAbsoluteUrl("/politica-de-privacidade"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: buildAbsoluteUrl("/politica-de-devolucao"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: buildAbsoluteUrl("/termos-de-uso"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...FAMILIES.filter((family) => indexableFamilySlugs.has(family.slug)).map((family) => ({
      url: buildAbsoluteUrl(`/marca/${family.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...FAMILIES.flatMap((family) =>
      (SUBCATEGORIES[family.slug] ?? [])
        .filter((subcategory) =>
          indexableSubcategoryKeys.has(`${family.slug}::${subcategory}`)
        )
        .map((subcategory) => ({
          url: buildAbsoluteUrl(buildFamilySubcategoryPath(family.slug, subcategory)),
          changeFrequency: "weekly" as const,
          priority: 0.65,
        }))
    ),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const affiliateProducts = await listAffiliateProducts();
  const blogPosts = [...getAllBlogPosts("pt"), ...getAllBlogPosts("en")];
  const listings = await getPublicCatalogListings();
  const sellerLastModified = new Map<string, Date>();
  const indexableFamilySlugs = new Set<string>();
  const indexableSubcategoryKeys = new Set<string>();

  for (const family of FAMILIES) {
    const familyListings = filterListingsForFamily(listings, family);
    if (familyListings.length > 0) {
      indexableFamilySlugs.add(family.slug);
    }

    for (const subcategory of SUBCATEGORIES[family.slug] ?? []) {
      const subcategoryListings = filterListingsForSubcategory(
        familyListings,
        family,
        subcategory
      );
      if (subcategoryListings.length > 0) {
        indexableSubcategoryKeys.add(`${family.slug}::${subcategory}`);
      }
    }
  }

  const staticRoutes = buildStaticRoutes({
    indexableFamilySlugs,
    indexableSubcategoryKeys,
  });

  for (const listing of listings) {
    const timestamp = parseDate(listing.updated_at) ?? parseDate(listing.created_at);
    if (!timestamp) {
      continue;
    }

    const current = sellerLastModified.get(listing.seller_user_id);
    if (!current || timestamp > current) {
      sellerLastModified.set(listing.seller_user_id, timestamp);
    }
  }

  const productRoutes: MetadataRoute.Sitemap = listings.map((listing) => {
    const image = normalizeImageUrl(listing.thumbnail_url);

    return {
      url: buildAbsoluteUrl(buildListingPath(listing.id, listing.title)),
      lastModified: parseDate(listing.updated_at) ?? parseDate(listing.created_at),
      changeFrequency: "daily",
      priority: 0.7,
      images: image ? [image] : undefined,
    };
  });

  const storeRoutes: MetadataRoute.Sitemap = Array.from(sellerLastModified.entries()).map(
    ([sellerId, lastModified]) => ({
      url: buildAbsoluteUrl(`/lojas/${sellerId}`),
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
    })
  );

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: buildAbsoluteUrl(buildBlogPostPath(post.locale, post.slug)),
    lastModified: parseDate(post.updatedAt ?? post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const affiliateRoutes: MetadataRoute.Sitemap = affiliateProducts.map(
    (product) => ({
      url: buildAbsoluteUrl(buildAffiliateProductPath(product.slug)),
      lastModified: parseDate(product.publishedAt),
      changeFrequency: "weekly",
      priority: 0.65,
      images: [product.images[0]],
    })
  );

  return [
    ...staticRoutes,
    ...blogRoutes,
    ...affiliateRoutes,
    ...storeRoutes,
    ...productRoutes,
  ];
}
