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
import ProductBrowser from "@/components/ProductBrowser";
import ProductCompare from "@/components/ProductCompare";
import ShopCompare from "@/components/ShopCompare";
import {
  compareBasket,
  entryFor,
  formatEuro,
  formatQuantity,
  formatUnitPrice,
  portionCost,
  type BasketItem,
} from "@/lib/pricing";
import { planBasket } from "@/lib/plan";
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
  const [browsing, setBrowsing] = useState(false);
  const [detail, setDetail] = useState<CatalogueEntry | null>(null);
  // Products whose list of shops is open; the others show only the cheapest.
  const [openShops, setOpenShops] = useState<Set<string>>(new Set());

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
    void addEntry(entry);
  }

  /** A product already in the basket gets one more serving, not a second row. */
  async function addEntry(entry: CatalogueEntry) {
    const existing = items.find((item) => entryFor(item.name)?.term === entry.term);
    if (existing) {
      await handleQuantity(existing.id, existing.quantity + 1);
    } else {
      await add(entry.label);
    }
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

  // Per-shop prices and nutrition of the basket as it stands, one serving cycle.
  const shops = useMemo(() => planBasket(items, 1).stores, [items]);
  const cheapestShop = shops.length > 1
    ? shops.reduce((best, row) => (row.total < best.total ? row : best)).store
    : (shops[0]?.store ?? null);
  const shownShop = trip.selected?.chain ?? cheapestShop;
  const shownPlan = shops.find((row) => row.store === shownShop) ?? null;
  const inBasket = useMemo(
    () =>
      new Set(
        comparison.pricing.flatMap((row) => (row.entry ? [row.entry.term] : [])),
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
    <main className="relative h-[calc(100dvh-var(--header-h))] overflow-hidden">
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
        className="card absolute inset-x-3 top-3 z-[1000] max-h-[58%] overflow-y-auto p-4 md:inset-x-auto md:left-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-[380px]"
        aria-label="Your basket"
      >
        <div className="flex items-center justify-between gap-2">
          <h1 className="display text-3xl leading-none">Basket</h1>
          <button
            type="button"
            onClick={() => {
              setDetail(null);
              setBrowsing((open) => !open);
            }}
            aria-expanded={browsing}
            className="btn btn-sm"
          >
            {browsing ? "Close products" : "Browse products"}
          </button>
        </div>

        <div className="mt-3">
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
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-red-600">
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
          <p className="mt-5 text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-5 rounded-xl border-2 border-dashed border-[var(--ink)] p-4 text-center text-sm">
            Empty. Search above or browse products.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y-2 divide-[var(--ink)] border-y-2 border-[var(--ink)]">
              {comparison.pricing.map((row) => {
                const offers = comparison.stores
                  .map((store) => ({ store, offer: row.byStore[store] }))
                  .filter((pair) => pair.offer !== null);
                const photo = offers.find((pair) => pair.offer?.image)?.offer
                  ?.image;
                const cheapestOffer = row.entry
                  ? offers.reduce<(typeof offers)[number] | null>(
                      (best, pair) =>
                        !best ||
                        portionCost(pair.offer!, row.entry!, row.item.quantity) <
                          portionCost(best.offer!, row.entry!, row.item.quantity)
                          ? pair
                          : best,
                      null,
                    )
                  : null;
                const shopsOpen = openShops.has(row.item.id);
                const shownOffers = shopsOpen || !cheapestOffer ? offers : [cheapestOffer];

                return (
                  <li key={row.item.id} data-testid="core-item" className="py-3">
                    <div className="flex items-start gap-3">
                      <ProductImage
                        src={photo}
                        alt={row.entry?.label ?? ""}
                        size={44}
                      />
                      <div className="min-w-0 flex-1">
                        {row.entry ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBrowsing(false);
                              setDetail(row.entry);
                            }}
                            title="Compare this product across shops"
                            className="break-words text-left text-sm font-extrabold underline decoration-2 underline-offset-2"
                          >
                            {row.item.name}
                          </button>
                        ) : (
                          <p className="break-words text-sm font-extrabold">
                            {row.item.name}
                          </p>
                        )}

                        {row.entry && offers.length > 0 ? (
                          <>
                            <ul className="mt-1.5 space-y-1.5">
                              {shownOffers.map(({ store, offer }) => (
                                <li key={store}>
                                  <div className="flex items-center gap-2 text-xs">
                                    <a
                                      href={offer!.url ?? undefined}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`${store}: ${offer!.name}, opens the shop's page`}
                                      title={`Open at ${store}`}
                                      className="flex w-[3.75rem] shrink-0 items-center gap-1 rounded-md border-2 border-[var(--ink)] bg-white px-1.5 py-1"
                                    >
                                      <ShopLogo shop={store} height={14} />
                                      <span aria-hidden="true" className="text-[10px] text-slate-400">
                                        ↗
                                      </span>
                                    </a>
                                    <span className="shrink-0 font-bold">
                                      {formatUnitPrice(offer!, row.entry!)}
                                    </span>
                                    <span className="ml-auto shrink-0 font-extrabold">
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

                            {offers.length > 1 && (
                              <button
                                type="button"
                                aria-expanded={shopsOpen}
                                onClick={() =>
                                  setOpenShops((current) => {
                                    const next = new Set(current);
                                    if (next.has(row.item.id)) next.delete(row.item.id);
                                    else next.add(row.item.id);
                                    return next;
                                  })
                                }
                                className="mt-1.5 text-xs font-extrabold underline decoration-2 underline-offset-2"
                              >
                                {shopsOpen ? "Hide shops ▴" : `All ${offers.length} shops ▾`}
                              </button>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleQuantity(row.item.id, row.item.quantity - 1)
                                }
                                disabled={row.item.quantity <= 1}
                                aria-label={`Fewer ${row.item.name}`}
                                className="stepper h-7 w-7"
                              >
                                −
                              </button>
                              <span className="min-w-[4.5rem] text-center text-xs font-bold">
                                {formatQuantity(row.item.quantity, row.entry)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleQuantity(row.item.id, row.item.quantity + 1)
                                }
                                disabled={row.item.quantity >= MAX_QUANTITY}
                                aria-label={`More ${row.item.name}`}
                                className="stepper h-7 w-7"
                              >
                                +
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-0.5 text-xs text-slate-400">No price</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(row.item.id)}
                        aria-label={`Remove ${row.item.name}`}
                        className="stepper h-7 w-7 shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <BasketActions count={items.length} onClear={clearBasket} onSave={saveBasket} />

            {comparison.comparableCount > 0 && (
              <section className="mt-5" aria-label="Where to buy it">
                <h2 className="display text-xl">Shops</h2>
                <div className="mt-2">
                  <WhereToBuy
                    options={options}
                    analysis={analysis}
                    selectedStoreId={trip.selected?.id ?? null}
                    onSelect={(store) => void trip.select(store)}
                    hasHome={trip.home !== null}
                    home={trip.home}
                    shopMinutes={shopMinutes}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {comparison.comparableCount}/{items.length} products priced · {comparison.pricesCheckedOn}
                </p>
              </section>
            )}

            {shownPlan && (
              <section className="mt-5" aria-label="Nutrition">
                <h2 className="display flex items-center gap-2 text-xl">
                  Nutrition <ShopLogo shop={shownPlan.store} height={18} />
                </h2>
                <div className="mt-2">
                  <NutritionPanel nutrition={shownPlan.nutrition} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  €{shownPlan.per100kcal?.toFixed(2) ?? "–"} per 100 kcal · €
                  {shownPlan.perGramProtein?.toFixed(2) ?? "–"} per g protein
                </p>
                {shops.length > 1 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-extrabold">
                      Compare shops
                    </summary>
                    <div className="mt-2">
                      <ShopCompare
                        rows={shops}
                        selected={shownShop}
                        onSelect={(store) => {
                          const best = options.find((option) => option.chain === store);
                          if (best) void trip.select(best.store);
                        }}
                      />
                    </div>
                  </details>
                )}
              </section>
            )}

            {comparison.unpriced.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                {comparison.stores.length > 2 ? "Not priced by every compared shop" : "No price"}:{" "}
                {comparison.unpriced.map((row) => row.item.name).join(", ")}
              </p>
            )}
          </>
        )}
      </aside>

      {detail && (
        <div className="absolute inset-x-3 bottom-3 top-3 z-[1050] md:inset-x-auto md:bottom-auto md:left-[412px] md:top-4 md:w-[min(460px,calc(100vw-432px))]">
          <section aria-label={`${detail.label} in each shop`} className="card max-h-full overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="display text-2xl leading-none">{detail.label}</h2>
              <button type="button" onClick={() => setDetail(null)} className="btn btn-light btn-sm">
                Close
              </button>
            </div>
            <div className="mt-3">
              <ProductCompare entry={detail} />
            </div>
          </section>
        </div>
      )}

      {browsing && (
        <div className="absolute inset-x-3 bottom-3 top-3 z-[1050] md:inset-x-auto md:bottom-4 md:left-[412px] md:top-4 md:w-[min(520px,calc(100vw-432px))]">
          <ProductBrowser
            inBasket={inBasket}
            onAdd={(entry) => void addEntry(entry)}
            onClose={() => setBrowsing(false)}
          />
        </div>
      )}
    </main>
  );
}
