"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import AffiliateProductCard from "@/components/affiliate/AffiliateProductCard";
import {
  pushDataLayerEvent,
  queuePendingGaEvent,
  trackGaEvent,
} from "@/lib/analytics/googleAnalytics";
import {
  queuePendingMetaEvent,
  trackMetaCustomEvent,
} from "@/lib/analytics/metaPixel";
import {
  buildAffiliateRecommendationPath,
  type AffiliateProduct,
} from "@/lib/affiliate/products";

const STORAGE_PREFIX = "affiliate-downsell";

type AffiliateExitIntentDownsellProps = {
  currentSlug: string;
  currentTitle: string;
  products: AffiliateProduct[];
};

export default function AffiliateExitIntentDownsell({
  currentSlug,
  currentTitle,
  products,
}: AffiliateExitIntentDownsellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLeavingFlow, setIsLeavingFlow] = useState(false);
  const allowNavigationRef = useRef(false);
  const reportedOpenRef = useRef(false);
  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${currentSlug}`, [currentSlug]);

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    const markSeenAndOpen = (leavingFlow: boolean) => {
      if (sessionStorage.getItem(storageKey) === "seen") {
        return;
      }

      sessionStorage.setItem(storageKey, "seen");
      setIsLeavingFlow(leavingFlow);
      setIsOpen(true);
    };
    const historyState = {
      ...(window.history.state ?? {}),
      affiliateDownsell: currentSlug,
    };
    window.history.pushState(historyState, "", window.location.href);

    const handlePopState = () => {
      if (allowNavigationRef.current) {
        return;
      }

      if (sessionStorage.getItem(storageKey) === "seen") {
        allowNavigationRef.current = true;
        window.history.back();
        return;
      }

      markSeenAndOpen(true);
      window.history.pushState(historyState, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [currentSlug, products.length, storageKey]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || reportedOpenRef.current || products.length === 0) {
      return;
    }

    reportedOpenRef.current = true;

    const payload = {
      affiliate_item_id: currentSlug,
      affiliate_item_name: currentTitle,
      content_type: "affiliate_product",
      recommendation_source: "downsell",
      downsell_options: products.map((product) => product.slug),
      downsell_count: products.length,
    };

    pushDataLayerEvent("affiliate_downsell_open", payload);

    const gaSent = trackGaEvent("affiliate_downsell_open", {
      item_id: currentSlug,
      item_name: currentTitle,
      content_type: "affiliate_product",
      recommendation_source: "downsell",
      downsell_count: products.length,
    });

    if (!gaSent) {
      queuePendingGaEvent("affiliate_downsell_open", {
        item_id: currentSlug,
        item_name: currentTitle,
        content_type: "affiliate_product",
        recommendation_source: "downsell",
        downsell_count: products.length,
      });
    }

    const metaSent = trackMetaCustomEvent("AffiliateDownsellOpen", payload);

    if (!metaSent) {
      queuePendingMetaEvent("AffiliateDownsellOpen", payload, "trackCustom");
    }

    void fetch(`/parceiros/${encodeURIComponent(currentSlug)}/downsell`, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentTitle,
        products: products.map((product) => ({
          slug: product.slug,
          title: product.title,
        })),
      }),
    }).catch(() => {
      // Ignore telemetry failures on intent modal open.
    });
  }, [currentSlug, currentTitle, isOpen, products]);

  if (!isOpen || products.length === 0) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
    setIsLeavingFlow(false);
  };

  const handleContinueLeaving = () => {
    allowNavigationRef.current = true;
    setIsOpen(false);

    if (window.history.length > 2) {
      window.history.go(-2);
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/55 md:flex md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 flex flex-col bg-white md:relative md:inset-auto md:max-h-[min(88dvh,920px)] md:w-full md:max-w-4xl md:overflow-hidden md:rounded-[28px] md:shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-4 pb-4 pt-5 md:px-6 md:pb-5 md:pt-6">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Antes de sair
            </p>
            <h2 className="text-lg font-semibold text-zinc-900 md:text-xl">
              Veja algumas opcoes com preco menor
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600 md:leading-7">
            Se voce estiver comparando valores em {currentTitle}, separamos algumas
              alternativas da mesma linha que podem fazer mais sentido para esta compra.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
          >
            Fechar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {products.map((product) => (
              <AffiliateProductCard
                key={product.slug}
                product={product}
                href={buildAffiliateRecommendationPath(
                  product.slug,
                  "downsell",
                  currentSlug
                )}
                trackingContext={{
                  source: "downsell",
                  fromSlug: currentSlug,
                  fromTitle: currentTitle,
                }}
              />
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 md:px-6 md:pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Link
              href="/parceiros"
              className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto"
            >
              Ver mais opcoes
            </Link>
            {isLeavingFlow ? (
              <button
                type="button"
                onClick={handleContinueLeaving}
                className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto"
              >
                Continuar saindo
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
