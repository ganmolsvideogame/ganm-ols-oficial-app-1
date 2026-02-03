import Link from "next/link";
import { formatCentsToBRL } from "@/lib/utils/price";

type LanceCardProps = {
  href: string;
  title: string;
  priceCents: number | null;
  thumbnailUrl?: string | null;
  platformLabel?: string | null;
  statusLabel?: string;
  tag?: string;
};

export default function LanceCard({
  href,
  title,
  priceCents,
  thumbnailUrl,
  platformLabel,
  statusLabel = "Aberto para lances",
  tag,
}: LanceCardProps) {
  return (
    <Link href={href} className="block">
      <div>
        <div className="ml-pimg">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-xs text-zinc-400">Sem imagem</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ml-chip">{platformLabel || "GANM OLS"}</span>
          {tag ? <span className="ml-chip">{tag}</span> : null}
        </div>
        <div className="ml-ptitle">{title}</div>
        <div className="ml-row">Lance atual</div>
        <div className="ml-price">{formatCentsToBRL(priceCents ?? 0)}</div>
        <div className="ml-row-blue">{statusLabel}</div>
        <div className="ml-row">Dar lance</div>
      </div>
    </Link>
  );
}
