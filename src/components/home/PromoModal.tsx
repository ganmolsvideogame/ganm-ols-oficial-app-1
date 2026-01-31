"use client";

import { useEffect, useState } from "react";

type PromoModalProps = {
  id: string;
  imageUrl: string;
  href?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  secondaryLabel?: string | null;
  showButtons?: boolean;
};

const STORAGE_PREFIX = "promo-modal";
const FIRST_VISIT_DELAY_MS = 5000;
const RETURN_DELAY_MS = 15000;
const DISMISS_COOLDOWN_MS = 5 * 60 * 1000;

export default function PromoModal({
  id,
  imageUrl,
  href,
  title,
  subtitle,
  ctaLabel,
  secondaryLabel,
  showButtons = true,
}: PromoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    const storageKey = `${STORAGE_PREFIX}:${id}`;
    const raw = localStorage.getItem(storageKey);
    let dismissCount = 0;
    let lastDismissedAt = 0;
    let lastSeenAt = 0;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          dismissCount?: number;
          lastDismissedAt?: number;
          lastSeenAt?: number;
        };
        dismissCount = parsed.dismissCount ?? 0;
        lastDismissedAt = parsed.lastDismissedAt ?? 0;
        lastSeenAt = parsed.lastSeenAt ?? 0;
      } catch {
        dismissCount = 0;
        lastDismissedAt = 0;
        lastSeenAt = 0;
      }
    }

    const now = Date.now();
    const cooldownMs = dismissCount * DISMISS_COOLDOWN_MS;
    if (cooldownMs > 0 && now - lastDismissedAt < cooldownMs) {
      return;
    }

    const delayMs = lastSeenAt > 0 ? RETURN_DELAY_MS : FIRST_VISIT_DELAY_MS;
    const timer = window.setTimeout(() => {
      const nextPayload = {
        dismissCount,
        lastDismissedAt,
        lastSeenAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(nextPayload));
      setIsOpen(true);
      setIsReady(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [id]);

  if (!isOpen || !isReady) {
    return null;
  }

  const handleClose = () => {
    const storageKey = `${STORAGE_PREFIX}:${id}`;
    const raw = localStorage.getItem(storageKey);
    let dismissCount = 0;
    let lastSeenAt = 0;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          dismissCount?: number;
          lastSeenAt?: number;
        };
        dismissCount = parsed.dismissCount ?? 0;
        lastSeenAt = parsed.lastSeenAt ?? 0;
      } catch {
        dismissCount = 0;
        lastSeenAt = 0;
      }
    }

    const nextPayload = {
      dismissCount: dismissCount + 1,
      lastDismissedAt: Date.now(),
      lastSeenAt,
    };
    localStorage.setItem(storageKey, JSON.stringify(nextPayload));
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative h-[90vh] w-[90vw] max-w-5xl overflow-hidden bg-transparent">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar banner"
          className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:bg-white/20"
        >
          X
        </button>
        <img
          src={imageUrl}
          alt={title || "Banner promocional"}
          className="h-full w-full object-contain"
          loading="lazy"
        />
        {showButtons ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/85 px-6 py-4 md:px-12">
            <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href={href || "#"}
              aria-disabled={!href}
              className={`min-w-[200px] rounded-full px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide shadow-lg transition ${
                href
                  ? "bg-white text-zinc-900 shadow-white/20 hover:bg-zinc-100"
                  : "cursor-not-allowed bg-zinc-200 text-zinc-500 shadow-none"
              }`}
            >
              {ctaLabel || "Aceitar oferta"}
            </a>
            <button
              type="button"
              onClick={handleClose}
              className="min-w-[180px] rounded-full border border-white/20 bg-transparent px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:text-white"
            >
              {secondaryLabel || "Em outro momento"}
            </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
