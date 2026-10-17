import type { Point } from "./geo.ts";

export type Place = Point & { label: string };

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
const TIMEOUT_MS = 6000;

/** Madrid and its surroundings: west, north, east, south (Nominatim order). */
const MADRID_VIEWBOX = "-3.95,40.65,-3.45,40.25";
/** The same box for Photon: west, south, east, north. */
const MADRID_BBOX = "-3.95,40.25,-3.45,40.65";

/** A street or address a person might mean, found while they type. */
export type AddressSuggestion = Place & {
  /** The street name alone, for looking up an exact house number afterwards. */
  street: string | null;
};

/**
 * Suggestions while someone types an address in Madrid, from Photon, an OSM
 * geocoder built for search-as-you-type. Nominatim's own policy discourages
 * autocomplete, so it is kept for the single exact lookup afterwards.
 *
 * Never throws: a slow or unreachable service simply yields no suggestions.
 */
export async function suggestAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const text = query.trim();
  if (text.length < 3) return [];

  const url =
    `${PHOTON}?limit=6&lat=40.4777&lon=-3.6894&bbox=${MADRID_BBOX}` +
    `&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(url, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
        : AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return [];

    const body = (await response.json()) as {
      features?: {
        geometry: { coordinates: [number, number] };
        properties: {
          name?: string;
          street?: string;
          housenumber?: string;
          district?: string;
          locality?: string;
          postcode?: string;
          osm_key?: string;
        };
      }[];
    };

    const seen = new Set<string>();
    const found: AddressSuggestion[] = [];

    for (const feature of body.features ?? []) {
      const p = feature.properties;
      const [lon, lat] = feature.geometry.coordinates;

      const title = [p.name ?? p.street, p.housenumber].filter(Boolean).join(" ");
      if (!title) continue;
      const area = p.district ?? p.locality;
      const label = [title, area, p.postcode].filter(Boolean).join(", ");
      if (seen.has(label)) continue;
      seen.add(label);

      found.push({
        lat,
        lon,
        label,
        street: p.street ?? (p.osm_key === "highway" ? (p.name ?? null) : null),
      });
    }
    return found;
  } catch {
    return [];
  }
}

/**
 * Finds one address in Madrid exactly, house number included. The text typed is
 * sent to OpenStreetMap's public geocoder and nowhere else, and nothing is
 * kept: the caller holds the result in memory only.
 */
export async function geocodeMadrid(query: string): Promise<Place | null> {
  const text = query.trim();
  if (text.length < 3) return null;

  const withCity = /madrid/i.test(text) ? text : `${text}, Madrid`;
  const url =
    `${NOMINATIM}?format=json&limit=1&countrycodes=es&bounded=1` +
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
