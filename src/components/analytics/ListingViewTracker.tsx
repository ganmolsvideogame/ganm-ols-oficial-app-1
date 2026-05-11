"use client";

import { useEffect } from "react";

type ListingViewTrackerProps = {
  listingId: string;
};

const SESSION_STORAGE_KEY = "ganmols:session-id";
const VIEW_STORAGE_PREFIX = "ganmols:listing-view:";
const THROTTLE_MS = 6 * 60 * 60 * 1000;

function getSessionId() {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextValue =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(SESSION_STORAGE_KEY, nextValue);
  return nextValue;
}

export default function ListingViewTracker({
  listingId,
}: ListingViewTrackerProps) {
  useEffect(() => {
    if (!listingId) {
      return;
    }

    const storageKey = `${VIEW_STORAGE_PREFIX}${listingId}`;
    const lastTrackedAt = Number.parseInt(
      window.localStorage.getItem(storageKey) ?? "",
      10
    );

    if (
      Number.isFinite(lastTrackedAt) &&
      Date.now() - lastTrackedAt < THROTTLE_MS
    ) {
      return;
    }

    const trackView = async () => {
      try {
        const response = await fetch("/api/analytics/listing-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
          keepalive: true,
          body: JSON.stringify({
            listingId,
            sessionId: getSessionId(),
            path: window.location.pathname,
          }),
        });

        if (response.ok) {
          window.localStorage.setItem(storageKey, String(Date.now()));
        }
      } catch {
        // ignore
      }
    };

    void trackView();
  }, [listingId]);

  return null;
}
