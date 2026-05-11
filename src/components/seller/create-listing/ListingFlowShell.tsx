import Link from "next/link";
import type { ReactNode } from "react";
import DedicatedFlowGuard from "@/components/seller/create-listing/DedicatedFlowGuard";

type ListingFlowShellProps = {
  backHref: string;
  topTitle: string;
  title: string;
  description?: string;
  helper?: string;
  children: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  contentAreaClassName?: string;
  innerClassName?: string;
};

export default function ListingFlowShell({
  backHref,
  topTitle,
  title,
  description,
  helper,
  children,
  footer,
  scrollable = false,
  contentAreaClassName,
  innerClassName,
}: ListingFlowShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white md:h-[100dvh] md:overflow-hidden">
      <DedicatedFlowGuard />
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4 sm:px-8">
          <Link
            href={backHref}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-900 transition hover:bg-zinc-50"
            aria-label="Voltar"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <p className="text-base font-medium text-zinc-900">{topTitle}</p>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 ${
          scrollable ? "overflow-y-auto" : "overflow-y-auto md:overflow-hidden"
        } ${
          contentAreaClassName ?? ""
        }`}
      >
        <div
          className={`mx-auto flex min-h-full max-w-3xl flex-col px-5 pt-8 sm:px-8 sm:pt-10 ${
            innerClassName ?? ""
          }`}
        >
          <div className="space-y-4">
            <h1 className="max-w-2xl text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.04em] text-zinc-950 sm:text-5xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg sm:leading-8">
                {description}
              </p>
            ) : null}
            {helper ? (
              <p className="max-w-2xl border-t border-zinc-200 pt-6 text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
                {helper}
              </p>
            ) : null}
          </div>

          <div
            className={`mt-8 ${
              scrollable ? "pb-10" : "pb-8 md:flex-1 md:overflow-hidden md:pb-6"
            }`}
          >
            {children}
          </div>
        </div>
      </div>

      {footer ? (
        <div className="border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-5 py-4 sm:px-8">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}
