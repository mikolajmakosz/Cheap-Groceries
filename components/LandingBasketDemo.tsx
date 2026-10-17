"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import StoreMap from "@/components/StoreMap";

/** Chains whose prices are in the catalogue today. */
const PRICED_CHAINS = ["Mercadona"];

/**
 * The landing demo. Someone types what they need, and signing up is what turns
 * it into a saved basket — so the first thing they do after registering is the
 * thing they already wanted.
 */
export default function LandingBasketDemo() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const product = draft.trim();
    router.push(product ? `/signup?add=${encodeURIComponent(product)}` : "/signup");
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight">
        Supermarkets around IE Tower
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Type what you need and we will start your basket.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="pollo, leche, pan…"
          aria-label="Product you want to price"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-emerald-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700"
        >
          Price my basket
        </button>
      </form>

      <div className="mt-4">
        <StoreMap pricedChains={PRICED_CHAINS} heightClass="h-72 sm:h-96" />
      </div>
    </section>
  );
}
