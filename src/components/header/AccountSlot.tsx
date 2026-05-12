import Link from "next/link";

import SignOutButton from "@/components/auth/SignOutButton";
import HeaderDropdown from "@/components/header/HeaderDropdown";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";
import { readStoreProfileData } from "@/lib/store-profile";

type AccountSlotProps = {
  compact?: boolean;
  dark?: boolean;
  avatarOnly?: boolean;
};

function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function readMetadataImage(metadata: Record<string, unknown> | null | undefined) {
  const image =
    metadata?.avatar_url ??
    metadata?.picture ??
    metadata?.photo_url ??
    metadata?.image_url;

  return typeof image === "string" && image.trim() ? image.trim() : null;
}

export default async function AccountSlot({
  compact,
  dark,
  avatarOnly,
}: AccountSlotProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (avatarOnly) {
      return (
        <Link
          href="/entrar"
          aria-label="Entrar na conta"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-white/20"
        >
          <img
            src="/ganmosicon-removebg-preview.png"
            alt="GANM OLS"
            className="h-8 w-8 object-contain"
          />
        </Link>
      );
    }

    return (
      <Link
        href="/entrar"
        className={`flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium ${
          dark
            ? "border-white/20 text-white hover:border-white/40 hover:bg-white/10"
            : "border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
        } ${
          compact ? "px-2 py-1 text-xs" : ""
        }`}
      >
        Entrar
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, store_avatar_path")
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
  const storeProfile = readStoreProfileData(user.user_metadata);
  const storeAvatarPath = profile?.store_avatar_path || storeProfile.storeAvatarPath;
  const storeAvatarUrl = storeAvatarPath
    ? supabase.storage.from("store-images").getPublicUrl(storeAvatarPath).data
        .publicUrl
    : null;
  const avatarUrl = readMetadataImage(user.user_metadata) || storeAvatarUrl;
  const avatarTrigger = (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-black shadow-sm ${
        dark
          ? "border-white/20 bg-white text-zinc-950"
          : "border-zinc-200 bg-zinc-950 text-white"
      }`}
      aria-label={`Conta de ${displayName}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(displayName)
      )}
    </span>
  );

  return (
    <HeaderDropdown
      wrapperClassName="relative"
      panelClassName={`absolute mt-3 w-56 rounded-2xl border border-zinc-200 bg-white py-2 text-sm text-zinc-700 shadow-xl ${
        avatarOnly ? "left-0" : "right-0"
      }`}
      trigger={
        avatarOnly ? (
          avatarTrigger
        ) : (
          <span
            className={`flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium ${
              dark
                ? "border-white/20 text-white hover:border-white/40 hover:bg-white/10"
                : "border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
            } ${
              compact ? "px-2 py-1 text-xs" : ""
            }`}
          >
            {`Ola, ${displayName}`}
          </span>
        )
      }
    >
      <div>
        <Link
          className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          href={isSeller ? "/vender" : "/vender/comece"}
        >
          {isSeller ? "Painel do vendedor" : "Quero vender"}
        </Link>
        {isSeller ? (
          <Link
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            href="/vender/vendas"
          >
            Minhas vendas
          </Link>
        ) : null}
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
    </HeaderDropdown>
  );
}
