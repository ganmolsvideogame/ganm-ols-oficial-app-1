import Link from "next/link";

import { normalizeListingHref } from "@/lib/listings/url";
import { formatCentsToBRL } from "@/lib/utils/price";

type ProductCardProps = {
  href: string;
  title: string;
  priceCents: number | null;
  thumbnailUrl: string | null;
  badge?: string;
  platformLabel?: string | null;
  conditionLabel?: string | null;
  shippingLabel?: string | null;
};

export default function ProductCard({
  href,
  title,
  priceCents,
  thumbnailUrl,
  badge,
  platformLabel,
  conditionLabel,
  shippingLabel,
}: ProductCardProps) {
  const resolvedHref = normalizeListingHref(href, title);

  return (
    <Link href={resolvedHref} className="block">
      <div>
        <div className="ml-pimg">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="text-xs text-zinc-400">
              {platformLabel || "Sem foto"}
            </div>
          )}
        </div>
        <div className="ml-ptitle">{title}</div>
        <div className="ml-price">{formatCentsToBRL(priceCents ?? 0)}</div>
        {shippingLabel ? <div className="ml-row-blue">{shippingLabel}</div> : null}
        {badge ? <span className="ml-chip mt-2 inline-flex">{badge}</span> : null}
        {conditionLabel ? <div className="ml-row">{conditionLabel}</div> : null}
      </div>
    </Link>
  );
}
