import "server-only";

import { type Family, getCategorySearchTerms } from "@/lib/mock/data";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicCatalogListingRow = {
  id: string;
  seller_user_id: string;
  title: string | null;
  price_cents: number | null;
  condition: string | null;
  family: string | null;
  platform: string | null;
  model: string | null;
  description: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  thumbnail_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeCatalogSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchesFamilyListing(
  listing: Pick<PublicCatalogListingRow, "family">,
  family: Family
) {
  const familyValue = String(listing.family ?? "").trim();
  if (!familyValue) {
    return false;
  }

  const normalizedFamilyValue = familyValue.toLowerCase();
  return (
    normalizedFamilyValue === family.slug ||
    normalizedFamilyValue.includes(family.name.toLowerCase())
  );
}

export function matchesSubcategoryListing(
  listing: Pick<
    PublicCatalogListingRow,
    "title" | "platform" | "model" | "description"
  >,
  subcategory: string
) {
  const haystack = normalizeCatalogSearchValue(
    [listing.title, listing.platform, listing.model, listing.description]
      .filter(Boolean)
      .join(" ")
  );

  if (!haystack) {
    return false;
  }

  return getCategorySearchTerms(subcategory).some((term) =>
    haystack.includes(normalizeCatalogSearchValue(term))
  );
}

export function filterListingsForFamily(
  listings: PublicCatalogListingRow[],
  family: Family
) {
  return listings.filter((listing) => matchesFamilyListing(listing, family));
}

export function filterListingsForSubcategory(
  listings: PublicCatalogListingRow[],
  family: Family,
  subcategory: string
) {
  return filterListingsForFamily(listings, family).filter((listing) =>
    matchesSubcategoryListing(listing, subcategory)
  );
}

export async function getPublicCatalogListings() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("listings_with_boost")
    .select(
      "id, seller_user_id, title, price_cents, condition, family, platform, model, description, shipping_available, free_shipping, thumbnail_url, created_at, updated_at"
    )
    .eq("status", "active")
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);

  return (data ?? []) as PublicCatalogListingRow[];
}
