import "server-only";

import { listAffiliateProducts } from "@/lib/affiliate/catalog";
import {
  buildAffiliateProductPath,
  type AffiliateProduct,
} from "@/lib/affiliate/products";
import { buildListingPath } from "@/lib/listings/url";
import {
  type PushAudience,
  type PushProductSignal,
} from "@/lib/push/campaigns";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsToBRL } from "@/lib/utils/price";
import { buildAbsoluteUrl } from "@/lib/utils/site";

type AnalyticsEventRow = {
  event_type: string;
  user_id: string | null;
  listing_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  status: string | null;
  moderation_status: string | null;
};

type ProductSignalAccumulator = {
  selection: string;
  sourceType: "affiliate" | "listing";
  visitors: Set<string>;
  buyClicks: Set<string>;
  cartAdds: Set<string>;
  recommendationClicks: Set<string>;
  downsellOpens: Set<string>;
  latestAt: string | null;
};

export type SmartPushOpportunity = {
  selection: string;
  sourceType: "affiliate" | "listing";
  productLabel: string;
  audience: PushAudience;
  audienceLabel: string;
  productSignal: PushProductSignal;
  productSignalLabel: string;
  title: string;
  body: string;
  url: string;
  image: string | null;
  priceCents: number | null;
  score: number;
  visitors: number;
  buyClicks: number;
  cartAdds: number;
  recommendationClicks: number;
  downsellOpens: number;
  latestAt: string | null;
  reason: string;
};

type SmartPushProduct = {
  selection: string;
  sourceType: "affiliate" | "listing";
  label: string;
  title: string;
  shortTitle: string;
  priceCents: number | null;
  url: string;
  image: string | null;
  source?: AffiliateProduct | ListingRow;
};

const LOOKBACK_DAYS = 30;
const ANALYTICS_PAGE_SIZE = 1000;
const TRACKED_EVENT_TYPES = [
  "listing_view",
  "affiliate_view",
  "add_to_cart",
  "affiliate_click",
  "affiliate_recommendation_click",
  "affiliate_downsell_open",
];

const PRODUCT_SIGNAL_LABELS: Record<PushProductSignal, string> = {
  all: "Produto especifico",
  "product-visit": "Visitaram este produto",
  "product-buy-click": "Clicaram em comprar deste produto",
  "product-intent": "Demonstraram intencao neste produto",
};

const AUDIENCE_LABELS: Record<PushAudience, string> = {
  "buyers-intent": "Intencao de compra",
  "buyers-clicked-buy": "Clicaram em comprar",
  "buyers-visited": "Visitaram produtos",
  admins: "Admins",
  sellers: "Vendedores",
  buyers: "Compradores",
  "all-users": "Todas as contas",
};

function readAffiliateSlug(metadata: Record<string, unknown> | null) {
  const slug = metadata?.affiliate_product_slug;
  return typeof slug === "string" && slug.trim() ? slug.trim() : null;
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function updateLatest(current: string | null, candidate: string | null) {
  const currentDate = parseDate(current);
  const candidateDate = parseDate(candidate);

  if (!candidateDate) {
    return current;
  }

  if (!currentDate || candidateDate.getTime() > currentDate.getTime()) {
    return candidate;
  }

  return current;
}

function createAccumulator(selection: string): ProductSignalAccumulator {
  return {
    selection,
    sourceType: selection.startsWith("affiliate:") ? "affiliate" : "listing",
    visitors: new Set(),
    buyClicks: new Set(),
    cartAdds: new Set(),
    recommendationClicks: new Set(),
    downsellOpens: new Set(),
    latestAt: null,
  };
}

async function loadRecentAnalyticsEvents() {
  const admin = createAdminClient();
  const sinceIso = new Date(
    Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const rows: AnalyticsEventRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("analytics_events")
      .select("event_type, user_id, listing_id, metadata, created_at")
      .in("event_type", TRACKED_EVENT_TYPES)
      .gte("created_at", sinceIso)
      .not("user_id", "is", null)
      .order("created_at", { ascending: false })
      .range(from, from + ANALYTICS_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as AnalyticsEventRow[];
    rows.push(...page);

    if (page.length < ANALYTICS_PAGE_SIZE) {
      break;
    }

    from += ANALYTICS_PAGE_SIZE;
  }

  return rows;
}

function accumulateSignals(events: AnalyticsEventRow[]) {
  const groups = new Map<string, ProductSignalAccumulator>();

  for (const event of events) {
    const userId = String(event.user_id ?? "").trim();
    if (!userId) {
      continue;
    }

    const selection =
      event.listing_id && ["listing_view", "add_to_cart"].includes(event.event_type)
        ? `listing:${event.listing_id}`
        : (() => {
            const slug = readAffiliateSlug(event.metadata);
            return slug ? `affiliate:${slug}` : null;
          })();

    if (!selection) {
      continue;
    }

    const group = groups.get(selection) ?? createAccumulator(selection);
    group.latestAt = updateLatest(group.latestAt, event.created_at);

    if (event.event_type === "listing_view" || event.event_type === "affiliate_view") {
      group.visitors.add(userId);
    }
    if (event.event_type === "affiliate_click") {
      group.buyClicks.add(userId);
    }
    if (event.event_type === "add_to_cart") {
      group.cartAdds.add(userId);
    }
    if (event.event_type === "affiliate_recommendation_click") {
      group.recommendationClicks.add(userId);
    }
    if (event.event_type === "affiliate_downsell_open") {
      group.downsellOpens.add(userId);
    }

    groups.set(selection, group);
  }

  return Array.from(groups.values());
}

async function loadProductsForSignals(groups: ProductSignalAccumulator[]) {
  const affiliateSlugs = groups
    .filter((group) => group.sourceType === "affiliate")
    .map((group) => group.selection.replace(/^affiliate:/, ""));
  const listingIds = groups
    .filter((group) => group.sourceType === "listing")
    .map((group) => group.selection.replace(/^listing:/, ""));

  const [affiliateProducts, listingResult] = await Promise.all([
    listAffiliateProducts(),
    listingIds.length > 0
      ? createAdminClient()
          .from("listings")
          .select("id, title, price_cents, thumbnail_url, status, moderation_status")
          .in("id", listingIds)
      : Promise.resolve({ data: [] as ListingRow[], error: null }),
  ]);

  if (listingResult.error) {
    throw listingResult.error;
  }

  const productMap = new Map<string, SmartPushProduct>();

  affiliateProducts
    .filter((product) => affiliateSlugs.includes(product.slug))
    .forEach((product) => {
      productMap.set(`affiliate:${product.slug}`, {
        selection: `affiliate:${product.slug}`,
        sourceType: "affiliate",
        label: product.shortTitle || product.title,
        title: product.title,
        shortTitle: product.shortTitle || product.title,
        priceCents: product.priceCents,
        url: buildAbsoluteUrl(buildAffiliateProductPath(product.slug)),
        image: product.images[0] ?? null,
        source: product,
      });
    });

  ((listingResult.data ?? []) as ListingRow[])
    .filter(
      (listing) =>
        listing.status === "active" &&
        (!listing.moderation_status || listing.moderation_status === "approved")
    )
    .forEach((listing) => {
      const title = String(listing.title ?? "").trim() || "Oferta GANM OLS";
      productMap.set(`listing:${listing.id}`, {
        selection: `listing:${listing.id}`,
        sourceType: "listing",
        label: title,
        title,
        shortTitle: title,
        priceCents: listing.price_cents,
        url: buildAbsoluteUrl(buildListingPath(listing.id, listing.title)),
        image: String(listing.thumbnail_url ?? "").trim() || null,
        source: listing,
      });
    });

  return productMap;
}

function getFreshnessBonus(latestAt: string | null) {
  const latest = parseDate(latestAt);
  if (!latest) {
    return 0;
  }

  const days = (Date.now() - latest.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 2) {
    return 4;
  }
  if (days <= 7) {
    return 2;
  }
  return 0;
}

function resolveAudience(group: ProductSignalAccumulator): {
  audience: PushAudience;
  signal: PushProductSignal;
} {
  if (group.buyClicks.size > 0 || group.cartAdds.size > 0) {
    return {
      audience: "buyers-clicked-buy",
      signal: "product-buy-click",
    };
  }

  if (group.recommendationClicks.size > 0 || group.downsellOpens.size > 0) {
    return {
      audience: "buyers-intent",
      signal: "product-intent",
    };
  }

  return {
    audience: "buyers-visited",
    signal: "product-visit",
  };
}

function buildReason(group: ProductSignalAccumulator) {
  const parts = [
    group.buyClicks.size > 0 ? `${group.buyClicks.size} clique(s) em comprar` : null,
    group.cartAdds.size > 0 ? `${group.cartAdds.size} adicao(oes) ao carrinho` : null,
    group.recommendationClicks.size > 0
      ? `${group.recommendationClicks.size} clique(s) em recomendacao`
      : null,
    group.downsellOpens.size > 0
      ? `${group.downsellOpens.size} abertura(s) de downsell`
      : null,
    group.visitors.size > 0 ? `${group.visitors.size} visita(s)` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `Sinais recentes: ${parts.join(", ")}.`
    : "Produto com atividade recente.";
}

function buildFallbackCopy(product: SmartPushProduct, group: ProductSignalAccumulator) {
  const price =
    product.priceCents && product.priceCents > 0
      ? ` por ${formatCentsToBRL(product.priceCents)}`
      : "";

  if (group.buyClicks.size > 0 || group.cartAdds.size > 0) {
    return {
      title: `${product.shortTitle} ainda esta disponivel`,
      body: `${product.title}${price}. Volte para conferir os detalhes antes que a oferta mude.`,
    };
  }

  if (group.recommendationClicks.size > 0 || group.downsellOpens.size > 0) {
    return {
      title: `Ainda pensando em ${product.shortTitle}?`,
      body: `${product.title}${price}. Veja a pagina completa e compare os detalhes com calma.`,
    };
  }

  return {
    title: `${product.shortTitle} em destaque`,
    body: `${product.title}${price}. Abra a pagina para ver fotos, descricao e condicoes.`,
  };
}

function scoreOpportunity(group: ProductSignalAccumulator) {
  return (
    group.visitors.size +
    group.recommendationClicks.size * 2 +
    group.downsellOpens.size * 2 +
    group.cartAdds.size * 4 +
    group.buyClicks.size * 5 +
    getFreshnessBonus(group.latestAt)
  );
}

function buildOpportunity(
  product: SmartPushProduct,
  group: ProductSignalAccumulator
): SmartPushOpportunity {
  const targeting = resolveAudience(group);
  const fallbackCopy = buildFallbackCopy(product, group);

  return {
    selection: product.selection,
    sourceType: product.sourceType,
    productLabel: product.label,
    audience: targeting.audience,
    audienceLabel: AUDIENCE_LABELS[targeting.audience],
    productSignal: targeting.signal,
    productSignalLabel: PRODUCT_SIGNAL_LABELS[targeting.signal],
    title: fallbackCopy.title,
    body: fallbackCopy.body,
    url: product.url,
    image: product.image,
    priceCents: product.priceCents,
    score: scoreOpportunity(group),
    visitors: group.visitors.size,
    buyClicks: group.buyClicks.size,
    cartAdds: group.cartAdds.size,
    recommendationClicks: group.recommendationClicks.size,
    downsellOpens: group.downsellOpens.size,
    latestAt: group.latestAt,
    reason: buildReason(group),
  };
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const outputText = (payload as Record<string, unknown>).output_text;
  if (typeof outputText === "string") {
    return outputText.trim();
  }

  return "";
}

async function maybeRefineCopyWithAi(opportunity: SmartPushOpportunity) {
  const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    return opportunity;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:
          String(process.env.OPENAI_NOTIFICATION_MODEL ?? "").trim() ||
          "gpt-5-mini",
        input: [
          {
            role: "developer",
            content:
              "Voce escreve notificacoes push curtas para a GANM OLS, um marketplace gamer. Use portugues do Brasil, sem exagero, sem frases genericas e sem promessas inventadas. Retorne somente JSON valido com title e body.",
          },
          {
            role: "user",
            content: JSON.stringify({
              product: opportunity.productLabel,
              currentTitle: opportunity.title,
              currentBody: opportunity.body,
              reason: opportunity.reason,
              audience: opportunity.audienceLabel,
              maxTitleChars: 72,
              maxBodyChars: 150,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "notification_copy",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                body: { type: "string" },
              },
              required: ["title", "body"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return opportunity;
    }

    const payload = (await response.json()) as unknown;
    const outputText = extractOutputText(payload);
    if (!outputText) {
      return opportunity;
    }

    const parsed = JSON.parse(outputText) as {
      title?: unknown;
      body?: unknown;
    };
    const title = String(parsed.title ?? "").trim();
    const body = String(parsed.body ?? "").trim();

    if (!title || !body) {
      return opportunity;
    }

    return {
      ...opportunity,
      title: title.slice(0, 72),
      body: body.slice(0, 150),
    };
  } catch {
    return opportunity;
  }
}

export function isNotificationAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY ?? "").trim());
}

export async function loadSmartPushOpportunities(limit = 6) {
  const events = await loadRecentAnalyticsEvents();
  const groups = accumulateSignals(events);
  const productMap = await loadProductsForSignals(groups);

  return groups
    .map((group) => {
      const product = productMap.get(group.selection);
      return product ? buildOpportunity(product, group) : null;
    })
    .filter((value): value is SmartPushOpportunity => Boolean(value))
    .filter((opportunity) => opportunity.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export async function buildSmartPushRecommendation(selection: string) {
  const opportunities = await loadSmartPushOpportunities(24);
  const opportunity = opportunities.find((item) => item.selection === selection);

  if (!opportunity) {
    throw new Error("Nao ha sinal recente suficiente para esta recomendacao.");
  }

  return maybeRefineCopyWithAi(opportunity);
}
