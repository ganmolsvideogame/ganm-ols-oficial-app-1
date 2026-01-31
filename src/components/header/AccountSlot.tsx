import Link from "next/link";

import SignOutButton from "@/components/auth/SignOutButton";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";

type AccountSlotProps = {
  compact?: boolean;
};

export default async function AccountSlot({ compact }: AccountSlotProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/entrar"
        className={`flex items-center justify-center rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 ${
          compact ? "px-2 py-1 text-xs" : ""
        }`}
      >
        Entrar
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: isAdminData } = await supabase.rpc("is_admin");
  const isAdmin = isAdminData === true;

  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";
  const displayName =
    profile?.display_name?.trim() ||
    metadataName.trim() ||
    user.email?.split("@")[0] ||
    "Usuario";

  const isSeller = profile?.role === "seller";

  return (
    <details className="group relative">
      <summary
        className={`cursor-pointer list-none rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 ${
          compact ? "px-2 py-1 text-xs" : ""
        }`}
      >
        <span>{`Ola, ${displayName}`}</span>
      </summary>
      <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-zinc-200 bg-white py-2 text-sm text-zinc-700 shadow-xl">
        <Link
          className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          href="/vender"
        >
          {isSeller ? "Painel do vendedor" : "Quero vender"}
        </Link>
        <Link
          className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          href="/conta"
        >
          Configuracoes da conta
        </Link>
        {isAdmin ? (
          <Link
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            href={ADMIN_PATHS.dashboard}
          >
            Painel administrativo
          </Link>
        ) : null}
        <Link
          className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          href="/compras"
        >
          Compras
        </Link>
        <Link
          className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          href="/favoritos"
        >
          Favoritos
        </Link>
        <SignOutButton
          label="Sair (logoff)"
          className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
        />
      </div>
    </details>
  );
}
