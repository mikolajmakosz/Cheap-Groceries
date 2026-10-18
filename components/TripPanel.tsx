"use client";

import AddressSearch from "@/components/AddressSearch";
import ShopLogo from "@/components/ShopLogo";
import { CAMPUS, estimateWalk, type Store } from "@/lib/geo";
import type { Place } from "@/lib/geocode";
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
  /** Estimated minutes spent inside the shop. */
  shopMinutes?: number;
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
  shopMinutes = 0,
}: Props) {
  const direct = home ? estimateWalk(CAMPUS, home) : null;
  const total =
    toStore && toHome ? { minutes: toStore.minutes + toHome.minutes, metres: toStore.metres + toHome.metres } : null;
  const detour = total && direct ? total.minutes - direct.minutes : null;
  const estimated = toStore?.source === "estimate" || toHome?.source === "estimate";

  return (
    <section
      className="mt-4 rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--y1)] p-3"
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
          className="shrink-0 rounded-md px-1.5 text-lg leading-none text-slate-500 hover:bg-white/60"
        >
          ×
        </button>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-slate-700">
            <span className="mr-1.5 inline-block h-1.5 w-4 rounded bg-[var(--ink)] align-middle" />
            Campus → shop
          </dt>
          <dd className="font-semibold">
            {loading && !toStore
              ? "…"
              : toStore
                ? `${toStore.minutes} min · ${distance(toStore.metres)}`
                : "—"}
          </dd>
        </div>

        {home && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-slate-700">
              <span className="mr-1.5 inline-block h-1.5 w-4 rounded border-b-2 border-dotted border-[var(--blue)] align-middle" />
              Shop → home
            </dt>
            <dd className="font-semibold">
              {loading && !toHome
                ? "…"
                : toHome
                  ? `${toHome.minutes} min · ${distance(toHome.metres)}`
                  : "—"}
            </dd>
          </div>
        )}

        {shopMinutes > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-slate-700">In the shop</dt>
            <dd className="font-semibold">{shopMinutes} min</dd>
          </div>
        )}

        {total && detour !== null && (
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-[var(--ink)] pt-1.5">
            <dt className="text-slate-700">Total</dt>
            <dd className="font-bold">
              {total.minutes} min
              <span className="ml-1.5 text-xs font-medium text-slate-500">
                {detour <= 0 ? "" : `+${detour} vs straight home`}
              </span>
            </dd>
          </div>
        )}
      </dl>

      {estimated && (
        <p className="mt-2 text-[11px] text-slate-500">
          Estimated times (route service offline).
        </p>
      )}

      {showHome &&
        (home ? (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span className="min-w-0 truncate">Home: {home.label}</span>
            <button
              type="button"
              onClick={() => onHome(null)}
              className="shrink-0 font-bold underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <AddressSearch onPlace={onHome} />
        ))}
    </section>
  );
}
