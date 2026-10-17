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

import { termFor, entryFor, suggest, compareBasket, formatQuantity, portionCost } from "../lib/pricing.ts";
import { CATALOGUE, CATALOGUE_STORES } from "../lib/catalogue.ts";
import { analyseTradeOff, bestStorePerChain } from "../lib/tradeoff.ts";
import { STORES } from "../lib/geo.ts";

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

check(
  "every offer has a unit price",
  CATALOGUE.every((entry) =>
    Object.values(entry.offers).every((offer) => offer.unit_price > 0),
  ),
  true,
);
// Two shops pricing the same thing should land in the same ballpark. A big gap
// almost always means two different products were paired, not that one shop is
// three times dearer, and the app would then announce a false winner.
const widest = Math.max(
  ...CATALOGUE.map((entry) => {
    const prices = Object.values(entry.offers).map((offer) => offer.unit_price);
    return Math.max(...prices) / Math.min(...prices);
  }),
);
check("no pair differs by more than 2x", widest <= 2, true);
check(
  "every offer links to the shop's own page",
  CATALOGUE.every((entry) =>
    Object.values(entry.offers).every((offer) => /^https:\/\//.test(offer.url ?? "")),
  ),
  true,
);

console.log("\nunit prices, not pack prices");
const cheese = entryFor("queso");
const twoServings = compareBasket([item("p", "queso", 2)]);
const dia = cheese.offers.Dia;
check(
  "a basket line costs its unit price times its amount",
  Math.round(twoServings.totals.find((row) => row.store === "Dia").total * 1000),
  Math.round(((dia.unit_price * cheese.serving * 2) / cheese.basis.amount) * 1000),
);
check("a serving of cheese is not a kilo", cheese.serving < 1000, true);
check("one serving of cheese reads in grams", formatQuantity(1, cheese), "200 g");
check("five servings of cheese read in kilos", formatQuantity(5, cheese), "1 kg");
check("a dozen eggs reads as a dozen", formatQuantity(1, entryFor("huevos")), "1 dozen");
check("two loaves are loaves", formatQuantity(2, entryFor("pan")), "2 loaves");
check("milk reads in litres", formatQuantity(2, entryFor("leche")), "2 L");
check(
  "a portion costs less than a kilo of the same",
  portionCost(dia, cheese, 1) < dia.unit_price,
  true,
);

console.log("\ncost against time");
const A = { chain: "A", store: STORES[0], cost: 10, minutes: 20 };
const B = { chain: "B", store: STORES[0], cost: 12, minutes: 12 };
const C = { chain: "C", store: STORES[0], cost: 13, minutes: 15 }; // dearer AND slower than B
const t = analyseTradeOff([A, B, C]);
check("cheapest is the cheapest", t.cheapest.chain, "A");
check("fastest is the fastest", t.fastest.chain, "B");
check("a dearer and slower option is dropped", t.frontier.length, 2);
check("the step says what the extra money buys", t.steps[0].extraCost, 2);
check("...and how many minutes it saves", t.steps[0].savedMinutes, 8);
check("...so €0.25 per minute", t.steps[0].perMinute, 0.25);
check(
  "no trade-off when one is both cheaper and faster",
  analyseTradeOff([A, { ...B, cost: 9 }]).steps.length,
  0,
);
check("nothing to weigh with no options", analyseTradeOff([]), null);
const chosen = bestStorePerChain({ Dia: 5, Mercadona: 6 });
check("one best shop per chain", chosen.length, 2);
check(
  "an address changes which shop is quickest",
  bestStorePerChain({ Dia: 5 }, { lat: 40.4, lon: -3.7 })[0].minutes >
    bestStorePerChain({ Dia: 5 })[0].minutes,
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
