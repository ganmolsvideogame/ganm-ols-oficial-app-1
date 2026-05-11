import "server-only";

import { createHash } from "crypto";

// Mercado Pago idempotency keys must be stable for safe retries.
export function buildIdempotencyKey(seed: string) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

