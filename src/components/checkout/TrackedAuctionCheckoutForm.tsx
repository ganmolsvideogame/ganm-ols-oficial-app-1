"use client";

import {
  queuePendingGaEvent,
  trackGaEvent,
} from "@/lib/analytics/googleAnalytics";

type TrackedAuctionCheckoutFormProps = {
  orderId: string;
  amountCents: number;
  disabled: boolean;
};

export default function TrackedAuctionCheckoutForm({
  orderId,
  amountCents,
  disabled,
}: TrackedAuctionCheckoutFormProps) {
  function handleSubmit() {
    const payload = {
      currency: "BRL",
      value: Number((amountCents / 100).toFixed(2)),
      item_count: 1,
      checkout_flow: "auction",
      transaction_id: orderId,
    };

    const sent = trackGaEvent("begin_checkout", payload);
    if (!sent) {
      queuePendingGaEvent("begin_checkout", payload);
    }
  }

  return (
    <form action="/api/mercadopago/preference-auction" method="post" onSubmit={handleSubmit}>
      <input type="hidden" name="order_id" value={orderId} />
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {disabled ? "Prazo encerrado" : "Pagar agora"}
      </button>
    </form>
  );
}

