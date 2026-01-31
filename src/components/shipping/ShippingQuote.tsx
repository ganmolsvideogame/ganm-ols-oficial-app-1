"use client";

import { useEffect, useState } from "react";

import { formatCentsToBRL } from "@/lib/utils/price";

type ShippingQuoteResult = {
  shipping_cost_cents: number;
  service_id?: string | null;
  service_name: string;
  estimated_days: number | null;
  is_free: boolean;
  carrier?: string | null;
  shipping_options?: ShippingOption[];
};

type ShippingOption = {
  shipping_cost_cents: number;
  service_id: string | null | undefined;
  service_name: string;
  estimated_days: number | null;
  carrier?: string | null;
};

type ShippingQuoteProps = {
  listingId: string;
  listingPriceCents: number;
  shippingAvailable: boolean;
  freeShipping: boolean;
};

function normalizeZipcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export default function ShippingQuote({
  listingId,
  listingPriceCents,
  shippingAvailable,
  freeShipping,
}: ShippingQuoteProps) {
  const [zipcode, setZipcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null
  );
  const [cityLabel, setCityLabel] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("ganmols_cep");
    const storedCity = window.localStorage.getItem("ganmols_city");
    const storedServiceId = window.localStorage.getItem(
      "ganmols_shipping_service_id"
    );
    if (stored) {
      setZipcode(stored);
    }
    if (storedCity) {
      setCityLabel(storedCity);
    }
    if (storedServiceId) {
      setSelectedServiceId(storedServiceId);
    }
  }, []);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOptions([]);

    const normalized = normalizeZipcode(zipcode);
    if (!freeShipping && normalized.length < 8) {
      setError("Informe um CEP valido.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          zipcode: normalized,
        }),
      });
      const data = (await response.json()) as ShippingQuoteResult & {
        error?: string;
      };
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
      window.localStorage.setItem("ganmols_cep", normalized);
      const storedServiceId = window.localStorage.getItem(
        "ganmols_shipping_service_id"
      );
      const defaultOption =
        (storedServiceId
          ? responseOptions.find(
              (option) => option.service_id === storedServiceId
            )
          : null) ?? responseOptions[0];
      const nextServiceId = defaultOption?.service_id ?? null;
      setSelectedServiceId(nextServiceId);
      if (nextServiceId) {
        window.localStorage.setItem(
          "ganmols_shipping_service_id",
          nextServiceId
        );
      }
      window.localStorage.setItem(
        "ganmols_shipping_service_name",
        defaultOption?.service_name ?? ""
      );
      window.dispatchEvent(new Event("shipping-service-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao calcular frete.");
    } finally {
      setLoading(false);
    }
  }

  const selectedOption =
    options.find((option) => option.service_id === selectedServiceId) ??
    options[0] ??
    null;

  if (!shippingAvailable) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        Envio a combinar com o vendedor.
      </div>
    );
  }

  if (freeShipping) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        Frete gratis para este anuncio.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Calcule o frete
      </p>
      <form className="mt-3 flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm"
          placeholder="CEP de entrega"
          value={zipcode}
          onChange={(event) => setZipcode(event.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {loading ? "Calculando..." : "Calcular frete"}
        </button>
      </form>
      {cityLabel ? (
        <p className="mt-2 text-xs text-zinc-500">Cidade: {cityLabel}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      {options.length > 0 ? (
        <div className="mt-3 space-y-3 text-sm text-zinc-600">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Escolha o frete
          </p>
          <div className="space-y-2">
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
                          "ganmols_shipping_service_id",
                          nextId
                        );
                      }
                      window.localStorage.setItem(
                        "ganmols_shipping_service_name",
                        option.service_name
                      );
                      window.dispatchEvent(new Event("shipping-service-updated"));
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
                      {option.carrier ? `${option.carrier} · ` : ""}
                      {option.estimated_days
                        ? `${option.estimated_days} dias`
                        : "Prazo nao informado"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedOption ? (
            <p>
              Total com produto:{" "}
              <span className="font-semibold text-zinc-900">
                {formatCentsToBRL(
                  listingPriceCents + selectedOption.shipping_cost_cents
                )}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
