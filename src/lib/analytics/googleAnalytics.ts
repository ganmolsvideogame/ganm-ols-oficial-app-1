"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

type PendingGaEvent = {
  name: string;
  params?: Record<string, unknown>;
};

const PENDING_GA_EVENT_KEY = "ganmols_ga_pending_event";

export function isGoogleAnalyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID);
}

export function trackGaEvent(
  name: string,
  params?: Record<string, unknown>
): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return false;
  }

  window.gtag("event", name, params ?? {});
  return true;
}

export function pushDataLayerEvent(
  name: string,
  params?: Record<string, unknown>
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: name,
    ...(params ?? {}),
  });
  return true;
}

export function queuePendingGaEvent(
  name: string,
  params?: Record<string, unknown>
) {
  if (typeof window === "undefined") {
    return;
  }
  const payload: PendingGaEvent = { name, params };
  window.localStorage.setItem(PENDING_GA_EVENT_KEY, JSON.stringify(payload));
}

export function flushPendingGaEvent() {
  if (typeof window === "undefined") {
    return;
  }

  const raw = window.localStorage.getItem(PENDING_GA_EVENT_KEY);
  if (!raw) {
    return;
  }

  try {
    const payload = JSON.parse(raw) as PendingGaEvent;
    if (!payload?.name) {
      window.localStorage.removeItem(PENDING_GA_EVENT_KEY);
      return;
    }

    const sent = trackGaEvent(payload.name, payload.params);
    if (sent) {
      window.localStorage.removeItem(PENDING_GA_EVENT_KEY);
    }
  } catch {
    window.localStorage.removeItem(PENDING_GA_EVENT_KEY);
  }
}
