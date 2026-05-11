"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_ANALYTICS_EVENT_TYPES } from "@/lib/pwa/events";
import {
  queuePendingMetaEvent,
  trackMetaEvent,
} from "@/lib/analytics/metaPixel";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

declare global {
  interface Window {
    __ganmolsPwaInstall?: (source?: string) => Promise<{
      ok: boolean;
      reason: "prompted" | "ios" | "unavailable";
    }>;
    __ganmolsPwaInstallState?: {
      available: boolean;
      ios: boolean;
      standalone: boolean;
    };
  }
}

const DISMISS_KEY = "ganmols_pwa_prompt_dismissed_at";
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;
const DEVICE_KEY = "ganmols_app_device_id";
const TRACKED_PREFIX = "ganmols_app_event_";
export const PWA_INSTALL_STATE_EVENT = "ganmols:pwa-install-state";

const copy = {
  title: "Instale a GANM OLS no seu celular",
  description:
    "Abra a GANM OLS como aplicativo, com atalho na tela inicial e acesso mais direto ao blog, lojas e anuncios.",
  cta: "Instalar app",
  later: "Agora nao",
  ios: 'No iPhone, toque em "Compartilhar" e depois em "Adicionar a Tela de Inicio".',
} as const;

function isDismissedRecently() {
  if (typeof window === "undefined") {
    return false;
  }

  const raw = window.localStorage.getItem(DISMISS_KEY);
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) && Date.now() - timestamp < DISMISS_WINDOW_MS;
}

function getDeviceId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `ganmols-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(DEVICE_KEY, next);
  return next;
}

function trackInstallClick(source: string, mode: string) {
  if (typeof window === "undefined") {
    return;
  }

  const clickKey = `${TRACKED_PREFIX}${APP_ANALYTICS_EVENT_TYPES.installClick}`;
  if (window.localStorage.getItem(clickKey) === "1") {
    return;
  }

  const metaPayload = {
    content_name: "install_app",
    status: "click",
    source,
    mode,
    entry_point: window.location.pathname,
  };
  const metaSent = trackMetaEvent("Lead", metaPayload);
  if (!metaSent) {
    queuePendingMetaEvent("Lead", metaPayload);
  }

  const deviceId = getDeviceId();
  window.localStorage.setItem(clickKey, "1");
  fetch("/api/analytics/app", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      eventType: APP_ANALYTICS_EVENT_TYPES.installClick,
      deviceId,
      path: window.location.pathname,
      metadata: {
        mode,
        source,
      },
    }),
  }).catch(() => {});
}

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    );
  }, []);
  const isIos = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
      !/crios|fxios/i.test(window.navigator.userAgent)
    );
  }, []);
  const install = useCallback(
    async (source = "prompt") => {
      if (isIos) {
        trackInstallClick(source, "ios-instructions");
        setVisible(true);
        return {
          ok: false,
          reason: "ios" as const,
        };
      }

      if (!deferredPrompt) {
        return {
          ok: false,
          reason: "unavailable" as const,
        };
      }

      trackInstallClick(source, "prompt");
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
      setDeferredPrompt(null);
      setVisible(false);
      return {
        ok: true,
        reason: "prompted" as const,
      };
    },
    [deferredPrompt, isIos]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const deviceId = getDeviceId();
    const userAgent = window.navigator.userAgent;
    const isNativeAndroid = /GANMOLS_APP_ANDROID/i.test(userAgent);
    const eventType = isNativeAndroid
      ? APP_ANALYTICS_EVENT_TYPES.nativeAndroidOpen
      : isStandalone
        ? APP_ANALYTICS_EVENT_TYPES.pwaOpen
        : null;

    if (!eventType) {
      return;
    }

    const storageKey = `${TRACKED_PREFIX}${eventType}`;
    if (window.localStorage.getItem(storageKey) === "1") {
      return;
    }

    window.localStorage.setItem(storageKey, "1");
    fetch("/api/analytics/app", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        deviceId,
        path: window.location.pathname,
        metadata: {
          mode: isNativeAndroid ? "native_android" : "standalone",
        },
      }),
    }).catch(() => {});
  }, [isStandalone]);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone || isDismissedRecently()) {
      return;
    }
    let iosTimer: number | null = null;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isIos) {
      iosTimer = window.setTimeout(() => {
        setVisible(true);
      }, 0);
    }

    return () => {
      if (iosTimer) {
        window.clearTimeout(iosTimer);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isIos, isStandalone]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleInstalled = () => {
      const deviceId = getDeviceId();
      window.localStorage.setItem(
        `${TRACKED_PREFIX}${APP_ANALYTICS_EVENT_TYPES.pwaInstalled}`,
        "1"
      );
      fetch("/api/analytics/app", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          eventType: APP_ANALYTICS_EVENT_TYPES.pwaInstalled,
          deviceId,
          path: window.location.pathname,
          metadata: {
            mode: "pwa",
          },
        }),
      }).catch(() => {});
      setVisible(false);
    };

    window.addEventListener("appinstalled", handleInstalled);
    return () => window.removeEventListener("appinstalled", handleInstalled);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.__ganmolsPwaInstall = install;
    window.__ganmolsPwaInstallState = {
      available: !isStandalone && (Boolean(deferredPrompt) || isIos),
      ios: Boolean(isIos),
      standalone: isStandalone,
    };
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_STATE_EVENT));

    return () => {
      if (window.__ganmolsPwaInstall === install) {
        delete window.__ganmolsPwaInstall;
      }
      delete window.__ganmolsPwaInstallState;
      window.dispatchEvent(new CustomEvent(PWA_INSTALL_STATE_EVENT));
    };
  }, [deferredPrompt, install, isIos, isStandalone]);

  if (!visible || isStandalone) {
    return null;
  }

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setVisible(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] px-3 md:bottom-6 md:px-6">
      <div className="pointer-events-auto mx-auto max-w-xl rounded-[1.8rem] border border-zinc-200 bg-white/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,.16)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          GANM OLS App
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          {isIos ? copy.ios : copy.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {!isIos && deferredPrompt ? (
            <button
              type="button"
              onClick={() => void install("floating-prompt")}
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {copy.cta}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {copy.later}
          </button>
        </div>
      </div>
    </div>
  );
}
