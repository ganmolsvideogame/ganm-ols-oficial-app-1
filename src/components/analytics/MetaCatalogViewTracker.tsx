"use client";

import { useEffect } from "react";

import {
  buildMetaCatalogEventPayload,
  type MetaCatalogEventInput,
} from "@/lib/analytics/metaCatalog";
import {
  queuePendingMetaEvent,
  trackMetaEvent,
} from "@/lib/analytics/metaPixel";

type MetaCatalogViewTrackerProps = MetaCatalogEventInput;

const VIEW_STORAGE_PREFIX = "ganmols:meta-view-content:";

export default function MetaCatalogViewTracker({
  catalogId,
  title,
  priceCents,
  quantity,
  category,
  brand,
}: MetaCatalogViewTrackerProps) {
  useEffect(() => {
    const normalizedCatalogId = String(catalogId ?? "").trim();
    if (!normalizedCatalogId) {
      return;
    }

    const storageKey = `${VIEW_STORAGE_PREFIX}${normalizedCatalogId}`;
    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    const payload = buildMetaCatalogEventPayload({
      catalogId: normalizedCatalogId,
      title,
      priceCents,
      quantity,
      category,
      brand,
    });

    const sent = trackMetaEvent("ViewContent", payload);
    if (!sent) {
      queuePendingMetaEvent("ViewContent", payload);
    }

    window.sessionStorage.setItem(storageKey, "1");
  }, [brand, catalogId, category, priceCents, quantity, title]);

  return null;
}
