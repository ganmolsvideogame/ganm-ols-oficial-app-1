"use client";

import type { LocalNotificationSchema } from "@capacitor/local-notifications";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      Plugins?: {
        AppPermissions?: {
          openNotificationSettings?: () => Promise<{ opened: boolean }>;
        };
      };
    };
  }
}

type NativeNotificationPermission =
  | "prompt"
  | "prompt-with-rationale"
  | "granted"
  | "denied"
  | "unsupported";

const ANDROID_NOTIFICATION_CHANNEL_ID = "ganm_ols_updates";
const NATIVE_PUSH_TOKEN_STORAGE_KEY = "ganmols_native_push_token";
const NATIVE_PUSH_SMALL_ICON = "ic_stat_ganmols_notification";
const NATIVE_PUSH_LARGE_ICON = "ganmols_notification_large";
const NATIVE_PUSH_ICON_COLOR = "#111827";
let nativeNotificationsInitialized = false;
let nativeNotificationListenerAttached = false;
let nativeRemotePushListenersAttached = false;

function hasNativeAndroidUserAgent() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.navigator.userAgent.includes("GANMOLS_APP_ANDROID");
}

function resolveNotificationUrl(value: string | null | undefined) {
  const targetUrl = String(value ?? "").trim();

  if (!targetUrl || typeof window === "undefined") {
    return "";
  }

  try {
    return new URL(targetUrl, window.location.origin).toString();
  } catch {
    return "";
  }
}

function buildTrackedNotificationUrl(params: {
  notificationId?: string | null;
  trackingSource?: string | null;
  fallbackUrl?: string | null;
}) {
  const notificationId = String(params.notificationId ?? "").trim();
  const trackingSource =
    String(params.trackingSource ?? "").trim() || "native_push";

  if (!notificationId || typeof window === "undefined") {
    return resolveNotificationUrl(params.fallbackUrl);
  }

  return resolveNotificationUrl(
    `/notificacoes/${encodeURIComponent(notificationId)}/abrir?source=${encodeURIComponent(trackingSource)}`
  );
}

function readStoredNativePushToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(NATIVE_PUSH_TOKEN_STORAGE_KEY) ?? "";
}

function storeNativePushToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(NATIVE_PUSH_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(NATIVE_PUSH_TOKEN_STORAGE_KEY);
}

async function syncNativePushTokenWithServer(token: string) {
  const normalizedToken = String(token ?? "").trim();
  if (!normalizedToken) {
    return false;
  }

  try {
    const response = await fetch("/api/push/native/subscribe", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        token: normalizedToken,
        locale: window.location.pathname.startsWith("/en") ? "en" : "pt",
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function revokeNativePushTokenFromServer(token: string) {
  const normalizedToken = String(token ?? "").trim();
  if (!normalizedToken) {
    return false;
  }

  try {
    const response = await fetch("/api/push/native/subscribe", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        token: normalizedToken,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function isNativeAndroidApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const platform = window.Capacitor?.getPlatform?.();
  const nativePlatform = window.Capacitor?.isNativePlatform?.() === true;

  if (platform === "android") {
    return nativePlatform || hasNativeAndroidUserAgent();
  }

  return hasNativeAndroidUserAgent();
}

export async function getNativeAppNotificationPermissionStatus() {
  if (typeof window === "undefined" || !isNativeAndroidApp()) {
    return {
      pushPermission: "unsupported" as NativeNotificationPermission,
      localPermission: "unsupported" as NativeNotificationPermission,
      granted: false,
      hasStoredToken: false,
    };
  }

  try {
    const initialized = await initializeNativeAppNotifications();
    if (!initialized) {
      return {
        pushPermission: "unsupported" as NativeNotificationPermission,
        localPermission: "unsupported" as NativeNotificationPermission,
        granted: false,
        hasStoredToken: false,
      };
    }

    const [{ PushNotifications }, { LocalNotifications }] = await Promise.all([
      import("@capacitor/push-notifications"),
      import("@capacitor/local-notifications"),
    ]);

    const [pushPermissions, localPermissions] = await Promise.all([
      PushNotifications.checkPermissions(),
      LocalNotifications.checkPermissions(),
    ]);

    const pushPermission = normalizeNativePermission(pushPermissions.receive);
    const localPermission = normalizeNativePermission(localPermissions.display);

    return {
      pushPermission,
      localPermission,
      granted: pushPermission === "granted" && localPermission === "granted",
      hasStoredToken: Boolean(readStoredNativePushToken().trim()),
    };
  } catch {
    return {
      pushPermission: "unsupported" as NativeNotificationPermission,
      localPermission: "unsupported" as NativeNotificationPermission,
      granted: false,
      hasStoredToken: false,
    };
  }
}

function normalizeNativePermission(value: string): NativeNotificationPermission {
  if (
    value === "prompt" ||
    value === "prompt-with-rationale" ||
    value === "granted" ||
    value === "denied"
  ) {
    return value;
  }

  return "unsupported";
}

function buildNativeNotificationId(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }

  const positive = Math.abs(hash);
  return positive === 0 ? Date.now() % 2147483647 : positive;
}

async function initializeNativeRemotePush() {
  if (typeof window === "undefined" || !isNativeAndroidApp()) {
    return false;
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    await PushNotifications.createChannel({
      id: ANDROID_NOTIFICATION_CHANNEL_ID,
      name: "GANM OLS",
      description: "Alertas de pedidos, suporte e novidades da GANM OLS.",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#111827",
    }).catch(() => {});

    if (!nativeRemotePushListenersAttached) {
      await PushNotifications.addListener("registration", (token) => {
        const nextToken = String(token.value ?? "").trim();
        if (!nextToken) {
          return;
        }

        storeNativePushToken(nextToken);
        void syncNativePushTokenWithServer(nextToken);
      });

      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          const targetUrl = buildTrackedNotificationUrl({
            notificationId: String(
              action.notification.data?.notificationId ?? ""
            ),
            trackingSource: String(
              action.notification.data?.trackingSource ?? "native_push"
            ),
            fallbackUrl: String(
              action.notification.data?.url ??
                action.notification.data?.link ??
                action.notification.link ??
                ""
            ),
          });

          if (!targetUrl) {
            return;
          }

          window.location.assign(targetUrl);
        }
      );

      nativeRemotePushListenersAttached = true;
    }

    return true;
  } catch {
    return false;
  }
}

export async function initializeNativeAppNotifications() {
  if (typeof window === "undefined" || !isNativeAndroidApp()) {
    return false;
  }

  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );

    await LocalNotifications.createChannel({
      id: ANDROID_NOTIFICATION_CHANNEL_ID,
      name: "GANM OLS",
      description: "Alertas de pedidos, suporte e novidades da GANM OLS.",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#111827",
    }).catch(() => {});

    if (!nativeNotificationListenerAttached) {
      await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (action) => {
          const targetUrl = buildTrackedNotificationUrl({
            notificationId: String(action.notification.extra?.notificationId ?? ""),
            trackingSource: String(
              action.notification.extra?.trackingSource ?? "native_local"
            ),
            fallbackUrl: String(action.notification.extra?.url ?? ""),
          });

          if (!targetUrl) {
            return;
          }

          window.location.assign(targetUrl);
        }
      );
      nativeNotificationListenerAttached = true;
    }

    nativeNotificationsInitialized = true;
    await initializeNativeRemotePush();
    return true;
  } catch {
    return false;
  }
}

export async function syncNativeAppPushRegistration() {
  if (typeof window === "undefined" || !isNativeAndroidApp()) {
    return {
      ok: false,
      permission: "unsupported" as NativeNotificationPermission,
    };
  }

  try {
    const initialized = await initializeNativeAppNotifications();
    if (!initialized) {
      return {
        ok: false,
        permission: "unsupported" as NativeNotificationPermission,
      };
    }

    const [{ PushNotifications }, { LocalNotifications }] = await Promise.all([
      import("@capacitor/push-notifications"),
      import("@capacitor/local-notifications"),
    ]);
    const [currentPush, currentLocal] = await Promise.all([
      PushNotifications.checkPermissions(),
      LocalNotifications.checkPermissions(),
    ]);
    const permission = normalizeNativePermission(currentPush.receive);
    const localPermission = normalizeNativePermission(currentLocal.display);

    if (permission !== "granted" || localPermission !== "granted") {
      return {
        ok: false,
        permission:
          permission !== "granted" ? permission : localPermission,
      };
    }

    const storedToken = readStoredNativePushToken().trim();
    if (storedToken) {
      void syncNativePushTokenWithServer(storedToken);
    }

    await PushNotifications.register();
    return { ok: true, permission };
  } catch {
    return {
      ok: false,
      permission: "unsupported" as NativeNotificationPermission,
    };
  }
}

export async function revokeNativeAppPushRegistration() {
  if (typeof window === "undefined" || !isNativeAndroidApp()) {
    return false;
  }

  const storedToken = readStoredNativePushToken().trim();
  storeNativePushToken(null);

  if (!storedToken) {
    return false;
  }

  return revokeNativePushTokenFromServer(storedToken);
}

export async function requestNativeAppNotificationPermission() {
  if (typeof window === "undefined" || !isNativeAndroidApp()) {
    return {
      ok: false,
      permission: "unsupported" as NativeNotificationPermission,
    };
  }

  try {
    const initialized = await initializeNativeAppNotifications();
    if (!initialized) {
      return {
        ok: false,
        permission: "unsupported" as NativeNotificationPermission,
      };
    }

    const [{ PushNotifications }, { LocalNotifications }] = await Promise.all([
      import("@capacitor/push-notifications"),
      import("@capacitor/local-notifications"),
    ]);
    let [currentPush, currentLocal] = await Promise.all([
      PushNotifications.checkPermissions(),
      LocalNotifications.checkPermissions(),
    ]);
    let permission = normalizeNativePermission(currentPush.receive);
    let localPermission = normalizeNativePermission(currentLocal.display);

    if (localPermission !== "granted") {
      currentLocal = await LocalNotifications.requestPermissions();
      localPermission = normalizeNativePermission(currentLocal.display);
    }

    if (permission !== "granted") {
      currentPush = await PushNotifications.requestPermissions();
      permission = normalizeNativePermission(currentPush.receive);
    }

    if (permission === "granted" && localPermission === "granted") {
      const storedToken = readStoredNativePushToken().trim();
      if (storedToken) {
        void syncNativePushTokenWithServer(storedToken);
      }

      await PushNotifications.register();
      return { ok: true, permission };
    }

    return {
      ok: false,
      permission:
        permission !== "granted" ? permission : localPermission,
    };
  } catch {
    return {
      ok: false,
      permission: "unsupported" as NativeNotificationPermission,
    };
  }
}

export async function showNativeAppNotification(params: {
  id: string;
  title: string;
  body?: string | null;
  url?: string | null;
  notificationId?: string | null;
  trackingSource?: string | null;
}) {
  if (typeof window === "undefined" || !isNativeAndroidApp()) {
    return false;
  }

  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    const permission = await LocalNotifications.checkPermissions();
    if (normalizeNativePermission(permission.display) !== "granted") {
      return false;
    }

    if (!nativeNotificationsInitialized) {
      const initialized = await initializeNativeAppNotifications();
      if (!initialized) {
        return false;
      }
    }

    const notification: LocalNotificationSchema = {
      id: buildNativeNotificationId(params.id),
      title: params.title,
      body: params.body ?? "",
      channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
      smallIcon: NATIVE_PUSH_SMALL_ICON,
      largeIcon: NATIVE_PUSH_LARGE_ICON,
      iconColor: NATIVE_PUSH_ICON_COLOR,
      schedule: {
        at: new Date(Date.now() + 250),
      },
      autoCancel: true,
      extra: {
        url: params.url ?? "/",
        notificationId: params.notificationId ?? params.id,
        trackingSource: params.trackingSource ?? "native_local",
      },
    };

    await LocalNotifications.schedule({
      notifications: [notification],
    });
    return true;
  } catch {
    return false;
  }
}

export async function openNativeAppNotificationSettings() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const globalPlugin = window.Capacitor?.Plugins?.AppPermissions;
    if (globalPlugin?.openNotificationSettings) {
      const result = await globalPlugin.openNotificationSettings();
      return result?.opened === true;
    }

    const { Capacitor, registerPlugin } = await import("@capacitor/core");
    const isNativeAndroid =
      (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") ||
      isNativeAndroidApp();

    if (!isNativeAndroid) {
      return false;
    }

    const plugin = registerPlugin<{
      openNotificationSettings: () => Promise<{ opened: boolean }>;
    }>("AppPermissions");

    const result = await plugin.openNotificationSettings();
    return result?.opened === true;
  } catch {
    return false;
  }
}
