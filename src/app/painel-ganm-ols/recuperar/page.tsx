"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Informe seu email para recuperar a senha.");
      return;
    }

    setLoading(true);
    const callbackUrl = `${window.location.origin}${ADMIN_PATHS.reset}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: callbackUrl }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Se o email estiver cadastrado, enviaremos o link de recuperacao do painel."
    );
    setLoading(false);
  };

  return (
    <main className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Recuperar acesso
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enviaremos um link para redefinir sua senha.
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
          Email
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Enviando..." : "Enviar link"}
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
