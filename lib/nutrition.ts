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
 * What a food contains per 100 g, or per 100 ml for liquids.
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
};

const f = (
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  sugar: number,
  salt: number,
  extra: { edible?: number; unitGrams?: number } = {},
): Food => ({ kcal, protein, fat, carbs, sugar, salt, ...extra });

//                                kcal  prot   fat  carb sugar  salt
export const FOODS: Record<string, Food> = {
  pollo: f(114, 23, 1.7, 0, 0, 0.18),
  cerdo: f(143, 21, 6, 0, 0, 0.15),
  "carne picada": f(215, 18, 16, 0, 0, 0.15),
  "jamon cocido": f(108, 18, 3.5, 1, 0.8, 2.0),
  leche: f(64, 3.1, 3.6, 4.7, 4.7, 0.1),
  huevos: f(143, 12.6, 9.9, 0.7, 0.4, 0.35, { unitGrams: 53 }),
  mantequilla: f(717, 0.9, 81, 0.1, 0.1, 1.6),
  queso: f(285, 16, 22, 3, 3, 2.4),
  "queso fresco": f(68, 11, 0.5, 3.5, 3.5, 0.5),
  yogur: f(61, 3.8, 3.0, 4.7, 4.7, 0.12),
  pan: f(270, 9, 1.5, 54, 2.5, 1.3),
  "pan de molde": f(255, 8.5, 3.5, 46, 4, 1.2),
  arroz: f(350, 7, 0.6, 78, 0.1, 0.01),
  pasta: f(355, 12, 1.5, 71, 3, 0.01),
  cereales: f(375, 7, 1, 84, 8, 1.1),
  garbanzos: f(120, 7.2, 2.6, 14, 0.5, 0.7),
  lentejas: f(105, 7.5, 0.8, 13.5, 0.5, 0.7),
  alubias: f(95, 6.5, 0.5, 13, 0.6, 0.7),
  atun: f(108, 24.5, 1, 0, 0, 0.8),
  merluza: f(80, 17, 1.5, 0, 0, 0.2),
  salmon: f(208, 20, 13, 0, 0, 0.15),
  aceite: f(822, 0, 91, 0, 0, 0),
  "tomate frito": f(90, 1.4, 5, 8, 7, 0.9),
  tomate: f(18, 0.9, 0.2, 3.9, 2.6, 0.01, { edible: 0.95 }),
  cebolla: f(40, 1.1, 0.1, 9.3, 4.2, 0.01, { edible: 0.9 }),
  patata: f(77, 2, 0.1, 17, 0.8, 0.01, { edible: 0.85 }),
  platano: f(89, 1.1, 0.3, 23, 12, 0.01, { edible: 0.64 }),
  manzana: f(52, 0.3, 0.2, 13.8, 10.4, 0, { edible: 0.9 }),
  lechuga: f(14, 0.9, 0.1, 3, 1.8, 0.03, { edible: 0.8, unitGrams: 450 }),
  agua: f(0, 0, 0, 0, 0, 0),
  naranja: f(47, 0.9, 0.1, 11.8, 9.4, 0, { edible: 0.7 }),
  limon: f(29, 1.1, 0.3, 9.3, 2.5, 0, { edible: 0.6 }),
  pepino: f(15, 0.7, 0.1, 3.6, 1.7, 0.01, { edible: 0.95 }),
  calabacin: f(17, 1.2, 0.3, 3.1, 2.5, 0.01, { edible: 0.95 }),
  "champiñon": f(22, 3.1, 0.3, 3.3, 2, 0.01, { edible: 0.95 }),
  "refresco cola": f(42, 0, 0, 10.6, 10.6, 0),
  "yogur azucarado": f(86, 3.8, 2.5, 12.5, 12.5, 0.1),
  espaguetis: f(355, 12, 1.5, 71, 3, 0.01),
  galletas: f(435, 7, 10.5, 76, 20, 0.6),
  "cacao soluble": f(370, 5.5, 3, 79, 67, 0.2),
  // Ground coffee is drunk, not eaten: the cup it makes has next to no energy.
  "cafe molido": f(2, 0.1, 0, 0, 0, 0),
  cerveza: f(43, 0.4, 0, 3.6, 0, 0.01),
  sardinas: f(208, 25, 11.5, 0, 0, 0.8),
  vinagre: f(19, 0, 0, 0.6, 0.4, 0.01),
  // Fruit and veg, often sold without a label: USDA values, carbohydrate without
  // fibre and energy counted the EU way (2 kcal per g of fibre), as Spanish labels do.
  zanahoria: f(39, 0.9, 0.2, 6.8, 4.7, 0.17, { edible: 0.9 }),
  uvas: f(75, 0.7, 0.2, 17.2, 15.5, 0.01, { edible: 0.95 }),
  "pimiento rojo": f(27, 1, 0.3, 3.9, 3.9, 0.01, { edible: 0.85 }),
  "pimiento verde": f(20, 0.9, 0.2, 2.9, 2.4, 0.01, { edible: 0.85 }),
  ajo: f(158, 6.4, 0.5, 31, 1, 0.04, { edible: 0.85 }),
  brocoli: f(36, 2.8, 0.4, 4, 1.7, 0.08, { edible: 0.6 }),
  espinacas: f(25, 2.9, 0.4, 1.4, 0.4, 0.2),
  berenjena: f(26, 1, 0.2, 3.5, 3.5, 0.01, { edible: 0.9 }),
  aguacate: f(160, 2, 14.7, 1.8, 0.7, 0.02, { edible: 0.7 }),
  fresas: f(32, 0.7, 0.3, 5.7, 4.9, 0, { edible: 0.95 }),
  pera: f(57, 0.4, 0.1, 12.1, 9.8, 0, { edible: 0.9 }),
  kiwi: f(62, 1.1, 0.5, 11.7, 9, 0.01, { edible: 0.85 }),
  mandarina: f(56, 0.8, 0.3, 11.5, 10.6, 0, { edible: 0.75 }),
  // Typical own-brand labels, for products sold without one online.
  "caldo de verduras": f(6, 0.3, 0.2, 0.8, 0.5, 0.8),
  "refresco de naranja": f(31, 0, 0, 7.6, 7.6, 0.02),
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

/**
 * The typical figures for this kind of food: the hand-kept table where it has
 * a row, otherwise the average of the labels collected from the shops.
 */
export function typicalFor(entry: CatalogueEntry): Nutrients | null {
  const food = FOODS[entry.food ?? entry.term];
  if (food) {
    const { kcal, protein, fat, carbs, sugar, salt } = food;
    return { kcal, protein, fat, carbs, sugar, salt };
  }
  const labels = Object.values(entry.offers).flatMap((offer) => (offer.nutrition ? [offer.nutrition] : []));
  if (labels.length === 0) return null;
  const sum = labels.reduce<Nutrients>((total, label) => addNutrients(total, label), ZERO);
  return scaleNutrients(sum, 1 / labels.length);
}

/**
 * What one shop's product holds per 100 g (or 100 ml): its own label when one
 * was collected, otherwise the typical figures for this kind of food.
 */
export function per100For(
  entry: CatalogueEntry,
  offer: Offer | null | undefined,
): { values: Nutrients; source: "label" | "typical" } | null {
  if (offer?.nutrition) return { values: offer.nutrition, source: "label" };
  const typical = typicalFor(entry);
  return typical ? { values: typical, source: "typical" } : null;
}

/** Grams (or millilitres) that are actually eaten from `quantity` servings. */
export function eatenAmount(entry: CatalogueEntry, quantity: number): number {
  const food = FOODS[entry.food ?? entry.term];
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
  const per100: Nutrients | null = offer?.nutrition ?? typicalFor(entry);
  if (!per100) return ZERO;
  return scaleNutrients(per100, eatenAmount(entry, quantity) / 100);
}
