"use client";

import { useEffect, useMemo, useState } from "react";

import { formatCentsToBRL } from "@/lib/utils/price";

type ShippingOption = {
  shipping_cost_cents: number;
  service_id: string | null | undefined;
  service_name: string;
  estimated_days: number | null;
  carrier?: string | null;
};

type QuoteResponse = {
  shipping_cost_cents: number;
  service_id?: string | null;
  service_name: string;
  estimated_days: number | null;
  is_free: boolean;
  carrier?: string | null;
  shipping_options?: ShippingOption[];
  error?: string;
};

type CouponResponse = {
  discount_cents: number;
  message?: string;
  error?: string;
};

type CheckoutSummaryProps = {
  listingId: string;
  listingPriceCents: number;
  shippingAvailable: boolean;
  freeShipping: boolean;
  initialZipcode?: string | null;
  addressComplete: boolean;
};

const STORAGE_ZIP = "ganmols_cep";
const STORAGE_SERVICE_ID = "ganmols_shipping_service_id";
const STORAGE_SERVICE_NAME = "ganmols_shipping_service_name";

function normalizeZipcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export default function CheckoutSummary({
  listingId,
  listingPriceCents,
  shippingAvailable,
  freeShipping,
  initialZipcode,
  addressComplete,
}: CheckoutSummaryProps) {
  const [zipcode, setZipcode] = useState("");
  const [cityLabel, setCityLabel] = useState("");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null
  );
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    const storedZip = window.localStorage.getItem(STORAGE_ZIP);
    const storedServiceId = window.localStorage.getItem(STORAGE_SERVICE_ID);
    if (storedZip) {
      setZipcode(storedZip);
    } else if (initialZipcode) {
      setZipcode(initialZipcode);
    }
    if (storedServiceId) {
      setSelectedServiceId(storedServiceId);
    }
  }, [initialZipcode]);

  useEffect(() => {
    const normalized = normalizeZipcode(zipcode);
    if (normalized.length !== 8) {
      setCityLabel("");
      return;
    }
    const controller = new AbortController();
    const fetchCity = async () => {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${normalized}/json/`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setCityLabel("");
          return;
        }
        const data = (await response.json()) as {
          localidade?: string;
          uf?: string;
          erro?: boolean;
        };
        if (data.erro || !data.localidade || !data.uf) {
          setCityLabel("");
          return;
        }
        const label = `${data.localidade} - ${data.uf}`;
        setCityLabel(label);
        window.localStorage.setItem("ganmols_city", label);
      } catch {
        setCityLabel("");
      }
    };

    void fetchCity();
    return () => controller.abort();
  }, [zipcode]);

  async function handleQuote() {
    setQuoteError("");
    setOptions([]);
    const normalized = normalizeZipcode(zipcode);
    if (!freeShipping && normalized.length < 8) {
      setQuoteError("Informe um CEP valido.");
      return;
    }

    setLoadingQuote(true);
    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, zipcode: normalized }),
      });
      const data = (await response.json()) as QuoteResponse;
      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel calcular o frete.");
      }
      const responseOptions =
        data.shipping_options && data.shipping_options.length > 0
          ? data.shipping_options
          : [
              {
                shipping_cost_cents: data.shipping_cost_cents,
                service_id: data.service_id ?? null,
                service_name: data.service_name,
                estimated_days: data.estimated_days,
                carrier: data.carrier ?? null,
              },
            ];
      setOptions(responseOptions);
      window.localStorage.setItem(STORAGE_ZIP, normalized);
      const storedServiceId = window.localStorage.getItem(STORAGE_SERVICE_ID);
      const defaultOption =
        (storedServiceId
          ? responseOptions.find(
              (option) => option.service_id === storedServiceId
            )
          : null) ?? responseOptions[0];
      const nextServiceId = defaultOption?.service_id ?? null;
      setSelectedServiceId(nextServiceId);
      if (nextServiceId) {
        window.localStorage.setItem(STORAGE_SERVICE_ID, nextServiceId);
      }
      window.localStorage.setItem(
        STORAGE_SERVICE_NAME,
        defaultOption?.service_name ?? ""
      );
      window.dispatchEvent(new Event("shipping-service-updated"));
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Erro ao calcular frete.");
    } finally {
      setLoadingQuote(false);
    }
  }

  useEffect(() => {
    const normalized = normalizeZipcode(zipcode);
    if (normalized.length === 8 && options.length === 0 && !loadingQuote) {
      void handleQuote();
    }
  }, [zipcode, options.length, loadingQuote]);

  const selectedOption =
    options.find((option) => option.service_id === selectedServiceId) ??
    options[0] ??
    null;

  const shippingCostCents = freeShipping
    ? 0
    : selectedOption?.shipping_cost_cents ?? 0;

  const subtotalCents = listingPriceCents + shippingCostCents;
  const totalCents = Math.max(0, subtotalCents - discountCents);

  const canCheckout =
    addressComplete &&
    (!shippingAvailable ||
      freeShipping ||
      Boolean(selectedOption?.service_id));

  async function applyCoupon() {
    const trimmed = couponCode.trim();
    setCouponMessage("");
    if (!trimmed) {
      setDiscountCents(0);
      return;
    }
    setCouponLoading(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, listing_id: listingId }),
      });
      const data = (await response.json()) as CouponResponse;
      if (!response.ok) {
        throw new Error(data.error || "Cupom invalido.");
      }
      setDiscountCents(Math.max(0, data.discount_cents || 0));
      setCouponMessage(data.message || "Cupom aplicado!");
    } catch (error) {
      setDiscountCents(0);
      setCouponMessage(
        error instanceof Error ? error.message : "Cupom invalido."
      );
    } finally {
      setCouponLoading(false);
    }
  }

  const couponInput = useMemo(() => couponCode.trim(), [couponCode]);

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Frete
        </p>
        {!shippingAvailable ? (
          <p className="mt-2 text-sm text-zinc-600">
            Envio a combinar com o vendedor.
          </p>
        ) : freeShipping ? (
          <p className="mt-2 text-sm text-emerald-700">
            Frete gratis para este anuncio.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2">
              <input
                className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm"
                placeholder="CEP de entrega"
                value={zipcode}
                onChange={(event) => setZipcode(event.target.value)}
              />
              <button
                type="button"
                onClick={handleQuote}
                disabled={loadingQuote}
                className="self-start rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {loadingQuote ? "Calculando..." : "Calcular frete"}
              </button>
              {cityLabel ? (
                <p className="text-xs text-zinc-500">Cidade: {cityLabel}</p>
              ) : null}
              {quoteError ? (
                <p className="text-xs text-rose-600">{quoteError}</p>
              ) : null}
            </div>
            {options.length > 0 ? (
              <div className="mt-4 space-y-2">
                {options.map((option) => {
                  const optionId = option.service_id ?? option.service_name;
                  return (
                    <label
                      key={optionId}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
                    >
                      <input
                        type="radio"
                        name="shipping_option"
                        className="mt-0.5"
                        checked={option.service_id === selectedServiceId}
                        onChange={() => {
                          const nextId = option.service_id ?? null;
                          setSelectedServiceId(nextId);
                          if (nextId) {
                            window.localStorage.setItem(
                              STORAGE_SERVICE_ID,
                              nextId
                            );
                          }
                          window.localStorage.setItem(
                            STORAGE_SERVICE_NAME,
                            option.service_name
                          );
                          window.dispatchEvent(
                            new Event("shipping-service-updated")
                          );
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-zinc-900">
                            {option.service_name}
                          </span>
                          <span className="font-semibold text-zinc-900">
                            {formatCentsToBRL(option.shipping_cost_cents)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {option.carrier ? `${option.carrier} Жњ ` : ""}
                          {option.estimated_days
                            ? `${option.estimated_days} dias`
                            : "Prazo nao informado"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Cupom de desconto
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="flex-1 rounded-2xl border border-zinc-200 px-4 py-2 text-sm"
            placeholder="Digite seu cupom"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={couponLoading || couponInput.length === 0}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-60"
          >
            {couponLoading ? "Aplicando..." : "Aplicar"}
          </button>
        </div>
        {couponMessage ? (
          <p className="mt-2 text-xs text-zinc-600">{couponMessage}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <div className="flex items-center justify-between">
          <span>Produto</span>
          <span className="font-semibold">
            {formatCentsToBRL(listingPriceCents)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Frete</span>
          <span className="font-semibold">
            {freeShipping
              ? "Gratis"
              : shippingAvailable
                ? formatCentsToBRL(shippingCostCents)
                : "A combinar"}
          </span>
        </div>
        {discountCents > 0 ? (
          <div className="mt-2 flex items-center justify-between text-emerald-700">
            <span>Desconto</span>
            <span className="font-semibold">
              -{formatCentsToBRL(discountCents)}
            </span>
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-between text-base font-semibold text-zinc-900">
          <span>Total</span>
          <span>{formatCentsToBRL(totalCents)}</span>
        </div>
      </div>

      <form action="/api/mercadopago/preference" method="post">
        <input type="hidden" name="listing_id" value={listingId} />
        {selectedOption?.service_id ? (
          <input
            type="hidden"
            name="shipping_service_id"
            value={selectedOption.service_id}
          />
        ) : null}
        {couponCode.trim() ? (
          <input type="hidden" name="coupon_code" value={couponCode.trim()} />
        ) : null}
        <button
          type="submit"
          disabled={!canCheckout}
          className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Finalizar pagamento
        </button>
        {!addressComplete ? (
          <p className="mt-2 text-xs text-rose-600">
            Complete seu endereco antes de finalizar.
          </p>
        ) : null}
      </form>
    </div>
  );
}
