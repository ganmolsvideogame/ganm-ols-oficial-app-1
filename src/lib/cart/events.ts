const CART_COUNT_STORAGE_KEY = "ganmols_cart_count";
const CART_COUNT_EVENT = "ganmols-cart-count";

function toSafeCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

export function readStoredCartCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const stored = Number(window.localStorage.getItem(CART_COUNT_STORAGE_KEY));
  return toSafeCount(stored);
}

export function writeStoredCartCount(count: number) {
  if (typeof window === "undefined") {
    return;
  }
  const safe = toSafeCount(count);
  window.localStorage.setItem(CART_COUNT_STORAGE_KEY, String(safe));
}

export function notifyCartCount(count: number) {
  if (typeof window === "undefined") {
    return;
  }
  const safe = toSafeCount(count);
  writeStoredCartCount(safe);
  window.dispatchEvent(
    new CustomEvent<number>(CART_COUNT_EVENT, { detail: safe })
  );
}

export function subscribeCartCount(callback: (count: number) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<number>).detail;
    callback(toSafeCount(detail));
  };
  window.addEventListener(CART_COUNT_EVENT, handler);
  return () => window.removeEventListener(CART_COUNT_EVENT, handler);
}
