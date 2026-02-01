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
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
          {title}
        </p>
        {subtitle ? (
          <h2 className="mt-2 g-h2 text-white">
            {subtitle}
          </h2>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="g-btn px-5 py-3 text-sm font-semibold"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
