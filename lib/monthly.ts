import type { Store } from "./geo.ts";
import { DEFAULT_TRIP, bestFromHome, onTheWayMinutes, shopTripMinutes, type TripSettings } from "./trip.ts";
import { MONTH_DAYS } from "./plan.ts";
import { deliveryFee } from "./delivery.ts";

/** One shop over a billing period: what it costs and how much time it takes. */
export type Month = {
  /** Shopping trips in the period, for a basket that lasts `days`. */
  trips: number;
  /** Minutes one trip adds to your day: the detour on the way home, plus the time inside. */
  minutesPerTrip: number;
  walkMinutes: number;
  shopMinutes: number;
  /** Minutes over the period. */
  minutes: number;
  /** Euros over the period. */
  euros: number;
  /** Whether the way on to home is in the minutes. */
  withHome: boolean;
  /**
   * Minutes over the period saved by shopping at this shop on the way home from
   * the anchor rather than going out from home to the nearest shop of the same
   * chain and back; null unless you start from the anchor and a home is known.
   */
  savedVsHome: number | null;
};

/**
 * A basket that lasts period / days times in a period. Each trip
 * is the walk from campus to the shop, the time inside, and the walk on to home
 * when an address is known. Money is the shop's per-day cost over the period, so
 * a slow item such as oil is not charged as if it ran out with the rest.
 */
export function periodFor(
  store: Store,
  perDay: number,
  days: number,
  shopMinutes: number,
  trip: TripSettings,
  periodDays: number,
): Month {
  const trips = periodDays / days;
  const walk = shopTripMinutes(store, trip);
  const perTrip = walk + shopMinutes;
  const fromHome = bestFromHome(store.chain, trip)?.minutes ?? null;
  const onTheWay = trip.home ? onTheWayMinutes(store, trip) : null;
  return {
    trips,
    minutesPerTrip: perTrip,
    walkMinutes: walk,
    shopMinutes,
    minutes: Math.round(perTrip * trips),
    euros: perDay * periodDays,
    withHome: trip.home !== null,
    savedVsHome:
      trip.start === "anchor" && fromHome !== null && onTheWay !== null
        ? Math.round(Math.max(0, fromHome - onTheWay) * trips)
        : null,
  };
}

/** The same basket brought home instead of carried: no trips, a delivery charge each time. */
export type Delivered = {
  /** Deliveries in the period. */
  deliveries: number;
  /** The charge for one delivery, 0 when the basket is big enough to be free. */
  feeEach: number;
  /** Delivery charges over the period. */
  fees: number;
  /** Basket money plus delivery charges over the period. */
  euros: number;
  /** Minutes of your own time the trips would have taken, which delivery gives back. */
  minutesSaved: number;
  /** What each hour of that time costs; null when there are no fees or no time saved. */
  perHour: number | null;
};

/**
 * Delivery over a billing period: the shop's usual cost plus a charge for each
 * delivery (free when one basket is worth enough), set against the trip minutes
 * it saves. `walk` is what carrying the same basket would take over the period.
 */
export function deliveredFor(
  shop: string,
  basketTotal: number,
  walk: Month,
): Delivered {
  const feeEach = deliveryFee(shop, basketTotal);
  const fees = feeEach * walk.trips;
  const hoursSaved = walk.minutes / 60;
  return {
    deliveries: walk.trips,
    feeEach,
    fees,
    euros: walk.euros + fees,
    minutesSaved: walk.minutes,
    perHour: fees > 0 && hoursSaved > 0 ? fees / hoursSaved : null,
  };
}

/** The same over 30 days. */
export function monthFor(
  store: Store,
  perDay: number,
  days: number,
  shopMinutes: number,
  trip: TripSettings = DEFAULT_TRIP,
): Month {
  return periodFor(store, perDay, days, shopMinutes, trip, MONTH_DAYS);
}

/** "3 h 20 min" or "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
