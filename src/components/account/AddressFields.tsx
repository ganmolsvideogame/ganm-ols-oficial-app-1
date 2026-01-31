"use client";

import { useEffect, useState } from "react";

type AddressFieldsProps = {
  initialAddressLine1: string;
  initialAddressLine2: string;
  initialDistrict: string;
  initialCity: string;
  initialState: string;
  initialZipcode: string;
};

type ViaCepResponse = {
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

function normalizeZipcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export default function AddressFields({
  initialAddressLine1,
  initialAddressLine2,
  initialDistrict,
  initialCity,
  initialState,
  initialZipcode,
}: AddressFieldsProps) {
  const [addressLine1, setAddressLine1] = useState(initialAddressLine1);
  const [addressLine2, setAddressLine2] = useState(initialAddressLine2);
  const [district, setDistrict] = useState(initialDistrict);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [zipcode, setZipcode] = useState(initialZipcode);

  useEffect(() => {
    const normalized = normalizeZipcode(zipcode);
    if (normalized.length !== 8) {
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
          return;
        }
        const data = (await response.json()) as ViaCepResponse;
        if (data.erro) {
          return;
        }
        if (data.localidade) {
          setCity(data.localidade);
        }
        if (data.uf) {
          setState(data.uf);
        }
      } catch {
        // ignore
      }
    };

    void fetchCity();
    return () => controller.abort();
  }, [zipcode]);

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-zinc-900">Endereco</p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Rua e numero
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            name="address_line1"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            placeholder="Rua, numero"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Complemento
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            name="address_line2"
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
            placeholder="Apartamento, bloco, etc"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Bairro
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            name="district"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            placeholder="Bairro"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Cidade
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Cidade"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          Estado
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            name="state"
            value={state}
            onChange={(event) => setState(event.target.value)}
            placeholder="Estado"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-700">
          CEP
          <input
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            name="zipcode"
            value={zipcode}
            onChange={(event) => setZipcode(event.target.value)}
            placeholder="00000-000"
          />
        </label>
      </div>
    </div>
  );
}
