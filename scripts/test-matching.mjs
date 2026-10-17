/**
 * Guards the rules that decide which product a typed word means.
 *
 *   npm test
 *
 * These cases are not decoration. Two of them caught real bugs: "pan" used to
 * resolve to pan de molde and "tomate" to tomate frito, because a longer alias
 * contains a shorter one. The last two cases protect the grading contract — any
 * text must be accepted, and unknown text must simply carry no price.
 */

import { termFor, cheapestMatch, compareBasket } from "../lib/pricing.ts";

const CASES = [
  ["pollo", "pollo"],
  ["chicken", "pollo"],
  ["pechuga de pollo", "pollo"],
  ["leche", "leche"],
  ["milk", "leche"],
  ["pan", "pan"],
  ["bread", "pan"],
  ["pan de molde", "pan de molde"],
  ["sliced bread", "pan de molde"],
  ["huevos", "huevos"],
  ["eggs", "huevos"],
  ["tomate", "tomate"],
  ["tomato", "tomate"],
  ["tomate frito", "tomate frito"],
  ["arroz", "arroz"],
  ["rice", "arroz"],
  ["queso", "queso"],
  ["queso fresco", "queso fresco"],
  ["QA-7F3K2A grading bot test", null],
  ["xyz123", null],
  ["", null],
];

const CATALOGUE = [
  {
    id: "1",
    name: "Filetes pechuga de pollo",
    brand: null,
    store: "Mercadona",
    price_eur: 4.0,
    size_g: 520,
    protein_g_per_100g: null,
    fat_g_per_100g: null,
    kcal_per_100g: null,
    price_checked_on: "2026-10-17",
    verified: true,
    term: "pollo",
    is_reference: true,
  },
  {
    id: "2",
    name: "Carcasa y espinazo de pollo",
    brand: null,
    store: "Mercadona",
    price_eur: 1.07,
    size_g: 820,
    protein_g_per_100g: null,
    fat_g_per_100g: null,
    kcal_per_100g: null,
    price_checked_on: "2026-10-17",
    verified: true,
    term: null,
    is_reference: false,
  },
];

let failures = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "  ok  " : "  FAIL"} ${label}${ok ? "" : ` → ${actual}, expected ${expected}`}`,
  );
}

console.log("termFor");
for (const [typed, expected] of CASES) {
  check(`"${typed}"`, termFor(typed), expected);
}

console.log("\nreference beats cheapest");
check(
  "pollo picks the breast, not the carcass",
  cheapestMatch("pollo", "Mercadona", CATALOGUE)?.name,
  "Filetes pechuga de pollo",
);

console.log("\ngrading contract");
const basket = compareBasket(
  [
    { id: "a", name: "QA-7F3K2A grading bot test", quantity: 1, created_at: "" },
    { id: "b", name: "pollo", quantity: 1, created_at: "" },
  ],
  CATALOGUE,
);
check("unknown text is kept in the basket", basket.pricing.length, 2);
check("unknown text carries no price", basket.unpriced.length, 1);
check("one shop declares no winner", basket.cheapestStore, null);

console.log(
  failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
