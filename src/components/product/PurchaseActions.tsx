"use client";

import { useEffect, useMemo, useState } from "react";

import AddToCartButton from "@/components/cart/AddToCartButton";

type PurchaseActionsProps = {
  listingId: string;
  disabled: boolean;
};

const STORAGE_KEY = "ganmols_shipping_service_id";

export default function PurchaseActions({
  listingId,
  disabled,
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
    <div className="flex flex-wrap gap-3">
      <a
        href={checkoutHref}
        className={`hidden md:inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        Comprar agora
      </a>
      <a
        href={checkoutHref}
        className={`md:hidden rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        Comprar agora
      </a>
      <AddToCartButton listingId={listingId} disabled={disabled} />
    </div>
  );
}
