"use client";

import ShopLogo from "@/components/ShopLogo";
import { formatEuro } from "@/lib/pricing";
import type { Store } from "@/lib/geo";
import type { Option, TradeOff } from "@/lib/tradeoff";

type Props = {
  options: Option[];
  analysis: TradeOff | null;
  selectedStoreId: string | null;
  onSelect: (store: Store) => void;
  /** Whether the times already include the walk on to the person's home. */
  hasHome: boolean;
};

/**
 * Each shop that can price the basket, what it costs and how long it takes, and
 * what the extra money buys when the cheaper shop is not the closer one.
 */
export default function WhereToBuy({
  options,
  analysis,
  selectedStoreId,
  onSelect,
  hasHome,
}: Props) {
  const sorted = [...options].sort(
    (a, b) => a.cost - b.cost || a.minutes - b.minutes,
  );
  const several = sorted.length > 1;

  return (
    <div>
      <ul className="mt-2 space-y-1.5">
        {sorted.map((option) => {
          const cheapest = several && option.chain === analysis?.cheapest.chain;
          const fastest = several && option.chain === analysis?.fastest.chain;
          const selected = option.store.id === selectedStoreId;

          return (
            <li key={option.store.id}>
              <button
                type="button"
                onClick={() => onSelect(option.store)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left hover:border-emerald-600 ${
                  selected
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <ShopLogo shop={option.chain} height={20} />
                    {cheapest && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        Cheapest
                      </span>
                    )}
                    {fastest && (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                        Quickest
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {option.minutes} min {hasHome ? "campus, shop, home" : "walk from IE Tower"}
                    {option.store.street ? ` · ${option.store.street}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold">
                  {formatEuro(option.cost)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {analysis && several && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
          <p className="font-semibold text-slate-900">Cost against time</p>

          {analysis.steps.length === 0 ? (
            <p className="mt-1">
              {analysis.cheapest.chain} is both the cheapest and the quickest, so there is
              nothing to trade off.
            </p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {analysis.steps.map((step) => (
                <li key={`${step.from.chain}-${step.to.chain}`}>
                  Choosing <strong>{step.to.chain}</strong> over{" "}
                  <strong>{step.from.chain}</strong> costs{" "}
                  <strong>{formatEuro(step.extraCost)}</strong> more and saves{" "}
                  <strong>{step.savedMinutes} min</strong>, so you pay{" "}
                  <strong>{formatEuro(step.perMinute)}</strong> for each minute saved
                  <span className="text-slate-500">
                    {" "}
                    ({formatEuro(step.perMinute * 60)} an hour)
                  </span>
                  .
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-[11px] text-slate-500">
            {hasHome
              ? "Times are the walk from IE Tower to the shop and on to your home."
              : "Times are the walk from IE Tower to the shop. Add your home below a shop to include the way home."}{" "}
            Estimates from straight-line distance.
          </p>
        </div>
      )}
    </div>
  );
}
