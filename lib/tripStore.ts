"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_TRIP, type TripSettings } from "./trip";

/**
 * Where you shop from, where you live and how you get about. Kept in memory,
 * so it survives moving between pages of the app but not a reload: addresses
 * are personal data and nothing needs them kept.
 */
let trip: TripSettings = DEFAULT_TRIP;
const listeners = new Set<() => void>();

export function getTrip(): TripSettings {
  return trip;
}

export function setTrip(change: Partial<TripSettings>) {
  trip = { ...trip, ...change };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTripSettings(): TripSettings {
  return useSyncExternalStore(subscribe, getTrip, () => DEFAULT_TRIP);
}
