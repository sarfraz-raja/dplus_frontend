import React, { useMemo, useRef, useEffect, useState } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import { Layers } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

// --- Online/offline mode ----------------------------------------------------
// Shares the same VITE_OFFLINE_MAPS_ENABLED flag as TelecomMap.jsx so both the main
// GIS engine map and this KPI dashboard widget switch together.
const IS_OFFLINE_MODE = import.meta.env.VITE_OFFLINE_MAPS_ENABLED !== 'false';

// --- Online basemap ----------------------------------------------------------
// Free CARTO raster basemap, no API key required — same tile source pattern used
// elsewhere in this app (see GeoDrillDownPage.jsx). Requires outbound internet access
// to basemaps.cartocdn.com, which isn't available in every environment this runs in.
const ONLINE_MAP_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap',
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }],
};

// --- Offline basemap ---------------------------------------------------------
// Same local PMTiles source TelecomMap.jsx uses for its "Offline Dark" style — the
// `pmtiles://` protocol is already registered globally in main.jsx, so no extra setup
// is needed here beyond pointing the vector source at the local .pmtiles file.
const PMTILES_PATH = import.meta.env.VITE_PMTILES_PATH || '/tiles/region.pmtiles';

// Local offline style options — same style/sprite pairing convention as TelecomMap.jsx's
// OFFLINE_STYLE_MAP, trimmed to the flavors that have a matching local sprite set
// (public/sprites/{dark,light,grayscale,white}).
const STYLE_OPTIONS = [
  { key: 'dark', label: 'Dark', file: 'protomaps-dark.json', sprite: 'dark' },
  { key: 'light', label: 'Light', file: 'protomaps-light.json', sprite: 'light' },
  { key: 'grayscale', label: 'Grayscale', file: 'protomaps-data-viz-grayscale.json', sprite: 'grayscale' },
];

const DEFAULT_VIEW = {
  latitude: Number(import.meta.env.VITE_DEFAULT_MAP_LAT) || -0.8,
  longitude: Number(import.meta.env.VITE_DEFAULT_MAP_LNG) || 11.6,
  zoom: 5.5,
};

/**
 * Small, self-contained map plotting the "Top Degraded Cells" list — no deck.gl, no
 * Redux, no toolbar. Deliberately lighter than TelecomMap.jsx, which is a full GIS tool
 * not meant for embedding in a compact dashboard card.
 */
export default function DegradedCellsMap({ rows = [] }) {
  const points = useMemo(
    () => rows.filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)),
    [rows]
  );

  // Fallback for the very first paint (before onLoad's fitBounds runs) and the
  // zero-points case — fitBounds below is what actually frames every marker correctly.
  const initialViewState = useMemo(() => {
    if (points.length === 0) return DEFAULT_VIEW;
    const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
    return { latitude: avgLat, longitude: avgLng, zoom: 10 };
  }, [points]);

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
  }, [points]);

  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const [styleKey, setStyleKey] = useState('dark');
  const [pickerOpen, setPickerOpen] = useState(false);
  const activeStyleOption = STYLE_OPTIONS.find((s) => s.key === styleKey) || STYLE_OPTIONS[0];

  // Fetch the selected local vector style and repoint its source at our local .pmtiles
  // file (the checked-in style JSON defaults to Protomaps' remote demo bucket).
  const [offlineStyle, setOfflineStyle] = useState(null);
  useEffect(() => {
    if (!IS_OFFLINE_MODE) return undefined;
    let cancelled = false;
    setOfflineStyle(null);
    fetch(`/styles/${activeStyleOption.file}`)
      .then((res) => res.json())
      .then((style) => {
        if (cancelled) return;
        const patched = { ...style, sources: { ...style.sources } };
        for (const key of Object.keys(patched.sources)) {
          const src = patched.sources[key];
          if (src.url?.includes('protomaps.com')) {
            patched.sources[key] = { ...src, url: `pmtiles://${PMTILES_PATH}`, maxzoom: 15 };
          }
        }
        // Raw style points sprite/glyphs at protomaps.github.io, which corporate
        // firewalls commonly block (see TelecomMap.jsx's loadOfflineStyle for the same
        // fix) — a hard-failed glyph/sprite load can prevent the rest of the style's
        // layers from rendering at all, not just labels/icons. Repoint to local copies.
        if (patched.sprite) patched.sprite = `/sprites/${activeStyleOption.sprite}`;
        if (patched.glyphs) patched.glyphs = '/fonts/{fontstack}/{range}.pbf';
        setOfflineStyle(patched);
      })
      .catch(() => setOfflineStyle({ version: 8, sources: {}, layers: [] }));
    return () => { cancelled = true; };
  }, [styleKey]);

  // Widgets in this dashboard live in a react-grid-layout grid positioned via CSS
  // transforms — the container can still be 0×0 on the first paint after mount, which
  // leaves MapLibre's WebGL canvas permanently blank even though tiles load fine in the
  // background. A ResizeObserver forces the map to recompute its viewport once the
  // container actually has real dimensions (and again on every drag/resize afterward).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mapStyle = IS_OFFLINE_MODE ? offlineStyle : ONLINE_MAP_STYLE;

  if (IS_OFFLINE_MODE && !offlineStyle) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--kpi-text-sub)', fontSize: '0.75rem' }}>
        Loading map…
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Map
        key={points.length ? points.map((p) => p.cellId).join(',') : 'empty'}
        ref={mapRef}
        onLoad={(e) => {
          e.target.resize();
          if (bounds) e.target.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 });
        }}
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%', borderRadius: 'var(--border-radius-md, 8px)' }}
        attributionControl={false}
      >
        {points.map((p) => (
          <Marker key={p.cellId} latitude={p.latitude} longitude={p.longitude}>
            <div
              title={`${p.cellId} — ${p.kpi} ${p.delta}`}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: '#f2b155', border: '1.5px solid #fff',
                boxShadow: '0 0 4px rgba(0,0,0,0.6)',
              }}
            />
          </Marker>
        ))}
      </Map>
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5 }}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          title="Map style"
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '0.375rem', cursor: 'pointer',
          }}
        >
          <Layers size={14} />
        </button>
        {pickerOpen && (
          <div
            style={{
              position: 'absolute', top: 30, right: 0, minWidth: 100,
              background: '#1c1f2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.375rem',
              overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setStyleKey(opt.key); setPickerOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '0.375rem 0.625rem',
                  background: opt.key === styleKey ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: '#fff', border: 'none', fontSize: '0.6875rem', cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {points.length === 0 && (
        <div
          style={{
            position: 'absolute', bottom: 8, left: 8, right: 8,
            background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6875rem',
            padding: '0.25rem 0.5rem', borderRadius: '0.25rem', textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          No cell coordinates available — showing default view
        </div>
      )}
    </div>
  );
}
