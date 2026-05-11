export type CatalogAiProductInput = {
  id?: string;
  sourceType?: "affiliate" | "marketplace" | "import";
  title: string;
  description?: string | null;
  priceCents?: number | null;
  platform?: string | null;
  category?: string | null;
  sourceUrl?: string | null;
  affiliateUrl?: string | null;
  images?: string[];
  sellerRating?: string | null;
};

export type CatalogAiProductAudit = {
  id: string;
  sourceType: string;
  title: string;
  platform: string;
  category: string;
  priceCents: number | null;
  score: number;
  issues: string[];
  inferredPlatform: string;
  inferredCategory: string;
  salesCopy: string;
  recommendationBucket: string;
};

export type CatalogAiReport = {
  totalProducts: number;
  averageScore: number;
  duplicateTitles: string[];
  issueCounts: Record<string, number>;
  byPlatform: Record<string, number>;
  recommendationBuckets: Record<string, number>;
  products: CatalogAiProductAudit[];
};

type UnknownRecord = Record<string, unknown>;

const GENERIC_COPY_MARKERS = [
  "setup mais completo",
  "ticket baixo",
  "universo",
  "vitrine",
  "ganm ols",
  "parceiro abre em nova aba",
  "seller com reputacao",
  "itens ligados",
  "portifolio",
  "portfolio",
  "mesma linha",
];

const PLATFORM_KEYWORDS: Record<string, string[]> = {
  "Super Nintendo": ["super nintendo", "snes", "super famicom"],
  "Mega Drive": ["mega drive", "genesis", "sega 16 bit", "16 bit"],
  "Nintendo 64": ["nintendo 64", "n64"],
  "PlayStation 1": ["playstation 1", "ps1", "ps one", "psone", "scph"],
  "PlayStation 2": ["playstation 2", "ps2"],
  "PlayStation 3": ["playstation 3", "ps3"],
  PSP: ["psp", "playstation portable"],
  "Xbox 360": ["xbox 360", "kinect"],
  Xbox: ["xbox series", "series x", "series s", "xbox one"],
  "Nintendo Wii": ["nintendo wii", "wii rvl", "wii"],
  "Nintendo Switch": ["nintendo switch", "switch 2", "joy con", "joy-con"],
  Atari: ["atari"],
  "NES/Famicom": ["nes", "family computer", "famicom", "nintendo classic mini"],
  "Retro portatil": ["sf2000", "console retro", "portatil retro", "retro videogame"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Console: ["console", "videogame", "mini", "standard", "slim"],
  Controle: ["controle", "joystick", "joy con", "joy-con"],
  Acessorio: [
    "kinect",
    "fonte",
    "cabo",
    "case",
    "suporte",
    "memory card",
    "pelicula",
    "bateria",
    "carregador",
    "expositor",
    "caixa artesanal",
  ],
  Jogo: ["jogo", "fita", "cartucho", "midia", "fifa", "street fighter", "super mario"],
};

const FACT_PATTERNS = [
  /(?:acompanha|inclui|com)\s+[^.:\n]{4,120}/gi,
  /(?:garantia|nota fiscal|fotos reais|produto original|original)[^.:\n]{0,120}/gi,
  /(?:ano|plataforma|idioma|desenvolvedor|modelo|cor)\s*[:\-]\s*[^.\n]{2,80}/gi,
  /(?:\d+\s*(?:jogos|cartuchos|controles|meses))[^.\n]{0,80}/gi,
];

export const CATALOG_AI_ISSUE_LABELS: Record<string, string> = {
  missing_title: "Titulo ausente",
  missing_price: "Preco ausente",
  zero_price: "Preco zerado",
  weak_description: "Descricao fraca",
  missing_platform: "Plataforma ausente",
  missing_category: "Categoria ausente",
  missing_images: "Sem imagens",
  single_image: "Apenas uma imagem",
  duplicated_images: "Imagens repetidas",
  generic_internal_copy: "Copy generica/interna",
  missing_seller_rating: "Sem avaliacao do vendedor",
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstText(row: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function parsePriceToCents(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  const cleaned = String(value)
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function parseImages(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[|\n,]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [] as string[];
}

function inferFromKeywords(
  product: CatalogAiProductInput,
  keywords: Record<string, string[]>
) {
  const haystack = normalizeText(
    [product.title, product.description, product.platform, product.category].join(" ")
  );

  for (const [label, values] of Object.entries(keywords)) {
    if (values.some((keyword) => haystack.includes(keyword))) {
      return label;
    }
  }

  return "";
}

function extractFacts(product: CatalogAiProductInput) {
  const source = [product.title, product.description].filter(Boolean).join("\n");
  const facts: string[] = [];

  for (const line of source.split(/\r?\n/g)) {
    const trimmed = line.trim().replace(/^[-*]\s*/, "");
    if (trimmed.includes(":") && trimmed.length <= 140) {
      facts.push(trimmed);
    }
  }

  for (const pattern of FACT_PATTERNS) {
    const matches = source.matchAll(pattern);
    for (const match of matches) {
      const fact = match[0]?.replace(/\s+/g, " ").trim().replace(/[.]+$/g, "");
      if (fact) {
        facts.push(fact);
      }
    }
  }

  const seen = new Set<string>();
  return facts
    .filter((fact) => {
      const key = normalizeText(fact);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function buildSalesCopy(
  product: CatalogAiProductInput,
  platform: string,
  category: string
) {
  const facts = extractFacts(product);
  const context = platform || category || "produto gamer";
  const title = product.title.trim() || "Produto sem titulo";

  if (facts.length > 0) {
    return `${title} para quem procura ${context} com informacoes objetivas do anuncio: ${facts
      .slice(0, 4)
      .join("; ")}. Confira fotos, itens inclusos e condicoes antes de finalizar.`;
  }

  const description = String(product.description ?? "").replace(/\s+/g, " ").trim();
  if (description) {
    const firstSentence = description.split(/(?<=[.!?])\s+/)[0] ?? description;
    return `${title}. ${firstSentence.slice(0, 220).trim()} Confira estado, itens inclusos e compatibilidade antes de comprar.`;
  }

  return `${title} para quem procura ${context}. Complete a descricao com estado real, itens inclusos, garantia, fotos reais e observacoes importantes do vendedor.`;
}

function recommendationBucket(product: CatalogAiProductInput, platform: string, category: string) {
  const price = product.priceCents ?? 0;
  const normalizedCategory = normalizeText(category);

  if (price > 0 && price <= 15000) {
    return "downsell";
  }
  if (["controle", "acessorio", "jogo"].includes(normalizedCategory)) {
    return "cross_sell";
  }
  if (price >= 90000) {
    return "upsell";
  }
  if (platform) {
    return "same_platform";
  }
  return "needs_review";
}

export function auditCatalogAiProduct(
  product: CatalogAiProductInput,
  index = 0
): CatalogAiProductAudit {
  const inferredPlatform = inferFromKeywords(product, PLATFORM_KEYWORDS);
  const inferredCategory = inferFromKeywords(product, CATEGORY_KEYWORDS);
  const platform = String(product.platform ?? "").trim() || inferredPlatform;
  const category = String(product.category ?? "").trim() || inferredCategory;
  const description = String(product.description ?? "");
  const images = product.images ?? [];
  const issues: string[] = [];

  if (!product.title.trim()) {
    issues.push("missing_title");
  }
  if (product.priceCents === null || product.priceCents === undefined) {
    issues.push("missing_price");
  } else if (product.priceCents <= 0) {
    issues.push("zero_price");
  }
  if (!description.trim() || description.trim().length < 80) {
    issues.push("weak_description");
  }
  if (!platform) {
    issues.push("missing_platform");
  }
  if (!category) {
    issues.push("missing_category");
  }
  if (images.length === 0) {
    issues.push("missing_images");
  } else if (images.length === 1) {
    issues.push("single_image");
  }
  if (new Set(images).size !== images.length) {
    issues.push("duplicated_images");
  }
  if (GENERIC_COPY_MARKERS.some((marker) => normalizeText(description).includes(marker))) {
    issues.push("generic_internal_copy");
  }
  if (!product.sellerRating && normalizeText(product.sourceUrl).includes("mercadolivre")) {
    issues.push("missing_seller_rating");
  }

  let score = Math.max(0, 100 - issues.length * 12);
  if (description.length > 250) {
    score = Math.min(100, score + 8);
  }
  if (images.length >= 3) {
    score = Math.min(100, score + 8);
  }

  return {
    id: product.id ?? `product-${index}`,
    sourceType: product.sourceType ?? "import",
    title: product.title,
    platform,
    category,
    priceCents: product.priceCents ?? null,
    score,
    issues,
    inferredPlatform,
    inferredCategory,
    salesCopy: buildSalesCopy(product, platform, category),
    recommendationBucket: recommendationBucket(product, platform, category),
  };
}

export function analyzeCatalogAiProducts(products: CatalogAiProductInput[]): CatalogAiReport {
  const audits = products.map((product, index) => auditCatalogAiProduct(product, index));
  const titleCounts = new Map<string, number>();

  for (const product of products) {
    const title = normalizeText(product.title);
    if (title) {
      titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
    }
  }

  const issueCounts: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  const recommendationBuckets: Record<string, number> = {};

  for (const audit of audits) {
    byPlatform[audit.platform || "sem_plataforma"] =
      (byPlatform[audit.platform || "sem_plataforma"] ?? 0) + 1;
    recommendationBuckets[audit.recommendationBucket] =
      (recommendationBuckets[audit.recommendationBucket] ?? 0) + 1;

    for (const issue of audit.issues) {
      issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
    }
  }

  return {
    totalProducts: products.length,
    averageScore:
      audits.length > 0
        ? Math.round((audits.reduce((sum, audit) => sum + audit.score, 0) / audits.length) * 100) /
          100
        : 0,
    duplicateTitles: Array.from(titleCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([title]) => title),
    issueCounts,
    byPlatform,
    recommendationBuckets,
    products: audits,
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseDelimitedRows(raw: string) {
  const delimiter =
    (raw.match(/;/g)?.length ?? 0) > (raw.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  row.push(field.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function mapRowToProduct(row: UnknownRecord, index: number): CatalogAiProductInput {
  return {
    id: firstText(row, ["id", "slug", "codigo"]) || `import-${index}`,
    sourceType: "import",
    title: firstText(row, ["title", "titulo", "name", "nome"]),
    description: firstText(row, ["description", "descricao", "body", "texto"]),
    priceCents: parsePriceToCents(row.price ?? row.preco ?? row.price_cents ?? row.priceCents),
    platform: firstText(row, ["platform", "plataforma"]),
    category: firstText(row, ["category", "categoria"]),
    sourceUrl: firstText(row, ["source_url", "product_url", "url", "link"]),
    affiliateUrl: firstText(row, ["affiliate_url", "link_afiliado", "affiliate"]),
    images: parseImages(row.images ?? row.imagens),
    sellerRating: firstText(row, ["seller_rating", "avaliacao_vendedor"]),
  };
}

export function parseCatalogAiInput(raw: string) {
  const trimmed = raw.trim();
  const errors: string[] = [];

  if (!trimmed) {
    return { products: [] as CatalogAiProductInput[], errors: ["Nenhum conteudo informado."] };
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const rows = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.products)
          ? parsed.products
          : [];

      const products = rows
        .filter(isRecord)
        .map((row, index) => mapRowToProduct(row, index));

      return {
        products,
        errors:
          products.length > 0
            ? errors
            : ["JSON lido, mas nenhum produto valido foi encontrado."],
      };
    } catch {
      return { products: [] as CatalogAiProductInput[], errors: ["JSON invalido."] };
    }
  }

  const rows = parseDelimitedRows(trimmed);
  const [header, ...body] = rows;
  if (!header || body.length === 0) {
    return {
      products: [] as CatalogAiProductInput[],
      errors: ["CSV invalido. Envie cabecalho e pelo menos uma linha."],
    };
  }

  const products = body.map((values, rowIndex) => {
    const row = header.reduce<UnknownRecord>((acc, key, index) => {
      acc[key.trim()] = values[index] ?? "";
      return acc;
    }, {});
    return mapRowToProduct(row, rowIndex);
  });

  return { products, errors };
}
