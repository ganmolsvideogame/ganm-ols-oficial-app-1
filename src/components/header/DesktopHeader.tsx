import Image from "next/image";
import Link from "next/link";

import { FAMILIES, SUBCATEGORIES } from "@/lib/mock/data";
import { CartButton, CepControl, NotificationsBell } from "@/components/header/client";
import AccountSlot from "@/components/header/AccountSlot";

const quickLinks = [
  { label: "Categorias", href: "/categorias" },
  { label: "Ofertas", href: "/ofertas" },
  { label: "Lances", href: "/leiloes" },
  { label: "Contato", href: "/contato" },
];

export default function DesktopHeader() {
  return (
    <header className="sticky top-0 z-50 hidden w-full border-b border-zinc-200 bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ganmolslogo.png"
            alt="GANM OLS"
            width={150}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <form
          action="/buscar"
          method="get"
          className="relative flex w-full max-w-[540px] flex-1 items-center"
        >
          <span className="pointer-events-none absolute left-4 text-zinc-400">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            className="h-12 w-full rounded-full border border-zinc-200 bg-white pl-11 pr-28 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
            placeholder="Buscar console, jogo, edicao, condicao..."
            name="q"
          />
          <button
            type="submit"
            className="absolute right-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Buscar
          </button>
        </form>
        <div className="flex items-center gap-3">
          <Link
            href="/leiloes"
            className="relative inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Lances
          </Link>
          <Link
            href="/vender"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            Vender
          </Link>
          <Link
            href="/compras"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            Compras
          </Link>
          <Link
            href="/favoritos"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            Favoritos
          </Link>
          <NotificationsBell />
          <CartButton />
          <AccountSlot />
        </div>
      </div>
      <div className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-4">
            <details className="group relative">
              <summary className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50">
                Categorias
                <svg
                  className="h-4 w-4 text-zinc-500 transition group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className="absolute left-0 top-full mt-4 w-[760px] rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
                <div className="grid grid-cols-3 gap-6">
                  {FAMILIES.map((family) => (
                    <div key={family.slug}>
                      <Link
                        href={`/marca/${family.slug}`}
                        className="text-sm font-semibold text-zinc-900"
                      >
                        {family.name}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500">
                        {family.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(SUBCATEGORIES[family.slug] || []).map((subcategory) => (
                          <Link
                            key={`${family.slug}-${subcategory}`}
                            href={`/buscar?familia=${family.slug}&sub=${encodeURIComponent(
                              subcategory.toLowerCase()
                            )}`}
                            className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                          >
                            {subcategory}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
            <nav className="flex items-center gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              {FAMILIES.slice(0, 6).map((family) => (
                <Link
                  key={family.slug}
                  href={`/marca/${family.slug}`}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                >
                  {family.name}
                </Link>
              ))}
            </div>
          </div>
          <CepControl />
        </div>
      </div>
    </header>
  );
}
