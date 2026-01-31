import CartCheckoutClient from "@/components/checkout/CartCheckoutClient";

export const dynamic = "force-dynamic";

export default function CartCheckoutPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Checkout do carrinho
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Revise seu carrinho
        </h1>
      </header>
      <CartCheckoutClient />
    </div>
  );
}

