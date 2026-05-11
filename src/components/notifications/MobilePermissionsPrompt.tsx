"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import {
  canUseBrowserPush,
  requestBrowserPushPermissionAndSubscribe,
} from "@/lib/push/browser";
import {
  getNativeAppNotificationPermissionStatus,
  isNativeAndroidApp,
  openNativeAppNotificationSettings,
  requestNativeAppNotificationPermission,
} from "@/lib/push/native-app";

const CHOICE_KEY = "ganmols_mobile_push_prompt_choice";

const copy = {
  pt: {
    eyebrow: "Primeiro passo",
    title: "Ative as notificacoes da GANM OLS",
    description:
      "Nao perca vendas, respostas do suporte, conteudo novo e alertas importantes no celular.",
    reasons: [
      "acompanhar vendas e atualizacoes de pedidos",
      "receber respostas do suporte e avisos do sistema",
      "ver artigos novos, ofertas e chamadas importantes da GANM OLS",
    ],
    cta: "Ativar notificacoes",
    later: "Agora nao",
    success: "Notificacoes ativadas com sucesso.",
    denied: "A permissao foi negada no navegador.",
    unsupported: "Este navegador nao suporta notificacoes web.",
  },
  en: {
    eyebrow: "First step",
    title: "Enable GANM OLS notifications",
    description:
      "Do not miss sales, support replies, new content, and important alerts on your phone.",
    reasons: [
      "track sales and order updates",
      "receive support replies and system notices",
      "see new articles, offers, and important GANM OLS updates",
    ],
    cta: "Enable notifications",
    later: "Not now",
    success: "Notifications enabled successfully.",
    denied: "Browser notification permission was denied.",
    unsupported: "This browser does not support web notifications.",
  },
} as const;

export default function MobilePermissionsPrompt() {
  const pathname = usePathname() || "/";
  const locale = pathname.startsWith("/en") ? "en" : "pt";
  const pushAvailable = useMemo(() => canUseBrowserPush(), []);
  const nativeAndroid = useMemo(() => isNativeAndroidApp(), []);
  const text = useMemo(() => {
    const base = copy[locale];

    if (!nativeAndroid) {
      return base;
    }

    return {
      ...base,
      title:
        locale === "en"
          ? "Enable app notifications"
          : "Ative as notificacoes do app",
      description:
        locale === "en"
          ? "On the Android app, notification access is managed in the device settings. Enable it to keep up with sales, support replies and important GANM OLS alerts."
          : "No app Android, a permissao principal fica nas configuracoes do aplicativo. Ative para acompanhar vendas, suporte e alertas importantes da GANM OLS.",
      cta:
        locale === "en"
          ? "Open app settings"
          : "Abrir configuracoes do app",
      success:
        locale === "en"
          ? "App settings opened. Enable notifications there to keep receiving GANM OLS alerts."
          : "Configuracoes do app abertas. Ative as notificacoes ali para continuar recebendo alertas da GANM OLS.",
      denied:
        locale === "en"
          ? "Enable notifications in the app settings."
          : "Ative as notificacoes nas configuracoes do aplicativo.",
      unsupported:
        locale === "en"
          ? "This app could not open the notification settings."
          : "Nao foi possivel abrir as configuracoes do app.",
    };
  }, [locale, nativeAndroid]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [busy, setBusy] = useState(false);
  const [nativePermissionGranted, setNativePermissionGranted] = useState(false);
  const [choice, setChoice] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(CHOICE_KEY) ?? "";
  });
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  useEffect(() => {
    if (!nativeAndroid) {
      setNativePermissionGranted(false);
      return;
    }

    let active = true;

    void getNativeAppNotificationPermissionStatus()
      .then((status) => {
        if (!active) {
          return;
        }

        setNativePermissionGranted(status.granted && status.hasStoredToken);
      })
      .catch(() => {
        if (active) {
          setNativePermissionGranted(false);
        }
      });

    return () => {
      active = false;
    };
  }, [nativeAndroid, choice]);

  const visible = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    if (nativeAndroid) {
      return isMobileViewport && choice !== "deferred" && !nativePermissionGranted;
    }

    return isMobileViewport && !choice && permission === "default" && pushAvailable;
  }, [choice, nativeAndroid, nativePermissionGranted, permission, pushAvailable]);

  if (!visible) {
    return null;
  }

  const saveChoice = (value: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHOICE_KEY, value);
    }
    setChoice(value);
  };

  const activate = async () => {
    setMessage("");
    setBusy(true);

    try {
      if (nativeAndroid) {
        const result = await requestNativeAppNotificationPermission();

        if (result.ok) {
          setNativePermissionGranted(true);
          setMessage(text.success);
          setMessageType("success");
          window.setTimeout(() => {
            saveChoice("accepted");
          }, 900);
          return;
        }

        const opened = await openNativeAppNotificationSettings();
        setMessage(opened ? text.denied : text.unsupported);
        setMessageType(opened ? "success" : "error");
        return;
      }

      const result = await requestBrowserPushPermissionAndSubscribe(
        locale,
        null,
        {
          forceRefresh: true,
        }
      );

      const nextPermission =
        result.permission === "unsupported"
          ? "unsupported"
          : result.permission;
      setPermission(nextPermission);

      if (result.ok) {
        setMessage(text.success);
        setMessageType("success");
        window.setTimeout(() => {
          saveChoice("accepted");
        }, 900);
        return;
      }

      if (nextPermission === "denied") {
        setMessage(text.denied);
        setMessageType("error");
        return;
      }

      setMessage(text.unsupported);
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  };

  const defer = async () => {
    setMessage("");
    saveChoice("deferred");
  };

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-zinc-950/45 px-4 md:hidden">
      <div className="w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,.22)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {text.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
          {text.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          {text.description}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          {text.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-zinc-900" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void activate()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {busy ? "Processando..." : text.cta}
          </button>
          <button
            type="button"
            onClick={() => void defer()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {text.later}
          </button>
        </div>
        {message ? (
          <p
            className={`mt-3 text-sm ${
              messageType === "success" ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
