import { NextResponse } from "next/server";

import { getResolvedAffiliateProductBySlug } from "@/lib/affiliate/catalog";
import { buildAffiliateProductAbsoluteUrl } from "@/lib/affiliate/products";
import { resolveClickActor } from "@/lib/auth/click-actor";
import { sendAdminEventAlertEmail } from "@/lib/brevo/admin-alerts";
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

type DownsellRequestBody = {
  currentTitle?: string;
  products?: Array<{
    slug?: string;
    title?: string;
  }>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: RouteContext) {
  const resolvedParams = await Promise.resolve(context.params);
  const product = await getResolvedAffiliateProductBySlug(resolvedParams.slug);

  if (!product) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let body: DownsellRequestBody = {};

  try {
    body = (await request.json()) as DownsellRequestBody;
  } catch {
    body = {};
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const currentTitle = readString(body.currentTitle) || product.title;
  const options = Array.isArray(body.products)
    ? body.products
        .map((item) => ({
          slug: readString(item?.slug),
          title: readString(item?.title),
        }))
        .filter((item) => item.slug)
    : [];

  const { supabase } = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const clickActor = await resolveClickActor(supabase, user);
  const adminIds = await getAdminUserIds(admin).catch(() => []);

  await Promise.allSettled([
    admin.from("analytics_events").insert({
      event_type: "affiliate_downsell_open",
      user_id: user?.id ?? null,
      metadata: {
        affiliate_product_slug: product.slug,
        affiliate_product_title: currentTitle,
        actor_label: clickActor.label,
        actor_email: clickActor.email,
        actor_type: clickActor.isAuthenticated ? "authenticated" : "visitor",
        options,
      },
    }),

    admin.from("system_events").insert({
      event_type: "affiliate_downsell_open",
      entity_type: "affiliate_product",
      entity_id: null,
      actor_id: user?.id ?? null,
      metadata: {
        affiliate_product_slug: product.slug,
        affiliate_product_title: currentTitle,
        actor_label: clickActor.label,
        actor_email: clickActor.email,
        actor_type: clickActor.isAuthenticated ? "authenticated" : "visitor",
        options,
      },
    }),

    adminIds.length > 0
      ? admin.from("notifications").insert(
          adminIds.map((adminId) => ({
            user_id: adminId,
            title: "Downsell exibido em parceiro",
            body: `${clickActor.label} abriu o downsell de ${product.shortTitle}.`,
            link: `/parceiros/${product.slug}`,
            type: "general",
          }))
        )
      : Promise.resolve(),

    adminIds.length > 0
      ? sendBrowserPushNotification({
          userIds: adminIds,
          payload: {
            title: "Downsell exibido em parceiro",
            body: `${clickActor.label} abriu o downsell de ${product.shortTitle}.`,
            url: `/parceiros/${product.slug}`,
            tag: `affiliate-downsell-${product.slug}`,
            lang: "pt-BR",
          },
        })
      : Promise.resolve(),

    sendAdminEventAlertEmail({
      admin,
      subject: `Downsell exibido: ${product.shortTitle}`,
      eyebrow: "Downsell exibido",
      title: `${clickActor.label} abriu o downsell`,
      intro:
        "O modal de downsell foi exibido em uma pagina de produto parceiro da GANM OLS.",
      body: [
        `Produto atual: ${currentTitle}`,
        `Slug do produto: ${product.slug}`,
        `Quem viu: ${clickActor.label}`,
        `Tipo de acesso: ${clickActor.isAuthenticated ? "Conta logada" : "Visitante"}`,
        `Email: ${clickActor.email ?? "Visitante sem login"}`,
        `ID da conta: ${clickActor.userId ?? "Nao autenticado"}`,
        `Opcoes exibidas: ${
          options.length > 0
            ? options.map((item) => item.title || item.slug).join(" | ")
            : "Nenhuma opcao informada"
        }`,
      ],
      actionLabel: "Abrir pagina do produto",
      actionUrl: buildAffiliateProductAbsoluteUrl(product.slug),
      origin,
      tags: [
        "admin-alert",
        "affiliate-downsell-open",
        `slug:${product.slug}`,
      ],
    }),
  ]);

  return NextResponse.json({ ok: true });
}
