import type { CatalogueEntry, Offer } from "./catalogue.ts";

export type Nutrients = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** Total sugars, natural ones included. */
  sugar: number;
  /** Salt in grams (sodium x 2.5). */
  salt: number;
};

/**
 * What a food contains per 100 g, or per 100 ml for liquids, and how fast one
 * person gets through it.
 *
 * The figures are TYPICAL values for this kind of food, not read off the pack of
 * the specific product a shop sells: brands differ, and a Hacendado tomato sauce
 * is not exactly a Dia one. They are close enough to compare baskets and to see
 * roughly what you eat, and the app says so; they are not dietary advice.
 */
type Food = Nutrients & {
  /** Share of the weight sold that is eaten: peel, core and shell are not. */
  edible?: number;
  /** Grams of food in one piece, for things counted rather than weighed. */
  unitGrams?: number;
  /** Days one serving lasts one person eating it as part of a normal diet. */
  lastsDays: number;
};

const f = (
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  sugar: number,
  salt: number,
  lastsDays: number,
  extra: { edible?: number; unitGrams?: number } = {},
): Food => ({ kcal, protein, fat, carbs, sugar, salt, lastsDays, ...extra });

//                                kcal  prot   fat  carb sugar  salt lasts
export const FOODS: Record<string, Food> = {
  pollo: f(114, 23, 1.7, 0, 0, 0.18, 2),
  cerdo: f(143, 21, 6, 0, 0, 0.15, 2),
  "carne picada": f(215, 18, 16, 0, 0, 0.15, 2),
  "jamon cocido": f(108, 18, 3.5, 1, 0.8, 2.0, 3),
  leche: f(64, 3.1, 3.6, 4.7, 4.7, 0.1, 3),
  huevos: f(143, 12.6, 9.9, 0.7, 0.4, 0.35, 6, { unitGrams: 53 }),
  mantequilla: f(717, 0.9, 81, 0.1, 0.1, 1.6, 25),
  queso: f(285, 16, 22, 3, 3, 2.4, 5),
  "queso fresco": f(68, 11, 0.5, 3.5, 3.5, 0.5, 3),
  yogur: f(61, 3.8, 3.0, 4.7, 4.7, 0.12, 4),
  pan: f(270, 9, 1.5, 54, 2.5, 1.3, 2),
  "pan de molde": f(255, 8.5, 3.5, 46, 4, 1.2, 6),
  arroz: f(350, 7, 0.6, 78, 0.1, 0.01, 10),
  pasta: f(355, 12, 1.5, 71, 3, 0.01, 5),
  cereales: f(375, 7, 1, 84, 8, 1.1, 10),
  garbanzos: f(120, 7.2, 2.6, 14, 0.5, 0.7, 2),
  lentejas: f(105, 7.5, 0.8, 13.5, 0.5, 0.7, 2),
  alubias: f(95, 6.5, 0.5, 13, 0.6, 0.7, 2),
  atun: f(108, 24.5, 1, 0, 0, 0.8, 2),
  merluza: f(80, 17, 1.5, 0, 0, 0.2, 2),
  salmon: f(208, 20, 13, 0, 0, 0.15, 2),
  aceite: f(822, 0, 91, 0, 0, 0, 30),
  "tomate frito": f(90, 1.4, 5, 8, 7, 0.9, 4),
  tomate: f(18, 0.9, 0.2, 3.9, 2.6, 0.01, 4, { edible: 0.95 }),
  cebolla: f(40, 1.1, 0.1, 9.3, 4.2, 0.01, 5, { edible: 0.9 }),
  patata: f(77, 2, 0.1, 17, 0.8, 0.01, 6, { edible: 0.85 }),
  platano: f(89, 1.1, 0.3, 23, 12, 0.01, 3, { edible: 0.64 }),
  manzana: f(52, 0.3, 0.2, 13.8, 10.4, 0, 3, { edible: 0.9 }),
  lechuga: f(14, 0.9, 0.1, 3, 1.8, 0.03, 3, { edible: 0.8, unitGrams: 450 }),
  agua: f(0, 0, 0, 0, 0, 0, 1),
};

export const ZERO: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0, salt: 0 };

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
    sugar: a.sugar + b.sugar,
    salt: a.salt + b.salt,
  };
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  return {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    fat: n.fat * factor,
    carbs: n.carbs * factor,
    sugar: n.sugar * factor,
    salt: n.salt * factor,
  };
}

/** Days one serving of this product lasts one person. */
export function lastsDays(entry: CatalogueEntry): number {
  return FOODS[entry.term]?.lastsDays ?? 3;
}

/** Grams (or millilitres) that are actually eaten from `quantity` servings. */
export function eatenAmount(entry: CatalogueEntry, quantity: number): number {
  const food = FOODS[entry.term];
  const sold = entry.serving * quantity;
  const grams =
    entry.basis.unit === "ud" ? sold * (food?.unitGrams ?? 100) : sold;
  return grams * (food?.edible ?? 1);
}

/**
 * What `quantity` servings of this product add up to, nutritionally. With a
 * shop's offer that carries its own label, the figures are that product's;
 * otherwise the typical values for the food.
 */
export function nutritionOf(
  entry: CatalogueEntry,
  quantity: number,
  offer?: Offer | null,
): Nutrients {
  const food = FOODS[entry.term];
  const per100: Nutrients | null = offer?.nutrition ?? (food
    ? {
        kcal: food.kcal,
        protein: food.protein,
        fat: food.fat,
        carbs: food.carbs,
        sugar: food.sugar,
        salt: food.salt,
      }
    : null);
  if (!per100) return ZERO;
  return scaleNutrients(per100, eatenAmount(entry, quantity) / 100);
}
