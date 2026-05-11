import { NextResponse } from "next/server";

import { getResolvedAffiliateProductBySlug } from "@/lib/affiliate/catalog";
import {
  buildAffiliateProductAbsoluteUrl,
} from "@/lib/affiliate/products";
import { verifyAffiliateClickToken } from "@/lib/auth/affiliate-click-token";
import { sendAdminEventAlertEmail } from "@/lib/brevo/admin-alerts";
import { resolveClickActor } from "@/lib/auth/click-actor";
import { sendBrowserPushNotification } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIds } from "@/lib/supabase/admins";
import { createRouteClient } from "@/lib/supabase/route";

type RouteContext = {
  params:
    | Promise<{
        slug: string;
      }>
    | {
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

  const source = requestUrl.searchParams.get("source")?.trim() || "recommendation";
  const fromSlug = requestUrl.searchParams.get("from")?.trim() || null;
  const clickToken = requestUrl.searchParams.get("click_token");
  const isTrustedClick = verifyAffiliateClickToken(clickToken, {
    type: "recommendation",
    slug: product.slug,
    source,
    fromSlug,
  });

  if (!isTrustedClick) {
    return NextResponse.redirect(
      new URL(buildAffiliateProductAbsoluteUrl(product.slug), request.url),
      302
    );
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

  await Promise.allSettled([
    admin.from("analytics_events").insert({
      event_type: "affiliate_recommendation_click",
      user_id: user?.id ?? null,
      metadata: {
        affiliate_product_slug: product.slug,
        affiliate_product_title: product.title,
        partner_name: product.partnerName,
        source,
        from_slug: fromSlug,
        actor_label: clickActor.label,
        actor_email: clickActor.email,
        actor_type: clickActor.isAuthenticated ? "authenticated" : "visitor",
      },
    }),

    admin.from("system_events").insert({
      event_type: "affiliate_recommendation_click",
      entity_type: "affiliate_product",
      entity_id: null,
      actor_id: user?.id ?? null,
      metadata: {
        affiliate_product_slug: product.slug,
        affiliate_product_title: product.title,
        partner_name: product.partnerName,
        source,
        from_slug: fromSlug,
        actor_label: clickActor.label,
        actor_email: clickActor.email,
        actor_type: clickActor.isAuthenticated ? "authenticated" : "visitor",
      },
    }),

    adminIds.length > 0
      ? admin.from("notifications").insert(
          adminIds.map((adminId) => ({
            user_id: adminId,
            title: "Clique em recomendacao de parceiro",
            body: `${clickActor.label} abriu ${product.shortTitle} a partir de ${sourceLabel}.`,
            link: `/parceiros/${product.slug}`,
            type: "general",
          }))
        )
      : Promise.resolve(),

    adminIds.length > 0
      ? sendBrowserPushNotification({
          userIds: adminIds,
          payload: {
            title: "Clique em recomendacao de parceiro",
            body: `${clickActor.label} abriu ${product.shortTitle} a partir de ${sourceLabel}.`,
            url: `/parceiros/${product.slug}`,
            tag: `affiliate-recommendation-${product.slug}-${source}`,
            lang: "pt-BR",
          },
        })
      : Promise.resolve(),

    sendAdminEventAlertEmail({
      admin,
      subject: `Clique em recomendacao: ${product.shortTitle}`,
      eyebrow: "Clique em recomendacao",
      title: `${clickActor.label} abriu uma recomendacao`,
      intro:
        "Um clique em recomendacao interna de produto parceiro acabou de acontecer na GANM OLS.",
      body: [
        `Produto clicado: ${product.title}`,
        `Parceiro: ${product.partnerName}`,
        `Tipo: ${sourceLabel}`,
        `Origem do clique: ${fromSlug || "Nao informado"}`,
        `Quem clicou: ${clickActor.label}`,
        `Tipo de acesso: ${clickActor.isAuthenticated ? "Conta logada" : "Visitante"}`,
        `Email: ${clickActor.email ?? "Visitante sem login"}`,
        `ID da conta: ${clickActor.userId ?? "Nao autenticado"}`,
        `Slug do produto: ${product.slug}`,
      ],
      actionLabel: "Abrir pagina do produto",
      actionUrl: buildAffiliateProductAbsoluteUrl(product.slug),
      origin,
      tags: [
        "admin-alert",
        "affiliate-recommendation-click",
        `source:${source}`,
        `slug:${product.slug}`,
      ],
    }),
  ]);

  return NextResponse.redirect(
    new URL(buildAffiliateProductAbsoluteUrl(product.slug), request.url),
    302
  );
}
