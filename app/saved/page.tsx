"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NutritionPanel from "@/components/NutritionPanel";
import ProductCompare from "@/components/ProductCompare";
import ProductSearch from "@/components/ProductSearch";
import ShopCompare from "@/components/ShopCompare";
import ShopLogo from "@/components/ShopLogo";
import TripSettingsPanel from "@/components/TripSettings";
import { useTripSettings } from "@/lib/tripStore";
import type { TripSettings } from "@/lib/trip";
import { deliveredFor, formatDuration, periodFor } from "@/lib/monthly";
import { createClient } from "@/lib/supabase/client";
import { formatEuro, formatQuantity, type BasketItem } from "@/lib/pricing";
import { MONTH_DAYS, planBasket } from "@/lib/plan";
import { estimateShopMinutes } from "@/lib/shoptime";
import { bestStorePerChain } from "@/lib/tradeoff";
import type { CatalogueEntry } from "@/lib/catalogue";

type SavedItem = {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
  lasts_days: number | null;
};

type SavedBasket = {
  id: string;
  name: string;
  days: number;
  created_at: string;
  saved_basket_items: SavedItem[];
};

const MAX_DAYS = 30;

/** What editing a saved basket can do; each one saves at once. */
type BasketEdits = {
  rename: (id: string, name: string) => Promise<void>;
  quantity: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  add: (basketId: string, name: string) => Promise<void>;
};

const MAX_QUANTITY = 20;

type Period = "day" | "week" | "month" | "custom";
const PERIODS: { id: Period; label: string; days: number | null }[] = [
  { id: "day", label: "Day", days: 1 },
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: MONTH_DAYS },
  { id: "custom", label: "Days", days: null },
];

function BasketCard({
  basket,
  trip,
  onDelete,
  onAdd,
  onDays,
  onLasts,
  onEdit,
}: {
  basket: SavedBasket;
  trip: TripSettings;
  onDelete: (id: string) => Promise<void>;
  onAdd: (basket: SavedBasket) => Promise<void>;
  onDays: (id: string, days: number) => void;
  onLasts: (itemId: string, days: number | null) => void;
  onEdit: BasketEdits;
}) {
  const [days, setDays] = useState(basket.days);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [customDays, setCustomDays] = useState(14);
  const [delivery, setDelivery] = useState(false);
  const [lasts, setLasts] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(basket.saved_basket_items.map((item) => [item.id, item.lasts_days])),
  );
  const [opened, setOpened] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(basket.name);
  const [draft, setDraft] = useState("");

  const periodDays = PERIODS.find((p) => p.id === period)?.days ?? customDays;
  const periodLabel =
    period === "custom" ? `${customDays} ${customDays === 1 ? "day" : "days"}` : period;

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

  const plan = useMemo(() => planBasket(items, days, lasts), [items, days, lasts]);
  const priced = plan.lines.some((line) => line.row.comparable);
  const shopMinutes = estimateShopMinutes(items);

  const cheapest = plan.stores.length
    ? plan.stores.reduce((best, row) => (row.perDay < best.perDay ? row : best))
    : null;
  const shown = plan.stores.find((row) => row.store === chosen) ?? cheapest;

  // The quickest shop of each chain, then what the chosen period means there.
  const periods = useMemo(() => {
    const costs = Object.fromEntries(plan.stores.map((row) => [row.store, row.total]));
    return bestStorePerChain(costs, trip).map((option) => {
      const row = plan.stores.find((r) => r.store === option.chain)!;
      return {
        chain: option.chain,
        total: row.total,
        span: periodFor(option.store, row.perDay, days, shopMinutes, trip, periodDays),
        delivered: deliveredFor(
          option.chain,
          row.total,
          periodFor(option.store, row.perDay, days, shopMinutes, trip, periodDays),
        ),
      };
    });
  }, [plan.stores, trip, days, shopMinutes, periodDays]);

  function setLastsFor(itemId: string, value: number | null) {
    setLasts((current) => ({ ...current, [itemId]: value }));
    onLasts(itemId, value);
  }

  return (
    <article className="card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {editing ? (
            <input
              type="text"
              aria-label="Basket name"
              value={draftName}
              maxLength={60}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => {
                const name = draftName.trim();
                if (name && name !== basket.name) void onEdit.rename(basket.id, name);
                else setDraftName(basket.name);
              }}
              className="field !py-1 !text-lg font-extrabold"
            />
          ) : (
            <h2 className="display text-2xl leading-none">{basket.name}</h2>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {items.length} {items.length === 1 ? "product" : "products"} ·{" "}
            {new Date(basket.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => setEditing((on) => !on)}
            className={`btn btn-sm ${editing ? "" : "btn-light"}`}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onAdd(basket);
              setBusy(false);
            }}
            className="btn btn-light btn-sm"
          >
            Use it
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
                className="btn btn-sm !bg-[var(--red)]"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn btn-light btn-sm"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="btn btn-light btn-sm"
            >
              Delete
            </button>
          )}
        </div>
      </header>

      {/* At a glance: the cheapest shop for this basket, its price and the period's cost. */}
      {(() => {
        const best = periods.length
          ? periods.reduce((x, y) => (y.span.euros < x.span.euros ? y : x))
          : null;
        return best ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--y1)] px-3 py-2">
            <ShopLogo shop={best.chain} height={20} />
            <span className="text-sm font-bold">
              Basket <strong className="text-lg">{formatEuro(best.total)}</strong>
            </span>
            <span className="text-sm font-bold">
              Per {periodLabel} <strong className="text-lg">{formatEuro(best.span.euros)}</strong>
            </span>
            <span className="text-sm font-bold">{formatDuration(best.span.minutes)}</span>
          </div>
        ) : null;
      })()}

      <button
        type="button"
        aria-expanded={expanded || editing}
        onClick={() => setExpanded((on) => !on)}
        className="mt-3 text-sm font-extrabold underline decoration-2 underline-offset-2"
      >
        {expanded || editing ? "Hide details ▴" : "Show details ▾"}
      </button>

      {(expanded || editing) && (
        <>

      <div className="mt-5">
        <label htmlFor={`days-${basket.id}`} className="flex items-baseline justify-between">
          <span className="text-sm font-extrabold">Basket lasts</span>
          <span className="display text-xl">
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
          className="mt-2 w-full accent-[var(--ink)]"
        />
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>1</span>
          <span>7</span>
          <span>14</span>
          <span>30</span>
        </div>
      </div>

      {priced ? (
        <>
          <section className="mt-5" aria-label="Cost and time">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="display text-xl">Per {periodLabel}</h3>
              <div role="group" aria-label="How you get it" className="flex gap-1.5">
                {[
                  { id: false, label: "I go" },
                  { id: true, label: "Delivery" },
                ].map((mode) => (
                  <button
                    key={mode.label}
                    type="button"
                    aria-pressed={delivery === mode.id}
                    onClick={() => setDelivery(mode.id)}
                    className={`rounded-xl border-2 border-[var(--ink)] px-2.5 py-1 text-xs font-extrabold ${
                      delivery === mode.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Period" className="flex flex-wrap items-center gap-1.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={period === p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`rounded-xl border-2 border-[var(--ink)] px-2.5 py-1 text-xs font-extrabold ${
                      period === p.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                {period === "custom" && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    aria-label="Number of days"
                    onChange={(event) =>
                      setCustomDays(Math.min(365, Math.max(1, Math.round(Number(event.target.value)) || 1)))
                    }
                    className="field !w-16 !px-2 !py-1 !text-sm"
                  />
                )}
              </div>
            </div>

            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {periods.map(({ chain, total, span, delivered }) => {
                const best = cheapest?.store === chain && plan.stores.length > 1;
                return (
                  <li
                    key={chain}
                    className={`rounded-xl border-2 border-[var(--ink)] px-3 py-2.5 ${
                      best ? "bg-[var(--y1)]" : "bg-white"
                    }`}
                  >
                    <ShopLogo shop={chain} height={18} />
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 text-sm">
                      <div>
                        <dt className="text-[11px] font-extrabold uppercase text-slate-500">Basket</dt>
                        <dd className="text-xl font-extrabold leading-tight">{formatEuro(total)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-extrabold uppercase text-slate-500">
                          Per {periodLabel}
                        </dt>
                        <dd className="text-xl font-extrabold leading-tight">
                          {formatEuro(delivery ? delivered.euros : span.euros)}
                        </dd>
                      </div>
                    </dl>
                    {delivery ? (
                      <p className="mt-1.5 text-sm font-bold">
                        {delivered.feeEach > 0
                          ? `+${formatEuro(delivered.fees)} delivery`
                          : "free delivery"}
                        <span className="ml-1 text-xs text-slate-500">
                          {+delivered.deliveries.toFixed(1)}× · saves{" "}
                          {formatDuration(delivered.minutesSaved)}
                          {delivered.perHour !== null &&
                            ` · ${formatEuro(delivered.perHour)} per hour saved`}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm font-bold">
                        {formatDuration(span.minutes)}
                        <span className="ml-1 text-xs text-slate-500">
                          {+span.trips.toFixed(1)}× {formatDuration(span.minutesPerTrip)}
                        </span>
                      </p>
                    )}
                    {!delivery && span.savedVsHome !== null && span.savedVsHome > 0 && (
                      <p className="mt-1 rounded-lg bg-[var(--blue-soft)] px-2 py-0.5 text-xs font-extrabold">
                        Saves {formatDuration(span.savedVsHome)} vs going from home
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              {trip.start === "home" && trip.home
                ? "A trip is home → shop → home"
                : trip.home
                  ? `A trip adds the detour on your way home from ${trip.anchor.label}`
                  : `A trip is the way from ${trip.anchor.label} (add your home above for the real detour)`}{" "}
              + {shopMinutes} min inside.
            </p>
          </section>

          <section className="mt-5" aria-label="Shops compared">
            <h3 className="display text-xl">Shops compared</h3>
            <div className="mt-2">
              <ShopCompare
                rows={plan.stores}
                selected={shown?.store}
                onSelect={setChosen}
              />
            </div>
          </section>

          {shown && (
            <section className="mt-5" aria-label="Nutrition per day">
              <h3 className="display flex items-center gap-2 text-xl">
                A day at <ShopLogo shop={shown.store} height={18} />
              </h3>
              <div className="mt-2">
                <NutritionPanel nutrition={shown.nutritionPerDay} />
              </div>
            </section>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-xl border-2 border-dashed border-[var(--ink)] p-3 text-sm">
          No priced products in this basket.
        </p>
      )}

      <section className="mt-5" aria-label="Products">
        <h3 className="display text-xl">Products</h3>
        <ul className="mt-2 divide-y-2 divide-[var(--ink)]/15">
          {plan.lines.map((line) => {
            const entry = line.row.entry;
            const id = line.row.item.id;
            return (
              <li key={id} className="py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  {entry ? (
                    <button
                      type="button"
                      aria-expanded={opened === id}
                      onClick={() => setOpened(opened === id ? null : id)}
                      className="text-left font-extrabold underline decoration-2 underline-offset-2"
                    >
                      {line.row.item.name}
                    </button>
                  ) : (
                    <span className="font-extrabold">{line.row.item.name}</span>
                  )}
                  {editing ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={line.row.item.quantity <= 1}
                        aria-label={`Fewer ${line.row.item.name}`}
                        onClick={() => void onEdit.quantity(id, line.row.item.quantity - 1)}
                        className="stepper h-7 w-7"
                      >
                        −
                      </button>
                      <span className="min-w-[3.5rem] text-center text-xs font-bold">
                        {entry ? formatQuantity(line.row.item.quantity, entry) : `${line.row.item.quantity}×`}
                      </span>
                      <button
                        type="button"
                        disabled={line.row.item.quantity >= MAX_QUANTITY}
                        aria-label={`More ${line.row.item.name}`}
                        onClick={() => void onEdit.quantity(id, line.row.item.quantity + 1)}
                        className="stepper h-7 w-7"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${line.row.item.name}`}
                        onClick={() => void onEdit.remove(id)}
                        className="stepper ml-1 h-7 w-7"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {entry ? formatQuantity(line.row.item.quantity, entry) : "no price"}
                    </span>
                  )}
                </div>

                {entry && (
                  <label className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                    Lasts me
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      placeholder={`${days}`}
                      value={lasts[id] ?? ""}
                      aria-label={`How many days ${line.row.item.name} lasts you`}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setLastsFor(
                          id,
                          raw === "" ? null : Math.min(3650, Math.max(1, Math.round(Number(raw)) || 1)),
                        );
                      }}
                      className="field !w-16 !px-2 !py-0.5 !text-sm"
                    />
                    days
                  </label>
                )}

                {entry && opened === id && (
                  <div className="mt-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3">
                    <ProductCompare entry={entry} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {editing && (
          <div className="mt-3">
            <ProductSearch
              value={draft}
              onChange={setDraft}
              onPick={(entry: CatalogueEntry) => {
                setDraft("");
                void onEdit.add(basket.id, entry.label);
              }}
              onSubmit={() => {
                const name = draft.trim();
                setDraft("");
                if (name) void onEdit.add(basket.id, name);
              }}
              buttonLabel="Add"
              placeholder="Add a product…"
              ariaLabel={`Add a product to ${basket.name}`}
            />
          </div>
        )}
      </section>
        </>
      )}
    </article>
  );
}

export default function SavedBasketsPage() {
  const router = useRouter();
  const trip = useTripSettings();
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
      .select(
        "id, name, days, created_at, saved_basket_items(id, name, quantity, created_at, lasts_days)",
      )
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

  /** Saves what a person says a product lasts them, once they stop typing. */
  function handleLasts(itemId: string, days: number | null) {
    const pending = timers.current;
    const key = `item-${itemId}`;
    clearTimeout(pending.get(key));
    pending.set(
      key,
      setTimeout(async () => {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("saved_basket_items")
          .update({ lasts_days: days })
          .eq("id", itemId);
        if (updateError) setError(updateError.message);
      }, 600),
    );
  }

  /** Each edit saves at once and reloads, so the screen is what the database holds. */
  const edits: BasketEdits = {
    rename: async (id, name) => {
      const supabase = createClient();
      const { error: renameError } = await supabase
        .from("saved_baskets")
        .update({ name })
        .eq("id", id);
      if (renameError) setError(renameError.message);
      await load();
    },
    quantity: async (itemId, quantity) => {
      const next = Math.min(MAX_QUANTITY, Math.max(1, quantity));
      const supabase = createClient();
      const { error: quantityError } = await supabase
        .from("saved_basket_items")
        .update({ quantity: next })
        .eq("id", itemId);
      if (quantityError) setError(quantityError.message);
      await load();
    },
    remove: async (itemId) => {
      const supabase = createClient();
      const { error: removeError } = await supabase
        .from("saved_basket_items")
        .delete()
        .eq("id", itemId);
      if (removeError) setError(removeError.message);
      await load();
    },
    add: async (basketId, name) => {
      const supabase = createClient();
      const { error: addError } = await supabase
        .from("saved_basket_items")
        .insert({ basket_id: basketId, name });
      if (addError) setError(addError.message);
      await load();
    },
  };

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
      <h1 className="display text-5xl leading-none">Saved baskets</h1>

      <div className="mt-5">
        <TripSettingsPanel compact />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-bold text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : baskets.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p className="text-base font-bold">No saved baskets yet.</p>
          <Link href="/app" className="btn mt-4">
            Build a basket
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {baskets.map((basket) => (
            <BasketCard
              key={basket.id}
              basket={basket}
              trip={trip}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onDays={handleDays}
              onLasts={handleLasts}
              onEdit={edits}
            />
          ))}
        </div>
      )}
    </main>
  );
}
