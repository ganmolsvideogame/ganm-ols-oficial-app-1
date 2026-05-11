import { FAMILIES } from "@/lib/mock/data";
import { requireSeller } from "@/lib/auth/requireSeller";
import ListingFlowShell from "@/components/seller/create-listing/ListingFlowShell";
import SearchableLinkList from "@/components/seller/create-listing/SearchableLinkList";

type PageProps = {
  searchParams?: Promise<{
    kind?: string;
  }>;
};

const FAMILY_GROUPS: Record<string, string[]> = {
  consoles: ["nintendo", "playstation", "xbox", "sega", "atari", "pc"],
  jogos: ["nintendo", "playstation", "xbox", "pc", "sega", "atari"],
  acessorios: ["acessorios", "perifericos", "pecas-manutencao", "mods"],
  colecionaveis: ["nintendo", "playstation", "xbox", "sega", "atari", "mods"],
};

const FAMILY_SEARCH_TERMS: Record<string, string[]> = {
  nintendo: [
    "nes",
    "super nintendo",
    "snes",
    "nintendo 64",
    "n64",
    "gamecube",
    "wii",
    "wii u",
    "switch",
    "switch oled",
    "switch lite",
    "game boy",
    "game boy color",
    "game boy advance",
    "nintendo ds",
    "nintendo 3ds",
  ],
  playstation: [
    "ps1",
    "ps one",
    "playstation 1",
    "playstation 2",
    "ps2",
    "playstation 3",
    "ps3",
    "playstation 4",
    "ps4",
    "playstation 5",
    "ps5",
    "psp",
    "ps vita",
    "portal",
  ],
  xbox: [
    "xbox classic",
    "xbox 360",
    "xbox one",
    "series s",
    "series x",
    "series x|s",
  ],
  sega: [
    "mega drive",
    "master system",
    "saturn",
    "dreamcast",
    "game gear",
    "sega cd",
    "32x",
  ],
  atari: ["atari 2600", "atari 5200", "atari 7800", "lynx", "jaguar"],
  pc: [
    "placa de video",
    "gpu",
    "processador",
    "cpu",
    "placa mae",
    "ssd",
    "hd",
    "monitor",
    "notebook",
  ],
  acessorios: ["controle", "cabo", "carregador", "case", "memory card", "suporte"],
  perifericos: ["teclado", "mouse", "headset", "webcam", "volante"],
  "pecas-manutencao": ["fonte", "drive", "lente", "peca", "reparo", "manutencao"],
  mods: ["modchip", "desbloqueio", "shell", "led", "overclock"],
};

export default async function Page({ searchParams }: PageProps) {
  await requireSeller("/vender/anunciar/categoria");

  const params = (await searchParams) ?? {};
  const kind = params.kind && FAMILY_GROUPS[params.kind] ? params.kind : "consoles";
  const allowedFamilies = new Set(FAMILY_GROUPS[kind]);

  const options = FAMILIES.filter((family) => allowedFamilies.has(family.slug)).map(
    (family) => ({
      label: family.name,
      href: `/vender/anunciar/plataforma?kind=${kind}&family=${family.slug}`,
      searchTerms: [family.description, ...(FAMILY_SEARCH_TERMS[family.slug] ?? [])],
    })
  );

  return (
    <ListingFlowShell
      backHref="/vender/anunciar"
      topTitle="Categoria"
      title="Qual opcao o descreve?"
      scrollable
    >
      <SearchableLinkList
        searchPlaceholder="Procurar"
        options={options}
        featuredLabel=""
        allLabel=""
        variant="plain"
      />
    </ListingFlowShell>
  );
}
