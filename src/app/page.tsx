import Link from "next/link";

import { FAMILIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";
import PromoModal from "@/components/home/PromoModal";
import QuickAccess from "@/components/home/QuickAccess";
import LanceCard from "@/components/ui/LanceCard";
import ProductCard from "@/components/ui/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import ShelfCarousel from "@/components/ui/ShelfCarousel";
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

  return (
    <div className="page-noise space-y-16">
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

      <section className="g-section g-section-divider">
        <div className="g-container">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <Reveal delayMs={0} className="space-y-6">
                <div className="g-badge g-badge-accent">Marketplace gamer</div>
                <div className="space-y-4">
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    Consoles, jogos e colecionaveis com curadoria retro.
                  </h1>
                  <p className="g-p">
                    Prateleiras organizadas para quem compra, vende e coleciona
                    tecnologia gamer. Descubra familias classicas e novidades.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/leiloes"
                    className="g-btn g-btn-primary px-5 py-3 text-sm font-semibold g-glow"
                  >
                    Explorar lances
                  </Link>
                  <Link
                    href="/categorias"
                    className="g-btn px-5 py-3 text-sm font-semibold"
                  >
                    Ver categorias
                  </Link>
                  <Link
                    href="/vender"
                    className="g-btn px-5 py-3 text-sm font-semibold"
                  >
                    Quero vender
                  </Link>
                </div>
              </Reveal>
              <Reveal delayMs={120} className="flex flex-wrap gap-2">
                <span className="g-badge g-badge-accent">Curadoria premium</span>
                <span className="g-badge">Pagamentos seguros</span>
                <span className="g-badge">Comunidade retro</span>
              </Reveal>
            </div>
            <div className="grid gap-4">
              <Reveal delayMs={120} className="g-card g-card-hover p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Destaque da semana
                </p>
                {weekOffer ? (
                  <>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {weekOffer.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/70">
                      {weekOffer.description ||
                        "Oferta especial selecionada pela curadoria."}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-semibold text-white">
                        {formatCentsToBRL(weekOffer.price_cents ?? 0)}
                      </span>
                      <Link
                        href={`/produto/${weekOffer.id}`}
                        className="g-btn g-btn-primary px-4 py-2 text-xs font-semibold g-glow"
                      >
                        Ver produto
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-white/70">
                    Ainda nao temos ofertas em destaque. Volte em breve.
                  </p>
                )}
              </Reveal>
              <Reveal delayMs={160} className="g-card g-card-hover p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Para vendedores
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Publique em minutos com alto alcance.
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  Dashboard completo para lances, anuncios e favoritos.
                </p>
                <Link
                  href="/vender"
                  className="mt-4 inline-flex g-btn g-btn-primary px-4 py-2 text-xs font-semibold g-glow"
                >
                  Comecar agora
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="g-section g-section-divider">
        <div className="g-container">
          <Reveal delayMs={0}>
            <QuickAccess />
          </Reveal>
        </div>
      </section>

      <section className="g-section g-section-divider">
        <div className="g-container space-y-6">
          <Reveal delayMs={0}>
            <SectionHeader
              title="Destaques da semana"
              subtitle="Produtos selecionados para colecionadores"
              actionLabel="Ver ofertas"
              actionHref="/ofertas"
            />
          </Reveal>
          <Reveal delayMs={120}>
            <ShelfCarousel itemMinWidth={260}>
              {featuredListings.length === 0 ? (
                <div className="shelf-item g-card g-card-hover p-5 sm:p-6">
                  <div className="stagger-item text-sm text-white/70">
                    Nenhum anuncio em destaque no momento.
                  </div>
                </div>
              ) : (
                featuredListings.map((item, idx) => (
                  <Reveal
                    key={item.id}
                    delayMs={80}
                    className="shelf-item g-card g-card-hover p-5 sm:p-6"
                    style={{ ["--i" as any]: idx }}
                  >
                    <div className="stagger-item">
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
                  </Reveal>
                ))
              )}
            </ShelfCarousel>
          </Reveal>
        </div>
      </section>

      <section className="g-section g-section-divider">
        <div className="g-container space-y-6">
          <Reveal delayMs={0}>
            <SectionHeader
              title="Lances em destaque"
              subtitle="Programacao de lances e edicoes especiais"
              actionLabel="Ver todos"
              actionHref="/leiloes"
            />
          </Reveal>
          <Reveal delayMs={120}>
            <ShelfCarousel itemMinWidth={240}>
              {auctions.length === 0 ? (
                <div className="shelf-item g-card g-card-hover p-5 sm:p-6">
                  <div className="stagger-item text-sm text-white/70">
                    Nenhum lance programado ainda.
                  </div>
                </div>
              ) : (
                auctions.map((auction, idx) => (
                  <Reveal
                    key={auction.id}
                    delayMs={80}
                    className="shelf-item g-card g-card-hover p-5 sm:p-6"
                    style={{ ["--i" as any]: idx }}
                  >
                    <div className="stagger-item">
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
                  </Reveal>
                ))
              )}
            </ShelfCarousel>
          </Reveal>
        </div>
      </section>

      <section className="g-section g-section-divider">
        <div className="g-container space-y-6">
          <Reveal delayMs={0}>
            <SectionHeader
              title="Plataformas"
              subtitle="Explore por familia"
              actionLabel="Ver categorias"
              actionHref="/categorias"
            />
          </Reveal>
          <Reveal delayMs={120}>
            <ShelfCarousel itemMinWidth={220}>
              {FAMILIES.map((family, idx) => (
                <Reveal
                  key={family.slug}
                  delayMs={80}
                  className="shelf-item g-card g-card-hover p-5 sm:p-6"
                  style={{ ["--i" as any]: idx }}
                >
                  <div className="stagger-item">
                    <Link href={`/marca/${family.slug}`}>
                      <h3 className="text-sm font-semibold text-white">
                        {family.name}
                      </h3>
                      <p className="mt-2 text-xs text-white/70">
                        {family.description}
                      </p>
                      <span className="mt-4 inline-flex g-badge">
                        Ver itens
                      </span>
                    </Link>
                  </div>
                </Reveal>
              ))}
            </ShelfCarousel>
          </Reveal>
        </div>
      </section>

      {recentListings.length > 0 ? (
        <section className="g-section g-section-divider" aria-label="Novos anuncios adicionados">
          <div className="g-container space-y-6">
            <Reveal delayMs={0}>
              <SectionHeader
                title="Novidades"
                subtitle="Novos anuncios chegando agora"
                actionLabel="Ver mais"
                actionHref="/ofertas"
              />
            </Reveal>
            <Reveal delayMs={120}>
              <ShelfCarousel itemMinWidth={260}>
                {recentListings.map((item, idx) => (
                  <Reveal
                    key={item.id}
                    delayMs={80}
                    className="shelf-item g-card g-card-hover p-5 sm:p-6"
                    style={{ ["--i" as any]: idx }}
                  >
                    <div className="stagger-item">
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
                  </Reveal>
                ))}
              </ShelfCarousel>
            </Reveal>
          </div>
        </section>
      ) : null}
    </div>
  );
}
