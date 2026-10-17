import { SALT_LIMIT_G, SUGAR_GUIDE_G, type Nutrients } from "@/lib/nutrition";

const grams = (value: number) =>
  value >= 10 ? Math.round(value).toLocaleString("en-GB") : value.toFixed(1);

function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900">
        {value}
        <span className="ml-0.5 text-[11px] font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

function Guide({
  label,
  value,
  limit,
  limitText,
}: {
  label: string;
  value: number;
  limit: number;
  limitText: string;
}) {
  const share = value / limit;
  const over = share > 1;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={`font-bold ${over ? "text-amber-700" : "text-slate-900"}`}>
          {grams(value)} g
          <span className="ml-1 font-normal text-slate-500">of {limitText}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200">
        <div
          className={`h-full rounded ${over ? "bg-amber-500" : "bg-emerald-600"}`}
          style={{ width: `${Math.min(100, share * 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * What a basket contains. With `guides`, salt and sugar are set against the
 * amounts the WHO suggests for a day, which only makes sense for a daily figure.
 */
export default function NutritionPanel({
  nutrition,
  guides = false,
}: {
  nutrition: Nutrients;
  guides?: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Energy" value={Math.round(nutrition.kcal).toLocaleString("en-GB")} unit="kcal" />
        <Tile label="Protein" value={grams(nutrition.protein)} unit="g" />
        <Tile label="Fat" value={grams(nutrition.fat)} unit="g" />
        <Tile label="Carbs" value={grams(nutrition.carbs)} unit="g" />
      </div>

      {guides ? (
        <div className="mt-3 space-y-2.5">
          <Guide label="Salt" value={nutrition.salt} limit={SALT_LIMIT_G} limitText={`${SALT_LIMIT_G} g (WHO)`} />
          <Guide
            label="Sugars"
            value={nutrition.sugar}
            limit={SUGAR_GUIDE_G}
            limitText={`${SUGAR_GUIDE_G} g (WHO, free sugars)`}
          />
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Tile label="Sugars" value={grams(nutrition.sugar)} unit="g" />
          <Tile label="Salt" value={grams(nutrition.salt)} unit="g" />
        </div>
      )}

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Typical values for each kind of food, not read off the pack of the product a shop sells,
        and what is eaten (peel, core and shell left out). Sugars are total sugars, natural ones
        included. A guide, not dietary advice.
      </p>
    </div>
  );
}
