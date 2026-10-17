import storeData from "./stores-data.ts";

export type Store = {
  id: string;
  chain: string;
  name: string;
  lat: number;
  lon: number;
  street: string | null;
  opening_hours: string | null;
};

export type Point = { lat: number; lon: number };

export const CAMPUS = storeData.campus;
export const STORES: Store[] = storeData.stores;
export const STORES_COLLECTED_ON = storeData.collected_on;

/** Straight-line metres between two points. */
export function metresBetween(a: Point, b: Point): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Streets do not run in straight lines, so the walk is longer than the crow
 * flies. 1.35 is the usual city detour factor; 4.8 km/h is an unhurried pace.
 * This is an estimate and the app says so — it is not a routed journey.
 */
const DETOUR = 1.35;
const WALK_KMH = 4.8;

export function walkingMinutes(from: Point, to: Point): number {
  const metres = metresBetween(from, to) * DETOUR;
  return Math.max(1, Math.round((metres / 1000 / WALK_KMH) * 60));
}

export function walkingMetres(from: Point, to: Point): number {
  return Math.round(metresBetween(from, to) * DETOUR);
}

export function formatWalk(from: Point, to: Point): string {
  const metres = walkingMetres(from, to);
  const minutes = walkingMinutes(from, to);
  const distance =
    metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
  return `${minutes} min · ${distance}`;
}

/** Nearest store of each chain to `from`, closest chain first. */
export function nearestPerChain(from: Point, stores: Store[] = STORES) {
  const best = new Map<string, { store: Store; metres: number }>();

  for (const store of stores) {
    const metres = walkingMetres(from, store);
    const current = best.get(store.chain);
    if (!current || metres < current.metres) best.set(store.chain, { store, metres });
  }

  return [...best.values()].sort((a, b) => a.metres - b.metres);
}
