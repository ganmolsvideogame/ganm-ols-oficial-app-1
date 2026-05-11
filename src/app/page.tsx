import Link from "next/link";

import { FAMILIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PromoModal from "@/components/home/PromoModal";
import MobileHomeExperience, {
  type MobileHomeListing,
} from "@/components/home/MobileHomeExperience";
import QuickAccess from "@/components/home/QuickAccess";
import LanceCard from "@/components/ui/LanceCard";
import ProductCard from "@/components/ui/ProductCard";
import AffiliateProductCard from "@/components/affiliate/AffiliateProductCard";
import { BannerCarousel } from "@/components/ml/BannerCarousel";
import { ProductCarousel } from "@/components/ml/ProductCarousel";
import { closeExpiredAuctions } from "@/lib/auctions";
import { listHomeAffiliateProducts } from "@/lib/affiliate/catalog";
import type { AffiliateProduct } from "@/lib/affiliate/products";
import { buildListingPath } from "@/lib/listings/url";

export const dynamic = "force-dynamic";

type ListingCardData = {
  id: string;
  title: string;
  price_cents: number | null;
  condition: string | null;
  family: string | null;
  platform: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  thumbnail_url: string | null;
  description: string | null;
  listing_type?: string | null;
};

type AuctionCard = {
  id: string;
  title: string;
  price_cents: number | null;
  family: string | null;
  platform: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
};

type HomeSection = {
  id: string;
  title: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  position: number | null;
};

type HomeItem = {
  id: string;
  section_id: string;
  title: string | null;
  image_url: string | null;
  href: string | null;
  cta_label: string | null;
  secondary_label: string | null;
  show_buttons: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  position: number | null;
};

function isWithinWindow(value: string | null, now: Date) {
  if (!value) {
    return true;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date <= now;
}

function isAfterWindow(_value: string | null, _now: Date) {
  void _value;
  void _now;
  return true;
}

function formatConditionLabel(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (["novo", "new"].includes(normalized)) {
    return "Novo";
  }
  if (["usado", "used", "seminovo", "semi-novo"].includes(normalized)) {
    return "Usado";
  }
  if (["recondicionado", "refurbished"].includes(normalized)) {
    return "Recondicionado";
  }
  return value;
}

function formatShippingLabel(
  shippingAvailable: boolean | null,
  freeShipping: boolean | null
) {
  if (freeShipping) {
    return "Frete gratis";
  }
  if (shippingAvailable) {
    return "Envio disponivel";
  }
  return null;
}

type AffiliateHomeGroup = {
  id: string;
  title: string;
  description: string;
  products: AffiliateProduct[];
};

const FAMILY_LABEL_BY_SLUG = Object.fromEntries(
  FAMILIES.map((family) => [family.slug, family.name])
);

function getAffiliateHomeGroupMeta(product: AffiliateProduct) {
  const haystack = [
    product.title,
    product.shortTitle,
    product.categoryLabel,
    product.highlightLabel,
    product.partnerLabel,
    product.brand,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("switch")) {
    return {
      id: "switch",
      title: "Nintendo Switch e Switch 2",
      description:
        "Consoles, controles, kits e acessorios para quem joga no ecossistema Nintendo atual.",
    };
  }

  if (
    haystack.includes("retro") ||
    haystack.includes("fliperama") ||
    haystack.includes("snes") ||
    haystack.includes("psx")
  ) {
    return {
      id: "retro",
      title: "Retro e nostalgia",
      description:
        "Consoles compactos, setups plug and play e produtos pensados para reviver geracoes classicas.",
    };
  }

  if (product.familySlug === "playstation") {
    return {
      id: "playstation",
      title: "PlayStation",
      description:
        "Produtos oficiais e parceiros ligados ao ecossistema PlayStation.",
    };
  }

  if (product.familySlug === "sega") {
    return {
      id: "sega",
      title: "SEGA e Mega Drive",
      description:
        "Consoles, acessorios e itens retro ligados ao ecossistema classico da SEGA.",
    };
  }

  if (product.familySlug === "xbox") {
    return {
      id: "xbox",
      title: "Xbox",
      description:
        "Produtos oficiais e parceiros voltados ao ecossistema Xbox.",
    };
  }

  const familyLabel = FAMILY_LABEL_BY_SLUG[product.familySlug];
  if (familyLabel) {
    return {
      id: product.familySlug,
      title: familyLabel,
      description: "",
    };
  }

  return {
    id: "outros",
    title: "Outros produtos",
    description: "",
  };
}

function groupAffiliateProducts(products: AffiliateProduct[]) {
  const groupOrder = [
    "switch",
    "retro",
    "sega",
    "playstation",
    "xbox",
    "outros",
  ];
  const groups = new Map<string, AffiliateHomeGroup>();

  for (const product of products) {
    const meta = getAffiliateHomeGroupMeta(product);
    const current = groups.get(meta.id);

    if (current) {
      current.products.push(product);
      continue;
    }

    groups.set(meta.id, {
      ...meta,
      products: [product],
    });
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftIndex = groupOrder.indexOf(left.id);
    const rightIndex = groupOrder.indexOf(right.id);

    return (leftIndex === -1 ? groupOrder.length : leftIndex) -
      (rightIndex === -1 ? groupOrder.length : rightIndex);
  });
}

export default async function Home() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const affiliateProducts = await listHomeAffiliateProducts();
  const affiliateGroups = groupAffiliateProducts(affiliateProducts);
  await closeExpiredAuctions();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );

  const { data: featuredData } = await admin
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .eq("status", "active")
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .eq("is_featured", true)
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: auctionData } = await admin
    .from("listings_with_boost")
    .select("id, title, price_cents, family, platform, created_at, thumbnail_url")
    .eq("status", "active")
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .eq("listing_type", "auction")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: recentData } = await admin
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .eq("status", "active")
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: favoritesData } = user
    ? await admin
        .from("listing_favorites")
        .select("listing_id, listings(family)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(18)
    : { data: [] };

  const favoriteRows = (favoritesData ?? []) as {
    listing_id: string;
    listings: { family: string | null }[] | null;
  }[];

  const favoriteListingIds = favoriteRows
    .map((row) => row.listing_id)
    .filter((id): id is string => Boolean(id));

  const favoriteFamilies = Array.from(
    new Set(
      favoriteRows
        .map((row) => row.listings?.[0]?.family ?? null)
        .filter((family): family is string => Boolean(family))
    )
  ).slice(0, 3);

  const { data: inspiredDataRaw } =
    user && favoriteFamilies.length > 0
      ? await admin
          .from("listings_with_boost")
          .select(
            "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url, listing_type"
          )
          .eq("status", "active")
          .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
          .in("family", favoriteFamilies)
          .order("boost_priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(24)
      : { data: [] };

  const inspiredListings = ((inspiredDataRaw ?? []) as ListingCardData[])
    .filter((item) => item && !favoriteListingIds.includes(item.id))
    .slice(0, 12);

  const { data: modalSectionsData } = await supabase
    .from("home_sections")
    .select("id, title, description, starts_at, ends_at, position")
    .eq("section_type", "modal")
    .eq("is_active", true)
    .order("position", { ascending: true });

  const { data: bannerSectionsData } = await supabase
    .from("home_sections")
    .select("id, title, description, starts_at, ends_at, position")
    .eq("section_type", "banner")
    .order("position", { ascending: true });

  const featuredListings = (featuredData ?? []) as ListingCardData[];
  const auctions = (auctionData ?? []) as AuctionCard[];
  const recentListings = (recentData ?? []) as ListingCardData[];
  const modalSections = (modalSectionsData ?? []) as HomeSection[];
  const bannerSections = (bannerSectionsData ?? []) as HomeSection[];
  const modalSectionIds = modalSections.map((section) => section.id);
  const bannerSectionIds = bannerSections.map((section) => section.id);

  const { data: modalItemsData } =
    modalSectionIds.length > 0
      ? await supabase
          .from("home_items")
          .select(
            "id, section_id, title, image_url, href, cta_label, secondary_label, show_buttons, starts_at, ends_at, position"
          )
          .in("section_id", modalSectionIds)
          .order("position", { ascending: true })
      : { data: [] };

  const { data: bannerItemsData } =
    bannerSectionIds.length > 0
      ? await supabase
          .from("home_items")
          .select(
            "id, section_id, title, image_url, href, starts_at, ends_at, position"
          )
          .in("section_id", bannerSectionIds)
          .order("position", { ascending: true })
      : { data: [] };

  const modalItems = (modalItemsData ?? []) as HomeItem[];
  const bannerItems = (bannerItemsData ?? []) as HomeItem[];
  const now = new Date();
  const activeModalSections = modalSections.filter(
    (section) =>
      isWithinWindow(section.starts_at, now) &&
      isAfterWindow(section.ends_at, now)
  );

  const activeModalItems = modalItems.filter(
    (item) =>
      isWithinWindow(item.starts_at, now) &&
      isAfterWindow(item.ends_at, now)
  );

  const activeBannerItems = bannerItems.filter(
    (item) =>
      isWithinWindow(item.starts_at, now) &&
      isAfterWindow(item.ends_at, now)
  );

  const modalEntry = activeModalSections
    .map((section) => {
      const item = activeModalItems.find((entry) => entry.section_id === section.id);
      return item ? { section, item } : null;
    })
    .find((entry) => entry?.item?.image_url);

  const banners = activeBannerItems
    .filter((item) => Boolean(item.image_url))
    .map((item, index) => ({
      id: item.id,
      imageUrl: item.image_url ?? "",
      href: item.href || "/",
      alt: item.title || `Banner ${index + 1}`,
    }));
  const hasHeroBanner = banners.length > 0;
  const mobileListings: MobileHomeListing[] = [
    ...featuredListings.map((item) => ({
      id: item.id,
      title: item.title,
      priceCents: item.price_cents,
      family: item.family,
      platform: item.platform,
      imageUrl: item.thumbnail_url,
      href: buildListingPath(item.id, item.title),
      badge: "Destaque",
    })),
    ...recentListings.map((item) => ({
      id: item.id,
      title: item.title,
      priceCents: item.price_cents,
      family: item.family,
      platform: item.platform,
      imageUrl: item.thumbnail_url,
      href: buildListingPath(item.id, item.title),
      badge: "Novo",
    })),
    ...auctions.map((item) => ({
      id: item.id,
      title: item.title,
      priceCents: item.price_cents,
      family: item.family,
      platform: item.platform,
      imageUrl: item.thumbnail_url,
      href: buildListingPath(item.id, item.title),
      badge: "Lance",
    })),
  ];

  return (
    <div className="-mx-3 lg:-mx-4 2xl:-mx-5">
      {modalEntry ? (
        <PromoModal
          id={modalEntry.item.id}
          imageUrl={modalEntry.item.image_url ?? ""}
          href={modalEntry.item.href}
          title={modalEntry.item.title || modalEntry.section.title}
          subtitle={modalEntry.section.description}
          ctaLabel={modalEntry.item.cta_label}
          secondaryLabel={modalEntry.item.secondary_label}
          showButtons={modalEntry.item.show_buttons ?? true}
        />
      ) : null}

      <div className="md:hidden">
        <MobileHomeExperience
          banners={banners}
          affiliateProducts={affiliateProducts}
          listings={mobileListings}
        />
      </div>

      <div className="ganm-ml-scope hidden md:block">
        <div className="ml-stack">
          {hasHeroBanner ? (
            <div className="ml-module ml-pad-0">
              <div className="relative">
                <BannerCarousel banners={banners} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
              </div>
              <div className="mx-auto w-full max-w-7xl px-3 lg:px-4 2xl:px-5">
                <div className="relative z-10 -mt-8 pb-2 sm:-mt-10 md:-mt-14">
                  <QuickAccess variant="overlay" />
                </div>
              </div>
            </div>
          ) : null}

          <div className="ml-container">
            <div className="ml-module ml-pad">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <div className="ml-chip">Consoles e colecionaveis</div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
                    Consoles, jogos e colecionaveis.
                  </h1>
                  <p className="mt-3 text-base text-zinc-600 md:text-lg">
                    Prateleiras organizadas para quem compra, vende e coleciona
                    tecnologia gamer. Descubra familias classicas e novidades.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/leiloes" className="ml-btn ml-btn-primary">
                      Explorar lances
                    </Link>
                    <Link href="/categorias" className="ml-btn">
                      Ver categorias
                    </Link>
                    <Link href="/vender/comece" className="ml-btn">
                      Quero vender
                    </Link>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="ml-chip">Pagamentos seguros</span>
                    <span className="ml-chip">Comunidade retro</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasHeroBanner ? null : (
            <div className="ml-container">
              <div className="ml-module ml-pad">
                <div className="ml-head">
                  <h2 className="ml-title">Acessos rapidos</h2>
                </div>
                <div className="mt-4">
                  <QuickAccess />
                </div>
              </div>
            </div>
          )}

          {featuredListings.length > 0 ? (
            <div className="ml-container">
              <div className="ml-module ml-pad">
                <div className="ml-head">
                  <h2 className="ml-title">Destaques da semana</h2>
                  <Link className="ml-headlink" href="/ofertas">
                    Ver ofertas
                  </Link>
                </div>
                <div className="mt-4">
                  <ProductCarousel>
                    {featuredListings.map((item) => (
                      <div key={item.id} className="ml-rail-item">
                        <ProductCard
                          href={buildListingPath(item.id, item.title)}
                          title={item.title}
                          priceCents={item.price_cents}
                          thumbnailUrl={item.thumbnail_url}
                          badge="Destaque"
                          platformLabel={
                            item.platform ||
                            familyLabelBySlug[item.family ?? ""] ||
                            "Plataforma"
                          }
                          conditionLabel={formatConditionLabel(item.condition)}
                          shippingLabel={formatShippingLabel(
                            item.shipping_available,
                            item.free_shipping
                          )}
                        />
                      </div>
                    ))}
                  </ProductCarousel>
                </div>
              </div>
            </div>
          ) : null}

          {auctions.length > 0 ? (
            <div className="ml-container">
              <div className="ml-module ml-pad">
                <div className="ml-head">
                  <h2 className="ml-title">Lances em destaque</h2>
                  <Link className="ml-headlink" href="/leiloes">
                    Ver todos
                  </Link>
                </div>
                <div className="mt-4">
                  <ProductCarousel>
                    {auctions.map((auction) => (
                      <div key={auction.id} className="ml-rail-item">
                        <LanceCard
                          href={buildListingPath(auction.id, auction.title)}
                          title={auction.title}
                          priceCents={auction.price_cents}
                          thumbnailUrl={auction.thumbnail_url}
                          platformLabel={
                            auction.platform ||
                            familyLabelBySlug[auction.family ?? ""] ||
                            "Plataforma"
                          }
                          statusLabel="Programado"
                          tag="Destaque"
                        />
                      </div>
                    ))}
                  </ProductCarousel>
                </div>
              </div>
            </div>
          ) : null}

          {affiliateProducts.length > 0 ? (
            <div className="ml-container">
              <div className="ml-module ml-pad">
                <div className="ml-head">
                  <h2 className="ml-title">Produtos oficiais em destaque</h2>
                  <Link className="ml-headlink" href="/parceiros">
                    Ver parceiros
                  </Link>
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  Itens selecionados pela GANM OLS para ampliar o portifolio com
                  acessorios, consoles e produtos oficiais.
                </p>
                <div className="mt-6 space-y-8">
                  {affiliateGroups.map((group) => (
                    <section key={group.id} className="space-y-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          {group.title}
                        </h3>
                        {group.description ? (
                          <p className="text-sm text-zinc-600">{group.description}</p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {group.products.map((product) => (
                          <AffiliateProductCard
                            key={product.slug}
                            product={product}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {recentListings.length > 0 ? (
            <div className="ml-container" aria-label="Novos anuncios adicionados">
              <div className="ml-module ml-pad">
                <div className="ml-head">
                  <h2 className="ml-title">Novidades</h2>
                  <Link className="ml-headlink" href="/ofertas">
                    Ver mais
                  </Link>
                </div>
                <div className="mt-4">
                  <ProductCarousel>
                    {recentListings.map((item) => (
                      <div key={item.id} className="ml-rail-item">
                        <ProductCard
                          href={buildListingPath(item.id, item.title)}
                          title={item.title}
                          priceCents={item.price_cents}
                          thumbnailUrl={item.thumbnail_url}
                          badge="Novo"
                          platformLabel={
                            item.platform ||
                            familyLabelBySlug[item.family ?? ""] ||
                            "Plataforma"
                          }
                          conditionLabel={formatConditionLabel(item.condition)}
                          shippingLabel={formatShippingLabel(
                            item.shipping_available,
                            item.free_shipping
                          )}
                        />
                      </div>
                    ))}
                  </ProductCarousel>
                </div>
              </div>
            </div>
          ) : null}

          {user ? (
            inspiredListings.length > 0 ? (
              <div className="ml-container" aria-label="Inspirado nos seus favoritos">
                <div className="ml-module ml-pad">
                  <div className="ml-head">
                    <h2 className="ml-title">Inspirado nos seus favoritos</h2>
                    <Link className="ml-headlink" href="/favoritos">
                      Ver favoritos
                    </Link>
                  </div>
                  <div className="mt-4">
                    <ProductCarousel>
                      {inspiredListings.map((item) => (
                        <div key={item.id} className="ml-rail-item">
                          <ProductCard
                            href={buildListingPath(item.id, item.title)}
                            title={item.title}
                            priceCents={item.price_cents}
                            thumbnailUrl={item.thumbnail_url}
                            badge={item.listing_type === "auction" ? "Lance" : undefined}
                            platformLabel={
                              item.platform ||
                              familyLabelBySlug[item.family ?? ""] ||
                              "Plataforma"
                            }
                            conditionLabel={formatConditionLabel(item.condition)}
                            shippingLabel={formatShippingLabel(
                              item.shipping_available,
                              item.free_shipping
                            )}
                          />
                        </div>
                      ))}
                    </ProductCarousel>
                  </div>
                </div>
              </div>
            ) : favoriteListingIds.length === 0 ? (
              <div className="ml-container" aria-label="Favoritos vazios">
                <div className="ml-module ml-pad">
                  <div className="ml-tile p-5 text-sm text-zinc-600">
                    Salve anuncios nos favoritos para receber recomendacoes personalizadas.
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link href="/buscar" className="ml-btn ml-btn-primary">
                        Explorar anuncios
                      </Link>
                      <Link href="/favoritos" className="ml-btn">
                        Abrir favoritos
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ) : null}
        </div>
      </div>
    </div>
  );
}
