"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  flushPendingMetaEvent,
  isMetaPixelEnabled,
  trackMetaEvent,
} from "@/lib/analytics/metaPixel";
import { flushPendingGaEvent } from "@/lib/analytics/googleAnalytics";

export default function MetaPixel() {
  const pathname = usePathname();
  const enabled = isMetaPixelEnabled();
  const hasTrackedInitialPageViewRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // First page view is fired by the base snippet in layout.
    if (!hasTrackedInitialPageViewRef.current) {
      hasTrackedInitialPageViewRef.current = true;
      return;
    }

    // Track SPA navigations.
    trackMetaEvent("PageView");
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    flushPendingMetaEvent();
  }, [enabled]);

  useEffect(() => {
    flushPendingGaEvent();
  }, [pathname]);

  if (!enabled) {
    return null;
  }

  return null;
}
