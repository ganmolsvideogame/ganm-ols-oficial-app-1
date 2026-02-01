"use client";

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

export default function QuickAccess() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {QUICK_LINKS.map((item) => (
        <article
          key={item.title}
          className="ml-tile flex min-h-[160px] flex-col justify-between p-3"
        >
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
              {item.icon}
            </div>
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs text-zinc-600">{item.description}</p>
          </div>
          <Link href={item.href} className="ml-btn w-full">
            {item.cta}
          </Link>
        </article>
      ))}
    </div>
  );
}
