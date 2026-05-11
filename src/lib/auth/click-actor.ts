import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type RouteAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type ClickActor = {
  label: string;
  email: string | null;
  userId: string | null;
  isAuthenticated: boolean;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function resolveClickActor(
  supabase: SupabaseClient,
  user: RouteAuthUser | null | undefined
): Promise<ClickActor> {
  if (!user?.id) {
    return {
      label: "Visitante",
      email: null,
      userId: null,
      isAuthenticated: false,
    };
  }

  let profileDisplayName = "";
  let profileEmail = "";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();

    profileDisplayName = readString(profile?.display_name);
    profileEmail = readString(profile?.email);
  } catch {
    // Ignore profile lookup failures and fall back to auth data.
  }

  const metadata = user.user_metadata ?? {};
  const fallbackDisplayName =
    readString(metadata.display_name) ||
    readString(metadata.name) ||
    readString(metadata.full_name);
  const email = profileEmail || readString(user.email) || null;
  const label = profileDisplayName || fallbackDisplayName || email || "Conta sem nome";

  return {
    label,
    email,
    userId: user.id,
    isAuthenticated: true,
  };
}
