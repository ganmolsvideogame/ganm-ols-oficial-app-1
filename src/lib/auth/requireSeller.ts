import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireSeller(redirectTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=${encodeURIComponent(redirectTo)}`);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    redirect(`/vender?error=${encodeURIComponent(error.message)}`);
  }

  if (profile?.role !== "seller") {
    redirect("/vender?error=Seu+perfil+ainda+nao+e+vendedor");
  }

  return { supabase, user, profile };
}
