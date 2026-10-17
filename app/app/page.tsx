"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BasketActions from "@/components/BasketActions";
import NutritionPanel from "@/components/NutritionPanel";
import ProductImage from "@/components/ProductImage";
import ProductSearch from "@/components/ProductSearch";
import ShopLogo from "@/components/ShopLogo";
import StoreMap from "@/components/StoreMap";
import TripPanel from "@/components/TripPanel";
import WhereToBuy from "@/components/WhereToBuy";
import { CATALOGUE_STORES, type CatalogueEntry } from "@/lib/catalogue";
import {
  compareBasket,
  formatEuro,
  formatQuantity,
  formatUnitPrice,
  portionCost,
  type BasketItem,
} from "@/lib/pricing";
import { ZERO, addNutrients, nutritionOf } from "@/lib/nutrition";
import { estimateShopMinutes } from "@/lib/shoptime";
import { analyseTradeOff, bestStorePerChain } from "@/lib/tradeoff";
import { useTrip } from "@/lib/useTrip";

/** Width of the floating panel on a desktop screen, plus its margin. */
const PANEL_INSET_PX = 400;
const MAX_QUANTITY = 20;

export default function BasketPage() {
  const router = useRouter();
  const trip = useTrip();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  async function handleQuantity(id: string, quantity: number) {
    const next = Math.min(MAX_QUANTITY, Math.max(1, quantity));
    // Show the change at once; put it right if the save fails.
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: next } : item)),
    );
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("basket_items")
      .update({ quantity: next })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      await load();
    }
  }

  async function clearBasket() {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("basket_items")
      .delete()
      .in(
        "id",
        items.map((item) => item.id),
      );
    if (deleteError) setError(deleteError.message);
    await load();
  }

  /** Keeps a copy, so changing the live basket later never rewrites a saved one. */
  async function saveBasket(name: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = createClient();
    const { data, error: basketError } = await supabase
      .from("saved_baskets")
      .insert({ name })
      .select("id")
      .single();
    if (basketError || !data) {
      return { ok: false, error: basketError?.message ?? "Could not save the basket." };
    }

    const { error: itemsError } = await supabase.from("saved_basket_items").insert(
      items.map((item) => ({
        basket_id: data.id,
        name: item.name,
        quantity: item.quantity,
      })),
    );
    if (itemsError) {
      // Do not leave an empty basket behind.
      await supabase.from("saved_baskets").delete().eq("id", data.id);
      return { ok: false, error: itemsError.message };
    }
    return { ok: true };
  }

  const comparison = useMemo(() => compareBasket(items), [items]);

  const nutrition = useMemo(
    () =>
      comparison.pricing.reduce(
        (sum, row) =>
          row.entry ? addNutrients(sum, nutritionOf(row.entry, row.item.quantity)) : sum,
        ZERO,
      ),
    [comparison],
  );
  const shopMinutes = estimateShopMinutes(items);

  const costByChain = useMemo(
    () =>
      Object.fromEntries(
        comparison.totals.map((total) => [total.store, formatEuro(total.total)]),
      ),
    [comparison],
  );

  const options = useMemo(
    () =>
      comparison.comparableCount > 0
        ? bestStorePerChain(
            Object.fromEntries(
              comparison.totals.map((total) => [total.store, total.total]),
            ),
            trip.home,
          )
        : [],
    [comparison, trip.home],
  );
  const analysis = useMemo(() => analyseTradeOff(options), [options]);

  const route = trip.toStore
    ? { toStore: trip.toStore.path, toHome: trip.toHome?.path }
    : null;

  return (
    <main className="relative h-[calc(100dvh-57px)] overflow-hidden">
      <StoreMap
        fill
        costByChain={costByChain}
        pricedChains={CATALOGUE_STORES}
        selectedStoreId={trip.selected?.id ?? null}
        onSelectStore={(store) => void trip.select(store)}
        route={route}
        home={trip.home}
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

        {trip.selected && (
          <TripPanel
            store={trip.selected}
            toStore={trip.toStore}
            toHome={trip.toHome}
            home={trip.home}
            loading={trip.loading}
            onHome={(place) => void trip.setHomePlace(place)}
            onClose={() => void trip.select(null)}
            shopMinutes={shopMinutes}
          />
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
              {comparison.pricing.map((row) => {
                const offers = comparison.stores
                  .map((store) => ({ store, offer: row.byStore[store] }))
                  .filter((pair) => pair.offer !== null);
                const photo = offers.find((pair) => pair.offer?.image)?.offer
                  ?.image;

                return (
                  <li key={row.item.id} data-testid="core-item" className="py-3">
                    <div className="flex items-start gap-3">
                      <ProductImage
                        src={photo}
                        alt={row.entry?.label ?? ""}
                        size={44}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">
                          {row.item.name}
                        </p>

                        {row.entry && offers.length > 0 ? (
                          <>
                            <ul className="mt-1.5 space-y-1.5">
                              {offers.map(({ store, offer }) => (
                                <li key={store}>
                                  <div className="flex items-center gap-2 text-xs">
                                    <a
                                      href={offer!.url ?? undefined}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`${store}: ${offer!.name}, opens the shop's page`}
                                      title={`Open this product at ${store}`}
                                      className="flex w-[3.75rem] shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 hover:border-emerald-600"
                                    >
                                      <ShopLogo shop={store} height={14} />
                                      <span aria-hidden="true" className="text-[10px] text-slate-400">
                                        ↗
                                      </span>
                                    </a>
                                    <span className="shrink-0 font-semibold text-slate-900">
                                      {formatUnitPrice(offer!, row.entry!)}
                                    </span>
                                    <span className="ml-auto shrink-0 font-bold text-slate-900">
                                      {formatEuro(
                                        portionCost(offer!, row.entry!, row.item.quantity),
                                      )}
                                    </span>
                                  </div>
                                  <p
                                    className="mt-0.5 truncate pl-[4.25rem] text-[11px] text-slate-400"
                                    title={offer!.name}
                                  >
                                    {offer!.name}
                                  </p>
                                </li>
                              ))}
                            </ul>

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleQuantity(row.item.id, row.item.quantity - 1)
                                }
                                disabled={row.item.quantity <= 1}
                                aria-label={`Fewer ${row.item.name}`}
                                className="h-6 w-6 rounded-md border border-slate-300 text-sm leading-none text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                              >
                                −
                              </button>
                              <span className="min-w-[4.5rem] text-center text-xs font-medium">
                                {formatQuantity(row.item.quantity, row.entry)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleQuantity(row.item.id, row.item.quantity + 1)
                                }
                                disabled={row.item.quantity >= MAX_QUANTITY}
                                aria-label={`More ${row.item.name}`}
                                className="h-6 w-6 rounded-md border border-slate-300 text-sm leading-none text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-0.5 text-xs text-slate-400">
                            No price in the catalogue yet
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(row.item.id)}
                        aria-label={`Remove ${row.item.name}`}
                        className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <BasketActions count={items.length} onClear={clearBasket} onSave={saveBasket} />

            <details className="mt-4 rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                What is in this basket
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {Math.round(nutrition.kcal).toLocaleString("en-GB")} kcal ·{" "}
                  {Math.round(nutrition.protein)} g protein
                </span>
              </summary>
              <div className="mt-3">
                <NutritionPanel nutrition={nutrition} />
                <p className="mt-2 text-[11px] text-slate-500">
                  This is everything in the basket. To see it per day, save the basket and say how
                  many days it has to last.
                </p>
              </div>
            </details>

            <section className="mt-4" aria-label="Where to buy it">
              <h2 className="text-sm font-semibold">Where to buy it</h2>

              {comparison.comparableCount === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  None of your products are in the catalogue yet, so there is nothing to
                  compare. They are still saved in your basket.
                </p>
              ) : (
                <>
                  <WhereToBuy
                    options={options}
                    analysis={analysis}
                    selectedStoreId={trip.selected?.id ?? null}
                    onSelect={(store) => void trip.select(store)}
                    hasHome={trip.home !== null}
                    shopMinutes={shopMinutes}
                    productCount={items.length}
                  />
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    {comparison.comparableCount} of {items.length} products, only the ones
                    every shop can price. Prices are per kg, per litre, per dozen or per
                    piece, the same measure in every shop, collected{" "}
                    {comparison.pricesCheckedOn}. Click a shop to walk there on the map.
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
      </aside>
    </main>
  );
}
