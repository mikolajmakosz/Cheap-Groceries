"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProductSearch from "@/components/ProductSearch";
import StoreMap from "@/components/StoreMap";
import TripPanel from "@/components/TripPanel";
import { CATALOGUE_STORES, type CatalogueEntry } from "@/lib/catalogue";
import { useTrip } from "@/lib/useTrip";

const PANEL_INSET_PX = 440;

/**
 * The landing page: a live map of the supermarkets around IE Tower fills the
 * screen, and the one thing a stranger must understand floats over it, with a
 * single button to sign up.
 */
export default function LandingHero() {
  const router = useRouter();
  const trip = useTrip();
  const [draft, setDraft] = useState("");
  const [leftInset, setLeftInset] = useState(0);

  useEffect(() => {
    const update = () =>
      setLeftInset(window.innerWidth >= 768 ? PANEL_INSET_PX : 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function goToSignup(product: string) {
    const text = product.trim();
    router.push(text ? `/signup?add=${encodeURIComponent(text)}` : "/signup");
  }

  const route = trip.toStore
    ? { toStore: trip.toStore.path, toHome: undefined }
    : null;

  return (
    <main className="relative h-[calc(100dvh-57px)] overflow-hidden">
      <StoreMap
        fill
        pricedChains={CATALOGUE_STORES}
        selectedStoreId={trip.selected?.id ?? null}
        onSelectStore={(store) => void trip.select(store)}
        route={route}
        leftInset={leftInset}
      />

      <section
        className="absolute inset-x-3 top-3 z-[1000] max-h-[78%] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:inset-x-auto md:left-5 md:top-5 md:max-h-[calc(100%-2.5rem)] md:w-[420px] md:p-6"
        aria-label="CestaPro"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          For international students in Madrid
        </p>

        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
          Stop overpaying for your weekly shop
        </h1>

        <p className="mt-3 text-base text-slate-600">
          Write your shopping list once. CestaPro prices it at the supermarkets you can
          walk to from campus, and shows you the way.
        </p>

        <div className="mt-5">
          <ProductSearch
            value={draft}
            onChange={setDraft}
            onPick={(entry: CatalogueEntry) => goToSignup(entry.label)}
            onSubmit={() => goToSignup(draft)}
            buttonLabel="Add"
            placeholder="Try bread, milk, rice…"
            ariaLabel="A product you want to price"
            quietButton
          />
        </div>

        <Link
          href="/signup"
          className="mt-4 block rounded-xl bg-emerald-600 px-6 py-3 text-center text-base font-semibold text-white hover:bg-emerald-700"
        >
          Sign up — it&apos;s free
        </Link>
        <p className="mt-2 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>

        {trip.selected && (
          <TripPanel
            store={trip.selected}
            toStore={trip.toStore}
            toHome={null}
            home={null}
            loading={trip.loading}
            onHome={() => undefined}
            onClose={() => void trip.select(null)}
            showHome={false}
          />
        )}

        <ol className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <li>
            <strong className="text-slate-900">1. Type what you buy.</strong> In English or
            Spanish: &ldquo;bread&rdquo;, &ldquo;leche&rdquo;, &ldquo;rice&rdquo;.
          </li>
          <li>
            <strong className="text-slate-900">2. See what it costs.</strong> Mercadona and
            Dia, per kg or per litre, so the comparison is fair.
          </li>
          <li>
            <strong className="text-slate-900">3. Walk to the right one.</strong> Click a
            shop for the route from campus, and what each minute saved costs you.
          </li>
        </ol>

        <p className="mt-4 text-xs text-slate-400">
          Prices come from each shop&apos;s own listings and are dated in the app.
        </p>
      </section>
    </main>
  );
}
