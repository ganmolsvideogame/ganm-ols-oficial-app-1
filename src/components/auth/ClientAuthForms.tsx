"use client";

import { useMemo, useState } from "react";

import InstallAppButton from "@/components/pwa/InstallAppButton";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/client";
import {
  queuePendingMetaEvent,
  trackMetaEvent,
} from "@/lib/analytics/metaPixel";
import {
  queuePendingGaEvent,
  trackGaEvent,
} from "@/lib/analytics/googleAnalytics";

type SignInFormProps = {
  redirectTo?: string;
  errorRedirect?: string;
  initialError?: string | null;
  initialMessage?: string | null;
};

function buildPostSignupRedirect(role: "buyer" | "seller") {
  if (role === "seller") {
    return "/vender/anunciar?onboarding=seller";
  }

  return "/conta?onboarding=buyer&prompt=notifications";
}

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
  errorRedirect = "/entrar",
  initialError,
  initialMessage,
}: SignInFormProps) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      event.preventDefault();
      setError("Preencha email e senha.");
      return;
    }
    setLoading(true);
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
      <form
        action="/api/auth/signin"
        method="post"
        onSubmit={handleSubmit}
        className="space-y-3"
      >
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input type="hidden" name="error_redirect" value={errorRedirect} />
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

export function ClientSignUpForm({
  initialRole = "buyer",
}: {
  initialRole?: "buyer" | "seller";
}) {
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
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!displayName || !email || !phone || !password) {
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
    const metaRegistrationPayload = {
      content_name: "signup_click",
      status: "submit_intent",
      user_role: role,
      entry_point:
        typeof window !== "undefined" ? window.location.pathname : "/entrar",
    };
    const metaRegistrationSent = trackMetaEvent(
      "CompleteRegistration",
      metaRegistrationPayload
    );
    if (!metaRegistrationSent) {
      queuePendingMetaEvent("CompleteRegistration", metaRegistrationPayload);
    }

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

    // Notify admins about the signup (client-side signups bypass /api/auth/signup).
    fetch("/api/notifications/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        display_name: displayName,
        phone,
        role,
        event_source_url:
          typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => {});

    let activeUser = data.user ?? null;
    let activeSession = data.session ?? null;

    if (!activeSession) {
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInResult.error) {
        activeUser = signInResult.data.user ?? activeUser;
        activeSession = signInResult.data.session ?? activeSession;
      }
    }

    if (role === "seller") {
      const gaPayload = {
        method: "email",
        user_role: "seller",
        status: activeSession ? "authenticated" : "pending_confirmation",
      };
      const gaSent = trackGaEvent("seller_signup", gaPayload);
      if (!gaSent) {
        queuePendingGaEvent("seller_signup", gaPayload);
      }
    }

    if (!activeSession) {
      setMessage(
        "Conta criada, mas o login automatico nao foi concluido. Tente entrar com seu email e senha."
      );
      setLoading(false);
      return;
    }

    if (activeUser) {
      try {
        await ensureProfile(supabase, activeUser, {
          displayName,
          role,
          email,
          phone,
        });
      } catch {
        // Ignore profile sync errors.
      }
    }

    window.location.href = buildPostSignupRedirect(role);
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
            defaultValue={initialRole}
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
          WhatsApp
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            type="tel"
            name="phone"
            placeholder="(00) 00000-0000"
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
        <InstallAppButton
          source="signup-form"
          className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        />
      </form>
    </div>
  );
}
