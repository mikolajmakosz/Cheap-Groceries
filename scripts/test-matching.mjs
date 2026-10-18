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

import { termFor, entryFor, suggest, compareBasket, shopsFor, formatQuantity, portionCost } from "../lib/pricing.ts";
import { CATALOGUE, CATALOGUE_STORES } from "../lib/catalogue.ts";
import { analyseTradeOff, bestStorePerChain } from "../lib/tradeoff.ts";
import { STORES, CAMPUS, walkingMinutes } from "../lib/geo.ts";
import { nutritionOf, eatenAmount, typicalFor } from "../lib/nutrition.ts";
import { REFERENCE_TERMS } from "../lib/reference-products.ts";
import { estimateShopMinutes } from "../lib/shoptime.ts";
import { planBasket, MONTH_DAYS } from "../lib/plan.ts";
import { monthFor, periodFor, detourMinutes, formatDuration } from "../lib/monthly.ts";
import { allMenuTerms } from "../lib/categories.ts";

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
  ["queso", "queso fresco"],
  ["queso fresco", "queso fresco"],
  ["butter", null],
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
check("Mercadona, Dia, Alcampo and Carrefour are covered", CATALOGUE_STORES.join(","), "Alcampo,Carrefour,Dia,Mercadona");
check(
  "every product is priced at all four supermarkets",
  CATALOGUE.every((entry) => CATALOGUE_STORES.every((store) => entry.offers[store]?.price_eur > 0)),
  true,
);
check("there are at least 30 products", CATALOGUE.length >= 30, true);
check(
  "every curated term that is kept has its Mercadona and Dia product",
  REFERENCE_TERMS.every((reference) => {
    const entry = CATALOGUE.find((e) => e.term === reference.term);
    return !entry || (entry.offers.Mercadona?.price_eur > 0 && entry.offers.Dia?.price_eur > 0);
  }),
  true,
);
check(
  "every shop's link opens a page",
  CATALOGUE.every((entry) => Object.values(entry.offers).every((offer) => /^https:\/\//.test(offer.url ?? ""))),
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
check("one serving of cheese reads in grams", formatQuantity(1, cheese), "250 g");
check("five servings of cheese read in kilos", formatQuantity(5, cheese), "1.25 kg");
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
  CATALOGUE.every((entry) => typicalFor(entry) !== null),
  true,
);
// Energy must agree with the macros it is made of (4 per g of protein and
// carbohydrate, 9 per g of fat). A typo in the table shows up here as a gap.
// Drinks with alcohol or acid, and coffee, carry energy the macros do not show.
const EXEMPT = new Set(["cerveza", "vinagre", "cafe molido"]);
const offBy = CATALOGUE.filter((entry) => !EXEMPT.has(entry.food ?? entry.term)).flatMap((entry) =>
  [typicalFor(entry), ...Object.values(entry.offers).map((offer) => offer.nutrition)]
    .filter(Boolean)
    .map((n) => {
      const fromMacros = 4 * n.protein + 9 * n.fat + 4 * n.carbs;
      return n.kcal < 30 ? 0 : Math.abs(n.kcal - fromMacros) / n.kcal;
    }),
);
check("calories agree with macros within 20%", Math.max(...offBy) <= 0.2, true);
check(
  "sugar never exceeds carbohydrate",
  CATALOGUE.every((entry) =>
    [typicalFor(entry), ...Object.values(entry.offers).map((offer) => offer.nutrition)]
      .filter(Boolean)
      .every((n) => n.sugar <= n.carbs + 0.5),
  ),
  true,
);
const oil = entryFor("olive oil");
check("a litre of olive oil is about 8,200 kcal", Math.round(nutritionOf(oil, 1).kcal / 100) * 100, 8200);
check("olive oil is all fat", nutritionOf(oil, 1).carbs, 0);
const banana = entryFor("banana");
check("the peel is not eaten", eatenAmount(banana, 1) < banana.serving, true);
const eggs = entryFor("eggs");
check("a dozen eggs is counted in pieces", Math.round(eatenAmount(eggs, 1)), 636);

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
check("nothing is estimated: no line outlasts the plan unasked", week.lines.every((line) => !line.outlastsPlan && line.lastsDays === null), true);
check("every line is eaten over the plan", week.lines.every((line) => line.consumptionDays === 7), true);
const said = planBasket([item("o", "olive oil"), item("c", "chicken")], 7, { o: 60 });
const oilLine = said.lines.find((line) => line.row.entry.term === "aceite");
check("a duration the person typed is used", oilLine.lastsDays, 60);
check("...a litre that lasts 60 days outlasts the week", oilLine.outlastsPlan, true);
check("...so only a slice of it counts towards the week", Math.abs(oilLine.shareInPlan - 7 / 60) < 1e-9, true);
check(
  "oil is charged by the day it lasts, not the day it was bought",
  said.totals[0].perDay < week.totals[0].perDay,
  true,
);
const oilOnly = planBasket([item("o", "olive oil")], 7, { o: 60 });
check(
  "a week's share of the oil is a fraction of its calories",
  oilOnly.nutrition.kcal < nutritionOf(oil, 1).kcal / 3,
  true,
);
check("per day times days is the whole", Math.round(oilOnly.nutritionPerDay.kcal * 7), Math.round(oilOnly.nutrition.kcal));
check("a duration shorter than the plan changes nothing", planBasket([item("o", "olive oil")], 7, { o: 3 }).lines[0].consumptionDays, 7);

console.log("\nper-shop nutrition and the month");
const shopsPlan = planBasket([item("s1", "queso rallado", 2), item("s2", "yogur griego", 2), item("s3", "mermelada")], 7);
const [first] = shopsPlan.stores;
const byName = Object.fromEntries(shopsPlan.stores.map((row) => [row.store, row]));
check("four shops are compared", shopsPlan.stores.length, 4);
check("shops with different labels have different nutrition", byName.Dia.nutrition.kcal !== byName.Mercadona.nutrition.kcal, true);
check("a shop's ratio is its price over its energy", Math.abs(first.per100kcal - (first.total / first.nutrition.kcal) * 100) < 1e-9, true);
check("protein costs something per gram", first.perGramProtein > 0, true);
check("a labelled product uses its own label", nutritionOf(entryFor("yogur"), 1, entryFor("yogur").offers.Dia).kcal !== nutritionOf(entryFor("yogur"), 1, entryFor("yogur").offers.Mercadona).kcal, true);
check("without a label the typical values are used", nutritionOf(entryFor("espaguetis"), 1, entryFor("espaguetis").offers.Dia).kcal, nutritionOf(entryFor("espaguetis"), 1).kcal);

const someShop = STORES.find((store) => store.chain === "Dia");
const weekMonth = monthFor(someShop, 2, 7, 10, null);
check("a week-long basket is bought about four times a month", Math.round(weekMonth.trips * 10) / 10, Math.round((MONTH_DAYS / 7) * 10) / 10);
check("a month costs thirty days of the per-day price", weekMonth.euros, 60);
check("each trip is the walk plus the time inside", weekMonth.minutesPerTrip, weekMonth.walkMinutes + 10);
const farHome = { lat: 40.4, lon: -3.7 };
check("with a home only the detour counts", detourMinutes(someShop, farHome) <= detourMinutes(someShop, null) + walkingMinutes(someShop, farHome), true);
check("a shop on the way home adds no detour", detourMinutes({ lat: 40.4388, lon: -3.6941 }, farHome, CAMPUS) < walkingMinutes(CAMPUS, { lat: 40.4388, lon: -3.6941 }) + walkingMinutes({ lat: 40.4388, lon: -3.6941 }, farHome), true);
check("a detour is never negative", detourMinutes(someShop, farHome) >= 0, true);
const fortnight = periodFor(someShop, 2, 7, 10, null, 14);
check("a fortnight is two weeks of money", fortnight.euros, 28);
check("a day-long period is a fraction of a trip", Math.abs(periodFor(someShop, 2, 7, 10, null, 1).trips - 1 / 7) < 1e-9, true);
check("a duration reads as hours and minutes", formatDuration(200), "3 h 20 min");

console.log("\ncategories");
const everyTerm = allMenuTerms();
check("every category term is in the catalogue", everyTerm.every((term) => CATALOGUE.some((entry) => entry.term === term)), true);
check("every catalogue term is in exactly one category", CATALOGUE.every((entry) => everyTerm.filter((term) => term === entry.term).length === 1), true);

console.log("\ncomparing only what every compared shop prices");
// A small catalogue of its own: Mercadona sells the own-brand product only, the
// other three shops sell the branded one, and Dia sells both.
const offer = (unit_price) => ({ name: "x", price_eur: unit_price, unit_price, image: null, url: "https://example.com", checked_on: "2026-10-18" });
const fake = (term, offers) => ({ term, label: term, serving: 1000, basis: { amount: 1000, unit: "ml", label: "L" }, aliases: [term], offers });
const mixed = [
  fake("leche", { Mercadona: offer(1), Dia: offer(1.2) }),
  fake("cola", { Dia: offer(2), Carrefour: offer(1.8), Alcampo: offer(1.9) }),
  fake("yogur", { Dia: offer(3), Carrefour: offer(2.5), Alcampo: offer(2.7) }),
];
check("milk alone compares the two shops that sell it", shopsFor([mixed[0]], mixed).join(), "Dia,Mercadona");
check("brands compare the three shops that sell them", shopsFor([mixed[1], mixed[2]], mixed).join(), "Alcampo,Carrefour,Dia");
const brands = compareBasket([item("a", "cola"), item("b", "yogur")], mixed);
check("both brands are priced in all three shops", brands.comparableCount, 2);
check("Mercadona is left out and said so", brands.excludedStores.join(), "Mercadona");
check("the cheapest of the three wins", brands.cheapestStore, "Carrefour");
const together = compareBasket([item("a", "leche"), item("b", "cola"), item("c", "yogur")], mixed);
check("a tie between groups goes to the larger group", together.stores.length, 3);
check("a product a compared shop lacks is unpriced, not free", together.unpriced.map((row) => row.item.name).join(), "leche");
check("totals add only comparable products", Math.round(together.totals.find((t) => t.store === "Dia").total * 100), 500);
const chosen2 = compareBasket([item("a", "cola"), item("b", "yogur")], mixed, ["Carrefour", "Dia"]);
check("a chosen pair is compared as asked", chosen2.stores.join(), "Carrefour,Dia");
check("an empty basket compares every shop", compareBasket([], mixed).stores.length, 4);
check("the real catalogue still compares Dia and Mercadona", compareBasket([item("a", "pollo"), item("b", "leche")]).stores.includes("Mercadona"), true);

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
