import { AUCTION_DURATION_OPTIONS } from "@/lib/auctions";
import { DEFAULT_AUCTION_INCREMENT_PERCENT } from "@/lib/config/commerce";
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
    listing_type?: string;
    auction_increment_percent?: string;
    auction_duration_days?: string;
    auction_end_at?: string;
    free_shipping?: string;
  }>;
};

function formatDateTimeLocal(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function Page({ searchParams }: PageProps) {
  await requireSeller("/vender/anunciar/formato");
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
  const defaultAuctionEnd = formatDateTimeLocal(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const listingType = params.listing_type ?? "now";
  const auctionIncrementPercent =
    params.auction_increment_percent ?? String(DEFAULT_AUCTION_INCREMENT_PERCENT);
  const auctionDurationDays = params.auction_duration_days ?? "7";
  const auctionEndAt = params.auction_end_at ?? defaultAuctionEnd;
  const freeShipping = params.free_shipping ?? "";

  return (
    <ListingFlowShell
      backHref={`/vender/anunciar/venda?kind=${kind}&family=${family}&platform=${encodeURIComponent(
        platform
      )}&title=${encodeURIComponent(title)}&model=${encodeURIComponent(
        model
      )}&seller_name=${encodeURIComponent(
        sellerName
      )}&description=${encodeURIComponent(description)}&price=${encodeURIComponent(
        price
      )}&quantity_available=${encodeURIComponent(
        quantityAvailable
      )}&condition=${encodeURIComponent(condition)}`}
      topTitle="Formato"
      title="Escolha como a venda vai acontecer"
      description="Venda imediata para girar estoque rapido ou lance programado para capturar mais valor."
      footer={
        <button
          type="submit"
          form="listing-format-step"
          className="w-full rounded-[1.5rem] bg-zinc-950 px-6 py-4 text-lg font-semibold text-white transition hover:bg-zinc-800"
        >
          Continuar
        </button>
      }
    >
      <form
        id="listing-format-step"
        action="/vender/anunciar/publicar"
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
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="quantity_available" value={quantityAvailable} />
        <input type="hidden" name="condition" value={condition} />

        <div className="grid gap-3">
          {[
            {
              label: "Venda imediata",
              value: "now",
              helper: "O comprador fecha o pedido na hora.",
            },
            {
              label: "Lance programado",
              value: "auction",
              helper: "Receba lances acima do preco base.",
            },
          ].map((option, index) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="listing_type"
                value={option.value}
                defaultChecked={listingType === option.value || (index === 0 && !listingType)}
                className="peer sr-only"
              />
              <div className="rounded-[1.6rem] border border-zinc-200 bg-white px-5 py-5 shadow-sm transition peer-checked:border-zinc-950 peer-checked:bg-zinc-50">
                <p className="text-base font-semibold text-zinc-900">
                  {option.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {option.helper}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-semibold text-zinc-900">
              Incremento (%)
            </label>
            <input
              name="auction_increment_percent"
              defaultValue={auctionIncrementPercent}
              className="mt-3 w-full rounded-[1.2rem] border border-zinc-200 px-3 py-3 text-sm text-zinc-900"
            />
          </div>

          <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-semibold text-zinc-900">
              Duracao
            </label>
            <select
              name="auction_duration_days"
              defaultValue={auctionDurationDays}
              className="mt-3 w-full rounded-[1.2rem] border border-zinc-200 px-3 py-3 text-sm text-zinc-900"
            >
              {AUCTION_DURATION_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {days} {days === 1 ? "dia" : "dias"}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-sm sm:col-span-3">
            <label className="text-sm font-semibold text-zinc-900">
              Encerramento dos lances
            </label>
            <input
              type="datetime-local"
              name="auction_end_at"
              defaultValue={auctionEndAt}
              className="mt-3 w-full rounded-[1.2rem] border border-zinc-200 px-3 py-3 text-sm text-zinc-900"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-[1.6rem] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700 shadow-sm">
          <input
            type="checkbox"
            name="free_shipping"
            defaultChecked={freeShipping === "on"}
            className="mt-1 h-4 w-4 rounded border-zinc-300"
          />
          <span>
            <span className="block font-semibold text-zinc-900">
              Oferecer frete gratis
            </span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">
              O valor do envio sera descontado da sua venda.
            </span>
          </span>
        </label>
      </form>
    </ListingFlowShell>
  );
}
