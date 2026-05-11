import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AffiliateViewTracker from "@/components/analytics/AffiliateViewTracker";
import MetaCatalogViewTracker from "@/components/analytics/MetaCatalogViewTracker";
import AffiliateBuyButton from "@/components/affiliate/AffiliateBuyButton";
import AffiliateProductCard from "@/components/affiliate/AffiliateProductCard";
import AffiliateExitIntentDownsell from "@/components/affiliate/AffiliateExitIntentDownsell";
import ListingCard from "@/components/listings/ListingCard";
import ProductGallery from "@/components/product/ProductGallery";
import ShareProductButton from "@/components/product/ShareProductButton";
import { buildMetaCatalogAffiliateId } from "@/lib/analytics/metaCatalog";
import {
  getResolvedAffiliateProductBySlug,
  listAffiliateProducts,
} from "@/lib/affiliate/catalog";
import { filterListingsForFamily, getPublicCatalogListings } from "@/lib/listings/public-catalog";
import { buildListingPath } from "@/lib/listings/url";
import { FAMILIES } from "@/lib/mock/data";
import {
  buildAffiliateCheckoutPath,
  buildAffiliateProductAbsoluteUrl,
  buildAffiliateRecommendationPath,
  type AffiliateProduct,
} from "@/lib/affiliate/products";
import { formatCentsToBRL } from "@/lib/utils/price";

type PageProps = {
  params: Promise<{
    slug: string;
  }> | {
    slug: string;
  };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const product = await getResolvedAffiliateProductBySlug(resolvedParams.slug);

  if (!product) {
    return {
      title: "Parceiro nao encontrado | GANM OLS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const url = buildAffiliateProductAbsoluteUrl(product.slug);

  return {
    title: `${product.title} | Parceiros GANM OLS`,
    description: product.seoDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title: product.title,
      description: product.seoDescription,
      url,
      siteName: "GANM OLS",
      images: [
        {
          url: product.images[0],
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.seoDescription,
      images: [product.images[0]],
    },
  };
}

function StarRatingDisplay({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className="flex items-center gap-1 text-zinc-900">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < filled;
        return (
          <svg
            key={`affiliate-star-${index + 1}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={active ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            className={active ? "text-zinc-900" : "text-zinc-300"}
          >
            <path
              d="M12 2l2.9 6.1 6.7.6-5 4.3 1.5 6.6L12 16l-6.1 3.6L7.4 13l-5-4.3 6.7-.6L12 2Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}

function getRatingBreakdownPercent(value: string) {
  const match = value.match(/\d+/);

  if (!match) {
    return 0;
  }

  const percent = Number.parseInt(match[0], 10);
  return Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
}

function normalizeRecommendationText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAffiliateSearchText(product: AffiliateProduct) {
  return normalizeRecommendationText(
    [
      product.title,
      product.shortTitle,
      product.brand,
      product.categoryLabel,
      product.description,
      ...product.about,
      ...product.bullets,
      ...product.details.map((detail) => `${detail.label} ${detail.value}`),
    ].join(" ")
  );
}

function getListingSearchText(listing: {
  title: string | null;
  platform?: string | null;
  model?: string | null;
  description?: string | null;
}) {
  return normalizeRecommendationText(
    [listing.title, listing.platform, listing.model, listing.description]
      .filter(Boolean)
      .join(" ")
  );
}

const PRODUCT_THEME_MAP = [
  { slug: "switch-2", keywords: ["switch 2", "joy con 2"] },
  { slug: "switch-lite", keywords: ["switch lite"] },
  { slug: "switch", keywords: ["nintendo switch", "switch pro controller", "switch"] },
  { slug: "snes", keywords: ["super nintendo", "snes", "super mini sfc", "super famicom"] },
  { slug: "famicom", keywords: ["family computer", "famicom", "classic mini"] },
  { slug: "game-boy-advance", keywords: ["game boy advance", "gba"] },
  { slug: "nintendo-64", keywords: ["nintendo 64", "n64"] },
  { slug: "wii", keywords: ["nintendo wii", "wii "] },
  { slug: "gamecube", keywords: ["game cube", "gamecube"] },
  { slug: "atari-2600", keywords: ["atari 2600", "polyvox", "atari "] },
  { slug: "mega-drive", keywords: ["mega drive", "master system"] },
  { slug: "dreamcast", keywords: ["dream cast", "dreamcast"] },
  { slug: "psp", keywords: ["psp"] },
  { slug: "ps2", keywords: ["playstation 2", "ps2"] },
  { slug: "ps1", keywords: ["playstation 1", "ps one", "ps1", "psx"] },
  { slug: "ps3", keywords: ["playstation 3", "ps3"] },
  { slug: "xbox-360", keywords: ["xbox 360", "kinect"] },
  { slug: "retro-mini", keywords: ["mini super nintendo", "retro mini", "fliperama arcadian"] },
  { slug: "display-cartuchos", keywords: ["expositora de cartuchos", "expositora"] },
];

const ACCESSORY_KEYWORDS = [
  "controle",
  "case",
  "capa",
  "pelicula",
  "protetor",
  "grip",
  "estojo",
  "kit",
  "thumb",
  "thumb grip",
  "joystick",
  "cabo",
  "adaptador",
  "suporte",
  "bolsa",
  "memory card",
  "cartao",
  "kinect",
  "sensor",
  "camera",
  "caixa",
  "berco",
  "expositora",
];

function getProductThemes(text: string) {
  return PRODUCT_THEME_MAP.filter((theme) =>
    theme.keywords.some((keyword) => text.includes(keyword))
  ).map((theme) => theme.slug);
}

function sharesRecommendationLine(
  current: AffiliateProduct,
  candidate: AffiliateProduct
) {
  const currentThemes = getProductThemes(getAffiliateSearchText(current));
  const candidateThemes = getProductThemes(getAffiliateSearchText(candidate));

  if (currentThemes.length > 0) {
    return currentThemes.some((theme) => candidateThemes.includes(theme));
  }

  if (candidateThemes.length > 0) {
    return false;
  }

  return candidate.familySlug === current.familySlug;
}

function getAffiliateProductKind(product: AffiliateProduct) {
  const text = getAffiliateSearchText(product);
  const isAccessory = ACCESSORY_KEYWORDS.some((keyword) => text.includes(keyword));

  if (isAccessory) {
    return "accessory" as const;
  }

  return "console" as const;
}

function getAffiliateRecommendationScore(
  current: AffiliateProduct,
  candidate: AffiliateProduct
) {
  const currentText = getAffiliateSearchText(current);
  const candidateText = getAffiliateSearchText(candidate);
  const currentThemes = getProductThemes(currentText);
  const candidateThemes = getProductThemes(candidateText);
  const sharedThemes = currentThemes.filter((theme) => candidateThemes.includes(theme));
  const currentKind = getAffiliateProductKind(current);
  const candidateKind = getAffiliateProductKind(candidate);
  const sameLine = sharesRecommendationLine(current, candidate);

  let score = 0;

  if (!sameLine) {
    return -1000;
  }

  if (candidate.familySlug === current.familySlug) {
    score += 6;
  }

  if (candidate.brand === current.brand) {
    score += 3;
  }

  if (sharedThemes.length > 0) {
    score += sharedThemes.length * 12;
  }

  if (candidateKind === currentKind) {
    score += 3;
  }

  if (candidate.isFeatured) {
    score += 2;
  }

  if (candidate.isWeekOffer) {
    score += 1;
  }

  return score;
}

function isComplementaryAffiliateProduct(
  current: AffiliateProduct,
  candidate: AffiliateProduct
) {
  const currentText = getAffiliateSearchText(current);
  const candidateText = getAffiliateSearchText(candidate);
  const currentThemes = getProductThemes(currentText);
  const candidateThemes = getProductThemes(candidateText);
  const sharesTheme = currentThemes.some((theme) => candidateThemes.includes(theme));
  const currentKind = getAffiliateProductKind(current);
  const candidateKind = getAffiliateProductKind(candidate);
  const sameLine = sharesRecommendationLine(current, candidate);

  if (!sameLine) {
    return false;
  }

  if (currentKind === "console") {
    return candidateKind === "accessory" && (sharesTheme || candidate.familySlug === current.familySlug);
  }

  if (currentKind === "accessory") {
    return (
      ((candidateKind === "console") && (sharesTheme || candidate.familySlug === current.familySlug)) ||
      ((candidateKind === "accessory") && sharesTheme)
    );
  }

  return candidate.familySlug === current.familySlug;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const [product, affiliateProducts, publicCatalogListings] = await Promise.all([
    getResolvedAffiliateProductBySlug(resolvedParams.slug),
    listAffiliateProducts(),
    getPublicCatalogListings(),
  ]);

  if (!product) {
    notFound();
  }

  const shareUrl = buildAffiliateProductAbsoluteUrl(product.slug);
  const sortedAffiliateCandidates = affiliateProducts
    .filter((item) => item.slug !== product.slug)
    .map((item) => ({
      product: item,
      score: getAffiliateRecommendationScore(product, item),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.product.isFeatured !== right.product.isFeatured) {
        return left.product.isFeatured ? -1 : 1;
      }
      return right.product.priceCents - left.product.priceCents;
    })
    .map((entry) => entry.product);

  const currentKind = getAffiliateProductKind(product);

  const upsellProduct =
    sortedAffiliateCandidates.find((item) => {
      if (item.priceCents <= product.priceCents) {
        return false;
      }

      return (
        getAffiliateProductKind(item) === currentKind &&
        sharesRecommendationLine(product, item)
      );
    }) ?? null;

  const crossSellProducts = sortedAffiliateCandidates
    .filter((item) => item.slug !== upsellProduct?.slug)
    .filter((item) => isComplementaryAffiliateProduct(product, item))
    .slice(0, 3);

  const compareProducts = sortedAffiliateCandidates
    .filter((item) => item.slug !== upsellProduct?.slug)
    .filter((item) => !crossSellProducts.some((crossItem) => crossItem.slug === item.slug))
    .filter((item) => getAffiliateProductKind(item) === currentKind)
    .filter((item) => sharesRecommendationLine(product, item))
    .slice(0, 3);

  const cheaperSameKindProducts = sortedAffiliateCandidates.filter((item) => {
    if (item.priceCents >= product.priceCents) {
      return false;
    }

    return (
      getAffiliateProductKind(item) === currentKind &&
      sharesRecommendationLine(product, item)
    );
  });

  const downsellProducts = [
    ...cheaperSameKindProducts,
    ...sortedAffiliateCandidates.filter(
      (item) => item.priceCents < product.priceCents && sharesRecommendationLine(product, item)
    ),
  ]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug) === index)
    .slice(0, 2);

  const currentFamily = FAMILIES.find((family) => family.slug === product.familySlug) ?? null;
  const currentThemeTerms = getProductThemes(getAffiliateSearchText(product));
  const nativeListings = currentFamily
    ? filterListingsForFamily(publicCatalogListings, currentFamily)
        .filter((listing) => {
          if (currentThemeTerms.length === 0) {
            return true;
          }

          const listingText = getListingSearchText(listing);
          return currentThemeTerms.some((theme) => {
            const config = PRODUCT_THEME_MAP.find((item) => item.slug === theme);
            return config?.keywords.some((keyword) => listingText.includes(keyword)) ?? false;
          });
        })
        .slice(0, 4)
    : [];
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );
  const ratingTitle = product.ratingTitle ?? "Avaliacoes de clientes";
  const ratingNote =
    product.ratingNote ??
    "A distribuicao detalhada por estrelas nao foi informada para este produto.";

  return (
    <div className="space-y-8">
      <AffiliateViewTracker slug={product.slug} />
      <AffiliateExitIntentDownsell
        currentSlug={product.slug}
        currentTitle={product.shortTitle || product.title}
        products={downsellProducts}
      />
      <MetaCatalogViewTracker
        catalogId={buildMetaCatalogAffiliateId(product.slug)}
        title={product.title}
        priceCents={product.priceCents}
        category={product.categoryLabel}
        brand={product.brand}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0">
          <ProductGallery
            title={product.title}
            images={product.images.map((url, index) => ({
              id: `${product.slug}-${index + 1}`,
              url,
            }))}
          />
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:row-span-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {product.highlightLabel ?? product.partnerLabel}
                </p>
                <h1 className="break-words text-2xl font-semibold text-zinc-900">
                  {product.title}
                </h1>
                <p className="break-words text-sm text-zinc-600">
                  {product.categoryLabel}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {product.discountLabel ? (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  {product.discountLabel}
                </p>
              ) : null}
              <div className="text-3xl font-semibold text-zinc-900">
                {formatCentsToBRL(product.priceCents)}
              </div>
              <p className="text-sm font-medium text-zinc-600">
                {product.installmentLabel}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <StarRatingDisplay rating={product.rating} size={16} />
              <span className="rounded-full border border-zinc-200 px-2 py-1">
                {String(product.rating).replace(".", ",")}/5
              </span>
              <span>{product.reviewCountLabel}</span>
            </div>

            <div className="mt-5 space-y-3">
              <AffiliateBuyButton
                href={buildAffiliateCheckoutPath(product.slug, "product_page")}
                slug={product.slug}
                title={product.title}
                brand={product.brand}
                category={product.categoryLabel}
                partner={product.partnerName}
                label={product.buyButtonLabel ?? "Comprar agora"}
                className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              />
              <Link
                href="/entrar?role=seller#criar-conta"
                className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
              >
                Seja vendedor
              </Link>
              <Link
                href="/parceiros"
                className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
              >
                Ver outros parceiros
              </Link>
            </div>
            <div className="mt-4">
              <ShareProductButton title={product.title} url={shareUrl} />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {ratingTitle}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <p className="text-3xl font-semibold text-zinc-900">
                {String(product.rating).replace(".", ",")}
              </p>
              <div>
                <StarRatingDisplay rating={product.rating} size={16} />
                <p className="mt-1 text-xs text-zinc-500">
                  {product.reviewCountLabel}
                </p>
              </div>
            </div>

            {product.ratingBreakdown.length > 0 ? (
              <div className="mt-4 space-y-3">
                {product.ratingBreakdown.map((entry) => {
                  const percent = getRatingBreakdownPercent(entry.value);

                  return (
                    <div
                      key={entry.label}
                      className="grid grid-cols-[72px_minmax(0,1fr)_48px] items-center gap-3 text-sm text-zinc-600"
                    >
                      <span>{entry.label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-zinc-900"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-right font-semibold text-zinc-900">
                        {entry.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                {ratingNote}
              </p>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  label: "Marca",
                  value: product.brand,
                },
                {
                  label: "Familia",
                  value:
                    familyLabelBySlug[product.familySlug] ?? product.familySlug,
                },
                {
                  label: "Categoria",
                  value: product.categoryLabel,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {item.label}
                  </p>
                  <p className="mt-2 font-semibold text-zinc-900">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          {upsellProduct ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Veja tambem
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                    Outra opcao parecida
                  </h2>
                </div>
                <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600">
                  Comparar
                </span>
              </div>
              <div className="mt-4 max-w-sm">
                <AffiliateProductCard
                  product={upsellProduct}
                  href={buildAffiliateRecommendationPath(
                    upsellProduct.slug,
                    "upsell",
                    product.slug
                  )}
                  trackingContext={{
                    source: "upsell",
                    fromSlug: product.slug,
                    fromTitle: product.title,
                  }}
                />
              </div>
            </section>
          ) : null}

          {crossSellProducts.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Mais opcoes
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                    Quem viu este produto tambem comprou
                  </h2>
                </div>
                <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600">
                  Relacionados
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {crossSellProducts.map((item) => (
                  <AffiliateProductCard
                    key={item.slug}
                    product={item}
                    href={buildAffiliateRecommendationPath(
                      item.slug,
                      "cross_sell",
                      product.slug
                    )}
                    trackingContext={{
                      source: "cross_sell",
                      fromSlug: product.slug,
                      fromTitle: product.title,
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Sobre este item</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-600">
              {product.about.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 inline-block h-2 w-2 rounded-full bg-zinc-900" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {product.videoUrl ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                {product.videoLabel ?? "Video do produto"}
              </h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950">
                <video
                  controls
                  preload="metadata"
                  playsInline
                  className="aspect-video w-full"
                  src={product.videoUrl}
                >
                  Seu navegador nao suporta video incorporado.
                </video>
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Descricao</h2>
            <p className="mt-3 break-words whitespace-pre-line text-sm leading-7 text-zinc-600">
              {product.description}
            </p>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Detalhes do produto
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {product.details.map((detail) => (
                <div
                  key={detail.label}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {detail.label}
                  </p>
                  <p className="mt-2 font-semibold text-zinc-900">{detail.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Destaques do produto
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-zinc-600">
              {product.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-2 inline-block h-2 w-2 rounded-full bg-zinc-900" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>

          {compareProducts.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Mais opcoes
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                    Voce tambem pode gostar
                  </h2>
                </div>
                <Link
                  href="/parceiros"
                  className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  Ver mais
                </Link>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {compareProducts.map((item) => (
                  <AffiliateProductCard
                    key={item.slug}
                    product={item}
                    href={buildAffiliateRecommendationPath(
                      item.slug,
                      "compare",
                      product.slug
                    )}
                    trackingContext={{
                      source: "compare",
                      fromSlug: product.slug,
                      fromTitle: product.title,
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {nativeListings.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Mais anuncios
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                    Anuncios parecidos
                  </h2>
                </div>
                <Link
                  href={currentFamily ? `/marca/${currentFamily.slug}` : "/categorias"}
                  className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  Ver mais
                </Link>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {nativeListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    href={buildListingPath(listing.id, listing.title)}
                    title={listing.title ?? "Anuncio sem titulo"}
                    priceCents={listing.price_cents}
                    thumbnailUrl={listing.thumbnail_url}
                    platformFallback={listing.platform}
                    condition={listing.condition}
                    shippingAvailable={listing.shipping_available}
                    freeShipping={listing.free_shipping}
                    familyLabel={familyLabelBySlug[String(listing.family ?? "").toLowerCase()] ?? listing.family}
                    tag="Vendedor"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
