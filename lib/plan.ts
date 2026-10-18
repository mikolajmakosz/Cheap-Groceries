import { compareBasket, type BasketItem, type ItemPricing } from "./pricing.ts";
import {
  ZERO,
  addNutrients,
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
  /** How long the person said this line lasts them, if they said. */
  lastsDays: number | null;
  /** The person said it lasts longer than the plan: a slow item such as oil. */
  outlastsPlan: boolean;
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
 * A basket spread over `days`. Every line is eaten over the plan, unless the
 * person said it lasts longer (a litre of oil that lasts them two months), in
 * which case it is charged, and counted for calories, over those days instead.
 * Nothing is guessed: `lasts` holds only what the person typed, by item id.
 */
export function planBasket(
  items: BasketItem[],
  days: number,
  lasts: Record<string, number | null | undefined> = {},
): Plan {
  const comparison = compareBasket(items);

  const lines: PlanLine[] = comparison.pricing.map((row) => {
    const said = lasts[row.item.id];
    const lastsDays = said && said > 0 ? said : null;
    const consumptionDays = Math.max(days, lastsDays ?? days);
    return {
      row,
      consumptionDays,
      shareInPlan: days / consumptionDays,
      lastsDays,
      outlastsPlan: lastsDays !== null && lastsDays > days,
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

  // A shop's own label where one was collected, otherwise the typical values
  // for the food (see nutritionOf), so every shop gets the best figure there is.
  const labelFor = (line: PlanLine, store: string) => line.row.byStore[store];

  const stores: StorePlan[] = totals.map(({ store, total, perDay }) => {
    // Only the lines every shop prices, so the shops are weighed on the same food.
    const priced = lines.filter((line) => line.row.comparable);
    const nutrition = priced.reduce<Nutrients>(
      (sum, line) =>
        addNutrients(
          sum,
          nutritionOf(line.row.entry!, line.row.item.quantity, labelFor(line, store)),
        ),
      ZERO,
    );
    const nutritionPerDay = priced.reduce<Nutrients>(
      (sum, line) =>
        addNutrients(
          sum,
          scaleNutrients(
            nutritionOf(line.row.entry!, line.row.item.quantity, labelFor(line, store)),
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
