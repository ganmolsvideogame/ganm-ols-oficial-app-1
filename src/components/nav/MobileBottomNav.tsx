"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useCartCount from "@/components/cart/useCartCount";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/categorias", label: "Categorias" },
  { href: "/carrinho", label: "Carrinho", hasBadge: true },
  { href: "/blog", label: "Conteudo" },
  { href: "/conta", label: "Mais" },
];

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  );
}

function NewsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M6.5 5.5h8l3 3V18a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-11a1.5 1.5 0 0 1 1.5-1.5Z"
        strokeLinejoin="round"
      />
      <path d="M9 10h5M9 13.5h5M9 7.5h2.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M4 6h12M4 12h16M4 18h10" strokeLinecap="round" />
      <path d="M18 5v4M16 7h4" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M6 6h15l-1.5 9H7.5L6 3H3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

const icons = [HomeIcon, GridIcon, CartIcon, NewsIcon, MenuIcon];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item, index) => {
          const Icon = icons[index];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold ${
                isActive
                  ? "text-zinc-950"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span
                className={`flex h-7 w-9 items-center justify-center rounded-full ${
                  isActive ? "bg-zinc-950 text-white" : "text-zinc-800"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
              {item.hasBadge && cartCount > 0 ? (
                <span className="absolute right-3 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
