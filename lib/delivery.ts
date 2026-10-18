/**
 * What each shop charges to bring a basket home to the IE Tower area (postcode
 * 28029), as Soy Super's cart showed it on 18 October 2026. The fee is the one
 * before a delivery slot is chosen; `freeFrom` is the basket value from which
 * delivery is free, or null when the shop lists none.
 */
export type DeliveryTerms = { fee: number; freeFrom: number | null };

export const DELIVERY: Record<string, DeliveryTerms> = {
  Mercadona: { fee: 8.2, freeFrom: null },
  Dia: { fee: 3.99, freeFrom: 100 },
  Carrefour: { fee: 7, freeFrom: 120 },
  Alcampo: { fee: 7, freeFrom: null },
};

export const DELIVERY_CHECKED_ON = "2026-10-18";

/** The delivery charge for a basket worth `basketTotal` at `shop`. */
export function deliveryFee(shop: string, basketTotal: number): number {
  const terms = DELIVERY[shop];
  if (!terms) return 0;
  return terms.freeFrom !== null && basketTotal >= terms.freeFrom ? 0 : terms.fee;
}

/** What each hour of your own time saved costs: the delivery charge over the hours the trip would take. */
export function perHourSaved(fee: number, minutesSaved: number): number | null {
  return minutesSaved > 0 ? fee / (minutesSaved / 60) : null;
}
