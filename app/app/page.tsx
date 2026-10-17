"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProductImage from "@/components/ProductImage";
import ProductSearch from "@/components/ProductSearch";
import StoreMap from "@/components/StoreMap";
import { CATALOGUE_STORES, type CatalogueEntry } from "@/lib/catalogue";
import { CAMPUS, formatWalk, nearestPerChain } from "@/lib/geo";
import {
  compareBasket,
  formatEuro,
  formatSize,
  type BasketItem,
} from "@/lib/pricing";

/** Width of the floating panel on a desktop screen, plus its margin. */
const PANEL_INSET_PX = 400;

export default function BasketPage() {
  const router = useRouter();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusStoreId, setFocusStoreId] = useState<string | null>(null);
  const [leftInset, setLeftInset] = useState(0);

  // On a phone the panel sits above the map rather than beside it.
  useEffect(() => {
    const update = () =>
      setLeftInset(window.innerWidth >= 768 ? PANEL_INSET_PX : 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();

    // A session can expire while the cookie is still around. Without this the
    // page renders an empty basket and every save hangs on "Adding…" forever.
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    const basket = await supabase
      .from("basket_items")
      .select("id, name, quantity, created_at")
      .order("created_at", { ascending: false });

    if (basket.error) setError(basket.error.message);
    setItems((basket.data as BasketItem[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Loading from the server on arrival; the state it sets arrives after the
    // await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /**
   * Any text is accepted. A product the catalogue does not know is still saved
   * and still listed, it simply shows no price.
   */
  async function add(text: string) {
    const name = text.trim();
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

  function handlePick(entry: CatalogueEntry) {
    void add(entry.label);
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("basket_items").delete().eq("id", id);
    await load();
  }

  const comparison = useMemo(() => compareBasket(items), [items]);

  const costByChain = useMemo(
    () =>
      Object.fromEntries(
        comparison.totals.map((total) => [total.store, formatEuro(total.total)]),
      ),
    [comparison],
  );

  const options = useMemo(
    () =>
      nearestPerChain(CAMPUS).filter(({ store }) =>
        CATALOGUE_STORES.includes(store.chain),
      ),
    [],
  );

  return (
    <main className="relative h-[calc(100dvh-57px)] overflow-hidden">
      <StoreMap
        fill
        costByChain={costByChain}
        pricedChains={CATALOGUE_STORES}
        focusStoreId={focusStoreId}
        leftInset={leftInset}
      />

      <aside
        className="absolute inset-x-3 top-3 z-[1000] max-h-[58%] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg md:inset-x-auto md:left-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-[380px]"
        aria-label="Your basket"
      >
        <h1 className="text-lg font-bold tracking-tight">Your basket</h1>
        <p className="mb-3 mt-0.5 text-xs text-slate-500">
          Type what you need. Pick a suggestion, or just press the button.
        </p>

        <ProductSearch
          value={draft}
          onChange={setDraft}
          onPick={handlePick}
          onSubmit={() => void add(draft)}
          buttonLabel="Add"
          placeholder="bread, leche, eggs…"
          ariaLabel="Product to add to your basket"
          busy={saving}
          contractIds
        />

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-5 text-sm text-slate-500">Loading your basket…</p>
        ) : items.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            Your basket is empty. Add your first product above.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {comparison.pricing.map((entry) => {
                const offers = comparison.stores
                  .map((store) => ({ store, offer: entry.byStore[store] }))
                  .filter((row) => row.offer !== null);
                const photo = offers.find((row) => row.offer?.image)?.offer
                  ?.image;

                return (
                  <li
                    key={entry.item.id}
                    data-testid="core-item"
                    className="py-3"
                  >
                    <div className="flex items-start gap-3">
                      <ProductImage
                        src={photo}
                        alt={entry.entry?.label ?? ""}
                        size={44}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">
                          {entry.item.name}
                        </p>

                        {offers.length === 0 ? (
                          <p className="mt-0.5 text-xs text-slate-400">
                            No price in the catalogue yet
                          </p>
                        ) : (
                          <ul className="mt-1 space-y-0.5">
                            {offers.map(({ store, offer }) => (
                              <li
                                key={store}
                                className="flex items-baseline gap-2 text-xs text-slate-600"
                              >
                                <span className="w-16 shrink-0 font-medium">
                                  {store}
                                </span>
                                <span className="shrink-0 font-semibold text-slate-900">
                                  {formatEuro(offer!.price_eur)}
                                </span>
                                <span
                                  className="truncate text-slate-400"
                                  title={offer!.name}
                                >
                                  {offer!.name}
                                  {formatSize(offer!.size_g)
                                    ? ` · ${formatSize(offer!.size_g)}`
                                    : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(entry.item.id)}
                        aria-label={`Remove ${entry.item.name}`}
                        className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <section className="mt-4" aria-label="What the basket costs">
              <h2 className="text-sm font-semibold">What it costs</h2>

              {comparison.comparableCount === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  None of your products are in the catalogue yet, so there is
                  nothing to compare. They are still saved in your basket.
                </p>
              ) : (
                <>
                  <ul className="mt-2 space-y-1.5">
                    {options.map(({ store }) => {
                      const total = comparison.totals.find(
                        (row) => row.store === store.chain,
                      );
                      const cheapest = store.chain === comparison.cheapestStore;
                      return (
                        <li key={store.chain}>
                          <button
                            type="button"
                            onClick={() => setFocusStoreId(store.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left hover:border-emerald-600 ${
                              cheapest
                                ? "border-emerald-600 bg-emerald-50"
                                : "border-slate-200"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">
                                {store.chain}
                                {cheapest && (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                    cheapest
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {formatWalk(CAMPUS, store)} · {store.street ?? "nearest to IE Tower"}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-bold">
                              {total ? formatEuro(total.total) : "—"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    {comparison.comparableCount} of {items.length} products,
                    only the ones every shop can price. Prices collected{" "}
                    {comparison.pricesCheckedOn}. Click a shop to see it on the
                    map.
                    {comparison.anySizesDiffer &&
                      " Some packs differ a lot in size between shops, so check the sizes above."}
                  </p>
                </>
              )}

              {comparison.unpriced.length > 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Not included:{" "}
                  {comparison.unpriced.map((row) => row.item.name).join(", ")}.
                </p>
              )}
            </section>
          </>
        )}

        <p className="mt-4 text-[11px] text-slate-400">
          Walking times are estimates from straight-line distance, not routed
          directions.
        </p>
      </aside>
    </main>
  );
}
