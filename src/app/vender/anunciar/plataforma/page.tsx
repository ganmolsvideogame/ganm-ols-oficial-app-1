import { SUBCATEGORIES } from "@/lib/mock/data";
import { requireSeller } from "@/lib/auth/requireSeller";
import ListingFlowShell from "@/components/seller/create-listing/ListingFlowShell";
import SearchableLinkList from "@/components/seller/create-listing/SearchableLinkList";

type PageProps = {
  searchParams?: Promise<{
    kind?: string;
    family?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await requireSeller("/vender/anunciar/plataforma");

  const params = (await searchParams) ?? {};
  const family = params.family ?? "";
  const kind = params.kind ?? "consoles";
const optionsSource = SUBCATEGORIES[family] ?? [];

const options = optionsSource.map((option, index) => ({
  label: option,
  href: `/vender/anunciar/titulo?kind=${kind}&family=${family}&platform=${encodeURIComponent(
    option
  )}`,
  featured: index < 5,
  searchTerms: [family, option.replaceAll("|", " ")],
}));

  return (
    <ListingFlowShell
      backHref={`/vender/anunciar/categoria?kind=${kind}`}
      topTitle="Categoria"
      title="Preencha estes dados com as especificacoes do fabricante"
      description="Voce pode usar a caixa ou embalagem do produto para verificar as informacoes."
      scrollable
    >
      <SearchableLinkList
        searchPlaceholder="Buscar"
        options={options}
        featuredLabel="Mais usados"
        allLabel="Todos"
        promptLabel="Marca?"
        variant="plain"
      />
    </ListingFlowShell>
  );
}
