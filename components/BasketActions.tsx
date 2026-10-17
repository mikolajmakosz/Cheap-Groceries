"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Props = {
  count: number;
  onClear: () => Promise<void>;
  onSave: (name: string) => Promise<{ ok: boolean; error?: string }>;
};

/**
 * Keep this basket for later, or empty it. Emptying asks first, because it
 * removes everything at once and there is no undo.
 */
export default function BasketActions({ count, onClear, onSave }: Props) {
  const [mode, setMode] = useState<"idle" | "saving" | "confirmClear">("idle");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await onSave(name.trim() || "My basket");
    setBusy(false);
    if (result.ok) {
      setMode("idle");
      setName("");
      setMessage({ text: "Saved.", ok: true });
    } else {
      setMessage({ text: result.error ?? "Could not save the basket.", ok: false });
    }
  }

  async function handleClear() {
    setBusy(true);
    await onClear();
    setBusy(false);
    setMode("idle");
    setMessage(null);
  }

  return (
    <div className="mt-3">
      {mode === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("saving");
              setMessage(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Save this basket
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("confirmClear");
              setMessage(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            Clear basket
          </button>
          <Link href="/saved" className="text-xs font-medium text-emerald-700 underline">
            Saved baskets
          </Link>
        </div>
      )}

      {mode === "saving" && (
        <form onSubmit={handleSave} className="rounded-lg border border-slate-200 p-2.5">
          <label htmlFor="basket-name" className="block text-xs font-medium text-slate-700">
            Name this basket
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="basket-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Week of 19 October"
              maxLength={60}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "confirmClear" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-900">
          <p className="font-semibold">
            Remove all {count} {count === 1 ? "product" : "products"} from your basket?
          </p>
          <p className="mt-0.5 text-red-800">This cannot be undone. Saved baskets are not touched.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={busy}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Clearing…" : "Yes, clear it"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-2 text-xs font-medium ${message.ok ? "text-emerald-700" : "text-red-600"}`}
        >
          {message.text}
          {message.ok && (
            <>
              {" "}
              <Link href="/saved" className="underline">
                Open saved baskets
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
