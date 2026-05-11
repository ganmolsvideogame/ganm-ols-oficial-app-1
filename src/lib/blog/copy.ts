import type { BlogLocale } from "@/lib/blog/locales";

type BlogUiCopy = {
  index: {
    eyebrow: string;
    title: string;
    description: string;
    focusLabel: string;
    featuredLabel: string;
    openGuideLabel: string;
    exploreCategoriesLabel: string;
    moreLabel: string;
    archiveTitle: string;
    publishedCountLabel: (count: number) => string;
    readArticleLabel: string;
  };
  article: {
    updatedLabel: string;
    relatedLabel: string;
    continueReadingLabel: string;
    otherGuidesLabel: string;
    viewAllLabel: string;
    openArticleLabel: string;
    closingLabel: string;
  };
  sidebar: {
    newsLabel: string;
    reviewsLabel: string;
    languageLabel: string;
    signInLabel: string;
    sellLabel: string;
  };
  promoRail: {
    cards: Array<{
      eyebrow: string;
      title: string;
      description: string;
      href: string;
      cta: string;
      tone: "dark" | "light" | "warm";
    }>;
  };
  comments: {
    sectionEyebrow: string;
    sectionTitle: string;
    countLabel: (count: number) => string;
    leaveCommentLabel: string;
    textareaPlaceholder: string;
    publishLabel: string;
    loginPrompt: string;
    loginLabel: string;
    emptyLabel: string;
    memberLabel: string;
    adminReplyLabel: string;
    adminReplyPlaceholder: string;
    sendReplyLabel: string;
  };
};

const BLOG_UI_COPY: Record<BlogLocale, BlogUiCopy> = {
  pt: {
    index: {
      eyebrow: "Blog GANM OLS",
      title: "Lançamentos, clássicos e histórias que movem a cultura gamer.",
      description:
        "Do Super Nintendo ao mercado retrô atual, reunimos guias, leituras e matérias para quem compra, vende e coleciona jogos na GANM OLS.",
      focusLabel: "Navegue por foco",
      featuredLabel: "Destaque da semana",
      openGuideLabel: "Abrir guia",
      exploreCategoriesLabel: "Explorar categorias",
      moreLabel: "Mais no blog",
      archiveTitle: "Todos os guias e leituras",
      publishedCountLabel: (count) =>
        `${count} ${count === 1 ? "artigo publicado" : "artigos publicados"}`,
      readArticleLabel: "Abrir artigo",
    },
    article: {
      updatedLabel: "Atualizado:",
      relatedLabel: "Artigos relacionados:",
      continueReadingLabel: "Continue lendo",
      otherGuidesLabel: "Outros guias da GANM OLS",
      viewAllLabel: "Ver todo o blog",
      openArticleLabel: "Abrir artigo",
      closingLabel: "Fechamento",
    },
    sidebar: {
      newsLabel: "Notícias",
      reviewsLabel: "Análises",
      languageLabel: "Idioma",
      signInLabel: "Entrar",
      sellLabel: "Vender",
    },
    promoRail: {
      cards: [
        {
          eyebrow: "GANM OLS",
          title: "Cadastre-se para vender seus jogos aqui",
          description:
            "Abra sua vitrine, publique fotos melhores e transforme tráfego editorial em anúncio pronto para vender.",
          href: "/vender/comece",
          cta: "Começar agora",
          tone: "dark",
        },
        {
          eyebrow: "Categorias",
          title: "Consoles clássicos e vitrines de nicho",
          description:
            "PlayStation, Nintendo, Xbox, retrô e acessórios em categorias pensadas para busca real.",
          href: "/categorias",
          cta: "Explorar categorias",
          tone: "light",
        },
        {
          eyebrow: "Comunidade",
          title: "Lojas ativas e anúncios da comunidade",
          description:
            "Descubra vitrines de vendedores reais e acompanhe a movimentação do marketplace.",
          href: "/lojas",
          cta: "Ver lojas",
          tone: "warm",
        },
      ],
    },
    comments: {
      sectionEyebrow: "Comunidade",
      sectionTitle: "Comentários do artigo",
      countLabel: (count) =>
        `${count} ${count === 1 ? "comentário" : "comentários"}`,
      leaveCommentLabel: "Deixe seu comentário",
      textareaPlaceholder: "Compartilhe sua opinião sobre este artigo.",
      publishLabel: "Publicar comentário",
      loginPrompt: "Faça login para comentar e acompanhar as respostas da equipe.",
      loginLabel: "Entrar para comentar",
      emptyLabel: "Ainda não há comentários neste artigo.",
      memberLabel: "Membro",
      adminReplyLabel: "Responder como admin",
      adminReplyPlaceholder: "Responder diretamente neste comentário.",
      sendReplyLabel: "Enviar resposta",
    },
  },
  en: {
    index: {
      eyebrow: "GANM OLS Blog",
      title: "New releases, classics, and stories that move gaming culture.",
      description:
        "From the Super Nintendo era to today's retro market, we publish guides, features, and reading built for people who buy, sell, and collect games on GANM OLS.",
      focusLabel: "Browse by focus",
      featuredLabel: "Featured this week",
      openGuideLabel: "Open feature",
      exploreCategoriesLabel: "Explore categories",
      moreLabel: "More from the blog",
      archiveTitle: "All guides and features",
      publishedCountLabel: (count) =>
        `${count} ${count === 1 ? "article published" : "articles published"}`,
      readArticleLabel: "Read article",
    },
    article: {
      updatedLabel: "Updated:",
      relatedLabel: "Related reads:",
      continueReadingLabel: "Keep reading",
      otherGuidesLabel: "More GANM OLS guides",
      viewAllLabel: "View the full blog",
      openArticleLabel: "Open article",
      closingLabel: "Closing note",
    },
    sidebar: {
      newsLabel: "News",
      reviewsLabel: "Features",
      languageLabel: "Language",
      signInLabel: "Sign in",
      sellLabel: "Sell",
    },
    promoRail: {
      cards: [],
    },
    comments: {
      sectionEyebrow: "Community",
      sectionTitle: "Article comments",
      countLabel: (count) =>
        `${count} ${count === 1 ? "comment" : "comments"}`,
      leaveCommentLabel: "Join the conversation",
      textareaPlaceholder: "Share your take on this article.",
      publishLabel: "Post comment",
      loginPrompt: "Sign in to comment and follow replies from the team.",
      loginLabel: "Sign in to comment",
      emptyLabel: "There are no comments on this article yet.",
      memberLabel: "Member",
      adminReplyLabel: "Reply as admin",
      adminReplyPlaceholder: "Reply directly inside this thread.",
      sendReplyLabel: "Send reply",
    },
  },
};

export function getBlogUiCopy(locale: BlogLocale) {
  return BLOG_UI_COPY[locale];
}
