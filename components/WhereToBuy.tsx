"use client";

import { useState } from "react";
import ShopLogo from "@/components/ShopLogo";
import { deliveryFee, perHourSaved } from "@/lib/delivery";
import type { Store } from "@/lib/geo";
import type { TripSettings } from "@/lib/trip";
import { formatEuro } from "@/lib/pricing";
import type { Option, TradeOff } from "@/lib/tradeoff";

type Props = {
  options: Option[];
  analysis: TradeOff | null;
  selectedStoreId: string | null;
  onSelect: (store: Store) => void;
  trip: TripSettings;
  /** Minutes spent inside a shop for this basket. */
  shopMinutes: number;
};

/**
 * Each shop that can price the basket, either carried home yourself or
 * delivered. Carrying it: what it costs, the walk, and what the extra money buys
 * when the cheaper shop is not the closer one. Delivery: the basket plus the
 * delivery charge, and what each hour of your own time saved really costs.
 */
export default function WhereToBuy({
  options,
  analysis,
  selectedStoreId,
  onSelect,
  trip,
  shopMinutes,
}: Props) {
  const home = trip.home;
  const [delivery, setDelivery] = useState(false);

  const rows = options.map((option) => {
    const fee = deliveryFee(option.chain, option.cost);
    // Delivery gives back what the trip costs you (the detour on your way home,
    // or the trip from home) plus the time inside the shop.
    const saved = option.minutes + shopMinutes;
    return { option, fee, saved, perHour: home ? perHourSaved(fee, saved) : null };
  });

  const sorted = [...rows].sort((a, b) =>
    delivery
      ? a.option.cost + a.fee - (b.option.cost + b.fee)
      : a.option.cost - b.option.cost || a.option.minutes - b.option.minutes,
  );
  const several = sorted.length > 1;
  const cheapestChain = delivery ? sorted[0]?.option.chain : analysis?.cheapest.chain;

  return (
    <div>
      <div role="group" aria-label="How you get it" className="mb-2 flex gap-1.5">
        {[
          { id: false, label: "I go" },
          { id: true, label: "Delivery" },
        ].map((mode) => (
          <button
            key={mode.label}
            type="button"
            aria-pressed={delivery === mode.id}
            onClick={() => setDelivery(mode.id)}
            className={`rounded-xl border-2 border-[var(--ink)] px-3 py-1 text-xs font-extrabold ${
              delivery === mode.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {sorted.map(({ option, fee, saved, perHour }) => {
          const cheapest = several && option.chain === cheapestChain;
          const fastest = !delivery && several && option.chain === analysis?.fastest.chain;
          const selected = option.store.id === selectedStoreId;

          return (
            <li key={option.store.id}>
              <button
                type="button"
                onClick={() => onSelect(option.store)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 border-[var(--ink)] px-3 py-2 text-left ${
                  selected ? "bg-[var(--y1)] shadow-[3px_3px_0_var(--ink)]" : "bg-white"
                }`}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <ShopLogo shop={option.chain} height={20} />
                    {cheapest && (
                      <span className="rounded-md bg-[var(--ink)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[var(--paper)]">
                        Cheapest
                      </span>
                    )}
                    {fastest && (
                      <span className="rounded-md bg-[var(--blue-soft)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                        Quickest
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {delivery ? (
                      <>
                        {formatEuro(option.cost)} basket{" "}
                        {fee > 0 ? `+ ${formatEuro(fee)} delivery` : "· free delivery"}
                        {home && perHour !== null && fee > 0 && (
                          <>
                            {" · "}
                            <strong className="text-[var(--ink)]">
                              {formatEuro(perHour)} per hour saved
                            </strong>{" "}
                            ({saved} min)
                          </>
                        )}
                        {home && fee === 0 && ` · saves ${saved} min`}
                        {!home && " · add your home to see the cost per hour saved"}
                      </>
                    ) : (
                      <>
                        {trip.start === "home" && home
                          ? `${option.minutes} min there and back`
                          : home
                            ? `+${option.minutes} min on your way home`
                            : `${option.minutes} min from ${trip.anchor.label}`}
                        {option.store.street ? ` · ${option.store.street}` : ""}
                      </>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-base font-extrabold">
                  {formatEuro(delivery ? option.cost + fee : option.cost)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!delivery && analysis && several && analysis.steps.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {analysis.steps.map((step) => (
            <li key={`${step.from.chain}-${step.to.chain}`}>
              <strong>{step.to.chain}</strong> over <strong>{step.from.chain}</strong>:{" "}
              +{formatEuro(step.extraCost)}, −{step.savedMinutes} min ={" "}
              <strong>{formatEuro(step.perMinute)}/min</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
