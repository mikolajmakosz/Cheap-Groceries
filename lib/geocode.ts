import type { Point } from "./geo.ts";

export type Place = Point & { label: string };

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 6000;

/** Madrid and its surroundings: west, north, east, south. */
const MADRID_VIEWBOX = "-3.95,40.65,-3.45,40.25";

/**
 * Finds an address in Madrid. The text typed is sent to OpenStreetMap's public
 * geocoder and nowhere else, and nothing is kept: the caller holds the result
 * in memory only.
 */
export async function geocodeMadrid(query: string): Promise<Place | null> {
  const text = query.trim();
  if (text.length < 3) return null;

  const withCity = /madrid/i.test(text) ? text : `${text}, Madrid`;
  const url =
    `${ENDPOINT}?format=json&limit=1&countrycodes=es&bounded=1` +
    `&viewbox=${MADRID_VIEWBOX}&q=${encodeURIComponent(withCity)}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;

    const results = (await response.json()) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];
    const first = results[0];
    if (!first) return null;

    return {
      lat: Number(first.lat),
      lon: Number(first.lon),
      label: first.display_name.split(",").slice(0, 3).join(",").trim(),
    };
  } catch {
    return null;
  }
}
