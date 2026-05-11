export type Family = {
  name: string;
  slug: string;
  description: string;
};

export const FAMILIES: Family[] = [
  {
    name: "Nintendo",
    slug: "nintendo",
    description: "Consoles, portateis e classicos.",
  },
  {
    name: "PlayStation",
    slug: "playstation",
    description: "Linha PS e colecionaveis.",
  },
  {
    name: "Xbox",
    slug: "xbox",
    description: "Geracoes Xbox e acessorios.",
  },
  {
    name: "SEGA",
    slug: "sega",
    description: "Mega Drive, Saturn, Dreamcast.",
  },
  {
    name: "Atari",
    slug: "atari",
    description: "Retro absoluto e cartuchos.",
  },
  {
    name: "PC",
    slug: "pc",
    description: "Plataforma completa e upgrades.",
  },
  {
    name: "Acessorios",
    slug: "acessorios",
    description: "Cabos, carregadores e cases.",
  },
  {
    name: "Perifericos",
    slug: "perifericos",
    description: "Teclados, mouses e headsets.",
  },
  {
    name: "Pecas/Manutencao",
    slug: "pecas-manutencao",
    description: "Reposicao, reparos e servicos.",
  },
  {
    name: "Mods",
    slug: "mods",
    description: "Customizacao e desbloqueios.",
  },
];

export const SUBCATEGORIES: Record<string, string[]> = {
  nintendo: [
    "Famicom",
    "NES",
    "Super Nintendo",
    "SNES",
    "Nintendo 64",
    "GameCube",
    "Wii",
    "Wii U",
    "Switch",
    "Switch Lite",
    "Switch OLED",
    "Game Boy",
    "Game Boy Color",
    "Game Boy Advance",
    "Nintendo DS",
    "Nintendo 3DS",
    "New Nintendo 3DS",
  ],
  playstation: [
    "PS One",
    "PlayStation 1",
    "PlayStation 2",
    "PlayStation 3",
    "PlayStation 4",
    "PlayStation 4 Slim",
    "PlayStation 4 Pro",
    "PlayStation 5",
    "PlayStation 5 Slim",
    "PlayStation 5 Digital",
    "PSP",
    "PS Vita",
    "PlayStation Portal",
  ],
  xbox: [
    "Xbox Classic",
    "Xbox 360",
    "Xbox One",
    "Xbox One S",
    "Xbox One X",
    "Xbox Series S",
    "Xbox Series X",
  ],
  sega: [
    "Mega Drive",
    "Master System",
    "Sega CD",
    "32X",
    "Saturn",
    "Dreamcast",
    "Game Gear",
  ],
  atari: ["Atari 2600", "Atari 5200", "Atari 7800", "Atari Lynx", "Atari Jaguar"],
  pc: [
    "Placa de video",
    "Processadores",
    "Memoria RAM",
    "Placa-mae",
    "SSD e HD",
    "Monitores",
    "Notebooks",
    "Gabinetes",
  ],
  acessorios: [
    "Controles",
    "Cabos",
    "Carregadores",
    "Capas e cases",
    "Memory cards",
    "Suportes",
  ],
  perifericos: ["Teclados", "Mouses", "Headsets", "Webcams", "Volantes"],
  "pecas-manutencao": [
    "Fontes",
    "Drives",
    "Lentes",
    "Pecas de reposicao",
    "Servicos tecnicos",
  ],
  mods: ["Modchips", "Desbloqueio", "Shells custom", "LEDs", "Overclock"],
};

const CATEGORY_SEARCH_ALIASES: Record<string, string[]> = {
  "ps one": ["ps1", "playstation 1", "playstation one"],
  "ps1": ["ps one", "playstation 1", "playstation one"],
  "playstation 1": ["ps1", "ps one", "playstation one"],
  "playstation one": ["ps1", "ps one", "playstation 1"],
  "playstation 2": ["ps2"],
  ps2: ["playstation 2"],
  "playstation 3": ["ps3"],
  ps3: ["playstation 3"],
  "playstation 4": ["ps4"],
  ps4: ["playstation 4"],
  "playstation 4 slim": ["ps4 slim"],
  "ps4 slim": ["playstation 4 slim"],
  "playstation 4 pro": ["ps4 pro"],
  "ps4 pro": ["playstation 4 pro"],
  "playstation 5": ["ps5"],
  ps5: ["playstation 5"],
  "playstation 5 slim": ["ps5 slim"],
  "ps5 slim": ["playstation 5 slim"],
  "playstation 5 digital": ["ps5 digital"],
  "ps5 digital": ["playstation 5 digital"],
  "xbox 360": ["x360"],
  x360: ["xbox 360"],
  "xbox series s": ["series s"],
  "series s": ["xbox series s"],
  "xbox series x": ["series x"],
  "series x": ["xbox series x"],
  "super nintendo": ["snes"],
  snes: ["super nintendo"],
};

function normalizeCategorySearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugifyCategorySegment(value: string) {
  const normalized = normalizeCategorySearchValue(value);
  return normalized ? normalized.replace(/\s+/g, "-") : "";
}

export function getCategorySearchTerms(value: string) {
  const base = value.trim();
  if (!base) {
    return [];
  }

  const normalized = normalizeCategorySearchValue(base);
  const terms = new Set<string>();

  terms.add(base);
  if (normalized && normalized !== base.toLowerCase()) {
    terms.add(normalized);
  }

  for (const alias of CATEGORY_SEARCH_ALIASES[normalized] ?? []) {
    const cleanAlias = alias.trim();
    if (cleanAlias) {
      terms.add(cleanAlias);
    }
  }

  return Array.from(terms);
}

export function resolveSubcategoryForFamily(familySlug: string, value: string) {
  const normalizedValue = normalizeCategorySearchValue(value);
  const slugValue = slugifyCategorySegment(value);
  const subcategories = SUBCATEGORIES[familySlug] ?? [];

  if (!normalizedValue && !slugValue) {
    return null;
  }

  for (const subcategory of subcategories) {
    const exactCandidates = new Set<string>([
      normalizeCategorySearchValue(subcategory),
      slugifyCategorySegment(subcategory),
    ]);

    if (exactCandidates.has(normalizedValue) || exactCandidates.has(slugValue)) {
      return subcategory;
    }
  }

  for (const subcategory of subcategories) {
    const aliasCandidates = new Set<string>(
      getCategorySearchTerms(subcategory).flatMap((term) => [
        normalizeCategorySearchValue(term),
        slugifyCategorySegment(term),
      ])
    );

    if (aliasCandidates.has(normalizedValue) || aliasCandidates.has(slugValue)) {
      return subcategory;
    }
  }

  return null;
}

export function buildFamilySubcategoryPath(
  familySlug: string,
  subcategory: string
) {
  return `/marca/${familySlug}/${slugifyCategorySegment(subcategory)}`;
}
