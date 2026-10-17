"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { CAMPUS, STORES, formatWalk, type Store } from "@/lib/geo";

/** Chains we hold prices for get the strong colour; the rest are muted. */
const PRICED_COLOUR = "#059669";
const PLAIN_COLOUR = "#94a3b8";

export type StoreMapProps = {
  /** Chain name -> what this basket costs there, when we can price it. */
  costByChain?: Record<string, string | undefined>;
  /** Chains we have a catalogue for. Others render muted. */
  pricedChains?: string[];
  /** Fill the positioned parent instead of using a fixed height. */
  fill?: boolean;
  heightClass?: string;
  /** Centre on this store and open its popup. */
  focusStoreId?: string | null;
  /** Pixels at the left covered by a floating panel; keeps focus out of it. */
  leftInset?: number;
};

type Leaflet = typeof import("leaflet");

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

function dotIcon(L: Leaflet, priced: boolean) {
  const colour = priced ? PRICED_COLOUR : PLAIN_COLOUR;
  const size = priced ? 18 : 14;
  // Default Leaflet pins load images by relative path, which bundlers break.
  // A div marker also lets each chain carry its own colour.
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${colour};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function StoreMap({
  costByChain = {},
  pricedChains = [],
  fill = false,
  heightClass = "h-80",
  focusStoreId = null,
  leftInset = 0,
}: StoreMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const leaflet = useRef<Leaflet | null>(null);
  const markers = useRef(new Map<string, Marker>());

  // Compared by content: callers build these during render, so comparing by
  // identity would redo the work on every render.
  const costKey = JSON.stringify(costByChain);
  const pricedKey = JSON.stringify(pricedChains);

  // What the markers should currently say. Read by the effects, written after
  // each render, so the map itself never has to be rebuilt.
  const latest = useRef({ costByChain, pricedChains, leftInset });
  useEffect(() => {
    latest.current = { costByChain, pricedChains, leftInset };
  });

  function refresh() {
    const L = leaflet.current;
    if (!L) return;
    const { costByChain: costs, pricedChains: priced } = latest.current;
    for (const store of STORES) {
      const marker = markers.current.get(store.id);
      if (!marker) continue;
      const isPriced = priced.includes(store.chain);
      marker.setIcon(dotIcon(L, isPriced));
      marker.setPopupContent(popupHtml(store, costs[store.chain], isPriced));
      marker.setZIndexOffset(isPriced ? 500 : 0);
    }
  }

  // Build the map once.
  useEffect(() => {
    const element = container.current;
    const registry = markers.current;
    if (!element) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;

    // Leaflet touches window on import, so it can only load in the browser.
    import("leaflet").then((L) => {
      if (cancelled || !element) return;
      leaflet.current = L;

      const instance = L.map(element, {
        center: [CAMPUS.lat, CAMPUS.lon],
        zoom: 15,
        scrollWheelZoom: fill,
        zoomControl: false,
      });
      map.current = instance;

      // Bottom right, clear of the basket panel that floats over the left.
      L.control.zoom({ position: "bottomright" }).addTo(instance);

      // Start with IE Tower in the part of the map the panel leaves visible.
      if (latest.current.leftInset > 0) {
        const at = instance.project([CAMPUS.lat, CAMPUS.lon], 15);
        instance.setView(
          instance.unproject(at.subtract([latest.current.leftInset / 2, 0]), 15),
          15,
          { animate: false },
        );
      }

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(instance);

      L.marker([CAMPUS.lat, CAMPUS.lon], {
        title: CAMPUS.name,
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#0f172a;color:#fff;font:600 11px/1 system-ui;padding:5px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35)">IE Tower</div>`,
          iconSize: [66, 22],
          iconAnchor: [33, 11],
        }),
      }).addTo(instance);

      for (const store of STORES) {
        const marker = L.marker([store.lat, store.lon], {
          title: store.chain,
          icon: dotIcon(L, false),
        })
          .bindPopup("", {
            autoPanPaddingTopLeft: L.point(latest.current.leftInset + 20, 20),
          })
          .addTo(instance);
        markers.current.set(store.id, marker);
      }

      refresh();

      // The page can resize the container (rotating a phone, a panel opening).
      observer = new ResizeObserver(() => instance.invalidateSize());
      observer.observe(element);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      leaflet.current = null;
      registry.clear();
    };
  }, [fill]);

  // Keep popups and colours in step with the basket, without moving the view.
  useEffect(() => {
    refresh();
  }, [costKey, pricedKey]);

  // Fly to a chosen store, or back to campus when none is chosen.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const marker = focusStoreId ? markers.current.get(focusStoreId) : null;
    const point = marker ? marker.getLatLng() : { lat: CAMPUS.lat, lng: CAMPUS.lon };

    const zoom = marker ? 16 : 15;
    const target = instance.project(point, zoom);
    // Centre the target in the part of the map the panel does not cover.
    const centre = instance.unproject(target.subtract([leftInset / 2, 0]), zoom);

    if (!marker) {
      instance.setView(centre, zoom, { animate: false });
      return;
    }
    instance.flyTo(centre, zoom, { duration: 0.8 });
    instance.once("moveend", () => marker.openPopup());
  }, [focusStoreId, leftInset]);

  if (fill) {
    return (
      <div
        ref={container}
        className="absolute inset-0"
        role="application"
        aria-label={`Map of supermarkets near ${CAMPUS.name}`}
      />
    );
  }

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
