"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconArticle,
  IconCategory,
  IconHome,
  IconMenu2,
  IconShoppingCart,
} from "@tabler/icons-react";
import useCartCount from "@/components/cart/useCartCount";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/categorias", label: "Categorias" },
  { href: "/carrinho", label: "Carrinho", hasBadge: true },
  { href: "/blog", label: "Conteudo" },
  { href: "/conta", label: "Mais" },
];

const icons = [IconHome, IconCategory, IconShoppingCart, IconArticle, IconMenu2];

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
                <Icon className="h-5 w-5" stroke={1.8} />
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
