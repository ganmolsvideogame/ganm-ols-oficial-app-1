import Link from "next/link";

import Badge from "@/components/ui/Badge";
import Price from "@/components/ui/Price";

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
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-50">
        {badge ? (
          <div className="absolute left-3 top-3 z-10">
            <Badge label={badge} variant="solid" />
          </div>
        ) : null}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            {platformLabel || "Sem foto"}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-zinc-400">
          <span>{platformLabel || "GANM OLS"}</span>
          {conditionLabel ? <span>{conditionLabel}</span> : null}
        </div>
        <h3 className="min-h-[2.5rem] text-sm font-semibold text-zinc-900">
          {title}
        </h3>
        <div className="flex items-end justify-between gap-3">
          <Price cents={priceCents} size="md" />
          {shippingLabel ? (
            <span className="text-xs text-zinc-500">{shippingLabel}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
