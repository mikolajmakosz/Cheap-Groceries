"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { metresBetween, type Point, type Store } from "./geo";
import type { Place } from "./geocode";
import { legMinutes, tripOrigin, type TripSettings } from "./trip";
import { getTrip, setTrip, useTripSettings } from "./tripStore";
import { walkingRoute, type Route } from "./walking";

/**
 * One leg on the map. Walked legs come from the pedestrian router; legs that a
 * bus, the Metro or the train would make quicker are drawn straight and timed
 * by the estimate in trip.ts, since there is no free timetable router for Madrid.
 */
async function legRoute(from: Point, to: Point, trip: TripSettings): Promise<Route> {
  const leg = legMinutes(from, to, trip.transport);
  if (leg.by === "walk") return { ...(await walkingRoute(from, to)), by: "walk" };
  return {
    minutes: leg.minutes,
    metres: Math.round(metresBetween(from, to)),
    path: [
      [from.lat, from.lon],
      [to.lat, to.lon],
    ],
    source: "estimate",
    by: leg.by,
  };
}

/**
 * The shop a person is looking at and how they get there: from their anchor
 * (IE Tower, a gym…) and on to home, or from home and back. Driven by clicks and
 * by changes to the trip settings; a newer request makes any slower, older
 * answer be ignored.
 */
export function useTrip() {
  const trip = useTripSettings();
  const [selected, setSelected] = useState<Store | null>(null);
  const [toStore, setToStore] = useState<Route | null>(null);
  const [toHome, setToHome] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);

  const load = useCallback(async (store: Store | null) => {
    const id = ++request.current;
    setToStore(null);
    setToHome(null);
    if (!store) {
      setLoading(false);
      return;
    }
    const current = getTrip();
    setLoading(true);
    const origin = tripOrigin(current);
    const onward = current.start === "anchor" && current.home ? current.home : null;
    const [first, second] = await Promise.all([
      legRoute(origin, store, current),
      onward ? legRoute(store, onward, current) : Promise.resolve(null),
    ]);
    if (id !== request.current) return;
    setToStore(first);
    setToHome(second);
    setLoading(false);
  }, []);

  const select = useCallback(
    async (store: Store | null) => {
      setSelected(store);
      await load(store);
    },
    [load],
  );

  // New anchor, home or transport: redraw the way to the chosen shop.
  useEffect(() => {
    // The state it sets arrives after the await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selected) void load(selected);
  }, [trip, selected, load]);

  const setHomePlace = useCallback(async (place: Place | null) => {
    setTrip({ home: place });
  }, []);

  return {
    selected,
    trip,
    home: trip.home,
    toStore,
    toHome,
    loading,
    select,
    setHomePlace,
  };
}
