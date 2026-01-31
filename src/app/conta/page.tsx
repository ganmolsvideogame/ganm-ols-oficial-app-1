import Link from "next/link";

import SignOutButton from "@/components/auth/SignOutButton";
import AddressFields from "@/components/account/AddressFields";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
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

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Minha conta</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Atualize seus dados pessoais, endereco e senha.
        </p>
      </div>

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
            href="/vender"
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

      <form
        action="/api/account/update"
        method="post"
        className="space-y-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
      >

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-zinc-700">
            Nome
            <input
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
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
            Telefone
            <input
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              name="phone"
              defaultValue={profile?.phone ?? ""}
              placeholder="(00) 00000-0000"
            />
          </label>
        </div>

        <AddressFields
          initialAddressLine1={profile?.address_line1 ?? ""}
          initialAddressLine2={profile?.address_line2 ?? ""}
          initialDistrict={profile?.district ?? ""}
          initialCity={profile?.city ?? ""}
          initialState={profile?.state ?? ""}
          initialZipcode={profile?.zipcode ?? ""}
        />

        {isSeller ? (
          <div className="space-y-4">
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
