"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<{
    code: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    token: string | null;
    type: string | null;
  }>({
    code: null,
    accessToken: null,
    refreshToken: null,
    token: null,
    type: null,
  });

  const readTokens = () => {
    const hashParams =
      typeof window !== "undefined" && window.location.hash
        ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
        : null;
    const code = searchParams.get("code");
    const accessToken =
      searchParams.get("access_token") ?? hashParams?.get("access_token") ?? null;
    const refreshToken =
      searchParams.get("refresh_token") ?? hashParams?.get("refresh_token") ?? null;
    const token = searchParams.get("token") ?? hashParams?.get("token") ?? null;
    const type = searchParams.get("type") ?? hashParams?.get("type") ?? null;

    return { code, accessToken, refreshToken, token, type };
  };

  useEffect(() => {
    const nextTokens = readTokens();
    setTokens(nextTokens);

    if (!nextTokens.code && !nextTokens.accessToken && !nextTokens.token) {
      return;
    }

    const syncSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setError(null);
        return;
      }

      if (nextTokens.code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(nextTokens.code);
        if (exchangeError) {
          setError("Link expirado. Solicite um novo link de recuperacao.");
        }
        return;
      }

      if (nextTokens.token && nextTokens.type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: nextTokens.token,
          type: "recovery",
        });
        if (verifyError) {
          setError("Link expirado. Solicite um novo link de recuperacao.");
        }
        return;
      }

      if (nextTokens.accessToken && nextTokens.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: nextTokens.accessToken,
          refresh_token: nextTokens.refreshToken,
        });
        if (sessionError) {
          setError("Link expirado. Solicite um novo link de recuperacao.");
        }
        return;
      }

      setError("Link expirado. Solicite um novo link de recuperacao.");
    };

    void syncSession();
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
    }
  }, [searchParams, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || password.length < 6) {
      setError("Informe uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    let { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      if (tokens.code) {
        await supabase.auth.exchangeCodeForSession(tokens.code);
      } else if (tokens.accessToken && tokens.refreshToken) {
        await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
      } else if (tokens.token && tokens.type === "recovery") {
        await supabase.auth.verifyOtp({
          token_hash: tokens.token,
          type: "recovery",
        });
      }
      const refreshed = await supabase.auth.getUser();
      userData = refreshed.data;
      userError = refreshed.error;
    }

    if (userError || !userData.user) {
      setError("Sessao expirada. Solicite um novo link de recuperacao.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage("Senha atualizada. Voce ja pode entrar novamente.");
    setError(null);
    setLoading(false);
  };

  return (
    <main className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Nova senha do admin
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Defina uma nova senha para acessar o painel.
        </p>
      </div>
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="max-w-md space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Nova senha
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 6 caracteres"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Confirmar senha
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repita a senha"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
        <Link
          href={ADMIN_PATHS.login}
          className="block text-center text-xs font-semibold text-zinc-500"
        >
          Voltar ao login
        </Link>
      </form>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
