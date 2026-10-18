import { CAMPUS, walkingMinutes, type Point, type Store } from "./geo.ts";
import { MONTH_DAYS } from "./plan.ts";

/** One shop's month: what it costs and how much time it takes. */
export type Month = {
  /** Shopping trips in 30 days, for a basket that lasts `days`. */
  trips: number;
  /** Minutes for one trip: campus to shop, inside the shop, shop to home. */
  minutesPerTrip: number;
  walkMinutes: number;
  shopMinutes: number;
  /** Minutes over the month. */
  minutes: number;
  /** Euros over the month. */
  euros: number;
  /** Whether the way on to home is in the minutes. */
  withHome: boolean;
};

/**
 * A basket that lasts `days` is bought 30 / days times a month. Each trip is the
 * walk from campus to the shop, the time inside, and the walk on to home when an
 * address is known. Money is the shop's per-day cost over 30 days, so slow items
 * such as oil are not charged as if they ran out with the rest.
 */
export function monthFor(
  store: Store,
  perDay: number,
  days: number,
  shopMinutes: number,
  home: Point | null,
  from: Point = CAMPUS,
): Month {
  const trips = MONTH_DAYS / days;
  const walk =
    walkingMinutes(from, store) + (home ? walkingMinutes(store, home) : 0);
  const perTrip = walk + shopMinutes;
  return {
    trips,
    minutesPerTrip: perTrip,
    walkMinutes: walk,
    shopMinutes,
    minutes: Math.round(perTrip * trips),
    euros: perDay * MONTH_DAYS,
    withHome: home !== null,
  };
}

/** "3 h 20 min" or "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
