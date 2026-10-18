import type { Nutrients } from "@/lib/nutrition";

const grams = (value: number) =>
  value >= 10 ? Math.round(value).toLocaleString("en-GB") : value.toFixed(1);

function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border-2 border-[var(--ink)] bg-white px-2.5 py-1.5">
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="text-base font-extrabold leading-tight">
        {value}
        <span className="ml-0.5 text-[11px] font-bold text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

/** What a basket contains: energy, macros, sugars and salt. */
export default function NutritionPanel({ nutrition }: { nutrition: Nutrients }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile label="kcal" value={Math.round(nutrition.kcal).toLocaleString("en-GB")} unit="" />
      <Tile label="Protein" value={grams(nutrition.protein)} unit="g" />
      <Tile label="Fat" value={grams(nutrition.fat)} unit="g" />
      <Tile label="Carbs" value={grams(nutrition.carbs)} unit="g" />
      <Tile label="Sugar" value={grams(nutrition.sugar)} unit="g" />
      <Tile label="Salt" value={grams(nutrition.salt)} unit="g" />
    </div>
  );
}
