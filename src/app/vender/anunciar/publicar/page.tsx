import ImageUploadField from "@/components/listings/ImageUploadField";
import ListingFlowShell from "@/components/seller/create-listing/ListingFlowShell";
import SellerListingIntentTracker from "@/components/seller/SellerListingIntentTracker";
import { createListingAction } from "@/app/vender/actions";
import { requireSeller } from "@/lib/auth/requireSeller";
import { formatCentsToBRL, parsePriceToCents } from "@/lib/utils/price";

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
    error?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await requireSeller("/vender/anunciar/publicar");
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
  const listingType = params.listing_type ?? "now";
  const auctionIncrementPercent =
    params.auction_increment_percent ?? "";
  const auctionDurationDays = params.auction_duration_days ?? "";
  const auctionEndAt = params.auction_end_at ?? "";
  const freeShipping = params.free_shipping ?? "";
  const parsedPrice = parsePriceToCents(price);

  return (
    <ListingFlowShell
      backHref={`/vender/anunciar/formato?kind=${kind}&family=${family}&platform=${encodeURIComponent(
        platform
      )}&title=${encodeURIComponent(title)}&model=${encodeURIComponent(
        model
      )}&seller_name=${encodeURIComponent(
        sellerName
      )}&description=${encodeURIComponent(description)}&price=${encodeURIComponent(
        price
      )}&quantity_available=${encodeURIComponent(
        quantityAvailable
      )}&condition=${encodeURIComponent(
        condition
      )}&listing_type=${encodeURIComponent(
        listingType
      )}&auction_increment_percent=${encodeURIComponent(
        auctionIncrementPercent
      )}&auction_duration_days=${encodeURIComponent(
        auctionDurationDays
      )}&auction_end_at=${encodeURIComponent(
        auctionEndAt
      )}&free_shipping=${encodeURIComponent(freeShipping)}`}
      topTitle="Publicar"
      title="Revise tudo e envie suas fotos"
      description="Ultimo passo. Assim que publicar, o anuncio segue para moderacao e depois entra na vitrine da GANM OLS."
      footer={
        <button
          type="submit"
          form="listing-publish-form"
          className="w-full rounded-[1.5rem] bg-zinc-950 px-6 py-4 text-lg font-semibold text-white transition hover:bg-zinc-800"
        >
          Publicar anuncio
        </button>
      }
    >
      {params.error ? (
        <div className="mb-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {params.error}
        </div>
      ) : null}

      <form
        id="listing-publish-form"
        action={createListingAction}
        encType="multipart/form-data"
        className="space-y-6"
      >
        <SellerListingIntentTracker />
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
        <input type="hidden" name="listing_type" value={listingType} />
        <input
          type="hidden"
          name="auction_increment_percent"
          value={auctionIncrementPercent}
        />
        <input
          type="hidden"
          name="auction_duration_days"
          value={auctionDurationDays}
        />
        <input type="hidden" name="auction_end_at" value={auctionEndAt} />
        {freeShipping ? (
          <input type="hidden" name="free_shipping" value={freeShipping} />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Categoria
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              {family || "Nao definida"}
            </p>
          </div>
          <div className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Plataforma
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              {platform || "Nao definida"}
            </p>
          </div>
          <div className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50 px-4 py-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Titulo
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              {title || "Sem titulo"}
            </p>
          </div>
          <div className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Preco
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              {parsedPrice ? formatCentsToBRL(parsedPrice) : price || "Nao definido"}
            </p>
          </div>
          <div className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Formato
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              {listingType === "auction" ? "Lance programado" : "Venda imediata"}
            </p>
          </div>
          <div className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Condicao
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900 capitalize">
              {condition}
            </p>
          </div>
          <div className="rounded-[1.7rem] border border-zinc-200 bg-zinc-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Frete
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              {freeShipping ? "Gratis" : "Pago pelo comprador"}
            </p>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Fotos do anuncio
          </p>
          <div className="mt-4">
            <ImageUploadField
              name="images"
              label="Envie as imagens principais"
              helperText="Obrigatorio. Coloque pelo menos uma foto para o anuncio poder ser veiculado."
              required
            />
          </div>
          <div className="mt-4 grid gap-2 text-sm text-zinc-600">
            <p>
              <span className="font-semibold text-zinc-900">Vendedor:</span>{" "}
              {sellerName || "Nao definido"}
            </p>
            <p>
              <span className="font-semibold text-zinc-900">Quantidade:</span>{" "}
              {quantityAvailable}
            </p>
            {model ? (
              <p>
                <span className="font-semibold text-zinc-900">Modelo:</span> {model}
              </p>
            ) : null}
          </div>
        </div>
      </form>
    </ListingFlowShell>
  );
}
