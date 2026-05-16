import Link from "next/link";

import { listAffiliateProducts } from "@/lib/affiliate/catalog";
import { getAllBlogPosts } from "@/lib/blog/posts";
import { requireAdmin } from "@/lib/admin/require-admin";
import { loadSellerFunnelSnapshot } from "@/lib/admin/seller-funnel";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { loadPushAudienceStats } from "@/lib/push/campaigns";
import {
  isNotificationAiConfigured,
  loadSmartPushOpportunities,
} from "@/lib/push/intelligence";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type PushAuditLogRow = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string | null;
};

type PushListingRow = {
  id: string;
  title: string | null;
  price_cents: number | null;
  status: string | null;
  moderation_status: string | null;
  is_featured: boolean | null;
  is_week_offer: boolean | null;
};

type CatalogOfferOption = {
  value: string;
  label: string;
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

function readString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function readNumber(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" ? value : 0;
}

function readNestedNumber(
  metadata: Record<string, unknown> | null,
  key: string,
  nestedKey: string
) {
  const value = metadata?.[key];
  if (!value || typeof value !== "object") {
    return 0;
  }

  const nested = (value as Record<string, unknown>)[nestedKey];
  return typeof nested === "number" ? nested : 0;
}

function readNestedBoolean(
  metadata: Record<string, unknown> | null,
  key: string,
  nestedKey: string
) {
  const value = metadata?.[key];
  if (!value || typeof value !== "object") {
    return false;
  }

  const nested = (value as Record<string, unknown>)[nestedKey];
  return nested === true;
}

function readDoubleNestedNumber(
  metadata: Record<string, unknown> | null,
  key: string,
  nestedKey: string,
  targetKey: string
) {
  const value = metadata?.[key];
  if (!value || typeof value !== "object") {
    return 0;
  }

  const nested = (value as Record<string, unknown>)[nestedKey];
  if (!nested || typeof nested !== "object") {
    return 0;
  }

  const target = (nested as Record<string, unknown>)[targetKey];
  return typeof target === "number" ? target : 0;
}

function describePushLog(log: PushAuditLogRow) {
  const audienceLabel = readString(log.details, "audienceLabel");
  const payload =
    typeof log.details?.payload === "object" && log.details?.payload
      ? (log.details.payload as Record<string, unknown>)
      : null;
  const post =
    typeof log.details?.post === "object" && log.details?.post
      ? (log.details.post as Record<string, unknown>)
      : null;
  const title = readString(payload, "title");
  const url = readString(payload, "url");
  const sent = readNestedNumber(log.details, "browserResult", "sent");
  const failed = readNestedNumber(log.details, "browserResult", "failed");
  const nativeDelivered = readDoubleNestedNumber(
    log.details,
    "browserResult",
    "nativeResult",
    "sent"
  );
  const nativeFailed = readDoubleNestedNumber(
    log.details,
    "browserResult",
    "nativeResult",
    "failed"
  );
  const recipients = readNumber(log.details, "userIdsCount");
  const inAppCount = readNumber(log.details, "inAppCount");
  const emailRecipients = readNumber(log.details, "emailRecipients");
  const emailOk = readNestedBoolean(log.details, "emailResult", "ok");

  if (log.action === "push_blog_campaign_sent") {
    return {
      title: "Campanha editorial",
      detail: [
        audienceLabel ? `Publico: ${audienceLabel}` : null,
        typeof post?.title === "string" ? `Artigo: ${post.title}` : null,
        `Contas alvo: ${recipients}`,
        `Web: ${sent}`,
        `App: ${nativeDelivered}`,
        `Falhas web: ${failed}`,
        `Falhas app: ${nativeFailed}`,
      ]
        .filter(Boolean)
        .join(" | "),
      url,
    };
  }

  if (log.action === "push_offer_campaign_sent") {
    return {
      title: title || "Campanha de oferta",
      detail: [
        audienceLabel ? `Publico: ${audienceLabel}` : null,
        `Contas alvo: ${recipients}`,
        `Push web: ${sent}`,
        `Push app: ${nativeDelivered}`,
        `Falhas web: ${failed}`,
        `Falhas app: ${nativeFailed}`,
        `Internas: ${inAppCount}`,
        `Emails: ${emailRecipients}`,
        `Email ${emailOk ? "aceito" : "com falha"}`,
      ]
        .filter(Boolean)
        .join(" | "),
      url,
    };
  }

  if (log.action === "push_smart_campaign_sent") {
    return {
      title: title || "Campanha inteligente",
      detail: [
        audienceLabel ? `Publico: ${audienceLabel}` : null,
        `Contas alvo: ${recipients}`,
        `Push web: ${sent}`,
        `Push app: ${nativeDelivered}`,
        `Internas: ${inAppCount}`,
        `Emails: ${emailRecipients}`,
      ]
        .filter(Boolean)
        .join(" | "),
      url,
    };
  }

  if (log.action === "push_test_sent") {
    return {
      title: title || "Teste push",
      detail: [
        audienceLabel ? `Publico: ${audienceLabel}` : null,
        `Contas alvo: ${recipients}`,
        `Web: ${sent}`,
        `App: ${nativeDelivered}`,
        `Falhas web: ${failed}`,
        `Falhas app: ${nativeFailed}`,
      ]
        .filter(Boolean)
        .join(" | "),
      url,
    };
  }

  return {
    title: title || "Campanha push",
    detail: [
      audienceLabel ? `Publico: ${audienceLabel}` : null,
      `Contas alvo: ${recipients}`,
      `Web: ${sent}`,
      `App: ${nativeDelivered}`,
      `Falhas web: ${failed}`,
      `Falhas app: ${nativeFailed}`,
    ]
      .filter(Boolean)
      .join(" | "),
    url,
  };
}

function ProductBehaviorFields({
  options,
}: {
  options: CatalogOfferOption[];
}) {
  return (
    <>
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Filtro opcional por produto
        </label>
        <select
          name="product_signal"
          defaultValue="all"
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
        >
          <option value="all">Sem filtro por produto</option>
          <option value="product-visit">Quem visitou um produto especifico</option>
          <option value="product-buy-click">
            Quem clicou em comprar de um produto especifico
          </option>
          <option value="product-intent">
            Quem demonstrou intencao em um produto especifico
          </option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Produto alvo do filtro
        </label>
        <select
          name="product_selection"
          defaultValue=""
          className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
        >
          <option value="">Sem produto especifico</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-zinc-500">
          Use esse filtro para mandar push so para quem interagiu com um item
          exato do catalogo.
        </p>
      </div>
    </>
  );
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { supabase } = await requireAdmin();

  const [
    audienceStats,
    sellerFunnel,
    affiliateProducts,
    smartOpportunities,
    { data: listingsData },
    { data: auditLogData },
  ] = await Promise.all([
    loadPushAudienceStats(),
    loadSellerFunnelSnapshot(),
    listAffiliateProducts({ includeInactive: true }),
    loadSmartPushOpportunities(),
    supabase
      .from("listings")
      .select(
        "id, title, price_cents, status, moderation_status, is_featured, is_week_offer"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("admin_audit_logs")
      .select("id, action, details, created_at")
      .in("action", [
        "push_test_sent",
        "push_campaign_sent",
        "push_offer_campaign_sent",
        "push_smart_campaign_sent",
        "push_blog_campaign_sent",
      ])
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const recentPosts = [
    ...getAllBlogPosts("pt").slice(0, 6).map((post) => ({
      value: `pt:${post.slug}`,
      label: `PT-BR | ${post.title}`,
    })),
    ...getAllBlogPosts("en").slice(0, 6).map((post) => ({
      value: `en:${post.slug}`,
      label: `EN | ${post.title}`,
    })),
  ];

  const listingOffers = ((listingsData ?? []) as PushListingRow[])
    .filter(
      (listing) =>
        listing.status === "active" &&
        (!listing.moderation_status || listing.moderation_status === "approved")
    )
    .sort((left, right) => {
      const leftPriority =
        (left.is_week_offer ? 2 : 0) + (left.is_featured ? 1 : 0);
      const rightPriority =
        (right.is_week_offer ? 2 : 0) + (right.is_featured ? 1 : 0);
      return rightPriority - leftPriority;
    })
    .map((listing) => ({
      value: `listing:${listing.id}`,
      label: `Marketplace | ${listing.title || "Sem titulo"}${
        listing.price_cents ? ` | ${formatCentsToBRL(listing.price_cents)}` : ""
      }${
        listing.is_week_offer
          ? " | Oferta da semana"
          : listing.is_featured
            ? " | Destaque"
            : ""
      }`,
    }));

  const affiliateOffers = affiliateProducts
    .filter((product) => product.status === "active")
    .map((product) => ({
      value: `affiliate:${product.slug}`,
      label: `Afiliado | ${product.title} | ${formatCentsToBRL(product.priceCents)}${
        product.isWeekOffer
          ? " | Oferta da semana"
          : product.isFeatured
            ? " | Destaque"
            : ""
      }`,
    }));

  const catalogOffers = [...listingOffers, ...affiliateOffers] satisfies CatalogOfferOption[];
  const auditLogs = (auditLogData ?? []) as PushAuditLogRow[];
  const aiConfigured = isNotificationAiConfigured();

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

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Push
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Campanhas push do app e do navegador
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              Esta tela concentra testes, campanhas manuais e disparos editoriais
              com segmentacao por tipo de conta e por comportamento recente,
              incluindo quem visitou produto, clicou em comprar ou demonstrou
              intencao de compra nos ultimos 30 dias. O ritmo automatico diario
              continua em configuracoes.
            </p>
          </div>
          <Link
            href={ADMIN_PATHS.settings}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Abrir calendario de automacoes
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {audienceStats.map((audience) => (
          <div
            key={audience.audience}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {audience.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">
              {audience.deviceCount}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              dispositivos com push
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Navegador: {audience.browserDeviceCount} | App: {audience.nativeDeviceCount}
            </p>
            <p className="mt-3 text-sm text-zinc-600">
              {audience.userCount} conta(s). {audience.description}
            </p>

            <form action="/api/admin/push" method="post" className="mt-4">
              <input type="hidden" name="action" value="send_push_test" />
              <input type="hidden" name="redirect_to" value={ADMIN_PATHS.push} />
              <input
                type="hidden"
                name="audience"
                value={audience.audience}
              />
              <button
                type="submit"
                className="w-full rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
              >
                Enviar teste
              </button>
            </form>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inteligencia
            </p>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">
              Proximas campanhas recomendadas
            </h3>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              O motor analisa visitas, cliques em comprar, carrinho, recomendacoes
              e downsell dos ultimos 30 dias para sugerir qual oferta merece push,
              para qual publico e por qual motivo.
            </p>
          </div>
          <span
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${
              aiConfigured
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {aiConfigured
              ? "Copy generativa ativa"
              : "Motor inteligente ativo | copy por regra"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {smartOpportunities.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500 xl:col-span-3">
              Ainda nao ha sinal recente suficiente para recomendar uma campanha.
            </div>
          ) : (
            smartOpportunities.slice(0, 3).map((opportunity) => (
              <article
                key={opportunity.selection}
                className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      Score {opportunity.score}
                    </p>
                    <h4 className="mt-2 text-base font-semibold text-zinc-900">
                      {opportunity.productLabel}
                    </h4>
                  </div>
                  {opportunity.image ? (
                    <img
                      src={opportunity.image}
                      alt=""
                      className="h-14 w-14 rounded-2xl border border-zinc-200 bg-white object-contain p-1"
                    />
                  ) : null}
                </div>

                <p className="mt-3 text-sm text-zinc-600">{opportunity.reason}</p>

                <div className="mt-4 grid gap-2 text-xs text-zinc-600">
                  <span className="rounded-full bg-white px-3 py-1.5">
                    Publico: {opportunity.audienceLabel}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5">
                    Filtro: {opportunity.productSignalLabel}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    {opportunity.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">{opportunity.body}</p>
                </div>

                <form action="/api/admin/push" method="post" className="mt-4">
                  <input
                    type="hidden"
                    name="action"
                    value="send_smart_offer_campaign"
                  />
                  <input type="hidden" name="redirect_to" value={ADMIN_PATHS.push} />
                  <input
                    type="hidden"
                    name="selection"
                    value={opportunity.selection}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Enviar recomendacao
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Funil vendedor
            </p>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">
              Ativacao e conversao real
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Leitura dos {sellerFunnel.periodLabel.toLowerCase()} para cadastro,
              perfil, anuncio, abertura de email e clique.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Pedidos pagos hoje: <span className="font-semibold">{sellerFunnel.paidOrders}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          {[
            { label: "Vendedores", value: sellerFunnel.sellers, detail: "cadastros seller" },
            {
              label: "Endereco completo",
              value: sellerFunnel.sellersWithCompleteAddress,
              detail: "prontos para vender",
            },
            {
              label: "Com anuncio",
              value: sellerFunnel.sellersWithListings,
              detail: "vendedores com listagem",
            },
            {
              label: "Pedidos pagos",
              value: sellerFunnel.paidOrders,
              detail: "conversao final",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                {item.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-zinc-900">
                {item.value}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Seller lifecycle
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-700">
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Envios</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.lifecycle.requests}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Entregues</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.lifecycle.delivered}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Vendedores alcancados</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.lifecycle.deliveredUsers}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Abriram</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.lifecycle.openedUsers}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 xl:col-span-2">
                <span className="block text-xs text-zinc-500">Clicaram</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.lifecycle.clickedUsers}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Perfil incompleto
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-700">
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Envios</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.profileReminder.requests}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Entregues</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.profileReminder.delivered}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Vendedores alcancados</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.profileReminder.deliveredUsers}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <span className="block text-xs text-zinc-500">Abriram</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.profileReminder.openedUsers}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 xl:col-span-2">
                <span className="block text-xs text-zinc-500">Clicaram</span>
                <span className="mt-1 block text-lg font-semibold text-zinc-900">
                  {sellerFunnel.profileReminder.clickedUsers}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Oferta
          </p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900">
            Enviar oferta do catalogo
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Escolha um anuncio ja publicado ou um afiliado ativo. A campanha sai
            com link, imagem, notificacao interna, push e email de forma automatica.
            Os publicos de comportamento usam contas logadas com push ativo.
          </p>

          <form action="/api/admin/push" method="post" className="mt-5 grid gap-4">
            <input type="hidden" name="action" value="send_catalog_offer_campaign" />
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.push} />

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Publico
              </label>
              <select
                name="audience"
                defaultValue="all-users"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                {audienceStats.map((audience) => (
                  <option key={audience.audience} value={audience.audience}>
                    {audience.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Oferta do catalogo
              </label>
              <select
                name="offer"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
                required
              >
                {catalogOffers.length === 0 ? (
                  <option value="">Nenhuma oferta ativa encontrada</option>
                ) : (
                  catalogOffers.map((offer) => (
                    <option key={offer.value} value={offer.value}>
                      {offer.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            <ProductBehaviorFields options={catalogOffers} />

            <button
              type="submit"
              disabled={catalogOffers.length === 0}
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Enviar oferta do catalogo
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Campanha manual
          </p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900">
            Enviar push com texto direto
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Use para ofertas, lembretes, recuperacao e avisos internos.
          </p>

          <form action="/api/admin/push" method="post" className="mt-5 grid gap-4">
            <input type="hidden" name="action" value="send_push_campaign" />
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.push} />

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Publico
              </label>
              <select
                name="audience"
                defaultValue="all-users"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                {audienceStats.map((audience) => (
                  <option key={audience.audience} value={audience.audience}>
                    {audience.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Titulo
              </label>
              <input
                name="title"
                maxLength={80}
                placeholder="Ex.: Seu perfil precisa ser completado"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Texto
              </label>
              <textarea
                name="body"
                rows={4}
                maxLength={180}
                placeholder="Texto curto da notificacao"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Link de abertura
              </label>
              <input
                name="url"
                defaultValue="/"
                placeholder="/conta ou https://www.ganmols.com/..."
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
              />
            </div>

            <ProductBehaviorFields options={catalogOffers} />

            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Enviar campanha push
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Editorial
          </p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900">
            Enviar artigo com capa completa
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Usa a capa do artigo como imagem completa na notificacao do blog.
          </p>

          <form
            action="/api/admin/push"
            method="post"
            className="mt-5 grid gap-4"
          >
            <input type="hidden" name="action" value="send_blog_push_campaign" />
            <input type="hidden" name="redirect_to" value={ADMIN_PATHS.push} />

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Publico
              </label>
              <select
                name="audience"
                defaultValue="all-users"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                {audienceStats.map((audience) => (
                  <option key={audience.audience} value={audience.audience}>
                    {audience.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Artigo
              </label>
              <select
                name="article"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
                required
              >
                {recentPosts.map((post) => (
                  <option key={post.value} value={post.value}>
                    {post.label}
                  </option>
                ))}
              </select>
            </div>

            <ProductBehaviorFields options={catalogOffers} />

            <button
              type="submit"
              className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700"
            >
              Enviar artigo via push
            </button>
          </form>
        </section>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Historico
          </p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900">
            Ultimas campanhas e testes
          </h3>
        </div>

        <div className="mt-5 grid gap-3">
          {auditLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
              Nenhuma campanha push registrada ainda.
            </div>
          ) : (
            auditLogs.map((log) => {
              const info = describePushLog(log);
              return (
                <div
                  key={log.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {info.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{info.detail}</p>
                      {info.url ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          Destino: {info.url}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                      {formatDateTime(log.created_at)}
                    </span>
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
