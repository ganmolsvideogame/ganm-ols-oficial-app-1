export const MARKETPLACE_FEE_PERCENT = 10;
export const MIN_LISTING_PRICE_CENTS = 100;
export const DEFAULT_AUCTION_INCREMENT_PERCENT = 25;
export const FUNDS_HOLD_DAYS = 7;
export const SELLER_POST_DAYS = 2;
export const BUYER_APPROVAL_DAYS = 3;
export const CANCEL_REASONS = [
  "Vendedor nao postou no prazo",
  "Vendedor pediu cancelamento",
  "Nao quero mais o produto",
  "Comprei por engano",
  "Endereco incorreto ou nao consigo receber",
  "Problema com pagamento",
];

export function calculateFeeCents(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return 0;
  }
  return Math.round((amountCents * MARKETPLACE_FEE_PERCENT) / 100);
}

export function calculateMinBidCents(
  baseCents: number,
  incrementPercent: number
): number {
  const safeBase = Number.isFinite(baseCents) ? baseCents : 0;
  const safePercent = Number.isFinite(incrementPercent)
    ? incrementPercent
    : DEFAULT_AUCTION_INCREMENT_PERCENT;
  return Math.ceil((safeBase * (100 + safePercent)) / 100);
}
