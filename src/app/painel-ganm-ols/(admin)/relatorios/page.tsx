import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SystemEvent = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

const SALE_STATUSES = ["approved", "paid", "shipped", "delivered"];

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

function describeEvent(event: SystemEvent) {
  switch (event.event_type) {
    case "user_created":
      return { title: "Novo usuario", detail: "Cadastro criado" };
    case "listing_created":
      return { title: "Novo anuncio", detail: "Anuncio publicado" };
    case "listing_status_changed":
      return { title: "Status do anuncio", detail: "Status atualizado" };
    case "order_created":
      return { title: "Pedido criado", detail: "Novo pedido" };
    case "order_status_changed":
      return { title: "Status do pedido", detail: "Pedido atualizado" };
    case "order_delivered":
      return { title: "Pedido entregue", detail: "Entrega confirmada" };
    case "coupon_redeemed":
      return { title: "Cupom utilizado", detail: "Cupom aplicado" };
    case "coupon_created":
      return { title: "Cupom criado", detail: "Novo cupom" };
    case "coupon_updated":
      return { title: "Cupom atualizado", detail: "Cupom alterado" };
    case "coupon_deleted":
      return { title: "Cupom excluido", detail: "Cupom removido" };
    case "plan_created":
      return { title: "Plano criado", detail: "Novo plano de assinatura" };
    case "plan_updated":
      return { title: "Plano atualizado", detail: "Plano alterado" };
    case "plan_deleted":
      return { title: "Plano excluido", detail: "Plano removido" };
    case "subscription_created":
      return { title: "Assinatura criada", detail: "Nova assinatura" };
    case "subscription_updated":
      return { title: "Assinatura atualizada", detail: "Status alterado" };
    case "home_section_created":
      return { title: "Secao criada", detail: "Nova secao de conteudo" };
    case "home_section_updated":
      return { title: "Secao atualizada", detail: "Secao alterada" };
    case "home_section_deleted":
      return { title: "Secao removida", detail: "Secao excluida" };
    case "home_item_created":
      return { title: "Banner criado", detail: "Novo banner" };
    case "home_item_deleted":
      return { title: "Banner removido", detail: "Banner excluido" };
    case "payment_event_received":
      return { title: "Evento de pagamento", detail: "Webhook recebido" };
    default:
      return { title: event.event_type, detail: "Evento registrado" };
  }
}

function formatEventMeta(event: SystemEvent) {
  if (!event.metadata) {
    return "Sem detalhes";
  }
  if (event.event_type === "order_status_changed") {
    const oldStatus = event.metadata.old_status ?? "";
    const newStatus = event.metadata.new_status ?? "";
    return `Status: ${oldStatus} -> ${newStatus}`;
  }
  if (event.event_type === "listing_status_changed") {
    const oldStatus = event.metadata.old_status ?? "";
    const newStatus = event.metadata.new_status ?? "";
    return `Status: ${oldStatus} -> ${newStatus}`;
  }
  if (event.event_type === "coupon_redeemed") {
    return `Cupom: ${String(event.metadata.coupon_id ?? "")}`;
  }
  if (event.event_type === "payment_event_received") {
    const provider = event.metadata.provider ?? "";
    const status = event.metadata.status ?? "";
    return `Provider: ${provider} / Status: ${status}`;
  }
  if (event.event_type === "subscription_updated") {
    const oldStatus = event.metadata.old_status ?? "";
    const newStatus = event.metadata.status ?? "";
    return `Status: ${oldStatus} -> ${newStatus}`;
  }
  if (event.event_type === "home_section_updated") {
    const oldActive = event.metadata.old_is_active ?? "";
    const newActive = event.metadata.is_active ?? "";
    return `Ativo: ${oldActive} -> ${newActive}`;
  }
  return "Detalhes registrados";
}

export default async function Page() {
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

  const [{ count: usersCount }, { count: listingsCount }, { count: ordersCount }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
    ]);

  const { data: paidOrdersData, count: paidOrdersCount } = await supabase
    .from("orders")
    .select("amount_cents", { count: "exact" })
    .in("status", SALE_STATUSES);

  const revenueCents = (paidOrdersData ?? []).reduce(
    (total, order) => total + (order.amount_cents ?? 0),
    0
  );

  const { count: deliveredCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "delivered");

  const { count: couponsUsedCount } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true });

  const { data: eventsData } = await supabase
    .from("system_events")
    .select("id, event_type, entity_type, entity_id, actor_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(120);

  const events = (eventsData ?? []) as SystemEvent[];

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Relatorios
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Panorama geral do Ganm Ols
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Usuarios
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {usersCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Anuncios
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {listingsCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Pedidos
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {ordersCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Vendas aprovadas
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {paidOrdersCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatCentsToBRL(revenueCents)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Pedidos entregues
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {deliveredCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Cupons usados
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {couponsUsedCount ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Eventos
            </p>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">
              Tudo que aconteceu recentemente
            </h3>
          </div>
          <span className="text-sm text-zinc-500">Total: {events.length}</span>
        </div>
        <div className="mt-5 grid gap-3">
          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
              Nenhum evento registrado ainda.
            </div>
          ) : (
            events.map((event) => {
              const { title, detail } = describeEvent(event);
              return (
                <div
                  key={event.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      {title}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      {detail}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{formatEventMeta(event)}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>{formatDateTime(event.created_at)}</p>
                    <p className="mt-1">Tipo: {event.event_type}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
