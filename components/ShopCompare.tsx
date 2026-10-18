import ShopLogo from "@/components/ShopLogo";
import { formatEuro } from "@/lib/pricing";
import type { Nutrients } from "@/lib/nutrition";

export type ShopRow = {
  store: string;
  /** What the basket costs there. */
  total: number;
  nutrition: Nutrients;
  per100kcal: number | null;
  perGramProtein: number | null;
};

const g = (value: number) => (value >= 10 ? `${Math.round(value)}` : value.toFixed(1));
const eur = (value: number | null) => (value === null ? "–" : formatEuro(value));

/**
 * Every shop's basket side by side: price, nutrition and what a kcal or a gram
 * of protein costs there. A click on a row picks the shop.
 */
export default function ShopCompare({
  rows,
  selected,
  onSelect,
}: {
  rows: ShopRow[];
  selected?: string | null;
  onSelect?: (store: string) => void;
}) {
  const cheapest = Math.min(...rows.map((row) => row.total));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-y-1.5 text-left text-xs">
        <thead>
          <tr className="text-[10px] font-bold uppercase text-slate-500">
            <th className="px-2 font-bold">Shop</th>
            <th className="px-1 font-bold">€</th>
            <th className="px-1 font-bold">kcal</th>
            <th className="px-1 font-bold">Prot</th>
            <th className="px-1 font-bold">Fat</th>
            <th className="px-1 font-bold">Carb</th>
            <th className="px-1 font-bold">Sugar</th>
            <th className="px-1 font-bold">Salt</th>
            <th className="px-1 font-bold">€/100 kcal</th>
            <th className="px-1 font-bold">€/g prot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const on = row.store === selected;
            return (
              <tr
                key={row.store}
                onClick={() => onSelect?.(row.store)}
                className={`cursor-pointer font-bold ${on ? "bg-[var(--y1)]" : "bg-white"} [&>td]:border-y-2 [&>td]:border-[var(--ink)] [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l-2 [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r-2`}
              >
                <td className="px-2 py-1.5">
                  <ShopLogo shop={row.store} height={16} />
                </td>
                <td className="px-1">
                  {formatEuro(row.total)}
                  {row.total === cheapest && rows.length > 1 && (
                    <span className="ml-1 text-[9px]">★</span>
                  )}
                </td>
                <td className="px-1">{Math.round(row.nutrition.kcal)}</td>
                <td className="px-1">{g(row.nutrition.protein)}</td>
                <td className="px-1">{g(row.nutrition.fat)}</td>
                <td className="px-1">{g(row.nutrition.carbs)}</td>
                <td className="px-1">{g(row.nutrition.sugar)}</td>
                <td className="px-1">{g(row.nutrition.salt)}</td>
                <td className="px-1">{eur(row.per100kcal)}</td>
                <td className="px-1">{eur(row.perGramProtein)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
