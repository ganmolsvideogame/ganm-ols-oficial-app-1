import Link from "next/link";

import { FAMILIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";
import PromoModal from "@/components/home/PromoModal";
import QuickAccess from "@/components/home/QuickAccess";
import LanceCard from "@/components/ui/LanceCard";
import ProductCard from "@/components/ui/ProductCard";
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

      <section className="relative overflow-hidden rounded-[32px] border border-zinc-200 bg-[radial-gradient(circle_at_top,_#f6f6f6,_#ffffff_70%)] p-8 shadow-sm md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Marketplace gamer
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-zinc-900 md:text-5xl">
                Consoles, jogos e colecionaveis com curadoria retro.
              </h1>
              <p className="text-base text-zinc-600 md:text-lg">
                Prateleiras organizadas para quem compra, vende e coleciona
                tecnologia gamer. Descubra familias classicas e novidades.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/leiloes"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
              >
                Explorar lances
              </Link>
              <Link
                href="/categorias"
                className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-800"
              >
                Ver categorias
              </Link>
              <Link
                href="/vender"
                className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-800"
              >
                Quero vender
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Curadoria premium
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Pagamentos seguros
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Comunidade retro
              </span>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Destaque da semana
              </p>
              {weekOffer ? (
                <>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-900">
                    {weekOffer.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {weekOffer.description || "Oferta especial selecionada pela curadoria."}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-semibold text-zinc-900">
                      {formatCentsToBRL(weekOffer.price_cents ?? 0)}
                    </span>
                    <Link
                      href={`/produto/${weekOffer.id}`}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                    >
                      Ver produto
                    </Link>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-600">
                  Ainda nao temos ofertas em destaque. Volte em breve.
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900 p-6 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                Para vendedores
              </p>
              <h3 className="mt-2 text-lg font-semibold">
                Publique em minutos com alto alcance.
              </h3>
              <p className="mt-2 text-sm text-zinc-200">
                Dashboard completo para lances, anuncios e favoritos.
              </p>
              <Link
                href="/vender"
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-900"
              >
                Comecar agora
              </Link>
            </div>
          </div>
        </div>
      </section>

      <QuickAccess />

      <section className="space-y-6">
        <SectionHeader
          title="Destaques da semana"
          subtitle="Produtos selecionados para colecionadores"
          actionLabel="Ver ofertas"
          actionHref="/ofertas"
        />
        <ShelfCarousel itemMinWidth={260}>
          {featuredListings.length === 0 ? (
            <div className="shelf-item rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum anuncio em destaque no momento.
            </div>
          ) : (
            featuredListings.map((item) => (
              <div key={item.id} className="shelf-item">
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
        </ShelfCarousel>
      </section>

      <section className="space-y-6">
        <SectionHeader
          title="Lances em destaque"
          subtitle="Programacao de lances e edicoes especiais"
          actionLabel="Ver todos"
          actionHref="/leiloes"
        />
        <ShelfCarousel itemMinWidth={240}>
          {auctions.length === 0 ? (
            <div className="shelf-item rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum lance programado ainda.
            </div>
          ) : (
            auctions.map((auction) => (
              <div key={auction.id} className="shelf-item">
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
        </ShelfCarousel>
      </section>

      <section className="space-y-6">
        <SectionHeader
          title="Plataformas"
          subtitle="Explore por familia"
          actionLabel="Ver categorias"
          actionHref="/categorias"
        />
        <ShelfCarousel itemMinWidth={220}>
          {FAMILIES.map((family) => (
            <Link
              key={family.slug}
              href={`/marca/${family.slug}`}
              className="shelf-item group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300"
            >
              <h3 className="text-sm font-semibold text-zinc-900">
                {family.name}
              </h3>
              <p className="mt-2 text-xs text-zinc-600">
                {family.description}
              </p>
              <span className="mt-4 inline-flex rounded-full border border-zinc-200 px-3 py-1 text-[11px] text-zinc-500">
                Ver itens
              </span>
            </Link>
          ))}
        </ShelfCarousel>
      </section>

      {recentListings.length > 0 ? (
        <section className="space-y-6" aria-label="Novos anuncios adicionados">
          <SectionHeader
            title="Novidades"
            subtitle="Novos anuncios chegando agora"
            actionLabel="Ver mais"
            actionHref="/ofertas"
          />
          <ShelfCarousel itemMinWidth={260}>
            {recentListings.map((item) => (
              <div key={item.id} className="shelf-item">
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
          </ShelfCarousel>
        </section>
      ) : null}
    </div>
  );
}
