import { createAdminClient } from "@/lib/supabase/admin";

import { loadImportedAffiliateProducts } from "@/lib/affiliate/import";
import { getAffiliateProducts, getAffiliateProductBySlug, type AffiliateProduct } from "@/lib/affiliate/products";

const AFFILIATE_STATE_KEY = "affiliate_product_states";

type AffiliateProductState = Partial<
  Pick<
    AffiliateProduct,
    "status" | "moderationStatus" | "showOnHome" | "isFeatured" | "isWeekOffer"
  >
> & {
  updatedAt?: string;
};

type AffiliateProductStateMap = Record<string, AffiliateProductState>;

function normalizeStateMap(raw: unknown): AffiliateProductStateMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const entries = Object.entries(raw as Record<string, unknown>);
  const stateMap: AffiliateProductStateMap = {};

  for (const [slug, value] of entries) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const candidate = value as Record<string, unknown>;
    stateMap[slug] = {
      status: candidate.status === "paused" ? "paused" : candidate.status === "active" ? "active" : undefined,
      moderationStatus:
        candidate.moderationStatus === "pending" ||
        candidate.moderationStatus === "hidden" ||
        candidate.moderationStatus === "approved"
          ? candidate.moderationStatus
          : undefined,
      showOnHome: typeof candidate.showOnHome === "boolean" ? candidate.showOnHome : undefined,
      isFeatured: typeof candidate.isFeatured === "boolean" ? candidate.isFeatured : undefined,
      isWeekOffer: typeof candidate.isWeekOffer === "boolean" ? candidate.isWeekOffer : undefined,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined,
    };
  }

  return stateMap;
}

async function loadAffiliateProductStateMap() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", AFFILIATE_STATE_KEY)
    .maybeSingle();

  const rawValue = String(data?.value ?? "").trim();
  if (!rawValue) {
    return {} satisfies AffiliateProductStateMap;
  }

  try {
    return normalizeStateMap(JSON.parse(rawValue));
  } catch {
    return {} satisfies AffiliateProductStateMap;
  }
}

function mergeAffiliateProductState(
  product: AffiliateProduct,
  stateMap: AffiliateProductStateMap
) {
  const state = stateMap[product.slug];

  if (!state) {
    return product;
  }

  return {
    ...product,
    status: state.status ?? product.status,
    moderationStatus: state.moderationStatus ?? product.moderationStatus,
    showOnHome: state.showOnHome ?? product.showOnHome,
    isFeatured: state.isFeatured ?? product.isFeatured,
    isWeekOffer: state.isWeekOffer ?? product.isWeekOffer,
  } satisfies AffiliateProduct;
}

export async function listAffiliateProducts(options?: { includeInactive?: boolean }) {
  const stateMap = await loadAffiliateProductStateMap();
  const importedProducts = await loadImportedAffiliateProducts();
  const includeInactive = options?.includeInactive === true;
  const products = [...getAffiliateProducts(), ...importedProducts].filter(
    (product, index, items) => items.findIndex((candidate) => candidate.slug === product.slug) === index
  );

  return products
    .map((product) => mergeAffiliateProductState(product, stateMap))
    .filter((product) => includeInactive || product.status === "active")
    .sort((left, right) => {
      if (left.isFeatured !== right.isFeatured) {
        return left.isFeatured ? -1 : 1;
      }
      if (left.isWeekOffer !== right.isWeekOffer) {
        return left.isWeekOffer ? -1 : 1;
      }
      return (
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
      );
    });
}

export async function listHomeAffiliateProducts() {
  const products = await listAffiliateProducts();

  return products
    .filter((product) => product.showOnHome)
    .sort((left, right) => {
      if (left.isFeatured !== right.isFeatured) {
        return left.isFeatured ? -1 : 1;
      }
      if (left.isWeekOffer !== right.isWeekOffer) {
        return left.isWeekOffer ? -1 : 1;
      }
      return (
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
      );
    });
}

export async function getResolvedAffiliateProductBySlug(
  slug: string,
  options?: { includeInactive?: boolean }
) {
  const importedProducts = await loadImportedAffiliateProducts();
  const product =
    getAffiliateProductBySlug(slug) ??
    importedProducts.find((item) => item.slug === slug) ??
    null;
  if (!product) {
    return null;
  }

  const stateMap = await loadAffiliateProductStateMap();
  const resolved = mergeAffiliateProductState(product, stateMap);

  if (options?.includeInactive === true) {
    return resolved;
  }

  if (resolved.status !== "active") {
    return null;
  }

  return resolved;
}

export async function loadAffiliateAdminState() {
  return loadAffiliateProductStateMap();
}

export async function saveAffiliateAdminState(
  slug: string,
  patch: AffiliateProductState
) {
  const admin = createAdminClient();
  const currentMap = await loadAffiliateProductStateMap();
  const currentEntry = currentMap[slug] ?? {};

  const nextEntry: AffiliateProductState = {
    ...currentEntry,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const nextMap: AffiliateProductStateMap = {
    ...currentMap,
    [slug]: nextEntry,
  };

  const { error } = await admin.from("site_settings").upsert(
    {
      key: AFFILIATE_STATE_KEY,
      value: JSON.stringify(nextMap),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  return { error };
}
