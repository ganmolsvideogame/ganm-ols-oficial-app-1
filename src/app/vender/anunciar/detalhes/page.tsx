import ListingFlowShell from "@/components/seller/create-listing/ListingFlowShell";
import { requireSeller } from "@/lib/auth/requireSeller";

type PageProps = {
  searchParams?: Promise<{
    kind?: string;
    family?: string;
    platform?: string;
    title?: string;
    model?: string;
    seller_name?: string;
    description?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { profile } = await requireSeller("/vender/anunciar/detalhes");
  const params = (await searchParams) ?? {};
  const family = params.family ?? "";
  const platform = params.platform ?? "";
  const kind = params.kind ?? "consoles";
  const title = params.title ?? "";
  const model = params.model ?? "";
  const sellerName = params.seller_name ?? profile?.display_name ?? "";
  const description = params.description ?? "";

  return (
    <ListingFlowShell
      backHref={`/vender/anunciar/titulo?kind=${kind}&family=${family}&platform=${encodeURIComponent(
        platform
      )}`}
      topTitle="Detalhes"
      title="Conte um pouco mais sobre o produto"
      description="Explique o estado, o que acompanha o item e qualquer detalhe que ajude a vender mais rapido."
      footer={
        <button
          type="submit"
          form="listing-details-step"
          className="w-full rounded-[1.5rem] bg-zinc-950 px-6 py-4 text-lg font-semibold text-white transition hover:bg-zinc-800"
        >
          Continuar
        </button>
      }
    >
      <form
        id="listing-details-step"
        action="/vender/anunciar/venda"
        method="get"
        className="flex h-full flex-col gap-5"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="family" value={family} />
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="model" value={model} />

        <div className="rounded-[1.8rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-semibold text-zinc-900">
            Nome real do vendedor
          </label>
          <input
            name="seller_name"
            defaultValue={sellerName}
            required
            placeholder="Ex.: Joao Silva"
            className="mt-3 w-full rounded-[1.5rem] border border-zinc-200 px-4 py-4 text-base text-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        <div className="flex-1 rounded-[1.8rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-semibold text-zinc-900">
            Descricao do anuncio
          </label>
          <textarea
            name="description"
            required
            defaultValue={description}
            placeholder="Ex.: Console revisado, funcionando perfeitamente, acompanha fonte original, controle e cabo AV."
            className="mt-3 h-[clamp(180px,34dvh,280px)] w-full rounded-[1.5rem] border border-zinc-200 px-4 py-4 text-base text-zinc-900 placeholder:text-zinc-400"
          />
        </div>
      </form>
    </ListingFlowShell>
  );
}
