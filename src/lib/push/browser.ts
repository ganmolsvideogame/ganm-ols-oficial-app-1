"use client";

import type { BlogLocale } from "@/lib/blog/locales";

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type EnsureBrowserPushOptions = {
  forceRefresh?: boolean;
};

const PUBLIC_WEB_PUSH_KEY =
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim() ?? "";

function currentLocaleFromPathname(): BlogLocale {
  if (typeof window === "undefined") {
    return "pt";
  }
  return window.location.pathname.startsWith("/en") ? "en" : "pt";
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function canUseBrowserPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(PUBLIC_WEB_PUSH_KEY)
  );
}

async function postSubscription(
  subscription: PushSubscriptionPayload,
  locale: BlogLocale
) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      subscription,
      locale,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string;
        }
      | null;

    throw new Error(
      payload?.message || "Browser push subscription sync failed."
    );
  }
}

async function revokeSubscription(
  subscription: PushSubscriptionPayload,
  locale: BlogLocale,
  disableAllForCurrentUser = false,
  permission: "default" | "denied" | "granted" | "unsupported" = "granted"
) {
  const response = await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      locale,
      disableAllForCurrentUser,
      permission,
    }),
  }).catch(() => null);

  if (response && !response.ok) {
    throw new Error("Browser push subscription revoke failed.");
  }
}

function normalizeSubscriptionPayload(
  subscription: PushSubscription
): PushSubscriptionPayload {
  const subscriptionJson = subscription.toJSON();

  return {
    endpoint: subscriptionJson.endpoint ?? "",
    expirationTime: subscriptionJson.expirationTime ?? null,
    keys: subscriptionJson.keys,
  };
}

async function createBrowserPushSubscription(
  registration: ServiceWorkerRegistration
) {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_WEB_PUSH_KEY),
  });
}

export async function ensureBrowserPushSubscription(
  locale: BlogLocale = currentLocaleFromPathname(),
  registration?: ServiceWorkerRegistration | null,
  options?: EnsureBrowserPushOptions
) {
  if (!canUseBrowserPush() || Notification.permission !== "granted") {
    return { ok: false, reason: "unavailable" as const };
  }

  const activeRegistration = registration ?? (await navigator.serviceWorker.ready);
  let subscription = await activeRegistration.pushManager.getSubscription();

  if (options?.forceRefresh && subscription) {
    await revokeSubscription(
      normalizeSubscriptionPayload(subscription),
      locale,
      false,
      "granted"
    );
    await subscription.unsubscribe().catch(() => {});
    subscription = null;
  }

  if (!subscription) {
    subscription = await createBrowserPushSubscription(activeRegistration);
  }

  const payload = normalizeSubscriptionPayload(subscription);

  if (!payload.endpoint) {
    return { ok: false, reason: "missing-endpoint" as const };
  }

  await postSubscription(payload, locale);
  return {
    ok: true as const,
    subscription,
    refreshed: Boolean(options?.forceRefresh),
  };
}

export async function requestBrowserPushPermissionAndSubscribe(
  locale: BlogLocale = currentLocaleFromPathname(),
  registration?: ServiceWorkerRegistration | null,
  options?: EnsureBrowserPushOptions
) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return { ok: false, permission: "unsupported" as const };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, permission };
  }

  const result = await ensureBrowserPushSubscription(
    locale,
    registration,
    options
  );
  return {
    ok: result.ok,
    permission,
  };
}

export async function disableBrowserPushNotifications(
  locale: BlogLocale = currentLocaleFromPathname()
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, reason: "unsupported" as const };
  }

  const registration = await navigator.serviceWorker.ready;
  const activeSubscription = await registration.pushManager.getSubscription();

  if (activeSubscription) {
    const payload = normalizeSubscriptionPayload(activeSubscription);
    if (payload.endpoint) {
      await revokeSubscription(payload, locale, true, "granted");
    } else {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locale,
          disableAllForCurrentUser: true,
          permission: "granted",
        }),
      });
    }

    await activeSubscription.unsubscribe().catch(() => {});
  } else {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale,
        disableAllForCurrentUser: true,
        permission: "granted",
      }),
    });
  }

  return { ok: true as const };
}

export async function deferBrowserPushNotifications(
  locale: BlogLocale = currentLocaleFromPathname()
) {
  if (typeof window === "undefined") {
    return { ok: false as const, reason: "unsupported" as const };
  }

  const response = await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      disableAllForCurrentUser: true,
      permission: "default",
    }),
  });

  if (!response.ok) {
    throw new Error("Falha ao salvar a escolha de notificacoes.");
  }

  return { ok: true as const };
}
