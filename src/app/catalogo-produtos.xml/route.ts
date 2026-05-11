import { listAffiliateProducts } from "@/lib/affiliate/catalog";
import { buildAffiliateProductAbsoluteUrl } from "@/lib/affiliate/products";
import {
  buildMetaCatalogAffiliateId,
  buildMetaCatalogListingId,
} from "@/lib/analytics/metaCatalog";
import { getPublicCatalogListings } from "@/lib/listings/public-catalog";
import { buildListingPath } from "@/lib/listings/url";
import { buildAbsoluteUrl } from "@/lib/utils/site";

export const revalidate = 3600;

function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatPriceBRL(value: number | null | undefined) {
  const price = Number(value ?? 0);
  return `${(price / 100).toFixed(2)} BRL`;
}

export async function GET() {
  const [listings, affiliateProducts] = await Promise.all([
    getPublicCatalogListings(),
    listAffiliateProducts(),
  ]);

  const sellerItems = listings.map((listing) => {
    const link = buildAbsoluteUrl(buildListingPath(listing.id, listing.title));
    const image = String(listing.thumbnail_url ?? "").trim();

    return `
      <item>
        <g:id>${escapeXml(buildMetaCatalogListingId(listing.id))}</g:id>
        <title>${escapeXml(listing.title || "Produto GANM OLS")}</title>
        <link>${escapeXml(link)}</link>
        <description>${escapeXml(listing.description || listing.title || "Produto disponivel na GANM OLS")}</description>
        <g:price>${escapeXml(formatPriceBRL(listing.price_cents))}</g:price>
        <g:availability>in stock</g:availability>
        <g:condition>${escapeXml((listing.condition || "used").toLowerCase())}</g:condition>
        <g:brand>${escapeXml(listing.platform || listing.family || "GANM OLS")}</g:brand>
        <g:product_type>${escapeXml(listing.family || "Marketplace")}</g:product_type>
        ${image ? `<g:image_link>${escapeXml(image)}</g:image_link>` : ""}
      </item>`;
  });

  const affiliateItems = affiliateProducts.map((product) => `
      <item>
        <g:id>${escapeXml(buildMetaCatalogAffiliateId(product.slug))}</g:id>
        <title>${escapeXml(product.title)}</title>
        <link>${escapeXml(buildAffiliateProductAbsoluteUrl(product.slug))}</link>
        <description>${escapeXml(product.description)}</description>
        <g:price>${escapeXml(formatPriceBRL(product.priceCents))}</g:price>
        <g:availability>in stock</g:availability>
        <g:condition>new</g:condition>
        <g:brand>${escapeXml(product.brand)}</g:brand>
        <g:product_type>${escapeXml(product.categoryLabel)}</g:product_type>
        <g:image_link>${escapeXml(product.images[0])}</g:image_link>
      </item>`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>GANM OLS Catalogo de Produtos</title>
    <link>${escapeXml(buildAbsoluteUrl("/"))}</link>
    <description>Feed XML publico com produtos ativos e afiliados da GANM OLS.</description>
    ${sellerItems.join("")}
    ${affiliateItems.join("")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
