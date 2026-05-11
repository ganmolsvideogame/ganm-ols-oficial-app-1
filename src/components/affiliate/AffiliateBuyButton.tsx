"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import {
  appendAffiliateClickToken,
  requestAffiliateClickToken,
} from "@/lib/affiliate/click-token-client";
import {
  pushDataLayerEvent,
  queuePendingGaEvent,
  trackGaEvent,
} from "@/lib/analytics/googleAnalytics";
import {
  queuePendingMetaEvent,
  trackMetaEvent,
  trackMetaCustomEvent,
} from "@/lib/analytics/metaPixel";

type AffiliateBuyButtonProps = {
  href: string;
  label: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  partner: string;
  className?: string;
};

export default function AffiliateBuyButton({
  href,
  label,
  slug,
  title,
  brand,
  category,
  partner,
  className,
}: AffiliateBuyButtonProps) {
  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const hrefUrl =
      typeof window !== "undefined" ? new URL(href, window.location.origin) : null;
    const source = hrefUrl?.searchParams.get("source")?.trim() || "";
    const pendingWindow = window.open("", "_blank", "noopener,noreferrer");

    const payload = {
      affiliate_item_id: slug,
      affiliate_item_name: title,
      affiliate_brand: brand,
      affiliate_category: category,
      affiliate_partner: partner,
      content_type: "affiliate_product",
    };
    const metaPayload = {
      affiliate_item_id: slug,
      affiliate_item_name: title,
      affiliate_brand: brand,
      affiliate_category: category,
      affiliate_partner: partner,
      content_type: "affiliate_product",
      destination_url: href,
      button_text: label,
    };

    pushDataLayerEvent("affiliate_click", payload);

    const gaSent = trackGaEvent("affiliate_click", {
      item_id: slug,
      item_name: title,
      item_brand: brand,
      item_category: category,
      partner,
      content_type: "affiliate_product",
    });

    if (!gaSent) {
      queuePendingGaEvent("affiliate_click", {
        item_id: slug,
        item_name: title,
        item_brand: brand,
        item_category: category,
        partner,
        content_type: "affiliate_product",
      });
    }

    const metaInitiateCheckoutSent = trackMetaEvent("InitiateCheckout", {
      content_ids: [`affiliate-${slug}`],
      content_name: title,
      content_type: "product",
      currency: "BRL",
    });

    if (!metaInitiateCheckoutSent) {
      queuePendingMetaEvent("InitiateCheckout", {
        content_ids: [`affiliate-${slug}`],
        content_name: title,
        content_type: "product",
        currency: "BRL",
      });
    }

    const metaSent = trackMetaCustomEvent("AffiliateClick", metaPayload);

    if (!metaSent) {
      queuePendingMetaEvent("AffiliateClick", metaPayload, "trackCustom");
    }

    const token = await requestAffiliateClickToken({
      type: "buy",
      slug,
      source,
    });
    const destination = appendAffiliateClickToken(href, token);

    if (pendingWindow) {
      pendingWindow.location.href = destination;
      return;
    }

    window.location.assign(destination);
  }

  return (
    <Link
      href={href}
      prefetch={false}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {label}
    </Link>
  );
}
