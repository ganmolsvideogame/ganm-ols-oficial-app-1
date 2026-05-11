import type { SupabaseClient } from "@supabase/supabase-js";

type AdminRow = {
  user_id: string | null;
  email: string | null;
};

type ProfileRow = {
  id: string;
};

export async function getAdminUserIds(admin: SupabaseClient) {
  const { data, error } = await admin.from("admins").select("user_id, email");
  if (error) {
    throw error;
  }

  const ids = new Set<string>();
  const emails: string[] = [];

  (data ?? []).forEach((row) => {
    const adminRow = row as AdminRow;
    const userId = String(adminRow.user_id ?? "").trim();
    if (userId) {
      ids.add(userId);
      return;
    }
    const email = String(adminRow.email ?? "").trim();
    if (email) {
      emails.push(email);
    }
  });

  // Fallback for email-only admin entries (admins.user_id is nullable).
  if (emails.length > 0) {
    const results = await Promise.all(
      emails.map((email) =>
        admin
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .maybeSingle()
      )
    );

    results.forEach((result) => {
      const profile = (result.data ?? null) as ProfileRow | null;
      const id = String(profile?.id ?? "").trim();
      if (id) {
        ids.add(id);
      }
    });
  }

  return Array.from(ids);
}

