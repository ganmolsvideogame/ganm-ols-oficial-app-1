import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfilePayload = {
  id: string;
  email?: string;
  display_name: string;
  role: "buyer" | "seller";
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type EnsureProfileOverrides = {
  displayName: string;
  role: "buyer" | "seller";
  email: string;
};

export async function ensureProfile(
  supabase: SupabaseClient,
  user: AuthUser,
  overrides: EnsureProfileOverrides
): Promise<string | null> {
  const { data: profile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    return profileLookupError.message;
  }

  if (!profile) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      email: overrides.email,
      display_name: overrides.displayName,
      role: overrides.role,
    });
    return error?.message ?? null;
  }

  const updates: Partial<Pick<ProfilePayload, "display_name" | "role">> = {};
  if (!profile.display_name && overrides.displayName) {
    updates.display_name = overrides.displayName;
  }
  if (overrides.role === "seller" && profile.role !== "seller") {
    updates.role = "seller";
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    return error?.message ?? null;
  }

  return null;
}
