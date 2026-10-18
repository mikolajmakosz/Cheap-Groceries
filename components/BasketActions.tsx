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
      setMessage({ text: result.error ?? "Could not save.", ok: false });
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
            className="btn btn-sm"
          >
            Save basket
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("confirmClear");
              setMessage(null);
            }}
            className="btn btn-light btn-sm"
          >
            Clear
          </button>
        </div>
      )}

      {mode === "saving" && (
        <form onSubmit={handleSave} className="flex gap-2">
          <input
            id="basket-name"
            type="text"
            aria-label="Basket name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name, e.g. Week 1"
            maxLength={60}
            autoFocus
            className="field min-w-0 flex-1 !py-1.5 !text-sm"
          />
          <button type="submit" disabled={busy} className="btn btn-sm">
            {busy ? "…" : "Save"}
          </button>
          <button type="button" onClick={() => setMode("idle")} className="btn btn-light btn-sm">
            ×
          </button>
        </form>
      )}

      {mode === "confirmClear" && (
        <div className="rounded-xl border-2 border-[var(--red)] bg-red-50 p-2.5 text-sm">
          <p className="font-extrabold">
            Remove all {count} {count === 1 ? "product" : "products"}?
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={handleClear} disabled={busy} className="btn btn-sm">
              {busy ? "…" : "Yes, clear"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="btn btn-light btn-sm">
              Keep
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-2 text-sm font-bold ${message.ok ? "" : "text-red-600"}`}
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
