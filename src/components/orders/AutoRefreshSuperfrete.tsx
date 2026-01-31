"use client";

import { useEffect } from "react";

type AutoRefreshSuperfreteProps = {
  orderIds: string[];
};

export default function AutoRefreshSuperfrete({
  orderIds,
}: AutoRefreshSuperfreteProps) {
  useEffect(() => {
    if (!orderIds || orderIds.length === 0) {
      return;
    }
    void fetch("/api/superfrete/refresh-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: orderIds }),
    }).catch(() => null);
  }, [orderIds]);

  return null;
}
