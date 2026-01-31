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
    "NES",
    "Super Nintendo",
    "Nintendo 64",
    "GameCube",
    "Wii",
    "Wii U",
    "Switch",
    "Game Boy",
    "Nintendo DS",
    "Nintendo 3DS",
  ],
  playstation: [
    "PlayStation 1",
    "PlayStation 2",
    "PlayStation 3",
    "PlayStation 4",
    "PlayStation 5",
    "PSP",
    "PS Vita",
  ],
  xbox: ["Xbox Classic", "Xbox 360", "Xbox One", "Series X|S"],
  sega: ["Mega Drive", "Master System", "Saturn", "Dreamcast", "Game Gear"],
  atari: ["Atari 2600", "Atari 5200", "Atari 7800", "Atari Lynx"],
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
