"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ProductSearch from "@/components/ProductSearch";
import StoreMap from "@/components/StoreMap";
import { CATALOGUE_STORES, type CatalogueEntry } from "@/lib/catalogue";

/**
 * The landing demo. Someone types what they need, and signing up is what turns
 * it into a saved basket, so the first thing they do after registering is the
 * thing they already wanted.
 */
export default function LandingBasketDemo() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function goToSignup(product: string) {
    const text = product.trim();
    router.push(text ? `/signup?add=${encodeURIComponent(text)}` : "/signup");
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight">
        Supermarkets around IE Tower
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Type what you need and we will start your basket.
      </p>

      <div className="mt-4">
        <ProductSearch
          value={draft}
          onChange={setDraft}
          onPick={(entry: CatalogueEntry) => goToSignup(entry.label)}
          onSubmit={() => goToSignup(draft)}
          buttonLabel="Price my basket"
          placeholder="bread, leche, eggs…"
          ariaLabel="Product you want to price"
        />
      </div>

      <div className="mt-4">
        <StoreMap pricedChains={CATALOGUE_STORES} heightClass="h-72 sm:h-96" />
      </div>
    </section>
  );
}
