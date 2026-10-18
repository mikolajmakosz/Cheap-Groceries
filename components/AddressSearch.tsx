"use client";

import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  geocodeMadrid,
  suggestAddresses,
  type AddressSuggestion,
  type Place,
} from "@/lib/geocode";

type Props = {
  onPlace: (place: Place) => void;
};

/** A house number the person typed, e.g. the 20 in "General Pintos 20". */
function typedNumber(text: string): string | null {
  return text.match(/(?:^|[\s,])(\d{1,3})(?=\s*$|[\s,])/)?.[1] ?? null;
}

/**
 * An address field for Madrid that suggests streets while you type.
 *
 * Suggestions know streets well and house numbers poorly, so when a number was
 * typed, picking a street does one exact lookup with it, and falls back to the
 * middle of the street if that finds nothing.
 */
export default function AddressSearch({ onPlace }: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) return;

    const controller = new AbortController();
    // Wait for a pause in typing, so the service sees one question, not a stream.
    const timer = setTimeout(async () => {
      const found = await suggestAddresses(text, controller.signal);
      if (!controller.signal.aborted) setResults(found);
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const visible = focused && query.trim().length >= 3 ? results : [];

  async function choose(suggestion: AddressSuggestion) {
    setBusy(true);
    setError(null);
    setFocused(false);
    setActive(-1);

    const number = typedNumber(query);
    let place: Place = suggestion;

    if (number && suggestion.street) {
      const exact = await geocodeMadrid(`${suggestion.street} ${number}`);
      if (exact) place = exact;
    }

    setQuery(place.label);
    setBusy(false);
    onPlace(place);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active >= 0 && visible[active]) {
      await choose(visible[active]);
      return;
    }

    setBusy(true);
    setError(null);
    const place = await geocodeMadrid(query);
    setBusy(false);

    if (!place) {
      setError("Address not found. Try street and number.");
      return;
    }
    setQuery(place.label);
    onPlace(place);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (visible.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <label htmlFor="home-address" className="block text-xs font-bold">
        Your home (optional)
      </label>

      <div className="mt-1 flex gap-2">
        <input
          id="home-address"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
            setError(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Calle General Pintos 20"
          autoComplete="off"
          role="combobox"
          aria-expanded={visible.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          className="field min-w-0 flex-1 !py-1.5 !text-sm"
        />
        <button
          type="submit"
          disabled={busy || query.trim().length < 3}
          className="btn btn-sm"
        >
          {busy ? "…" : "Show"}
        </button>
      </div>

      {visible.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="mt-1.5 overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-white"
        >
          {visible.map((suggestion, index) => (
            <li key={suggestion.label} role="option" aria-selected={index === active}>
              <button
                type="button"
                // Keeps the field focused so the list does not close before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void choose(suggestion)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-[var(--y1)] ${
                  index === active ? "bg-[var(--y1)]" : ""
                }`}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-slate-500">
        Sent to OpenStreetMap to find it. Not stored.
      </p>
    </form>
  );
}
