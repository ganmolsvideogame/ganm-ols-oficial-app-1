import "server-only";

type WelcomeTemplateInput = {
  displayName: string;
  role: "buyer" | "seller";
  actionUrl: string;
};

type SellerOnboardingStage =
  | "welcome"
  | "tutorial"
  | "conversion_tips"
  | "last_call";

type SellerRecoveryStage = "resume_soon" | "resume_today" | "help_available";

type SellerPostListingStage =
  | "optimize_title"
  | "upgrade_listing"
  | "first_sale_push";

type SellerRelationshipStage = "reactivate_store" | "renew_catalog";

type SellerLifecycleTemplateInput = {
  displayName: string;
  actionUrl: string;
};

type SellerProfileCompletionTemplateInput = {
  displayName: string;
  actionUrl: string;
  missingItems: string[];
};

type OrderApprovedTemplateInput = {
  displayName: string;
  listingTitle: string;
  orderId: string;
  actionUrl: string;
  role: "buyer" | "seller";
};

type CartAlertTemplateInput = {
  buyerLabel: string;
  listingTitle: string;
  actionUrl: string;
};

type AbandonedCartTemplateInput = {
  displayName: string;
  itemCount: number;
  listingTitles: string[];
  actionUrl: string;
};

type ShippingLabelTemplateInput = {
  displayName: string;
  listingTitle: string;
  orderId: string;
  actionUrl: string;
  printUrl: string;
};

type TrackingTemplateInput = {
  displayName: string;
  listingTitle: string;
  orderId: string;
  trackingCode: string;
  actionUrl: string;
};

type AdminEventTemplateInput = {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  body: string[];
  actionLabel: string;
  actionUrl: string;
  secondaryActionLabel?: string;
  secondaryActionUrl?: string;
};

type BlogNewsletterWelcomeTemplateInput = {
  locale: "pt" | "en";
};

type BlogArticleEmailTemplateInput = {
  locale: "pt" | "en";
  articleTitle: string;
  articleSummary: string;
  articleUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.ganmols.com"
  );
}

function resolveBrandLogoUrl(theme: "light" | "dark" = "light") {
  const baseUrl = normalizeBaseUrl();
  const assetPath =
    theme === "dark"
      ? "/logoinvertidalogo.png"
      : "/ganm ols logo para email.png";

  return new URL(assetPath, baseUrl).toString();
}

function resolveSiteUrl(path: string) {
  return new URL(path, normalizeBaseUrl()).toString();
}

function joinListingTitles(titles: string[]) {
  const normalized = titles.map((title) => title.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return "seus produtos";
  }
  if (normalized.length === 1) {
    return normalized[0];
  }
  if (normalized.length === 2) {
    return `${normalized[0]} e ${normalized[1]}`;
  }
  return `${normalized[0]}, ${normalized[1]} e mais ${normalized.length - 2}`;
}

function joinReadableList(values: string[]) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return "detalhes essenciais do seu perfil";
  }
  if (normalized.length === 1) {
    return normalized[0];
  }
  if (normalized.length === 2) {
    return `${normalized[0]} e ${normalized[1]}`;
  }
  return `${normalized.slice(0, -1).join(", ")} e ${normalized.at(-1)}`;
}

function renderFooter() {
  const brandLogoUrl = resolveBrandLogoUrl("light");
  const privacyUrl = resolveSiteUrl("/politica-de-privacidade");
  const contactUrl = resolveSiteUrl("/contato");
  const sellerUrl = resolveSiteUrl("/vender");

  return `
    <div style="margin-top:32px;border-top:1px solid #e7e5e4;padding:24px 32px 30px;background:#fffdfa;">
      <div style="text-align:center;">
        <img src="${brandLogoUrl}" alt="GANM OLS" width="176" style="display:inline-block;max-width:176px;width:100%;height:auto;" />
        <p style="margin:18px 0 0;color:#6b7280;font-size:13px;line-height:1.7;">
          Voce recebeu esta mensagem porque existe uma atividade importante na sua conta da GANM OLS.
        </p>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.7;">
          <a href="${privacyUrl}" style="color:#111827;text-decoration:underline;">Politica de Privacidade</a>
          <span style="color:#9ca3af;"> | </span>
          <a href="${contactUrl}" style="color:#111827;text-decoration:underline;">Central de Ajuda</a>
          <span style="color:#9ca3af;"> | </span>
          <a href="${sellerUrl}" style="color:#111827;text-decoration:underline;">Quero vender</a>
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
          (c) 2026 GANM OLS. Marketplace gamer com operacao no Brasil.
        </p>
      </div>
    </div>
  `;
}

function renderFrame(params: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string[];
  actionLabel: string;
  actionUrl: string;
  secondaryActionLabel?: string;
  secondaryActionUrl?: string;
}) {
  const brandLogoUrl = resolveBrandLogoUrl("light");
  const bodyHtml = params.body
    .map(
      (line) =>
        `<p style="margin:0 0 14px;color:#27272a;font-size:15px;line-height:1.8;">${escapeHtml(line)}</p>`
    )
    .join("");

  const secondaryActionHtml =
    params.secondaryActionLabel && params.secondaryActionUrl
      ? `
          <a href="${params.secondaryActionUrl}" style="display:inline-block;margin-top:14px;color:#111827;text-decoration:none;font-size:14px;font-weight:600;">
            ${escapeHtml(params.secondaryActionLabel)}
          </a>
        `
      : "";

  return `
    <div style="background:#f6efef;padding:32px 12px;font-family:Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ede9e8;border-radius:28px;overflow:hidden;box-shadow:0 14px 40px rgba(17,24,39,0.06);">
        <div style="padding:36px 32px 16px;text-align:center;">
          <img src="${brandLogoUrl}" alt="GANM OLS" width="204" style="display:inline-block;max-width:204px;width:100%;height:auto;" />
        </div>
        <div style="padding:0 32px 8px;text-align:center;">
          <div style="color:#6b7280;font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;">${escapeHtml(params.eyebrow)}</div>
          <div style="margin-top:18px;color:#111827;font-size:36px;line-height:1.16;font-weight:800;">${escapeHtml(params.title)}</div>
          <div style="margin-top:16px;color:#4b5563;font-size:17px;line-height:1.8;">${escapeHtml(params.intro)}</div>
        </div>
        <div style="padding:18px 32px 0;">
          ${bodyHtml}
          <div style="margin-top:28px;text-align:center;">
            <a href="${params.actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:14px;padding:16px 28px;font-size:15px;font-weight:700;">
              ${escapeHtml(params.actionLabel)}
            </a>
            ${secondaryActionHtml}
          </div>
        </div>
        ${renderFooter()}
      </div>
    </div>
  `;
}

export function buildWelcomeEmail(input: WelcomeTemplateInput) {
  const name = input.displayName.trim() || "Usuario";
  const isSeller = input.role === "seller";
  const subject = isSeller
    ? "Sua conta de vendedor ja esta pronta na GANM OLS"
    : "Sua conta foi criada na GANM OLS";
  const html = renderFrame({
    eyebrow: "GANM OLS",
    title: isSeller ? "Sua loja pode entrar no ar" : "Conta criada com sucesso",
    intro: isSeller
      ? "Publique seu primeiro anuncio, organize sua vitrine e acompanhe pedidos pelo painel do vendedor."
      : "Sua conta ja esta pronta para acompanhar favoritos, pedidos e novas ofertas.",
    body: isSeller
      ? [
          `${name}, sua conta de vendedor foi ativada na GANM OLS.`,
          "Seu proximo passo e publicar o primeiro anuncio com titulo forte, fotos claras e preco competitivo.",
        ]
      : [
          `${name}, sua conta foi criada na GANM OLS.`,
          "Agora voce pode acompanhar compras, favoritos e ofertas dentro da plataforma.",
        ],
    actionLabel: isSeller ? "Criar meu primeiro anuncio" : "Abrir minha conta",
    actionUrl: input.actionUrl,
  });
  const text = isSeller
    ? `${name}, sua conta de vendedor foi ativada na GANM OLS. Publique seu primeiro anuncio em: ${input.actionUrl}`
    : `${name}, sua conta foi criada na GANM OLS. Acesse: ${input.actionUrl}`;

  return { subject, html, text };
}

export function buildSellerOnboardingEmail(
  stage: SellerOnboardingStage,
  input: SellerLifecycleTemplateInput
) {
  const name = input.displayName.trim() || "Vendedor";

  if (stage === "welcome") {
    return buildWelcomeEmail({
      displayName: name,
      role: "seller",
      actionUrl: input.actionUrl,
    });
  }

  if (stage === "tutorial") {
    const subject = "Seu primeiro anuncio pode entrar no ar hoje";
    const html = renderFrame({
      eyebrow: "Primeiro anuncio",
      title: "Publique com mais clareza e confianca",
      intro:
        "Quanto mais claro o anuncio, maior a chance de clique e de conversa com compradores reais.",
      body: [
        `${name}, voce ja pode colocar sua vitrine no ar na GANM OLS.`,
        "Use um titulo objetivo, destaque o estado do produto, descreva o que acompanha e envie fotos nitidas da frente, laterais e detalhes.",
      ],
      actionLabel: "Continuar meu anuncio",
      actionUrl: input.actionUrl,
    });

    return {
      subject,
      html,
      text: `${name}, publique seu primeiro anuncio com titulo claro, descricao objetiva e boas fotos. Continue em: ${input.actionUrl}`,
    };
  }

  if (stage === "conversion_tips") {
    const subject = "3 ajustes simples para o seu anuncio vender melhor";
    const html = renderFrame({
      eyebrow: "Mais conversao",
      title: "Ajustes que aumentam sua chance de venda",
      intro:
        "Pequenos detalhes fazem diferenca quando o comprador compara varios anuncios ao mesmo tempo.",
      body: [
        `${name}, revise o titulo, escolha a melhor foto como capa e confira se o preco esta competitivo.`,
        "Tambem vale reforcar itens inclusos, defeitos honestos e beneficios como frete gratis quando fizer sentido para sua margem.",
      ],
      actionLabel: "Revisar meu anuncio",
      actionUrl: input.actionUrl,
    });

    return {
      subject,
      html,
      text: `${name}, revise titulo, foto principal e preco do seu anuncio para vender melhor. Acesse: ${input.actionUrl}`,
    };
  }

  const subject = "Precisa de ajuda para publicar seu primeiro anuncio?";
  const html = renderFrame({
    eyebrow: "Ultimo lembrete",
    title: "Sua vitrine ainda pode entrar no ar",
    intro:
      "Se faltou tempo ou voce travou em algum detalhe, volte ao painel e finalize quando quiser.",
    body: [
      `${name}, sua conta de vendedor continua pronta para publicar na GANM OLS.`,
      "Finalize seu primeiro anuncio para receber visualizacoes, organizar seu painel e comecar a vender dentro da plataforma.",
    ],
    actionLabel: "Finalizar meu anuncio",
    actionUrl: input.actionUrl,
  });

  return {
    subject,
    html,
    text: `${name}, sua conta esta pronta e seu primeiro anuncio ainda pode ser publicado. Finalize em: ${input.actionUrl}`,
  };
}

export function buildSellerListingRecoveryEmail(
  stage: SellerRecoveryStage,
  input: SellerLifecycleTemplateInput
) {
  const name = input.displayName.trim() || "Vendedor";

  if (stage === "resume_soon") {
    const subject = "Seu anuncio ficou pela metade";
    const html = renderFrame({
      eyebrow: "Anuncio em aberto",
      title: "Continue de onde voce parou",
      intro:
        "Seu cadastro de produto ainda nao foi publicado. Basta retomar o formulario e concluir os ultimos campos.",
      body: [
        `${name}, vimos que voce comecou um anuncio e ainda nao finalizou.`,
        "Volte ao painel para concluir titulo, preco, descricao e imagens. Sua vitrine pode entrar no ar em poucos minutos.",
      ],
      actionLabel: "Retomar anuncio",
      actionUrl: input.actionUrl,
    });

    return {
      subject,
      html,
      text: `${name}, seu anuncio ficou pela metade. Retome a publicacao em: ${input.actionUrl}`,
    };
  }

  if (stage === "resume_today") {
    const subject = "Seu produto ainda pode entrar no ar hoje";
    const html = renderFrame({
      eyebrow: "Retome a publicacao",
      title: "Volte ao formulario e publique sua oferta",
      intro:
        "Se voce ja separou fotos e preco, falta pouco para colocar o anuncio na frente dos compradores.",
      body: [
        `${name}, seu rascunho ainda nao virou anuncio publicado.`,
        "Concluir agora ajuda a nao perder o contexto do produto e acelera sua primeira oportunidade de venda.",
      ],
      actionLabel: "Continuar anuncio",
      actionUrl: input.actionUrl,
    });

    return {
      subject,
      html,
      text: `${name}, volte ao formulario e publique sua oferta em: ${input.actionUrl}`,
    };
  }

  const subject = "Se travou em alguma etapa, a GANM OLS te ajuda a publicar";
  const html = renderFrame({
    eyebrow: "Ajuda para publicar",
    title: "Seu anuncio ainda esta esperando a conclusao",
    intro:
      "Se faltou alguma informacao, voce pode revisar tudo no painel e terminar no seu ritmo.",
    body: [
      `${name}, ainda da tempo de publicar esse produto com mais clareza e confianca.`,
      "Retome o anuncio, revise as fotos e finalize a oferta para colocar sua loja em movimento.",
    ],
    actionLabel: "Voltar ao painel do vendedor",
    actionUrl: input.actionUrl,
  });

  return {
    subject,
    html,
    text: `${name}, ainda da tempo de concluir seu anuncio. Volte ao painel: ${input.actionUrl}`,
  };
}

export function buildSellerPostListingEmail(
  stage: SellerPostListingStage,
  input: SellerLifecycleTemplateInput
) {
  const name = input.displayName.trim() || "Vendedor";

  if (stage === "optimize_title") {
    const subject = "Seu anuncio ja esta no ar: ajuste titulo e capa";
    const html = renderFrame({
      eyebrow: "Anuncio publicado",
      title: "Faca seu anuncio chamar mais atencao",
      intro:
        "Depois da publicacao, os maiores ganhos costumam vir de titulo forte, foto principal melhor e preco bem posicionado.",
      body: [
        `${name}, sua oferta ja entrou no ar na GANM OLS.`,
        "Agora vale revisar se o titulo deixa claro o produto, se a capa mostra o item inteiro e se o preco esta alinhado com o mercado.",
      ],
      actionLabel: "Melhorar meu anuncio",
      actionUrl: input.actionUrl,
    });

    return {
      subject,
      html,
      text: `${name}, seu anuncio ja esta publicado. Revise titulo, foto principal e preco em: ${input.actionUrl}`,
    };
  }

  if (stage === "upgrade_listing") {
    const subject = "Fotos melhores e preco certo aumentam sua chance de venda";
    const html = renderFrame({
      eyebrow: "Mais desempenho",
      title: "Refine sua oferta para ganhar confianca",
      intro:
        "Compradores convertem melhor quando enxergam detalhes, estado real do produto e argumentos objetivos no anuncio.",
      body: [
        `${name}, vale complementar seu anuncio com fotos extras, itens inclusos e observacoes honestas sobre o estado do produto.`,
        "Esses ajustes ajudam a diminuir duvidas e aumentam a confianca de quem esta prestes a comprar.",
      ],
      actionLabel: "Atualizar meu anuncio",
      actionUrl: input.actionUrl,
    });

    return {
      subject,
      html,
      text: `${name}, melhore fotos, descricao e argumentos do seu anuncio em: ${input.actionUrl}`,
    };
  }

  const subject = "Acelere sua primeira venda na GANM OLS";
  const html = renderFrame({
    eyebrow: "Primeira venda",
    title: "Seu anuncio pode ganhar mais tracao",
    intro:
      "A primeira venda costuma vir mais rapido quando a vitrine passa confianca e o anuncio responde as principais duvidas do comprador.",
    body: [
      `${name}, revise preco, disponibilidade, qualidade das fotos e clareza da descricao.`,
      "Se fizer sentido, publique tambem mais produtos para aumentar sua presenca e gerar mais visitas na loja.",
    ],
    actionLabel: "Abrir meus anuncios",
    actionUrl: input.actionUrl,
  });

  return {
    subject,
    html,
    text: `${name}, ajuste sua vitrine e aumente a chance da primeira venda em: ${input.actionUrl}`,
  };
}

export function buildSellerRelationshipEmail(
  stage: SellerRelationshipStage,
  input: SellerLifecycleTemplateInput
) {
  const name = input.displayName.trim() || "Vendedor";

  if (stage === "reactivate_store") {
    const subject = "Sua loja pode ganhar mais movimento com alguns ajustes";
    const html = renderFrame({
      eyebrow: "Reativar vitrine",
      title: "Volte a dar ritmo aos seus anuncios",
      intro:
        "Revisar preco, foto principal e disponibilidade costuma ajudar quando a vitrine esfria.",
      body: [
        `${name}, vale reabrir seus anuncios para atualizar informacoes, revisar o preco e reforcar a descricao.`,
        "Se voce tiver outros produtos, publicar novas ofertas tambem aumenta sua presenca dentro da GANM OLS.",
      ],
      actionLabel: "Revisar minha loja",
      actionUrl: input.actionUrl,
    });

    return {
      subject,
      html,
      text: `${name}, reative sua vitrine revisando anuncios e publicando novas ofertas em: ${input.actionUrl}`,
    };
  }

  const subject = "Hora de renovar o catalogo e voltar a atrair compradores";
  const html = renderFrame({
    eyebrow: "Renovar catalogo",
    title: "Sua loja pode voltar a chamar atencao",
    intro:
      "Quando o catalogo muda, a vitrine ganha novas oportunidades de clique e de conversa com compradores.",
    body: [
      `${name}, se seus anuncios ficaram parados, experimente renovar fotos, atualizar o preco e publicar novos produtos.`,
      "Uma loja ativa transmite mais confianca e ajuda a trazer compradores recorrentes para a GANM OLS.",
    ],
    actionLabel: "Atualizar meus anuncios",
    actionUrl: input.actionUrl,
  });

  return {
    subject,
    html,
    text: `${name}, renove o catalogo da sua loja em: ${input.actionUrl}`,
  };
}

export function buildSellerProfileCompletionEmail(
  input: SellerProfileCompletionTemplateInput
) {
  const name = input.displayName.trim() || "Vendedor";
  const missingItemsLabel = joinReadableList(input.missingItems);
  const subject = "Sua loja precisa completar alguns dados importantes";
  const html = renderFrame({
    eyebrow: "Perfil da loja",
    title: "Complete sua loja para vender com mais confianca",
    intro:
      "Compradores confiam mais quando a conta do vendedor esta completa e a loja publica mostra identidade clara.",
    body: [
      `${name}, seu anuncio ja esta no ar, mas seu perfil ainda precisa de alguns ajustes antes de transmitir mais confianca para quem vai comprar.`,
      `Faltando agora: ${missingItemsLabel}.`,
      "Atualize esses dados na sua conta para deixar a loja pronta, reduzir duvidas e melhorar a apresentacao publica da sua vitrine.",
    ],
    actionLabel: "Completar meu perfil",
    actionUrl: input.actionUrl,
  });

  return {
    subject,
    html,
    text: `${name}, sua loja ainda precisa completar: ${missingItemsLabel}. Atualize sua conta em: ${input.actionUrl}`,
  };
}

export function buildOrderApprovedEmail(input: OrderApprovedTemplateInput) {
  const name = input.displayName.trim() || (input.role === "seller" ? "Vendedor" : "Comprador");
  const title = input.listingTitle.trim() || "seu pedido";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const isSeller = input.role === "seller";
  const subject = isSeller
    ? `Nova venda aprovada: ${title}`
    : `Pagamento confirmado: ${title}`;
  const html = renderFrame({
    eyebrow: "Pagamento aprovado",
    title: isSeller ? "Venda confirmada" : "Compra confirmada",
    intro: isSeller
      ? "O pagamento foi aprovado e o pedido ja esta no seu painel para preparo e envio."
      : "O pagamento foi aprovado e o pedido ja esta em processamento.",
    body: isSeller
      ? [
          `${name}, a venda de ${title} foi aprovada na GANM OLS.`,
          `Pedido ${shortOrderId}. Revise os detalhes, acompanhe a etiqueta e envie dentro do prazo.`,
        ]
      : [
          `${name}, o pagamento de ${title} foi confirmado na GANM OLS.`,
          `Pedido ${shortOrderId}. Voce pode acompanhar o status completo na pagina da compra.`,
        ],
    actionLabel: isSeller ? "Ver venda" : "Ver compra",
    actionUrl: input.actionUrl,
  });
  const text = isSeller
    ? `${name}, a venda de ${title} foi aprovada. Pedido ${shortOrderId}. Acesse: ${input.actionUrl}`
    : `${name}, o pagamento de ${title} foi confirmado. Pedido ${shortOrderId}. Acesse: ${input.actionUrl}`;

  return { subject, html, text };
}

export function buildCartAlertEmail(input: CartAlertTemplateInput) {
  const title = input.listingTitle.trim() || "um produto";
  const subject = "Novo item adicionado ao carrinho na GANM OLS";
  const html = renderFrame({
    eyebrow: "Carrinho",
    title: "Novo interesse detectado",
    intro: "Um usuario adicionou um item ao carrinho e a equipe pode acompanhar esse sinal em tempo real.",
    body: [
      `${input.buyerLabel} adicionou ${title} ao carrinho.`,
      "Abra o anuncio para revisar o contexto e acompanhar o movimento.",
    ],
    actionLabel: "Abrir anuncio",
    actionUrl: input.actionUrl,
  });
  const text = `${input.buyerLabel} adicionou ${title} ao carrinho. Acesse: ${input.actionUrl}`;

  return { subject, html, text };
}

export function buildAbandonedCartEmail(input: AbandonedCartTemplateInput) {
  const name = input.displayName.trim() || "Jogador";
  const highlights = joinListingTitles(input.listingTitles);
  const subject =
    input.itemCount > 1
      ? "Seu carrinho ainda esta te esperando na GANM OLS"
      : "Seu produto ainda esta no carrinho da GANM OLS";
  const html = renderFrame({
    eyebrow: "Carrinho abandonado",
    title: "Seu carrinho ainda esta ativo",
    intro:
      input.itemCount > 1
        ? "Seus itens continuam reservados no carrinho. Se fizer sentido, finalize antes que a disponibilidade mude."
        : "Seu item ainda esta no carrinho. Se fizer sentido, finalize antes que a disponibilidade mude.",
    body: [
      `${name}, vimos que voce deixou ${highlights} no carrinho da GANM OLS.`,
      "Abra o checkout novamente para revisar frete, pagamento e disponibilidade atual.",
    ],
    actionLabel: "Voltar ao carrinho",
    actionUrl: input.actionUrl,
    secondaryActionLabel: "Ir para o checkout",
    secondaryActionUrl: resolveSiteUrl("/checkout/carrinho"),
  });
  const text = `${name}, seu carrinho ainda esta ativo com ${highlights}. Acesse: ${input.actionUrl}`;

  return { subject, html, text };
}

export function buildShippingLabelReadyEmail(
  input: ShippingLabelTemplateInput
) {
  const name = input.displayName.trim() || "Vendedor";
  const title = input.listingTitle.trim() || "seu pedido";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const subject = `Etiqueta liberada: ${title}`;
  const html = renderFrame({
    eyebrow: "Etiqueta pronta",
    title: "Sua etiqueta ja pode ser impressa",
    intro:
      "A etiqueta do pedido ja esta liberada. Agora e so imprimir, embalar e seguir com a postagem.",
    body: [
      `${name}, a etiqueta de ${title} foi liberada na GANM OLS.`,
      `Pedido ${shortOrderId}. Imprima a etiqueta e acompanhe o prazo de postagem no painel do vendedor.`,
    ],
    actionLabel: "Imprimir etiqueta",
    actionUrl: input.printUrl,
    secondaryActionLabel: "Ver venda",
    secondaryActionUrl: input.actionUrl,
  });
  const text = `${name}, a etiqueta do pedido ${shortOrderId} foi liberada. Imprima em: ${input.printUrl}`;

  return { subject, html, text };
}

export function buildTrackingAvailableEmail(input: TrackingTemplateInput) {
  const name = input.displayName.trim() || "Comprador";
  const title = input.listingTitle.trim() || "seu pedido";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const tracking = input.trackingCode.trim();
  const subject = `Rastreio disponivel: ${title}`;
  const html = renderFrame({
    eyebrow: "Rastreio disponivel",
    title: "Seu pedido ja tem codigo de rastreio",
    intro:
      "O envio avancou e voce ja pode acompanhar o trajeto do pedido pela sua conta.",
    body: [
      `${name}, o pedido ${shortOrderId} de ${title} recebeu um codigo de rastreio.`,
      `Codigo: ${tracking}. Abra a pagina da compra para acompanhar o envio completo.`,
    ],
    actionLabel: "Acompanhar pedido",
    actionUrl: input.actionUrl,
  });
  const text = `${name}, o pedido ${shortOrderId} agora possui rastreio ${tracking}. Acesse: ${input.actionUrl}`;

  return { subject, html, text };
}

export function buildAdminEventEmail(input: AdminEventTemplateInput) {
  const html = renderFrame({
    eyebrow: input.eyebrow,
    title: input.title,
    intro: input.intro,
    body: input.body,
    actionLabel: input.actionLabel,
    actionUrl: input.actionUrl,
    secondaryActionLabel: input.secondaryActionLabel,
    secondaryActionUrl: input.secondaryActionUrl,
  });
  const text = [
    input.title,
    input.intro,
    ...input.body,
    `${input.actionLabel}: ${input.actionUrl}`,
    input.secondaryActionLabel && input.secondaryActionUrl
      ? `${input.secondaryActionLabel}: ${input.secondaryActionUrl}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: input.subject,
    html,
    text,
  };
}

export function buildBlogNewsletterWelcomeEmail(
  input: BlogNewsletterWelcomeTemplateInput
) {
  if (input.locale === "en") {
    const subject = "You are in the GANM OLS blog newsletter";
    const html = renderFrame({
      eyebrow: "GANM OLS Blog",
      title: "Fresh articles, no algorithm in the middle",
      intro:
        "You are now on the list for new guides, retro reads, and editorial highlights from the GANM OLS blog.",
      body: [
        "Whenever a new article goes live, we can send it straight to your inbox.",
        "Expect launch guides, classic hardware stories, and features built for readers who actually care about games and collecting.",
      ],
      actionLabel: "Open the blog",
      actionUrl: resolveSiteUrl("/en/blog"),
    });

    return {
      subject,
      html,
      text:
        "You are now on the GANM OLS blog newsletter. Open the blog at https://www.ganmols.com/en/blog",
    };
  }

  const subject = "Você entrou na newsletter do blog da GANM OLS";
  const html = renderFrame({
    eyebrow: "Blog GANM OLS",
    title: "Artigos novos, sem depender de algoritmo",
    intro:
      "Você agora está na lista para receber novos guias, especiais retrô e leituras editoriais do blog da GANM OLS.",
    body: [
      "Sempre que uma leitura nova entrar no ar, ela pode chegar direto no seu email.",
      "A ideia aqui é simples: menos ruído, mais artigos bons sobre lançamentos, clássicos e o mercado gamer.",
    ],
    actionLabel: "Abrir o blog",
    actionUrl: resolveSiteUrl("/blog"),
  });

  return {
    subject,
    html,
    text:
      "Você agora está na newsletter do blog da GANM OLS. Abra o blog em https://www.ganmols.com/blog",
  };
}

export function buildBlogArticleEmail(input: BlogArticleEmailTemplateInput) {
  if (input.locale === "en") {
    const subject = `New read: ${input.articleTitle}`;
    const html = renderFrame({
      eyebrow: "GANM OLS Blog",
      title: input.articleTitle,
      intro:
        "A new piece just landed on the GANM OLS blog, with the same editorial focus on retro hardware, releases, and gaming history.",
      body: [
        input.articleSummary,
        "Open the article and read it with the full layout, internal links, and follow-up suggestions already live on the site.",
      ],
      actionLabel: "Read the article",
      actionUrl: input.articleUrl,
      secondaryActionLabel: "Open the blog",
      secondaryActionUrl: resolveSiteUrl("/en/blog"),
    });

    return {
      subject,
      html,
      text: `${input.articleTitle}\n\n${input.articleSummary}\n\nRead it here: ${input.articleUrl}`,
    };
  }

  const subject = `Leitura nova: ${input.articleTitle}`;
  const html = renderFrame({
    eyebrow: "Blog GANM OLS",
    title: input.articleTitle,
    intro:
      "Entrou no ar uma leitura nova no blog da GANM OLS, com a mesma linha editorial focada em clássicos, hardware e cultura gamer.",
    body: [
      input.articleSummary,
      "Abra o artigo para ler a versão completa, com o layout editorial, os links internos e as próximas leituras já conectadas no site.",
    ],
    actionLabel: "Ler o artigo",
    actionUrl: input.articleUrl,
    secondaryActionLabel: "Abrir o blog",
    secondaryActionUrl: resolveSiteUrl("/blog"),
  });

  return {
    subject,
    html,
    text: `${input.articleTitle}\n\n${input.articleSummary}\n\nLeia aqui: ${input.articleUrl}`,
  };
}
