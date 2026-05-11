import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendBrevoEmail } from "@/lib/brevo/client";
import {
  buildSellerListingRecoveryEmail,
  buildSellerOnboardingEmail,
  buildSellerPostListingEmail,
  buildSellerRelationshipEmail,
} from "@/lib/brevo/templates";
import { loadEmailAutomationSettings } from "@/lib/automation/email-settings";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

type SellerProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string | null;
};

type SellerListingRow = {
  id: string;
  seller_user_id: string;
  title: string | null;
  created_at: string | null;
};

type SellerOrderRow = {
  id: string;
  seller_user_id: string | null;
  status: string | null;
  created_at: string | null;
};

type LifecycleEventRow = {
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type SellerFlowKind =
  | "onboarding"
  | "listing_recovery"
  | "post_listing"
  | "relationship";

type LifecycleRunResult = {
  processed: number;
  emailed: number;
  notifications: number;
  skipped: number;
  flows: Record<SellerFlowKind, number>;
};

const SALE_STATUSES = ["approved", "paid", "shipped", "delivered"];

const SELLER_EMAIL_EVENT_TYPES = [
  "seller_onboarding_email_sent",
  "seller_listing_recovery_email_sent",
  "seller_post_listing_email_sent",
  "seller_relationship_email_sent",
] as const;

const SELLER_NOTIFICATION_EVENT_TYPES = [
  "seller_onboarding_notification_sent",
  "seller_listing_recovery_notification_sent",
  "seller_post_listing_notification_sent",
  "seller_relationship_notification_sent",
] as const;

const TRACKING_EVENT_TYPES = [
  ...SELLER_EMAIL_EVENT_TYPES,
  ...SELLER_NOTIFICATION_EVENT_TYPES,
  "seller_listing_started",
] as const;

function normalizeBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.ganmols.com"
  );
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function readMetaString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function eventSucceeded(event: LifecycleEventRow) {
  return readMetaString(event.metadata, "status") === "success";
}

function stageWasSent(
  events: LifecycleEventRow[],
  stage: string,
  eventType: string,
  anchorAt?: string | null
) {
  return events.some(
    (event) =>
      event.event_type === eventType &&
      eventSucceeded(event) &&
      readMetaString(event.metadata, "stage") === stage &&
      (!anchorAt || readMetaString(event.metadata, "anchor_at") === anchorAt)
  );
}

function lastSuccessfulEmailAt(events: LifecycleEventRow[]) {
  const dates = events
    .filter(
      (event) =>
        SELLER_EMAIL_EVENT_TYPES.includes(
          event.event_type as (typeof SELLER_EMAIL_EVENT_TYPES)[number]
        ) && eventSucceeded(event)
    )
    .map((event) => parseDate(event.created_at))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime());

  return dates[0] ?? null;
}

function hasRecentEmail(events: LifecycleEventRow[], hours: number) {
  if (hours <= 0) {
    return false;
  }
  const latest = lastSuccessfulEmailAt(events);
  if (!latest) {
    return false;
  }
  return Date.now() - latest.getTime() < hours * 60 * 60 * 1000;
}

function buildActionUrl(path: string) {
  return new URL(path, normalizeBaseUrl()).toString();
}

function emptyResult(): LifecycleRunResult {
  return {
    processed: 0,
    emailed: 0,
    notifications: 0,
    skipped: 0,
    flows: {
      onboarding: 0,
      listing_recovery: 0,
      post_listing: 0,
      relationship: 0,
    },
  };
}

async function persistLifecycleEvent(params: {
  admin: SupabaseClient;
  eventType: string;
  actorId: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
}) {
  await params.admin.from("system_events").insert({
    event_type: params.eventType,
    actor_id: params.actorId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata: params.metadata,
  });
}

async function createLifecycleNotification(params: {
  admin: SupabaseClient;
  userId: string;
  title: string;
  body: string;
  link: string;
  eventType: string;
  flow: SellerFlowKind;
  stage: string;
  anchorAt: string | null;
}) {
  const notificationResult = await insertNotificationsWithPush(params.admin, {
    user_id: params.userId,
    title: params.title,
    body: params.body,
    link: params.link,
    type: "seller_growth",
  });

  await persistLifecycleEvent({
    admin: params.admin,
    eventType: params.eventType,
    actorId: params.userId,
    entityType: "profile",
    entityId: params.userId,
    metadata: {
      flow: params.flow,
      stage: params.stage,
      anchor_at: params.anchorAt,
      status: notificationResult.error ? "error" : "success",
      error: notificationResult.error?.message ?? null,
    },
  });

  return !notificationResult.error;
}

type StageExecution = {
  flow: SellerFlowKind;
  stage: string;
  subject: string;
  html: string;
  text: string;
  actionUrl: string;
  notificationTitle: string;
  notificationBody: string;
  emailEventType: string;
  notificationEventType: string;
  anchorAt: string | null;
};

async function dispatchStage(params: {
  admin: SupabaseClient;
  seller: SellerProfileRow;
  execution: StageExecution;
  sendNotifications: boolean;
}) {
  const email = String(params.seller.email ?? "").trim().toLowerCase();
  if (!email) {
    await persistLifecycleEvent({
      admin: params.admin,
      eventType: params.execution.emailEventType,
      actorId: params.seller.id,
      entityType: "profile",
      entityId: params.seller.id,
      metadata: {
        flow: params.execution.flow,
        stage: params.execution.stage,
        anchor_at: params.execution.anchorAt,
        status: "skipped",
        reason: "missing_email",
      },
    });
    return {
      emailed: false,
      notificationSent: false,
    };
  }

  const emailResult = await sendBrevoEmail({
    to: [{ email, name: params.seller.display_name || undefined }],
    subject: params.execution.subject,
    htmlContent: params.execution.html,
    textContent: params.execution.text,
    tags: ["seller-lifecycle", params.execution.flow, params.execution.stage],
  });

  await persistLifecycleEvent({
    admin: params.admin,
    eventType: params.execution.emailEventType,
    actorId: params.seller.id,
    entityType: "profile",
    entityId: params.seller.id,
    metadata: {
      flow: params.execution.flow,
      stage: params.execution.stage,
      anchor_at: params.execution.anchorAt,
      sent_to: email,
      status: emailResult.ok
        ? "success"
        : emailResult.skipped
          ? "skipped"
          : "error",
      result: emailResult,
    },
  });

  let notificationSent = false;
  if (emailResult.ok && params.sendNotifications) {
    notificationSent = await createLifecycleNotification({
      admin: params.admin,
      userId: params.seller.id,
      title: params.execution.notificationTitle,
      body: params.execution.notificationBody,
      link: params.execution.actionUrl.replace(normalizeBaseUrl(), ""),
      eventType: params.execution.notificationEventType,
      flow: params.execution.flow,
      stage: params.execution.stage,
      anchorAt: params.execution.anchorAt,
    });
  }

  return { emailed: emailResult.ok, notificationSent };
}

function findDueOnboardingStage(params: {
  seller: SellerProfileRow;
  events: LifecycleEventRow[];
  days: number[];
}) {
  const createdAt = parseDate(params.seller.created_at);
  if (!createdAt) {
    return null;
  }

  const actionUrl = buildActionUrl("/vender");
  const stages = [
    { key: "welcome", offset: params.days[0] ?? 0 },
    { key: "tutorial", offset: params.days[1] ?? 2 },
    { key: "conversion_tips", offset: params.days[2] ?? 5 },
    { key: "last_call", offset: params.days[3] ?? 10 },
  ] as const;

  for (const stage of stages) {
    const dueAt = new Date(createdAt.getTime() + stage.offset * 24 * 60 * 60 * 1000);
    if (dueAt > new Date()) {
      continue;
    }
    if (
      stageWasSent(
        params.events,
        stage.key,
        "seller_onboarding_email_sent",
        params.seller.created_at
      )
    ) {
      continue;
    }

    const template = buildSellerOnboardingEmail(stage.key, {
      displayName: params.seller.display_name ?? "",
      actionUrl,
    });

    return {
      flow: "onboarding",
      stage: stage.key,
      ...template,
      actionUrl,
      notificationTitle:
        stage.key === "welcome"
          ? "Sua conta de vendedor esta pronta"
          : "Continue seu primeiro anuncio",
      notificationBody:
        stage.key === "welcome"
          ? "Publique seu primeiro anuncio e coloque sua vitrine no ar."
          : "Volte ao painel e finalize sua primeira oferta na GANM OLS.",
      emailEventType: "seller_onboarding_email_sent",
      notificationEventType: "seller_onboarding_notification_sent",
      anchorAt: params.seller.created_at ?? null,
    } satisfies StageExecution;
  }

  return null;
}

function findLatestListingStartEvent(events: LifecycleEventRow[]) {
  return [...events]
    .filter((event) => event.event_type === "seller_listing_started")
    .sort((left, right) => {
      const rightDate = parseDate(right.created_at)?.getTime() ?? 0;
      const leftDate = parseDate(left.created_at)?.getTime() ?? 0;
      return rightDate - leftDate;
    })[0] ?? null;
}

function hasListingCreatedAfter(listings: SellerListingRow[], timestamp: Date) {
  return listings.some((listing) => {
    const createdAt = parseDate(listing.created_at);
    return createdAt ? createdAt.getTime() >= timestamp.getTime() : false;
  });
}

function findDueRecoveryStage(params: {
  seller: SellerProfileRow;
  listings: SellerListingRow[];
  events: LifecycleEventRow[];
  hours: number[];
}) {
  const latestStart = findLatestListingStartEvent(params.events);
  const startedAt = parseDate(latestStart?.created_at);
  if (!latestStart || !startedAt) {
    return null;
  }

  if (hasListingCreatedAfter(params.listings, startedAt)) {
    return null;
  }

  const anchorAt = latestStart.created_at ?? null;
  const actionUrl = buildActionUrl("/vender");
  const stages = [
    { key: "resume_soon", offset: params.hours[0] ?? 1 },
    { key: "resume_today", offset: params.hours[1] ?? 24 },
    { key: "help_available", offset: params.hours[2] ?? 72 },
  ] as const;

  for (const stage of stages) {
    const dueAt = new Date(startedAt.getTime() + stage.offset * 60 * 60 * 1000);
    if (dueAt > new Date()) {
      continue;
    }
    if (
      stageWasSent(
        params.events,
        stage.key,
        "seller_listing_recovery_email_sent",
        anchorAt
      )
    ) {
      continue;
    }

    const template = buildSellerListingRecoveryEmail(stage.key, {
      displayName: params.seller.display_name ?? "",
      actionUrl,
    });

    return {
      flow: "listing_recovery",
      stage: stage.key,
      ...template,
      actionUrl,
      notificationTitle: "Seu anuncio ainda nao foi publicado",
      notificationBody:
        stage.key === "help_available"
          ? "Retome o formulario quando quiser e coloque o produto no ar."
          : "Volte ao painel e conclua os campos que faltam.",
      emailEventType: "seller_listing_recovery_email_sent",
      notificationEventType: "seller_listing_recovery_notification_sent",
      anchorAt,
    } satisfies StageExecution;
  }

  return null;
}

function findDuePostListingStage(params: {
  seller: SellerProfileRow;
  firstListing: SellerListingRow;
  events: LifecycleEventRow[];
  days: number[];
}) {
  const createdAt = parseDate(params.firstListing.created_at);
  if (!createdAt) {
    return null;
  }

  const actionUrl = buildActionUrl("/vender");
  const stages = [
    { key: "optimize_title", offset: params.days[0] ?? 3 },
    { key: "upgrade_listing", offset: params.days[1] ?? 7 },
    { key: "first_sale_push", offset: params.days[2] ?? 14 },
  ] as const;

  for (const stage of stages) {
    const dueAt = new Date(createdAt.getTime() + stage.offset * 24 * 60 * 60 * 1000);
    if (dueAt > new Date()) {
      continue;
    }
    if (
      stageWasSent(
        params.events,
        stage.key,
        "seller_post_listing_email_sent",
        params.firstListing.created_at
      )
    ) {
      continue;
    }

    const template = buildSellerPostListingEmail(stage.key, {
      displayName: params.seller.display_name ?? "",
      actionUrl,
    });

    return {
      flow: "post_listing",
      stage: stage.key,
      ...template,
      actionUrl,
      notificationTitle:
        stage.key === "first_sale_push"
          ? "Hora de buscar sua primeira venda"
          : "Seu anuncio pode performar melhor",
      notificationBody:
        stage.key === "first_sale_push"
          ? "Revise preco, fotos e descricao para ganhar mais confianca."
          : "Ajuste titulo, imagem principal e informacoes do anuncio.",
      emailEventType: "seller_post_listing_email_sent",
      notificationEventType: "seller_post_listing_notification_sent",
      anchorAt: params.firstListing.created_at ?? null,
    } satisfies StageExecution;
  }

  return null;
}

function findDueRelationshipStage(params: {
  seller: SellerProfileRow;
  latestListing: SellerListingRow;
  events: LifecycleEventRow[];
  days: number[];
}) {
  const lastListingAt = parseDate(params.latestListing.created_at);
  if (!lastListingAt) {
    return null;
  }

  const actionUrl = buildActionUrl("/vender");
  const stages = [
    { key: "reactivate_store", offset: params.days[0] ?? 15 },
    { key: "renew_catalog", offset: params.days[1] ?? 30 },
  ] as const;

  for (const stage of stages) {
    const dueAt = new Date(lastListingAt.getTime() + stage.offset * 24 * 60 * 60 * 1000);
    if (dueAt > new Date()) {
      continue;
    }
    if (
      stageWasSent(
        params.events,
        stage.key,
        "seller_relationship_email_sent",
        params.latestListing.created_at
      )
    ) {
      continue;
    }

    const template = buildSellerRelationshipEmail(stage.key, {
      displayName: params.seller.display_name ?? "",
      actionUrl,
    });

    return {
      flow: "relationship",
      stage: stage.key,
      ...template,
      actionUrl,
      notificationTitle: "Sua vitrine pode voltar a ganhar movimento",
      notificationBody: "Atualize anuncios, revise precos e publique novas ofertas.",
      emailEventType: "seller_relationship_email_sent",
      notificationEventType: "seller_relationship_notification_sent",
      anchorAt: params.latestListing.created_at ?? null,
    } satisfies StageExecution;
  }

  return null;
}

export async function runSellerLifecycleAutomation(
  admin: SupabaseClient,
  options?: { limit?: number }
) {
  const settings = await loadEmailAutomationSettings(admin);
  const result = emptyResult();

  if (
    !settings.sellerOnboardingEnabled &&
    !settings.sellerListingRecoveryEnabled &&
    !settings.sellerPostListingEnabled &&
    !settings.sellerRelationshipEnabled
  ) {
    return {
      ...result,
      skipped: 1,
      reason: "all_flows_disabled",
      settings,
    };
  }

  const { data: sellersData } = await admin
    .from("profiles")
    .select("id, display_name, email, created_at")
    .eq("role", "seller")
    .order("created_at", { ascending: true });

  const sellers = (sellersData ?? []) as SellerProfileRow[];
  if (sellers.length === 0) {
    return { ...result, settings };
  }

  const sellerIds = sellers.map((seller) => seller.id);

  const [{ data: listingsData }, { data: ordersData }, { data: eventsData }] = await Promise.all([
    admin
      .from("listings")
      .select("id, seller_user_id, title, created_at")
      .in("seller_user_id", sellerIds)
      .order("created_at", { ascending: true }),
    admin
      .from("orders")
      .select("id, seller_user_id, status, created_at")
      .in("seller_user_id", sellerIds)
      .in("status", SALE_STATUSES),
    admin
      .from("system_events")
      .select("event_type, entity_type, entity_id, actor_id, metadata, created_at")
      .in("actor_id", sellerIds)
      .in("event_type", [...TRACKING_EVENT_TYPES])
      .order("created_at", { ascending: false }),
  ]);

  const listings = (listingsData ?? []) as SellerListingRow[];
  const orders = (ordersData ?? []) as SellerOrderRow[];
  const events = (eventsData ?? []) as LifecycleEventRow[];

  const listingsBySeller = new Map<string, SellerListingRow[]>();
  for (const listing of listings) {
    const current = listingsBySeller.get(listing.seller_user_id) ?? [];
    current.push(listing);
    listingsBySeller.set(listing.seller_user_id, current);
  }

  const ordersBySeller = new Map<string, SellerOrderRow[]>();
  for (const order of orders) {
    if (!order.seller_user_id) {
      continue;
    }
    const current = ordersBySeller.get(order.seller_user_id) ?? [];
    current.push(order);
    ordersBySeller.set(order.seller_user_id, current);
  }

  const eventsBySeller = new Map<string, LifecycleEventRow[]>();
  for (const event of events) {
    if (!event.actor_id) {
      continue;
    }
    const current = eventsBySeller.get(event.actor_id) ?? [];
    current.push(event);
    eventsBySeller.set(event.actor_id, current);
  }

  const limit = options?.limit && options.limit > 0 ? options.limit : sellers.length;

  for (const seller of sellers) {
    if (result.processed >= limit) {
      break;
    }

    const sellerListings = listingsBySeller.get(seller.id) ?? [];
    const sellerEvents = eventsBySeller.get(seller.id) ?? [];
    const sellerOrders = ordersBySeller.get(seller.id) ?? [];
    const hasApprovedSale = sellerOrders.length > 0;
    const firstListing = sellerListings[0] ?? null;
    const latestListing =
      sellerListings.length > 0 ? sellerListings[sellerListings.length - 1] : null;

    let execution: StageExecution | null = null;

    if (settings.sellerListingRecoveryEnabled) {
      execution = findDueRecoveryStage({
        seller,
        listings: sellerListings,
        events: sellerEvents,
        hours: settings.sellerListingRecoveryHours,
      });
    }

    if (!execution && settings.sellerOnboardingEnabled && !firstListing) {
      execution = findDueOnboardingStage({
        seller,
        events: sellerEvents,
        days: settings.sellerOnboardingDays,
      });
    }

    if (
      !execution &&
      settings.sellerPostListingEnabled &&
      firstListing &&
      !hasApprovedSale
    ) {
      execution = findDuePostListingStage({
        seller,
        firstListing,
        events: sellerEvents,
        days: settings.sellerPostListingDays,
      });
    }

    if (
      !execution &&
      settings.sellerRelationshipEnabled &&
      latestListing &&
      !hasApprovedSale
    ) {
      execution = findDueRelationshipStage({
        seller,
        latestListing,
        events: sellerEvents,
        days: settings.sellerRelationshipDays,
      });
    }

    if (!execution) {
      continue;
    }

    if (hasRecentEmail(sellerEvents, settings.frequencyCapHours)) {
      result.skipped += 1;
      continue;
    }

    const dispatch = await dispatchStage({
      admin,
      seller,
      execution,
      sendNotifications: settings.lifecycleNotificationsEnabled,
    });

    result.processed += 1;
    if (dispatch.emailed) {
      result.emailed += 1;
      result.flows[execution.flow] += 1;
    }
    if (dispatch.notificationSent) {
      result.notifications += 1;
    }
  }

  return {
    ...result,
    settings,
  };
}
