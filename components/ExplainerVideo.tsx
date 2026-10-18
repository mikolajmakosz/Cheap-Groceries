"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "How it works": the 88-second explainer, opened over the map on request so
 * the landing page itself stays a map and a card. English captions are on by
 * default, since the video has a voice-over.
 */
export default function ExplainerVideo() {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-light w-full py-2.5">
        ▶ How it works <span className="font-sans text-sm normal-case">(1:28)</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="How Cheap Groceries works"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-[var(--ink)]/80 p-3 sm:p-8"
        >
          <div onClick={(event) => event.stopPropagation()} className="card w-full max-w-4xl overflow-hidden p-2 sm:p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="display text-xl sm:text-2xl">How it works</h2>
              <button ref={closeButton} type="button" onClick={() => setOpen(false)} className="btn btn-light btn-sm">
                Close
              </button>
            </div>
            <video
              src="/video/explainer.mp4"
              poster="/video/explainer-poster.jpg"
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-xl bg-[var(--ink)]"
            >
              <track kind="captions" src="/video/explainer.en.vtt" srcLang="en" label="English" default />
            </video>
          </div>
        </div>
      )}
    </>
  );
}
