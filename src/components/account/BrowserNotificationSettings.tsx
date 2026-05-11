"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import {
  canUseBrowserPush,
  disableBrowserPushNotifications,
  requestBrowserPushPermissionAndSubscribe,
} from "@/lib/push/browser";
import {
  isNativeAndroidApp,
  openNativeAppNotificationSettings,
  requestNativeAppNotificationPermission,
} from "@/lib/push/native-app";

type BrowserNotificationSettingsProps = {
  initialEnabled: boolean;
  initialUpdatedAt: string | null;
};

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default function BrowserNotificationSettings({
  initialEnabled,
  initialUpdatedAt,
}: BrowserNotificationSettingsProps) {
  const pathname = usePathname() || "/";
  const locale = pathname.startsWith("/en") ? "en" : "pt";
  const pushAvailable = useMemo(() => canUseBrowserPush(), []);
  const nativeAndroid = useMemo(() => isNativeAndroidApp(), []);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });
  const [enabled, setEnabled] = useState(initialEnabled);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const enableNotifications = async () => {
    setBusy(true);
    setMessage("");

    try {
      if (nativeAndroid) {
        const result = await requestNativeAppNotificationPermission();
        if (result.ok) {
          const now = new Date().toISOString();
          setEnabled(true);
          setUpdatedAt(now);
          setMessage(
            "Notificacoes do app ativadas. Se quiser revisar essa permissao depois, abra as configuracoes do aplicativo."
          );
          setMessageType("success");
          return;
        }

        const opened = await openNativeAppNotificationSettings();
        setMessage(
          opened
            ? "Abra as configuracoes do app e libere as notificacoes manualmente no Android."
            : "Nao foi possivel abrir as configuracoes do app."
        );
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
        result.permission === "unsupported" ? "unsupported" : result.permission;
      setPermission(nextPermission);

      if (!result.ok) {
        if (nextPermission === "denied") {
          setMessage(
            "A permissao foi negada no navegador. Reative nas configuracoes do navegador para voltar a receber alertas."
          );
        } else {
          setMessage("Este navegador nao suporta notificacoes web.");
        }
        setMessageType("error");
        return;
      }

      const now = new Date().toISOString();
      setEnabled(true);
      setUpdatedAt(now);
      setMessage(
        "Notificacoes ativadas para esta conta. A desativacao fica disponivel so aqui nas configuracoes internas."
      );
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao ativar as notificacoes."
      );
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  };

  const disableNotifications = async () => {
    setBusy(true);
    setMessage("");

    try {
      const result = await disableBrowserPushNotifications(locale);
      if (!result.ok) {
        setMessage("Este navegador nao suporta notificacoes web.");
        setMessageType("error");
        return;
      }

      const now = new Date().toISOString();
      setEnabled(false);
      setUpdatedAt(now);
      setMessage(
        "Alertas do navegador desativados para esta conta. A permissao do navegador pode continuar liberada, mas a GANM OLS para de enviar pushes."
      );
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao desativar as notificacoes."
      );
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-zinc-900">
          {nativeAndroid ? "Notificacoes do app" : "Notificacoes do navegador"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {nativeAndroid
            ? "No Android instalado, a permissao principal fica nas configuracoes do aplicativo."
            : "Controle aqui os alertas da GANM OLS para blog, suporte e avisos do sistema."}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        <p>
          Status salvo:{" "}
          <span className="font-semibold text-zinc-900">
            {enabled ? "Ativado" : "Desativado"}
          </span>
        </p>
        <p className="mt-1">
          {nativeAndroid ? "Permissao do app: " : "Permissao do navegador: "}
          <span className="font-semibold text-zinc-900">
            {nativeAndroid
              ? "gerencie nas configuracoes do aplicativo"
              : permission === "unsupported"
              ? "indisponivel"
              : permission === "granted"
                ? "permitida"
                : permission === "denied"
                  ? "negada"
                  : "ainda nao definida"}
          </span>
        </p>
        {updatedAt ? (
          <p className="mt-1 text-xs text-zinc-500">
            Ultima atualizacao: {formatUpdatedAt(updatedAt)}
          </p>
        ) : null}
      </div>

      {!pushAvailable && !nativeAndroid ? (
        <p className="text-sm text-zinc-500">
          Este navegador nao suporta notificacoes web.
        </p>
      ) : nativeAndroid ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void enableNotifications()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Ativando..." : "Ativar notificacoes do app"}
          </button>
        </div>
      ) : enabled && permission === "granted" ? (
        <button
          type="button"
          onClick={() => void disableNotifications()}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Desativando..." : "Desativar notificacoes"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void enableNotifications()}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Ativando..." : "Ativar notificacoes"}
        </button>
      )}

      {message ? (
        <p
          className={`text-sm ${
            messageType === "success" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
