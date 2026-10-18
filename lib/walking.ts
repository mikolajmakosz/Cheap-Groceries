import { estimateWalk, type Point } from "./geo.ts";

export type Route = {
  metres: number;
  minutes: number;
  /** [lat, lon] pairs, ready for a map. */
  path: [number, number][];
  /** "route" when a router answered, "estimate" when we fell back to a straight line. */
  source: "route" | "estimate";
  /** How the leg is travelled; walking unless a transport estimate says otherwise. */
  by?: "walk" | "bus" | "metro" | "train";
};

const ENDPOINT = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const TIMEOUT_MS = 6000;

const cache = new Map<string, Route>();

const key = (a: Point, b: Point) =>
  [a.lat, a.lon, b.lat, b.lon].map((n) => n.toFixed(5)).join(",");

/**
 * A walking route between two points, from the public FOSSGIS router for
 * pedestrians. It never throws: a slow or unreachable router must not take the
 * feature down, so the fallback is a straight line with the same estimate the
 * rest of the app uses, and the result says which of the two it is.
 */
export async function walkingRoute(from: Point, to: Point): Promise<Route> {
  const id = key(from, to);
  const cached = cache.get(id);
  if (cached) return cached;

  const fallback = (): Route => {
    const { metres, minutes } = estimateWalk(from, to);
    return {
      metres,
      minutes,
      path: [
        [from.lat, from.lon],
        [to.lat, to.lon],
      ],
      source: "estimate",
    };
  };

  try {
    const url = `${ENDPOINT}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return fallback();

    const body = await response.json();
    const best = body?.routes?.[0];
    const coordinates: [number, number][] | undefined = best?.geometry?.coordinates;
    if (body?.code !== "Ok" || !best || !coordinates?.length) return fallback();

    const route: Route = {
      metres: Math.round(best.distance),
      minutes: Math.max(1, Math.round(best.duration / 60)),
      path: coordinates.map(([lon, lat]) => [lat, lon]),
      source: "route",
    };
    cache.set(id, route);
    return route;
  } catch {
    return fallback();
  }
}
