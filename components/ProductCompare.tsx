import ShopLogo from "@/components/ShopLogo";
import type { CatalogueEntry } from "@/lib/catalogue";
import { per100For, type Nutrients } from "@/lib/nutrition";
import { formatUnitPrice } from "@/lib/pricing";

const ROWS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: "kcal", label: "kcal", unit: "" },
  { key: "protein", label: "Protein", unit: " g" },
  { key: "fat", label: "Fat", unit: " g" },
  { key: "carbs", label: "Carbs", unit: " g" },
  { key: "sugar", label: "Sugar", unit: " g" },
  { key: "salt", label: "Salt", unit: " g" },
];

const VISIBLE_SHOPS = 3;

const show = (value: number, key: keyof Nutrients) =>
  key === "kcal" ? `${Math.round(value)}` : value >= 10 ? `${Math.round(value)}` : `${+value.toFixed(2)}`;

function Table({ entry, shops }: { entry: CatalogueEntry; shops: string[] }) {
  const per = shops.map((shop) => ({
    shop,
    offer: entry.offers[shop],
    data: per100For(entry, entry.offers[shop]),
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[260px] text-left text-sm">
        <thead>
          <tr>
            <th className="w-16" />
            {per.map(({ shop, offer, data }) => (
              <th key={shop} className="px-2 pb-2 align-top">
                <ShopLogo shop={shop} height={16} />
                <span className="mt-1 block text-[11px] font-bold leading-tight text-slate-500">
                  {formatUnitPrice(offer, entry)}
                </span>
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  {data?.source === "label" ? "label" : "typical"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const values = per.map(({ data }) => data?.values[row.key] ?? null);
            const known = values.filter((v): v is number => v !== null);
            const differs = known.length > 1 && Math.max(...known) - Math.min(...known) > 0.001;
            return (
              <tr key={row.key} className="border-t-2 border-[var(--ink)]/15">
                <th className="py-1.5 pr-2 text-xs font-extrabold uppercase text-slate-500">
                  {row.label}
                </th>
                {values.map((value, index) => (
                  <td
                    key={per[index].shop}
                    className={`px-2 py-1.5 font-extrabold ${differs ? "" : "text-slate-500"}`}
                  >
                    {value === null ? "–" : `${show(value, row.key)}${row.unit}`}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The same product, shop by shop: what each shop's version holds per 100 g or
 * 100 ml. Three shops show at once; the rest open on request, because the list
 * of shops will only grow.
 */
export default function ProductCompare({ entry }: { entry: CatalogueEntry }) {
  const shops = Object.keys(entry.offers).sort(
    (a, b) => entry.offers[a].unit_price - entry.offers[b].unit_price,
  );
  const first = shops.slice(0, VISIBLE_SHOPS);
  const rest = shops.slice(VISIBLE_SHOPS);
  const per = entry.basis.unit === "ml" ? "100 ml" : "100 g";

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-500">
        Per {per}{entry.basis.unit === "ud" ? " of the food" : ""}
      </p>
      <Table entry={entry} shops={first} />
      {rest.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-extrabold">
            All {shops.length} shops
          </summary>
          <div className="mt-2">
            <Table entry={entry} shops={shops} />
          </div>
        </details>
      )}
    </div>
  );
}
