"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import {
  AffiliateProduct,
  buildAffiliateProductPath,
} from "@/lib/affiliate/products";
import {
  appendAffiliateClickToken,
  requestAffiliateClickToken,
} from "@/lib/affiliate/click-token-client";
import { getAffiliateDisplayImageUrl } from "@/lib/affiliate/images";
import {
  pushDataLayerEvent,
  queuePendingGaEvent,
  trackGaEvent,
} from "@/lib/analytics/googleAnalytics";
import {
  queuePendingMetaEvent,
  trackMetaCustomEvent,
} from "@/lib/analytics/metaPixel";

type AffiliateProductCardProps = {
  product: AffiliateProduct;
  href?: string;
  trackingContext?: {
    source: "upsell" | "cross_sell" | "compare" | "downsell";
    fromSlug: string;
    fromTitle: string;
  } | null;
};

export default function AffiliateProductCard({
  product,
  href,
  trackingContext,
}: AffiliateProductCardProps) {
  const badgeLabel = product.isWeekOffer
    ? "Oferta"
    : product.homeBadge ?? (product.isFeatured ? "Destaque" : "Parceiro");
  const eyebrow = product.highlightLabel ?? product.partnerLabel;
  const targetHref = href ?? buildAffiliateProductPath(product.slug);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!trackingContext) {
      return;
    }

    event.preventDefault();

    const payload = {
      affiliate_item_id: product.slug,
      affiliate_item_name: product.title,
      affiliate_brand: product.brand,
      affiliate_category: product.categoryLabel,
      affiliate_partner: product.partnerName,
      content_type: "affiliate_product",
      recommendation_source: trackingContext.source,
      recommendation_from_slug: trackingContext.fromSlug,
      recommendation_from_title: trackingContext.fromTitle,
    };

    pushDataLayerEvent("affiliate_recommendation_click", payload);

    const gaSent = trackGaEvent("affiliate_recommendation_click", {
      item_id: product.slug,
      item_name: product.title,
      item_brand: product.brand,
      item_category: product.categoryLabel,
      partner: product.partnerName,
      content_type: "affiliate_product",
      recommendation_source: trackingContext.source,
      recommendation_from_slug: trackingContext.fromSlug,
      recommendation_from_title: trackingContext.fromTitle,
    });

    if (!gaSent) {
      queuePendingGaEvent("affiliate_recommendation_click", {
        item_id: product.slug,
        item_name: product.title,
        item_brand: product.brand,
        item_category: product.categoryLabel,
        partner: product.partnerName,
        content_type: "affiliate_product",
        recommendation_source: trackingContext.source,
        recommendation_from_slug: trackingContext.fromSlug,
        recommendation_from_title: trackingContext.fromTitle,
      });
    }

    const metaPayload = {
      affiliate_item_id: product.slug,
      affiliate_item_name: product.title,
      affiliate_brand: product.brand,
      affiliate_category: product.categoryLabel,
      affiliate_partner: product.partnerName,
      content_type: "affiliate_product",
      recommendation_source: trackingContext.source,
      recommendation_from_slug: trackingContext.fromSlug,
      recommendation_from_title: trackingContext.fromTitle,
      destination_url: targetHref,
    };

    const metaSent = trackMetaCustomEvent(
      "AffiliateRecommendationClick",
      metaPayload
    );

    if (!metaSent) {
      queuePendingMetaEvent(
        "AffiliateRecommendationClick",
        metaPayload,
        "trackCustom"
      );
    }

    const openInNewTab =
      event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1;
    const pendingWindow = openInNewTab
      ? window.open("", "_blank", "noopener,noreferrer")
      : null;
    const token = await requestAffiliateClickToken({
      type: "recommendation",
      slug: product.slug,
      source: trackingContext.source,
      fromSlug: trackingContext.fromSlug,
    });
    const destination = appendAffiliateClickToken(targetHref, token);

    if (openInNewTab) {
      if (pendingWindow) {
        pendingWindow.location.href = destination;
        return;
      }

      window.location.assign(destination);
      return;
    }

    window.location.assign(destination);
  }

  return (
    <Link
      href={targetHref}
      prefetch={false}
      onClick={handleClick}
      className={`group flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        product.isFeatured ? "border-zinc-900/15" : "border-zinc-200"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-50">
        <span className="absolute left-3 top-3 z-10 rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white">
          {badgeLabel}
        </span>
        <img
          src={getAffiliateDisplayImageUrl(product.images[0])}
          alt={product.title}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>

      <div className="mt-3 space-y-2">
        <span className="text-xs text-zinc-500">{eyebrow}</span>
        <h3 className="min-h-[2.5rem] text-sm font-medium leading-5 text-zinc-800">
          {product.title}
        </h3>
        <div className="text-xl font-semibold text-zinc-900">
          R$ {(product.priceCents / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        {product.discountLabel ? (
          <div className="text-xs font-semibold text-emerald-700">
            {product.discountLabel}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span>{product.brand}</span>
          <span>{product.categoryLabel}</span>
        </div>
      </div>
    </Link>
  );
}
