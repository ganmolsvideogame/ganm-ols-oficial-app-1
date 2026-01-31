"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  label?: string;
  className?: string;
  redirectTo?: string;
};

export default function SignOutButton({
  label = "Sair",
  className,
  redirectTo = "/entrar",
}: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const handleClick = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore client signout errors.
    }
    try {
      await fetch("/auth/signout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = redirectTo;
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {loading ? "Saindo..." : label}
    </button>
  );
}
