"use client";

import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import { CAMPUS, STORES, formatWalk, type Point, type Store } from "@/lib/geo";
import { logoFor } from "@/lib/shops";

const PRICED_COLOUR = "#059669";
const PLAIN_COLOUR = "#94a3b8";
const HOME_COLOUR = "#2563eb";

export type MapRoute = {
  /** Campus to the chosen shop. Drawn in green. */
  toStore: [number, number][];
  /** The chosen shop to home. Drawn in blue, dashed. */
  toHome?: [number, number][];
};

export type StoreMapProps = {
  /** Chains we hold prices for. Others render as muted dots. */
  pricedChains?: string[];
  /** Chain name -> what the basket costs there, shown on hover. */
  costByChain?: Record<string, string | undefined>;
  /** Fill the positioned parent instead of using a fixed height. */
  fill?: boolean;
  heightClass?: string;
  selectedStoreId?: string | null;
  onSelectStore?: (store: Store) => void;
  route?: MapRoute | null;
  home?: Point | null;
  /** Pixels at the left covered by a floating panel; keeps the view out of it. */
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

function tooltipHtml(store: Store, cost: string | undefined, priced: boolean) {
  const lines = [
    `<strong>${escapeHtml(store.chain)}</strong>`,
    store.street ? escapeHtml(store.street) : "",
    "about " + escapeHtml(formatWalk(CAMPUS, store)) + " from IE Tower",
    priced && cost ? `Your basket: <strong>${escapeHtml(cost)}</strong>` : "",
  ].filter(Boolean);
  return `<div style="font-size:12px;line-height:1.45">${lines.join("<br/>")}</div>`;
}

function storeIcon(L: Leaflet, chain: string, priced: boolean, selected: boolean) {
  const logo = logoFor(chain);
  const colour = priced ? PRICED_COLOUR : PLAIN_COLOUR;
  const ring = selected ? `0 0 0 4px rgba(5,150,105,.35),` : "";

  // Leaflet's stylesheet forces max-width/max-height to none on marker images,
  // so the logo is sized with width and height, never with a maximum.
  if (priced && logo) {
    return L.divIcon({
      className: "",
      html: `<div style="display:flex;align-items:center;justify-content:center;width:50px;height:32px;background:#fff;border:${selected ? 3 : 2}px solid ${colour};border-radius:9px;box-shadow:${ring}0 1px 4px rgba(0,0,0,.4)"><img src="${logo}" alt="" style="display:block;width:38px;height:20px;object-fit:contain"/></div>`,
      iconSize: [50, 32],
      iconAnchor: [25, 16],
    });
  }

  const size = priced ? 18 : 14;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${colour};border:2px solid #fff;box-shadow:${ring}0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function StoreMap({
  pricedChains = [],
  costByChain = {},
  fill = false,
  heightClass = "h-80",
  selectedStoreId = null,
  onSelectStore,
  route = null,
  home = null,
  leftInset = 0,
}: StoreMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const leaflet = useRef<Leaflet | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const overlay = useRef<LayerGroup | null>(null);

  // Compared by content: callers build these during render, so comparing by
  // identity would redo the work on every render.
  const costKey = JSON.stringify(costByChain);
  const pricedKey = JSON.stringify(pricedChains);

  // What the markers should currently say. Read by the effects, written after
  // each render, so the map itself never has to be rebuilt.
  const latest = useRef({
    costByChain,
    pricedChains,
    leftInset,
    selectedStoreId,
    onSelectStore,
  });
  useEffect(() => {
    latest.current = {
      costByChain,
      pricedChains,
      leftInset,
      selectedStoreId,
      onSelectStore,
    };
  });

  function refresh() {
    const L = leaflet.current;
    if (!L) return;
    const { costByChain: costs, pricedChains: priced, selectedStoreId: selected } =
      latest.current;

    for (const store of STORES) {
      const marker = markers.current.get(store.id);
      if (!marker) continue;
      const isPriced = priced.includes(store.chain);
      const isSelected = store.id === selected;
      marker.setIcon(storeIcon(L, store.chain, isPriced, isSelected));
      marker.setTooltipContent(tooltipHtml(store, costs[store.chain], isPriced));
      marker.setZIndexOffset(isSelected ? 900 : isPriced ? 500 : 0);
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

      // Bottom right, clear of the panel that floats over the left.
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

      overlay.current = L.layerGroup().addTo(instance);

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
          icon: storeIcon(L, store.chain, false, false),
        })
          .bindTooltip("", { direction: "top", offset: [0, -14] })
          .on("click", () => latest.current.onSelectStore?.(store))
          .addTo(instance);
        registry.set(store.id, marker);
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
      overlay.current = null;
      registry.clear();
    };
  }, [fill]);

  // Keep tooltips and colours in step with the basket and the selection,
  // without moving the view.
  useEffect(() => {
    refresh();
  }, [costKey, pricedKey, selectedStoreId]);

  // Draw the route, and the way on to home, and frame them in the visible part.
  useEffect(() => {
    const L = leaflet.current;
    const instance = map.current;
    const layer = overlay.current;
    if (!L || !instance || !layer) return;

    layer.clearLayers();
    const bounds = L.latLngBounds([[CAMPUS.lat, CAMPUS.lon]]);

    if (route?.toStore.length) {
      // A white casing under the green line keeps it readable on busy streets.
      L.polyline(route.toStore, { color: "#ffffff", weight: 10, opacity: 0.9 }).addTo(layer);
      L.polyline(route.toStore, { color: PRICED_COLOUR, weight: 6, opacity: 0.95 }).addTo(layer);
      route.toStore.forEach((point) => bounds.extend(point));
    }

    if (route?.toHome?.length) {
      L.polyline(route.toHome, { color: "#ffffff", weight: 9, opacity: 0.9 }).addTo(layer);
      L.polyline(route.toHome, {
        color: HOME_COLOUR,
        weight: 5,
        opacity: 0.95,
        dashArray: "2 9",
        lineCap: "round",
      }).addTo(layer);
      route.toHome.forEach((point) => bounds.extend(point));
    }

    if (home) {
      L.marker([home.lat, home.lon], {
        title: "Home",
        zIndexOffset: 800,
        icon: L.divIcon({
          className: "",
          html: `<div style="background:${HOME_COLOUR};color:#fff;font:600 11px/1 system-ui;padding:5px 9px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4)">Home</div>`,
          iconSize: [52, 22],
          iconAnchor: [26, 11],
        }),
      }).addTo(layer);
      bounds.extend([home.lat, home.lon]);
    }

    if (route?.toStore.length || home) {
      instance.fitBounds(bounds, {
        paddingTopLeft: [leftInset + 40, 60],
        paddingBottomRight: [50, 70],
        maxZoom: 17,
        animate: true,
      });
    }
  }, [route, home, leftInset]);

  // With nothing chosen, keep campus in the part of the map the panel leaves free.
  useEffect(() => {
    const instance = map.current;
    if (!instance || route || home) return;
    const target = instance.project([CAMPUS.lat, CAMPUS.lon], 15);
    instance.setView(instance.unproject(target.subtract([leftInset / 2, 0]), 15), 15, {
      animate: false,
    });
  }, [leftInset, route, home]);

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
        {STORES.length} supermarkets within 2 km of {CAMPUS.name}.
      </p>
    </div>
  );
}
