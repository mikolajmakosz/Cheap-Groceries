"use client";

import { useState, type FormEvent } from "react";
import ShopLogo from "@/components/ShopLogo";
import { CAMPUS, estimateWalk, type Store } from "@/lib/geo";
import { geocodeMadrid, type Place } from "@/lib/geocode";
import type { Route } from "@/lib/walking";

function distance(metres: number): string {
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
}

type Props = {
  store: Store;
  toStore: Route | null;
  toHome: Route | null;
  home: Place | null;
  loading: boolean;
  onHome: (place: Place | null) => void;
  onClose: () => void;
  /** Hide the home-address step, for places that have no basket to weigh. */
  showHome?: boolean;
};

/**
 * What the walk to the chosen shop looks like, and what it adds if you then go
 * home. The address is optional: nothing here is needed to use the app.
 */
export default function TripPanel({
  store,
  toStore,
  toHome,
  home,
  loading,
  onHome,
  onClose,
  showHome = true,
}: Props) {
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);

    const place = await geocodeMadrid(address);
    setSearching(false);

    if (!place) {
      setError("Could not find that address in Madrid. Try the street and number.");
      return;
    }
    onHome(place);
  }

  const direct = home ? estimateWalk(CAMPUS, home) : null;
  const total =
    toStore && toHome ? { minutes: toStore.minutes + toHome.minutes, metres: toStore.metres + toHome.metres } : null;
  const detour = total && direct ? total.minutes - direct.minutes : null;
  const estimated = toStore?.source === "estimate" || toHome?.source === "estimate";

  return (
    <section
      className="mt-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/40 p-3"
      aria-label="Your walk"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ShopLogo shop={store.chain} height={22} />
          <span className="min-w-0 truncate text-xs text-slate-600">
            {store.street ?? store.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the walk"
          className="shrink-0 rounded-md px-1.5 text-lg leading-none text-slate-500 hover:bg-white"
        >
          ×
        </button>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-slate-600">
            <span className="mr-1.5 inline-block h-1.5 w-4 rounded bg-emerald-600 align-middle" />
            IE Tower to shop
          </dt>
          <dd className="font-semibold">
            {loading && !toStore
              ? "Finding the route…"
              : toStore
                ? `${toStore.minutes} min · ${distance(toStore.metres)}`
                : "—"}
          </dd>
        </div>

        {home && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-slate-600">
              <span className="mr-1.5 inline-block h-1.5 w-4 rounded border-b-2 border-dotted border-blue-600 align-middle" />
              Shop to home
            </dt>
            <dd className="font-semibold">
              {loading && !toHome
                ? "Finding the route…"
                : toHome
                  ? `${toHome.minutes} min · ${distance(toHome.metres)}`
                  : "—"}
            </dd>
          </div>
        )}

        {total && detour !== null && (
          <div className="flex items-baseline justify-between gap-3 border-t border-emerald-200 pt-1.5">
            <dt className="text-slate-600">Campus, shop, home</dt>
            <dd className="font-bold">
              {total.minutes} min
              <span className="ml-1.5 text-xs font-medium text-slate-500">
                {detour <= 0
                  ? "no longer than going straight home"
                  : `${detour} min more than going straight home`}
              </span>
            </dd>
          </div>
        )}
      </dl>

      {estimated && (
        <p className="mt-2 text-[11px] text-slate-500">
          The route service did not answer, so these times are estimates from straight-line
          distance.
        </p>
      )}

      {showHome &&
        (home ? (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span className="min-w-0 truncate">Home: {home.label}</span>
            <button
              type="button"
              onClick={() => onHome(null)}
              className="shrink-0 font-medium text-slate-700 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3">
            <label htmlFor="home-address" className="block text-xs font-medium text-slate-700">
              And from there to your home?
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="home-address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Calle General Pintos 20"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={searching || address.trim().length < 3}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {searching ? "…" : "Show"}
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                {error}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">
              The address is sent to OpenStreetMap to be located. We do not store it, and it is
              forgotten when you reload.
            </p>
          </form>
        ))}
    </section>
  );
}
