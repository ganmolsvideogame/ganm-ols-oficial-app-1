import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAffiliateDisplayImageUrl, normalizeAffiliateImageUrls } from "@/lib/affiliate/images";
import { type AffiliateProduct, getAffiliateProducts as getStaticAffiliateProducts } from "@/lib/affiliate/products";
import { slugifyCategorySegment } from "@/lib/mock/data";
import { formatCentsToBRL } from "@/lib/utils/price";

const IMPORTED_AFFILIATE_PRODUCTS_KEY = "affiliate_imported_products_v1";

type ParsedImportEntry = {
  productUrl: string;
  affiliateUrl: string;
  videoUrl?: string | null;
};

type ImportedProductsResult = {
  imported: AffiliateProduct[];
  savedCount: number;
  importedCount: number;
  errors: string[];
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function normalizeText(value: string) {
  return decodeHtml(value)
    .replace(/\s+/g, " ")
    .trim();
}

function stripListMarker(value: string) {
  return value.replace(/^[\-\u2022]\s*/, "").trim();
}

function uppercaseFirstLetter(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanUrl(value: string) {
  return value.trim().replace(/[),.;]+$/g, "");
}

function extractUrls(line: string) {
  return Array.from(line.matchAll(/https?:\/\/\S+/gi)).map((match) => cleanUrl(match[0]));
}

function isVideoUrl(url: string) {
  return /\.(?:mp4|m3u8)(?:$|[?#])/i.test(url) || /dropbox\.com/i.test(url);
}

function isAffiliateUrl(url: string) {
  return /meli\.la/i.test(url);
}

function normalizeDropboxVideoUrl(url: string | null | undefined) {
  const raw = String(url ?? "").trim();
  if (!raw) {
    return null;
  }

  if (/dropbox\.com/i.test(raw)) {
    const normalized = raw
      .replace(/\?dl=0$/i, "?raw=1")
      .replace(/\?dl=1$/i, "?raw=1");

    if (/[?&]raw=1/i.test(normalized)) {
      return normalized;
    }

    return `${normalized}${normalized.includes("?") ? "&" : "?"}raw=1`;
  }

  return raw;
}

function extractMlImageAssetKey(url: string | null | undefined) {
  const raw = String(url ?? "").trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(/([0-9]+-ML[A-Z]{1,3}[0-9]+_[0-9]+)/i);
  return match ? match[1] : null;
}

function buildImportedProductIdentity(product: AffiliateProduct) {
  const firstImageKey = extractMlImageAssetKey(product.images[0]);
  if (firstImageKey) {
    return firstImageKey.toUpperCase();
  }

  return normalizeSearchText(product.title)
    .replace(/\b(preto|preta|branco|branca|cinza|azul|vermelho|vermelha)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getImportedProductScore(product: AffiliateProduct) {
  const hasPositivePrice = product.priceCents > 0 ? 1_000_000 : 0;
  const imageScore = Math.min(product.images.length, 8) * 10_000;
  const reviewScore = Math.round(product.rating * 100) + product.reviewCountLabel.length;
  const publishedScore = Date.parse(product.publishedAt || "") || 0;

  return hasPositivePrice + imageScore + reviewScore + publishedScore;
}

function normalizeImportedAffiliateProducts(products: AffiliateProduct[]) {
  const byIdentity = new Map<string, AffiliateProduct>();

  for (const product of products) {
    const normalizedProduct = {
      ...product,
      images: normalizeAffiliateImageUrls(product.images).slice(0, 8),
    };

    if (!normalizedProduct.priceCents || normalizedProduct.priceCents <= 0) {
      continue;
    }

    const identity = buildImportedProductIdentity(normalizedProduct);
    const current = byIdentity.get(identity);

    if (!current || getImportedProductScore(normalizedProduct) > getImportedProductScore(current)) {
      byIdentity.set(identity, normalizedProduct);
    }
  }

  return Array.from(byIdentity.values()).sort((left, right) =>
    left.title.localeCompare(right.title, "pt-BR")
  );
}

function extractProductImagesFromJsonLd(html: string) {
  const images: string[] = [];
  const matches = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );

  for (const match of matches) {
    const rawJson = match[1]?.trim();
    if (!rawJson) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawJson);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        const typeValue = Array.isArray(candidate?.["@type"])
          ? candidate["@type"].join(" ")
          : String(candidate?.["@type"] ?? "");

        if (!/product/i.test(typeValue)) {
          continue;
        }

        const candidateImages = candidate?.image;
        if (Array.isArray(candidateImages)) {
          images.push(...candidateImages.filter((value: unknown) => typeof value === "string"));
          continue;
        }

        if (typeof candidateImages === "string") {
          images.push(candidateImages);
        }
      }
    } catch {
      continue;
    }
  }

  return normalizeAffiliateImageUrls(images).slice(0, 8);
}

function extractMercadoLivrePictureUrls(html: string) {
  const templateMatch =
    html.match(/"template_zoom_2x":"([^"]+)"/i) ??
    html.match(/"template_2x":"([^"]+)"/i);
  const picturesMatch = html.match(/"pictures":\[([\s\S]*?)\],"previews"/i);

  if (!templateMatch || !picturesMatch) {
    return [] as string[];
  }

  const template = decodeHtml(templateMatch[1]).replace(/\\u002F/gi, "/");
  const pictureIds = Array.from(picturesMatch[1].matchAll(/"id":"([^"]+)"/gi)).map(
    (match) => match[1]
  );

  if (pictureIds.length === 0) {
    return [] as string[];
  }

  const urls = pictureIds.map((id) =>
    template
      .replace(/\{id\}/g, id)
      .replace(/\{sanitizedTitle\}/g, "")
  );

  return normalizeAffiliateImageUrls(urls).slice(0, 8);
}

function extractMercadoLivreImages(html: string, ogImage: string | null) {
  const pictureUrls = extractMercadoLivrePictureUrls(html);
  if (pictureUrls.length > 0) {
    return pictureUrls;
  }

  const jsonLdImages = extractProductImagesFromJsonLd(html);
  if (jsonLdImages.length > 0) {
    return jsonLdImages;
  }

  const allMatches = Array.from(
    html.matchAll(/https:\/\/http2\.mlstatic\.com\/D_[^"'\\\s]+/gi)
  ).map((match) => match[0]);

  const ogAssetKey = extractMlImageAssetKey(ogImage);
  const productMatches = ogAssetKey
    ? allMatches.filter((url) => url.includes(ogAssetKey))
    : allMatches;

  const normalized = normalizeAffiliateImageUrls(productMatches);

  if (normalized.length > 0) {
    return normalized.slice(0, 8);
  }

  if (ogImage) {
    return normalizeAffiliateImageUrls([ogImage]).slice(0, 8);
  }

  return [] as string[];
}

function inferFamilyMeta(title: string) {
  const haystack = normalizeSearchText(title);
  const hasPlayStationSignal =
    haystack.includes("playstation") ||
    haystack.includes("ps one") ||
    haystack.includes("psone") ||
    haystack.includes("ps1") ||
    haystack.includes("ps2") ||
    haystack.includes("ps3") ||
    haystack.includes("ps4") ||
    haystack.includes("ps5") ||
    haystack.includes("psp");
  const hasXboxSignal = haystack.includes("xbox") || haystack.includes("kinect");
  const hasNintendoSignal =
    haystack.includes("switch") ||
    haystack.includes("super nintendo") ||
    haystack.includes("snes") ||
    haystack.includes("super famicom") ||
    haystack.includes("famicom") ||
    haystack.includes("family computer") ||
    haystack.includes("game boy") ||
    haystack.includes("gba") ||
    haystack.includes("gamecube") ||
    haystack.includes("game cube") ||
    haystack.includes("nintendo 64") ||
    haystack.includes("n64") ||
    haystack.includes("wii");

  if ((hasPlayStationSignal && hasXboxSignal) || (hasNintendoSignal && hasXboxSignal) || (hasNintendoSignal && hasPlayStationSignal)) {
    return { brand: "Multiplataforma", familySlug: "acessorios", homeBadge: "Acessorios" };
  }

  if (hasNintendoSignal) {
    return { brand: "Nintendo", familySlug: "nintendo", homeBadge: "Nintendo" };
  }

  if (hasPlayStationSignal) {
    return { brand: "Sony", familySlug: "playstation", homeBadge: "PlayStation" };
  }

  if (
    haystack.includes("mega drive") ||
    haystack.includes("master system") ||
    haystack.includes("dreamcast") ||
    haystack.includes("dream cast") ||
    haystack.includes("saturn") ||
    haystack.includes("sega")
  ) {
    return { brand: "SEGA", familySlug: "sega", homeBadge: "SEGA" };
  }

  if (hasXboxSignal) {
    return { brand: "Microsoft", familySlug: "xbox", homeBadge: "Xbox" };
  }

  if (haystack.includes("atari") || haystack.includes("polyvox")) {
    return { brand: "Atari", familySlug: "atari", homeBadge: "Atari" };
  }

  return { brand: "Retro Games", familySlug: "acessorios", homeBadge: "Retro" };
}

function inferProductKind(title: string, description: string) {
  const titleHaystack = normalizeSearchText(title);
  const haystack = normalizeSearchText(`${title} ${description}`);
  const hasStrongConsoleSignal =
    titleHaystack.includes("console") || titleHaystack.includes("videogame");
  const hasPlatformConsoleSignal =
    titleHaystack.includes("playstation") ||
    titleHaystack.includes("ps one") ||
    titleHaystack.includes("ps1") ||
    titleHaystack.includes("ps2") ||
    titleHaystack.includes("ps3") ||
    titleHaystack.includes("ps4") ||
    titleHaystack.includes("psp") ||
    titleHaystack.includes("mega drive") ||
    titleHaystack.includes("master system") ||
    titleHaystack.includes("dreamcast") ||
    titleHaystack.includes("saturn") ||
    titleHaystack.includes("xbox") ||
    titleHaystack.includes("nintendo 64") ||
    titleHaystack.includes("n64") ||
    titleHaystack.includes("super nintendo") ||
    titleHaystack.includes("snes") ||
    titleHaystack.includes("switch") ||
    titleHaystack.includes("wii") ||
    titleHaystack.includes("gamecube") ||
    titleHaystack.includes("game cube") ||
    titleHaystack.includes("family computer") ||
    titleHaystack.includes("famicom");
  const hasGameSignal =
    /\bjogo\b/.test(titleHaystack) ||
    titleHaystack.includes("cartucho") ||
    titleHaystack.includes("fita") ||
    titleHaystack.includes("midia fisica");
  const startsAsAccessory =
    titleHaystack.startsWith("suporte") ||
    titleHaystack.startsWith("base ") ||
    titleHaystack.startsWith("combo") ||
    titleHaystack.startsWith("cooler") ||
    titleHaystack.startsWith("porta ") ||
    titleHaystack.startsWith("carregador") ||
    titleHaystack.startsWith("fone") ||
    titleHaystack.startsWith("stand ") ||
    titleHaystack.startsWith("cabo") ||
    titleHaystack.startsWith("adaptador") ||
    titleHaystack.startsWith("case") ||
    titleHaystack.startsWith("sensor") ||
    titleHaystack.startsWith("fonte") ||
    titleHaystack.startsWith("controle") ||
    titleHaystack.startsWith("cartao") ||
    titleHaystack.startsWith("cartão") ||
    titleHaystack.startsWith("memory card") ||
    titleHaystack.startsWith("grip") ||
    titleHaystack.startsWith("grips") ||
    titleHaystack.startsWith("bateria") ||
    titleHaystack.startsWith("baterias") ||
    titleHaystack.startsWith("thumbstick") ||
    titleHaystack.startsWith("thumbsticks") ||
    titleHaystack.startsWith("kontrol freek") ||
    titleHaystack.startsWith("kit ") ||
    titleHaystack.startsWith("chaveiro");
  const hasAccessorySignal =
    startsAsAccessory ||
    haystack.includes("suporte") ||
    haystack.includes("base ") ||
    haystack.includes("cooler") ||
    haystack.includes("porta ") ||
    haystack.includes("carregador") ||
    haystack.includes("fone") ||
    haystack.includes("stand ") ||
    haystack.includes("cabo") ||
    haystack.includes("adaptador") ||
    haystack.includes("case") ||
    haystack.includes("sensor") ||
    haystack.includes("kinect") ||
    haystack.includes("fonte") ||
    haystack.includes("controle") ||
    haystack.includes("memory card") ||
    haystack.includes("cartao memoria") ||
    haystack.includes("joystick") ||
    haystack.includes("grip") ||
    haystack.includes("thumbstick") ||
    haystack.includes("kontrol freek") ||
    haystack.includes("bateria") ||
    haystack.includes("recarregavel") ||
    haystack.includes("recarregavel") ||
    haystack.includes("chaveiro");

  if (
    !hasStrongConsoleSignal &&
    (haystack.includes("caixa artesanal") ||
      haystack.includes("caixa para ") ||
      haystack.includes("berco para "))
  ) {
    return "box" as const;
  }

  if (haystack.includes("expositora")) {
    return "display" as const;
  }

  if (!hasStrongConsoleSignal && hasGameSignal) {
    return "game" as const;
  }

  if (hasStrongConsoleSignal) {
    return "console" as const;
  }

  if (startsAsAccessory) {
    return "accessory" as const;
  }

  if (hasPlatformConsoleSignal) {
    return "console" as const;
  }

  if (hasAccessorySignal) {
    return "accessory" as const;
  }

  return "console" as const;
}

function inferCategoryLabel(title: string, kind: ReturnType<typeof inferProductKind>) {
  if (kind === "box") {
    return `${title} com proposta de colecao e apresentacao`;
  }

  if (kind === "game" || kind === "display" || kind === "accessory") {
    return title;
  }

  return title;
}

function inferHighlightLabel(title: string, kind: ReturnType<typeof inferProductKind>) {
  const family = inferFamilyMeta(title);

  if (kind === "box") {
    return "Caixa artesanal";
  }

  if (kind === "game") {
    return "Jogo fisico";
  }

  if (kind === "display") {
    return "Acessorio retro";
  }

  if (kind === "accessory") {
    if (family.familySlug === "xbox") {
      return "Acessorio Xbox";
    }
    if (family.familySlug === "playstation") {
      return "Acessorio PlayStation";
    }
    if (family.familySlug === "sega") {
      return "Acessorio SEGA";
    }
    if (
      normalizeSearchText(title).includes("ps4") ||
      normalizeSearchText(title).includes("ps5") ||
      normalizeSearchText(title).includes("xbox")
    ) {
      return "Acessorio para controle";
    }
    if (family.familySlug === "acessorios") {
      return "Acessorio gamer";
    }
    return "Acessorio Nintendo";
  }

  if (family.familySlug === "playstation") {
    return "Console PlayStation";
  }
  if (family.familySlug === "sega") {
    return "Console SEGA";
  }
  if (family.familySlug === "xbox") {
    return "Console Xbox";
  }
  if (family.familySlug === "atari") {
    return "Console Atari";
  }

  return "Console Nintendo";
}

function inferDiscountLabel(title: string, kind: ReturnType<typeof inferProductKind>) {
  if (kind === "box") {
    return "Peca para colecao";
  }

  if (kind === "game") {
    return "Jogo para colecao";
  }

  if (kind === "display") {
    return "Acessorio para estante";
  }

  if (kind === "accessory") {
    return "Complemento para setup";
  }

  return normalizeSearchText(title).includes("mini")
    ? "Console retrô compacto"
    : "Console para colecao";
}

function buildMarketingCopy(
  title: string,
  description: string,
  kind: ReturnType<typeof inferProductKind>
) {
  const sourceDrivenCopy = buildSourceDrivenMarketingCopy(title, description, kind);

  if (sourceDrivenCopy) {
    return sourceDrivenCopy;
  }

  if (kind === "box") {
    return {
      about: [
        `Este ${title} foi pensado para quem quer dar mais acabamento visual a um classico da colecao.`,
        "A proposta aqui e valorizar a apresentacao do conjunto, deixando o produto com mais presenca na estante ou no presente.",
        "Boa escolha para quem gosta de colecao, nostalgia e acabamento mais caprichado no setup.",
      ],
      description:
        `Este ${title} ajuda a completar melhor a apresentacao da colecao com um visual mais bonito e mais bem resolvido. E uma compra que faz sentido para quem quer deixar o setup mais caprichado, montar presente tematico ou dar mais peso visual a um classico que ja faz parte do acervo.`,
      bullets: [
        "Boa pedida para deixar a colecao com visual mais bonito e mais organizado.",
        "Faz sentido para presente, reposicao e acabamento de setup retro.",
        "Ajuda a valorizar o produto principal na estante.",
      ],
    };
  }

  if (kind === "game") {
    return {
      about: [
        `Este ${title} conversa direto com quem gosta de midia fisica e quer reforcar a colecao com um titulo de apelo classico.`,
        "O formato fisico aumenta o valor para quem gosta de ter o jogo na estante e nao so na memoria afetiva.",
        "Boa escolha para colecionador e para quem quer dar mais peso ao acervo da plataforma.",
      ],
      description:
        `Este ${title} foi pensado para quem gosta de colecionar, revisitar classicos e montar uma biblioteca gamer com mais personalidade. E uma compra com apelo direto para quem valoriza midia fisica, nostalgia e jogos que fazem diferenca na colecao.`,
      bullets: [
        "Jogo fisico com apelo forte para colecao e nostalgia.",
        "Boa escolha para reforcar o acervo com um titulo mais marcante.",
        "Valoriza a estante e conversa melhor com quem gosta de midia fisica.",
      ],
    };
  }

  if (kind === "display") {
    return {
      about: [
        `Este ${title} ajuda a organizar melhor a colecao e dar mais presenca visual aos itens favoritos do setup.`,
        "A proposta e simples: transformar o que ficaria guardado em parte da decoracao gamer.",
        "Boa compra para quem quer deixar a estante mais bonita sem aumentar muito o gasto.",
      ],
      description:
        `Este ${title} foi pensado para quem gosta de ver a colecao montada com mais personalidade. Ele ajuda a destacar cartuchos e itens classicos na estante, melhora o visual do setup e cria um canto retro com mais cuidado de apresentacao.`,
      bullets: [
        "Destaca melhor os itens da colecao na estante.",
        "Ajuda a montar um setup retro mais bonito e mais organizado.",
        "Acessorio simples com efeito visual imediato.",
      ],
    };
  }

  if (kind === "accessory") {
    return {
      about: [
        `Este ${title} faz sentido para quem quer completar o setup com um acessorio util e mais alinhado ao estilo da linha.`,
        "E uma compra pratica para complementar o uso do produto principal sem improviso.",
        "Boa escolha para quem quer montar um conjunto mais completo desde o inicio.",
      ],
      description:
        `Este ${title} ajuda a deixar o setup mais completo e mais funcional para o dia a dia. E uma compra que conversa bem com quem prefere montar o conjunto certo de uma vez, sem depender de acessorios genericos ou solucoes improvisadas.`,
      bullets: [
        "Complemento util para deixar o setup mais completo.",
        "Ajuda a montar um conjunto mais bem resolvido desde a compra.",
        "Boa escolha para quem quer praticidade e coerencia no ecossistema.",
      ],
    };
  }

  return {
    about: [
      `Este ${title} foi pensado para quem quer levar um classico para casa com mais presenca e mais cara de compra certa.`,
      normalizeText(description || "A proposta conversa bem com nostalgia, colecao e uso no setup gamer de casa."),
      "Boa escolha para quem quer jogar, colecionar ou montar uma estante com mais identidade.",
    ],
    description:
      `Este ${title} ajuda a montar um setup com mais personalidade e mais apelo para quem gosta de videogames classicos. E uma compra que faz sentido para jogar, presentear ou reforcar a colecao com um item que chama atencao logo de cara.`,
    bullets: [
      "Boa escolha para quem quer um item com mais presenca no setup.",
      "Conversa bem com colecao, nostalgia e presente gamer.",
      "Ajuda a montar um canto gamer mais forte e mais interessante visualmente.",
    ],
  };
}

function splitCopySentences(value: string) {
  return normalizeText(value)
    .replace(/([.!?])(?=[A-ZÀ-Ý])/g, "$1 ")
    .split(/(?<=[.!?])(?:\s+|(?=[A-ZÀ-Ý]))/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 28);
}

function splitSourceLines(value: string) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\r?\n+/)
    .map((line) => stripListMarker(line.replace(/<[^>]+>/g, " ")))
    .map((line) => normalizeText(line))
    .filter((line) => line.length >= 3);
}

function isDiscardableLegalLine(value: string) {
  const normalized = normalizeSearchText(value);

  return (
    normalized === "aviso legal" ||
    normalized === "aviso legal." ||
    normalized.includes("a duracao da bateria depende do uso") ||
    normalized.includes("pode ser retirado em maos")
  );
}

function isThinHighlightLine(value: string) {
  const normalized = normalizeSearchText(value);

  return (
    !normalized ||
    normalized === "novo" ||
    normalized === "novo." ||
    normalized === "sem garantia" ||
    normalized === "sem garantia." ||
    normalized === "fotos reais do produto" ||
    normalized === "fotos reais do produto." ||
    normalized === "com nota fiscal" ||
    normalized === "com nota fiscal." ||
    normalized.startsWith("garantia do vendedor de ") ||
    normalized.includes("nao compativel com")
  );
}

function rewriteSourceLine(value: string) {
  const normalized = stripListMarker(value).replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (/^emitimos nota fiscal\.?$/i.test(normalized)) {
    return "Com nota fiscal.";
  }

  if (/^fotos reais do produto\.?$/i.test(normalized)) {
    return "Fotos reais do produto.";
  }

  const warrantyMatch = normalized.match(/^garantia do vendedor:\s*(.+)$/i);
  if (warrantyMatch) {
    return `Garantia do vendedor de ${warrantyMatch[1].trim().replace(/[.]+$/g, "")}.`;
  }

  if (/^jogo original disponivel apenas na edicao /i.test(normalized)) {
    return uppercaseFirstLetter(
      normalized
        .replace(/^jogo original disponivel apenas na edicao /i, "Disponivel na edicao ")
        .replace(/[.]+$/g, "")
    ) + ".";
  }

  if (/^sem garantia\.?$/i.test(normalized)) {
    return "Sem garantia.";
  }

  return uppercaseFirstLetter(normalized.replace(/[.]+$/g, "")) + ".";
}

function buildLineDrivenMarketingCopy(title: string, description: string) {
  const lines = splitSourceLines(description);

  if (lines.length < 2) {
    return null;
  }

  const facts = new Map<string, string>();
  const highlights: string[] = [];

  for (const line of lines) {
    const factMatch = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (factMatch) {
      facts.set(normalizeSearchText(factMatch[1]), normalizeText(factMatch[2]));
      continue;
    }

    highlights.push(rewriteSourceLine(line));
  }

  const productName = facts.get("jogo") || title;
  const platform = facts.get("plataforma");
  const year = facts.get("ano");
  const language = facts.get("idioma");
  const developer = facts.get("desenvolvedor");
  const warranty = facts.get("garantia do vendedor");

  const leadParts = [productName];
  if (platform) {
    leadParts.push(`para ${platform}`);
  }
  if (year) {
    leadParts.push(`de ${year}`);
  }
  if (language) {
    leadParts.push(`em ${language}`);
  }

  const leadSentence = `${leadParts.join(" ")}.`;

  let supportSentences = uniqueStrings(
    [
      highlights.find((line) => /edicao/i.test(line)),
      highlights.find((line) => /nota fiscal/i.test(line)),
      highlights.find((line) => /fotos reais/i.test(line)),
      developer ? `Desenvolvido por ${developer}.` : null,
      warranty ? `Garantia do vendedor de ${warranty}.` : null,
    ].filter((value): value is string => Boolean(value))
  );

  if (supportSentences.length === 0) {
    supportSentences = uniqueStrings(
      highlights.filter((line) => !isDiscardableLegalLine(line)).slice(0, 2)
    );
  }

  if (supportSentences.length === 0 || supportSentences.every(isThinHighlightLine)) {
    return null;
  }

  const about = uniqueStrings([leadSentence, ...supportSentences]).slice(0, 3);
  const bullets = uniqueStrings(
    [
      platform ? `${platform}${language ? ` | ${language}` : ""}` : null,
      highlights.find((line) => /nota fiscal/i.test(line)),
      highlights.find((line) => /fotos reais/i.test(line)),
      warranty ? `Garantia do vendedor de ${warranty}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .map((line) => shortenBullet(line))
  ).slice(0, 3);

  return {
    about,
    description: uppercaseFirstLetter(uniqueStrings([leadSentence, ...supportSentences]).join(" ")),
    bullets,
  };
}

function buildTitleDrivenMarketingCopy(
  title: string,
  kind: ReturnType<typeof inferProductKind>
) {
  const normalized = normalizeSearchText(title);
  const bullets: string[] = [];
  const lines: string[] = [];

  if (kind === "console") {
    if (normalized.includes("mega drive")) {
      lines.push(
        `${title} para quem quer levar o visual classico da SEGA para a colecao ou voltar a jogar na linha 16-bit com mais presenca.`
      );
    } else {
      lines.push(`${title} para quem quer uma opcao marcante dentro do universo retrô.`);
    }

    if (normalized.includes("tectoy")) {
      lines.push(
        "A versao Tectoy reforca o apelo nostalgico e conversa bem com quem procura uma peca forte da fase classica do console no Brasil."
      );
      bullets.push("Versao Tectoy");
    }

    if (normalized.includes("joystick")) {
      bullets.push("Ja acompanha joystick");
    }

    if (normalized.includes("22 jogos")) {
      lines.push(
        "Ja chega com 22 jogos classicos no conjunto, o que ajuda a ligar o console e comecar a aproveitar logo no primeiro dia."
      );
      bullets.push("22 jogos classicos");
    }

    if (normalized.includes("caixa")) {
      lines.push(
        "A apresentacao com caixa ajuda a valorizar ainda mais o produto para quem gosta de guardar, expor e comprar com sensacao de conjunto completo."
      );
      bullets.push("Com caixa");
    }

    if (normalized.includes("mini")) {
      lines.push(
        "O formato mini chama atencao pelo visual compacto e pelo perfil mais colecionavel, sem perder a identidade do Mega Drive."
      );
      bullets.push("Formato mini");
    }

    if (normalized.includes("asia edition")) {
      lines.push(
        "A Asia Edition reforca o apelo de importacao e deixa a peca ainda mais interessante para quem busca algo menos comum."
      );
      bullets.push("Asia Edition");
    }

    if (normalized.includes("europeu") || normalized.includes("pal")) {
      lines.push(
        "A versao europeia PAL chama atencao por fugir das configuracoes mais comuns e ganhar forca como item de colecao."
      );
      bullets.push("Versao europeia PAL");
    }
  }

  if (kind === "accessory") {
    if (normalized.includes("fonte")) {
      lines.push(
        `${title} para repor a alimentacao do console com compatibilidade ampla entre Mega Drive, Sega CD, Phantom System e NES.`
      );
      lines.push(
        "Boa escolha para quem quer trocar a fonte antiga e voltar a usar o aparelho com mais praticidade no dia a dia."
      );
      bullets.push("Fonte bivolt");
    } else if (normalized.includes("controle") || normalized.includes("joystick")) {
      lines.push(
        `${title} para deixar o console pronto para partidas em dupla e substituir controles ja desgastados pelo tempo.`
      );
      lines.push(
        "E uma opcao direta para quem quer voltar a jogar no Mega Drive ou no Master System sem depender de acessorios improvisados."
      );
      bullets.push("Ideal para multiplayer");
    } else if (normalized.includes("cabo av")) {
      lines.push(
        `${title} para ligar o Mega Drive 3 na TV com a conexao classica e recuperar a instalacao certa do console.`
      );
      lines.push(
        "Funciona bem como reposicao quando o cabo antigo se perdeu ou ja nao entrega a conexao que voce precisa."
      );
      bullets.push("Cabo AV de 9 pinos");
    } else if (normalized.includes("tetris")) {
      lines.push(
        `${title} para quem gosta de retrô, quer uma lembranca divertida e ainda curte ter um mini game sempre por perto.`
      );
      lines.push(
        "O formato compacto ajuda a compor colecao, presentear ou carregar no bolso sem ocupar espaco."
      );
      bullets.push("Mini game portatil");
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return {
    about: uniqueStrings(lines).slice(0, 3),
    description: uppercaseFirstLetter(uniqueStrings(lines).join(" ")),
    bullets: uniqueStrings(bullets).slice(0, 3),
  };
}

function rewriteSourceSentence(value: string) {
  const rewritten = value
    .replace(/^descubra\s+/i, "")
    .replace(/^entre os beneficios,?\s*/i, "Entre os destaques, ")
    .replace(/^elemento chave na decoracao,?\s*/i, "Na decoracao, ")
    .replace(/^se voce busca\b/i, "Para quem busca")
    .replace(/^com o\b/i, "Com")
    .replace(/^invista em qualidade e estetica\.?\s*/i, "A combinacao de acabamento e funcionalidade")
    .replace(/tornando-se o complemento perfeito/gi, "sendo uma boa escolha")
    .replace(/confeccionado em material/gi, "Feito em")
    .replace(/assegura durabilidade e est[eé]tica refinada/gi, "entrega boa durabilidade e um acabamento mais refinado")
    .replace(/garanta n[aã]o apenas organiza(?:ç|c)[aã]o, mas tamb[eé]m prote(?:ç|c)[aã]o aos seus dispositivos, evitando quedas e danos/gi, "ajuda a organizar melhor e proteger os dispositivos contra quedas e danos")
    .replace(/promovendo uma experi[eê]ncia de jogo mais fluida e livre de desordem/gi, "deixando a area de jogo mais fluida e sem bagunca")
    .replace(/fazendo com que seu setup se torne unico/gi, "deixando o espaco com mais personalidade")
    .replace(/n[aã]o procure mais\.?/gi, "faz bastante sentido.")
    .replace(/aproveite a oportunidade de melhorar seu ambiente gaming com/gi, "Tambem ajuda a melhorar o ambiente gamer com")
    .replace(/transforme seu espa(?:ç|c)o imediatamente e experimente o verdadeiro potencial de organiza(?:ç|c)[aã]o funcional com um toque de sofistica(?:ç|c)[aã]o\.?/gi, "Ajuda a organizar melhor o espaco com um toque de sofisticacao.")
    .replace(/\bos seu controles\b/gi, "seus controles")
    .replace(/\s+/g, " ")
    .trim();

  if (/^A combinacao de acabamento e funcionalidade$/i.test(rewritten)) {
    return "";
  }

  if (/^Para quem busca um produto que ofereca tanto funcionalidade quanto estilo, faz bastante sentido\.?$/i.test(rewritten)) {
    return "Para quem quer funcionalidade sem abrir mao do visual, faz bastante sentido.";
  }

  if (/^O suporte exclusivo para controle/i.test(rewritten)) {
    return uppercaseFirstLetter(
      rewritten
        .replace(
          /que transforma a organiza(?:ç|c)[aã]o do seu espa(?:ç|c)o gaming em um cen[aá]rio de eleg[aâ]ncia e funcionalidade\.?$/i,
          "pensado para deixar o espaco gaming mais organizado, elegante e funcional."
        )
        .replace(/, que transforma /i, ", pensado para transformar ")
        .trim()
    );
  }

  if (/^Criado para valorizar/i.test(rewritten)) {
    const rebuilt = rewritten.match(
      /^Criado para valorizar\s+(.+?),\s+este suporte se destaca pelo\s+(.+?),\s+sendo uma boa escolha para\s+(.+?)\.?$/i
    );

    if (rebuilt) {
      const [, target, design, context] = rebuilt;
      const normalizedTarget = target.replace(/^os seu controles$/i, "seus controles");
      return uppercaseFirstLetter(
        `Com ${design}, valoriza ${normalizedTarget} e combina bem com ${context}.`
      );
    }

    return uppercaseFirstLetter(
      rewritten
        .replace(/^Criado para valorizar/i, "Pensado para valorizar")
        .replace(/este suporte se destaca pelo/i, "o produto se destaca pelo")
        .trim()
    );
  }

  if (/^Entre os destaques,/i.test(rewritten)) {
    return uppercaseFirstLetter(
      rewritten
        .replace(/^Entre os destaques,\s*a\s*/i, "Entre os destaques, a ")
        .trim()
    );
  }

  if (/^Na decoracao,/i.test(rewritten)) {
    return uppercaseFirstLetter(
      rewritten
        .replace(/este suporte distingue-se pela sua capacidade de destacar/gi, "o produto chama atencao por destacar")
        .trim()
    );
  }

  return uppercaseFirstLetter(rewritten);
}

function isUsefulSourceSentence(value: string) {
  const normalized = normalizeSearchText(value);

  if (!normalized || normalized.length < 24) {
    return false;
  }

  if (
    normalized.includes("aproveite a oportunidade") ||
    normalized.includes("transforme seu espaco imediatamente") ||
    normalized.includes("seu setup merece o melhor") ||
    normalized === "a combinacao de acabamento e funcionalidade"
  ) {
    return false;
  }

  return true;
}

function shortenBullet(value: string) {
  const normalized = value
    .replace(/^Entre os destaques,\s*/i, "")
    .replace(/^Tambem\s+/i, "")
    .replace(/^Boa escolha para\s+/i, "")
    .replace(/^Para quem quer\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return uppercaseFirstLetter(normalized.replace(/[.!?]+$/g, ""));
}

function sentenceToBullet(value: string) {
  return shortenBullet(rewriteSourceSentence(value));
}

function buildSourceDrivenMarketingCopy(
  title: string,
  description: string,
  kind: ReturnType<typeof inferProductKind>
) {
  const lineDrivenCopy = buildLineDrivenMarketingCopy(title, description);
  if (lineDrivenCopy) {
    return lineDrivenCopy;
  }

  const sourceSentences = splitCopySentences(description)
    .map(rewriteSourceSentence)
    .filter(isUsefulSourceSentence)
    .filter((sentence) => sentence.length >= 28);

  if (sourceSentences.length < 2) {
    return buildTitleDrivenMarketingCopy(title, kind);
  }

  const specificSentences = sourceSentences.slice(0, 3).map(uppercaseFirstLetter);
  const about = uniqueStrings(specificSentences)
    .map(uppercaseFirstLetter)
    .slice(0, 3);
  const bullets = uniqueStrings(
    sourceSentences.slice(0, 4).map(sentenceToBullet)
  )
    .map(uppercaseFirstLetter)
    .slice(0, 3);
  const rewrittenDescription = uppercaseFirstLetter(
    uniqueStrings(specificSentences).join(" ")
  );

  return {
    about,
    description: rewrittenDescription,
    bullets,
  };
}

function extractMercadoLivreDescriptionContent(html: string) {
  const match = html.match(
    /<p[^>]+data-testid=["']content["'][^>]*>([\s\S]*?)<\/p>/i
  );

  if (!match?.[1]) {
    return null;
  }

  return decodeHtml(match[1])
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function extractMetaContent(html: string, key: string) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const match = html.match(pattern);
  return match ? normalizeText(match[1]) : null;
}

function extractMlEventData(html: string) {
  const marker = 'melidata("add","event_data",';
  const startIndex = html.indexOf(marker);

  if (startIndex < 0) {
    return null;
  }

  const afterMarker = html.slice(startIndex + marker.length);
  const braceStart = afterMarker.indexOf("{");
  if (braceStart < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let result = "";

  for (const char of afterMarker.slice(braceStart)) {
    result += char;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        break;
      }
    }
  }

  try {
    return JSON.parse(result) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildSellerReputationLabel(level: string | null | undefined, power: string | null | undefined) {
  const parts: string[] = [];

  if (level === "5_green") {
    parts.push("Nivel 5 verde");
  } else if (level) {
    parts.push(level);
  }

  if (power) {
    parts.push(power.charAt(0).toUpperCase() + power.slice(1).toLowerCase());
  }

  return parts.join(" | ") || "Consulte a reputacao do vendedor";
}

function getReviewCountLabel(
  reviewCount: number,
  reputationLabel: string,
  soldQuantityLabel: string | null
) {
  if (reviewCount > 1) {
    return `${reviewCount} avaliacoes`;
  }

  if (reviewCount === 1) {
    return "1 avaliacao";
  }

  return [reputationLabel, soldQuantityLabel].filter(Boolean).join(" | ");
}

function buildInstallmentLabel(priceCents: number, installments: number) {
  if (!installments || installments <= 1) {
    return "Consulte o parcelamento atual";
  }

  const installmentCents = Math.round(priceCents / installments);
  return `Em ate ${installments}x de ${formatCentsToBRL(installmentCents)}`;
}

function extractSoldQuantityLabel(html: string) {
  const match = html.match(/([+]\d+(?:\.\d+)?)\s*vendas/i);
  return match ? `${match[1]} vendas` : null;
}

function buildSlug(title: string, productUrl: string) {
  const base = slugifyCategorySegment(title)
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const isMl = /mercadolivre\.com\.br/i.test(productUrl);
  const itemMatch = productUrl.match(/MLB\d+/i);
  const suffix = isMl ? "ml" : "afiliado";
  const extra = itemMatch ? itemMatch[0].toLowerCase() : suffix;

  const slug = `${base || "produto"}-${extra}`;
  return slug.length <= 96 ? slug : slug.slice(0, 96);
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar ${url}: ${response.status}`);
  }

  return response.text();
}

async function scrapeMercadoLivreProduct(entry: ParsedImportEntry) {
  const html = await fetchHtml(entry.productUrl);
  const eventData = extractMlEventData(html);

  if (!eventData) {
    throw new Error(`Nao foi possivel ler os dados da pagina: ${entry.productUrl}`);
  }

  const title =
    extractMetaContent(html, "twitter:title") ??
    extractMetaContent(html, "og:title")?.replace(/\s+-\s+R\$\s*[\d.,]+$/i, "") ??
    "Produto Mercado Livre";
  const pageDescription =
    extractMercadoLivreDescriptionContent(html) ??
    extractMetaContent(html, "twitter:description") ??
    extractMetaContent(html, "description") ??
    title;
  const seoDescription =
    extractMetaContent(html, "twitter:description") ??
    extractMetaContent(html, "description") ??
    title;
  const ogImage =
    extractMetaContent(html, "og:image") ?? extractMetaContent(html, "twitter:image");
  const images = extractMercadoLivreImages(html, ogImage);

  const sellerName = String(eventData.seller_name ?? "Mercado Livre").trim();
  const reputationLevel = String(eventData.reputation_level ?? "").trim();
  const powerSellerStatus = String(eventData.power_seller_status ?? "").trim();
  const soldQuantityLabel = extractSoldQuantityLabel(html);
  const reputationLabel = buildSellerReputationLabel(reputationLevel, powerSellerStatus);
  const price = Number(eventData.price ?? 0);
  const priceCents = Number.isFinite(price) ? Math.round(price * 100) : 0;
  if (priceCents <= 0) {
    throw new Error(`Preco nao encontrado na pagina: ${entry.productUrl}`);
  }
  const installments = Number.parseInt(String(eventData.installment_info ?? "0"), 10) || 0;
  const reviewCount = Number((eventData.reviews as { count?: unknown } | null)?.count ?? 0) || 0;
  const rating =
    Number((eventData.reviews as { rate?: unknown } | null)?.rate ?? eventData.review_rate ?? 0) || 0;
  const freeShipping = Boolean(eventData.free_shipping);
  const familyMeta = inferFamilyMeta(title);
  const kind = inferProductKind(title, pageDescription);
  const marketing = buildMarketingCopy(title, pageDescription, kind);
  const slug = buildSlug(title, entry.productUrl);

  return {
    slug,
    title,
    shortTitle: title.length > 44 ? `${title.slice(0, 41).trim()}...` : title,
    partnerName: sellerName,
    partnerLabel: "Mercado Livre",
    highlightLabel: inferHighlightLabel(title, kind),
    homeBadge: familyMeta.homeBadge,
    brand: familyMeta.brand,
    familySlug: familyMeta.familySlug,
    categoryLabel: inferCategoryLabel(title, kind),
    status: "active",
    moderationStatus: "approved",
    showOnHome: true,
    isFeatured: false,
    isWeekOffer: false,
    images,
    videoUrl: normalizeDropboxVideoUrl(entry.videoUrl),
    videoLabel: entry.videoUrl ? "Video do produto" : null,
    priceCents,
    installmentLabel: buildInstallmentLabel(priceCents, installments),
    discountLabel: inferDiscountLabel(title, kind),
    about: marketing.about,
    details: [
      { label: "Marca", value: familyMeta.brand },
      { label: "Categoria", value: inferCategoryLabel(title, kind) },
      { label: "Condicao", value: "Consulte o estado na pagina do parceiro" },
      { label: "Parcelamento", value: buildInstallmentLabel(priceCents, installments) },
      { label: "Frete", value: freeShipping ? "Gratis" : "Consulte na pagina do parceiro" },
      { label: "Vendedor", value: sellerName },
      { label: "Reputacao do vendedor", value: reputationLabel },
      ...(soldQuantityLabel ? [{ label: "Volume de vendas", value: soldQuantityLabel }] : []),
    ],
    rating: reviewCount > 0 ? rating : 5,
    ratingTitle: reviewCount > 0 ? "Avaliacoes de clientes" : "Reputacao do vendedor",
    reviewCountLabel: getReviewCountLabel(reviewCount, reputationLabel, soldQuantityLabel),
    ratingNote:
      reviewCount > 0
        ? "Nota publica da pagina do parceiro."
        : "A listagem nao exibe avaliacoes publicas do produto. A nota mostrada considera a reputacao publica do vendedor.",
    ratingBreakdown: [],
    externalUrl: entry.affiliateUrl,
    description: marketing.description,
    bullets: marketing.bullets,
    disclaimer: null,
    buyButtonLabel: "Comprar agora",
    publishedAt: new Date().toISOString(),
    seoDescription: pageDescription,
  } satisfies AffiliateProduct;
}

function isAffiliateProduct(value: unknown): value is AffiliateProduct {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.slug === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.shortTitle === "string" &&
    typeof candidate.externalUrl === "string" &&
    typeof candidate.familySlug === "string" &&
    typeof candidate.partnerName === "string" &&
    typeof candidate.partnerLabel === "string" &&
    typeof candidate.priceCents === "number" &&
    Array.isArray(candidate.images)
  );
}

export function parseAffiliateImportSource(raw: string) {
  const blocks = raw
    .split(/\r?\n\s*\r?\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
  const entries: ParsedImportEntry[] = [];
  let pendingProductUrl = "";
  let pendingVideoUrl: string | null = null;

  for (const block of blocks) {
    const urls = extractUrls(block);
    if (urls.length === 0) {
      continue;
    }

    const videoUrl = urls.find((url) => isVideoUrl(url)) ?? null;
    const affiliateUrl = urls.find((url) => isAffiliateUrl(url)) ?? "";
    const productUrl =
      urls.find((url) => !isVideoUrl(url) && !isAffiliateUrl(url)) ?? "";

    if (productUrl && affiliateUrl) {
      entries.push({
        productUrl,
        affiliateUrl,
        videoUrl,
      });
      pendingProductUrl = "";
      pendingVideoUrl = null;
      continue;
    }

    if (productUrl && !affiliateUrl) {
      pendingProductUrl = productUrl;
      pendingVideoUrl = videoUrl;
      continue;
    }

    if (!productUrl && affiliateUrl && pendingProductUrl) {
      entries.push({
        productUrl: pendingProductUrl,
        affiliateUrl,
        videoUrl: videoUrl ?? pendingVideoUrl,
      });
      pendingProductUrl = "";
      pendingVideoUrl = null;
    }
  }

  return entries.filter((entry, index, items) => {
    return (
      items.findIndex(
        (candidate) =>
          candidate.productUrl === entry.productUrl &&
          candidate.affiliateUrl === entry.affiliateUrl
      ) === index
    );
  });
}

export async function loadImportedAffiliateProducts() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", IMPORTED_AFFILIATE_PRODUCTS_KEY)
    .maybeSingle();

  const raw = String(data?.value ?? "").trim();
  if (!raw) {
    return [] as AffiliateProduct[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? normalizeImportedAffiliateProducts(parsed.filter(isAffiliateProduct))
      : [];
  } catch {
    return [] as AffiliateProduct[];
  }
}

export async function saveImportedAffiliateProducts(products: AffiliateProduct[]) {
  const admin = createAdminClient();
  const normalizedProducts = normalizeImportedAffiliateProducts(products);
  const { error } = await admin.from("site_settings").upsert(
    {
      key: IMPORTED_AFFILIATE_PRODUCTS_KEY,
      value: JSON.stringify(normalizedProducts),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  return { error };
}

export async function upsertImportedAffiliateProducts(products: AffiliateProduct[]) {
  const current = await loadImportedAffiliateProducts();
  const staticSlugs = new Set(getStaticAffiliateProducts().map((item) => item.slug));
  const merged = new Map<string, AffiliateProduct>();

  for (const item of current) {
    merged.set(item.slug, item);
  }

  for (const item of products) {
    const safeSlug = staticSlugs.has(item.slug) ? `${item.slug}-importado` : item.slug;
    merged.set(safeSlug, { ...item, slug: safeSlug });
  }

  const nextProducts = normalizeImportedAffiliateProducts(Array.from(merged.values()));

  const { error } = await saveImportedAffiliateProducts(nextProducts);

  return {
    error,
    products: nextProducts,
  };
}

export async function importAffiliateProductsFromText(raw: string): Promise<ImportedProductsResult> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      imported: [],
      savedCount: 0,
      importedCount: 0,
      errors: ["Nenhum conteudo informado para importar."],
    };
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const imported = Array.isArray(parsed) ? parsed.filter(isAffiliateProduct) : [];
      if (imported.length === 0) {
        return {
          imported: [],
          savedCount: 0,
          importedCount: 0,
          errors: ["O JSON nao trouxe produtos validos."],
        };
      }

      const { error, products } = await upsertImportedAffiliateProducts(imported);
      return {
        imported,
        savedCount: products.length,
        importedCount: imported.length,
        errors: error ? [error.message] : [],
      };
    } catch {
      return {
        imported: [],
        savedCount: 0,
        importedCount: 0,
        errors: ["O arquivo JSON nao pode ser lido."],
      };
    }
  }

  const entries = parseAffiliateImportSource(trimmed);
  if (entries.length === 0) {
    return {
      imported: [],
      savedCount: 0,
      importedCount: 0,
      errors: ["Nenhum par de link do produto + link afiliado foi encontrado."],
    };
  }

  const imported: AffiliateProduct[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    try {
      if (!/mercadolivre\.com\.br/i.test(entry.productUrl)) {
        throw new Error(`Link nao suportado nesta importacao: ${entry.productUrl}`);
      }

      imported.push(await scrapeMercadoLivreProduct(entry));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao importar produto.";
      errors.push(message);
    }
  }

  if (imported.length === 0) {
    return {
      imported: [],
      savedCount: 0,
      importedCount: 0,
      errors,
    };
  }

  const { error, products } = await upsertImportedAffiliateProducts(imported);
  if (error) {
    errors.push(error.message);
  }

  return {
    imported,
    savedCount: products.length,
    importedCount: imported.length,
    errors,
  };
}
