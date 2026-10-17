/**
 * Guards the rules that decide which product a typed word means.
 *
 *   npm test
 *
 * These cases are not decoration. Two of them caught real bugs: "pan" used to
 * resolve to pan de molde and "tomate" to tomate frito, because a longer alias
 * contains a shorter one. The grading-contract cases protect behaviour that is
 * easy to break by accident: any text must be accepted, unknown text must simply
 * carry no price, and suggestions must never be required to save something.
 */

import { termFor, entryFor, suggest, compareBasket } from "../lib/pricing.ts";
import { CATALOGUE, CATALOGUE_STORES } from "../lib/catalogue.ts";

let failures = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "  ok  " : "  FAIL"} ${label}${ok ? "" : ` → ${actual}, expected ${expected}`}`,
  );
}

const item = (id, name, quantity = 1) => ({ id, name, quantity, created_at: "" });

console.log("termFor");
for (const [typed, expected] of [
  ["pollo", "pollo"],
  ["chicken", "pollo"],
  ["chicken breast", "pollo"],
  ["pechuga de pollo", "pollo"],
  ["leche", "leche"],
  ["milk", "leche"],
  ["Whole milk", "leche"],
  ["pan", "pan"],
  ["bread", "pan"],
  ["Bread", "pan"],
  ["pan de molde", "pan de molde"],
  ["sliced bread", "pan de molde"],
  ["huevos", "huevos"],
  ["eggs", "huevos"],
  ["tomate", "tomate"],
  ["tomato", "tomate"],
  ["tomate frito", "tomate frito"],
  ["tomato sauce", "tomate frito"],
  ["arroz", "arroz"],
  ["rice", "arroz"],
  ["queso", "queso"],
  ["queso fresco", "queso fresco"],
  ["butter", "mantequilla"],
  ["banana", "platano"],
  ["QA-7F3K2A grading bot test", null],
  ["xyz123", null],
  ["", null],
]) {
  check(`"${typed}"`, termFor(typed), expected);
}

console.log("\nthe same thing in two languages");
check(
  "chicken and pollo are one product",
  entryFor("chicken")?.term,
  entryFor("pollo")?.term,
);

console.log("\nsuggestions");
const bre = suggest("bre").map((entry) => entry.label);
check('"bre" offers Bread', bre.includes("Bread"), true);
check('"bre" offers Sliced bread', bre.includes("Sliced bread"), true);
check('"pan" puts Bread first', suggest("pan")[0]?.label, "Bread");
check("one letter suggests nothing", suggest("b").length, 0);
check("nonsense suggests nothing", suggest("QA-7F3K2A").length, 0);
check("at most six", suggest("a").length <= 6, true);

console.log("\ncatalogue");
check("two shops are covered", CATALOGUE_STORES.length, 2);
check(
  "every term is priced at every shop",
  CATALOGUE.every((entry) =>
    CATALOGUE_STORES.every((store) => entry.offers[store]?.price_eur > 0),
  ),
  true,
);
check(
  "every offer has a photo",
  CATALOGUE.every((entry) =>
    Object.values(entry.offers).every((offer) => Boolean(offer.image)),
  ),
  true,
);

console.log("\ngrading contract");
const basket = compareBasket([
  item("a", "QA-7F3K2A grading bot test"),
  item("b", "pollo"),
  item("c", "milk"),
]);
check("unknown text is kept in the basket", basket.pricing.length, 3);
check("unknown text carries no price", basket.unpriced.length, 1);
check("the two known items are compared", basket.comparableCount, 2);
check("two shops produce a verdict", basket.cheapestStore !== null, true);
check(
  "an empty basket has no verdict",
  compareBasket([]).cheapestStore,
  null,
);

console.log(
  failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
