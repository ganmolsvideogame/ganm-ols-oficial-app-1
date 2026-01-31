import Link from "next/link";

import SignOutButton from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AuthSlot() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link className="text-sm font-semibold text-zinc-900" href="/entrar">
        Entrar
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const metadataName = user.user_metadata?.display_name;
  const displayName =
    profile?.display_name ??
    (typeof metadataName === "string" ? metadataName : undefined) ??
    user.email?.split("@")[0] ??
    "Usuario";

  return (
    <div className="relative text-sm">
      <details className="group">
        <summary className="cursor-pointer list-none font-semibold text-zinc-900">
          Ola, {displayName}
        </summary>
        <div className="absolute right-0 mt-2 w-44 rounded-md border border-zinc-200 bg-white py-2 shadow-lg">
          <Link
            className="block px-4 py-2 text-zinc-700 hover:bg-zinc-50"
            href="/compras"
          >
            Compras
          </Link>
          <Link
            className="block px-4 py-2 text-zinc-700 hover:bg-zinc-50"
            href="/favoritos"
          >
            Favoritos
          </Link>
          <Link
            className="block px-4 py-2 text-zinc-700 hover:bg-zinc-50"
            href="/vender"
          >
            Vender
          </Link>
          <SignOutButton
            label="Sair"
            className="w-full px-4 py-2 text-left text-zinc-700 hover:bg-zinc-50"
          />
        </div>
      </details>
    </div>
  );
}
