/**
 * Folds the reference list and the collected shop data into lib/catalogue-data.ts,
 * the one file the app reads prices from.
 *
 *   npm run catalogue
 *
 * Shops do not sell identical packs, so every price is converted to the term's
 * basis (1 kg, 1 L, a dozen, a loaf) before anything is compared. It fails loudly
 * when a chosen reference product cannot be found, or cannot be converted, so a
 * renamed product shows up here and not as a silently wrong total.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REFERENCE_TERMS } from "../lib/reference-products.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function load(file) {
  return JSON.parse(await readFile(resolve(ROOT, file), "utf8"));
}

const mercadona = await load("data/mercadona.json");
const dia = await load("data/dia.json");
// What each shop's own product label says, per 100 g or 100 ml. Optional per term.
const labels = {
  Mercadona: (await load("data/nutrition-mercadona.json")).products,
  Dia: (await load("data/nutrition-dia.json")).products,
};

/** Mercadona's own per-unit price labels, as a count of the unit they quote. */
const MERCADONA_UNIT = { kg: 1000, L: 1000, dc: 12, ud: 1 };

const SHOPS = {
  Mercadona: {
    products: new Map(mercadona.products.map((p) => [p.name, p])),
    collected_on: mercadona.collected_on,
    // Mercadona publishes the per-kg, per-L, per-dozen price itself: use it.
    unitPrice(product, basis) {
      const per = MERCADONA_UNIT[product.reference_format];
      const quoted = Number(product.reference_price);
      if (per && Number.isFinite(quoted)) return (quoted / per) * basis.amount;
      return null;
    },
  },
  Dia: {
    products: new Map(dia.products.map((p) => [p.name, p])),
    collected_on: dia.collected_on,
    // Dia's listings give a pack price and a pack size; the rest is arithmetic.
    unitPrice(product, basis) {
      if (!product.size || product.size <= 0) return null;
      return (product.price_eur / product.size) * basis.amount;
    },
  },
};

let problems = 0;
const entries = REFERENCE_TERMS.map((reference) => {
  const offers = {};

  for (const [store, productName] of Object.entries(reference.stores)) {
    const shop = SHOPS[store];
    const product = shop?.products.get(productName);
    if (!product) {
      console.error(`  ✗ ${reference.term} @ ${store}: "${productName}" not found`);
      problems += 1;
      continue;
    }

    const unitPrice = shop.unitPrice(product, reference.basis);
    if (unitPrice === null || !Number.isFinite(unitPrice)) {
      console.error(`  ✗ ${reference.term} @ ${store}: cannot convert to ${reference.basis.label}`);
      problems += 1;
      continue;
    }

    const label = labels[store]?.[reference.term];
    offers[store] = {
      name: product.name,
      price_eur: product.price_eur,
      unit_price: Math.round(unitPrice * 1000) / 1000,
      image: product.image ?? null,
      url: product.url ?? null,
      checked_on: shop.collected_on,
      ...(label
        ? {
            nutrition: {
              kcal: label.kcal,
              protein: label.protein,
              fat: label.fat,
              carbs: label.carbs,
              sugar: label.sugar,
              salt: label.salt,
            },
          }
        : {}),
    };
  }

  return {
    term: reference.term,
    label: reference.label,
    basis: reference.basis,
    serving: reference.serving,
    aliases: reference.aliases,
    offers,
  };
});

// Branded products: one Soy Super page gives the same product's price in every shop.
const soysuper = await load("data/soysuper.json");
for (const product of soysuper.products) {
  const offers = {};
  for (const [store, [price, unit]] of Object.entries(product.offers)) {
    offers[store] = {
      name: product.name,
      price_eur: price,
      unit_price: unit,
      image: null,
      url: `https://soysuper.com/p/${product.slug}`,
      checked_on: soysuper.collected_on,
    };
  }
  if (Object.keys(offers).length < 2) {
    console.error(`  ✗ ${product.term}: fewer than two shops`);
    problems += 1;
    continue;
  }
  entries.push({
    term: product.term,
    label: product.label,
    basis: product.basis,
    serving: product.serving,
    aliases: product.aliases,
    food: product.food,
    offers,
  });
}

// Findit: more everyday terms, each shop's own product with its photo and label,
// plus labels and photos for terms the sources above left bare.
const findit = await load("data/findit.json");
const SHOP_NAME = { mercadona: "Mercadona", dia: "Dia", carrefour: "Carrefour", alcampo: "Alcampo" };
const SHOP_KEYS = ["Alcampo", "Carrefour", "Dia", "Mercadona"];
for (const [term, byShop] of Object.entries(findit.fill ?? {})) {
  const entry = entries.find((e) => e.term === term);
  if (!entry) {
    console.error(`  ✗ findit fill: no term "${term}"`);
    problems += 1;
    continue;
  }
  for (const [store, nutrition] of Object.entries(byShop)) {
    if (entry.offers[store] && !entry.offers[store].nutrition) entry.offers[store].nutrition = nutrition;
  }
}
for (const [term, image] of Object.entries(findit.photos ?? {})) {
  const entry = entries.find((e) => e.term === term);
  if (!entry) {
    console.error(`  ✗ findit photo: no term "${term}"`);
    problems += 1;
    continue;
  }
  for (const offer of Object.values(entry.offers)) offer.image ??= image;
}
for (const term of findit.terms) {
  const offers = {};
  for (const [key, o] of Object.entries(term.offers)) {
    offers[SHOP_NAME[key]] = {
      name: o.name,
      price_eur: o.price,
      unit_price: o.unit,
      image: o.image,
      url: `https://finditapp.es/product/${o.id}`,
      checked_on: findit.collected_on,
      ...(o.nutrition ? { nutrition: o.nutrition } : {}),
    };
  }
  if (Object.keys(offers).length < 2) {
    console.error(`  ✗ ${term.term}: fewer than two shops`);
    problems += 1;
    continue;
  }
  entries.push({
    term: term.term,
    label: term.label,
    basis: term.basis,
    serving: term.serving,
    aliases: term.aliases,
    ...(term.food ? { food: term.food } : {}),
    offers,
  });
}

// Carrefour and Alcampo (and any shop still missing) from Soy Super's per-shop
// search: the own-brand product that matches each term. Findit's offer wins where
// there is one, since it carries a photo and sometimes a label.
const shops4 = await load("data/shops4.json");
for (const [term, byShop] of Object.entries(shops4.picks)) {
  const entry = entries.find((e) => e.term === term);
  if (!entry) {
    console.error(`  ✗ shops4: no term "${term}"`);
    problems += 1;
    continue;
  }
  for (const [store, [name, price, unit, slug]] of Object.entries(byShop)) {
    if (entry.offers[store]) continue;
    entry.offers[store] = {
      name,
      price_eur: price,
      unit_price: unit,
      image: null,
      url: slug.startsWith("findit:")
        ? `https://finditapp.es/product/${slug.slice(7)}`
        : `https://soysuper.com/p/${slug}`,
      checked_on: shops4.collected_on,
    };
  }
}

// Many more everyday products from Findit, each matched in all four shops by its
// words and its nutrition label (scripts/fetch-findit-more.mjs). A term the sources
// above left short of a shop is replaced as a whole, so its four products were
// matched against each other; a complete one is kept unless the new rule is stricter.
const more = await load("data/findit-more.json");
const brandOf = (o) =>
  o.brand && !/^(sin marca|unknown)$/i.test(o.brand) && !o.name.toLowerCase().includes(o.brand.toLowerCase())
    ? `${o.name} ${o.brand}`
    : o.name;
let added = 0;
let refilled = 0;
for (const term of more.terms) {
  const offers = {};
  for (const [key, o] of Object.entries(term.offers)) {
    offers[SHOP_NAME[key]] = {
      name: brandOf(o),
      price_eur: o.price,
      unit_price: o.unit,
      image: o.image ?? null,
      url: o.url ?? (o.soysuper ? `https://soysuper.com/p/${o.soysuper}` : `https://finditapp.es/product/${o.id}`),
      checked_on: more.collected_on,
      ...(o.nutrition ? { nutrition: o.nutrition } : {}),
    };
  }
  const existing = entries.find((e) => e.term === term.term);
  if (existing) {
    const complete = SHOP_KEYS.every((store) => existing.offers[store]);
    if (complete && !term.replace) continue;
    existing.offers = offers;
    existing.basis = term.basis;
    existing.serving = term.serving;
    existing.label = term.label;
    existing.aliases = [...new Set([...existing.aliases, ...term.aliases])];
    refilled += 1;
    continue;
  }
  entries.push({
    term: term.term,
    label: term.label,
    basis: term.basis,
    serving: term.serving,
    aliases: term.aliases,
    offers,
  });
  added += 1;
}
console.log(`Findit, more products: ${added} new terms, ${refilled} re-matched.`);

// Every product must be priced at all four supermarkets, so any basket can be
// compared across them. A term that is not is held back, and listed here.
const held = [];
for (let i = entries.length - 1; i >= 0; i -= 1) {
  const missing = SHOP_KEYS.filter((store) => !entries[i].offers[store]);
  if (missing.length > 0) {
    held.push(`${entries[i].term} (no ${missing.join(", ")})`);
    entries.splice(i, 1);
  }
}
if (held.length > 0) console.log(`Held back, not at all four shops: ${held.reverse().join("; ")}\n`);

if (problems > 0) {
  console.error(`\n${problems} problem(s) — catalogue not written.`);
  process.exit(1);
}

await writeFile(
  resolve(ROOT, "lib/catalogue-data.ts"),
  `// Generated by scripts/build-catalogue.mjs — run \`npm run catalogue\`.\n` +
    `// Mercadona: its own public store API, Madrid warehouse (scripts/scrape-mercadona.mjs).\n` +
    `// Dia: collected by hand in a browser (data/dia.json).\n` +
    `// Nutrition labels: data/nutrition-mercadona.json (Open Food Facts) and data/nutrition-dia.json (dia.es).\n` +
    `// Branded products in several shops: data/soysuper.json (Soy Super product pages).\n` +
    `// More terms, photos and labels: data/findit.json (Findit product pages).\n` +
    `// Carrefour and Alcampo products: data/shops4.json (Soy Super per-shop search).\n` +
    `// Many more products, matched by name and label in all four shops: data/findit-more.json.\n\n` +
    `import type { CatalogueEntry } from "./catalogue.ts";\n\n` +
    `export const CATALOGUE_DATA: CatalogueEntry[] = ${JSON.stringify(entries, null, 2)};\n`,
  "utf8",
);

console.log(`${entries.length} terms × 4 shops -> lib/catalogue-data.ts\n`);
console.log("term".padEnd(14) + "basis".padEnd(9) + "Mercadona".padStart(10) + "Dia".padStart(9) + "   (EUR per basis)");
for (const e of entries) {
  const m = e.offers.Mercadona?.unit_price;
  const d = e.offers.Dia?.unit_price;
  console.log(
    e.term.padEnd(14) +
      `/${e.basis.label}`.padEnd(9) +
      (m?.toFixed(2) ?? "-").padStart(10) +
      (d?.toFixed(2) ?? "-").padStart(9),
  );
}
