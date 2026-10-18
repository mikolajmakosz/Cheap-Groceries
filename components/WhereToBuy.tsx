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
 * Each shop that can price the basket, what it costs and how long the walk is,
 * and what the extra money buys when the cheaper shop is not the closer one.
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
      <ul className="space-y-2">
        {sorted.map((option) => {
          const cheapest = several && option.chain === analysis?.cheapest.chain;
          const fastest = several && option.chain === analysis?.fastest.chain;
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
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {option.minutes} min{hasHome ? " via shop" : ""}
                    {option.store.street ? ` · ${option.store.street}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-base font-extrabold">
                  {formatEuro(option.cost)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {analysis && several && analysis.steps.length > 0 && (
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
