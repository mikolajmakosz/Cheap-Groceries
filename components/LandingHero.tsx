"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProductSearch from "@/components/ProductSearch";
import StoreMap from "@/components/StoreMap";
import TripPanel from "@/components/TripPanel";
import { CATALOGUE_STORES, type CatalogueEntry } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/client";
import { useSignedIn } from "@/lib/useSignedIn";
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
  const signedIn = useSignedIn();
  const [draft, setDraft] = useState("");
  const [leftInset, setLeftInset] = useState(0);

  useEffect(() => {
    const update = () =>
      setLeftInset(window.innerWidth >= 768 ? PANEL_INSET_PX : 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  async function goToSignup(product: string) {
    const text = product.trim();
    if (signedIn) {
      // Already registered: put it in the basket and go there.
      if (text) await createClient().from("basket_items").insert({ name: text });
      router.push("/app");
      return;
    }
    router.push(text ? `/signup?add=${encodeURIComponent(text)}` : "/signup");
  }

  const route = trip.toStore
    ? { toStore: trip.toStore.path, toHome: undefined }
    : null;

  return (
    <main className="relative h-[calc(100dvh-var(--header-h))] overflow-hidden">
      <StoreMap
        fill
        pricedChains={CATALOGUE_STORES}
        selectedStoreId={trip.selected?.id ?? null}
        onSelectStore={(store) => void trip.select(store)}
        route={route}
        leftInset={leftInset}
      />

      <section
        className="card absolute inset-x-3 top-3 z-[1000] max-h-[78%] overflow-y-auto p-5 md:inset-x-auto md:left-5 md:top-5 md:max-h-[calc(100%-2.5rem)] md:w-[420px] md:p-6"
        aria-label="Cheap Groceries"
      >
        <h1 className="display text-4xl leading-[0.95] md:text-5xl">
          Pay less for your weekly shop
        </h1>

        <p className="mt-3 text-base text-slate-600">
          Build a basket. See its price in every shop near IE.
        </p>

        <div className="mt-5">
          <ProductSearch
            value={draft}
            onChange={setDraft}
            onPick={(entry: CatalogueEntry) => void goToSignup(entry.label)}
            onSubmit={() => void goToSignup(draft)}
            buttonLabel="Add"
            placeholder="bread, milk, rice…"
            ariaLabel="A product you want to price"
          />
        </div>

        {signedIn ? (
          <Link href="/app" className="btn mt-4 w-full py-3 text-lg">
            Open my basket
          </Link>
        ) : (
          <>
            <Link href="/signup" className="btn mt-4 w-full py-3 text-lg">
              Sign up free
            </Link>
            <p className="mt-3 text-center text-sm text-slate-600">
              Have an account?{" "}
              <Link href="/login" className="font-bold underline">
                Log in
              </Link>
            </p>
          </>
        )}

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
      </section>
    </main>
  );
}
