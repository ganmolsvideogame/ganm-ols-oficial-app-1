import ListingFlowShell from "@/components/seller/create-listing/ListingFlowShell";
import { requireSeller } from "@/lib/auth/requireSeller";

type PageProps = {
  searchParams?: Promise<{
    kind?: string;
    family?: string;
    platform?: string;
    title?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await requireSeller("/vender/anunciar/titulo");

  const params = (await searchParams) ?? {};
  const family = params.family ?? "";
  const platform = params.platform ?? "";
  const kind = params.kind ?? "consoles";
  const titleValue = params.title ?? "";

  return (
    <ListingFlowShell
      backHref={`/vender/anunciar/plataforma?kind=${kind}&family=${family}`}
      topTitle="Titulo"
      title="Escreva o nome, a marca, o modelo e outras caracteristicas do produto"
      description="Quanto mais detalhes voce adicionar, melhores serao os resultados da busca."
      footer={
        <button
          type="submit"
          form="listing-title-step"
          className="w-full rounded-[1.5rem] bg-zinc-950 px-6 py-4 text-lg font-semibold text-white transition hover:bg-zinc-800"
        >
          Buscar
        </button>
      }
    >
      <form
        id="listing-title-step"
        action="/vender/anunciar/detalhes"
        method="get"
        className="flex h-full flex-col"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="family" value={family} />
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="model" value="" />

        <div className="space-y-4">
          <div className="rounded-[1.9rem] border border-zinc-300 px-5 py-5">
            <input
              name="title"
              required
              defaultValue={titleValue}
              placeholder="Ex.: Celular Samsung Galaxy A56 5g 256gb 8gb Ram"
              className="w-full border-0 p-0 text-2xl tracking-[-0.03em] text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>
      </form>
    </ListingFlowShell>
  );
}
