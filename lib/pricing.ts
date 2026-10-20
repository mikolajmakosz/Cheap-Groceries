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

  // A fragment that starts a word beats one buried inside another word, so
  // "queso" finds a cheese and not "requesón".
  const shortestFirst = [...rows].reverse();
  const atWord = shortestFirst.find(({ alias }) => alias.split(" ").some((word) => word.startsWith(text)) || alias.startsWith(text));
  const partial = atWord ?? shortestFirst.find(({ alias }) => alias.includes(text));
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
};

export type StoreTotal = {
  store: string;
  total: number;
};

export type BasketComparison = {
  /** The shops being compared: every total below covers the same products in each. */
  stores: string[];
  /** Shops the catalogue knows that this comparison leaves out. */
  excludedStores: string[];
  pricing: ItemPricing[];
  comparableCount: number;
  /** Items at least one store cannot price — excluded from the totals below. */
  unpriced: ItemPricing[];
  totals: StoreTotal[];
  cheapestStore: string | null;
  /** Most recent collection date among the prices actually used. */
  pricesCheckedOn: string | null;
};

/** How much of the product a basket line stands for, in the basis unit. */
export function amountOf(entry: CatalogueEntry, quantity: number): number {
  return entry.serving * quantity;
}

/** What that much of the product costs in one shop, from its unit price. */
export function portionCost(
  offer: Offer,
  entry: CatalogueEntry,
  quantity: number,
): number {
  return (offer.unit_price * amountOf(entry, quantity)) / entry.basis.amount;
}

/** Every shop the catalogue holds a price for, in alphabetical order. */
export function storesIn(catalogue: CatalogueEntry[] = CATALOGUE): string[] {
  return [...new Set(catalogue.flatMap((entry) => Object.keys(entry.offers)))].sort();
}

/** Every group of at least two shops, so there is always something to compare. */
function groupsOf(stores: string[]): string[][] {
  const groups: string[][] = [];
  for (let mask = 1; mask < 1 << stores.length; mask += 1) {
    const group = stores.filter((_, index) => mask & (1 << index));
    if (group.length >= 2) groups.push(group);
  }
  return groups;
}

/**
 * The shops worth comparing for the products in a basket: the group of at least
 * two shops that all price the most of them.
 *
 * The catalogue holds Mercadona and Dia for everyday own-brand products and
 * Alcampo, El Corte Inglés, Carrefour and Dia for branded ones. Comparing all of
 * them at once would price almost nothing, because no shop sells everything, so
 * the compared group follows the basket. A tie goes to the larger group, then to
 * alphabetical order, so the answer never changes between renders.
 */
export function shopsFor(
  entries: CatalogueEntry[],
  catalogue: CatalogueEntry[] = CATALOGUE,
): string[] {
  const all = storesIn(catalogue);
  if (entries.length === 0 || all.length < 3) return all;

  let best: { group: string[]; priced: number } | null = null;
  for (const group of groupsOf(all)) {
    const priced = entries.filter((entry) =>
      group.every((store) => entry.offers[store]),
    ).length;
    if (
      !best ||
      priced > best.priced ||
      (priced === best.priced && group.length > best.group.length)
    ) {
      best = { group, priced };
    }
  }
  return best && best.priced > 0 ? best.group : all;
}

/**
 * Totals are summed only over items every compared shop can price. Comparing
 * eight priced items at one shop against five at another would make the shorter
 * list look cheaper for the wrong reason.
 *
 * Which shops are compared is `shops` when given, else the group that prices the
 * most of the basket (see `shopsFor`). A product a shop does not carry therefore
 * leaves that shop out of the comparison, or the product out of the totals, but
 * never counts as free.
 *
 * Every figure is a unit price (per kg, per L, per dozen…) times the amount, never
 * a pack price: shops do not sell identical packs, and a 2 kg bag against a 230 g
 * potato says nothing about which shop is cheaper.
 */
export function compareBasket(
  items: BasketItem[],
  catalogue: CatalogueEntry[] = CATALOGUE,
  shops?: string[],
): BasketComparison {
  const resolved = items.map((item) => entryFor(item.name, catalogue));
  const stores = (
    shops ?? shopsFor(resolved.filter((e): e is CatalogueEntry => e !== null), catalogue)
  )
    .slice()
    .sort();

  const pricing: ItemPricing[] = items.map((item, index) => {
    const entry = resolved[index];
    const byStore: Record<string, Offer | null> = {};
    for (const store of stores) byStore[store] = entry?.offers[store] ?? null;

    const comparable =
      entry !== null &&
      stores.length > 0 &&
      stores.every((store) => byStore[store] !== null);

    return { item, entry, byStore, comparable };
  });

  const comparable = pricing.filter((entry) => entry.comparable);

  const totals: StoreTotal[] = stores.map((store) => ({
    store,
    total: comparable.reduce(
      (sum, row) => sum + portionCost(row.byStore[store]!, row.entry!, row.item.quantity),
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
    excludedStores: storesIn(catalogue).filter((store) => !stores.includes(store)),
    pricing,
    comparableCount: comparable.length,
    unpriced: pricing.filter((entry) => !entry.comparable),
    totals,
    cheapestStore,
    pricesCheckedOn: dates.length > 0 ? dates[dates.length - 1] : null,
  };
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/** "€1.85 / kg" — what one basis unit costs, the same measure in every shop. */
export function formatUnitPrice(offer: Offer, entry: CatalogueEntry): string {
  return `${formatEuro(offer.unit_price)} / ${entry.basis.label}`;
}

const PLURALS: Record<string, string> = { loaf: "loaves", piece: "pieces" };

function trim(value: number): string {
  return `${+value.toFixed(2)}`;
}

/**
 * "200 g", "1.5 L", "2 dozen", "3 loaves": the amount a basket line stands for,
 * said the way a person would say it.
 */
export function formatQuantity(quantity: number, entry: CatalogueEntry): string {
  const amount = amountOf(entry, quantity);
  const { label } = entry.basis;

  if (label === "kg") return amount >= 1000 ? `${trim(amount / 1000)} kg` : `${amount} g`;
  if (label === "L") return amount >= 1000 ? `${trim(amount / 1000)} L` : `${amount} ml`;

  // Counted things: dozens, loaves, pieces.
  const count = amount / entry.basis.amount;
  return `${trim(count)} ${count === 1 ? label : (PLURALS[label] ?? label)}`;
}
