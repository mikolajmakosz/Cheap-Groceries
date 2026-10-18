"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import ProductImage from "@/components/ProductImage";
import { formatEuro, suggest } from "@/lib/pricing";
import type { CatalogueEntry } from "@/lib/catalogue";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Called when someone clicks a suggestion. */
  onPick: (entry: CatalogueEntry) => void;
  /** Called for whatever is in the box, exactly as typed. */
  onSubmit: () => void;
  buttonLabel: string;
  placeholder: string;
  ariaLabel: string;
  busy?: boolean;
  /** Puts the grading contract's test ids on the field and its button. */
  contractIds?: boolean;
};

function offerSummary(entry: CatalogueEntry): string {
  return Object.entries(entry.offers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([store, offer]) => `${store} ${formatEuro(offer.price_eur)}`)
    .join(" · ");
}

function thumbnail(entry: CatalogueEntry): string | null {
  return (
    Object.values(entry.offers).find((offer) => offer.image)?.image ?? null
  );
}

/**
 * A search box that suggests products with their photos and prices as you type.
 *
 * The suggestions are a shortcut. The button always saves exactly what is in
 * the box, so a word the catalogue does not know is never refused.
 */
export default function ProductSearch({
  value,
  onChange,
  onPick,
  onSubmit,
  buttonLabel,
  placeholder,
  ariaLabel,
  busy = false,
  contractIds = false,
}: Props) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);

  const suggestions = suggest(value);
  const open = focused && suggestions.length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter" && active >= 0) {
      // Only an explicitly highlighted suggestion is picked. Plain Enter falls
      // through to submit, which saves what was typed.
      event.preventDefault();
      onPick(suggestions[active]);
      setActive(-1);
    } else if (event.key === "Escape") {
      setFocused(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActive(-1);
    onSubmit();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setActive(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          data-testid={contractIds ? "core-input" : undefined}
          className="field min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={busy}
          data-testid={contractIds ? "core-submit" : undefined}
          className="btn px-5 py-2.5"
        >
          {busy ? "Adding…" : buttonLabel}
        </button>
      </form>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="mt-2 overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-white"
        >
          {suggestions.map((entry, index) => (
            <li
              key={entry.term}
              role="option"
              aria-selected={index === active}
            >
              <button
                type="button"
                // Keeps the input focused, so the list does not close before
                // the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(entry);
                  setActive(-1);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--y1)] ${
                  index === active ? "bg-[var(--y1)]" : ""
                }`}
              >
                <ProductImage src={thumbnail(entry)} alt="" size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold">
                    {entry.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {offerSummary(entry)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
