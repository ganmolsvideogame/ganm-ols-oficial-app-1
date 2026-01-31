import CartClient from "@/components/cart/CartClient";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Carrinho</h1>
        <p className="text-sm text-zinc-600">
          Revise seus itens antes de finalizar a compra.
        </p>
      </div>

      <CartClient />
    </div>
  );
}
