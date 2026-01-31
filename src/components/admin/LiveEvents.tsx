"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

export default function LiveEvents() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<
    | "all"
    | "orders"
    | "bids"
    | "carts"
    | "signups"
    | "logins"
    | "visits"
    | "general"
  >("all");

  useEffect(() => {
    const supabase = createClient();
    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadNotifications = async () => {
      setIsLoading(true);
      setErrorMessage("");
      const [
        {
          data: { user },
        },
        { data: sessionData },
      ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);

      if (!isActive) {
        return;
      }

      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        supabase.realtime.setAuth(accessToken);
      }

      if (!user) {
        setUserId(null);
        setItems([]);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, link, type, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setItems([]);
        setIsLoading(false);
        return;
      }

      setItems((data ?? []) as NotificationRow[]);
      setIsLoading(false);

      if (channel) {
        return;
      }

      channel = supabase
        .channel(`notifications-live-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            setItems((prev) => [row, ...prev].slice(0, 200));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            setItems((prev) =>
              prev.map((item) => (item.id === row.id ? row : item))
            );
          }
        )
        .subscribe();
    };

    loadNotifications();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const accessToken = session?.access_token;
        if (accessToken) {
          supabase.realtime.setAuth(accessToken);
        }
        loadNotifications();
      }
    );

    return () => {
      isActive = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return items;
    }
    return items.filter((item) => (item.type ?? "general") === filter);
  }, [filter, items]);

  const filteredUnreadCount = useMemo(
    () => filteredItems.filter((item) => !item.is_read).length,
    [filteredItems]
  );

  const filterOptions: Array<{
    value:
      | "all"
      | "orders"
      | "bids"
      | "carts"
      | "signups"
      | "logins"
      | "visits"
      | "general";
    label: string;
  }> = [
    { value: "all", label: "Tudo" },
    { value: "orders", label: "Compras" },
    { value: "bids", label: "Lances" },
    { value: "carts", label: "Carrinhos" },
    { value: "signups", label: "Contas" },
    { value: "logins", label: "Logins" },
    { value: "visits", label: "Visitas" },
    { value: "general", label: "Outros" },
  ];

  const markAllRead = async () => {
    if (!userId) {
      return;
    }
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Ao vivo
          </p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">
            Acontecimentos em tempo real
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Tudo que acontecer no marketplace aparece aqui na hora.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            AO VIVO
          </span>
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          >
            Marcar tudo como lido
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 text-xs text-zinc-500">
          <span>Total: {filteredItems.length}</span>
          <span>Novas: {filteredUnreadCount}</span>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-zinc-100 px-4 py-3">
          {filterOptions.map((option) => {
            const active = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-zinc-500">Carregando...</div>
        ) : errorMessage ? (
          <div className="px-4 py-6 text-sm text-rose-600">{errorMessage}</div>
        ) : filteredItems.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-500">
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <div className="max-h-[560px] divide-y divide-zinc-100 overflow-auto">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex flex-wrap items-start justify-between gap-4 px-4 py-3 text-sm ${
                  item.is_read ? "bg-white" : "bg-zinc-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{item.title}</p>
                  {item.body ? (
                    <p className="mt-1 text-sm text-zinc-600">{item.body}</p>
                  ) : null}
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="mt-2 inline-flex text-xs font-semibold text-zinc-700"
                    >
                      Ver detalhes
                    </Link>
                  ) : null}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatDateTime(item.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
