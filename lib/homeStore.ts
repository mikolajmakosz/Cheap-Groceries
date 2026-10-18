"use client";

import { useSyncExternalStore } from "react";
import type { Place } from "./geocode";

/**
 * The home address lives here, in memory, so it survives moving between pages
 * of the app but not a reload. It is personal data and nothing needs it kept.
 */
let home: Place | null = null;
const listeners = new Set<() => void>();

export function getHome(): Place | null {
  return home;
}

export function setHome(place: Place | null) {
  home = place;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHome(): Place | null {
  return useSyncExternalStore(subscribe, getHome, () => null);
}
