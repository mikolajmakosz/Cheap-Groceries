import { CAMPUS, STORES, metresBetween, walkingMinutes, type Point, type Store } from "./geo.ts";
import stationData from "./stations-data.ts";

/**
 * How a shopping trip is timed.
 *
 * The **anchor** is a place you go anyway and come home from: IE Tower by
 * default, or your gym, a class, a job. Shopping on the way home from it only
 * costs the detour. Shopping **from home** costs the whole trip there and back.
 * Times are estimates for the chosen way of getting about, never a timetable.
 */
export type Transport = "walk" | "bus" | "metro" | "metro-bus" | "train";
export type Start = "anchor" | "home";
export type Anchor = Point & { label: string };
export type TripSettings = {
  anchor: Anchor;
  home: (Point & { label: string }) | null;
  start: Start;
  transport: Transport;
};

export const IE_TOWER: Anchor = { lat: CAMPUS.lat, lon: CAMPUS.lon, label: "IE Tower" };

export const DEFAULT_TRIP: TripSettings = {
  anchor: IE_TOWER,
  home: null,
  start: "anchor",
  transport: "walk",
};

export const TRANSPORT_LABELS: Record<Transport, string> = {
  walk: "Walk",
  bus: "Bus",
  metro: "Metro",
  "metro-bus": "Metro + bus",
  train: "Train",
};

/** What a leg actually uses once the quickest way is picked. */
export type LegMode = "walk" | "bus" | "metro" | "train";
export type Leg = { minutes: number; by: LegMode };

const METRO = stationData.metro;
const TRAIN = stationData.train;

function nearest(point: Point, stations: { lat: number; lon: number }[]) {
  let best = stations[0];
  let bestMetres = Infinity;
  for (const station of stations) {
    const metres = metresBetween(point, station);
    if (metres < bestMetres) {
      best = station;
      bestMetres = metres;
    }
  }
  return best;
}

// Rough figures for Madrid, chosen to be honest rather than flattering: the
// wait is about half the usual gap between services, speeds include stops.
const BUS = { access: 4, wait: 6, kmh: 13, roadFactor: 1.3, egress: 3 };
const METRO_RIDE = { wait: 4, kmh: 30, lineFactor: 1.25, changeOver: 5, changeAboveKm: 4 };
const TRAIN_RIDE = { wait: 8, kmh: 40, lineFactor: 1.2 };

function busMinutes(a: Point, b: Point): number {
  const km = (metresBetween(a, b) * BUS.roadFactor) / 1000;
  return BUS.access + BUS.wait + (km / BUS.kmh) * 60 + BUS.egress;
}

function railMinutes(
  a: Point,
  b: Point,
  stations: { lat: number; lon: number }[],
  ride: { wait: number; kmh: number; lineFactor: number; changeOver?: number; changeAboveKm?: number },
): number {
  if (stations.length === 0) return Infinity;
  const from = nearest(a, stations);
  const to = nearest(b, stations);
  if (from === to) return Infinity;
  const km = (metresBetween(from, to) * ride.lineFactor) / 1000;
  const change = ride.changeOver && km > (ride.changeAboveKm ?? Infinity) ? ride.changeOver : 0;
  return walkingMinutes(a, from) + ride.wait + (km / ride.kmh) * 60 + change + walkingMinutes(to, b);
}

/**
 * The quickest way between two points with the chosen transport, walking
 * included: if the shop is round the corner you walk, whatever you picked.
 */
export function legMinutes(a: Point, b: Point, transport: Transport): Leg {
  const options: Leg[] = [{ minutes: walkingMinutes(a, b), by: "walk" }];
  if (transport === "bus" || transport === "metro-bus") options.push({ minutes: busMinutes(a, b), by: "bus" });
  if (transport === "metro" || transport === "metro-bus") {
    options.push({ minutes: railMinutes(a, b, METRO, METRO_RIDE), by: "metro" });
  }
  if (transport === "train") options.push({ minutes: railMinutes(a, b, TRAIN, TRAIN_RIDE), by: "train" });
  const best = options.reduce((x, y) => (y.minutes < x.minutes ? y : x));
  return { minutes: Math.max(1, Math.round(best.minutes)), by: best.by };
}

/** Minutes from the anchor to the shop, and on to home beyond going straight home. */
export function onTheWayMinutes(store: Point, trip: TripSettings): number {
  const toShop = legMinutes(trip.anchor, store, trip.transport).minutes;
  if (!trip.home) return toShop;
  const onward = legMinutes(store, trip.home, trip.transport).minutes;
  const direct = legMinutes(trip.anchor, trip.home, trip.transport).minutes;
  return Math.max(0, toShop + onward - direct);
}

/** Minutes for a trip from home to the shop and back; null without a home. */
export function fromHomeMinutes(store: Point, trip: TripSettings): number | null {
  if (!trip.home) return null;
  return 2 * legMinutes(trip.home, store, trip.transport).minutes;
}

/**
 * Going out from home you would not walk to the shop near your anchor: you would
 * go to the nearest shop of the same chain to your home and back. This is that
 * trip, and the shop; null without a home.
 */
export function bestFromHome(
  chain: string,
  trip: TripSettings,
  stores: Store[] = STORES,
): { store: Store; minutes: number } | null {
  if (!trip.home) return null;
  let best: { store: Store; minutes: number } | null = null;
  for (const store of stores) {
    if (store.chain !== chain) continue;
    const minutes = 2 * legMinutes(trip.home, store, trip.transport).minutes;
    if (!best || minutes < best.minutes) best = { store, minutes };
  }
  return best;
}

/**
 * The minutes a shop costs you, not counting the time inside: the detour when
 * you shop on your way home from the anchor, the whole trip when you go from home.
 */
export function shopTripMinutes(store: Point, trip: TripSettings): number {
  if (trip.start === "home") return fromHomeMinutes(store, trip) ?? onTheWayMinutes(store, trip);
  return onTheWayMinutes(store, trip);
}

/** Where the trip starts on the map. */
export function tripOrigin(trip: TripSettings): Point {
  return trip.start === "home" && trip.home ? trip.home : trip.anchor;
}
