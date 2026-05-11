import Image from "next/image";
import Link from "next/link";

import { FAMILIES } from "@/lib/mock/data";
import { CartButton, CepControl, NotificationsBell } from "@/components/header/client";
import AccountSlot from "@/components/header/AccountSlot";

export default function MobileHeader({
  isNativeAndroidApp = false,
}: {
  isNativeAndroidApp?: boolean;
}) {
  return (
    <header
      className={`sticky z-50 w-full border-b border-white/15 bg-zinc-950 md:hidden ${
        isNativeAndroidApp ? "native-app-header top-0" : "top-0"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex items-center">
          <Image
            src="/logoinvertidalogo.png"
            alt="GANM OLS"
            width={215}
            height={67}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationsBell dark />
          <CartButton compact dark />
        </div>
      </div>
      <div className="px-4 pb-2">
        <form action="/buscar" method="get" className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
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
            className="h-10 w-full rounded-full border border-white/20 bg-zinc-900 pl-10 pr-4 text-sm text-white shadow-sm outline-none placeholder:text-zinc-500 focus:border-white/40"
            placeholder="Buscar console, jogo, edicao..."
            name="q"
          />
        </form>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <CepControl compact dark />
        <AccountSlot compact dark />
      </div>
      <div className="px-4 pb-4">
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {FAMILIES.map((family) => (
              <Link
                key={family.slug}
                href={`/marca/${family.slug}`}
                className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-zinc-200"
              >
                {family.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
