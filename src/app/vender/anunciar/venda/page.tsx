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
    price?: string;
    quantity_available?: string;
    condition?: string;
  }>;
};

const CONDITIONS = [
  { label: "Novo", value: "novo" },
  { label: "Usado", value: "usado" },
  { label: "Revisado", value: "revisado" },
  { label: "Colecionavel", value: "colecionavel" },
] as const;

export default async function Page({ searchParams }: PageProps) {
  await requireSeller("/vender/anunciar/venda");
  const params = (await searchParams) ?? {};
  const kind = params.kind ?? "consoles";
  const family = params.family ?? "";
  const platform = params.platform ?? "";
  const title = params.title ?? "";
  const model = params.model ?? "";
  const sellerName = params.seller_name ?? "";
  const description = params.description ?? "";
  const price = params.price ?? "";
  const quantityAvailable = params.quantity_available ?? "1";
  const condition = params.condition ?? "novo";

  return (
    <ListingFlowShell
      backHref={`/vender/anunciar/detalhes?kind=${kind}&family=${family}&platform=${encodeURIComponent(
        platform
      )}&title=${encodeURIComponent(title)}&model=${encodeURIComponent(
        model
      )}&seller_name=${encodeURIComponent(
        sellerName
      )}&description=${encodeURIComponent(description)}`}
      topTitle="Venda"
      title="Defina preco, estoque e estado"
      description="Essas informacoes ajudam a GANM OLS a exibir seu anuncio com mais clareza para quem esta pronto para comprar."
      footer={
        <button
          type="submit"
          form="listing-sale-step"
          className="w-full rounded-[1.5rem] bg-zinc-950 px-6 py-4 text-lg font-semibold text-white transition hover:bg-zinc-800"
        >
          Continuar
        </button>
      }
    >
      <form
        id="listing-sale-step"
        action="/vender/anunciar/formato"
        method="get"
        className="flex h-full flex-col gap-5"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="family" value={family} />
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="model" value={model} />
        <input type="hidden" name="seller_name" value={sellerName} />
        <input type="hidden" name="description" value={description} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.8rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-semibold text-zinc-900">
              Preco
            </label>
            <input
              name="price"
              required
              defaultValue={price}
              placeholder="Ex.: R$ 980,00"
              className="mt-3 w-full rounded-[1.5rem] border border-zinc-200 px-4 py-4 text-base text-zinc-900 placeholder:text-zinc-400"
            />
          </div>

          <div className="rounded-[1.8rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-semibold text-zinc-900">
              Quantidade
            </label>
            <input
              name="quantity_available"
              type="number"
              min={1}
              defaultValue={quantityAvailable}
              className="mt-3 w-full rounded-[1.5rem] border border-zinc-200 px-4 py-4 text-base text-zinc-900"
            />
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-900">Condicao</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CONDITIONS.map((option, index) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="condition"
                  value={option.value}
                  defaultChecked={condition === option.value || (index === 0 && !condition)}
                  className="peer sr-only"
                />
                <div className="rounded-[1.4rem] border border-zinc-200 px-4 py-4 text-sm font-semibold text-zinc-900 transition peer-checked:border-zinc-950 peer-checked:bg-zinc-50">
                  {option.label}
                </div>
              </label>
            ))}
          </div>
        </div>
      </form>
    </ListingFlowShell>
  );
}
