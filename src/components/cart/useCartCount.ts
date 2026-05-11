"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  notifyCartCount,
  readStoredCartCount,
  subscribeCartCount,
} from "@/lib/cart/events";

export default function useCartCount() {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(() => readStoredCartCount());

  useEffect(() => {
    const unsubscribe = subscribeCartCount((next) => {
      setCount(next);
    });

    const loadCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        notifyCartCount(0);
        return;
      }

      const { data: cart, error: cartError } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cartError || !cart) {
        notifyCartCount(0);
        return;
      }

      const { data: items } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("cart_id", cart.id);

      const nextCount =
        items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
      notifyCartCount(nextCount);
    };

    void loadCount();

    return () => {
      unsubscribe();
    };
  }, [supabase]);

  return count;
}
