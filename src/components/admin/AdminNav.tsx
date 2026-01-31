"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";

const navItems = [
  { href: ADMIN_PATHS.dashboard, label: "Visao geral" },
  { href: ADMIN_PATHS.live, label: "Ao vivo" },
  { href: ADMIN_PATHS.users, label: "Usuarios" },
  { href: ADMIN_PATHS.listings, label: "Anuncios" },
  { href: ADMIN_PATHS.inventory, label: "Estoque" },
  { href: ADMIN_PATHS.orders, label: "Pedidos" },
  { href: ADMIN_PATHS.payments, label: "Pagamentos" },
  { href: ADMIN_PATHS.plans, label: "Planos" },
  { href: ADMIN_PATHS.coupons, label: "Cupons" },
  { href: ADMIN_PATHS.auctions, label: "Lances" },
  { href: ADMIN_PATHS.content, label: "Conteudo" },
  { href: ADMIN_PATHS.reports, label: "Relatorios" },
  { href: ADMIN_PATHS.settings, label: "Configuracoes" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium ${
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
