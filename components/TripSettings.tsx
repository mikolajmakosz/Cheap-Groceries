"use client";

import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import { IE_TOWER, TRANSPORT_LABELS, type Transport } from "@/lib/trip";
import { setTrip, useTripSettings } from "@/lib/tripStore";

const chip = (on: boolean) =>
  `rounded-xl border-2 border-[var(--ink)] px-2.5 py-1 text-xs font-extrabold ${
    on ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white"
  }`;

/**
 * Where your shopping trip starts and how you get about. The anchor is a place
 * you go anyway and come home from (IE Tower, your gym…); shopping on the way
 * home from it costs only the detour. "From home" counts the whole trip.
 */
export default function TripSettings({ compact = false }: { compact?: boolean }) {
  const trip = useTripSettings();
  const [pickingAnchor, setPickingAnchor] = useState(false);
  const [open, setOpen] = useState(!compact);
  const custom = trip.anchor.label !== IE_TOWER.label;

  // Folded: one line with where you come from, how you travel and your home,
  // and the home field itself while there is none, since everything uses it.
  if (!open) {
    return (
      <section aria-label="Your trip" className="rounded-2xl border-2 border-[var(--ink)] bg-white p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate font-bold">
            {trip.start === "home" ? "From home" : `On my way home from ${trip.anchor.label}`} ·{" "}
            {TRANSPORT_LABELS[trip.transport]}
            {trip.home ? ` · Home: ${trip.home.label.split(",").slice(0, 2).join(",")}` : ""}
          </span>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 font-extrabold underline">
            Change
          </button>
        </div>
        {!trip.home && <AddressSearch onPlace={(place) => setTrip({ home: place })} />}
      </section>
    );
  }

  return (
    <section aria-label="Your trip" className="rounded-2xl border-2 border-[var(--ink)] bg-white p-3">
      {compact && (
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={() => setOpen(false)} className="text-xs font-extrabold underline">
            Done
          </button>
        </div>
      )}
      <div role="group" aria-label="Where you shop from" className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={trip.start === "anchor"} onClick={() => setTrip({ start: "anchor" })} className={chip(trip.start === "anchor")}>
          On my way home
        </button>
        <button type="button" aria-pressed={trip.start === "home"} onClick={() => setTrip({ start: "home" })} className={chip(trip.start === "home")}>
          From home
        </button>
      </div>

      {trip.start === "anchor" && (
        <div className="mt-2.5">
          <p className="text-xs font-bold">
            Coming from <span className="rounded bg-[var(--y1)] px-1">{trip.anchor.label}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={!custom}
              onClick={() => {
                setTrip({ anchor: IE_TOWER });
                setPickingAnchor(false);
              }}
              className={chip(!custom)}
            >
              IE Tower
            </button>
            <button type="button" aria-pressed={custom || pickingAnchor} onClick={() => setPickingAnchor(true)} className={chip(custom || pickingAnchor)}>
              Gym, class or other place…
            </button>
          </div>
          {pickingAnchor && (
            <AddressSearch
              id="anchor-address"
              label="Where you come from (your gym, a class…)"
              placeholder="Calle de Bravo Murillo 100"
              onPlace={(place) => {
                setTrip({ anchor: { lat: place.lat, lon: place.lon, label: place.label.split(",")[0] } });
                setPickingAnchor(false);
              }}
            />
          )}
        </div>
      )}

      <div className="mt-2.5">
        {trip.home ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              <strong>Home:</strong> {trip.home.label}
            </span>
            <button type="button" onClick={() => setTrip({ home: null })} className="shrink-0 font-bold underline">
              Remove
            </button>
          </div>
        ) : (
          <AddressSearch onPlace={(place) => setTrip({ home: place })} />
        )}
      </div>

      <div className="mt-2.5">
        <p className="text-xs font-bold">Getting about</p>
        <div role="group" aria-label="Transport" className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(TRANSPORT_LABELS) as Transport[]).map((t) => (
            <button key={t} type="button" aria-pressed={trip.transport === t} onClick={() => setTrip({ transport: t })} className={chip(trip.transport === t)}>
              {TRANSPORT_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Estimated times, not a timetable. Short hops are walked.
        </p>
      </div>
    </section>
  );
}
