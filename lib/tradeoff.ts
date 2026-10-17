import {
  CAMPUS,
  STORES,
  walkingMinutes,
  type Point,
  type Store,
} from "./geo.ts";

/** One place you could do the shopping, with what it costs and how long it takes. */
export type Option = {
  chain: string;
  store: Store;
  /** What the whole basket costs there. */
  cost: number;
  /** Walking time: campus to the shop, plus on to home when an address is set. */
  minutes: number;
};

/**
 * For each chain that can price the basket, the shop that costs the least time.
 * The basket costs the same in every shop of a chain, so only time varies, and
 * the quickest shop of each chain is the only one worth weighing.
 */
export function bestStorePerChain(
  costByChain: Record<string, number>,
  home: Point | null = null,
  from: Point = CAMPUS,
  stores: Store[] = STORES,
): Option[] {
  const options: Option[] = [];

  for (const [chain, cost] of Object.entries(costByChain)) {
    let best: Option | null = null;

    for (const store of stores) {
      if (store.chain !== chain) continue;
      const minutes =
        walkingMinutes(from, store) + (home ? walkingMinutes(store, home) : 0);
      if (!best || minutes < best.minutes) best = { chain, store, cost, minutes };
    }
    if (best) options.push(best);
  }

  return options;
}

/** Going from one option to a faster, dearer one. */
export type Step = {
  from: Option;
  to: Option;
  extraCost: number;
  savedMinutes: number;
  /** Euros paid for each minute saved. */
  perMinute: number;
};

export type TradeOff = {
  cheapest: Option;
  fastest: Option;
  /** The options worth considering: none is both dearer and slower than another. */
  frontier: Option[];
  /** Cheapest to fastest, what each move up costs per minute saved. */
  steps: Step[];
};

/**
 * Weighs cost against time. An option that costs more AND takes longer than
 * another is never worth choosing, so it is dropped. What remains is a ladder
 * from the cheapest shop to the fastest, and each rung says what the extra
 * money buys: "€0.60 more to save 4 minutes, €0.15 per minute".
 */
export function analyseTradeOff(options: Option[]): TradeOff | null {
  if (options.length === 0) return null;

  const byCost = [...options].sort(
    (a, b) => a.cost - b.cost || a.minutes - b.minutes,
  );

  const frontier: Option[] = [];
  for (const option of byCost) {
    const last = frontier[frontier.length - 1];
    if (!last || option.minutes < last.minutes) frontier.push(option);
  }

  const steps: Step[] = [];
  for (let i = 1; i < frontier.length; i += 1) {
    const from = frontier[i - 1];
    const to = frontier[i];
    const extraCost = to.cost - from.cost;
    const savedMinutes = from.minutes - to.minutes;
    steps.push({
      from,
      to,
      extraCost,
      savedMinutes,
      perMinute: savedMinutes > 0 ? extraCost / savedMinutes : 0,
    });
  }

  return {
    cheapest: frontier[0],
    fastest: frontier[frontier.length - 1],
    frontier,
    steps,
  };
}
