"use client";

import { useState } from "react";
import ProductImage from "@/components/ProductImage";
import { CATEGORIES } from "@/lib/categories";
import { CATALOGUE, type CatalogueEntry } from "@/lib/catalogue";
import { formatEuro } from "@/lib/pricing";

type Props = {
  onAdd: (entry: CatalogueEntry) => void;
  onClose: () => void;
  /** Terms already in the basket, marked with a tick. */
  inBasket: Set<string>;
};

function cheapestUnit(entry: CatalogueEntry): string {
  const prices = Object.values(entry.offers).map((offer) => offer.unit_price);
  return `${formatEuro(Math.min(...prices))} / ${entry.basis.label}`;
}

function photo(entry: CatalogueEntry): string | null {
  return Object.values(entry.offers).find((offer) => offer.image)?.image ?? null;
}

/**
 * The aisles of the catalogue, like a supermarket's own menu: pick a category on
 * the left, tap a product on the right to put it in the basket.
 */
export default function ProductBrowser({ onAdd, onClose, inBasket }: Props) {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];
  const entries = category.terms
    .map((term) => CATALOGUE.find((entry) => entry.term === term))
    .filter((entry): entry is CatalogueEntry => entry !== undefined);

  return (
    <section
      aria-label="Products"
      className="card flex h-full flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b-[3px] border-[var(--ink)] px-4 py-2.5">
        <h2 className="display text-2xl">Products</h2>
        <button type="button" onClick={onClose} aria-label="Close products" className="btn btn-light btn-sm">
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          aria-label="Categories"
          className="flex shrink-0 gap-1.5 overflow-x-auto border-b-[3px] border-[var(--ink)] p-2 md:w-44 md:flex-col md:overflow-y-auto md:overflow-x-visible md:border-b-0 md:border-r-[3px]"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              aria-current={c.id === category.id}
              className={`shrink-0 rounded-xl border-2 border-[var(--ink)] px-3 py-1.5 text-left text-sm font-extrabold ${
                c.id === category.id ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </nav>

        <ul className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3 lg:grid-cols-3">
          {entries.map((entry) => {
            const added = inBasket.has(entry.term);
            return (
              <li key={entry.term}>
                <button
                  type="button"
                  onClick={() => onAdd(entry)}
                  className="flex h-full w-full flex-col items-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-white p-2 text-center hover:bg-[var(--y1)]"
                >
                  <ProductImage src={photo(entry)} alt="" size={64} />
                  <span className="text-sm font-extrabold leading-tight">{entry.label}</span>
                  <span className="text-xs text-slate-500">from {cheapestUnit(entry)}</span>
                  <span className="mt-auto rounded-lg border-2 border-[var(--ink)] bg-[var(--ink)] px-2 py-0.5 text-xs font-extrabold text-[var(--paper)]">
                    {added ? "✓ Add more" : "+ Add"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
