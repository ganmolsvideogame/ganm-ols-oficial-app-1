import Link from "next/link";

import { formatCentsToBRL } from "@/lib/utils/price";

type LanceCardProps = {
  href: string;
  title: string;
  priceCents: number | null;
  platformLabel?: string | null;
  statusLabel?: string;
  tag?: string;
};

export default function LanceCard({
  href,
  title,
  priceCents,
  platformLabel,
  statusLabel = "Aberto para lances",
  tag,
}: LanceCardProps) {
  return (
    <Link
      href={href}
      className="ml-tile block p-3"
    >
      <div className="ml-pcard">
        <div className="flex flex-wrap items-center gap-2">
          <span className="ml-badge">{platformLabel || "GANM OLS"}</span>
          {tag ? <span className="ml-badge">{tag}</span> : null}
        </div>
        <div className="ml-ptitle">{title}</div>
        <div className="ml-sub">Lance atual</div>
        <div className="ml-price">{formatCentsToBRL(priceCents ?? 0)}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="ml-badge">{statusLabel}</span>
          <span className="ml-badge">Dar lance</span>
        </div>
      </div>
    </Link>
  );
}
