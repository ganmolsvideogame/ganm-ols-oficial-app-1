"use client";

import { useRef } from "react";
import Link from "next/link";

const QUICK_LINKS = [
  {
    title: "Meios de pagamento",
    description: "Pague suas compras com rapidez e seguranca.",
    cta: "Ver meios",
    href: "/pagamentos",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <rect x="6" y="10" width="36" height="26" rx="6" className="fill-none stroke-current stroke-[2.5]" />
        <rect x="10" y="18" width="18" height="4" rx="2" className="fill-current" />
        <rect x="10" y="26" width="12" height="3" rx="1.5" className="fill-current opacity-70" />
        <circle cx="34" cy="27" r="4" className="fill-current opacity-80" />
      </svg>
    ),
  },
  {
    title: "Ate R$100",
    description: "Garimpe games e itens baratos.",
    cta: "Ver ofertas",
    href: "/ofertas/ate-100",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <circle cx="24" cy="24" r="14" className="fill-none stroke-current stroke-[2.5]" />
        <path d="M16 24h16" className="fill-none stroke-current stroke-[2.5]" />
        <path d="M22 17h4v14h-4z" className="fill-current" />
        <path d="M30 14v6" className="fill-none stroke-current stroke-[2.5]" />
      </svg>
    ),
  },
  {
    title: "Mais vendidos",
    description: "Os classicos que todo mundo quer.",
    cta: "Explorar",
    href: "/mais-vendidos",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <path
          d="M10 32l8-8 6 6 10-14 4 3-14 19-6-6-8 8z"
          className="fill-current"
        />
        <path d="M8 38h32" className="fill-none stroke-current stroke-[2.5] opacity-70" />
      </svg>
    ),
  },
  {
    title: "Compra protegida",
    description: "Reembolso e suporte quando precisar.",
    cta: "Como funciona",
    href: "/compra-protegida",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <path
          d="M24 8l14 6v10c0 9-6 14-14 18-8-4-14-9-14-18V14z"
          className="fill-none stroke-current stroke-[2.5]"
        />
        <path d="M18 24l4 4 8-8" className="fill-none stroke-current stroke-[3]" />
      </svg>
    ),
  },
  {
    title: "Lojas verificadas",
    description: "Vendedores confiaveis e avaliados.",
    cta: "Ver lojas",
    href: "/lojas",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <path d="M10 20l4-10h20l4 10" className="fill-none stroke-current stroke-[2.5]" />
        <rect x="10" y="20" width="28" height="18" rx="3" className="fill-none stroke-current stroke-[2.5]" />
        <path d="M18 38V26h12v12" className="fill-none stroke-current stroke-[2.5]" />
        <circle cx="30" cy="30" r="2" className="fill-current opacity-80" />
      </svg>
    ),
  },
];

function scrollByAmount(
  scroller: HTMLDivElement | null,
  direction: "prev" | "next"
) {
  if (!scroller) {
    return;
  }
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const amount = scroller.clientWidth * 0.9;
  scroller.scrollBy({
    left: direction === "prev" ? -amount : amount,
    behavior: prefersReduced ? "auto" : "smooth",
  });
}

export default function QuickAccess() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative rounded-3xl border border-zinc-800 bg-[#0A0A0A] px-4 py-6 shadow-[0_22px_55px_rgba(0,0,0,0.45)] md:px-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Acessos rapidos
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Acessos rapidos
          </h2>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollByAmount(scrollerRef.current, "prev")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:border-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden="true">&lt;</span>
          </button>
          <button
            type="button"
            aria-label="Proximo"
            onClick={() => scrollByAmount(scrollerRef.current, "next")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:border-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 md:grid md:grid-cols-5 md:overflow-visible md:pb-0 motion-reduce:scroll-auto"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {QUICK_LINKS.map((item) => (
          <article
            key={item.title}
            className="group relative min-w-[240px] snap-start rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-white shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:border-white/50 hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] md:min-w-0"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-200 group-hover:opacity-100 motion-reduce:transition-none"
              aria-hidden="true"
            >
              <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(transparent_0,rgba(255,255,255,0.06)_50%,transparent_100%)] opacity-10" />
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_55%)] opacity-20" />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/90 font-mono">
                  {item.title}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-zinc-100">
                  {item.icon}
                </div>
                <p className="text-xs text-zinc-300">{item.description}</p>
              </div>
              <Link
                href={item.href}
                className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-3 py-2 text-[11px] font-semibold text-white transition duration-200 hover:border-white hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                {item.cta}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
