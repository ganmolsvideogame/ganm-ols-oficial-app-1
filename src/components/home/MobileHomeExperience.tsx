"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconCoin,
  IconExternalLink,
  IconHeart,
  IconLayoutGrid,
  IconShoppingCartPlus,
  IconStar,
  IconTag,
  IconUserPlus,
  IconBuildingStore,
} from "@tabler/icons-react";

import {
  FAMILIES,
  SUBCATEGORIES,
  buildFamilySubcategoryPath,
} from "@/lib/mock/data";
import type { AffiliateProduct } from "@/lib/affiliate/products";
import { notifyCartCount } from "@/lib/cart/events";
import { createClient } from "@/lib/supabase/client";

export type MobileHomeBanner = {
  id: string;
  imageUrl: string;
  href: string;
  alt: string;
};

export type MobileHomeListing = {
  id: string;
  title: string;
  priceCents: number | null;
  family: string | null;
  platform: string | null;
  imageUrl: string | null;
  href: string;
  badge?: string | null;
};

type DisplayProduct = {
  key: string;
  kind: "affiliate" | "listing";
  listingId?: string;
  title: string;
  href: string;
  imageUrl: string;
  priceCents: number | null;
  badge?: string | null;
  meta?: string | null;
  familySlug?: string | null;
  searchText: string;
};

type MobileHomeExperienceProps = {
  banners: MobileHomeBanner[];
  affiliateProducts: AffiliateProduct[];
  listings: MobileHomeListing[];
};

const visibleFamilies = FAMILIES.filter((family) =>
  ["nintendo", "playstation", "xbox", "sega", "atari", "pc", "acessorios"].includes(
    family.slug
  )
);

const tabs = [{ slug: "all", name: "Tudo" }, ...visibleFamilies];

const quickActions = [
  { href: "/ofertas", label: "Ofertas", icon: "tag" },
  { href: "/lojas", label: "Lojas oficiais", icon: "store" },
  { href: "/mais-vendidos", label: "Mais vendidos", icon: "star" },
  { href: "/ofertas/ate-100", label: "Ate R$100", icon: "coin" },
  { href: "/categorias", label: "Categorias", icon: "grid" },
  { href: "/vender/comece", label: "Vender", icon: "seller" },
  { href: "/favoritos", label: "Favoritos", icon: "heart" },
];

const categoryAliases: Record<string, string[]> = {
  nintendo: [
    "nintendo",
    "switch",
    "wii",
    "super nintendo",
    "snes",
    "n64",
    "gamecube",
    "famicom",
  ],
  playstation: [
    "playstation",
    "ps one",
    "ps1",
    "ps2",
    "ps3",
    "ps4",
    "ps5",
    "psp",
    "ps vita",
  ],
  xbox: ["xbox", "series s", "series x", "kinect"],
  sega: ["sega", "mega drive", "master system", "dreamcast", "saturn"],
  atari: ["atari"],
  pc: ["pc", "computador", "notebook", "placa", "ssd", "monitor"],
  acessorios: [
    "acessorio",
    "acessorios",
    "controle",
    "joystick",
    "cabo",
    "carregador",
    "case",
    "suporte",
  ],
};

const heroCopy: Record<
  string,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    href: string;
    sectionTitle: string;
    gradient: string;
  }
> = {
  all: {
    eyebrow: "Vitrine GANM OLS",
    title: "Consoles, jogos e acessorios em destaque",
    subtitle:
      "Consoles, jogos e acessorios organizados por universo para comprar, vender e colecionar.",
    cta: "Ver ofertas",
    href: "/ofertas",
    sectionTitle: "Produtos em destaque",
    gradient: "from-zinc-950 via-zinc-900 to-slate-800",
  },
  nintendo: {
    eyebrow: "Nintendo",
    title: "Switch, Wii, SNES e portateis no mesmo universo",
    subtitle:
      "Do retro ao atual, veja produtos Nintendo com foco em jogo, colecao e setup.",
    cta: "Ver Nintendo",
    href: "/marca/nintendo",
    sectionTitle: "Nintendo em destaque",
    gradient: "from-red-950 via-zinc-950 to-zinc-900",
  },
  playstation: {
    eyebrow: "PlayStation",
    title: "PS1 ao PS5, consoles e jogos para montar sua colecao",
    subtitle:
      "Selecao com consoles, controles, jogos fisicos e portateis da familia PlayStation.",
    cta: "Ver PlayStation",
    href: "/marca/playstation",
    sectionTitle: "PlayStation em destaque",
    gradient: "from-blue-950 via-zinc-950 to-zinc-900",
  },
  xbox: {
    eyebrow: "Xbox",
    title: "Xbox 360, One, Series e acessorios certos",
    subtitle:
      "Consoles, controles e complementos para quem joga ou quer completar o setup Xbox.",
    cta: "Ver Xbox",
    href: "/marca/xbox",
    sectionTitle: "Xbox em destaque",
    gradient: "from-emerald-950 via-zinc-950 to-zinc-900",
  },
  sega: {
    eyebrow: "SEGA",
    title: "Mega Drive, Master System e nostalgia 16-bit",
    subtitle:
      "Produtos SEGA para quem quer reviver classicos ou montar uma prateleira retro.",
    cta: "Ver SEGA",
    href: "/marca/sega",
    sectionTitle: "SEGA em destaque",
    gradient: "from-indigo-950 via-zinc-950 to-zinc-900",
  },
  atari: {
    eyebrow: "Atari",
    title: "Atari, cartuchos e consoles classicos",
    subtitle:
      "Produtos Atari para quem procura consoles classicos e itens de colecao.",
    cta: "Ver Atari",
    href: "/marca/atari",
    sectionTitle: "Atari em destaque",
    gradient: "from-orange-950 via-zinc-950 to-zinc-900",
  },
  pc: {
    eyebrow: "PC gamer",
    title: "Pecas, upgrades e itens para melhorar o setup",
    subtitle:
      "Componentes e perifericos para quem quer evoluir o computador sem perder tempo.",
    cta: "Ver PC",
    href: "/marca/pc",
    sectionTitle: "PC em destaque",
    gradient: "from-cyan-950 via-zinc-950 to-zinc-900",
  },
  acessorios: {
    eyebrow: "Acessorios",
    title: "Controles, cabos, cases e complementos para jogar melhor",
    subtitle:
      "Itens de apoio para completar consoles, melhorar conforto e deixar o setup pronto.",
    cta: "Ver acessorios",
    href: "/marca/acessorios",
    sectionTitle: "Acessorios em destaque",
    gradient: "from-neutral-950 via-zinc-900 to-stone-800",
  },
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatPrice(value: number | null) {
  if (!value || value <= 0) {
    return "Ver preco";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function getProductImage(product?: DisplayProduct) {
  return product?.imageUrl || "/ganmosicon-removebg-preview.png";
}

function matchesCategory(product: DisplayProduct, categorySlug: string) {
  if (categorySlug === "all") {
    return true;
  }

  if (product.familySlug === categorySlug) {
    return true;
  }

  const haystack = normalize(product.searchText);
  return (categoryAliases[categorySlug] ?? [categorySlug]).some((alias) =>
    haystack.includes(normalize(alias))
  );
}

function QuickActionIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  if (type === "store") {
    return <IconBuildingStore className={className} stroke={1.8} />;
  }

  if (type === "star") {
    return <IconStar className={className} stroke={1.8} />;
  }

  if (type === "coin") {
    return <IconCoin className={className} stroke={1.8} />;
  }

  if (type === "grid") {
    return <IconLayoutGrid className={className} stroke={1.8} />;
  }

  if (type === "seller") {
    return <IconUserPlus className={className} stroke={1.8} />;
  }

  if (type === "heart") {
    return <IconHeart className={className} stroke={1.8} />;
  }

  return <IconTag className={className} stroke={1.8} />;
}

export default function MobileHomeExperience({
  banners,
  affiliateProducts,
  listings,
}: MobileHomeExperienceProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState("all");
  const [quickCartKey, setQuickCartKey] = useState<string | null>(null);

  const displayProducts = useMemo<DisplayProduct[]>(() => {
    const affiliateItems = affiliateProducts.map((product) => ({
      key: `affiliate-${product.slug}`,
      kind: "affiliate" as const,
      title: product.shortTitle || product.title,
      href: `/parceiros/${product.slug}`,
      imageUrl: product.images?.[0] ?? "",
      priceCents: product.priceCents,
      badge: product.discountLabel || product.homeBadge || product.highlightLabel,
      meta: product.categoryLabel || product.brand,
      familySlug: product.familySlug,
      searchText: [
        product.title,
        product.shortTitle,
        product.brand,
        product.familySlug,
        product.categoryLabel,
        product.partnerName,
      ]
        .filter(Boolean)
        .join(" "),
    }));

    const listingItems = listings.map((listing) => ({
      key: `listing-${listing.id}`,
      kind: "listing" as const,
      listingId: listing.id,
      title: listing.title,
      href: listing.href,
      imageUrl: listing.imageUrl ?? "",
      priceCents: listing.priceCents,
      badge: listing.badge,
      meta: listing.platform || listing.family,
      familySlug: listing.family,
      searchText: [listing.title, listing.family, listing.platform]
        .filter(Boolean)
        .join(" "),
    }));

    return [...listingItems, ...affiliateItems].filter((product) => product.title);
  }, [affiliateProducts, listings]);

  const handleListingCartClick = async (
    event: MouseEvent<HTMLButtonElement>,
    product: DisplayProduct
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!product.listingId || quickCartKey) {
      return;
    }

    setQuickCartKey(product.key);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?redirect_to=${encodeURIComponent(product.href)}`);
      setQuickCartKey(null);
      return;
    }

    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (cartError) {
      setQuickCartKey(null);
      return;
    }

    let cartId = cart?.id ?? null;
    if (!cartId) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (createError || !newCart?.id) {
        setQuickCartKey(null);
        return;
      }
      cartId = newCart.id;
    }

    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("listing_id", product.listingId)
      .maybeSingle();

    if (existingItem?.id) {
      await supabase
        .from("cart_items")
        .update({
          quantity: Math.max(1, (existingItem.quantity ?? 0) + 1),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);
    } else {
      await supabase.from("cart_items").insert({
        cart_id: cartId,
        listing_id: product.listingId,
        quantity: 1,
      });
    }

    await supabase
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cartId);

    await fetch("/api/notifications/cart-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: product.listingId }),
    }).catch(() => null);

    const { data: items } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("cart_id", cartId);
    const nextCount =
      items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
    notifyCartCount(nextCount);
    setQuickCartKey(null);
  };

  const activeHero = heroCopy[activeTab] ?? heroCopy.all;
  const filteredProducts = displayProducts.filter((product) =>
    matchesCategory(product, activeTab)
  );
  const visibleProducts =
    filteredProducts.length > 0 ? filteredProducts.slice(0, 8) : displayProducts.slice(0, 8);
  const heroProducts =
    (filteredProducts.length > 0 ? filteredProducts : displayProducts).slice(0, 2);
  const primaryBanner = activeTab === "all" ? banners[0] : null;
  const subcategories =
    activeTab === "all"
      ? visibleFamilies.slice(0, 5).map((family) => ({
          key: family.slug,
          label: family.name,
          href: `/marca/${family.slug}`,
        }))
      : (SUBCATEGORIES[activeTab] ?? []).slice(0, 5).map((subcategory) => ({
          key: subcategory,
          label: subcategory,
          href: buildFamilySubcategoryPath(activeTab, subcategory),
        }));

  return (
    <div className="bg-white pb-7">
      <div className="border-b border-zinc-200 bg-white">
        <div className="overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-h-[46px] min-w-max items-end gap-5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.slug;

              return (
                <button
                  key={tab.slug}
                  type="button"
                  onClick={() => setActiveTab(tab.slug)}
                  className={`relative shrink-0 py-3 text-sm font-semibold transition ${
                    isActive ? "text-zinc-950" : "text-zinc-500"
                  }`}
                >
                  {tab.name}
                  {isActive ? (
                    <span className="absolute inset-x-0 bottom-0 h-1 rounded-t-full bg-zinc-950" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section className="overflow-hidden bg-zinc-950 text-white">
        {primaryBanner ? (
          <Link href={primaryBanner.href} className="block">
            <div className="relative h-[228px] w-full bg-zinc-950">
              <img
                src={primaryBanner.imageUrl}
                alt={primaryBanner.alt}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950/40 to-transparent" />
              {banners.length > 1 ? (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {banners.slice(0, 6).map((banner, index) => (
                    <span
                      key={banner.id}
                      className={`h-1.5 w-1.5 rounded-full ${
                        index === 0 ? "bg-white" : "bg-white/45"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </Link>
        ) : (
          <div className="relative min-h-[300px] overflow-hidden px-4 py-5">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${activeHero.gradient}`}
            />
            <div className="absolute -right-12 top-6 h-36 w-36 rounded-full border border-white/10 bg-white/10 blur-2xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
                {activeHero.eyebrow}
              </p>
              <h1 className="mt-2 max-w-[17rem] text-3xl font-black leading-[0.95] tracking-tight">
                {activeHero.title}
              </h1>
              <p className="mt-3 max-w-[18rem] text-sm leading-5 text-white/72">
                {activeHero.subtitle}
              </p>
              <Link
                href={activeHero.href}
                className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-zinc-950"
              >
                {activeHero.cta}
              </Link>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {heroProducts.map((product) => (
                  <Link
                    key={product.key}
                    href={product.href}
                    className="rounded-[1.35rem] border border-white/12 bg-white/10 p-2 backdrop-blur"
                  >
                    <div className="flex h-28 items-center justify-center rounded-2xl bg-white p-2">
                      <img
                        src={getProductImage(product)}
                        alt={product.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold text-white">
                      {product.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="bg-zinc-100 px-4 py-3 text-center">
        <Link
          href={activeHero.href}
          className="text-sm font-semibold text-zinc-700 underline-offset-4 hover:underline"
        >
          {activeTab === "all"
            ? "Ver ofertas da GANM OLS"
            : `Ver categoria ${activeHero.eyebrow}`}
        </Link>
      </div>

      {activeTab === "all" ? (
        <section className="bg-white py-4">
          <div className="overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex min-h-[96px] w-[112px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-white">
                    <QuickActionIcon type={action.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-black leading-tight text-zinc-950">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white py-5">
        <div className="overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-4">
            {subcategories.map((subcategory, index) => (
              <Link
                key={subcategory.key}
                href={subcategory.href}
                className="w-[132px] shrink-0 text-center"
              >
                <div className="flex h-[112px] items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 p-3 ring-1 ring-zinc-200">
                  <img
                    src={getProductImage(visibleProducts[index])}
                    alt={subcategory.label}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="mt-2 min-h-[2rem] line-clamp-2 text-xs font-black uppercase tracking-tight text-zinc-950">
                  {subcategory.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-white px-4 py-7">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Selecionados
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
              {activeHero.sectionTitle}
            </h2>
          </div>
          <Link href={activeHero.href} className="text-sm font-bold text-zinc-700">
            Ver mais
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {visibleProducts.map((product) => (
            <article
              key={product.key}
              className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white shadow-sm"
            >
              <Link href={product.href} className="flex h-full flex-col">
                <div className="flex aspect-[0.92] items-center justify-center bg-zinc-50 p-3">
                  <img
                    src={getProductImage(product)}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex min-h-[132px] flex-1 flex-col gap-1 p-3">
                  <div className="min-h-[18px]">
                    {product.badge ? (
                      <span className="inline-flex rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                        {product.badge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-zinc-950">
                    {product.title}
                  </h3>
                  <p className="mt-auto text-base font-black text-zinc-950">
                    {formatPrice(product.priceCents)}
                  </p>
                  <p className="min-h-[1rem] line-clamp-1 text-xs text-zinc-500">
                    {product.meta ?? ""}
                  </p>
                </div>
              </Link>
              {product.kind === "affiliate" ? (
                <Link
                  href={product.href}
                  aria-label={`Abrir ${product.title}`}
                  onClick={(event) => event.stopPropagation()}
                  className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
                >
                  <IconExternalLink className="h-5 w-5" stroke={1.8} />
                </Link>
              ) : product.listingId ? (
                <button
                  type="button"
                  aria-label={`Adicionar ${product.title} ao carrinho`}
                  disabled={quickCartKey === product.key}
                  onClick={(event) => handleListingCartClick(event, product)}
                  className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)] ring-2 ring-white transition active:scale-95 disabled:opacity-60"
                >
                  <IconShoppingCartPlus className="h-[22px] w-[22px]" stroke={1.8} />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
