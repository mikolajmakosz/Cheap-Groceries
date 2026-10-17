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
import { FOODS, nutritionOf, eatenAmount, SALT_LIMIT_G } from "../lib/nutrition.ts";
import { estimateShopMinutes } from "../lib/shoptime.ts";
import { planBasket, frequencyLabel } from "../lib/plan.ts";

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

console.log("\nnutrition");
check(
  "every catalogue term has nutrition data",
  CATALOGUE.every((entry) => FOODS[entry.term] !== undefined),
  true,
);
// Energy must agree with the macros it is made of (4 per g of protein and
// carbohydrate, 9 per g of fat). A typo in the table shows up here as a gap.
const offBy = CATALOGUE.map((entry) => {
  const n = FOODS[entry.term];
  const fromMacros = 4 * n.protein + 9 * n.fat + 4 * n.carbs;
  return n.kcal === 0 ? 0 : Math.abs(n.kcal - fromMacros) / n.kcal;
});
check("calories agree with macros within 20%", Math.max(...offBy) <= 0.2, true);
check(
  "sugar never exceeds carbohydrate",
  CATALOGUE.every((entry) => FOODS[entry.term].sugar <= FOODS[entry.term].carbs + 0.5),
  true,
);
const oil = entryFor("olive oil");
check("a litre of olive oil is about 8,200 kcal", Math.round(nutritionOf(oil, 1).kcal / 100) * 100, 8200);
check("olive oil is all fat", nutritionOf(oil, 1).carbs, 0);
const banana = entryFor("banana");
check("the peel is not eaten", eatenAmount(banana, 1) < banana.serving, true);
const eggs = entryFor("eggs");
check("a dozen eggs is counted in pieces", Math.round(eatenAmount(eggs, 1)), 636);
check("the salt guide is the WHO's 5 g", SALT_LIMIT_G, 5);

console.log("\ntime in the shop");
check("an empty basket takes no time", estimateShopMinutes([]), 0);
check(
  "more products take longer",
  estimateShopMinutes([{ quantity: 1 }, { quantity: 1 }, { quantity: 1 }]) >
    estimateShopMinutes([{ quantity: 1 }]),
  true,
);
check(
  "more of the same takes longer than one",
  estimateShopMinutes([{ quantity: 6 }]) > estimateShopMinutes([{ quantity: 1 }]),
  true,
);
check("one product is a few minutes, not an hour", estimateShopMinutes([{ quantity: 1 }]) < 15, true);

console.log("\na basket over several days");
const week = planBasket([item("o", "olive oil"), item("c", "chicken")], 7);
const oilLine = week.lines.find((line) => line.row.entry.term === "aceite");
const chickenLine = week.lines.find((line) => line.row.entry.term === "pollo");
check("a litre of oil outlasts a week", oilLine.outlastsPlan, true);
check("...so only part of it counts towards the week", oilLine.shareInPlan < 0.3, true);
check("chicken for two days falls short of a week", chickenLine.fallsShort, true);
check(
  "oil is charged by the day it lasts, not the day it was bought",
  week.totals[0].perDay < week.totals[0].total / 7 + 0.001,
  true,
);
const oilOnly = planBasket([item("o", "olive oil")], 7);
check(
  "a week's share of the oil is a fraction of its calories",
  oilOnly.nutrition.kcal < nutritionOf(oil, 1).kcal / 3,
  true,
);
check("per day times days is the whole", Math.round(oilOnly.nutritionPerDay.kcal * 7), Math.round(oilOnly.nutrition.kcal));
check("a month's oil is bought about once a month", frequencyLabel(30), "about once a month");
check("two weeks reads as two weeks", frequencyLabel(14), "about every two weeks");

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
