"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type PendingMetaEvent = {
  name: string;
  params?: Record<string, unknown>;
  mode?: "track" | "trackCustom";
};

const PENDING_META_EVENT_KEY = "ganmols_meta_pending_event";

export function isMetaPixelEnabled() {
  return Boolean(META_PIXEL_ID);
}

export function trackMetaEvent(
  name: string,
  params?: Record<string, unknown>
): boolean {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return false;
  }
  window.fbq("track", name, params ?? {});
  return true;
}

export function trackMetaCustomEvent(
  name: string,
  params?: Record<string, unknown>
): boolean {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return false;
  }
  window.fbq("trackCustom", name, params ?? {});
  return true;
}

export function queuePendingMetaEvent(
  name: string,
  params?: Record<string, unknown>,
  mode: "track" | "trackCustom" = "track"
) {
  if (typeof window === "undefined") {
    return;
  }
  const payload: PendingMetaEvent = { name, params, mode };
  window.localStorage.setItem(PENDING_META_EVENT_KEY, JSON.stringify(payload));
}

export function flushPendingMetaEvent() {
  if (typeof window === "undefined") {
    return;
  }
  const raw = window.localStorage.getItem(PENDING_META_EVENT_KEY);
  if (!raw) {
    return;
  }

  try {
    const payload = JSON.parse(raw) as PendingMetaEvent;
    if (payload?.name) {
      if (payload.mode === "trackCustom") {
        trackMetaCustomEvent(payload.name, payload.params);
      } else {
        trackMetaEvent(payload.name, payload.params);
      }
    }
  } catch {
    // Ignore malformed local payloads.
  } finally {
    window.localStorage.removeItem(PENDING_META_EVENT_KEY);
  }
}
