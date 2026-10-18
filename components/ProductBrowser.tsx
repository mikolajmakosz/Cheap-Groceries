"use client";

import { useState } from "react";
import ProductImage from "@/components/ProductImage";
import { CATEGORIES, type Category, type Section } from "@/lib/categories";
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

function entriesOf(section: Section): CatalogueEntry[] {
  return section.terms
    .map((term) => CATALOGUE.find((entry) => entry.term === term))
    .filter((entry): entry is CatalogueEntry => entry !== undefined);
}

/**
 * The aisles of the catalogue, laid out like a supermarket's own menu: an aisle
 * opens into sections on the left, and the products of what is picked fill the
 * right, each section under its own heading. Tap a product to put it in the basket.
 */
export default function ProductBrowser({ onAdd, onClose, inBasket }: Props) {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [sectionId, setSectionId] = useState<string | null>(null);

  const category: Category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];
  const shown = sectionId
    ? category.sections.filter((s) => s.id === sectionId)
    : category.sections;

  return (
    <section aria-label="Products" className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b-[3px] border-[var(--ink)] px-4 py-2.5">
        <h2 className="display text-2xl">Products</h2>
        <button type="button" onClick={onClose} aria-label="Close products" className="btn btn-light btn-sm">
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          aria-label="Categories"
          className="shrink-0 overflow-y-auto border-b-[3px] border-[var(--ink)] p-2 md:w-52 md:border-b-0 md:border-r-[3px]"
        >
          <ul className="flex gap-1.5 overflow-x-auto md:block md:space-y-1 md:overflow-visible">
            {CATEGORIES.map((c) => {
              const open = c.id === category.id;
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId(c.id);
                      setSectionId(null);
                    }}
                    aria-expanded={open}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 border-[var(--ink)] px-3 py-1.5 text-left text-sm font-extrabold ${
                      open ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white"
                    }`}
                  >
                    {c.label}
                    <span aria-hidden="true" className="hidden text-xs md:inline">
                      {open ? "▾" : "▸"}
                    </span>
                  </button>
                  {open && (
                    <ul className="mt-1 hidden space-y-0.5 pl-2 md:block">
                      {c.sections.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => setSectionId(sectionId === s.id ? null : s.id)}
                            aria-current={sectionId === s.id}
                            className={`w-full rounded-lg px-2.5 py-1 text-left text-sm font-bold ${
                              sectionId === s.id ? "bg-[var(--y1)]" : "hover:bg-[var(--y1)]/50"
                            }`}
                          >
                            {s.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <h3 className="display mb-2 text-2xl leading-none">{category.label}</h3>
          {shown.map((section) => (
            <div key={section.id} className="mb-5">
              <h4 className="mb-2 text-base font-extrabold">{section.label}</h4>
              <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {entriesOf(section).map((entry) => {
                  const added = inBasket.has(entry.term);
                  return (
                    <li key={entry.term}>
                      <button
                        type="button"
                        onClick={() => onAdd(entry)}
                        className="flex h-full w-full flex-col items-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-white p-2 text-center hover:bg-[var(--y1)]"
                      >
                        <ProductImage src={photo(entry)} alt="" size={72} />
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
          ))}
        </div>
      </div>
    </section>
  );
}
