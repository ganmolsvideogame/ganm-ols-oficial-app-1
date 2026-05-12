import { CartButton, CepControl, NotificationsBell } from "@/components/header/client";
import AccountSlot from "@/components/header/AccountSlot";

export default function MobileHeader({
  isNativeAndroidApp = false,
}: {
  isNativeAndroidApp?: boolean;
}) {
  return (
    <header
      className={`sticky z-50 w-full border-b border-white/10 bg-zinc-950 text-white shadow-lg md:hidden ${
        isNativeAndroidApp ? "native-app-header top-0" : "top-0"
      }`}
    >
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_34%),linear-gradient(135deg,#050505,#18181b_58%,#0a0a0a)]">
        <div className="flex items-center gap-2 px-4 pb-3 pt-3">
          <AccountSlot avatarOnly dark />
          <form action="/buscar" method="get" className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
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
              className="h-11 w-full rounded-full border border-white/10 bg-white pl-10 pr-4 text-sm font-medium text-zinc-950 shadow-sm outline-none placeholder:text-zinc-500 focus:border-white"
              placeholder="Buscar na GANM OLS"
              name="q"
            />
          </form>
          <div className="flex shrink-0 items-center gap-1.5">
            <NotificationsBell dark />
            <CartButton compact dark />
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 pb-3">
          <CepControl compact dark />
        </div>
      </div>
    </header>
  );
}
