/**
 * Every product in Mercadona's online shop (Madrid warehouse), from its own public
 * store API, one request per aisle a second apart, written to .cache/mercadona-all.json.
 * scripts/fetch-findit-more.mjs uses it where Findit does not list a Mercadona product.
 *
 *   node scripts/fetch-mercadona-all.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://tienda.mercadona.es/api/categories";
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const get = async (url) => {
  const res = await fetch(url, { headers: { Accept: "application/json", "Accept-Language": "es-ES,es;q=0.9" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

/** Findit's measures: kg, l or ud, so the two sources line up. */
const MEASURE = { kg: "kg", L: "l", l: "l", ud: "ud", dc: "ud" };

const top = await get(`${API}/?lang=es&wh=mad1`);
const aisles = top.results.flatMap((c) => c.categories.map((s) => s.id));
const products = [];
for (const id of aisles) {
  const aisle = await get(`${API}/${id}/?lang=es&wh=mad1`);
  for (const sub of aisle.categories ?? []) {
    for (const p of sub.products ?? []) {
      const price = p.price_instructions ?? {};
      const measure = MEASURE[price.reference_format];
      const unit = Number(price.reference_price) / (price.reference_format === "dc" ? 12 : 1);
      const pack = Number(price.unit_price);
      if (!measure || !(unit > 0) || !(pack > 0)) continue;
      products.push({
        id: p.id,
        name: p.display_name,
        price: pack,
        unitPrice: unit,
        measure,
        quantity: Math.round((pack / unit) * 1000) / 1000,
        image: p.thumbnail ?? null,
        url: p.share_url ?? null,
        aisle: sub.name,
      });
    }
  }
  process.stdout.write(`\r${products.length} products`);
  await sleep(1000);
}
await mkdir(resolve(ROOT, ".cache"), { recursive: true });
await writeFile(resolve(ROOT, ".cache/mercadona-all.json"), JSON.stringify({ collected_on: new Date().toISOString().slice(0, 10), products }));
console.log(`\n${products.length} Mercadona products -> .cache/mercadona-all.json`);
