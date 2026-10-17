export type Product = {
  id: string;
  name: string;
  brand: string | null;
  store: string;
  price_eur: number;
  size_g: number | null;
  protein_g_per_100g: number | null;
  fat_g_per_100g: number | null;
  kcal_per_100g: number | null;
  price_checked_on: string;
  verified: boolean;
};

export type BasketItem = {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
};

/** Lowercase, strip accents, collapse whitespace. "Leche Entera" -> "leche entera". */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cheapest catalogue product in `store` that plausibly matches what the user typed.
 * Deliberately forgiving and allowed to miss: a miss means "no price for this one",
 * never an error, and never a reason to reject the item.
 */
export function cheapestMatch(
  itemName: string,
  store: string,
  products: Product[],
): Product | null {
  const typed = normalise(itemName);
  if (!typed) return null;

  const candidates = products.filter((product) => {
    if (product.store !== store) return false;
    const name = normalise(product.name);
    return typed.includes(name) || name.includes(typed);
  });

  if (candidates.length === 0) return null;
  return candidates.reduce((cheapest, product) =>
    product.price_eur < cheapest.price_eur ? product : cheapest,
  );
}

export type ItemPricing = {
  item: BasketItem;
  /** store -> cheapest matching product, or null when the catalogue has nothing */
  byStore: Record<string, Product | null>;
  /** true when every store can price it, so it is fair to compare */
  comparable: boolean;
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
  /** False when any price behind the totals has not been checked by a human. */
  allPricesVerified: boolean;
};

/**
 * Totals are summed only over items every store can price. Comparing a basket of
 * 8 products at one shop against 5 at another would make the shorter list look
 * cheaper for the wrong reason.
 */
export function compareBasket(
  items: BasketItem[],
  products: Product[],
): BasketComparison {
  const stores = [...new Set(products.map((product) => product.store))].sort();

  const pricing: ItemPricing[] = items.map((item) => {
    const byStore: Record<string, Product | null> = {};
    for (const store of stores) {
      byStore[store] = cheapestMatch(item.name, store, products);
    }
    return {
      item,
      byStore,
      comparable:
        stores.length > 0 && stores.every((store) => byStore[store] !== null),
    };
  });

  const comparable = pricing.filter((entry) => entry.comparable);

  const totals: StoreTotal[] = stores.map((store) => ({
    store,
    total: comparable.reduce((sum, entry) => {
      const product = entry.byStore[store]!;
      return sum + product.price_eur * entry.item.quantity;
    }, 0),
  }));

  const cheapestStore =
    comparable.length > 0 && totals.length > 0
      ? totals.reduce((best, current) =>
          current.total < best.total ? current : best,
        ).store
      : null;

  const used = comparable
    .flatMap((entry) => stores.map((store) => entry.byStore[store]))
    .filter((product): product is Product => product !== null);

  const dates = used.map((product) => product.price_checked_on).sort();

  return {
    stores,
    pricing,
    comparableCount: comparable.length,
    unpriced: pricing.filter((entry) => !entry.comparable),
    totals,
    cheapestStore,
    pricesCheckedOn: dates.length > 0 ? dates[dates.length - 1] : null,
    allPricesVerified: used.every((product) => product.verified),
  };
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
