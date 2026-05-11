"use client";

import { useEffect, useMemo, useState } from "react";

import type { MetaCatalogEventInput } from "@/lib/analytics/metaCatalog";
import AddToCartButton from "@/components/cart/AddToCartButton";

type PurchaseActionsProps = {
  listingId: string;
  disabled: boolean;
  layout?: "row" | "stack";
  metaProduct?: MetaCatalogEventInput;
};

const STORAGE_KEY = "ganmols_shipping_service_id";

export default function PurchaseActions({
  listingId,
  disabled,
  layout = "row",
  metaProduct,
}: PurchaseActionsProps) {
  const [shippingServiceId, setShippingServiceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const readStorage = () => {
      const value = window.localStorage.getItem(STORAGE_KEY);
      setShippingServiceId(value);
    };
    readStorage();

    window.addEventListener("storage", readStorage);
    window.addEventListener("shipping-service-updated", readStorage);
    return () => {
      window.removeEventListener("storage", readStorage);
      window.removeEventListener("shipping-service-updated", readStorage);
    };
  }, []);

  const checkoutHref = useMemo(() => {
    const params = new URLSearchParams({ listing_id: listingId });
    if (shippingServiceId) {
      params.set("shipping_service_id", shippingServiceId);
    }
    return `/checkout?${params.toString()}`;
  }, [listingId, shippingServiceId]);

  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-3"
          : "flex flex-wrap gap-3"
      }
    >
      <a
        href={checkoutHref}
        className={`inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white ${
          layout === "stack" ? "w-full" : ""
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        Comprar agora
      </a>
      <AddToCartButton
        listingId={listingId}
        metaProduct={metaProduct}
        disabled={disabled}
        className={
          layout === "stack"
            ? "w-full rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            : undefined
        }
      />
      <a
        href="/entrar?role=seller#criar-conta"
        className={`inline-flex items-center justify-center rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 ${
          layout === "stack" ? "w-full" : ""
        }`}
      >
        Seja vendedor
      </a>
    </div>
  );
}
