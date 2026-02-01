import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  subtitle?: string | null;
  actionLabel?: string;
  actionHref?: string;
};

export default function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
          {title}
        </p>
        {subtitle ? (
          <h2 className="mt-2 text-lg font-semibold text-zinc-900 md:text-xl">
            {subtitle}
          </h2>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
