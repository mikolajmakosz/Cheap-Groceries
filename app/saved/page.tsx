"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NutritionPanel from "@/components/NutritionPanel";
import ShopLogo from "@/components/ShopLogo";
import { createClient } from "@/lib/supabase/client";
import { formatEuro, formatQuantity, type BasketItem } from "@/lib/pricing";
import { frequencyLabel, planBasket } from "@/lib/plan";

type SavedItem = { id: string; name: string; quantity: number; created_at: string };

type SavedBasket = {
  id: string;
  name: string;
  days: number;
  created_at: string;
  saved_basket_items: SavedItem[];
};

const MAX_DAYS = 30;

function BasketCard({
  basket,
  onDelete,
  onAdd,
  onDays,
}: {
  basket: SavedBasket;
  onDelete: (id: string) => Promise<void>;
  onAdd: (basket: SavedBasket) => Promise<void>;
  onDays: (id: string, days: number) => void;
}) {
  const [days, setDays] = useState(basket.days);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const items = useMemo<BasketItem[]>(
    () =>
      basket.saved_basket_items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        created_at: item.created_at,
      })),
    [basket.saved_basket_items],
  );

  const plan = useMemo(() => planBasket(items, days), [items, days]);
  const cheapest = plan.totals.length
    ? plan.totals.reduce((best, row) => (row.perDay < best.perDay ? row : best))
    : null;
  const priced = plan.lines.some((line) => line.row.comparable);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{basket.name}</h2>
          <p className="text-xs text-slate-500">
            {items.length} {items.length === 1 ? "product" : "products"} · saved{" "}
            {new Date(basket.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onAdd(basket);
              setBusy(false);
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Add to my basket
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onDelete(basket.id);
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Yes, delete it
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </header>

      <div className="mt-5">
        <label htmlFor={`days-${basket.id}`} className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">How long does it have to last?</span>
          <span className="font-bold text-emerald-700">
            {days} {days === 1 ? "day" : "days"}
          </span>
        </label>
        <input
          id={`days-${basket.id}`}
          type="range"
          min={1}
          max={MAX_DAYS}
          value={days}
          onChange={(event) => {
            const next = Number(event.target.value);
            setDays(next);
            onDays(basket.id, next);
          }}
          className="mt-2 w-full accent-emerald-600"
        />
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>1</span>
          <span>7</span>
          <span>14</span>
          <span>30</span>
        </div>
      </div>

      {priced ? (
        <section className="mt-4" aria-label="What it costs per day">
          <h3 className="text-sm font-semibold">What it costs a day</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {plan.totals.map((row) => (
              <li
                key={row.store}
                className={`rounded-xl border px-3 py-2.5 ${
                  cheapest && row.store === cheapest.store && plan.totals.length > 1
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200"
                }`}
              >
                <ShopLogo shop={row.store} height={18} />
                <p className="mt-1.5 text-xl font-bold">
                  {formatEuro(row.perDay)}
                  <span className="ml-1 text-xs font-medium text-slate-500">a day</span>
                </p>
                <p className="text-xs text-slate-500">{formatEuro(row.total)} for the shop</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Each product is charged over the days it lasts, so a bottle of oil that lasts a month is
            not charged as if it were gone in a week. Only products every shop can price are counted.
          </p>
        </section>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          None of the products in this basket are in the price catalogue yet, so there is no cost to
          work out.
        </p>
      )}

      <section className="mt-5" aria-label="Nutrition per day">
        <h3 className="text-sm font-semibold">What you eat a day, on average</h3>
        <div className="mt-2">
          <NutritionPanel nutrition={plan.nutritionPerDay} guides />
        </div>
      </section>

      <section className="mt-5" aria-label="Products">
        <h3 className="text-sm font-semibold">Products and how long they last</h3>
        <ul className="mt-2 divide-y divide-slate-100">
          {plan.lines.map((line) => {
            const entry = line.row.entry;
            const perServing = entry ? line.lastsDays / line.row.item.quantity : 0;
            return (
              <li key={line.row.item.id} className="py-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{line.row.item.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {entry ? formatQuantity(line.row.item.quantity, entry) : "not in the catalogue"}
                  </span>
                </div>

                {entry && line.outlastsPlan && (
                  <p className="mt-1 rounded-md bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900">
                    This lasts you about {Math.round(line.lastsDays)} days, so you buy it{" "}
                    <strong>{frequencyLabel(line.lastsDays)}</strong>. Only{" "}
                    {Math.round(line.shareInPlan * 100)}% of it counts towards these {days} days.
                  </p>
                )}

                {entry && line.fallsShort && (
                  <p className="mt-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                    This covers about {Math.round(line.lastsDays)} of your {days} days. You would
                    need about {Math.ceil(days / perServing)} of them to cover every day.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}

export default function SavedBasketsPage() {
  const router = useRouter();
  const [baskets, setBaskets] = useState<SavedBasket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    const { data, error: loadError } = await supabase
      .from("saved_baskets")
      .select("id, name, days, created_at, saved_basket_items(id, name, quantity, created_at)")
      .order("created_at", { ascending: false });

    if (loadError) setError(loadError.message);
    setBaskets((data as SavedBasket[] | null) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Loading from the server on arrival; the state it sets arrives after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  /** Saves the chosen number of days once the slider stops moving. */
  function handleDays(id: string, days: number) {
    const pending = timers.current;
    clearTimeout(pending.get(id));
    pending.set(
      id,
      setTimeout(async () => {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("saved_baskets")
          .update({ days })
          .eq("id", id);
        if (updateError) setError(updateError.message);
      }, 500),
    );
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("saved_baskets").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    await load();
  }

  /** Adds, never replaces: nothing already in the basket is lost. */
  async function handleAdd(basket: SavedBasket) {
    const supabase = createClient();
    const { error: insertError } = await supabase.from("basket_items").insert(
      basket.saved_basket_items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
    );
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/app");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Saved baskets</h1>
        <Link href="/app" className="text-sm font-medium text-emerald-700 underline">
          Back to the map
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Say how many days a basket has to last, and see what it costs and what you eat each day.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading your saved baskets…</p>
      ) : baskets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-600">
            You have not saved a basket yet. Build one on the map and press{" "}
            <strong>Save this basket</strong>.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Build a basket
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {baskets.map((basket) => (
            <BasketCard
              key={basket.id}
              basket={basket}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onDays={handleDays}
            />
          ))}
        </div>
      )}
    </main>
  );
}
