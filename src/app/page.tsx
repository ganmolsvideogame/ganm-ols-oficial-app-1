import Link from "next/link";

import { FAMILIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";
import PromoModal from "@/components/home/PromoModal";
import QuickAccess from "@/components/home/QuickAccess";
import LanceCard from "@/components/ui/LanceCard";
import ProductCard from "@/components/ui/ProductCard";
import { BannerCarousel } from "@/components/ml/BannerCarousel";
import { ProductCarousel } from "@/components/ml/ProductCarousel";
import { closeExpiredAuctions } from "@/lib/auctions";

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
};

type AuctionCard = {
  id: string;
  title: string;
  price_cents: number | null;
  family: string | null;
  platform: string | null;
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

export default async function Home() {
  const supabase = await createClient();
  await closeExpiredAuctions();
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );

  const { data: featuredData } = await supabase
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .in("status", ["active", "paused"])
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .eq("is_featured", true)
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: weekOfferData } = await supabase
    .from("listings_with_boost")
    .select("id, title, price_cents, description, platform")
    .in("status", ["active", "paused"])
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .eq("is_week_offer", true)
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: auctionData } = await supabase
    .from("listings_with_boost")
    .select("id, title, price_cents, family, platform, created_at")
    .in("status", ["active", "paused"])
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .eq("listing_type", "auction")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: recentData } = await supabase
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .in("status", ["active", "paused"])
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: modalSectionsData } = await supabase
    .from("home_sections")
    .select("id, title, description, starts_at, ends_at, position")
    .eq("section_type", "modal")
    .eq("is_active", true)
    .order("position", { ascending: true });

  const featuredListings = (featuredData ?? []) as ListingCardData[];
  const weekOffer = (weekOfferData ?? [])[0] as ListingCardData | undefined;
  const auctions = (auctionData ?? []) as AuctionCard[];
  const recentListings = (recentData ?? []) as ListingCardData[];
  const modalSections = (modalSectionsData ?? []) as HomeSection[];
  const modalSectionIds = modalSections.map((section) => section.id);

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

  const modalItems = (modalItemsData ?? []) as HomeItem[];
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

  const modalEntry = activeModalSections
    .map((section) => {
      const item = activeModalItems.find((entry) => entry.section_id === section.id);
      return item ? { section, item } : null;
    })
    .find((entry) => entry?.item?.image_url);

  const banners = [
    { id: "1", imageUrl: "/ganmolslogo.png", href: "/ofertas", alt: "Banner 1" },
    { id: "2", imageUrl: "/ganmolslogo.png", href: "/leiloes", alt: "Banner 2" },
    { id: "3", imageUrl: "/ganmolslogo.png", href: "/categorias", alt: "Banner 3" },
  ];

  return (
    <div className="space-y-16">
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

      <div className="ganm-ml-scope">
        <div className="ml-container">
          <div className="ml-stack">
            <div className="ml-module ml-pad">
              <BannerCarousel banners={banners} />
            </div>

            <div className="ml-module ml-pad">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center">
                <div>
                  <div className="ml-chip">Marketplace gamer</div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
                    Consoles, jogos e colecionaveis com curadoria retro.
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
                    <Link href="/vender" className="ml-btn">
                      Quero vender
                    </Link>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="ml-chip">Curadoria premium</span>
                    <span className="ml-chip">Pagamentos seguros</span>
                    <span className="ml-chip">Comunidade retro</span>
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="h-64 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-200" />
                </div>
              </div>
            </div>

            <div className="ml-module ml-pad">
              <div className="ml-head">
                <h2 className="ml-title">Acessos rapidos</h2>
              </div>
              <div className="mt-4">
                <QuickAccess />
              </div>
            </div>

            <div className="ml-module ml-pad">
              <div className="ml-head">
                <h2 className="ml-title">Destaques da semana</h2>
                <Link className="ml-headlink" href="/ofertas">
                  Ver ofertas
                </Link>
              </div>
              <div className="mt-4">
                <ProductCarousel>
                  {featuredListings.length === 0 ? (
                    <div className="ml-rail-item">
                      <div className="ml-tile p-4 text-sm text-zinc-500">
                        Nenhum anuncio em destaque no momento.
                      </div>
                    </div>
                  ) : (
                    featuredListings.map((item) => (
                      <div key={item.id} className="ml-rail-item">
                        <ProductCard
                          href={`/produto/${item.id}`}
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
                    ))
                  )}
                </ProductCarousel>
              </div>
            </div>

            <div className="ml-module ml-pad">
              <div className="ml-head">
                <h2 className="ml-title">Lances em destaque</h2>
                <Link className="ml-headlink" href="/leiloes">
                  Ver todos
                </Link>
              </div>
              <div className="mt-4">
                <ProductCarousel>
                  {auctions.length === 0 ? (
                    <div className="ml-rail-item">
                      <div className="ml-tile p-4 text-sm text-zinc-500">
                        Nenhum lance programado ainda.
                      </div>
                    </div>
                  ) : (
                    auctions.map((auction) => (
                      <div key={auction.id} className="ml-rail-item">
                        <LanceCard
                          href={`/produto/${auction.id}`}
                          title={auction.title}
                          priceCents={auction.price_cents}
                          platformLabel={
                            auction.platform ||
                            familyLabelBySlug[auction.family ?? ""] ||
                            "Plataforma"
                          }
                          statusLabel="Programado"
                          tag="Destaque"
                        />
                      </div>
                    ))
                  )}
                </ProductCarousel>
              </div>
            </div>

            <div className="ml-module ml-pad">
              <div className="ml-head">
                <h2 className="ml-title">Plataformas</h2>
                <Link className="ml-headlink" href="/categorias">
                  Ver categorias
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {FAMILIES.map((family) => (
                  <Link
                    key={family.slug}
                    href={`/marca/${family.slug}`}
                    className="ml-tile flex items-center gap-3 p-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-sm font-semibold text-zinc-700">
                      {family.name.slice(0, 1)}
                    </div>
                    <div className="text-sm font-semibold text-zinc-900">
                      {family.name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {recentListings.length > 0 ? (
              <div className="ml-module ml-pad" aria-label="Novos anuncios adicionados">
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
                          href={`/produto/${item.id}`}
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
