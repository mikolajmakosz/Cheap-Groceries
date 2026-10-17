/**
 * Collects real Mercadona prices for the Madrid warehouse and writes
 * data/mercadona.json (every product, with its photo).
 *
 * Then run `npm run catalogue` to fold the reference products into the app.
 *
 *   node scripts/scrape-mercadona.mjs
 *
 * Run it by hand when prices need refreshing, never from the app at request
 * time: the deployed app has to keep working untouched for weeks, and a shop's
 * website changing shape must not take it down.
 *
 * It reads Mercadona's own public store API, one request per category with a
 * pause between them. Only the categories a student actually buys from.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WAREHOUSE = "mad1"; // Madrid
const PAUSE_MS = 400;

/** Subcategory id -> the everyday word a student would type. */
const CATEGORIES = [
  [112, "aceite"],
  [118, "arroz"],
  [121, "legumbres"],
  [120, "pasta"],
  [78, "cereales"],
  [38, "pollo"],
  [37, "cerdo"],
  [44, "carne picada"],
  [48, "jamon cocido"],
  [56, "queso"],
  [53, "queso fresco"],
  [122, "atun"],
  [126, "tomate frito"],
  [27, "fruta"],
  [29, "verdura"],
  [28, "ensalada"],
  [77, "huevos"],
  [72, "leche"],
  [75, "mantequilla"],
  [59, "pan"],
  [60, "pan de molde"],
  [104, "yogur"],
  [31, "pescado"],
  [156, "agua"],
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function fetchCategory(id) {
  const url = `https://tienda.mercadona.es/api/categories/${id}/?lang=es&wh=${WAREHOUSE}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Language": "es-ES,es;q=0.9" },
  });
  if (!response.ok) throw new Error(`category ${id}: HTTP ${response.status}`);
  return response.json();
}

/** Grams for solids, millilitres for liquids — whichever the pack is sold in. */
function packSize(price) {
  const size = Number(price.unit_size);
  if (!Number.isFinite(size) || size <= 0) return null;
  switch (price.size_format) {
    case "kg":
    case "l":
    case "L":
      return Math.round(size * 1000);
    case "g":
    case "ml":
      return Math.round(size);
    default:
      return null;
  }
}

function brandOf(name) {
  for (const brand of ["Hacendado", "Bosque Verde", "Deliplus", "Compy"]) {
    if (name.includes(brand)) return brand;
  }
  return null;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const products = [];
  const seen = new Set();

  for (const [id, term] of CATEGORIES) {
    let payload;
    try {
      payload = await fetchCategory(id);
    } catch (error) {
      console.warn(`  ! ${term} (${id}) skipped: ${error.message}`);
      continue;
    }

    let added = 0;
    for (const sub of payload.categories ?? []) {
      for (const product of sub.products ?? []) {
        const price = product.price_instructions ?? {};
        const eur = Number(price.unit_price);
        const name = product.display_name;
        if (!name || !Number.isFinite(eur) || eur <= 0) continue;
        if (seen.has(name)) continue;
        seen.add(name);

        products.push({
          name,
          brand: brandOf(name),
          store: "Mercadona",
          price_eur: Number(eur.toFixed(2)),
          size_g: packSize(price),
          term,
          image: product.thumbnail ?? null,
          url: product.share_url ?? null,
          reference_price: price.reference_price ?? null,
          reference_format: price.reference_format ?? null,
          price_checked_on: today,
        });
        added += 1;
      }
    }
    console.log(`  ${String(added).padStart(3)} × ${term}`);
    await sleep(PAUSE_MS);
  }

  products.sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Mark the one product per term a student actually means. Without this,
  // "pollo" resolves to the cheapest row in the poultry aisle, which is a
  // carcass, and "leche" to an oat drink.
  const { REFERENCE_TERMS } = await import("../lib/reference-products.ts");
  const byName = new Map(products.map((p) => [p.name, p]));
  let marked = 0;
  for (const entry of REFERENCE_TERMS) {
    const wanted = entry.stores.Mercadona;
    if (!wanted) continue;
    const product = byName.get(wanted);
    if (!product) {
      console.warn(`  ! reference missing for "${entry.term}": ${wanted}`);
      continue;
    }
    product.term = entry.term;
    product.is_reference = true;
    marked += 1;
  }
  console.log(`\n${marked}/${REFERENCE_TERMS.length} reference products matched`);

  await mkdir(resolve(ROOT, "data"), { recursive: true });
  await writeFile(
    resolve(ROOT, "data/mercadona.json"),
    JSON.stringify({ warehouse: WAREHOUSE, collected_on: today, products }, null, 2),
    "utf8",
  );

  console.log(`\n${products.length} products -> data/mercadona.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
