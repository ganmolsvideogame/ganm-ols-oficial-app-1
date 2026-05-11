"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SearchableLinkOption = {
  label: string;
  href: string;
  description?: string;
  featured?: boolean;
  searchTerms?: string[];
};

type SearchableLinkListProps = {
  searchPlaceholder: string;
  options: SearchableLinkOption[];
  featuredLabel?: string;
  allLabel?: string;
  promptLabel?: string;
  variant?: "plain" | "card";
  showOptionDescriptions?: boolean;
};

function OptionRow({
  option,
  showDescription,
}: {
  option: SearchableLinkOption;
  showDescription: boolean;
}) {
  return (
    <Link
      href={option.href}
      className="group flex items-center justify-between gap-4 border-b border-zinc-200 py-5 transition hover:bg-zinc-50 last:border-b-0"
    >
      <div>
        <p className="text-xl font-medium tracking-[-0.02em] text-zinc-900">
          {option.label}
        </p>
        {showDescription && option.description ? (
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {option.description}
          </p>
        ) : null}
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 text-zinc-300 transition group-hover:text-zinc-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

export default function SearchableLinkList({
  searchPlaceholder,
  options,
  featuredLabel = "Mais usados",
  allLabel = "Todos",
  promptLabel,
  variant = "plain",
  showOptionDescriptions = false,
}: SearchableLinkListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""} ${(
        option.searchTerms ?? []
      ).join(" ")}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [options, query]);

  const featured = filtered.filter((option) => option.featured);
  const all = filtered.filter((option) => !option.featured);

  const listContainerClassName =
    variant === "card"
      ? "overflow-hidden rounded-[1.9rem] border border-zinc-200 bg-white px-4"
      : "bg-white";

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-8">
      {promptLabel ? (
        <div className="space-y-6">
          <div className="border-t border-zinc-200" />
          <p className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
            {promptLabel}
          </p>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-zinc-300 px-5 py-4">
        <div className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full border-0 p-0 text-xl text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>

      {featured.length > 0 ? (
        <section className="space-y-4">
          {featuredLabel ? (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {featuredLabel}
            </p>
          ) : null}
          <div className={listContainerClassName}>
            {featured.map((option) => (
              <OptionRow
                key={option.href}
                option={option}
                showDescription={showOptionDescriptions}
              />
            ))}
          </div>
        </section>
      ) : null}

      {all.length > 0 ? (
        <section className="space-y-4">
          {allLabel ? (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {allLabel}
            </p>
          ) : null}
          <div className={listContainerClassName}>
            {all.map((option) => (
              <OptionRow
                key={option.href}
                option={option}
                showDescription={showOptionDescriptions}
              />
            ))}
          </div>
        </section>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-[1.8rem] border border-zinc-200 bg-zinc-50 px-5 py-6 text-sm text-zinc-500">
          Nenhuma opcao encontrada. Tente outro termo.
        </div>
      ) : null}
    </div>
  );
}
