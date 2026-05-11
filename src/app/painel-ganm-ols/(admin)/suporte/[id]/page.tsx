import Link from "next/link";
import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { notifyUserAboutSupportReply } from "@/lib/support/notifications";
import { createClient } from "@/lib/supabase/server";
import AdminSupportRealtime from "@/components/support/AdminSupportRealtime";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  params: { id: string };
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ThreadRow = {
  id: string;
  user_id: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles?: { display_name: string | null; email: string | null }[] | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string | null;
  profiles?: { display_name: string | null }[] | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function threadUserLabel(thread: ThreadRow) {
  const profile = thread.profiles?.[0] ?? null;
  return profile?.display_name?.trim() || profile?.email?.trim() || thread.user_id;
}

async function sendReply(formData: FormData) {
  "use server";

  const threadId = String(formData.get("thread_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!threadId || !body) {
    redirect(`${ADMIN_PATHS.support}/${threadId}?error=Mensagem+invalida`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Faca login para acessar o admin"
      )}`
    );
  }

  const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || adminCheck !== true) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Sem permissao para acessar o admin"
      )}`
    );
  }

  const { data: thread } = await supabase
    .from("support_threads")
    .select("id, user_id")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread?.id || !thread.user_id) {
    redirect(`${ADMIN_PATHS.support}/${threadId}?error=Conversa+nao+encontrada`);
  }

  const { error: insertError } = await supabase.from("support_messages").insert({
    thread_id: threadId,
    sender_user_id: user.id,
    body,
  });

  if (insertError) {
    redirect(
      `${ADMIN_PATHS.support}/${threadId}?error=${encodeURIComponent(insertError.message)}`
    );
  }

  await supabase
    .from("support_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  await notifyUserAboutSupportReply({
    threadId,
    userId: String(thread.user_id),
    body,
  });

  redirect(`${ADMIN_PATHS.support}/${threadId}?success=Mensagem+enviada`);
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const threadId = decodeURIComponent(String(resolvedParams.id ?? "").trim());

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Faca login para acessar o admin"
      )}`
    );
  }

  const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || adminCheck !== true) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Sem permissao para acessar o admin"
      )}`
    );
  }

  const { data: threadData, error: threadError } = await supabase
    .from("support_threads")
    .select("id, user_id, status, created_at, updated_at, profiles(display_name, email)")
    .eq("id", threadId)
    .maybeSingle();

  const thread = threadData as ThreadRow | null;

  if (threadError || !thread) {
    return (
      <main className="space-y-6">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Conversa nao encontrada.
        </div>
        <Link
          href={ADMIN_PATHS.support}
          className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Voltar
        </Link>
      </main>
    );
  }

  const { data: messagesData } = await supabase
    .from("support_messages")
    .select("id, thread_id, sender_user_id, body, created_at, profiles(display_name)")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .limit(400);

  const messages = (messagesData ?? []) as MessageRow[];

  return (
    <main className="space-y-8">
      <AdminSupportRealtime threadId={thread.id} />
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

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Suporte
            </p>
            <h1 className="mt-2 text-lg font-semibold text-zinc-900">
              {threadUserLabel(thread)}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Criado em {formatDateTime(thread.created_at)} • Atualizado em{" "}
              {formatDateTime(thread.updated_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={ADMIN_PATHS.support}
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
            >
              Voltar
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Mensagens</h2>
        <div className="mt-4 max-h-[540px] space-y-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma mensagem ainda.</p>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender_user_id === thread.user_id;
              const senderName = msg.profiles?.[0]?.display_name?.trim() || (isUser ? "Usuario" : "Suporte");
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      isUser ? "border border-zinc-200 bg-white text-zinc-900" : "bg-zinc-900 text-white"
                    }`}
                  >
                    <p className={`text-xs font-semibold ${isUser ? "text-zinc-500" : "text-white/70"}`}>
                      {senderName}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">{msg.body}</p>
                    <p className={`mt-2 text-[11px] ${isUser ? "text-zinc-500" : "text-white/60"}`}>
                      {formatDateTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form action={sendReply} className="mt-4 space-y-2">
          <input type="hidden" name="thread_id" value={thread.id} />
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Responder
          </label>
          <textarea
            name="body"
            className="min-h-[120px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            placeholder="Escreva sua resposta..."
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Enviar resposta
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
