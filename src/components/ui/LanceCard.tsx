import Link from "next/link";

import Badge from "@/components/ui/Badge";
import Price from "@/components/ui/Price";

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
      className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-zinc-400">
        <span>{platformLabel || "GANM OLS"}</span>
        {tag ? <Badge label={tag} /> : null}
      </div>
      <h3 className="mt-4 min-h-[2.2rem] text-sm font-semibold text-zinc-900">
        {title}
      </h3>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
            Lance atual
          </p>
          <Price cents={priceCents} size="md" />
        </div>
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600">
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700">
        Dar lance
      </div>
    </Link>
  );
}
