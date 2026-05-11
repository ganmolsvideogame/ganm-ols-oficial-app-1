"use client";

import { useEffect } from "react";

const STORAGE_KEY = "ganmols:seller-listing-start-at";
const THROTTLE_MS = 6 * 60 * 60 * 1000;

export default function SellerListingIntentTracker() {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(
      "[data-seller-listing-form='true']"
    );
    if (!form) {
      return;
    }

    let sent = false;

    async function trackStart() {
      if (sent) {
        return;
      }

      const lastTrackedAt = Number.parseInt(
        window.localStorage.getItem(STORAGE_KEY) ?? "",
        10
      );

      if (Number.isFinite(lastTrackedAt) && Date.now() - lastTrackedAt < THROTTLE_MS) {
        sent = true;
        return;
      }

      sent = true;

      try {
        const response = await fetch("/api/notifications/listing-start", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
        }
      } catch {
        sent = false;
      }
    }

    function handleIntent(event: Event) {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (!target) {
        return;
      }
      if (target.type === "file" && !(target as HTMLInputElement).files?.length) {
        return;
      }
      if (target.value.trim() === "" && target.type !== "checkbox") {
        return;
      }
      void trackStart();
    }

    form.addEventListener("input", handleIntent, { passive: true });
    form.addEventListener("change", handleIntent, { passive: true });

    return () => {
      form.removeEventListener("input", handleIntent);
      form.removeEventListener("change", handleIntent);
    };
  }, []);

  return null;
}
