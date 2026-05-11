import CatalogAiAnalyzer from "@/components/admin/CatalogAiAnalyzer";
import {
  analyzeCatalogAiProducts,
  type CatalogAiProductInput,
} from "@/lib/admin/catalog-ai";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listAffiliateProducts } from "@/lib/affiliate/catalog";
import { buildAffiliateProductPath } from "@/lib/affiliate/products";

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

export default async function Page() {
  const { supabase } = await requireAdmin();
  const affiliateProducts = await listAffiliateProducts({ includeInactive: true });

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
      id: product.slug,
      sourceType: "affiliate",
      title: product.title,
      description: [
        product.description,
        ...product.about,
        ...product.bullets,
        ...product.details.map((detail) => `${detail.label}: ${detail.value}`),
      ].join("\n"),
      priceCents: product.priceCents,
      platform: product.brand,
      category: product.categoryLabel,
      sourceUrl: buildAffiliateProductPath(product.slug),
      affiliateUrl: product.externalUrl,
      images: product.images,
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
