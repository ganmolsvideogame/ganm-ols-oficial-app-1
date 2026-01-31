"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { notifyCartCount } from "@/lib/cart/events";

type AddToCartButtonProps = {
  listingId: string;
  className?: string;
  label?: string;
  redirectTo?: string;
  disabled?: boolean;
};

export default function AddToCartButton({
  listingId,
  className,
  label = "Adicionar ao carrinho",
  redirectTo,
  disabled,
}: AddToCartButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const fallback = `/produto/${listingId}`;
      const next = redirectTo ?? fallback;
      router.push(`/entrar?redirect_to=${encodeURIComponent(next)}`);
      setIsLoading(false);
      return;
    }

    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (cartError) {
      setMessage("Erro ao acessar seu carrinho.");
      setIsLoading(false);
      return;
    }

    let cartId = cart?.id ?? null;
    if (!cartId) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (createError || !newCart?.id) {
        setMessage("Nao foi possivel criar seu carrinho.");
        setIsLoading(false);
        return;
      }
      cartId = newCart.id;
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("quantity_available")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError) {
      setMessage("Erro ao verificar estoque.");
      setIsLoading(false);
      return;
    }

    const available =
      typeof listing?.quantity_available === "number"
        ? listing.quantity_available
        : null;

    const { data: existingItem, error: existingError } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existingError) {
      setMessage("Erro ao atualizar o carrinho.");
      setIsLoading(false);
      return;
    }

    if (existingItem?.id) {
      const currentQuantity = existingItem.quantity ?? 0;
      const nextQuantity = Math.max(1, currentQuantity + 1);
      if (available !== null && nextQuantity > available) {
        setMessage("Nao e possivel adicionar mais deste item.");
        setIsLoading(false);
        return;
      }
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({
          quantity: nextQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);

      if (updateError) {
        setMessage(updateError.message);
        setIsLoading(false);
        return;
      }
    } else {
      if (available !== null && available < 1) {
        setMessage("Produto sem estoque no momento.");
        setIsLoading(false);
        return;
      }
      const { error: insertError } = await supabase.from("cart_items").insert({
        cart_id: cartId,
        listing_id: listingId,
        quantity: 1,
      });

      if (insertError) {
        setMessage(insertError.message);
        setIsLoading(false);
        return;
      }
    }

    await fetch("/api/notifications/cart-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId }),
    }).catch(() => null);

    const { data: items } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("cart_id", cartId);

    const nextCount =
      items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
    notifyCartCount(nextCount);

    setMessage("Item adicionado ao carrinho.");
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={
          className ??
          "rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isLoading ? "Adicionando..." : label}
      </button>
      {message ? (
        <span className="text-xs text-zinc-500">{message}</span>
      ) : null}
    </div>
  );
}
