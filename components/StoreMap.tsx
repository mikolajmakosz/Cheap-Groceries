"use client";

import { useEffect, useRef } from "react";
import { CAMPUS, STORES, formatWalk, walkingMetres, type Store } from "@/lib/geo";

/** Chains we hold prices for get the strong colour; the rest are muted. */
const PRICED_COLOUR = "#059669";
const PLAIN_COLOUR = "#94a3b8";

export type StoreMapProps = {
  /** Chain name -> what this basket costs there, when we can price it. */
  costByChain?: Record<string, string | undefined>;
  /** Chains we have a catalogue for. Others render muted. */
  pricedChains?: string[];
  heightClass?: string;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function popupHtml(store: Store, cost: string | undefined, priced: boolean) {
  const walk = formatWalk(CAMPUS, store);
  const line = priced
    ? cost
      ? `<div style="margin-top:4px;font-weight:600">Your basket: ${escapeHtml(cost)}</div>`
      : `<div style="margin-top:4px;color:#64748b">Add products to see the cost here</div>`
    : `<div style="margin-top:4px;color:#64748b">Prices not collected yet</div>`;

  return `
    <div style="font-size:13px;line-height:1.4">
      <div style="font-weight:700">${escapeHtml(store.chain)}</div>
      ${store.street ? `<div style="color:#64748b">${escapeHtml(store.street)}</div>` : ""}
      <div style="margin-top:4px">${escapeHtml(walk)} from IE Tower</div>
      ${line}
    </div>`;
}

export default function StoreMap({
  costByChain = {},
  pricedChains = [],
  heightClass = "h-80",
}: StoreMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    // Leaflet touches window on import, so it can only load in the browser.
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;

      map = L.map(container.current, {
        center: [CAMPUS.lat, CAMPUS.lon],
        zoom: 14,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.marker([CAMPUS.lat, CAMPUS.lon], {
        title: CAMPUS.name,
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#0f172a;color:#fff;font:600 11px/1 system-ui;padding:5px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35)">IE Tower</div>`,
          iconSize: [66, 22],
          iconAnchor: [33, 11],
        }),
      }).addTo(map);

      const sorted = [...STORES].sort(
        (a, b) => walkingMetres(CAMPUS, a) - walkingMetres(CAMPUS, b),
      );

      for (const store of sorted) {
        const priced = pricedChains.includes(store.chain);
        const colour = priced ? PRICED_COLOUR : PLAIN_COLOUR;

        L.marker([store.lat, store.lon], {
          title: store.chain,
          // Default Leaflet pins load images by relative path, which bundlers
          // break. A div marker also lets each chain carry its own colour.
          icon: L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:999px;background:${colour};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        })
          .bindPopup(popupHtml(store, costByChain[store.chain], priced))
          .addTo(map);
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
    // Compared by content: the caller builds these objects during render, so
    // comparing by identity would tear down and rebuild the map every time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(costByChain), JSON.stringify(pricedChains)]);

  return (
    <div>
      <div
        ref={container}
        className={`${heightClass} w-full overflow-hidden rounded-xl border border-slate-200`}
        role="application"
        aria-label={`Map of supermarkets near ${CAMPUS.name}`}
      />
      <p className="mt-2 text-xs text-slate-500">
        {STORES.length} supermarkets within 2 km of {CAMPUS.name}. Walking times
        are estimates from straight-line distance, not routed directions.
      </p>
    </div>
  );
}
