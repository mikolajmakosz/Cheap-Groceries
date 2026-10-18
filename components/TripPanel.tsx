"use client";

import ShopLogo from "@/components/ShopLogo";
import type { Store } from "@/lib/geo";
import {
  bestFromHome,
  fromHomeMinutes,
  legMinutes,
  onTheWayMinutes,
  shopTripMinutes,
  type LegMode,
  type TripSettings,
} from "@/lib/trip";
import type { Route } from "@/lib/walking";

const BY: Record<LegMode, string> = { walk: "walk", bus: "bus", metro: "Metro", train: "train" };

type Props = {
  store: Store;
  trip: TripSettings;
  loading: boolean;
  onClose: () => void;
  /** Estimated minutes spent inside the shop. */
  shopMinutes?: number;
  /** The drawn legs, used only to say whether a router or an estimate drew them. */
  toStore?: Route | null;
};

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "border-t-2 border-[var(--ink)] pt-1.5" : ""}`}>
      <dt className="text-slate-700">{label}</dt>
      <dd className={strong ? "font-extrabold" : "font-bold"}>{value}</dd>
    </div>
  );
}

/**
 * What the chosen shop costs you in time, for the trip as set: on your way
 * home from your anchor (only the detour counts) or from home (there and back).
 */
export default function TripPanel({ store, trip, loading, onClose, shopMinutes = 0 }: Props) {
  const fromAnchor = trip.start === "anchor";
  const first = legMinutes(fromAnchor || !trip.home ? trip.anchor : trip.home, store, trip.transport);
  const onward = fromAnchor && trip.home ? legMinutes(store, trip.home, trip.transport) : null;
  const direct = fromAnchor && trip.home ? legMinutes(trip.anchor, trip.home, trip.transport) : null;
  const cost = shopTripMinutes(store, trip);
  const home = fromHomeMinutes(store, trip);
  const onTheWay = trip.home ? onTheWayMinutes(store, trip) : null;
  // From home you would go to the nearest shop of this chain, not this one.
  const homeBest = bestFromHome(store.chain, trip);

  return (
    <section className="mt-4 rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--y1)] p-3" aria-label="Your trip to this shop">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ShopLogo shop={store.chain} height={22} />
          <span className="min-w-0 truncate text-xs text-slate-700">{store.street ?? store.name}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the trip" className="shrink-0 rounded-md px-1.5 text-lg leading-none text-slate-500 hover:bg-white/60">
          ×
        </button>
      </div>

      {loading && <p className="mt-2 text-xs text-slate-500">…</p>}

      <dl className="mt-3 space-y-1.5 text-sm">
        {fromAnchor || !trip.home ? (
          <>
            <Row label={`${trip.anchor.label} → shop`} value={`${first.minutes} min · ${BY[first.by]}`} />
            {onward && direct && (
              <>
                <Row label="Shop → home" value={`${onward.minutes} min · ${BY[onward.by]}`} />
                <Row label="Straight home would be" value={`${direct.minutes} min`} />
              </>
            )}
          </>
        ) : (
          <Row label="Home → shop → home" value={`${home} min · ${BY[first.by]}`} />
        )}
        {shopMinutes > 0 && <Row label="In the shop" value={`${shopMinutes} min`} />}
        <Row
          label={fromAnchor && trip.home ? "It costs you" : "Your time"}
          value={`${cost + shopMinutes} min`}
          strong
        />
      </dl>

      {fromAnchor && homeBest && onTheWay !== null && (
        <p className="mt-2 text-xs font-bold">
          From home to the nearest {store.chain} and back: {homeBest.minutes + shopMinutes} min.{" "}
          {homeBest.minutes > onTheWay
            ? `On the way you save ${homeBest.minutes - onTheWay} min.`
            : `Going from home is ${onTheWay - homeBest.minutes} min quicker.`}
        </p>
      )}
      {!trip.home && (
        <p className="mt-2 text-xs text-slate-600">Add your home above to count only the detour.</p>
      )}
    </section>
  );
}
