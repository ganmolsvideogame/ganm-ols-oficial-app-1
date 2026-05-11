import CatalogAiAnalyzer from "@/components/admin/CatalogAiAnalyzer";
import {
  analyzeCatalogAiProducts,
  type CatalogAiProductInput,
} from "@/lib/admin/catalog-ai";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ListingRow = {
  id: string;
  title: string | null;
  description: string | null;
  price_cents: number | null;
  platform: string | null;
  family: string | null;
  thumbnail_url: string | null;
};

type StoredAffiliateProduct = {
  slug?: string;
  title?: string;
  description?: string;
  about?: string[];
  bullets?: string[];
  details?: Array<{ label?: string; value?: string }>;
  priceCents?: number;
  brand?: string;
  categoryLabel?: string;
  externalUrl?: string;
  images?: string[];
  ratingNote?: string | null;
  reviewCountLabel?: string | null;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Faca login para acessar o admin"
      )}`
    );
  }

  const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || adminCheck !== true) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Sem permissao para acessar o admin"
      )}`
    );
  }

  return { supabase };
}

function isStoredAffiliateProduct(value: unknown): value is StoredAffiliateProduct {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function loadStoredAffiliateProducts() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "affiliate_imported_products_v1")
    .maybeSingle();

  const raw = String(data?.value ?? "").trim();
  if (!raw) {
    return [] as StoredAffiliateProduct[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isStoredAffiliateProduct) : [];
  } catch {
    return [] as StoredAffiliateProduct[];
  }
}

export default async function Page() {
  const { supabase } = await requireAdmin();
  const affiliateProducts = await loadStoredAffiliateProducts();

  const { data: listingsData } = await supabase
    .from("listings")
    .select("id, title, description, price_cents, platform, family, thumbnail_url")
    .order("created_at", { ascending: false })
    .limit(250);

  const marketplaceProducts = ((listingsData ?? []) as ListingRow[]).map(
    (listing): CatalogAiProductInput => ({
      id: listing.id,
      sourceType: "marketplace",
      title: listing.title ?? "",
      description: listing.description ?? "",
      priceCents: listing.price_cents ?? null,
      platform: listing.platform ?? "",
      category: listing.family ?? "",
      sourceUrl: `/produto/${listing.id}`,
      images: listing.thumbnail_url ? [listing.thumbnail_url] : [],
    })
  );

  const affiliateInputs = affiliateProducts.map(
    (product): CatalogAiProductInput => ({
      id: product.slug ?? product.title ?? "affiliate",
      sourceType: "affiliate",
      title: product.title ?? "",
      description: [
        product.description ?? "",
        ...(product.about ?? []),
        ...(product.bullets ?? []),
        ...(product.details ?? []).map((detail) => `${detail.label ?? ""}: ${detail.value ?? ""}`),
      ].join("\n"),
      priceCents: product.priceCents ?? null,
      platform: product.brand ?? "",
      category: product.categoryLabel ?? "",
      sourceUrl: product.slug ? `/parceiros/${encodeURIComponent(product.slug)}` : null,
      affiliateUrl: product.externalUrl,
      images: product.images ?? [],
      sellerRating: product.ratingNote ?? product.reviewCountLabel,
    })
  );

  const report = analyzeCatalogAiProducts([...affiliateInputs, ...marketplaceProducts]);

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Inteligencia interna
        </p>
        <h1 className="mt-3 text-2xl font-semibold">IA de catalogo GANM OLS</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-300">
          Analise de qualidade para produtos afiliados e anuncios da loja. Use
          esta tela antes de importar lotes grandes ou para encontrar gargalos no
          catalogo atual.
        </p>
      </section>

      <CatalogAiAnalyzer initialReport={report} />
    </main>
  );
}
