/**
 * How long the shopping itself takes, once you are inside, from the size of the
 * basket. The walk there is counted separately.
 *
 * A rough model of an ordinary supermarket visit: a fixed few minutes for
 * getting a basket, queueing and paying, a minute and a half to find each
 * product, and a little extra for each further serving of the same thing.
 */
const FIXED_MINUTES = 5;
const PER_PRODUCT_MINUTES = 1.5;
const PER_EXTRA_SERVING_MINUTES = 0.3;

export function estimateShopMinutes(lines: { quantity: number }[]): number {
  if (lines.length === 0) return 0;
  const extra = lines.reduce((sum, line) => sum + Math.max(0, line.quantity - 1), 0);
  return Math.round(
    FIXED_MINUTES +
      PER_PRODUCT_MINUTES * lines.length +
      PER_EXTRA_SERVING_MINUTES * extra,
  );
}
