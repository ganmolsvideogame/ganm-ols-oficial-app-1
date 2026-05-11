"use client";

import { useEffect } from "react";

import {
  queuePendingGaEvent,
  trackGaEvent,
} from "@/lib/analytics/googleAnalytics";

type CheckoutFinalizadoTrackerProps = {
  status: "approved" | "pending" | "rejected";
  orderId: string;
};

const TRACKED_PURCHASE_PREFIX = "ganmols_ga_purchase_tracked:";

export default function CheckoutFinalizadoTracker({
  status,
  orderId,
}: CheckoutFinalizadoTrackerProps) {
  useEffect(() => {
    if (status !== "approved") {
      return;
    }

    const eventId = `${TRACKED_PURCHASE_PREFIX}${orderId || "no-order-id"}`;
    if (window.sessionStorage.getItem(eventId)) {
      return;
    }

    const payload: Record<string, unknown> = {
      currency: "BRL",
    };
    if (orderId) {
      payload.transaction_id = orderId;
    }

    const sent = trackGaEvent("purchase", payload);
    if (!sent) {
      queuePendingGaEvent("purchase", payload);
    }

    window.sessionStorage.setItem(eventId, "1");
  }, [orderId, status]);

  return null;
}

