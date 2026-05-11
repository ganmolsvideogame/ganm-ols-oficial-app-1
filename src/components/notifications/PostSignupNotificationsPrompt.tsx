"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  deferBrowserPushNotifications,
  requestBrowserPushPermissionAndSubscribe,
} from "@/lib/push/browser";
import {
  isNativeAndroidApp,
  openNativeAppNotificationSettings,
  requestNativeAppNotificationPermission,
} from "@/lib/push/native-app";

type PostSignupNotificationsPromptProps = {
  role: "seller" | "buyer";
  initiallyEnabled: boolean;
};

export default function PostSignupNotificationsPrompt({
  role,
  initiallyEnabled,
}: PostSignupNotificationsPromptProps) {
  const router = useRouter();
  const pathname = usePathname() || "/conta";
  const searchParams = useSearchParams();
  const shouldPrompt =
    searchParams.get("prompt") === "notifications" && !initiallyEnabled;
  const nativeAndroid = useMemo(() => isNativeAndroidApp(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const text = useMemo(() => {
    if (role === "seller") {
      return {
        eyebrow: "Primeiro passo",
        title: nativeAndroid
          ? "Ative as notificacoes do app"
          : "Ative as notificacoes da GANM OLS",
        description:
          nativeAndroid
            ? "No app Android, a permissao principal fica nas configuracoes do aplicativo. Ative para acompanhar vendas, suporte, blog e alertas importantes."
            : "Acompanhe vendas, noticias do blog, respostas do suporte e alertas importantes direto no celular.",
      };
    }

    return {
      eyebrow: "Primeiro passo",
      title: nativeAndroid
        ? "Ative as notificacoes do app"
        : "Receba notificacoes da GANM OLS",
      description:
        nativeAndroid
          ? "No app Android, a permissao principal fica nas configuracoes do aplicativo. Ative para receber novidades, suporte e avisos importantes."
          : "Acompanhe novidades, suporte, conteudo novo e avisos importantes direto no navegador.",
    };
  }, [nativeAndroid, role]);

  if (!shouldPrompt) {
    return null;
  }

  const nextUrl = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("prompt");
    const query = params.toString();
    const hash = role === "seller" ? "#dados-vendedor" : "";
    return `${pathname}${query ? `?${query}` : ""}${hash}`;
  };

  const finish = () => {
    router.replace(nextUrl(), { scroll: false });
  };

  const accept = async () => {
    setBusy(true);
    setMessage("");
    let shouldFinish = false;

    try {
      if (nativeAndroid) {
        const result = await requestNativeAppNotificationPermission();
        if (result.ok) {
          setMessage(
            "Notificacoes do app ativadas com sucesso."
          );
          setMessageType("success");
          shouldFinish = true;
        } else {
          const opened = await openNativeAppNotificationSettings();
          setMessage(
            opened
              ? "Abra as configuracoes do app e libere as notificacoes manualmente no Android."
              : "Nao foi possivel abrir as configuracoes do app."
          );
          setMessageType(opened ? "success" : "error");
        }
        return;
      }

      const locale = pathname.startsWith("/en") ? "en" : "pt";
      const result = await requestBrowserPushPermissionAndSubscribe(
        locale,
        null,
        {
          forceRefresh: true,
        }
      );

      if (result.ok) {
        setMessage("Notificacoes ativadas com sucesso.");
        setMessageType("success");
        shouldFinish = true;
      } else if (result.permission === "denied") {
        setMessage(
          "A permissao foi negada no navegador. Voce pode ativar depois nas configuracoes internas."
        );
        setMessageType("error");
        shouldFinish = true;
      } else {
        setMessage(
          "Este navegador nao suporta notificacoes web. Voce pode seguir mesmo assim."
        );
        setMessageType("error");
        shouldFinish = true;
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao ativar as notificacoes."
      );
      setMessageType("error");
    } finally {
      setBusy(false);
      if (shouldFinish) {
        window.setTimeout(() => {
          finish();
        }, 900);
      }
    }
  };

  const decline = async () => {
    setBusy(true);
    setMessage("");

    try {
      const locale = pathname.startsWith("/en") ? "en" : "pt";
      await deferBrowserPushNotifications(locale);
      finish();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao salvar sua escolha."
      );
      setMessageType("error");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-zinc-950/45 px-4">
      <div className="w-full max-w-lg rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          {text.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
          {text.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          {text.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void accept()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Processando..."
              : nativeAndroid
                ? "Abrir configuracoes do app"
                : "Ativar notificacoes"}
          </button>
          <button
            type="button"
            onClick={() => void decline()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Agora nao
          </button>
        </div>
        {message ? (
          <p
            className={`mt-4 text-sm ${
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
