"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type FavoriteButtonProps = {
  listingId: string;
  initialIsFavorite?: boolean;
  className?: string;
  label?: string;
  compact?: boolean;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M12 21s-7-4.6-9.5-9C.6 8.5 2.7 5 6.6 5c2.1 0 3.4 1.1 4.4 2.4C12 6.1 13.3 5 15.4 5 19.3 5 21.4 8.5 21.5 12c-2.5 4.4-9.5 9-9.5 9Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildLoginRedirectHref() {
  if (typeof window === "undefined") {
    return "/entrar";
  }
  const path = window.location.pathname + window.location.search;
  return `/entrar?redirect_to=${encodeURIComponent(path)}`;
}

export default function FavoriteButton({
  listingId,
  initialIsFavorite,
  className,
  label,
  compact,
}: FavoriteButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(Boolean(initialIsFavorite));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user?.id) {
      setIsFavorite(Boolean(initialIsFavorite));
      return;
    }

    const { data, error } = await supabase
      .from("listing_favorites")
      .select("id")
      .eq("listing_id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setIsFavorite(Boolean(initialIsFavorite));
      return;
    }

    setIsFavorite(Boolean(data?.id));
  }, [initialIsFavorite, listingId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    if (busy) {
      return;
    }
    if (!userId) {
      window.location.assign(buildLoginRedirectHref());
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("listing_favorites")
          .delete()
          .eq("listing_id", listingId)
          .eq("user_id", userId);
        if (error) {
          throw error;
        }
        setIsFavorite(false);
      } else {
        const { error } = await supabase.from("listing_favorites").insert({
          listing_id: listingId,
          user_id: userId,
        });
        if (error) {
          if (
            String(error.message ?? "")
              .toLowerCase()
              .includes("duplicate")
          ) {
            setIsFavorite(true);
            return;
          }
          throw error;
        }
        setIsFavorite(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao favoritar.");
    } finally {
      setBusy(false);
    }
  };

  const resolvedLabel =
    label ??
    (isFavorite ? "Favorito" : "Salvar");

  return (
    <div
      className={
        compact
          ? "inline-flex flex-col items-end gap-1"
          : "flex flex-col items-start gap-1"
      }
    >
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          className ??
          `inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
            isFavorite
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
          } disabled:cursor-not-allowed disabled:opacity-60`
        }
        aria-label={resolvedLabel}
        title={resolvedLabel}
      >
        <span className={compact ? "sr-only" : ""}>{resolvedLabel}</span>
        <HeartIcon filled={isFavorite} />
      </button>
      {error ? <span className="text-[11px] text-rose-600">{error}</span> : null}
    </div>
  );
}
