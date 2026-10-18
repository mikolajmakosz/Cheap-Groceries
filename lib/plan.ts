import { compareBasket, type BasketItem, type ItemPricing } from "./pricing.ts";
import {
  ZERO,
  addNutrients,
  lastsDays,
  nutritionOf,
  scaleNutrients,
  type Nutrients,
} from "./nutrition.ts";

/** What a basket line means over the days the basket has to last. */
export type PlanLine = {
  row: ItemPricing;
  /** Days of eating this line actually covers: never fewer than the plan. */
  consumptionDays: number;
  /** The share of this line eaten inside the plan; 1 unless it outlasts it. */
  shareInPlan: number;
  /** How long the quantity bought would last on its own. */
  lastsDays: number;
  /** Bought for longer than the plan: a slow item such as oil. */
  outlastsPlan: boolean;
  /** Bought for less than the plan: more is needed to cover every day. */
  fallsShort: boolean;
};

/** One shop's view of the basket: money, nutrition and what they cost together. */
export type StorePlan = {
  store: string;
  total: number;
  perDay: number;
  perMonth: number;
  /** Everything bought in the priced lines, from this shop's own products. */
  nutrition: Nutrients;
  nutritionPerDay: Nutrients;
  /** Euros per 100 kcal, and per gram of protein; null without nutrition data. */
  per100kcal: number | null;
  perGramProtein: number | null;
};

export type Plan = {
  days: number;
  lines: PlanLine[];
  /** What the shop costs today, per shop. */
  totals: { store: string; total: number; perDay: number }[];
  stores: StorePlan[];
  /** Eaten over the whole plan, and per day. */
  nutrition: Nutrients;
  nutritionPerDay: Nutrients;
};

export const MONTH_DAYS = 30;

/**
 * A basket spread over `days`. A line is eaten over at least the plan, or over
 * as long as its quantity lasts if that is longer, so a litre of oil that lasts
 * a month is not charged, or counted for calories, as if it were gone in a week.
 */
export function planBasket(items: BasketItem[], days: number): Plan {
  const comparison = compareBasket(items);

  const lines: PlanLine[] = comparison.pricing.map((row) => {
    const lasts = row.entry ? lastsDays(row.entry) * row.item.quantity : days;
    const consumptionDays = Math.max(days, lasts);
    return {
      row,
      consumptionDays,
      shareInPlan: days / consumptionDays,
      lastsDays: lasts,
      outlastsPlan: row.entry !== null && lasts > days,
      fallsShort: row.entry !== null && lasts < days,
    };
  });

  const totals = comparison.stores.map((store) => {
    const total = comparison.totals.find((t) => t.store === store)?.total ?? 0;
    const perDay = lines
      .filter((line) => line.row.comparable)
      .reduce((sum, line) => {
        const offer = line.row.byStore[store]!;
        const cost =
          (offer.unit_price * line.row.entry!.serving * line.row.item.quantity) /
          line.row.entry!.basis.amount;
        return sum + cost / line.consumptionDays;
      }, 0);
    return { store, total, perDay };
  });

  // Nutrition of each line spread over the days it is eaten, summed per day.
  const nutritionPerDay = lines.reduce<Nutrients>((sum, line) => {
    if (!line.row.entry) return sum;
    const whole = nutritionOf(line.row.entry, line.row.item.quantity);
    return addNutrients(sum, scaleNutrients(whole, 1 / line.consumptionDays));
  }, ZERO);

  const stores: StorePlan[] = totals.map(({ store, total, perDay }) => {
    // Only the lines every shop prices, so the shops are weighed on the same food.
    const priced = lines.filter((line) => line.row.comparable);
    const nutrition = priced.reduce<Nutrients>(
      (sum, line) =>
        addNutrients(
          sum,
          nutritionOf(line.row.entry!, line.row.item.quantity, line.row.byStore[store]),
        ),
      ZERO,
    );
    const nutritionPerDay = priced.reduce<Nutrients>(
      (sum, line) =>
        addNutrients(
          sum,
          scaleNutrients(
            nutritionOf(line.row.entry!, line.row.item.quantity, line.row.byStore[store]),
            1 / line.consumptionDays,
          ),
        ),
      ZERO,
    );
    return {
      store,
      total,
      perDay,
      perMonth: perDay * MONTH_DAYS,
      nutrition,
      nutritionPerDay,
      per100kcal: nutrition.kcal > 0 ? (total / nutrition.kcal) * 100 : null,
      perGramProtein: nutrition.protein > 0 ? total / nutrition.protein : null,
    };
  });

  return {
    days,
    lines,
    totals,
    stores,
    nutrition: scaleNutrients(nutritionPerDay, days),
    nutritionPerDay,
  };
}

/** "about once a month": how often a quantity that lasts `days` gets bought. */
export function frequencyLabel(days: number): string {
  if (days <= 10) return "about every week";
  if (days <= 18) return "about every two weeks";
  if (days <= 45) return "about once a month";
  if (days <= 75) return "about every two months";
  return "a few times a year";
}
