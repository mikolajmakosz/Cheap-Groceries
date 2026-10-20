/**
 * Finds each product of scripts/more-terms.mjs in all four supermarkets on
 * Findit (finditapp.es) and writes data/findit-more.json.
 *
 *   npm run more            (about an hour the first time; answers are cached in .cache/)
 *
 * For every term:
 *   1. search Findit in each shop and keep the products whose name has the term's
 *      words and none of its excluded words;
 *   2. take Mercadona's most relevant labelled match as the reference;
 *   3. in every shop, from the cheapest per kg or litre up, open products until one
 *      has the same label as the reference (energy, protein, fat, carbohydrate and
 *      sugar within a small margin): differently named products with the same
 *      macros are the same kind of product;
 *   4. keep the term only when all four shops have such a product.
 * Fruit and veg labels are often missing, so for them the name and the price decide.
 *
 * Requests go one at a time, a couple of seconds apart, and it stops at the first
 * answer that is not plain JSON (a block or a challenge) instead of retrying.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MORE_TERMS } from "./more-terms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = resolve(ROOT, ".cache/findit");
const SHOPS = ["mercadona", "dia", "carrefour", "alcampo"];
const PAUSE_MS = 1200;
const MAX_OPENED = 5;
const AGENT = "Mozilla/5.0 (compatible; Claude-User; Cheap Groceries student project)";

const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

let last = 0;
let requests = 0;
async function get(path) {
  const url = path.startsWith("http") ? path : `https://finditapp.es${path}`;
  const file = resolve(CACHE, path.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 180) + ".json");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {}
  const wait = last + PAUSE_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  requests += 1;
  const res = await fetch(url, { headers: { "User-Agent": AGENT, Accept: "application/json" } });
  const text = await res.text();
  if (res.status === 404) {
    await writeFile(file, "null");
    return null;
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error(`\nStopped: ${path} answered ${res.status} with something that is not JSON:\n${text.slice(0, 300)}`);
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`\nStopped: ${path} answered ${res.status}`);
    process.exit(2);
  }
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, JSON.stringify(body));
  return body;
}

const search = (shop, q) =>
  get(`/api/findit/products/search?name=${encodeURIComponent(q)}&user-supermarket=${shop}&limit=60`).then((b) => b?.results ?? []);

/**
 * A product's label per 100 g or ml, or null when the main four values are missing.
 * Findit carries it; for a product from Mercadona's own shop it comes from Open Food
 * Facts, looked up by the barcode Mercadona publishes.
 */
async function labelOf(r) {
  let n;
  if (r.source === "mercadona") {
    const product = await get(`https://tienda.mercadona.es/api/products/${r.id}/?lang=es&wh=mad1`);
    if (!product?.ean) return null;
    const off = await get(`https://world.openfoodfacts.org/api/v2/product/${product.ean}.json?fields=nutriments`);
    const m = off?.product?.nutriments;
    n = m && { calories: m["energy-kcal_100g"], protein: m.proteins_100g, fat: m.fat_100g, carbohydrates: m.carbohydrates_100g, sugar: m.sugars_100g ?? null, salt: m.salt_100g ?? null };
  } else {
    n = (await get(`/api/findit/products/${r.id}`))?.nutrition;
  }
  if (!n || [n.calories, n.protein, n.fat, n.carbohydrates].some((v) => v === null || v === undefined)) return null;
  const label = { kcal: n.calories, protein: n.protein, fat: n.fat, carbs: n.carbohydrates, sugar: n.sugar ?? null, salt: n.salt ?? null };
  // Same checks as the tests: energy agrees with the macros, sugar fits in the carbohydrate.
  const fromMacros = 4 * label.protein + 9 * label.fat + 4 * label.carbs;
  if (label.kcal >= 30 && Math.abs(label.kcal - fromMacros) / label.kcal > 0.2) return null;
  if (label.sugar !== null && label.sugar > label.carbs + 0.5) return null;
  return label;
}

const within = (a, b, abs, rel) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));
function sameLabel(a, ref) {
  return (
    within(a.kcal, ref.kcal, 15, 0.12) &&
    within(a.protein, ref.protein, 1.2, 0.2) &&
    within(a.fat, ref.fat, 1.2, 0.25) &&
    within(a.carbs, ref.carbs, 2, 0.2) &&
    (a.sugar === null || ref.sugar === null || within(a.sugar, ref.sugar, 2.5, 0.35))
  );
}

const BASIS = {
  kg: { amount: 1000, unit: "g", label: "kg" },
  l: { amount: 1000, unit: "ml", label: "L" },
  ud: { amount: 1, unit: "ud", label: "piece" },
};

/** A typical purchase: the middle pack size of the four picks. */
function servingOf(quantities, basis) {
  const q = quantities.filter((x) => x > 0).sort((a, b) => a - b);
  const mid = q.length ? (q[Math.floor((q.length - 1) / 2)] + q[Math.ceil((q.length - 1) / 2)]) / 2 : 1;
  return basis === "ud" ? Math.max(1, Math.round(mid)) : Math.round(mid * 1000);
}

const BRAND_PREFIX = /^(producto economico alcampo|producto alcampo|alcampo cultivamos lo bueno|alcampo ecologico|auchan) /;

/** Never the product a student means: pet food, baby food, sweets shaped like it, a yogurt that tastes of it. */
const GLOBAL_NOT = ["perro", "gato", "mascota", "deliperro", "miguau", "tarrito", "desde \\d+ meses", "infantil", "para bebe", "bifidus", "petit", "barrita", "smoothie", "figura", "pascua", "gominola", "de goma", "chuche", "panecillo", "pastas de", "sal de ", "salteado", "crocanti", "palitos de", "relleno de", "sabor a ", "papilla", "meses", "sandwich", "bocadillo", "golosina", "\\bbebe\\b", "untable", "helado", "magnum", "empanad", "activia", "confitura", "pouch"];

/** Another chain's own brand in a shop's listing is a mix-up in the source: skip it. */
const OTHER_BRANDS = {
  mercadona: /\bdia\b|carrefour|alcampo|auchan/,
  dia: /hacendado|carrefour|alcampo|auchan/,
  carrefour: /hacendado|\bdia\b|alcampo|auchan/,
  alcampo: /hacendado|\bdia\b|carrefour/,
};

// Products Findit does not list, found with Soy Super's search scoped to that shop
// (data/soysuper-fill.json): used only where Findit has no match, and only when the
// name rules and the price check pass. They carry no label.
let MERCADONA = [];
try {
  MERCADONA = JSON.parse(await readFile(resolve(CACHE, "../mercadona-all.json"), "utf8")).products.map((p) => ({
    ...p,
    source: "mercadona",
    supermarkets: ["mercadona"],
  }));
} catch {}

let FILL = {};
try {
  FILL = JSON.parse(await readFile(resolve(ROOT, "data/soysuper-fill.json"), "utf8")).picks;
} catch {}

const out = [];
const held = [];
const report = [];
for (const [index, [term, label, section, query, must, not, options = {}]] of MORE_TERMS.entries()) {
  const mustRe = must.map((m) => new RegExp(norm(m)));
  const notRe = not ? new RegExp(norm(not)) : null;
  const globalNot = GLOBAL_NOT.filter((word) => !must.some((m) => new RegExp(m).test(word.replace(/\\b/g, ""))));
  const globalRe = new RegExp(globalNot.join("|"));
  // The product word comes near the start (after a shop's own-brand prefix):
  // "Pimientos enteros con ajo" is a jar of peppers, not garlic.
  const headRe = mustRe[0];
  const head = (name) => name.replace(BRAND_PREFIX, "").split(" ").slice(0, 5).join(" ");
  const matches = (r, shop) => {
    const name = norm(r.name);
    return (
      mustRe.every((re) => re.test(name)) &&
      headRe.test(head(name)) &&
      !(notRe && notRe.test(name)) &&
      !globalRe.test(name) &&
      r.price > 0 &&
      r.unitPrice > 0 &&
      (r.supermarkets ?? []).includes(shop) &&
      !OTHER_BRANDS[shop].test(name) &&
      // The listed price per kg or litre must be the pack price over the pack size.
      (!(r.quantity > 0) || Math.abs(r.price / r.quantity - r.unitPrice) <= 0.1 * r.unitPrice)
    );
  };

  // A shop that finds nothing with the full search is asked again with the term alone.
  const simple = must[0].split("|")[0].replace(/[\\^$()?*+.\[\]]|\\b/g, "");
  const found = {};
  for (const shop of SHOPS) {
    found[shop] = (await search(shop, query)).filter((r) => matches(r, shop));
    for (const again of [term, simple]) {
      if (found[shop].length === 0 && norm(again) !== norm(query)) found[shop] = (await search(shop, again)).filter((r) => matches(r, shop));
    }
  }
  // Mercadona's own shop lists what Findit misses; Findit's copy wins when both have it.
  const listed = new Set(found.mercadona.map((r) => norm(r.name)));
  const seenIds = new Set();
  for (const r of MERCADONA) {
    if (seenIds.has(r.id) || listed.has(norm(r.name)) || !matches(r, "mercadona")) continue;
    seenIds.add(r.id);
    found.mercadona.push(r);
  }
  process.stdout.write(`\r${index + 1}/${MORE_TERMS.length} ${term.padEnd(30)} (${requests} requests)`);

  // The reference: Mercadona's plainest match (own brand, shortest name) with a label.
  // (Fruit and veg are not own-brand at Mercadona: there the plainest name wins alone.)
  const ownFirst = (r) => (options.fresh ? 0 : Number(!/hacendado/i.test(r.name)));
  const plain = [...found.mercadona.slice(0, 12)].sort((a, b) => ownFirst(a) - ownFirst(b) || a.name.length - b.name.length);
  let ref = null;
  let refLabel = null;
  for (const r of plain.slice(0, 4)) {
    const l = await labelOf(r);
    if (l) {
      ref = r;
      refLabel = l;
      break;
    }
  }
  if (!ref && plain.length) {
    // No Mercadona label: the plainest labelled match in another shop sets the macros.
    ref = plain[0];
    for (const shop of ["dia", "carrefour", "alcampo"]) {
      for (const r of found[shop].filter((x) => x.measure === ref.measure).slice(0, 3)) {
        refLabel = await labelOf(r);
        if (refLabel) break;
      }
      if (refLabel) break;
    }
  }
  if (!ref) {
    held.push({ term, reason: "not found at Mercadona" });
    continue;
  }

  // In each shop, cheapest first: a product whose label matches the reference wins;
  // one without a label is kept as a fallback (its name already fits); one whose
  // label differs is a different product and is skipped.
  const basis = ref.measure;
  // One shop's product for this term, cheapest first, priced between lo and hi per kg or litre.
  async function pickIn(shop, lo, hi) {
    const pool = found[shop]
      .filter((r) => r.measure === basis)
      .filter((r) => !(r.quantity > 0 && ref.quantity > 0) || (r.quantity >= ref.quantity / 8 && r.quantity <= ref.quantity * 8))
      .filter((r) => r.unitPrice >= lo && r.unitPrice <= hi)
      .sort((a, b) => a.unitPrice - b.unitPrice);
    let fallback = null;
    for (const r of pool.slice(0, MAX_OPENED)) {
      const l = await labelOf(r);
      const pick = { id: r.id, ...(r.source === "mercadona" ? { url: r.url } : {}), name: r.name, brand: r.brand, price: r.price, unit: Math.round(r.unitPrice * 1000) / 1000, quantity: r.quantity, image: r.image, ...(l && l.sugar !== null && l.salt !== null ? { nutrition: l } : {}) };
      if (l && refLabel && sameLabel(l, refLabel)) return { ...pick, matched: "label" };
      if (!fallback && (!l || !refLabel || options.fresh)) fallback = { ...pick, matched: "name" };
    }
    if (fallback) return fallback;
    const candidates = (FILL[shop]?.[term] ?? [])
      .filter(([name]) => mustRe.every((re) => re.test(norm(name))) && headRe.test(head(norm(name))) && !(notRe && notRe.test(norm(name))) && !OTHER_BRANDS[shop].test(norm(name)) && !globalRe.test(norm(name)))
      .filter(([, , unit, measure]) => measure === basis && unit >= lo && unit <= hi)
      // Soy Super sometimes links a listing to another product's page: the link must share the name's words.
      .filter(([name, , , , , slug]) => {
        const words = norm(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 5));
        return words.filter((w) => slug.includes(w)).length >= Math.min(2, words.length);
      })
      .sort((a, b) => a[2] - b[2]);
    if (!candidates.length) return null;
    const [name, price, unit, , quantity, slug, image] = candidates[0];
    return { soysuper: slug, name, price, unit, quantity, image, matched: "name (Soy Super)" };
  }

  // A price per kg far from Mercadona's is another kind of product, or a wrong listing.
  const offers = {};
  for (const shop of SHOPS) {
    const o = await pickIn(shop, ref.unitPrice * 0.55, ref.unitPrice * 1.8);
    if (o) offers[shop] = o;
  }
  // Then the four must sit together: a shop far from the middle price is re-picked
  // close to it, so no two shops differ by more than about double.
  const units = Object.values(offers).map((o) => o.unit).sort((a, b) => a - b);
  if (units.length === SHOPS.length) {
    const mid = (units[1] + units[2]) / 2;
    for (const shop of SHOPS) {
      if (offers[shop].unit < mid / 1.4 || offers[shop].unit > mid * 1.4) {
        const o = await pickIn(shop, mid / 1.4, mid * 1.4);
        if (o) offers[shop] = o;
        else delete offers[shop];
      }
    }
  }
  const missing = SHOPS.filter((s) => !offers[s]);
  report.push(
    `${missing.length ? "✗" : "✓"} ${term} [${basis}] ref: ${ref.name} ${refLabel ? `(${refLabel.kcal} kcal, ${refLabel.protein} P, ${refLabel.fat} F, ${refLabel.carbs} C)` : "(no label)"}\n` +
      SHOPS.map((s) => (offers[s] ? `    ${s}: ${offers[s].name} — ${offers[s].price} € (${offers[s].unit} €/${basis}) [${offers[s].matched}]${offers[s].nutrition ? ` ${offers[s].nutrition.kcal} kcal ${offers[s].nutrition.protein} P` : ""}` : `    ${s}: — (${found[s].length} by name)`)).join("\n"),
  );
  await writeFile(resolve(CACHE, "../more-report.txt"), report.join("\n") + "\n");
  if (missing.length) {
    held.push({ term, reason: `no matching product at ${missing.join(", ")}`, missing, query, must, not, measure: basis, ref_unit: ref.unitPrice });
    continue;
  }
  out.push({
    term,
    label,
    section,
    aliases: [...new Set([norm(term), norm(label), ...(options.aliases ?? []).map(norm)])],
    basis: BASIS[basis],
    serving: servingOf(Object.values(offers).map((o) => o.quantity), basis),
    ...(options.fresh ? { fresh: true } : {}),
    ...(options.fill ? { fill: true } : {}),
    ...(options.replace ? { replace: true } : {}),
    offers,
  });
}

await writeFile(
  resolve(ROOT, "data/findit-more.json"),
  JSON.stringify(
    {
      source: "Findit (finditapp.es) product search and product pages, per shop, read with scripts/fetch-findit-more.mjs.",
      collected_on: new Date().toISOString().slice(0, 10),
      rule: "A term is kept only when all four shops have a product with its words; for packaged food, each shop's pick is its cheapest per kg/L whose label matches Mercadona's reference within kcal ±max(15, 12%), protein ±max(1.2 g, 20%), fat ±max(1.2 g, 25%), carbohydrate ±max(2 g, 20%), sugar ±max(2.5 g, 35%). Fruit and veg: name and price.",
      terms: out,
      held,
    },
    null,
    1,
  ) + "\n",
);
await writeFile(resolve(CACHE, "../more-report.txt"), report.join("\n") + `\n\nHeld back:\n${held.map((h) => `  ${h.term}: ${h.reason}`).join("\n")}\n`);
console.log(`\n\n${out.length} terms at all four shops, ${held.length} held back, ${requests} requests. Report: .cache/more-report.txt`);
