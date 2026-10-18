/**
 * Collects every supermarket of the four priced chains in the city of Madrid
 * (the municipality, not only the streets around IE Tower: students live all
 * over the city) and writes data/stores.json.
 *
 *   npm run stores
 *
 * Run by hand, like the prices. OpenStreetMap's Overpass API is slow and rate
 * limited, so asking it on every page view would let someone else's server
 * decide whether Cheap Groceries is up.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** IE Tower, Paseo de la Castellana 259, Madrid. */
export const CAMPUS = {
  name: "IE Tower",
  address: "Paseo de la Castellana 259, Madrid",
  lat: 40.4777128,
  lon: -3.68944,
};

/** The area searched: Madrid's municipal boundary in OpenStreetMap. */
const AREA = "Madrid (municipality)";

/** The supermarkets the catalogue prices; other chains have no prices to show. */
const CHAINS = ["Mercadona", "Dia", "Carrefour", "Alcampo"];

const QUERY = `[out:json][timeout:120];
area["name"="Madrid"]["boundary"="administrative"]["admin_level"="8"]->.madrid;
(
  node(area.madrid)["shop"~"supermarket|convenience"];
  way(area.madrid)["shop"~"supermarket|convenience"];
);
out center tags;`;


const plain = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Small neighbourhood formats (Carrefour Express and City, Mi Alcampo, Dia & Go) are convenience
 * shops with their own, higher prices, not the supermarkets the catalogue
 * prices, so they are not offered as places to shop.
 */
const SMALL_FORMAT = /express|mi alcampo|alcampo express|simply|supeco|carrefour city|carrefour bio|dia & go|spass/;

/**
 * Which chain a shop belongs to: its `brand` tag when mapped, otherwise its name
 * as a whole word, so a one-off shop whose name merely contains "dia" is not
 * taken for a Dia.
 */
function chainOf(tags) {
  const brand = plain(tags.brand ?? "");
  const name = plain(tags.name ?? "");
  const word = (chain) => new RegExp(`(^|[^a-z])${plain(chain)}([^a-z]|$)`);
  // The name on the door first: some former Dia shops now trade as Alcampo
  // while their brand tag still says Dia.
  for (const chain of CHAINS) if (word(chain).test(name)) return chain;
  for (const chain of CHAINS) if (word(chain).test(brand)) return chain;
  return null;
}

/** Public Overpass instances are frequently overloaded; try them in turn. */
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function ask() {
  let lastError = "none tried";
  for (const mirror of MIRRORS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(mirror, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "Cheap Groceries-student-project/0.1",
          },
          body: new URLSearchParams({ data: QUERY }),
        });
        if (response.ok) {
          console.log(`  via ${new URL(mirror).host}`);
          return response.json();
        }
        lastError = `HTTP ${response.status}`;
      } catch (error) {
        lastError = error.message;
      }
      console.warn(`  ! ${new URL(mirror).host} attempt ${attempt}: ${lastError}`);
      await sleep(2000);
    }
  }
  throw new Error(`every Overpass mirror failed (${lastError})`);
}

async function main() {
  const payload = await ask();
  const stores = [];
  const seen = new Set();

  for (const element of payload.elements ?? []) {
    const tags = element.tags ?? {};
    const name = tags.name;
    if (!name) continue;

    if (SMALL_FORMAT.test(plain(name))) continue;
    const chain = chainOf(tags);
    if (!chain) continue;

    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    // Chains map the same shop as both a node and a building outline.
    const key = `${chain}@${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const street = [tags["addr:street"], tags["addr:housenumber"]]
      .filter(Boolean)
      .join(" ");

    stores.push({
      id: `${element.type}/${element.id}`,
      chain,
      name,
      lat,
      lon,
      street: street || null,
      opening_hours: tags.opening_hours ?? null,
    });
  }

  stores.sort((a, b) => a.chain.localeCompare(b.chain) || a.name.localeCompare(b.name));

  await mkdir(resolve(ROOT, "data"), { recursive: true });
  await writeFile(
    resolve(ROOT, "data/stores.json"),
    JSON.stringify(
      {
        campus: CAMPUS,
        area: AREA,
        collected_on: new Date().toISOString().slice(0, 10),
        source: "OpenStreetMap via Overpass API, © OpenStreetMap contributors (ODbL)",
        stores,
      },
      null,
      2,
    ),
    "utf8",
  );

  // Also as a TypeScript module: the app and these scripts both import it, and
  // a plain .json import needs an import attribute that Next and Node disagree
  // about. One generated file keeps a single source of truth.
  const payloadForApp = {
    campus: CAMPUS,
    area: AREA,
    collected_on: new Date().toISOString().slice(0, 10),
    stores,
  };
  await writeFile(
    resolve(ROOT, "lib/stores-data.ts"),
    `// Generated by scripts/fetch-stores.mjs — run \`npm run stores\` to refresh.\n` +
      `// Source: OpenStreetMap via Overpass API, © OpenStreetMap contributors (ODbL).\n\n` +
      `const storeData = ${JSON.stringify(payloadForApp, null, 2)};\n\n` +
      `export default storeData;\n`,
    "utf8",
  );

  const byChain = stores.reduce((counts, store) => {
    counts[store.chain] = (counts[store.chain] ?? 0) + 1;
    return counts;
  }, {});
  for (const [chain, count] of Object.entries(byChain).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)} × ${chain}`);
  }
  console.log(`\n${stores.length} stores in ${AREA}`);
  console.log("-> data/stores.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
