"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import StoreMap from "@/components/StoreMap";
import {
  compareBasket,
  formatEuro,
  type BasketItem,
  type Product,
} from "@/lib/pricing";

export default function BasketPage() {
  const router = useRouter();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();

    // A session can expire while the cookie is still around. Without this the
    // page renders an empty basket and every save hangs on "Adding…" forever.
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    const [basket, catalogue] = await Promise.all([
      supabase
        .from("basket_items")
        .select("id, name, quantity, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("products").select("*"),
    ]);

    if (basket.error) setError(basket.error.message);
    setItems((basket.data as BasketItem[]) ?? []);
    setProducts((catalogue.data as Product[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Any text is accepted. A product the catalogue does not know is still
    // saved and still listed — it simply shows no price.
    const name = draft.trim();
    if (!name) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("basket_items")
      .insert({ name });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setDraft("");
    await load();
    setSaving(false);
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("basket_items").delete().eq("id", id);
    await load();
  }

  const comparison = compareBasket(items, products);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Your basket</h1>
      <p className="mt-1 text-sm text-slate-600">
        Add what you plan to buy this week. Plain words work best —
        &ldquo;pollo&rdquo;, &ldquo;leche entera&rdquo;, &ldquo;arroz&rdquo;.
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          id="core-input"
          data-testid="core-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What do you need?"
          aria-label="Product to add to your basket"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-emerald-600"
        />
        <button
          type="submit"
          data-testid="core-submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add to basket"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading your basket…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Your basket is empty. Add your first product above.
        </p>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {comparison.pricing.map((entry) => {
              const prices = comparison.stores
                .map((store) => ({ store, product: entry.byStore[store] }))
                .filter((row) => row.product !== null);

              return (
                <li
                  key={entry.item.id}
                  data-testid="core-item"
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-words">
                      {entry.item.name}
                    </p>
                    {prices.length > 0 ? (
                      <p className="mt-0.5 text-sm text-slate-600">
                        {prices
                          .map(
                            (row) =>
                              `${row.store} ${formatEuro(row.product!.price_eur)}`,
                          )
                          .join(" · ")}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-slate-400">
                        No price in the catalogue yet
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.item.id)}
                    aria-label={`Remove ${entry.item.name}`}
                    className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="mt-8 rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold">What this basket costs</h2>

            {comparison.comparableCount > 0 && !comparison.allPricesVerified && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Some of these prices have not been checked in store yet. Treat
                the totals as an estimate until they are.
              </p>
            )}

            {comparison.comparableCount === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                None of your products are in the price catalogue yet, so there
                is nothing to compare. They are still saved in your basket.
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {comparison.totals.map((total) => {
                    const cheapest = total.store === comparison.cheapestStore;
                    return (
                      <li
                        key={total.store}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          cheapest
                            ? "bg-emerald-50 font-semibold text-emerald-900"
                            : "text-slate-700"
                        }`}
                      >
                        <span>
                          {total.store}
                          {cheapest && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                              cheapest
                            </span>
                          )}
                        </span>
                        <span>{formatEuro(total.total)}</span>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-4 text-xs text-slate-500">
                  Based on {comparison.comparableCount} of {items.length}{" "}
                  products
                  {comparison.stores.length > 1
                    ? " — only the ones every supermarket can price, so the comparison is fair."
                    : " this shop can price."}
                  {comparison.pricesCheckedOn &&
                    ` Prices collected on ${comparison.pricesCheckedOn}.`}
                </p>
                {comparison.stores.length === 1 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Only {comparison.stores[0]} is in the catalogue so far, so
                    there is nothing to compare against yet.
                  </p>
                )}
              </>
            )}

            {comparison.comparableCount > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold">Where to buy it</h3>
                <p className="mb-3 mt-1 text-xs text-slate-500">
                  Walking from IE Tower. Green shops are the ones we can price.
                </p>
                <StoreMap
                  costByChain={Object.fromEntries(
                    comparison.totals.map((total) => [
                      total.store,
                      formatEuro(total.total),
                    ]),
                  )}
                  pricedChains={comparison.stores}
                  heightClass="h-72"
                />
              </div>
            )}

            {comparison.unpriced.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Not included:{" "}
                {comparison.unpriced
                  .map((entry) => entry.item.name)
                  .join(", ")}
                .
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
