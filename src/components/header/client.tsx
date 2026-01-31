"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import useCartCount from "@/components/cart/useCartCount";
import { createClient } from "@/lib/supabase/client";

const storageKeys = {
  cep: "ganmols_cep",
  city: "ganmols_city",
};

type CompactProps = {
  compact?: boolean;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string | null;
};

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M14 20a2 2 0 0 1-4 0m7-5V9a5 5 0 1 0-10 0v6l-2 2h16l-2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M6 6h15l-1.5 9H7.5L6 3H3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.3" />
    </svg>
  );
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const dayKey = new Date().toISOString().slice(0, 10);
    const path = window.location.pathname || "/";
    const key = `ganmols_visit_${dayKey}_${path}`;
    if (window.sessionStorage.getItem(key)) {
      return;
    }
    window.sessionStorage.setItem(key, "1");
    fetch("/api/notifications/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, link, type, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const list = (data ?? []) as NotificationRow[];
      setNotifications(list);
      setUnreadCount(list.filter((item) => !item.is_read).length);
      setIsLoading(false);

      if (channel) {
        return;
      }

      channel = supabase
        .channel(`notifications-${user.id}`)
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
            setNotifications((prev) => [row, ...prev].slice(0, 6));
            setUnreadCount((prev) => prev + (row.is_read ? 0 : 1));
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification(row.title, {
                body: row.body ?? "",
              });
            }
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
            setNotifications((prev) =>
              prev.map((item) => (item.id === row.id ? row : item))
            );
            setUnreadCount((prev) =>
              row.is_read ? Math.max(0, prev - 1) : prev
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

  const clearNotifications = async () => {
    if (!userId) {
      return;
    }
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true }))
    );
    setUnreadCount(0);
  };

  const requestPermission = async () => {
    if (permission === "unsupported") {
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      new Notification("Notificacoes ativadas", {
        body: "Voce vai receber alertas do GANM OLS.",
      });
    }
  };

  const handleBellClick = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (permission === "default") {
      await requestPermission();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleBellClick}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
        aria-label="Notificacoes"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-zinc-200 bg-white py-2 text-sm text-zinc-700 shadow-xl">
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Notificacoes
          </div>
          {permission === "default" ? (
            <button
              type="button"
              onClick={requestPermission}
              className="mx-4 mb-2 w-[calc(100%-2rem)] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            >
              Ativar notificacoes do navegador
            </button>
          ) : null}
          {permission === "denied" ? (
            <p className="px-4 pb-2 text-xs text-rose-600">
              Permissao de notificacao negada no navegador.
            </p>
          ) : null}
          {permission === "unsupported" ? (
            <p className="px-4 pb-2 text-xs text-zinc-500">
              Notificacoes do navegador indisponiveis.
            </p>
          ) : null}
          <div className="max-h-80 overflow-auto">
            {isLoading ? (
              <p className="px-4 py-3 text-xs text-zinc-500">Carregando...</p>
            ) : errorMessage ? (
              <p className="px-4 py-3 text-xs text-rose-600">{errorMessage}</p>
            ) : notifications.length === 0 ? (
              <div className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
                Nenhuma notificacao ainda.
              </div>
            ) : (
              notifications.map((item) =>
                item.link ? (
                  <Link
                    key={item.id}
                    href={item.link}
                    className={`block border-t border-zinc-100 px-4 py-3 text-xs hover:bg-zinc-50 ${
                      item.is_read ? "bg-white" : "bg-zinc-50"
                    }`}
                  >
                    <p className="font-semibold text-zinc-800">{item.title}</p>
                    {item.body ? (
                      <p className="mt-1 text-zinc-600">{item.body}</p>
                    ) : null}
                  </Link>
                ) : (
                  <div
                    key={item.id}
                    className={`border-t border-zinc-100 px-4 py-3 text-xs hover:bg-zinc-50 ${
                      item.is_read ? "bg-white" : "bg-zinc-50"
                    }`}
                  >
                    <p className="font-semibold text-zinc-800">{item.title}</p>
                    {item.body ? (
                      <p className="mt-1 text-zinc-600">{item.body}</p>
                    ) : null}
                  </div>
                )
              )
            )}
          </div>
          {notifications.length > 0 ? (
            <button
              type="button"
              onClick={clearNotifications}
              className="mt-2 w-full border-t border-zinc-100 px-4 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Marcar como lidas
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CartButton({ compact }: CompactProps) {
  const count = useCartCount();

  return (
    <Link
      href="/carrinho"
      className={`relative flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 ${
        compact ? "px-2 py-1 text-xs" : ""
      }`}
      aria-label="Carrinho"
    >
      <CartIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      {compact ? null : <span>Carrinho</span>}
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function CepControl({ compact }: CompactProps) {
  const [cep, setCep] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [cityLabel, setCityLabel] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(storageKeys.cep);
    const storedCity = localStorage.getItem(storageKeys.city);
    if (stored) {
      setCep(stored);
      setDraft(stored);
    }
    if (storedCity) {
      setCityLabel(storedCity);
    }
  }, []);

  useEffect(() => {
    const normalized = normalizeZipcode(cep);
    if (!normalized || normalized.length !== 8 || cityLabel) {
      return;
    }

    const fetchCity = async () => {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${normalized}/json/`
        );
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          localidade?: string;
          uf?: string;
          erro?: boolean;
        };
        if (!data.erro && data.localidade && data.uf) {
          const label = `${data.localidade} - ${data.uf}`;
          localStorage.setItem(storageKeys.city, label);
          setCityLabel(label);
        }
      } catch {
        // ignore
      }
    };

    void fetchCity();
  }, [cep, cityLabel]);

  const normalizeZipcode = (value: string) => value.replace(/\D/g, "").slice(0, 8);

  const handleSave = async () => {
    const next = draft.trim();
    if (next) {
      localStorage.setItem(storageKeys.cep, next);
      setCep(next);
      const normalized = normalizeZipcode(next);
      if (normalized.length === 8) {
        try {
          const response = await fetch(
            `https://viacep.com.br/ws/${normalized}/json/`
          );
          if (response.ok) {
            const data = (await response.json()) as {
              localidade?: string;
              uf?: string;
              erro?: boolean;
            };
            if (!data.erro && data.localidade && data.uf) {
              const label = `${data.localidade} - ${data.uf}`;
              localStorage.setItem(storageKeys.city, label);
              setCityLabel(label);
            } else {
              localStorage.removeItem(storageKeys.city);
              setCityLabel("");
            }
          }
        } catch {
          localStorage.removeItem(storageKeys.city);
          setCityLabel("");
        }
      }
    } else {
      localStorage.removeItem(storageKeys.cep);
      setCep("");
      localStorage.removeItem(storageKeys.city);
      setCityLabel("");
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(cep);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className={`flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-zinc-700 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        <PinIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="00000-000"
          className="w-24 bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-semibold text-white"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-700"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <PinIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      <span>
        {cep
          ? `CEP ${cep}${cityLabel ? ` · ${cityLabel}` : ""}`
          : "Informe seu CEP"}
      </span>
    </button>
  );
}
