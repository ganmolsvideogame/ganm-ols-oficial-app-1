import { requireAdmin } from "@/lib/admin/require-admin";
import {
  formatDaySchedule,
  formatHourSchedule,
  loadEmailAutomationSettings,
  stringifySchedule,
} from "@/lib/automation/email-settings";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { listActiveBrowserPushSubscriptions } from "@/lib/push/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type SiteSettingRow = {
  key: string;
  value: string | null;
  updated_at: string | null;
};

type AuctionSettingsRow = {
  id: string;
  min_increment_percent: number;
  extend_minutes: number;
  extend_window_minutes: number;
  created_at: string | null;
};

type PaymentMethodRow = {
  id: string;
  provider: string;
  method: string;
  enabled: boolean;
  created_at: string | null;
};

type ShippingRateRow = {
  id: string;
  carrier: string;
  service: string;
  base_price_cents: number;
  per_kg_price_cents: number;
  enabled: boolean;
  created_at: string | null;
};

type PackagePresetRow = {
  id: string;
  name: string;
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  created_at: string | null;
};

type AutomationEventRow = {
  event_type: string;
  entity_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
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

function statusTone(enabled: boolean) {
  return enabled
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function readMetaString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function automationTone(event: AutomationEventRow) {
  const status = readMetaString(event.metadata, "status");
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function describeAutomationEvent(event: AutomationEventRow) {
  const stage = readMetaString(event.metadata, "stage");
  const flow = readMetaString(event.metadata, "flow");
  const sentTo = readMetaString(event.metadata, "sent_to");
  const status = readMetaString(event.metadata, "status") || "registrado";

  const labels: Record<string, string> = {
    seller_onboarding_email_sent: "Email de onboarding do vendedor",
    seller_onboarding_notification_sent: "Notificacao de onboarding do vendedor",
    seller_listing_recovery_email_sent: "Email de recuperacao de anuncio",
    seller_listing_recovery_notification_sent: "Notificacao de recuperacao de anuncio",
    seller_post_listing_email_sent: "Email pos-primeiro anuncio",
    seller_post_listing_notification_sent: "Notificacao pos-primeiro anuncio",
    seller_relationship_email_sent: "Email de relacionamento do vendedor",
    seller_relationship_notification_sent: "Notificacao de relacionamento",
    seller_profile_push_sent: "Lembrete de perfil incompleto",
    blog_broadcast_sent: "Broadcast do blog",
    abandoned_cart_email_sent: "Email de carrinho abandonado",
    seller_listing_started: "Formulario de anuncio iniciado",
  };

  return {
    title: labels[event.event_type] ?? event.event_type,
    detail: [
      flow ? `Fluxo: ${flow}` : null,
      stage ? `Etapa: ${stage}` : null,
      sentTo ? `Destino: ${sentTo}` : null,
      `Status: ${status}`,
    ]
      .filter(Boolean)
      .join(" | "),
  };
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { supabase } = await requireAdmin();

  const [
    { data: siteSettingsData },
    { data: auctionSettingsData },
    { data: paymentMethodsData },
    { data: shippingRatesData },
    { data: packagePresetsData },
    { data: automationEventsData },
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select("key, value, updated_at")
      .order("key", { ascending: true }),
    supabase
      .from("auction_settings")
      .select("id, min_increment_percent, extend_minutes, extend_window_minutes, created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("payment_methods")
      .select("id, provider, method, enabled, created_at")
      .order("provider", { ascending: true })
      .order("method", { ascending: true }),
    supabase
      .from("shipping_rates")
      .select("id, carrier, service, base_price_cents, per_kg_price_cents, enabled, created_at")
      .order("carrier", { ascending: true })
      .order("service", { ascending: true }),
    supabase
      .from("package_presets")
      .select("id, name, weight_grams, length_cm, width_cm, height_cm, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("system_events")
      .select("event_type, entity_id, actor_id, metadata, created_at")
      .in("event_type", [
        "seller_onboarding_email_sent",
        "seller_onboarding_notification_sent",
        "seller_listing_recovery_email_sent",
        "seller_listing_recovery_notification_sent",
        "seller_post_listing_email_sent",
        "seller_post_listing_notification_sent",
        "seller_relationship_email_sent",
        "seller_relationship_notification_sent",
        "seller_profile_push_sent",
        "blog_broadcast_sent",
        "abandoned_cart_email_sent",
        "seller_listing_started",
      ])
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const automationSettings = await loadEmailAutomationSettings(supabase);
  const pushSubscribers = await listActiveBrowserPushSubscriptions();

  const siteSettings = (siteSettingsData ?? []) as SiteSettingRow[];
  const auctionSettings = ((auctionSettingsData ?? [])[0] ?? null) as AuctionSettingsRow | null;
  const paymentMethods = (paymentMethodsData ?? []) as PaymentMethodRow[];
  const shippingRates = (shippingRatesData ?? []) as ShippingRateRow[];
  const packagePresets = (packagePresetsData ?? []) as PackagePresetRow[];
  const automationEvents = (automationEventsData ?? []) as AutomationEventRow[];

  const calendarCards = [
    {
      label: "Transacional",
      schedule: "Imediato",
      detail: "Cadastro, compra aprovada, etiqueta, rastreio, suporte e alertas criticos entram sem fila.",
    },
    {
      label: "Fluxo vendedor",
      schedule: "09:30 todo dia",
      detail: "Roda como agenda central do app: onboarding, recuperacao de anuncio, pos-primeiro anuncio e relacionamento.",
    },
    {
      label: "Sem primeiro anuncio",
      schedule: formatDaySchedule(automationSettings.sellerOnboardingDays),
      detail: "Boas-vindas, tutorial, ajustes de conversao e ultimo lembrete.",
    },
    {
      label: "Anuncio iniciado",
      schedule: formatHourSchedule(automationSettings.sellerListingRecoveryHours),
      detail: "Recupera vendedor que comecou o formulario e nao publicou.",
    },
    {
      label: "Perfil incompleto",
      schedule: automationSettings.sellerProfileReminderEnabled
        ? `a cada ${automationSettings.sellerProfileReminderIntervalDays} dia(s) | 09:30`
        : "Desativado",
      detail: "Lembra o vendedor de completar endereco, CEP, logo, banner e descricao da loja.",
    },
    {
      label: "Pos-primeiro anuncio",
      schedule: formatDaySchedule(automationSettings.sellerPostListingDays),
      detail: "Otimiza titulo, fotos, preco e empurra a primeira venda.",
    },
    {
      label: "Relacionamento",
      schedule: formatDaySchedule(automationSettings.sellerRelationshipDays),
      detail: "Reativa loja parada e incentiva renovar catalogo.",
    },
    {
      label: "Carrinho abandonado",
      schedule: `${automationSettings.buyerAbandonedCartDelayHours}h`,
      detail: "Comprador recebe lembrete para voltar ao checkout.",
    },
    {
      label: "Blog e newsletter",
      schedule: automationSettings.blogBroadcastEnabled
        ? "10:05 todo dia"
        : "Desativado",
      detail:
        automationSettings.blogBroadcastAudience === "all-users"
          ? "Dispara o artigo mais recente do blog para todas as contas com email, push e notificacao interna."
          : automationSettings.blogBroadcastAudience === "admins"
            ? "Dispara o artigo mais recente do blog somente para admins."
            : "Dispara o artigo mais recente do blog para a newsletter cadastrada.",
    },
  ];

  return (
    <main className="space-y-8">
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

      <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Chaves do site", value: siteSettings.length },
          { label: "Metodos de pagamento", value: paymentMethods.length },
          { label: "Regras de frete", value: shippingRates.length },
          { label: "Dispositivos push", value: pushSubscribers.length },
          { label: "Disparos recentes", value: automationEvents.length },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Automacoes
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Calendario de emails, push e notificacoes
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              Este bloco organiza o ritmo do produto como app: hora do fluxo de vendedor,
              hora do blog, lembrete de perfil incompleto e os disparos transacionais
              imediatos.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Frequency cap atual:{" "}
            <span className="font-semibold text-zinc-900">
              {automationSettings.frequencyCapHours}h
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {calendarCards.map((item) => (
            <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                {item.label}
              </p>
              <p className="mt-3 text-xl font-semibold text-zinc-900">{item.schedule}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.detail}</p>
            </div>
          ))}
        </div>

        <form action="/api/admin/settings" method="post" className="mt-6 grid gap-4 xl:grid-cols-2">
          <input type="hidden" name="action" value="save_email_automation_settings" />
          <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <h3 className="text-base font-semibold text-zinc-900">Fluxos para vendedores</h3>
            <div className="mt-4 grid gap-4">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Onboarding sem primeiro anuncio</span>
                <input type="checkbox" name="seller_onboarding_enabled" defaultChecked={automationSettings.sellerOnboardingEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Dias do onboarding</label>
                <input name="seller_onboarding_days" defaultValue={stringifySchedule(automationSettings.sellerOnboardingDays)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Recuperacao de criacao de anuncio</span>
                <input type="checkbox" name="seller_listing_recovery_enabled" defaultChecked={automationSettings.sellerListingRecoveryEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Horas de recuperacao</label>
                <input name="seller_listing_recovery_hours" defaultValue={stringifySchedule(automationSettings.sellerListingRecoveryHours)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Pos-primeiro anuncio</span>
                <input type="checkbox" name="seller_post_listing_enabled" defaultChecked={automationSettings.sellerPostListingEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Dias pos-primeiro anuncio</label>
                <input name="seller_post_listing_days" defaultValue={stringifySchedule(automationSettings.sellerPostListingDays)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Relacionamento continuo</span>
                <input type="checkbox" name="seller_relationship_enabled" defaultChecked={automationSettings.sellerRelationshipEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Dias de relacionamento</label>
                <input name="seller_relationship_days" defaultValue={stringifySchedule(automationSettings.sellerRelationshipDays)} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Lembrete de perfil incompleto</span>
                <input type="checkbox" name="seller_profile_reminder_enabled" defaultChecked={automationSettings.sellerProfileReminderEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Intervalo em dias</label>
                  <input name="seller_profile_reminder_interval_days" type="number" min={1} defaultValue={automationSettings.sellerProfileReminderIntervalDays} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
                </div>
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
                  Rodagem diaria em producao: 09:30 no horario de Brasilia.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <h3 className="text-base font-semibold text-zinc-900">Fluxos para compradores</h3>
            <div className="mt-4 grid gap-4">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Carrinho abandonado</span>
                <input type="checkbox" name="buyer_abandoned_cart_enabled" defaultChecked={automationSettings.buyerAbandonedCartEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Horas para carrinho abandonado</label>
                <input name="buyer_abandoned_cart_delay_hours" type="number" min={1} defaultValue={automationSettings.buyerAbandonedCartDelayHours} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Broadcast automatico do blog</span>
                <input type="checkbox" name="blog_broadcast_enabled" defaultChecked={automationSettings.blogBroadcastEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Publico do blog</label>
                <select name="blog_broadcast_audience" defaultValue={automationSettings.blogBroadcastAudience} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  <option value="newsletter">Newsletter</option>
                  <option value="all-users">Todas as contas</option>
                  <option value="admins">Admins</option>
                </select>
                <p className="mt-2 text-xs text-zinc-500">
                  Rodagem diaria em producao: 10:05 no horario de Brasilia.
                </p>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <span>Espelhar em notificacoes internas</span>
                <input type="checkbox" name="lifecycle_notifications_enabled" defaultChecked={automationSettings.lifecycleNotificationsEnabled} className="h-4 w-4 rounded border-zinc-300" />
              </label>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Frequency cap em horas</label>
                <input name="frequency_cap_hours" type="number" min={0} defaultValue={automationSettings.frequencyCapHours} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
                <p className="mt-2 text-xs text-zinc-500">
                  Evita disparos de vendedor muito proximos uns dos outros.
                </p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2">
            <button type="submit" className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white">
              Salvar calendario de automacoes
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <form action="/api/admin/settings" method="post">
            <input type="hidden" name="action" value="run_seller_lifecycle" />
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
            <button type="submit" className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white">
              Rodar fluxo de vendedores agora
            </button>
          </form>

          <form action="/api/admin/settings" method="post">
            <input type="hidden" name="action" value="run_seller_profile_reminders" />
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
            <button type="submit" className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700">
              Rodar lembrete de perfil agora
            </button>
          </form>

          <form action="/api/admin/settings" method="post">
            <input type="hidden" name="action" value="run_buyer_abandoned_cart" />
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
            <input type="hidden" name="buyer_abandoned_cart_enabled_override" value={String(automationSettings.buyerAbandonedCartEnabled)} />
            <input type="hidden" name="buyer_abandoned_cart_delay_hours_override" value={String(automationSettings.buyerAbandonedCartDelayHours)} />
            <input type="hidden" name="lifecycle_notifications_enabled_override" value={String(automationSettings.lifecycleNotificationsEnabled)} />
            <button type="submit" className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700">
              Rodar carrinho abandonado agora
            </button>
          </form>

          <form action="/api/admin/settings" method="post">
            <input type="hidden" name="action" value="run_blog_broadcast" />
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
            <button type="submit" className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700">
              Rodar blog agora
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-3">
          {automationEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
              Nenhum disparo registrado ainda.
            </div>
          ) : (
            automationEvents.map((event) => {
              const info = describeAutomationEvent(event);
              return (
                <div key={`${event.event_type}-${event.created_at}-${event.entity_id ?? "none"}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{info.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{info.detail}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${automationTone(event)}`}>
                      {readMetaString(event.metadata, "status") || "registrado"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{formatDateTime(event.created_at)}</p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Site settings
          </p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">Chaves de configuracao</h2>
        </div>

        <form action="/api/admin/settings" method="post" className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="action" value="upsert_site_setting" />
          <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
          <input
            name="key"
            placeholder="site_name"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            required
          />
          <input
            name="value"
            placeholder="Valor"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm md:col-span-2"
            required
          />
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Salvar chave
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-3">
          {siteSettings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
              Nenhuma chave cadastrada.
            </div>
          ) : (
            siteSettings.map((setting) => (
              <form
                key={setting.key}
                action="/api/admin/settings"
                method="post"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
              >
                <input type="hidden" name="action" value="upsert_site_setting" />
                <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Key</label>
                    <input
                      name="key"
                      defaultValue={setting.key}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="min-w-[240px] flex-[2]">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Value</label>
                    <input
                      name="value"
                      defaultValue={setting.value ?? ""}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                  >
                    Atualizar
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">Atualizado em {formatDateTime(setting.updated_at)}</p>
              </form>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Leiloes
          </p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900">Regras de extensao e incremento</h2>
        </div>

        <form action="/api/admin/settings" method="post" className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="action" value="upsert_auction_settings" />
          <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
          <input type="hidden" name="auction_settings_id" value={auctionSettings?.id ?? ""} />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Incremento minimo (%)
            </label>
            <input
              name="min_increment_percent"
              type="number"
              min="1"
              defaultValue={auctionSettings?.min_increment_percent ?? 25}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Extensao (min)
            </label>
            <input
              name="extend_minutes"
              type="number"
              min="0"
              defaultValue={auctionSettings?.extend_minutes ?? 2}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Janela de extensao (min)
            </label>
            <input
              name="extend_window_minutes"
              type="number"
              min="0"
              defaultValue={auctionSettings?.extend_window_minutes ?? 2}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Salvar regras de leilao
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          Ultima atualizacao: {formatDateTime(auctionSettings?.created_at ?? null)}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Metodos de pagamento</h2>
          <div className="mt-4 grid gap-3">
            {paymentMethods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                Nenhum metodo cadastrado.
              </div>
            ) : (
              paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {method.provider} | {method.method}
                      </p>
                      <p className="text-xs text-zinc-500">Criado em {formatDateTime(method.created_at)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(method.enabled)}`}>
                      {method.enabled ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <form action="/api/admin/settings" method="post" className="mt-3">
                    <input type="hidden" name="action" value="set_payment_method" />
                    <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
                    <input type="hidden" name="payment_method_id" value={method.id} />
                    <input type="hidden" name="enabled" value={method.enabled ? "false" : "true"} />
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      {method.enabled ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Regras de frete</h2>
          <div className="mt-4 grid gap-3">
            {shippingRates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                Nenhuma regra de frete cadastrada.
              </div>
            ) : (
              shippingRates.map((rate) => (
                <div
                  key={rate.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {rate.carrier} | {rate.service}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Base: {formatCentsToBRL(rate.base_price_cents)} | Kg: {formatCentsToBRL(rate.per_kg_price_cents)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(rate.enabled)}`}>
                      {rate.enabled ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <form action="/api/admin/settings" method="post" className="mt-3">
                    <input type="hidden" name="action" value="set_shipping_rate" />
                    <input type="hidden" name="redirect_to" value={ADMIN_PATHS.settings} />
                    <input type="hidden" name="shipping_rate_id" value={rate.id} />
                    <input type="hidden" name="enabled" value={rate.enabled ? "false" : "true"} />
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      {rate.enabled ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Presets de embalagem</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {packagePresets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
              Nenhum preset de embalagem cadastrado.
            </div>
          ) : (
            packagePresets.map((preset) => (
              <div
                key={preset.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm"
              >
                <p className="font-semibold text-zinc-900">{preset.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {preset.weight_grams}g | {preset.length_cm}x{preset.width_cm}x{preset.height_cm} cm
                </p>
                <p className="mt-1 text-xs text-zinc-500">Criado em {formatDateTime(preset.created_at)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
