"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSignedIn } from "@/lib/useSignedIn";

/**
 * A first-visit walkthrough: one element at a time is lit up, the rest of the
 * screen is dimmed, and a speech bubble says what to do. It starts by itself
 * the first time a signed-in person arrives, and the "Tutorial" button bottom
 * left starts it again.
 *
 * Nothing in it blocks the page: the dimming lets every click through, so the
 * app works exactly the same with the tour on screen.
 */
type Step = { path: string; target: string; title: string; text: string };

const STEPS: Step[] = [
  { path: "/", target: "open-basket", title: "Start here", text: "Open your basket: this is where you build your shopping list." },
  { path: "/app", target: "search", title: "Type a product", text: "Write what you buy, like milk or pasta, in English or Spanish, then press Add. Or use Browse products." },
  { path: "/app", target: "quantity", title: "Set the amount", text: "Use − and + to buy more or less of it." },
  { path: "/app", target: "compare", title: "Compare the shops", text: "This is the cheapest shop for it. Open All 4 shops to see every price." },
  { path: "/app", target: "search", title: "Add the next product", text: "Keep going: add everything you need this week." },
  { path: "/app", target: "trip", title: "Add your address", text: "Type your home address, so we count the real time a shop costs you. It is not stored." },
  { path: "/app", target: "trip", title: "Where do you come from?", text: "Click Change: shop on your way home from IE Tower, your gym or a class, or go from home. Pick how you get about too." },
  { path: "/app", target: "shops", title: "Choose a shop", text: "The four supermarkets with price and time. Click one to see the way there, or switch to Delivery." },
  { path: "/app", target: "save", title: "Save your basket", text: "Give it a name, like Week 1, to find it again." },
  { path: "/app", target: "saved-link", title: "See your baskets", text: "Click Saved baskets to open them." },
  { path: "/saved", target: "settlement", title: "Your settlement", text: "Basket price, price per month and the time it takes. Show details lets you pick a day, week or month and see the time saved on your way home." },
  { path: "/saved", target: "details", title: "Compare the macros", text: "Open the details to compare kcal, protein, fat and carbs of your basket in each shop." },
];

const KEY = "cg-tour";
type Saved = { step: number | null; done: boolean };

function read(): Saved {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : { step: null, done: false };
  } catch {
    return { step: null, done: false };
  }
}

function write(value: Saved) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // A private window can refuse storage; the tour then simply shows again.
  }
}

/** The first step that belongs on this page. */
function firstStepOn(path: string): number {
  const index = STEPS.findIndex((step) => step.path === path);
  return index === -1 ? 0 : index;
}

type Box = { top: number; left: number; width: number; height: number };

export default function Tour() {
  const path = usePathname();
  const signedIn = useSignedIn();
  const [state, setState] = useState<Saved>({ step: null, done: true });
  const [box, setBox] = useState<Box | null>(null);

  const save = useCallback((value: Saved) => {
    write(value);
    setState(value);
  }, []);

  // Start by itself the first time a signed-in person is on a page the tour covers.
  useEffect(() => {
    if (signedIn !== true) return;
    const saved = read();
    const start = !saved.done && saved.step === null && STEPS.some((s) => s.path === path);
    const value = start ? { step: firstStepOn(path), done: false } : saved;
    if (start) write(value);
    // Reading browser storage on arrival; the state it sets is not derived from render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(value);
  }, [signedIn, path]);

  // The "Tutorial" button.
  useEffect(() => {
    const start = () => save({ step: firstStepOn(window.location.pathname), done: false });
    window.addEventListener("cg-tour-start", start);
    return () => window.removeEventListener("cg-tour-start", start);
  }, [save]);

  const step = state.step !== null && !state.done ? STEPS[state.step] : null;
  const here = step && step.path === path ? step : null;

  // Follow the lit element as the page changes, scrolls or resizes.
  useEffect(() => {
    if (!here) return;
    const find = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour="${here.target}"]`);
      if (!element) {
        setBox(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      setBox({ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 });
    };
    const first = document.querySelector<HTMLElement>(`[data-tour="${here.target}"]`);
    first?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    find();
    const timer = window.setInterval(find, 300);
    window.addEventListener("resize", find);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", find);
    };
  }, [here]);

  if (!here || state.step === null) return null;

  const index = state.step;
  const last = index === STEPS.length - 1;
  const next = () => save(last ? { step: null, done: true } : { step: index + 1, done: false });
  const back = () => save({ step: Math.max(0, index - 1), done: false });
  const stop = () => save({ step: null, done: true });

  // The bubble goes beside the lit element where there is room (over the map on
  // a laptop), otherwise below or above it, and never under the header.
  const bubbleWidth = 300;
  const viewportW = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportH = typeof window === "undefined" ? 800 : window.innerHeight;
  let style: React.CSSProperties = { left: (viewportW - bubbleWidth) / 2, top: viewportH / 3, width: bubbleWidth };
  if (box) {
    const right = box.left + box.width + 14;
    if (right + bubbleWidth < viewportW - 8) {
      style = { left: right, top: Math.max(70, Math.min(box.top, viewportH - 230)), width: bubbleWidth };
    } else if (box.top + box.height + 200 < viewportH) {
      style = { left: Math.max(8, Math.min(box.left, viewportW - bubbleWidth - 8)), top: box.top + box.height + 12, width: bubbleWidth };
    } else {
      style = { left: Math.max(8, Math.min(box.left, viewportW - bubbleWidth - 8)), top: Math.max(70, box.top - 200), width: bubbleWidth };
    }
  }

  return (
    <>
      {/* The dimming is a ring of shadow round the lit element; it lets every click through. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[1900] rounded-2xl transition-all duration-200"
        style={
          box
            ? { top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgba(20,20,15,0.55)", outline: "4px solid #f8e08a" }
            : { inset: 0, background: "rgba(20,20,15,0.45)" }
        }
      />
      <div
        role="dialog"
        aria-live="polite"
        aria-label={`Tutorial step ${index + 1} of ${STEPS.length}: ${here.title}`}
        className="card fixed z-[1950] p-4"
        style={style}
      >
        <p className="text-[11px] font-extrabold uppercase text-slate-500">
          Step {index + 1} of {STEPS.length}
        </p>
        <h2 className="display mt-1 text-xl leading-tight">{here.title}</h2>
        <p className="mt-1.5 text-sm">{here.text}</p>
        {!box && <p className="mt-1.5 text-xs text-slate-500">Do the step before this one first, then click Next.</p>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={stop} className="text-xs font-bold underline">
            Skip tutorial
          </button>
          <span className="flex gap-1.5">
            {index > 0 && (
              <button type="button" onClick={back} className="btn btn-light btn-sm">
                Back
              </button>
            )}
            <button type="button" onClick={next} className="btn btn-sm">
              {last ? "Done" : "Next"}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}

/** Bottom left on every page of a signed-in person: starts the walkthrough again. */
export function TutorialButton() {
  const signedIn = useSignedIn();
  if (!signedIn) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("cg-tour-start"))}
      className="btn btn-light btn-sm fixed bottom-4 left-4 z-[1800]"
    >
      ? Tutorial
    </button>
  );
}
