"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type FollowSellerButtonProps = {
  sellerUserId: string;
  initialCount?: number;
  className?: string;
};

function buildLoginRedirectHref() {
  if (typeof window === "undefined") {
    return "/entrar";
  }
  const path = window.location.pathname + window.location.search;
  return `/entrar?redirect_to=${encodeURIComponent(path)}`;
}

export default function FollowSellerButton({
  sellerUserId,
  initialCount = 0,
  className,
}: FollowSellerButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    if (!user?.id) {
      setIsFollowing(false);
      return;
    }

    if (user.id === sellerUserId) {
      setIsFollowing(false);
      return;
    }

    const { data, error: followError } = await supabase
      .from("seller_follows")
      .select("id")
      .eq("seller_user_id", sellerUserId)
      .eq("follower_user_id", user.id)
      .maybeSingle();

    if (followError) {
      // Table might not exist yet (migration not pushed). Degrade gracefully.
      setError("");
      setIsFollowing(false);
      return;
    }

    setIsFollowing(Boolean(data?.id));
  }, [sellerUserId, supabase]);

  useEffect(() => {
    setIsFollowing(null);
    void load();
  }, [load]);

  const toggleFollow = async () => {
    if (busy) {
      return;
    }
    setError("");

    if (!userId) {
      window.location.assign(buildLoginRedirectHref());
      return;
    }

    if (userId === sellerUserId) {
      return;
    }

    setBusy(true);
    try {
      if (isFollowing) {
        const { error: delError } = await supabase
          .from("seller_follows")
          .delete()
          .eq("seller_user_id", sellerUserId)
          .eq("follower_user_id", userId);
        if (delError) {
          throw delError;
        }
        setIsFollowing(false);
        setCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error: insError } = await supabase.from("seller_follows").insert({
          seller_user_id: sellerUserId,
          follower_user_id: userId,
        });
        if (insError) {
          // Unique constraint can race; treat as followed.
          if (
            String(insError.message ?? "")
              .toLowerCase()
              .includes("duplicate")
          ) {
            setIsFollowing(true);
            return;
          }
          throw insError;
        }
        setIsFollowing(true);
        setCount((prev) => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setBusy(false);
    }
  };

  const label =
    userId && userId === sellerUserId
      ? "Sua loja"
      : isFollowing
        ? "Seguindo"
        : "Seguir";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggleFollow}
        disabled={busy || isFollowing === null || (userId ? userId === sellerUserId : false)}
        className={
          className ??
          `inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold ${
            isFollowing
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
          } disabled:cursor-not-allowed disabled:opacity-60`
        }
      >
        {busy ? "Aguarde..." : label}
      </button>
      <div className="text-xs text-zinc-500">
        {count} seguidor{count === 1 ? "" : "es"}
      </div>
      {error ? <div className="text-xs text-rose-600">{error}</div> : null}
    </div>
  );
}

