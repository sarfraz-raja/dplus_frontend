// OLD: import React, { useEffect, useMemo, useRef, useState } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import { WebMercatorViewport } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import { IS_OFFLINE_MODE, DEFAULT_MAP_VIEW, OFFLINE_STYLE_MAP, getMapStyle, loadOfflineStyle } from '../../MapsUsingDeckgl/Utils/basemapStyles';
// OLD: import { toMapItems, buildColorScale, buildSectorLayer, buildSiteLayer } from './mapChartLayers';
// OLD: import { toMapItems, buildColorScale, buildSectorLayer, buildSiteLayer, sortForDrawing } from './mapChartLayers';
import { toMapItems, buildColorScale, buildSectorLayer, buildSiteLayer, sortForDrawing, MIN_CELL_PX_DEFAULT } from './mapChartLayers';
import { isDarkColor } from '../utils/contrast';
import { POSITION_TEXT_ALIGN } from '../../Widgets/titlePositions';
import { useMapSlot, MAX_LIVE_MAPS } from './mapSlots';

// Same as TelecomMap: no deck.gl widgets (zoom buttons etc.) — the map is driven by mouse/touch.
const DECK_WIDGETS_NONE = [];
// Closest the fit-to-data view zooms in (TelecomMap.fitToData caps at 13 too).
const MAX_FIT_ZOOM = 13;
// The backend returns at most this many rows for a TABLE chart (nms-backend dashboard_builder.py
// WIDGET_ROW_LIMIT) — a Map chart is saved as one. Getting exactly this many means there may be more.
const BACKEND_ROW_LIMIT = 5000;
// Resizes settle (card drag-resize, panel open/close) before the view refits.
const RESIZE_REFIT_MS = 150;

// Map chart — Chart Library type MAP (saved as TABLE + mapping.chart_variant 'map', see
// chartTypeMeta.js), reached through renderChartWidget, so the Charts-tab preview and the dashboard
// canvas both draw it here. One layer: cell sectors or site points (mapChartLayers.js, on the GIS
// Engine's shared geometry/colors), basemap from Utils/basemapStyles (online CARTO / offline PMTiles
// per VITE_OFFLINE_MAPS_ENABLED). Only mounted while on screen: a map off screen gives its WebGL
// context back, since browsers cap how many a page can hold.
// OLD: export default function MapChartView({ name, mapping = {}, rows = [], height = 300, style = {}, isDark = false, onPointClick = null }) {
// `onPointContextMenu(id, clientX, clientY)`: right-click on a shape → the widget's point menu
// (ChartLibraryWidgetView's DrillContextMenu — cross-filter, links, Open on map).
export default function MapChartView({ name, mapping = {}, rows = [], height = 300, style = {}, isDark = false, onPointClick = null, onPointContextMenu = null }) {
  const containerRef = useRef(null);
  const deckRef = useRef(null);
  const [onScreen, setOnScreen] = useState(false);
  const [viewState, setViewState] = useState(null);
  const [offlineStyle, setOfflineStyle] = useState(null);

  const isSites = mapping.map_layer === 'sites';
  const missing = [
    !mapping.map_lat && 'Latitude', !mapping.map_lng && 'Longitude',
    !isSites && !mapping.map_azimuth && 'Azimuth', !mapping.map_id && 'Cell / site ID',
  ].filter(Boolean);

  const { items, skipped } = useMemo(() => toMapItems(rows, mapping), [rows, mapping]);
  // Sector layer only; fitting / legend keep `items` so changing the order doesn't refit the map.
  const drawItems = useMemo(() => sortForDrawing(items, mapping), [items, mapping.map_draw_order, mapping.map_order_by]);
  const atRowLimit = rows.length >= BACKEND_ROW_LIMIT;
  const { getHex, legend } = useMemo(() => buildColorScale(items, mapping, style.palette), [items, mapping, style.palette]);

  // Style (MAP_STYLE_FIELDS in widgetTypeRegistry.js). The preview passes raw 'show'/'hide'
  // strings, the canvas resolved booleans — both read the same here.
  const opacity = Math.min(100, Math.max(0, Number(style.mapOpacity ?? 100))) / 100;
  const pointSize = Number(style.mapPointSize) || 6;
  const sectorScale = (Number(style.mapSectorScale) || 100) / 100;
  // Blank = default; 0 is a real value (= exactly the GIS Engine's zoom boost).
  const minCellPx = style.mapMinCellPx === undefined || style.mapMinCellPx === null || style.mapMinCellPx === '' ? MIN_CELL_PX_DEFAULT : Math.max(0, Number(style.mapMinCellPx) || 0);
  const showLegend = style.showLegend !== false && style.showLegend !== 'hide';
  const surfaceDark = isDarkColor(style.bgGradient ? style.bgGradient[0] : style.bgColor) ?? isDark;
  const basemapKey = !style.mapBasemap || style.mapBasemap === 'auto' ? (surfaceDark ? 'dark' : 'light') : style.mapBasemap;

  // Mount the map only while the card is on screen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // On screen AND holding one of the page's map slots (mapSlots.js) — only then is <DeckGL> mounted.
  // OLD: const live = useMapSlot(onScreen);
  const live = useMapSlot(onScreen, containerRef);

  // Offline basemap style JSON (fetched once per file for the whole page — basemapStyles' cache).
  useEffect(() => {
    if (!IS_OFFLINE_MODE) { setOfflineStyle(null); return undefined; }
    let cancelled = false;
    loadOfflineStyle(OFFLINE_STYLE_MAP[basemapKey] || OFFLINE_STYLE_MAP.light)
      .then((s) => { if (!cancelled) setOfflineStyle(s); })
      .catch(() => { if (!cancelled) setOfflineStyle(null); });
    return () => { cancelled = true; };
  }, [basemapKey]);

  // OLD (fit only when the data changed — a resized card kept the old view):
  //   // Fit to the shapes whenever the data changes (new filters, drill, …) — like TelecomMap.fitToData.
  //   useEffect(() => {
  //     const el = containerRef.current;
  //     if (!items.length) { setViewState({ ...DEFAULT_MAP_VIEW, pitch: 0, bearing: 0 }); return; }
  //     const lngs = items.map((d) => d.lng);
  //     const lats = items.map((d) => d.lat);
  //     const width = el?.clientWidth || 600;
  //     const viewHeight = el?.clientHeight || height;
  //     let next;
  //     if (items.length === 1) {
  //       next = { longitude: lngs[0], latitude: lats[0], zoom: MAX_FIT_ZOOM };
  //     } else {
  //       const fitted = new WebMercatorViewport({ width, height: viewHeight })
  //         .fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 30 });
  //       next = { longitude: fitted.longitude, latitude: fitted.latitude, zoom: Math.min(fitted.zoom, MAX_FIT_ZOOM) };
  //     }
  //     setViewState({ ...next, pitch: 0, bearing: 0 });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   }, [items]);
  // Fit to the shapes — like TelecomMap.fitToData. Refits on new data (filters, drill, …) and when
  // the card is resized, unless the viewer has panned / zoomed since the last fit (their view wins).
  const userMovedRef = useRef(false);
  // Read through a ref: a new height (window / card resize) is the resize observer's job, and as a
  // dependency it would also reset "the viewer moved the map".
  const heightRef = useRef(height);
  heightRef.current = height;
  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!items.length) { setViewState({ ...DEFAULT_MAP_VIEW, pitch: 0, bearing: 0 }); return; }
    const lngs = items.map((d) => d.lng);
    const lats = items.map((d) => d.lat);
    const width = el?.clientWidth || 600;
    const viewHeight = el?.clientHeight || heightRef.current;
    let next;
    if (items.length === 1) {
      next = { longitude: lngs[0], latitude: lats[0], zoom: MAX_FIT_ZOOM };
    } else {
      const fitted = new WebMercatorViewport({ width, height: viewHeight })
        .fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 30 });
      next = { longitude: fitted.longitude, latitude: fitted.latitude, zoom: Math.min(fitted.zoom, MAX_FIT_ZOOM) };
    }
    setViewState({ ...next, pitch: 0, bearing: 0 });
  }, [items]);

  useEffect(() => {
    userMovedRef.current = false;
    fitView();
  }, [fitView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let timer = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!userMovedRef.current) fitView(); }, RESIZE_REFIT_MS);
    });
    observer.observe(el);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [fitView]);

  // `onScreen` is a dependency on purpose: scrolling away unmounts <DeckGL>, which finalizes the
  // layers it was given — handing the same (finalized) layer to the next <DeckGL> draws nothing,
  // so every remount gets a fresh layer.
  const layer = useMemo(() => {
    // OLD: if (!onScreen || !viewState || !items.length) return null;
    if (!live || !viewState || !items.length) return null;
    // OLD: const onClick = onPointClick ? ({ object }) => { if (object) onPointClick(object.id === null ? null : String(object.id)); } : undefined;
    // The clicked row's own ID value, not the item id: an item with no ID falls back to "lat,lng"
    // (toMapItems), which as a cross-filter value matched nothing. No ID → null (an IS NULL filter).
    const onClick = onPointClick ? ({ object }) => {
      if (!object) return;
      const raw = object.row?.[mapping.map_id];
      onPointClick(raw === null || raw === undefined || raw === '' ? null : String(raw));
    } : undefined;
    return isSites
      ? buildSiteLayer({ items, getHex, opacity, radius: pointSize, onClick })
      // OLD: : buildSectorLayer({ items, zoom: viewState.zoom, getHex, opacity, scale: sectorScale, onClick });
      // OLD: : buildSectorLayer({ items, zoom: viewState.zoom, getHex, opacity, scale: sectorScale, geometry: mapping.map_sector_geometry || 'gis', onClick });
      // OLD: : buildSectorLayer({ items: drawItems, zoom: viewState.zoom, getHex, opacity, scale: sectorScale, geometry: mapping.map_sector_geometry || 'gis', onClick });
      : buildSectorLayer({ items: drawItems, zoom: viewState.zoom, latitude: viewState.latitude, minCellPx, getHex, opacity, scale: sectorScale, geometry: mapping.map_sector_geometry || 'gis', onClick });
    // OLD: }, [items, getHex, opacity, pointSize, sectorScale, isSites, onPointClick, viewState?.zoom, onScreen]);
  // OLD: }, [items, getHex, opacity, pointSize, sectorScale, isSites, onPointClick, viewState?.zoom, live]);
  // OLD: }, [items, getHex, opacity, pointSize, sectorScale, isSites, onPointClick, viewState?.zoom, live, mapping.map_sector_geometry]);
  // OLD: }, [items, drawItems, getHex, opacity, pointSize, sectorScale, isSites, onPointClick, viewState?.zoom, live, mapping.map_sector_geometry]);
  // OLD: }, [items, drawItems, getHex, opacity, pointSize, sectorScale, minCellPx, isSites, onPointClick, viewState?.zoom, viewState?.latitude, live, mapping.map_sector_geometry]);
  }, [items, drawItems, getHex, opacity, pointSize, sectorScale, minCellPx, isSites, onPointClick, viewState?.zoom, viewState?.latitude, live, mapping.map_sector_geometry, mapping.map_id]);

  // Right-click: pick the shape under the pointer. Coordinates go back to the map's own pixels — the
  // dashboard canvas can be zoomed with a CSS transform, so the on-screen box isn't 1:1.
  const handleContextMenu = onPointContextMenu ? (e) => {
    const el = containerRef.current;
    const deck = deckRef.current;
    if (!el || !deck) return;
    const rect = el.getBoundingClientRect();
    const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
    const picked = deck.pickObject({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale, radius: 4 });
    if (!picked?.object) return; // empty map → the browser's own menu
    e.preventDefault();
    onPointContextMenu(picked.object.id === null ? 'null' : String(picked.object.id), e.clientX, e.clientY);
  } : undefined;

  // Hover: ID, the Color by value, then the Tooltip columns.
  const getTooltip = ({ object }) => {
    if (!object) return null;
    const lines = [String(object.id)];
    if (mapping.map_color_by && object.value !== null && object.value !== undefined) {
      lines.push(`${mapping.map_color_by}: ${typeof object.value === 'number' ? Number(object.value.toFixed(2)) : object.value}`);
    }
    (mapping.map_tooltip || []).forEach((col) => {
      if (col !== mapping.map_id && col !== mapping.map_color_by) lines.push(`${col}: ${object.row?.[col] ?? '—'}`);
    });
    return { text: lines.join('\n') };
  };

  // Title position: its column sets the alignment; bottom-* puts the title under the map. Middle
  // positions stay on top — a title over the middle of the map would cover the data.
  const titlePosition = style.titlePosition || 'top-left';
  const titleAtBottom = titlePosition.startsWith('bottom');
  const titleStyle = {
    textAlign: POSITION_TEXT_ALIGN[titlePosition] || 'left',
    color: style.titleColor || undefined,
    fontWeight: style.titleWeight === 'bold' ? 700 : style.titleWeight === 'normal' ? 400 : undefined,
    fontSize: style.titleSize ? `${style.titleSize}px` : undefined,
    lineHeight: style.titleSize ? 'normal' : undefined,
    fontFamily: style.titleFont || undefined,
  };

  const titleRow = name && style.showTitle !== 'hide' ? (
        <div className={`shrink-0 px-2.5 ${titleAtBottom ? 'pb-2 pt-1' : 'pb-1 pt-2'}`} style={{ background: style.titleBgColor || undefined }}>
          <span className={`block truncate text-xs font-semibold ${surfaceDark ? 'text-white/90' : 'text-slate-700'}`} style={titleStyle}>{name}</span>
        </div>
  ) : null;

  return (
    <div
      // Fills whatever the card / preview gives it (h-full, like Table) — `height` is only a floor, so
      // a parent without a definite height still shows a usable map instead of collapsing to 0.
      className={`flex h-full w-full flex-col overflow-hidden rounded-lg border ${surfaceDark ? 'border-white/10 bg-[#22273C]' : 'border-slate-100 bg-white'}`}
      style={{ minHeight: Math.min(height, 240), background: style.bgGradient ? `linear-gradient(135deg, ${style.bgGradient[0]}, ${style.bgGradient[1]})` : style.bgColor || undefined }}
    >
      {/* OLD: the title row always sat here (top). */}
      {!titleAtBottom && titleRow}
      <div ref={containerRef} className="relative min-h-0 flex-1" onContextMenu={handleContextMenu}>
        {missing.length > 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-400">
            Pick {missing.join(', ')} in the chart's Data settings.
          </div>
        ) : !items.length ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-400">
            No rows with a valid latitude / longitude.
          </div>
        ) : onScreen && !live ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-400">
            Map paused: up to {MAX_LIVE_MAPS} maps draw at once. It loads when another map scrolls out of view.
          </div>
        ) : live && viewState ? (
          <DeckGL
            ref={deckRef}
            viewState={viewState}
            controller
            layers={layer ? [layer] : []}
            // OLD: onViewStateChange={({ viewState: next }) => setViewState(next)}
            // Only the viewer's own pan / zoom gets here (a fit sets viewState directly).
            onViewStateChange={({ viewState: next }) => { userMovedRef.current = true; setViewState(next); }}
            getTooltip={getTooltip}
            widgets={DECK_WIDGETS_NONE}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Map mapStyle={getMapStyle(basemapKey, !IS_OFFLINE_MODE, offlineStyle)} attributionControl={false} />
          </DeckGL>
        ) : null}

        {/* Legend (Color by) + rows that had no location, bottom-left over the map. */}
        {/* OLD: {items.length > 0 && ((showLegend && legend.length > 0) || skipped > 0) && ( */}
        {items.length > 0 && ((showLegend && legend.length > 0) || skipped > 0 || atRowLimit) && (
          <div className={`pointer-events-none absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-2.5 gap-y-1 rounded-md px-2 py-1 text-ui-micro shadow-sm ${surfaceDark ? 'bg-slate-900/80 text-white/80' : 'bg-white/90 text-slate-600'}`}>
            {showLegend && legend.map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
                <span className="max-w-[8rem] truncate" title={label}>{label}</span>
              </span>
            ))}
            {skipped > 0 && <span className="text-amber-600" title="Rows with an empty or invalid latitude / longitude">{skipped} rows without a location</span>}
            {atRowLimit && (
              <span className="pointer-events-auto text-amber-600" title={`A chart gets at most ${BACKEND_ROW_LIMIT.toLocaleString()} rows — filter the dashboard or the chart to see the rest`}>
                First {BACKEND_ROW_LIMIT.toLocaleString()} rows only — there may be more
              </span>
            )}
          </div>
        )}
      </div>
      {titleAtBottom && titleRow}
    </div>
  );
}
