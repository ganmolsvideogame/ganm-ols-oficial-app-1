"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type SupportThreadRow = {
  id: string;
  user_id: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupportMessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string | null;
};

const SUPPORT_HOURS =
  process.env.NEXT_PUBLIC_SUPPORT_HOURS ??
  "Seg-Sex, 09:00-18:00 (Horario de Brasilia)";
const SUPPORT_SLA =
  process.env.NEXT_PUBLIC_SUPPORT_SLA ?? "Tempo de resposta: ate 24h uteis.";

function formatTimestamp(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatError(err: unknown) {
  const extractErrorMessage = (value: unknown) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message;
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.message === "string" && record.message.trim()) {
        return record.message;
      }
      if (typeof record.error === "string" && record.error.trim()) {
        return record.error;
      }
      if (typeof record.details === "string" && record.details.trim()) {
        return record.details;
      }
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const message = extractErrorMessage(err).trim() || "Erro desconhecido";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  ) {
    return "Falha de conexao. Verifique sua internet e tente novamente.";
  }

  if (
    normalized.includes("jwt expired") ||
    normalized.includes("invalid jwt") ||
    normalized.includes("invalid token") ||
    normalized.includes("token is expired")
  ) {
    return "Sua sessao expirou. Faca login novamente.";
  }

  if (
    normalized.includes("support_threads") ||
    normalized.includes("support_messages") ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the") ||
    normalized.includes("relation") ||
    normalized.includes("does not exist")
  ) {
    return "Suporte em configuracao. Tente novamente em alguns minutos.";
  }

  if (
    normalized.includes("permission denied") ||
    normalized.includes("row level security") ||
    normalized.includes("not allowed")
  ) {
    return "Sem permissao para acessar o suporte.";
  }

  return message;
}

export default function SupportChatWidget() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [redirectTo, setRedirectTo] = useState("/vender");
  const listRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const autoOpenedRef = useRef<string | null>(null);

  const requestedThreadId = String(searchParams?.get("thread") ?? "").trim() || null;
  const shouldOpenFromQuery = searchParams?.get("support") === "open";

  useEffect(() => {
    const path = `${window.location.pathname || "/vender"}${window.location.search || ""}`;
    setRedirectTo(path);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootAuth() {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUserId(data.user?.id ?? null);
    }

    void bootAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setThreadId(null);
      setMessages([]);
      setError(null);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    if (!userId) return;
    if (!threadId) return;

    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel(`support_thread_${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as SupportMessageRow;
          if (!row?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [open, supabase, threadId, userId]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  const ensureThread = useCallback(async (uid: string) => {
    const { data: existing, error: existingError } = await supabase
      .from("support_threads")
      .select("id, user_id, status, created_at, updated_at")
      .eq("user_id", uid)
      .eq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing?.id) {
      return existing.id;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("support_threads")
      .insert({ user_id: uid, status: "open" })
      .select("id, user_id, status, created_at, updated_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    return (inserted as SupportThreadRow).id;
  }, [supabase]);

  const loadMessages = useCallback(async (tid: string) => {
    const { data, error: fetchError } = await supabase
      .from("support_messages")
      .select("id, thread_id, sender_user_id, body, created_at")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true })
      .limit(200);

    if (fetchError) {
      throw fetchError;
    }

    setMessages((data ?? []) as SupportMessageRow[]);
  }, [supabase]);

  const resolveThreadId = useCallback(async (uid: string, preferredThreadId?: string | null) => {
    const candidate = String(preferredThreadId ?? "").trim();
    if (candidate) {
      const { data, error } = await supabase
        .from("support_threads")
        .select("id")
        .eq("id", candidate)
        .eq("user_id", uid)
        .maybeSingle();

      if (!error && data?.id) {
        return String(data.id);
      }
    }

    return threadId ?? (await ensureThread(uid));
  }, [ensureThread, supabase, threadId]);

  const openPanel = useCallback(async (preferredThreadId?: string | null) => {
    setOpen(true);
    setError(null);

    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      const tid = await resolveThreadId(userId, preferredThreadId);
      setThreadId(tid);
      await loadMessages(tid);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, [loadMessages, resolveThreadId, userId]);

  useEffect(() => {
    if (!userId || !shouldOpenFromQuery) {
      return;
    }

    const autoOpenKey = requestedThreadId || "__support_open__";
    if (autoOpenedRef.current === autoOpenKey) {
      return;
    }

    autoOpenedRef.current = autoOpenKey;
    void openPanel(requestedThreadId);
  }, [openPanel, requestedThreadId, shouldOpenFromQuery, userId]);

  const closePanel = () => {
    setOpen(false);
  };

  const sendMessage = async () => {
    if (!userId || !threadId) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/support/message", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          body,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            threadId?: string;
            row?: SupportMessageRow;
          }
        | null;

      if (!response.ok || !payload?.ok || !payload.row) {
        throw new Error(
          typeof payload?.message === "string" && payload.message.trim()
            ? payload.message
            : "Falha ao enviar mensagem."
        );
      }

      if (payload.threadId) {
        setThreadId(payload.threadId);
      }

      const row = payload.row as SupportMessageRow;
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      setDraft("");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (open) {
            closePanel();
          } else {
            void openPanel(requestedThreadId);
          }
        }}
        className="fixed bottom-20 right-4 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-white shadow-lg shadow-black/20 hover:bg-zinc-900 md:bottom-6"
        aria-label="Abrir suporte"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            d="M4 12a8 8 0 0 1 16 0v3a3 3 0 0 1-3 3h-2l-3 2v-2H9a5 5 0 0 1-5-5z"
            strokeLinejoin="round"
          />
          <path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="fixed bottom-36 right-4 z-[60] w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/30 md:bottom-24">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Suporte
              </p>
              <p className="text-sm text-white/90">Fale com a equipe GANM OLS</p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Fechar suporte"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-3">
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                Atendimento
              </p>
              <p className="mt-1">{SUPPORT_HOURS}</p>
              <p className="mt-1">{SUPPORT_SLA}</p>
            </div>

            {!userId ? (
              <div className="space-y-3">
                <p className="text-sm text-white/80">
                  Para enviar mensagem, entre na sua conta.
                </p>
                <Link
                  href={`/entrar?redirect_to=${encodeURIComponent(redirectTo)}`}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
                >
                  Entrar para falar com suporte
                </Link>
              </div>
            ) : (
              <>
                {error ? (
                  <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    {error}
                  </div>
                ) : null}

                <div
                  ref={listRef}
                  className="h-72 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3"
                >
                  {loading ? (
                    <p className="text-xs text-white/60">Carregando...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-white/60">
                      Envie uma mensagem para comecar.
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_user_id === userId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              isMe
                                ? "bg-white text-zinc-950"
                                : "border border-white/10 bg-white/5 text-white"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.body}</p>
                            <p
                              className={`mt-1 text-[10px] ${
                                isMe ? "text-zinc-700" : "text-white/50"
                              }`}
                            >
                              {formatTimestamp(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="Escreva sua mensagem..."
                    className="min-h-[42px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || loading || !threadId || draft.trim().length === 0}
                    className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
