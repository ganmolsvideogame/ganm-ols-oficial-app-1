"use client";

import { useMemo, useState } from "react";

import { ensureProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/client";

type SignInFormProps = {
  redirectTo?: string;
  initialError?: string | null;
  initialMessage?: string | null;
};

type SignUpFormProps = {
  redirectTo?: string;
};

function mapAuthError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "Email ou senha invalidos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Confirme seu email para entrar.";
  }
  if (message.includes("User already registered")) {
    return "Este email ja esta cadastrado.";
  }
  return message;
}

export function ClientSignInForm({
  redirectTo = "/",
  initialError,
  initialMessage,
}: SignInFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Preencha email e senha.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(mapAuthError(signInError.message));
      setLoading(false);
      return;
    }

    if (data.user) {
      const metadataRole =
        typeof data.user.user_metadata?.role === "string"
          ? data.user.user_metadata.role
          : "";
      const role = metadataRole === "seller" ? "seller" : "buyer";
      const displayName =
        typeof data.user.user_metadata?.display_name === "string"
          ? data.user.user_metadata.display_name
          : data.user.email?.split("@")[0] ?? "Usuario";

      try {
        await ensureProfile(supabase, data.user, {
          displayName,
          role,
          email,
        });
      } catch {
        // Ignore profile sync errors.
      }
    }

    window.location.href = redirectTo;
  };

  return (
    <div className="space-y-3">
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Email
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="email"
            name="email"
            placeholder="voce@email.com"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Senha
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="password"
            name="password"
            placeholder="********"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export function ClientSignUpForm({ redirectTo = "/" }: SignUpFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("display_name") ?? "").trim();
    const roleValue = String(formData.get("role") ?? "buyer");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!displayName || !email || !password) {
      setError("Preencha todos os campos.");
      setLoading(false);
      return;
    }
    if (!displayName.includes(" ")) {
      setError("Informe seu nome completo (nome e sobrenome).");
      setLoading(false);
      return;
    }

    const role = roleValue === "seller" ? "seller" : "buyer";
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role,
        },
      },
    });

    if (signUpError) {
      setError(mapAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage("Conta criada. Confirme seu email para entrar.");
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        await ensureProfile(supabase, data.user, {
          displayName,
          role,
          email,
        });
      } catch {
        // Ignore profile sync errors.
      }
    }

    window.location.href = redirectTo;
  };

  return (
    <div className="space-y-3">
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Nome
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="text"
            name="display_name"
            placeholder="Seu nome"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Perfil
          <select
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
            name="role"
            defaultValue="buyer"
          >
            <option value="buyer">Comprador</option>
            <option value="seller">Vendedor</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Email
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="email"
            name="email"
            placeholder="voce@email.com"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Senha
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="password"
            name="password"
            placeholder="Crie uma senha"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
