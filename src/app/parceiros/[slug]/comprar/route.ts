import { NextResponse } from "next/server";

import { getResolvedAffiliateProductBySlug } from "@/lib/affiliate/catalog";
import { verifyAffiliateClickToken } from "@/lib/auth/affiliate-click-token";
import { sendMetaAffiliateClickEvent } from "@/lib/analytics/metaConversions";
import { sendAdminEventAlertEmail } from "@/lib/brevo/admin-alerts";
import { resolveClickActor } from "@/lib/auth/click-actor";
import { sendBrowserPushNotification } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIds } from "@/lib/supabase/admins";
import { createRouteClient } from "@/lib/supabase/route";

type RouteContext = {
  params: Promise<{
    slug: string;
  }> | {
    slug: string;
  };
};

export async function GET(request: Request, context: RouteContext) {
  const resolvedParams = await Promise.resolve(context.params);
  const requestUrl = new URL(request.url);

  if (requestUrl.searchParams.has("_rsc")) {
    return new NextResponse(null, { status: 204 });
  }

  const product = await getResolvedAffiliateProductBySlug(resolvedParams.slug);

  if (!product) {
    return NextResponse.redirect(new URL("/parceiros", request.url), 302);
  }

  const source = requestUrl.searchParams.get("source")?.trim() || null;
  const clickToken = requestUrl.searchParams.get("click_token");
  const isTrustedClick = verifyAffiliateClickToken(clickToken, {
    type: "buy",
    slug: product.slug,
    source,
  });

  if (!isTrustedClick) {
    return NextResponse.redirect(product.externalUrl, 302);
  }

  const origin = requestUrl.origin;
  const { supabase } = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const clickActor = await resolveClickActor(supabase, user);
  const sourceLabel = source || "Sem origem informada";
  const adminIds = await getAdminUserIds(admin).catch(() => []);
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIpAddress = forwardedFor
    ? forwardedFor.split(",")[0]?.trim() || null
    : null;
  const clientUserAgent = request.headers.get("user-agent");
  const eventId = `affiliate-click-${product.slug}-${Date.now()}`;

  await Promise.allSettled([
    admin.from("analytics_events").insert({
      event_type: "affiliate_click",
      user_id: user?.id ?? null,
      metadata: {
        affiliate_product_slug: product.slug,
        affiliate_product_title: product.title,
        partner_name: product.partnerName,
        destination_url: product.externalUrl,
        source,
        actor_label: clickActor.label,
        actor_email: clickActor.email,
        actor_type: clickActor.isAuthenticated ? "authenticated" : "visitor",
      },
    }),

    admin.from("system_events").insert({
      event_type: "affiliate_outbound_click",
      entity_type: "affiliate_product",
      entity_id: null,
      actor_id: user?.id ?? null,
      metadata: {
        affiliate_product_slug: product.slug,
        affiliate_product_title: product.title,
        partner_name: product.partnerName,
        destination_url: product.externalUrl,
        source,
        actor_label: clickActor.label,
        actor_email: clickActor.email,
        actor_type: clickActor.isAuthenticated ? "authenticated" : "visitor",
      },
    }),

    adminIds.length > 0
      ? admin.from("notifications").insert(
          adminIds.map((adminId) => ({
            user_id: adminId,
            title: "Clique em comprar de parceiro",
            body: `${clickActor.label} clicou em comprar em ${product.shortTitle}.`,
            link: `/parceiros/${product.slug}`,
            type: "general",
          }))
        )
      : Promise.resolve(),

    adminIds.length > 0
      ? sendBrowserPushNotification({
          userIds: adminIds,
          payload: {
            title: "Clique em comprar de parceiro",
            body: `${clickActor.label} clicou em comprar em ${product.shortTitle}.`,
            url: `/parceiros/${product.slug}`,
            tag: `affiliate-buy-${product.slug}`,
            lang: "pt-BR",
          },
        })
      : Promise.resolve(),

    sendMetaAffiliateClickEvent({
      eventSourceUrl: requestUrl.toString(),
      eventId,
      clientIpAddress,
      clientUserAgent,
      contentId: `affiliate-${product.slug}`,
      contentName: product.title,
      partner: product.partnerName,
      value: product.priceCents / 100,
      currency: "BRL",
    }),

    sendAdminEventAlertEmail({
      admin,
      subject: `Clique em comprar: ${product.shortTitle}`,
      eyebrow: "Clique em parceiro",
      title: `${clickActor.label} clicou em comprar`,
      intro:
        "Um clique de compra em produto parceiro acabou de acontecer na GANM OLS.",
      body: [
        `Produto: ${product.title}`,
        `Parceiro: ${product.partnerName}`,
        `Origem: ${sourceLabel}`,
        `Quem clicou: ${clickActor.label}`,
        `Tipo de acesso: ${clickActor.isAuthenticated ? "Conta logada" : "Visitante"}`,
        `Email: ${clickActor.email ?? "Visitante sem login"}`,
        `ID da conta: ${clickActor.userId ?? "Nao autenticado"}`,
        `Slug: ${product.slug}`,
      ],
      actionLabel: "Abrir anuncios",
      actionPath: "/painel-ganm-ols/anuncios",
      origin,
      tags: ["admin-alert", "affiliate-click", `slug:${product.slug}`],
    }),
  ]);

  return NextResponse.redirect(product.externalUrl, 302);
}
