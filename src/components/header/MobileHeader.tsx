import Image from "next/image";
import Link from "next/link";

import { FAMILIES } from "@/lib/mock/data";
import { CartButton, CepControl, NotificationsBell } from "@/components/header/client";
import AccountSlot from "@/components/header/AccountSlot";

export default function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/ganmolslogo.png"
            alt="GANM OLS"
            width={130}
            height={36}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <CartButton compact />
        </div>
      </div>
      <div className="px-4 pb-3">
        <form action="/buscar" method="get" className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
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
            className="h-11 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400"
            placeholder="Buscar console, jogo, edicao..."
            name="q"
          />
        </form>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <CepControl compact />
        <AccountSlot compact />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-4">
        {FAMILIES.map((family) => (
          <Link
            key={family.slug}
            href={`/marca/${family.slug}`}
            className="whitespace-nowrap rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600"
          >
            {family.name}
          </Link>
        ))}
      </div>
    </header>
  );
}
