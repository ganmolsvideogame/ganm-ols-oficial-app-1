import Link from "next/link";

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
  return (
    <Link
      href={href}
      className="ml-tile block p-3"
    >
      <div className="ml-pcard">
        <div className="ml-pimg">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-xs text-zinc-400">
              {platformLabel || "Sem foto"}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {badge ? <span className="ml-badge">{badge}</span> : null}
          <span className="ml-badge">{platformLabel || "GANM OLS"}</span>
          {conditionLabel ? (
            <span className="ml-badge">{conditionLabel}</span>
          ) : null}
        </div>
        <div className="ml-ptitle">{title}</div>
        <div className="ml-price">{formatCentsToBRL(priceCents ?? 0)}</div>
        {shippingLabel ? <div className="ml-sub">{shippingLabel}</div> : null}
      </div>
    </Link>
  );
}
