import Link from "next/link";

import { formatCentsToBRL } from "@/lib/utils/price";

type ListingCardProps = {
  href: string;
  title: string;
  priceCents: number | null;
  thumbnailUrl: string | null;
  platformFallback?: string | null;
  condition?: string | null;
  shippingAvailable?: boolean | null;
  freeShipping?: boolean | null;
  familyLabel?: string | null;
  tag?: string;
};

function formatCondition(value: string | null | undefined) {
  if (!value) {
    return "Sem condicao";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatShipping(isAvailable: boolean | null | undefined, isFree: boolean | null | undefined) {
  if (isFree) {
    return "Frete gratis";
  }
  return isAvailable === false ? "Envio a combinar" : "Envio disponivel";
}

export default function ListingCard({
  href,
  title,
  priceCents,
  thumbnailUrl,
  platformFallback,
  condition,
  shippingAvailable,
  freeShipping,
  familyLabel,
  tag,
}: ListingCardProps) {
  const shippingLabel = formatShipping(shippingAvailable, freeShipping);
  const shippingClass = freeShipping ? "text-emerald-600" : "text-zinc-500";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-50">
        {tag ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white">
            {tag}
          </span>
        ) : null}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            {platformFallback || "Sem foto"}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {familyLabel ? (
          <span className="text-xs text-zinc-500">{familyLabel}</span>
        ) : null}
        <h3 className="min-h-[2.5rem] text-sm font-medium leading-5 text-zinc-800">
          {title}
        </h3>
        <div className="text-xl font-semibold text-zinc-900">
          {formatCentsToBRL(priceCents ?? 0)}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span>{formatCondition(condition)}</span>
          <span className={shippingClass}>{shippingLabel}</span>
        </div>
      </div>
    </Link>
  );
}
