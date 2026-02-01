import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

export default async function NotificationDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const notificationId = params.id;
  if (!notificationId) {
    redirect("/");
  }

  const { data: notification, error } = await admin
    .from("notifications")
    .select("id, title, body, link, type, is_read, created_at")
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !notification) {
    redirect("/");
  }

  if (!notification.is_read) {
    await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Notificacao
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            {notification.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {formatDateTime(notification.created_at)}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
        >
          Voltar
        </Link>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-600">
          {notification.body ?? "Sem detalhes adicionais."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
          <span className="rounded-full border border-zinc-200 px-3 py-1">
            Tipo: {notification.type ?? "geral"}
          </span>
          <span className="rounded-full border border-zinc-200 px-3 py-1">
            Status: {notification.is_read ? "Lida" : "Nova"}
          </span>
        </div>
        {notification.link ? (
          <Link
            href={notification.link}
            className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Abrir destino
          </Link>
        ) : null}
      </section>
    </div>
  );
}
