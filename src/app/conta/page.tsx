import Link from "next/link";

import SignOutButton from "@/components/auth/SignOutButton";
import AddressFields from "@/components/account/AddressFields";
import BrowserNotificationSettings from "@/components/account/BrowserNotificationSettings";
import ImageUploadField from "@/components/listings/ImageUploadField";
import PostSignupNotificationsPrompt from "@/components/notifications/PostSignupNotificationsPrompt";
import SellerBroadcastChannelCard from "@/components/seller/SellerBroadcastChannelCard";
import { ADMIN_PATHS } from "@/lib/config/admin";
import {
  getBrowserPushPreference,
} from "@/lib/push/server";
import { createClient } from "@/lib/supabase/server";
import { readStoreProfileData } from "@/lib/store-profile";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
  onboarding?: string;
  return_to?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Minha conta</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Entre para editar seu perfil e endereco.
          </p>
        </div>
        <Link
          href="/entrar"
          className="inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Entrar na conta
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, phone, address_line1, address_line2, district, city, state, zipcode, role, payout_method, payout_pix_key, payout_bank_name, payout_bank_agency, payout_bank_account, payout_bank_account_type, payout_doc, payout_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: isAdminData } = await supabase.rpc("is_admin");
  const isAdmin = isAdminData === true;
  const isSeller = profile?.role === "seller";
  const returnToRaw = String(resolvedSearchParams?.return_to ?? "").trim();
  const returnTo =
    returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : null;
  const storeProfile = readStoreProfileData(user.user_metadata);
  const pushPreference = await getBrowserPushPreference(user.id);
  const displayName =
    profile?.display_name?.trim() ||
    (typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "");
  const storeAvatarUrl = storeProfile.storeAvatarPath
    ? supabase.storage.from("store-images").getPublicUrl(storeProfile.storeAvatarPath)
        .data.publicUrl
    : null;
  const storeBannerUrl = storeProfile.storeBannerPath
    ? supabase.storage.from("store-images").getPublicUrl(storeProfile.storeBannerPath)
        .data.publicUrl
    : null;

  return (
    <div className="space-y-8">
      <PostSignupNotificationsPrompt
        role={isSeller ? "seller" : "buyer"}
        initiallyEnabled={pushPreference?.enabled === true}
      />
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Minha conta</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Atualize seus dados pessoais, endereco e senha.
        </p>
      </div>

      {isSeller && resolvedSearchParams?.onboarding === "seller" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          Sua conta de vendedor ja entrou no ar. Monte o primeiro anuncio e, na etapa de publicar, complete seus dados para liberar a publicacao.
        </div>
      ) : null}

      {isSeller && returnTo ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
          Complete seus dados obrigatorios e salve. Depois disso, voce volta direto para concluir a publicacao do anuncio.
        </div>
      ) : null}

      {resolvedSearchParams?.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {resolvedSearchParams.error}
        </div>
      ) : null}
      {resolvedSearchParams?.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {resolvedSearchParams.success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {isSeller ? (
          <Link
            href="/vender"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Painel do vendedor
          </Link>
        ) : (
          <Link
            href="/vender/comece"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Quero vender
          </Link>
        )}
        {isAdmin ? (
          <Link
            href={ADMIN_PATHS.dashboard}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Painel administrativo
          </Link>
        ) : null}
        <SignOutButton
          label="Sair"
          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
        />
      </div>

      {isSeller ? (
        <SellerBroadcastChannelCard
          compact
          description="Entre no canal para acompanhar avisos, oportunidades e novidades voltadas para vendedores da GANM OLS."
        />
      ) : null}

      <form
        action="/api/account/update"
        method="post"
        encType="multipart/form-data"
        className="space-y-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-zinc-700">
            Nome
            <input
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              name="display_name"
              defaultValue={displayName}
              placeholder="Seu nome"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-700">
            Email
            <input
              className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500"
              value={user.email ?? ""}
              readOnly
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-700">
            WhatsApp
            <input
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              name="phone"
              defaultValue={profile?.phone ?? ""}
              placeholder="(00) 00000-0000"
            />
          </label>
        </div>

        <div id="dados-vendedor">
          <AddressFields
            initialAddressLine1={profile?.address_line1 ?? ""}
            initialAddressLine2={profile?.address_line2 ?? ""}
            initialDistrict={profile?.district ?? ""}
            initialCity={profile?.city ?? ""}
            initialState={profile?.state ?? ""}
            initialZipcode={profile?.zipcode ?? ""}
            required={isSeller}
          />
        </div>

        <BrowserNotificationSettings
          initialEnabled={pushPreference?.enabled === true}
          initialUpdatedAt={pushPreference?.updatedAt ?? null}
        />

        {isSeller ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Para publicar anuncios, vendedor precisa manter endereco completo e CEP preenchidos.
            </div>
            <div className="space-y-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Loja publica</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Personalize sua vitrine com banner, logo e descricao.
                </p>
              </div>

              <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
                <div className="relative h-40 w-full bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-700">
                  {storeBannerUrl ? (
                    <img
                      src={storeBannerUrl}
                      alt="Banner da loja"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="h-20 w-20 overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100">
                    {storeAvatarUrl ? (
                      <img
                        src={storeAvatarUrl}
                        alt="Logo da loja"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-zinc-500">
                        {(displayName.charAt(0) || "L").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-lg font-semibold text-zinc-900">
                      {displayName || "Minha loja"}
                    </p>
                    <p className="mt-1 break-words text-sm text-zinc-600">
                      {storeProfile.storeBio?.trim() ||
                        "Adicione uma descricao para apresentar sua loja aos compradores."}
                    </p>
                  </div>
                  <Link
                    href={`/lojas/${user.id}`}
                    className="h-fit rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                  >
                    Ver minha loja
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ImageUploadField
                  name="store_avatar_image"
                  label="Logo da loja"
                  helperText="Imagem quadrada para aparecer na sua vitrine."
                  multiple={false}
                />
                <ImageUploadField
                  name="store_banner_image"
                  label="Banner da loja"
                  helperText="Imagem horizontal para o topo da pagina da sua loja."
                  multiple={false}
                />
              </div>

              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Descricao da loja
                <textarea
                  className="min-h-[120px] rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="store_bio"
                  defaultValue={storeProfile.storeBio ?? ""}
                  placeholder="Conte o que voce vende, seu foco e o que diferencia sua loja."
                />
              </label>
            </div>

            <p className="text-sm font-semibold text-zinc-900">Recebimento</p>
            <p className="text-xs text-zinc-500">
              Configure onde voce deseja receber seus repasses.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Metodo
                <select
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
                  name="payout_method"
                  defaultValue={profile?.payout_method ?? "pix"}
                >
                  <option value="pix">Pix</option>
                  <option value="bank">Conta bancaria</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Nome do recebedor
                <input
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="payout_name"
                  defaultValue={profile?.payout_name ?? ""}
                  placeholder="Nome completo"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                CPF/CNPJ
                <input
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="payout_doc"
                  defaultValue={profile?.payout_doc ?? ""}
                  placeholder="Documento do recebedor"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Chave Pix
                <input
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="payout_pix_key"
                  defaultValue={profile?.payout_pix_key ?? ""}
                  placeholder="CPF, email ou aleatoria"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Banco
                <input
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="payout_bank_name"
                  defaultValue={profile?.payout_bank_name ?? ""}
                  placeholder="Nome do banco"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Agencia
                <input
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="payout_bank_agency"
                  defaultValue={profile?.payout_bank_agency ?? ""}
                  placeholder="0001"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Conta
                <input
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="payout_bank_account"
                  defaultValue={profile?.payout_bank_account ?? ""}
                  placeholder="000000-0"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                Tipo de conta
                <input
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="payout_bank_account_type"
                  defaultValue={profile?.payout_bank_account_type ?? ""}
                  placeholder="Corrente ou poupanca"
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <p className="text-sm font-semibold text-zinc-900">Senha</p>
          <p className="text-xs text-zinc-500">
            Por seguranca, a senha atual nao pode ser exibida. Informe uma nova
            senha para alterar.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-zinc-700">
              Nova senha
              <input
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                type="password"
                name="password"
                placeholder="Minimo 6 caracteres"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-700">
              Confirmar senha
              <input
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                type="password"
                name="password_confirm"
                placeholder="Repita a senha"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Salvar alteracoes
        </button>
      </form>
    </div>
  );
}
