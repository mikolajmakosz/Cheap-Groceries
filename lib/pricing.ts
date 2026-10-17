import {
  CATALOGUE,
  normalise,
  type CatalogueEntry,
  type Offer,
} from "./catalogue.ts";

export type BasketItem = {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
};

const MIN_ALIAS_LENGTH = 3;

type AliasRow = { term: string; alias: string };

function aliasesOf(catalogue: CatalogueEntry[]): AliasRow[] {
  return catalogue
    .flatMap((entry) =>
      [entry.term, entry.label, ...entry.aliases].map((alias) => ({
        term: entry.term,
        alias: normalise(alias),
      })),
    )
    .filter(({ alias }) => alias.length >= MIN_ALIAS_LENGTH)
    .sort((a, b) => b.alias.length - a.alias.length);
}

/**
 * The catalogue term behind what the user typed, or null when nothing fits.
 *
 * Order matters. An exact word wins outright, otherwise "pan" would resolve to
 * "pan de molde" and "tomate" to "tomate frito", because those aliases contain
 * the shorter one. Only then comes the longest alias inside the typed text, so
 * "pechuga de pollo" finds chicken, and last a typed fragment of an alias,
 * where the shortest candidate is the closest guess.
 */
export function termFor(
  typed: string,
  catalogue: CatalogueEntry[] = CATALOGUE,
): string | null {
  const text = normalise(typed);
  if (text.length < MIN_ALIAS_LENGTH) return null;

  // Sorted longest first, so `find` takes the most specific alias.
  const rows = aliasesOf(catalogue);

  const exact = rows.find(({ alias }) => alias === text);
  if (exact) return exact.term;

  const contained = rows.find(({ alias }) => text.includes(alias));
  if (contained) return contained.term;

  const partial = [...rows].reverse().find(({ alias }) => alias.includes(text));
  return partial?.term ?? null;
}

export function entryFor(
  typed: string,
  catalogue: CatalogueEntry[] = CATALOGUE,
): CatalogueEntry | null {
  const term = termFor(typed, catalogue);
  return term ? (catalogue.find((entry) => entry.term === term) ?? null) : null;
}

/**
 * Catalogue entries to offer while someone is typing, best match first.
 *
 * Suggestions are a shortcut and never a requirement: the basket accepts any
 * text, so a word that suggests nothing is still saved exactly as typed.
 */
export function suggest(
  typed: string,
  catalogue: CatalogueEntry[] = CATALOGUE,
  limit = 6,
): CatalogueEntry[] {
  const text = normalise(typed);
  if (text.length < 2) return [];

  const scored: { entry: CatalogueEntry; score: number }[] = [];

  for (const entry of catalogue) {
    let best = Infinity;
    for (const raw of [entry.label, ...entry.aliases, entry.term]) {
      const alias = normalise(raw);
      let score = Infinity;
      if (alias === text) score = 0;
      else if (alias.startsWith(text)) score = 1;
      else if (alias.split(" ").some((word) => word.startsWith(text))) score = 2;
      else if (alias.includes(text)) score = 3;
      best = Math.min(best, score);
    }
    if (best !== Infinity) scored.push({ entry, score: best });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export type ItemPricing = {
  item: BasketItem;
  /** The catalogue entry the typed text resolved to, if any. */
  entry: CatalogueEntry | null;
  /** store -> that shop's reference product, or null when it has none */
  byStore: Record<string, Offer | null>;
  /** true when every store can price it, so it is fair to compare */
  comparable: boolean;
  /** true when the packs differ a lot in size, so the totals deserve a caveat */
  sizesDiffer: boolean;
};

export type StoreTotal = {
  store: string;
  total: number;
};

export type BasketComparison = {
  stores: string[];
  pricing: ItemPricing[];
  comparableCount: number;
  /** Items at least one store cannot price — excluded from the totals below. */
  unpriced: ItemPricing[];
  totals: StoreTotal[];
  cheapestStore: string | null;
  /** Most recent collection date among the prices actually used. */
  pricesCheckedOn: string | null;
  /** true when some compared packs differ a lot between shops. */
  anySizesDiffer: boolean;
};

const SIZE_RATIO_LIMIT = 1.4;

function sizesDifferFor(offers: Offer[]): boolean {
  const sizes = offers.map((offer) => offer.size_g);
  if (sizes.some((size) => size === null || size <= 0)) return false;
  const known = sizes as number[];
  return Math.max(...known) / Math.min(...known) > SIZE_RATIO_LIMIT;
}

/**
 * Totals are summed only over items every shop can price. Comparing eight
 * priced items at one shop against five at another would make the shorter list
 * look cheaper for the wrong reason.
 */
export function compareBasket(
  items: BasketItem[],
  catalogue: CatalogueEntry[] = CATALOGUE,
): BasketComparison {
  const stores = [
    ...new Set(catalogue.flatMap((entry) => Object.keys(entry.offers))),
  ].sort();

  const pricing: ItemPricing[] = items.map((item) => {
    const entry = entryFor(item.name, catalogue);
    const byStore: Record<string, Offer | null> = {};
    for (const store of stores) byStore[store] = entry?.offers[store] ?? null;

    const comparable =
      entry !== null &&
      stores.length > 0 &&
      stores.every((store) => byStore[store] !== null);

    const offers = stores
      .map((store) => byStore[store])
      .filter((offer): offer is Offer => offer !== null);

    return {
      item,
      entry,
      byStore,
      comparable,
      sizesDiffer: comparable && sizesDifferFor(offers),
    };
  });

  const comparable = pricing.filter((entry) => entry.comparable);

  const totals: StoreTotal[] = stores.map((store) => ({
    store,
    total: comparable.reduce(
      (sum, entry) => sum + entry.byStore[store]!.price_eur * entry.item.quantity,
      0,
    ),
  }));

  // Declaring a winner needs at least two shops to compare.
  const cheapestStore =
    stores.length > 1 && comparable.length > 0
      ? totals.reduce((best, current) =>
          current.total < best.total ? current : best,
        ).store
      : null;

  const dates = comparable
    .flatMap((entry) => stores.map((store) => entry.byStore[store]))
    .filter((offer): offer is Offer => offer !== null)
    .map((offer) => offer.checked_on)
    .sort();

  return {
    stores,
    pricing,
    comparableCount: comparable.length,
    unpriced: pricing.filter((entry) => !entry.comparable),
    totals,
    cheapestStore,
    pricesCheckedOn: dates.length > 0 ? dates[dates.length - 1] : null,
    anySizesDiffer: comparable.some((entry) => entry.sizesDiffer),
  };
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/** A pack size in grams or millilitres, as a person would say it. */
export function formatSize(sizeG: number | null): string | null {
  if (sizeG === null) return null;
  return sizeG >= 1000 ? `${+(sizeG / 1000).toFixed(2)} kg or L` : `${sizeG} g or ml`;
}
