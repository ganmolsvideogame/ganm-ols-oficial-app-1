import "server-only";

import { createHash } from "crypto";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App as FirebaseAdminApp,
} from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import webpush from "web-push";

import type { BlogLocale } from "@/lib/blog/locales";
import { buildAbsoluteUrl } from "@/lib/utils/site";
import { createAdminClient } from "@/lib/supabase/admin";

type StoredPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  locale: BlogLocale;
  userId?: string | null;
  userAgent?: string | null;
  status: "active" | "revoked";
  subscribedAt: string;
  updatedAt: string;
};

type BrowserPushPermissionState =
  | "default"
  | "denied"
  | "granted"
  | "unsupported";

type StoredPushPreference = {
  userId: string;
  locale: BlogLocale;
  enabled: boolean;
  permission: BrowserPushPermissionState;
  enabledAt: string | null;
  disabledAt: string | null;
  lastEndpointHash: string | null;
  updatedAt: string;
};

type StoredNativePushToken = {
  token: string;
  platform: "android";
  locale: BlogLocale;
  userId?: string | null;
  userAgent?: string | null;
  status: "active" | "revoked";
  subscribedAt: string;
  updatedAt: string;
};

type SiteSettingRow = {
  key: string;
  value: string | null;
};

type WebPushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  icon?: string;
  badge?: string;
  image?: string;
  lang?: string;
  notificationId?: string;
  notificationType?: string;
  trackingSource?: string;
};

const PUSH_SETTING_PREFIX = "browser_push_subscription:";
const PUSH_PREFERENCE_PREFIX = "browser_push_preference:";
const NATIVE_PUSH_SETTING_PREFIX = "native_push_token:";
const DEFAULT_PUSH_ICON_PATH = "/ganmosicon-removebg-preview.png";
const DEFAULT_NATIVE_PUSH_CHANNEL_ID = "ganm_ols_updates";
const FIREBASE_APP_NAME = "ganmols-fcm";
let firebaseAdminApp: FirebaseAdminApp | null | undefined;

function normalizePushKeys() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim() ?? "";
  const subject =
    process.env.WEB_PUSH_SUBJECT?.trim() || "mailto:contato@ganmols.com";

  return { publicKey, privateKey, subject };
}

function hashEndpoint(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

function buildPushSettingKey(endpoint: string) {
  return `${PUSH_SETTING_PREFIX}${hashEndpoint(endpoint)}`;
}

function buildPushPreferenceKey(userId: string) {
  return `${PUSH_PREFERENCE_PREFIX}${userId.trim()}`;
}

function buildNativePushSettingKey(token: string) {
  return `${NATIVE_PUSH_SETTING_PREFIX}${hashEndpoint(token)}`;
}

function parseStoredSubscription(row: SiteSettingRow) {
  const raw = String(row.value ?? "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPushSubscription>;
    const endpoint = String(parsed.endpoint ?? "").trim();
    const p256dh = String(parsed.keys?.p256dh ?? "").trim();
    const auth = String(parsed.keys?.auth ?? "").trim();

    if (!endpoint || !p256dh || !auth || parsed.status !== "active") {
      return null;
    }

    return {
      endpoint,
      expirationTime:
        typeof parsed.expirationTime === "number"
          ? parsed.expirationTime
          : null,
      keys: {
        p256dh,
        auth,
      },
      locale: parsed.locale === "en" ? "en" : "pt",
      userId: String(parsed.userId ?? "").trim() || null,
      userAgent: String(parsed.userAgent ?? "").trim() || null,
      status: "active" as const,
      subscribedAt:
        String(parsed.subscribedAt ?? "").trim() || new Date().toISOString(),
      updatedAt:
        String(parsed.updatedAt ?? "").trim() || new Date().toISOString(),
    } satisfies StoredPushSubscription;
  } catch {
    return null;
  }
}

function parseStoredPushPreference(row: SiteSettingRow) {
  const raw = String(row.value ?? "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPushPreference>;
    const userId = String(parsed.userId ?? "").trim();
    if (!userId) {
      return null;
    }

    const permission = String(parsed.permission ?? "").trim();
    const normalizedPermission: BrowserPushPermissionState =
      permission === "granted" ||
      permission === "denied" ||
      permission === "unsupported"
        ? permission
        : "default";

    return {
      userId,
      locale: parsed.locale === "en" ? "en" : "pt",
      enabled: parsed.enabled === true,
      permission: normalizedPermission,
      enabledAt: String(parsed.enabledAt ?? "").trim() || null,
      disabledAt: String(parsed.disabledAt ?? "").trim() || null,
      lastEndpointHash: String(parsed.lastEndpointHash ?? "").trim() || null,
      updatedAt:
        String(parsed.updatedAt ?? "").trim() || new Date().toISOString(),
    } satisfies StoredPushPreference;
  } catch {
    return null;
  }
}

function parseStoredNativePushToken(row: SiteSettingRow) {
  const raw = String(row.value ?? "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredNativePushToken>;
    const token = String(parsed.token ?? "").trim();

    if (!token || parsed.status !== "active") {
      return null;
    }

    return {
      token,
      platform: "android" as const,
      locale: parsed.locale === "en" ? "en" : "pt",
      userId: String(parsed.userId ?? "").trim() || null,
      userAgent: String(parsed.userAgent ?? "").trim() || null,
      status: "active" as const,
      subscribedAt:
        String(parsed.subscribedAt ?? "").trim() || new Date().toISOString(),
      updatedAt:
        String(parsed.updatedAt ?? "").trim() || new Date().toISOString(),
    } satisfies StoredNativePushToken;
  } catch {
    return null;
  }
}

function getFirebaseServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ?? "";

  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };

      if (
        parsed.project_id?.trim() &&
        parsed.client_email?.trim() &&
        parsed.private_key?.trim()
      ) {
        return {
          projectId: parsed.project_id.trim(),
          clientEmail: parsed.client_email.trim(),
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/\\n/g, "\n") ?? "";

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

function getFirebaseAdminApp() {
  if (firebaseAdminApp !== undefined) {
    return firebaseAdminApp;
  }

  try {
    const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);
    if (existing) {
      firebaseAdminApp = existing;
      return firebaseAdminApp;
    }

    const serviceAccount = getFirebaseServiceAccount();

    if (serviceAccount) {
      firebaseAdminApp = initializeApp(
        {
          credential: cert({
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey,
          }),
          projectId: serviceAccount.projectId,
        },
        FIREBASE_APP_NAME
      );
      return firebaseAdminApp;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
      firebaseAdminApp = initializeApp(
        {
          credential: applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID?.trim() || undefined,
        },
        FIREBASE_APP_NAME
      );
      return firebaseAdminApp;
    }
  } catch {
    firebaseAdminApp = null;
    return firebaseAdminApp;
  }

  firebaseAdminApp = null;
  return firebaseAdminApp;
}

function configureWebPush() {
  const { publicKey, privateKey, subject } = normalizePushKeys();
  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function isWebPushConfigured() {
  const { publicKey, privateKey } = normalizePushKeys();
  return Boolean(publicKey && privateKey);
}

export function isNativePushConfigured() {
  return Boolean(getFirebaseAdminApp());
}

export async function saveBrowserPushSubscription(params: {
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  locale: BlogLocale;
  userId?: string | null;
  userAgent?: string | null;
}) {
  const endpoint = String(params.subscription.endpoint ?? "").trim();
  const p256dh = String(params.subscription.keys?.p256dh ?? "").trim();
  const auth = String(params.subscription.keys?.auth ?? "").trim();

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid browser push subscription.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const record: StoredPushSubscription = {
    endpoint,
    expirationTime:
      typeof params.subscription.expirationTime === "number"
        ? params.subscription.expirationTime
        : null,
    keys: {
      p256dh,
      auth,
    },
    locale: params.locale,
    userId: params.userId?.trim() || null,
    userAgent: params.userAgent?.trim() || null,
    status: "active",
    subscribedAt: now,
    updatedAt: now,
  };

  const { error } = await admin.from("site_settings").upsert({
    key: buildPushSettingKey(endpoint),
    value: JSON.stringify(record),
  });

  if (error) {
    throw error;
  }

  return record;
}

export async function saveBrowserPushPreference(params: {
  userId: string;
  locale: BlogLocale;
  enabled: boolean;
  permission: BrowserPushPermissionState;
  endpoint?: string | null;
}) {
  const userId = params.userId.trim();
  if (!userId) {
    throw new Error("Missing user id for browser push preference.");
  }

  const admin = createAdminClient();
  const key = buildPushPreferenceKey(userId);
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const existing = data
    ? parseStoredPushPreference(data as SiteSettingRow)
    : null;
  const now = new Date().toISOString();
  const nextValue: StoredPushPreference = {
    userId,
    locale: params.locale,
    enabled: params.enabled,
    permission: params.permission,
    enabledAt: params.enabled
      ? existing?.enabledAt || now
      : existing?.enabledAt || null,
    disabledAt: params.enabled ? null : now,
    lastEndpointHash: params.endpoint ? hashEndpoint(params.endpoint) : existing?.lastEndpointHash || null,
    updatedAt: now,
  };

  const { error: upsertError } = await admin.from("site_settings").upsert({
    key,
    value: JSON.stringify(nextValue),
  });

  if (upsertError) {
    throw upsertError;
  }

  return nextValue;
}

export async function saveNativePushToken(params: {
  token: string;
  locale: BlogLocale;
  userId?: string | null;
  userAgent?: string | null;
}) {
  const token = String(params.token ?? "").trim();

  if (!token) {
    throw new Error("Invalid native push token.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const record: StoredNativePushToken = {
    token,
    platform: "android",
    locale: params.locale,
    userId: params.userId?.trim() || null,
    userAgent: params.userAgent?.trim() || null,
    status: "active",
    subscribedAt: now,
    updatedAt: now,
  };

  const { error } = await admin.from("site_settings").upsert({
    key: buildNativePushSettingKey(token),
    value: JSON.stringify(record),
  });

  if (error) {
    throw error;
  }

  return record;
}

async function updateStoredPushSubscription(
  endpoint: string,
  nextStatus: "active" | "revoked"
) {
  const admin = createAdminClient();
  const key = buildPushSettingKey(endpoint);
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return;
  }

  const raw = String((data as SiteSettingRow).value ?? "").trim();
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPushSubscription>;
    const updated = {
      ...parsed,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    await admin.from("site_settings").upsert({
      key,
      value: JSON.stringify(updated),
    });
  } catch {
    return;
  }
}

async function updateStoredNativePushToken(
  token: string,
  nextStatus: "active" | "revoked"
) {
  const admin = createAdminClient();
  const key = buildNativePushSettingKey(token);
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return;
  }

  const raw = String((data as SiteSettingRow).value ?? "").trim();
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredNativePushToken>;
    const updated = {
      ...parsed,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    await admin.from("site_settings").upsert({
      key,
      value: JSON.stringify(updated),
    });
  } catch {
    return;
  }
}

export async function revokeBrowserPushSubscription(endpoint: string) {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) {
    return;
  }

  await updateStoredPushSubscription(normalizedEndpoint, "revoked");
}

export async function revokeNativePushToken(token: string) {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return;
  }

  await updateStoredNativePushToken(normalizedToken, "revoked");
}

export async function getBrowserPushPreference(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .eq("key", buildPushPreferenceKey(normalizedUserId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return parseStoredPushPreference(data as SiteSettingRow);
}

export async function listActiveBrowserPushSubscriptions(params?: {
  userIds?: string[];
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .like("key", `${PUSH_SETTING_PREFIX}%`);

  if (error) {
    throw error;
  }

  const userIds = new Set(
    (params?.userIds ?? []).map((value) => value.trim()).filter(Boolean)
  );
  const deduped = new Map<string, StoredPushSubscription>();

  (data ?? []).forEach((row) => {
    const parsed = parseStoredSubscription(row as SiteSettingRow);
    if (!parsed) {
      return;
    }
    if (userIds.size > 0 && (!parsed.userId || !userIds.has(parsed.userId))) {
      return;
    }
    deduped.set(parsed.endpoint, parsed);
  });

  return Array.from(deduped.values());
}

export async function listActiveNativePushTokens(params?: {
  userIds?: string[];
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .like("key", `${NATIVE_PUSH_SETTING_PREFIX}%`);

  if (error) {
    throw error;
  }

  const userIds = new Set(
    (params?.userIds ?? []).map((value) => value.trim()).filter(Boolean)
  );
  const deduped = new Map<string, StoredNativePushToken>();

  (data ?? []).forEach((row) => {
    const parsed = parseStoredNativePushToken(row as SiteSettingRow);
    if (!parsed) {
      return;
    }
    if (userIds.size > 0 && (!parsed.userId || !userIds.has(parsed.userId))) {
      return;
    }
    deduped.set(parsed.token, parsed);
  });

  return Array.from(deduped.values());
}

export async function revokeBrowserPushSubscriptionsForUser(userId: string) {
  const subscriptions = await listActiveBrowserPushSubscriptions({
    userIds: [userId],
  });

  await Promise.all(
    subscriptions.map((subscription) =>
      updateStoredPushSubscription(subscription.endpoint, "revoked")
    )
  );

  return subscriptions.length;
}

export async function revokeNativePushTokensForUser(userId: string) {
  const tokens = await listActiveNativePushTokens({
    userIds: [userId],
  });

  await Promise.all(
    tokens.map((token) => updateStoredNativePushToken(token.token, "revoked"))
  );

  return tokens.length;
}

async function sendWebPushNotification(params: {
  payload: WebPushPayload;
  userIds?: string[];
}) {
  if (!configureWebPush()) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "web-push-not-configured",
    };
  }

  const subscriptions = await listActiveBrowserPushSubscriptions({
    userIds: params.userIds,
  });

  if (subscriptions.length === 0) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "no-active-subscriptions",
    };
  }

  const payload = JSON.stringify({
    ...params.payload,
    badge: params.payload.badge || buildAbsoluteUrl(DEFAULT_PUSH_ICON_PATH),
  });

  const failures: Array<{
    endpointHash: string;
    statusCode?: number;
    message: string;
  }> = [];

  const settled = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { ok: true as const };
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await updateStoredPushSubscription(subscription.endpoint, "revoked");
        }

        const message =
          typeof error === "object" &&
          error !== null &&
          "body" in error &&
          typeof (error as { body?: unknown }).body === "string"
            ? (error as { body: string }).body
            : error instanceof Error
              ? error.message
              : "browser-push-send-failed";

        failures.push({
          endpointHash: hashEndpoint(subscription.endpoint).slice(0, 12),
          statusCode,
          message,
        });

        return { ok: false as const };
      }
    })
  );

  const sent = settled.filter(
    (result) => result.status === "fulfilled" && result.value.ok
  ).length;
  const failed = settled.length - sent;

  return {
    ok: failed === 0,
    sent,
    failed,
    skipped: false,
    failures,
  };
}

async function sendNativePushNotification(params: {
  payload: WebPushPayload;
  userIds?: string[];
}) {
  const app = getFirebaseAdminApp();
  if (!app) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "firebase-admin-not-configured",
    };
  }

  const tokens = await listActiveNativePushTokens({
    userIds: params.userIds,
  });

  if (tokens.length === 0) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "no-active-native-tokens",
    };
  }

  const messaging = getMessaging(app);
  const nativeImageUrl =
    String(params.payload.image ?? "").trim() ||
    buildAbsoluteUrl(DEFAULT_PUSH_ICON_PATH);
  const failures: Array<{
    tokenHash: string;
    code?: string;
    message: string;
  }> = [];

  const settled = await Promise.allSettled(
    tokens.map(async (registration) => {
      try {
        await messaging.send({
          token: registration.token,
          notification: {
            title: params.payload.title,
            body: params.payload.body,
            imageUrl: nativeImageUrl,
          },
          data: {
            url: params.payload.url || "/",
            link: params.payload.url || "/",
            tag: params.payload.tag || "",
            title: params.payload.title,
            body: params.payload.body,
            image: params.payload.image || "",
            notificationId: params.payload.notificationId || "",
            notificationType: params.payload.notificationType || "",
            trackingSource: params.payload.trackingSource || "",
          },
          android: {
            priority: "high",
            notification: {
              channelId: DEFAULT_NATIVE_PUSH_CHANNEL_ID,
              icon: "ic_stat_ganmols_notification",
              color: "#111827",
              imageUrl: nativeImageUrl,
            },
          },
        });
        return { ok: true as const };
      } catch (error) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
            ? (error as { code: string }).code
            : undefined;

        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          await updateStoredNativePushToken(registration.token, "revoked");
        }

        failures.push({
          tokenHash: hashEndpoint(registration.token).slice(0, 12),
          code,
          message:
            error instanceof Error
              ? error.message
              : "native-push-send-failed",
        });

        return { ok: false as const };
      }
    })
  );

  const sent = settled.filter(
    (result) => result.status === "fulfilled" && result.value.ok
  ).length;
  const failed = settled.length - sent;

  return {
    ok: failed === 0,
    sent,
    failed,
    skipped: false,
    failures,
  };
}

export async function sendBrowserPushNotification(params: {
  payload: WebPushPayload;
  userIds?: string[];
}) {
  const [browserResult, nativeResult] = await Promise.all([
    sendWebPushNotification(params),
    sendNativePushNotification(params),
  ]);

  return {
    ...browserResult,
    ok:
      (browserResult.ok || browserResult.skipped) &&
      (nativeResult.ok || nativeResult.skipped),
    nativeResult,
  };
}
