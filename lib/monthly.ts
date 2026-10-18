import { CAMPUS, walkingMinutes, type Point, type Store } from "./geo.ts";
import { MONTH_DAYS } from "./plan.ts";

/** One shop over a billing period: what it costs and how much time it takes. */
export type Month = {
  /** Shopping trips in the period, for a basket that lasts `days`. */
  trips: number;
  /** Minutes for one trip: campus to shop, inside the shop, shop to home. */
  minutesPerTrip: number;
  walkMinutes: number;
  shopMinutes: number;
  /** Minutes over the period. */
  minutes: number;
  /** Euros over the period. */
  euros: number;
  /** Whether the way on to home is in the minutes. */
  withHome: boolean;
};

/**
 * A basket that lasts `days` is bought period / days times in a period. Each trip
 * is the walk from campus to the shop, the time inside, and the walk on to home
 * when an address is known. Money is the shop's per-day cost over the period, so
 * a slow item such as oil is not charged as if it ran out with the rest.
 */
export function periodFor(
  store: Store,
  perDay: number,
  days: number,
  shopMinutes: number,
  home: Point | null,
  periodDays: number,
  from: Point = CAMPUS,
): Month {
  const trips = periodDays / days;
  const walk =
    walkingMinutes(from, store) + (home ? walkingMinutes(store, home) : 0);
  const perTrip = walk + shopMinutes;
  return {
    trips,
    minutesPerTrip: perTrip,
    walkMinutes: walk,
    shopMinutes,
    minutes: Math.round(perTrip * trips),
    euros: perDay * periodDays,
    withHome: home !== null,
  };
}

/** The same over 30 days. */
export function monthFor(
  store: Store,
  perDay: number,
  days: number,
  shopMinutes: number,
  home: Point | null,
  from: Point = CAMPUS,
): Month {
  return periodFor(store, perDay, days, shopMinutes, home, MONTH_DAYS, from);
}

/** "3 h 20 min" or "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
