"use client";

import { useEffect, useState } from "react";

import type { BlogLocale } from "@/lib/blog/locales";

type ShareBlogArticleButtonProps = {
  title: string;
  url: string;
  locale: BlogLocale;
};

const copy = {
  pt: {
    cta: "Compartilhar artigo",
    copied: "Link copiado.",
    unavailable: "Compartilhamento indisponível.",
    failed: "Não foi possível compartilhar.",
  },
  en: {
    cta: "Share article",
    copied: "Link copied.",
    unavailable: "Sharing unavailable.",
    failed: "Could not share this article.",
  },
} as const;

export default function ShareBlogArticleButton({
  title,
  url,
  locale,
}: ShareBlogArticleButtonProps) {
  const text = copy[locale];
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  const handleClick = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: title,
          url,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage(text.copied);
        return;
      }

      setMessage(text.unavailable);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage(text.failed);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
      >
        {text.cta}
      </button>
      {message ? <span className="text-xs text-zinc-500">{message}</span> : null}
    </div>
  );
}
