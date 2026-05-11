"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { getBlogUiCopy } from "@/lib/blog/copy";
import {
  buildBlogIndexPath,
  getBlogLocaleFromPathname,
  type BlogLocale,
} from "@/lib/blog/locales";
import { getLocalizedBlogPathFromPathname } from "@/lib/blog/posts";

type NavItem = {
  label: string;
  href: string;
  match: string[];
  icon: ReactNode;
};

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 11.5 12 4l8.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5v8h11v-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4.5h7l3 3v12H7z" strokeLinejoin="round" />
      <path d="M10 12h5M10 15.5h5M10 8.5h2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 2.5 5.5 6 .5-4.5 3.9 1.3 5.8L12 15.7 6.7 18.7 8 12.9 3.5 9l6-.5L12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconController() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8.5 8h7a5 5 0 0 1 4.8 6.4l-1 3.1a2.2 2.2 0 0 1-4 .4L13.7 15h-3.4l-1.6 2.9a2.2 2.2 0 0 1-4-.4l-1-3.1A5 5 0 0 1 8.5 8Z" strokeLinejoin="round" />
      <path d="M8.2 11.2v3.2M6.6 12.8h3.2M15.5 11.8h.01M17.4 13.6h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconSwitch() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="5" width="6.5" height="14" rx="2.2" />
      <rect x="13" y="5" width="6.5" height="14" rx="2.2" />
      <circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconXbox() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 8 4 4 4-4M8 16l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRetro() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 9.5h15v9h-15z" strokeLinejoin="round" />
      <path d="M8 6.5h8" strokeLinecap="round" />
      <path d="M8 14h2.8M9.4 12.6v2.8M15.6 13.2h.01M17.3 14.8h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconChip() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 3.5v3M15 3.5v3M9 17.5v3M15 17.5v3M3.5 9h3M3.5 15h3M17.5 9h3M17.5 15h3" strokeLinecap="round" />
    </svg>
  );
}

function buildNavItems(locale: BlogLocale, newsLabel: string, reviewsLabel: string): NavItem[] {
  const blogHref = buildBlogIndexPath(locale);

  return [
    { label: locale === "en" ? "Home" : "Inicio", href: "/", match: ["/"], icon: <IconHome /> },
    { label: newsLabel, href: blogHref, match: [blogHref], icon: <IconDoc /> },
    { label: reviewsLabel, href: blogHref, match: [blogHref], icon: <IconStar /> },
    { label: "PlayStation", href: "/marca/playstation", match: ["/marca/playstation"], icon: <IconController /> },
    { label: "Nintendo", href: "/marca/nintendo", match: ["/marca/nintendo"], icon: <IconSwitch /> },
    { label: "Xbox", href: "/marca/xbox", match: ["/marca/xbox"], icon: <IconXbox /> },
    { label: "Retro", href: "/marca/atari", match: ["/marca/atari", "/marca/sega"], icon: <IconRetro /> },
    { label: "Tech", href: "/marca/pc", match: ["/marca/pc"], icon: <IconChip /> },
  ];
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const locale = getBlogLocaleFromPathname(pathname);
  const copy = getBlogUiCopy(locale);
  const navItems = useMemo(
    () => buildNavItems(locale, copy.sidebar.newsLabel, copy.sidebar.reviewsLabel),
    [copy.sidebar.newsLabel, copy.sidebar.reviewsLabel, locale]
  );
  const activeMap = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        active:
          item.href === "/"
            ? pathname === "/"
            : item.match.some((match) => pathname.startsWith(match)),
      })),
    [navItems, pathname]
  );
  const ptHref = getLocalizedBlogPathFromPathname(pathname, "pt");
  const enHref = getLocalizedBlogPathFromPathname(pathname, "en");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-5 py-5">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <Image
            src="/ganmolslogo.png"
            alt="GANM OLS"
            width={190}
            height={52}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {activeMap.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
              item.active
                ? "bg-zinc-100 text-zinc-950 shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
          >
            <span className={item.active ? "text-zinc-950" : "text-zinc-400 group-hover:text-zinc-700"}>
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="space-y-4 border-t border-zinc-200 px-5 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {copy.sidebar.languageLabel}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href={ptHref}
              onClick={onNavigate}
              className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
                locale === "pt"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              PT-BR
            </Link>
            <Link
              href={enHref}
              onClick={onNavigate}
              className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
                locale === "en"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              EN
            </Link>
          </div>
        </div>

        <div className={`grid gap-3 ${locale === "en" ? "grid-cols-1" : "grid-cols-2"}`}>
          <Link
            href="/conta"
            onClick={onNavigate}
            className="rounded-full border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          >
            {copy.sidebar.signInLabel}
          </Link>
          {locale === "pt" ? (
            <Link
              href="/vender/comece"
              onClick={onNavigate}
              className="rounded-full bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {copy.sidebar.sellLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function BlogSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const locale = getBlogLocaleFromPathname(pathname);

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/92 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/ganmolslogo.png"
              alt="GANM OLS"
              width={180}
              height={48}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {locale === "en" ? "Menu" : "Menu"}
          </button>
        </div>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-zinc-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label={locale === "en" ? "Close menu" : "Fechar menu"}
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-[86vw] max-w-[320px] bg-white shadow-[0_24px_80px_rgba(0,0,0,.22)]">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
