"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { BlogLocale } from "@/lib/blog/locales";
import {
  canUseBrowserPush,
  requestBrowserPushPermissionAndSubscribe,
} from "@/lib/push/browser";

type BlogNewsletterSignupProps = {
  locale: BlogLocale;
};

const copy = {
  pt: {
    eyebrow: "Newsletter",
    title: "Receba os próximos artigos primeiro",
    description:
      "Entre na newsletter do blog da GANM OLS para receber leituras novas, especiais retrô e destaques editoriais sem depender de algoritmo.",
    placeholder: "Seu melhor email",
    submit: "Entrar na newsletter",
    push: "Ativar alertas no navegador",
    success:
      "Inscrição confirmada. Os próximos artigos vão chegar primeiro por aqui.",
    browserActive:
      "As permissões do navegador já foram concedidas. Para gerenciar os alertas, use",
    browserReady: "Alertas do navegador ativados.",
    browserUnsupported: "Este navegador não suporta push web.",
    browserDenied: "A permissão do navegador foi negada.",
    loading: "Enviando...",
  },
  en: {
    eyebrow: "Newsletter",
    title: "Get new articles first",
    description:
      "Join the GANM OLS blog newsletter to receive new features, retro specials, and editorial picks without depending on algorithms.",
    placeholder: "Your best email",
    submit: "Join the newsletter",
    push: "Enable browser alerts",
    success: "Subscription confirmed. New articles will reach you here first.",
    browserActive:
      "Browser permissions were already granted. To manage alerts, use",
    browserReady: "Browser alerts enabled.",
    browserUnsupported: "This browser does not support web push.",
    browserDenied: "Browser notification permission was denied.",
    loading: "Sending...",
  },
} as const;

export default function BlogNewsletterSignup({
  locale,
}: BlogNewsletterSignupProps) {
  const text = copy[locale];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });
  const pushAvailable = useMemo(() => canUseBrowserPush(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/blog/newsletter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          locale,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Newsletter signup failed.");
      }

      setEmail("");
      setMessage(payload.message || text.success);
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Newsletter signup failed."
      );
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnablePush() {
    setMessage("");
    const result = await requestBrowserPushPermissionAndSubscribe(locale, null, {
      forceRefresh: true,
    });
    const nextPermission =
      result.permission === "unsupported" ? "unsupported" : result.permission;
    setPermission(nextPermission);

    if (result.ok) {
      setMessage(text.browserReady);
      setMessageType("success");
      return;
    }

    if (result.permission === "denied") {
      setMessage(text.browserDenied);
      setMessageType("error");
      return;
    }

    setMessage(text.browserUnsupported);
    setMessageType("error");
  }

  return (
    <section className="rounded-[2.4rem] border border-zinc-200 bg-white px-6 py-7 shadow-sm md:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
        {text.eyebrow}
      </p>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.04em] text-zinc-950 md:text-4xl">
        {text.title}
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600">
        {text.description}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={text.placeholder}
          required
          className="h-12 w-full rounded-full border border-zinc-200 px-5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? text.loading : text.submit}
        </button>
        {permission === "granted" ? (
          <p className="text-sm text-emerald-700">
            {text.browserActive}{" "}
            <Link href="/conta" className="font-semibold underline underline-offset-2">
              {locale === "en" ? "My account" : "Minha conta"}
            </Link>
            .
          </p>
        ) : (
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={!pushAvailable}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 px-6 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {text.push}
          </button>
        )}
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            messageType === "success" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
