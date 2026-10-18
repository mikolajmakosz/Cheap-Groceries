"use client";

import { useCallback, useRef, useState } from "react";
import { CAMPUS, type Store } from "./geo";
import type { Place } from "./geocode";
import { getHome, setHome as storeHome, useHome } from "./homeStore";
import { walkingRoute, type Route } from "./walking";

/**
 * The shop a person is looking at, how to walk there from campus, and — if they
 * give an address — how to walk on from there to home.
 *
 * Driven by clicks rather than effects, so there is nothing to keep in sync:
 * each action fetches what it needs, and a newer click makes any slower, older
 * answer be ignored. The home address lives in memory only and is gone on
 * reload (see homeStore): it is personal data, and nothing needs it kept.
 */
export function useTrip() {
  const [selected, setSelected] = useState<Store | null>(null);
  const home = useHome();
  const [toStore, setToStore] = useState<Route | null>(null);
  const [toHome, setToHome] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useRef(0);
  const selectedRef = useRef<Store | null>(null);
  const homeRef = useRef<Place | null>(getHome());

  const select = useCallback(async (store: Store | null) => {
    const id = ++request.current;
    selectedRef.current = store;
    setSelected(store);
    setToStore(null);
    setToHome(null);
    if (!store) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [first, second] = await Promise.all([
      walkingRoute(CAMPUS, store),
      homeRef.current ? walkingRoute(store, homeRef.current) : Promise.resolve(null),
    ]);
    if (id !== request.current) return;

    setToStore(first);
    setToHome(second);
    setLoading(false);
  }, []);

  const setHomePlace = useCallback(async (place: Place | null) => {
    homeRef.current = place;
    storeHome(place);
    setToHome(null);

    const store = selectedRef.current;
    if (!place || !store) return;

    const id = ++request.current;
    setLoading(true);
    const [first, second] = await Promise.all([
      walkingRoute(CAMPUS, store),
      walkingRoute(store, place),
    ]);
    if (id !== request.current) return;

    setToStore(first);
    setToHome(second);
    setLoading(false);
  }, []);

  return { selected, home, toStore, toHome, loading, select, setHomePlace };
}
