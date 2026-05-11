import Link from "next/link";

import { getBlogUiCopy } from "@/lib/blog/copy";
import {
  DEFAULT_BLOG_LOCALE,
  type BlogLocale,
} from "@/lib/blog/locales";

const toneStyles: Record<"dark" | "light" | "warm", string> = {
  dark:
    "border-zinc-900 bg-[linear-gradient(180deg,#18181b,#0f172a)] text-white shadow-[0_20px_60px_rgba(15,23,42,.24)]",
  light: "border-zinc-200 bg-white text-zinc-950 shadow-sm",
  warm:
    "border-zinc-200 bg-[linear-gradient(180deg,#f7f7f8,#ffffff)] text-zinc-950 shadow-[0_18px_50px_rgba(24,24,27,.08)]",
};

type BlogPromoRailProps = {
  locale?: BlogLocale;
};

export default function BlogPromoRail({
  locale = DEFAULT_BLOG_LOCALE,
}: BlogPromoRailProps) {
  const promoCards = getBlogUiCopy(locale).promoRail.cards;

  if (promoCards.length === 0) {
    return null;
  }

  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      {promoCards.map((card) => (
        <article
          key={card.title}
          className={`overflow-hidden rounded-[2rem] border p-5 transition-transform duration-200 hover:-translate-y-1 ${toneStyles[card.tone]}`}
        >
          <div className="space-y-3">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                card.tone === "dark" ? "text-white/58" : "text-zinc-500"
              }`}
            >
              {card.eyebrow}
            </p>
            <h3 className="text-[1.55rem] font-semibold leading-8 tracking-[-0.03em]">
              {card.title}
            </h3>
          </div>

          <p
            className={`mt-4 text-sm leading-7 ${
              card.tone === "dark" ? "text-white/74" : "text-zinc-600"
            }`}
          >
            {card.description}
          </p>

          <Link
            href={card.href}
            className={`mt-5 inline-flex rounded-full px-5 py-3 text-sm font-semibold transition ${
              card.tone === "dark"
                ? "bg-white text-zinc-950 hover:bg-zinc-100"
                : "bg-zinc-950 text-white hover:bg-zinc-800"
            }`}
          >
            {card.cta}
          </Link>
        </article>
      ))}
    </aside>
  );
}
