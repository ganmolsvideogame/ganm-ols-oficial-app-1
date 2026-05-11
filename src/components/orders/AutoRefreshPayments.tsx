"use client";

import { useEffect, useMemo } from "react";

type AutoRefreshPaymentsProps = {
  orderIds: string[];
};

export default function AutoRefreshPayments({
  orderIds,
}: AutoRefreshPaymentsProps) {
  const normalizedOrderIds = useMemo(
    () =>
      Array.from(new Set(orderIds.filter(Boolean))).slice(0, 12),
    [orderIds]
  );

  useEffect(() => {
    if (!normalizedOrderIds.length) {
      return;
    }

    let active = true;

    const run = async () => {
      for (const orderId of normalizedOrderIds) {
        if (!active) {
          return;
        }
        await fetch(
          `/api/mercadopago/reconcile?order_id=${encodeURIComponent(orderId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        ).catch(() => null);
      }
    };

    void run();

    const interval = window.setInterval(() => {
      void run();
    }, 30000);

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [normalizedOrderIds]);

  return null;
}
