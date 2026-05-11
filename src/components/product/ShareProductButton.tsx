"use client";

import { useEffect, useState } from "react";

type ShareProductButtonProps = {
  title: string;
  url: string;
};

export default function ShareProductButton({
  title,
  url,
}: ShareProductButtonProps) {
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
        setMessage("Link copiado.");
        return;
      }

      setMessage("Compartilhamento indisponivel.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage("Nao foi possivel compartilhar.");
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
      >
        Compartilhar link
      </button>
      {message ? <span className="text-xs text-zinc-500">{message}</span> : null}
    </div>
  );
}
