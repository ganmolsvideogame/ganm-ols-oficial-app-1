import "server-only";

import type { BlogLocale } from "@/lib/blog/locales";
import { buildAffiliateProductPath } from "@/lib/affiliate/products";
import { sendBrevoEmail } from "@/lib/brevo/client";
import { getResolvedAffiliateProductBySlug } from "@/lib/affiliate/catalog";
import { buildBlogPostPath } from "@/lib/blog/locales";
import { getAllUsersBlogAudience, getAdminBlogAudience } from "@/lib/blog/delivery";
import { getBlogPostBySlug } from "@/lib/blog/posts";
import {
  listActiveBrowserPushSubscriptions,
  listActiveNativePushTokens,
  sendBrowserPushNotification,
} from "@/lib/push/server";
import {
  insertNotificationsWithPush,
  type NotificationPushSummary,
} from "@/lib/push/delivery";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildListingPath } from "@/lib/listings/url";
import { formatCentsToBRL } from "@/lib/utils/price";
import { buildAbsoluteUrl } from "@/lib/utils/site";

export type PushAudience =
  | "buyers-intent"
  | "buyers-clicked-buy"
  | "buyers-visited"
  | "admins"
  | "sellers"
  | "buyers"
  | "all-users";

export type PushProductSignal =
  | "all"
  | "product-visit"
  | "product-buy-click"
  | "product-intent";

export type PushAudienceFilters = {
  productSelection?: string | null;
  productSignal?: PushProductSignal | null;
};

type AudienceCatalog = Record<PushAudience, Set<string>>;

type ProfileRow = {
  id: string;
  email: string | null;
  display_name?: string | null;
};

type ListingOfferRow = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  status: string | null;
  moderation_status: string | null;
};

export type PushAudienceStat = {
  audience: PushAudience;
  label: string;
  description: string;
  userCount: number;
  deviceCount: number;
  browserDeviceCount: number;
  nativeDeviceCount: number;
};

type AnalyticsEventUserRow = {
  user_id: string | null;
};

type ParsedCatalogSelection =
  | {
      kind: "affiliate";
      identifier: string;
      value: string;
    }
  | {
      kind: "listing";
      identifier: string;
      value: string;
    };

const BEHAVIOR_LOOKBACK_DAYS = 30;
const ANALYTICS_PAGE_SIZE = 1000;
const BUYER_VISIT_EVENT_TYPES = ["listing_view", "affiliate_view"];
const BUYER_CLICK_EVENT_TYPES = ["affiliate_click", "add_to_cart"];
const BUYER_INTENT_EVENT_TYPES = [
  ...BUYER_VISIT_EVENT_TYPES,
  ...BUYER_CLICK_EVENT_TYPES,
  "affiliate_recommendation_click",
  "affiliate_downsell_open",
];

const AUDIENCE_META: Record<
  PushAudience,
  { label: string; description: string }
> = {
  "buyers-intent": {
    label: "Intencao de compra",
    description:
      "Contas compradoras com visita, clique em comprar, carrinho ou interacao recente nos ultimos 30 dias.",
  },
  "buyers-clicked-buy": {
    label: "Clicaram em comprar",
    description:
      "Contas compradoras que adicionaram ao carrinho ou clicaram em comprar nos ultimos 30 dias.",
  },
  "buyers-visited": {
    label: "Visitaram produtos",
    description:
      "Contas compradoras que visitaram produtos internos ou afiliados nos ultimos 30 dias.",
  },
  admins: {
    label: "Admins",
    description: "Controle, suporte e operacao interna.",
  },
  sellers: {
    label: "Vendedores",
    description: "Lojas, perfil, catalogo e ativacao de vendas.",
  },
  buyers: {
    label: "Compradores",
    description: "Usuarios focados em descoberta, compra e recorrencia.",
  },
  "all-users": {
    label: "Todas as contas",
    description: "Base autenticada completa da GANM OLS.",
  },
};

const PUSH_PRODUCT_SIGNAL_LABELS: Record<PushProductSignal, string> = {
  all: "Produto especifico",
  "product-visit": "Visitaram este produto",
  "product-buy-click": "Clicaram em comprar deste produto",
  "product-intent": "Demonstraram intencao neste produto",
};

function toSet(values: string[]) {
  return new Set(values.map((value) => value.trim()).filter(Boolean));
}

function intersectSets(source: Set<string>, base: Set<string>) {
  return new Set(Array.from(source).filter((value) => base.has(value)));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return buildAbsoluteUrl("/");
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return buildAbsoluteUrl(normalizedPath);
  }
}

function parseCatalogSelection(value: string): ParsedCatalogSelection | null {
  const trimmed = String(value ?? "").trim();
  const [kind, ...idParts] = trimmed.split(":");
  const identifier = idParts.join(":").trim();

  if (!identifier) {
    return null;
  }

  if (kind === "affiliate") {
    return {
      kind: "affiliate",
      identifier,
      value: trimmed,
    };
  }

  if (kind === "listing") {
    return {
      kind: "listing",
      identifier,
      value: trimmed,
    };
  }

  return null;
}

export function normalizePushProductSignal(value: string): PushProductSignal {
  if (
    value === "product-visit" ||
    value === "product-buy-click" ||
    value === "product-intent"
  ) {
    return value;
  }

  return "all";
}

function normalizePushAudienceFilters(
  filters?: PushAudienceFilters | null
): PushAudienceFilters | null {
  const productSelection = String(filters?.productSelection ?? "").trim();
  if (!productSelection) {
    return null;
  }

  const selection = parseCatalogSelection(productSelection);
  if (!selection) {
    return null;
  }

  return {
    productSelection: selection.value,
    productSignal: normalizePushProductSignal(
      String(filters?.productSignal ?? "")
    ),
  };
}

async function readPushProductSelectionLabel(
  selection: ParsedCatalogSelection
) {
  if (selection.kind === "affiliate") {
    const product = await getResolvedAffiliateProductBySlug(selection.identifier, {
      includeInactive: true,
    });

    return product?.shortTitle || product?.title || selection.identifier;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("listings")
    .select("title")
    .eq("id", selection.identifier)
    .maybeSingle();

  return String(data?.title ?? "").trim() || selection.identifier;
}

export async function buildPushAudienceTargetingLabel(
  audience: PushAudience,
  filters?: PushAudienceFilters | null
) {
  const normalizedFilters = normalizePushAudienceFilters(filters);
  const baseLabel = getPushAudienceLabel(audience);

  if (!normalizedFilters?.productSelection) {
    return baseLabel;
  }

  const selection = parseCatalogSelection(normalizedFilters.productSelection);
  if (!selection) {
    return baseLabel;
  }

  const productLabel = await readPushProductSelectionLabel(selection);
  const signalLabel =
    PUSH_PRODUCT_SIGNAL_LABELS[normalizedFilters.productSignal || "all"];

  return `${baseLabel} | ${signalLabel}: ${productLabel}`;
}

async function loadAnalyticsAudienceSet(params: {
  admin: ReturnType<typeof createAdminClient>;
  eventTypes: string[];
  sinceIso: string;
  productSelection?: string | null;
}) {
  const values: string[] = [];
  const selection = parseCatalogSelection(params.productSelection ?? "");
  let from = 0;

  while (true) {
    let query = params.admin
      .from("analytics_events")
      .select("user_id")
      .in("event_type", params.eventTypes)
      .gte("created_at", params.sinceIso)
      .not("user_id", "is", null);

    if (selection?.kind === "listing") {
      query = query.eq("listing_id", selection.identifier);
    }

    if (selection?.kind === "affiliate") {
      query = query.contains("metadata", {
        affiliate_product_slug: selection.identifier,
      });
    }

    const { data, error } = await query.range(
      from,
      from + ANALYTICS_PAGE_SIZE - 1
    );

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as AnalyticsEventUserRow[];
    values.push(
      ...rows
        .map((row) => String(row.user_id ?? "").trim())
        .filter(Boolean)
    );

    if (rows.length < ANALYTICS_PAGE_SIZE) {
      break;
    }

    from += ANALYTICS_PAGE_SIZE;
  }

  return toSet(values);
}

async function loadProductFilteredAudienceSet(
  admin: ReturnType<typeof createAdminClient>,
  filters: PushAudienceFilters | null,
  sinceIso: string
) {
  const normalizedFilters = normalizePushAudienceFilters(filters);
  if (!normalizedFilters?.productSelection) {
    return null;
  }

  const selection = parseCatalogSelection(normalizedFilters.productSelection);
  if (!selection) {
    return null;
  }

  if (selection.kind === "affiliate") {
    const eventTypes =
      normalizedFilters.productSignal === "product-visit"
        ? ["affiliate_view"]
        : normalizedFilters.productSignal === "product-buy-click"
          ? ["affiliate_click"]
          : normalizedFilters.productSignal === "product-intent"
            ? [
                "affiliate_view",
                "affiliate_click",
                "affiliate_recommendation_click",
                "affiliate_downsell_open",
              ]
            : [
                "affiliate_view",
                "affiliate_click",
                "affiliate_recommendation_click",
                "affiliate_downsell_open",
              ];

    return loadAnalyticsAudienceSet({
      admin,
      eventTypes,
      sinceIso,
      productSelection: selection.value,
    });
  }

  const eventTypes =
    normalizedFilters.productSignal === "product-visit"
      ? ["listing_view"]
      : normalizedFilters.productSignal === "product-buy-click"
        ? ["add_to_cart"]
        : normalizedFilters.productSignal === "product-intent"
          ? ["listing_view", "add_to_cart"]
          : ["listing_view", "add_to_cart"];

  return loadAnalyticsAudienceSet({
    admin,
    eventTypes,
    sinceIso,
    productSelection: selection.value,
  });
}

function pushSummaryToBrowserResult(pushSummary: NotificationPushSummary) {
  return {
    ok: pushSummary.ok,
    sent: pushSummary.browserSent,
    failed: pushSummary.browserFailed,
    skipped: pushSummary.skipped,
    nativeResult: {
      ok: pushSummary.nativeFailed === 0,
      sent: pushSummary.nativeSent,
      failed: pushSummary.nativeFailed,
      skipped: pushSummary.skipped,
    },
  };
}

function buildOfferEmailTemplate(input: {
  title: string;
  body: string;
  url: string;
  image?: string | null;
  ctaLabel?: string | null;
}) {
  const ctaLabel = String(input.ctaLabel ?? "").trim() || "Abrir oferta";
  const imageBlock = input.image
    ? `<div style="margin:0 0 24px;"><img src="${input.image}" alt="${input.title}" style="display:block;width:100%;max-width:560px;border-radius:20px;border:1px solid #e4e4e7;" /></div>`
    : "";

  return {
    html: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f5f5f5;color:#18181b;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:28px;padding:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#71717a;font-weight:700;">GANM OLS | Oferta</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#09090b;">${input.title}</h1>
        ${imageBlock}
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3f3f46;">${input.body}</p>
        <a href="${input.url}" style="display:inline-block;border-radius:9999px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;">${ctaLabel}</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">Se o botao nao abrir, use este link: ${input.url}</p>
      </div>
    </div>
  </body>
</html>`,
    text: `${input.title}\n\n${input.body}\n\n${ctaLabel}: ${input.url}`,
  };
}

async function loadAudienceCatalog(): Promise<AudienceCatalog> {
  const admin = createAdminClient();
  const sinceIso = new Date(
    Date.now() - BEHAVIOR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { userIds: allUserIds },
    { userIds: adminUserIds },
    sellersResult,
    recentVisitors,
    recentBuyClicks,
    recentIntentSignals,
  ] = await Promise.all([
    getAllUsersBlogAudience(),
    getAdminBlogAudience(),
    admin.from("profiles").select("id").eq("role", "seller"),
    loadAnalyticsAudienceSet({
      admin,
      eventTypes: BUYER_VISIT_EVENT_TYPES,
      sinceIso,
    }),
    loadAnalyticsAudienceSet({
      admin,
      eventTypes: BUYER_CLICK_EVENT_TYPES,
      sinceIso,
    }),
    loadAnalyticsAudienceSet({
      admin,
      eventTypes: BUYER_INTENT_EVENT_TYPES,
      sinceIso,
    }),
  ]);

  if (sellersResult.error) {
    throw sellersResult.error;
  }

  const admins = toSet(adminUserIds);
  const sellers = toSet(
    ((sellersResult.data ?? []) as ProfileRow[]).map((row) => row.id)
  );
  const allUsers = toSet(allUserIds);
  const buyers = new Set(
    Array.from(allUsers).filter(
      (userId) => !admins.has(userId) && !sellers.has(userId)
    )
  );
  const buyersVisited = intersectSets(recentVisitors, buyers);
  const buyersClickedBuy = intersectSets(recentBuyClicks, buyers);
  const buyersIntent = intersectSets(recentIntentSignals, buyers);

  return {
    "buyers-intent": buyersIntent,
    "buyers-clicked-buy": buyersClickedBuy,
    "buyers-visited": buyersVisited,
    admins,
    sellers,
    buyers,
    "all-users": allUsers,
  };
}

export function normalizePushAudience(value: string): PushAudience {
  if (
    value === "buyers-intent" ||
    value === "buyers-clicked-buy" ||
    value === "buyers-visited" ||
    value === "admins" ||
    value === "sellers" ||
    value === "buyers"
  ) {
    return value;
  }
  return "all-users";
}

export function getPushAudienceLabel(audience: PushAudience) {
  return AUDIENCE_META[audience].label;
}

export async function resolvePushAudienceUserIds(
  audience: PushAudience,
  filters?: PushAudienceFilters | null
) {
  const catalog = await loadAudienceCatalog();
  const baseUserIds = catalog[audience];
  const normalizedFilters = normalizePushAudienceFilters(filters);

  if (!normalizedFilters) {
    return Array.from(baseUserIds);
  }

  const admin = createAdminClient();
  const sinceIso = new Date(
    Date.now() - BEHAVIOR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const filteredSet = await loadProductFilteredAudienceSet(
    admin,
    normalizedFilters,
    sinceIso
  );

  if (!filteredSet) {
    return Array.from(baseUserIds);
  }

  return Array.from(intersectSets(filteredSet, baseUserIds));
}

export async function resolvePushAudienceRecipients(
  audience: PushAudience,
  filters?: PushAudienceFilters | null
) {
  const userIds = await resolvePushAudienceUserIds(audience, filters);
  if (userIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);

  if (error) {
    throw error;
  }

  const recipientMap = new Map<string, { email: string; name?: string }>();

  ((data ?? []) as ProfileRow[]).forEach((row) => {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!email) {
      return;
    }

    recipientMap.set(email, {
      email,
      name: String(row.display_name ?? "").trim() || undefined,
    });
  });

  return Array.from(recipientMap.values());
}

export async function loadPushAudienceStats() {
  const [catalog, subscriptions, nativeTokens] = await Promise.all([
    loadAudienceCatalog(),
    listActiveBrowserPushSubscriptions(),
    listActiveNativePushTokens(),
  ]);

  const countBrowserDevices = (audienceSet: Set<string>) =>
    subscriptions.filter(
      (subscription: { userId?: string | null }) =>
        Boolean(subscription.userId) && audienceSet.has(String(subscription.userId))
    ).length;

  const countNativeDevices = (audienceSet: Set<string>) =>
    nativeTokens.filter(
      (token: { userId?: string | null }) =>
        Boolean(token.userId) && audienceSet.has(String(token.userId))
    ).length;

  const order: PushAudience[] = [
    "buyers-intent",
    "buyers-clicked-buy",
    "buyers-visited",
    "buyers",
    "sellers",
    "admins",
    "all-users",
  ];

  return order.map((audience) => ({
    audience,
    label: AUDIENCE_META[audience].label,
    description: AUDIENCE_META[audience].description,
    userCount: catalog[audience].size,
    deviceCount:
      countBrowserDevices(catalog[audience]) +
      countNativeDevices(catalog[audience]),
    browserDeviceCount: countBrowserDevices(catalog[audience]),
    nativeDeviceCount: countNativeDevices(catalog[audience]),
  })) satisfies PushAudienceStat[];
}

export async function sendManualPushCampaign(params: {
  audience: PushAudience;
  title: string;
  body: string;
  url: string;
  tag?: string;
  image?: string | null;
  filters?: PushAudienceFilters | null;
  persistInApp?: boolean;
  notificationType?: string | null;
}) {
  const admin = createAdminClient();
  const persistInApp = params.persistInApp !== false;
  const userIds = await resolvePushAudienceUserIds(params.audience, params.filters);
  const normalizedUrl = normalizeUrl(params.url);
  const normalizedImage = params.image ? normalizeUrl(params.image) : null;
  const audienceLabel = await buildPushAudienceTargetingLabel(
    params.audience,
    params.filters
  );

  if (userIds.length === 0) {
    return {
      audience: params.audience,
      audienceLabel,
      userIdsCount: 0,
      inAppCount: 0,
      browserResult: {
        ok: true,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: "no-audience-users",
      },
      payload: {
        title: params.title,
        body: params.body,
        url: normalizedUrl,
        image: normalizedImage,
      },
    };
  }

  let browserResult:
    | Awaited<ReturnType<typeof sendBrowserPushNotification>>
    | ReturnType<typeof pushSummaryToBrowserResult>;
  let inAppCount = 0;

  if (persistInApp) {
    const notificationResult = await insertNotificationsWithPush(
      admin,
      userIds.map((userId) => ({
        user_id: userId,
        title: params.title,
        body: params.body,
        link: normalizedUrl,
        type: params.notificationType || "push-campaign",
        push_image: normalizedImage,
        push_tag: params.tag,
        push_lang: "pt-BR",
        tracking_source: "campaign_push",
      }))
    );

    inAppCount = notificationResult.inserted;
    browserResult = pushSummaryToBrowserResult(notificationResult.pushSummary);
  } else {
    browserResult = await sendBrowserPushNotification({
      userIds,
      payload: {
        title: params.title,
        body: params.body,
        url: normalizedUrl,
        tag: params.tag,
        lang: "pt-BR",
        image: normalizedImage ?? undefined,
        trackingSource: "campaign_push",
      },
    });
  }

  return {
    audience: params.audience,
    audienceLabel,
    userIdsCount: userIds.length,
    inAppCount,
    browserResult,
    payload: {
      title: params.title,
      body: params.body,
      url: normalizedUrl,
      image: normalizedImage,
    },
  };
}

export async function sendOfferCampaign(params: {
  audience: PushAudience;
  title: string;
  body: string;
  url: string;
  image?: string | null;
  emailSubject?: string | null;
  ctaLabel?: string | null;
  filters?: PushAudienceFilters | null;
}) {
  const [userIds, recipients] = await Promise.all([
    resolvePushAudienceUserIds(params.audience, params.filters),
    resolvePushAudienceRecipients(params.audience, params.filters),
  ]);
  const normalizedUrl = normalizeUrl(params.url);
  const normalizedImage = params.image ? normalizeUrl(params.image) : null;
  const admin = createAdminClient();
  const audienceLabel = await buildPushAudienceTargetingLabel(
    params.audience,
    params.filters
  );
  const offerPushTag = `offer-${Date.now()}`;

  const notificationResult =
    userIds.length > 0
      ? await insertNotificationsWithPush(
          admin,
          userIds.map((userId) => ({
            user_id: userId,
            title: params.title,
            body: params.body,
            link: normalizedUrl,
            type: "offer-campaign",
            push_image: normalizedImage,
            push_tag: offerPushTag,
            push_lang: "pt-BR",
            tracking_source: "offer_push",
          }))
        )
      : {
          error: null,
          inserted: 0,
          pushResults: [],
          pushSummary: {
            ok: true,
            sent: 0,
            failed: 0,
            browserSent: 0,
            browserFailed: 0,
            nativeSent: 0,
            nativeFailed: 0,
            skipped: true,
          } satisfies NotificationPushSummary,
        };

  const browserResult = pushSummaryToBrowserResult(
    notificationResult.pushSummary
  );

  const emailTemplate = buildOfferEmailTemplate({
    title: params.title,
    body: params.body,
    url: normalizedUrl,
    image: normalizedImage,
    ctaLabel: params.ctaLabel,
  });

  const emailResult = await sendBrevoEmail({
    to: recipients,
    subject: String(params.emailSubject ?? "").trim() || params.title,
    htmlContent: emailTemplate.html,
    textContent: emailTemplate.text,
    tags: ["offer-campaign"],
  });

  return {
    audience: params.audience,
    audienceLabel,
    userIdsCount: userIds.length,
    emailRecipients: recipients.length,
    inAppCount: notificationResult.inserted,
    browserResult,
    emailResult,
    payload: {
      title: params.title,
      body: params.body,
      url: normalizedUrl,
      image: normalizedImage,
    },
  };
}

export async function buildCatalogOfferCampaign(
  selection: string
): Promise<{
  title: string;
  body: string;
  url: string;
  image?: string | null;
  emailSubject: string;
  ctaLabel: string;
}> {
  const parsedSelection = parseCatalogSelection(selection);

  if (!parsedSelection) {
    throw new Error("Oferta invalida para campanha.");
  }

  if (parsedSelection.kind === "affiliate") {
    const product = await getResolvedAffiliateProductBySlug(parsedSelection.identifier, {
      includeInactive: true,
    });

    if (!product || product.status !== "active") {
      throw new Error("Produto afiliado indisponivel para campanha.");
    }

    return {
      title: `Oferta em destaque | ${product.shortTitle}`,
      body: `${product.title} ja esta disponivel na GANM OLS por ${formatCentsToBRL(product.priceCents)}. Abra a pagina para ver detalhes, galeria e finalizar a compra.`,
      url: buildAbsoluteUrl(buildAffiliateProductPath(product.slug)),
      image: product.images[0] ?? null,
      emailSubject: `Oferta em destaque na GANM OLS | ${product.shortTitle}`,
      ctaLabel: "Abrir oferta",
    };
  }

  if (parsedSelection.kind === "listing") {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("listings")
      .select(
        "id, title, price_cents, thumbnail_url, status, moderation_status"
      )
      .eq("id", parsedSelection.identifier)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const listing = (data ?? null) as ListingOfferRow | null;
    if (
      !listing ||
      listing.status !== "active" ||
      (listing.moderation_status &&
        listing.moderation_status !== "approved" &&
        listing.moderation_status !== "active")
    ) {
      throw new Error("Anuncio indisponivel para campanha.");
    }

    const listingTitle = String(listing.title ?? "").trim() || "Oferta GANM OLS";
    return {
      title: `Oferta em destaque | ${listingTitle}`,
      body:
        listing.price_cents && listing.price_cents > 0
          ? `${listingTitle} ja esta no ar na GANM OLS por ${formatCentsToBRL(listing.price_cents)}. Abra a pagina para ver fotos, condicoes e detalhes completos.`
          : `${listingTitle} ja esta no ar na GANM OLS. Abra a pagina para ver fotos, condicoes e detalhes completos.`,
      url: buildAbsoluteUrl(buildListingPath(listing.id, listing.title)),
      image: String(listing.thumbnail_url ?? "").trim() || null,
      emailSubject: `Oferta em destaque na GANM OLS | ${listingTitle}`,
      ctaLabel: "Abrir oferta",
    };
  }

  throw new Error("Tipo de oferta nao suportado.");
}

export async function sendBlogPushCampaign(params: {
  audience: PushAudience;
  slug: string;
  locale: BlogLocale;
  filters?: PushAudienceFilters | null;
}) {
  const post = getBlogPostBySlug(params.slug, params.locale);
  if (!post) {
    throw new Error("Artigo do blog nao encontrado.");
  }

  const summary = (post.excerpt || post.tagline || post.description)
    .replace(/\s+/g, " ")
    .trim();

  const result = await sendManualPushCampaign({
    audience: params.audience,
    title: post.title,
    body:
      summary.length > 140 ? `${summary.slice(0, 137).trimEnd()}...` : summary,
    url: buildAbsoluteUrl(buildBlogPostPath(params.locale, post.slug)),
    tag: `blog-${params.locale}-${post.slug}`,
    image: post.coverImage,
    filters: params.filters,
    notificationType: "blog-broadcast",
  });

  return {
    ...result,
    post: {
      locale: params.locale,
      slug: post.slug,
      title: post.title,
      url: buildAbsoluteUrl(buildBlogPostPath(params.locale, post.slug)),
    },
  };
}
