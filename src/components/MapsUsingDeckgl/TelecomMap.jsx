import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import "maplibre-gl/dist/maplibre-gl.css";
import '@deck.gl/widgets/stylesheet.css';

import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { FlyToInterpolator, WebMercatorViewport } from "@deck.gl/core";
import { PathStyleExtension } from "@deck.gl/extensions";
import { PolygonLayer, ScatterplotLayer, GeoJsonLayer, LineLayer, PathLayer, TextLayer } from "@deck.gl/layers";
import CellInfoPopup from './CellInfoPopup';
import CellInfoPopupV2 from "./CellInfoPopupV2";
import CellProRulesModal from './CellProRulesModal';
import * as Unicons from "@iconscout/react-unicons";
import MapActions from "../../store/actions/map-actions";
import AuthActions from "../../store/actions/auth-actions";
import generateSectorPolygon from "./Utils/GenerateSectorPolygon";
// import generateCoordinates from  "./Utils/GenerateCoordinates";
// import { NavigationControl, FullscreenControl, ScaleControl } from "react-map-gl";
// import mapboxgl from "mapbox-gl";

// ADD to existing imports
import { useNavigate } from 'react-router-dom';
import CommonActions from '../../store/actions/common-actions';
import { ALERTS } from '../../store/reducers/component-reducer';
import { FIXED_COLORS, getDriveTestColor, KPI_RANGE_DEFAULTS, RF_CATEGORY_COLORS, getNeighbourOperationColor } from "./Utils/colorEngine";
import LegendBox from "./LegendBox";
import LegendBoxV2 from "./LegendBoxV2";
import { Check, ChevronDown, ChevronUp, Compass, Copy, MapPin, Maximize, Minus, Plus, Ruler, Settings, WifiOff, X } from "lucide-react";
import {
  buildDraftMeasurement,
  buildDraftMeasurementLineCollection,
  buildMeasurementAreaLabels,
  buildMeasurementLineCollection,
  buildMeasurementPointMarkers,
  buildMeasurementPolygonCollection,
  createMeasurement,
  formatDistance,
  haversineDistanceMeters,
  isCloseToFirstPointScreen,
  polygonCentroid,
} from "./Utils/gisMeasurement";
import { TELECOM_GIS_NAV_BTN_CLASS, TelecomMapStyleRightControl } from "./TelecomMapDatayogStyleStrip";

/** `false` → original `LegendBox.jsx`; `true` → themed `LegendBoxV2` (resize, z-order, red close). */
const USE_LEGEND_BOX_V2 = true;
/** `false` → `CellInfoPopup`; `true` → `CellInfoPopupV2` (currently same UI as legacy). */
const USE_CELL_INFO_POPUP_V2 = true;

const NR_TYPE_COLORS = {
  "2G-2G":       [234, 179,   8, 230],
  "2G-3G":       [ 34, 197,  94, 230],
  "3G-2G":       [249, 115,  22, 230],
  "3G-3G_Intra": [ 59, 130, 246, 230],
  "3G-3G_Inter": [168,  85, 247, 230],
};

const NR_TYPE_COLORS_LIGHT = {
  "2G-2G":       [250, 220, 120, 180],
  "2G-3G":       [120, 230, 150, 180],
  "3G-2G":       [255, 180, 120, 180],
  "3G-3G_Intra": [140, 180, 255, 180],
  "3G-3G_Inter": [210, 160, 255, 180],
};

const NR_COLOR_DEFAULT = [107, 114, 128, 230];
// const getNrColor = (type) => NR_TYPE_COLORS[type] ?? NR_COLOR_DEFAULT;
const getNrColor = (type, biDirectional = true) => {

  if (biDirectional) {
    return NR_TYPE_COLORS[type] ?? NR_COLOR_DEFAULT;
  }

  return (
    NR_TYPE_COLORS_LIGHT[type] ??
    NR_COLOR_DEFAULT
  );

};

// Smooth exponential zoomBoost — anchored at zoom 12, capped at 8 to prevent sector blowup
// at zoom 9-11: z9-11→8, z12→6, z13→3, z15+→1. Sectors appear starting at zoom 9.
const computeZoomBoost = (zoom) => Math.min(8, Math.max(1, 6 * Math.pow(0.5, zoom - 12)));

// Arc tip at center azimuth — explicit mirror of generateCoordinates formula.
// generateCoordinates(lng, lat, az, radius_m, radius_m*zoomBoost, mapScale*20) uses:
//   factor = c_length / (69.093*9000) * (scale/20)  → *20 and /20 cancel
//   → factor = radius_m * zoomBoost * mapScale / (69.093*9000)
const getSectorTip = (lat, lng, azimuth, radius_m, mapScale = 1, zoomBoost = 1) => {
  const c_length = radius_m * zoomBoost;
  const scale    = mapScale * 20;
  const factor   = c_length / (69.093 * 9000) * (scale / 20);
  const azRad    = azimuth * Math.PI / 180;
  return [lng + Math.sin(azRad) * factor, lat + Math.cos(azRad) * factor];
};

const DASHBOARD_UUID = "0ccb9f27-ef5c-47bb-8c86-5126f34bad2f";
const FILTER_Id = "NATIVE_FILTER-Frwtlbdl8UhCOYVoGiXp9";

const GIS_DRAFT_PATH_EXTENSION = new PathStyleExtension({
  dash: true,
  offset: false,
  highPrecisionDash: true,
});

/** Datayog `gis-engine/page.js` — `LIGHT_MEASURE_STYLES`
 *  Styles listed here get dark measurement labels (dots/chips).
 *  Dark-background styles are omitted — they get light labels instead.
 *  Offline mode uses the same key as the selected online style, so no
 *  offline-specific entries are needed here. */
const LIGHT_MEASURE_STYLES = new Set(["outdoors", "voyager", "osm", "light"]);

/** MapLibre `["interpolate",["linear"],["zoom"],6,v0,10,v1,14,v2]` → pixel width (page.js measurement*LineLayer). */
const gisLineWidthFromZoomStops = (zoom, v0, v1, v2) => {
  const z = zoom ?? 6;
  if (z <= 6) return v0;
  if (z >= 14) return v2;
  if (z <= 10) return v0 + ((z - 6) / 4) * (v1 - v0);
  return v1 + ((z - 10) / 4) * (v2 - v1);
};
const gisCompletedLineWidthPx = (z) => gisLineWidthFromZoomStops(z, 2, 3, 4);
/** Thinner stroke so dashed segments read cleaner vs solid completed lines */
const gisDraftLineWidthPx = (z) => gisLineWidthFromZoomStops(z, 1.35, 1.75, 2.35);
/** PathStyleExtension: [dash, gap] in units of stroke width — 2× dash length vs old 2.2, wider gap */
const GIS_DRAFT_DASH_ARRAY = [4.4, 6.5];

const GIS_MEASURE_LABEL_DONE = "#0B1220";
/** After ≥2 vertices, defer single-click add so double-click can finalize without inserting an extra corner */
const GIS_MEASURE_CLICK_DELAY_MS = 260;
/** Screen px [left, top] from dot anchor — fallback when path direction is degenerate */
const GIS_LABEL_OFFSETS = [
  [18, -14],
  [22, 4],
  [28, 16],
  [-14, -14],
  [-22, 2],
  [-28, 14],
  [10, -24],
  [-14, -22],
];
/** Min distance from vertex/cursor center to label box (clears ~12px dot + stroke + line) */
const GIS_LABEL_PIXEL_DIST = 22;

function gisScreenTangentUnit(vp, cx, cy, prev, next) {
  let ux = 0;
  let uy = 0;
  let vx = 0;
  let vy = 0;
  let hasIn = false;
  let hasOut = false;
  if (prev) {
    const [px, py] = vp.project([prev.longitude, prev.latitude]);
    const dx = cx - px;
    const dy = cy - py;
    const len = Math.hypot(dx, dy);
    if (len > 1e-6) {
      ux = dx / len;
      uy = dy / len;
      hasIn = true;
    }
  }
  if (next) {
    const [nx, ny] = vp.project([next.longitude, next.latitude]);
    const dx = nx - cx;
    const dy = ny - cy;
    const len = Math.hypot(dx, dy);
    if (len > 1e-6) {
      vx = dx / len;
      vy = dy / len;
      hasOut = true;
    }
  }
  if (hasIn && hasOut) {
    let tx = ux + vx;
    let ty = uy + vy;
    const tlen = Math.hypot(tx, ty);
    if (tlen > 1e-6) {
      return { tx: tx / tlen, ty: ty / tlen };
    }
    return { tx: vx, ty: vy };
  }
  if (hasOut) return { tx: vx, ty: vy };
  if (hasIn) return { tx: ux, ty: uy };
  return null;
}

function gisVertexLabelOffsetPx(vp, p, fallbackIdx) {
  const meta = p.measureMeta;
  const [cx, cy] = vp.project([p.longitude, p.latitude]);
  if (!meta) {
    const [lox, loy] = GIS_LABEL_OFFSETS[fallbackIdx % GIS_LABEL_OFFSETS.length];
    return { lox, loy };
  }
  const tang = gisScreenTangentUnit(vp, cx, cy, meta.prev, meta.next);
  if (!tang) {
    const [lox, loy] = GIS_LABEL_OFFSETS[fallbackIdx % GIS_LABEL_OFFSETS.length];
    return { lox, loy };
  }
  let nx = -tang.ty;
  let ny = tang.tx;
  if (meta.closed && meta.centroid) {
    const [ccx, ccy] = vp.project([meta.centroid.longitude, meta.centroid.latitude]);
    const vx = cx - ccx;
    const vy = cy - ccy;
    if (Math.hypot(vx, vy) > 1e-6 && nx * vx + ny * vy < 0) {
      nx = -nx;
      ny = -ny;
    }
  }
  return { lox: nx * GIS_LABEL_PIXEL_DIST, loy: ny * GIS_LABEL_PIXEL_DIST };
}

function gisLiveDraftLabelOffsetPx(vp, lastPoint, cursorPoint, draftPoints) {
  const [lx, ly] = vp.project([lastPoint.longitude, lastPoint.latitude]);
  const [cx, cy] = vp.project([cursorPoint.longitude, cursorPoint.latitude]);
  let dx = cx - lx;
  let dy = cy - ly;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { lox: GIS_LABEL_PIXEL_DIST, loy: 0 };
  }
  dx /= len;
  dy /= len;
  let nx = -dy;
  let ny = dx;
  if (draftPoints?.length >= 3) {
    const c = polygonCentroid(draftPoints);
    if (c) {
      const [ccx, ccy] = vp.project([c.longitude, c.latitude]);
      const vx = cx - ccx;
      const vy = cy - ccy;
      if (Math.hypot(vx, vy) > 1e-6 && nx * vx + ny * vy < 0) {
        nx = -nx;
        ny = -ny;
      }
    }
  }
  return { lox: nx * GIS_LABEL_PIXEL_DIST, loy: ny * GIS_LABEL_PIXEL_DIST };
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// ─────────────────────────────────────────────────────────────────────────────
// ONLINE MAP STYLES (require internet)
// These fetch raster tiles from external CDNs on every pan/zoom.
// Keys here must match the `value` field in telecomMapStyleOptions.js.
// ─────────────────────────────────────────────────────────────────────────────
const MAP_STYLES = {
  // outdoors: {
  //   tiles: ['https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}@2x.png'],
  //   attribution: '© Stadia Maps © OpenStreetMap'
  // },
  outdoors: {
    tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'], // ← use voyager as fallback
    attribution: '© CARTO © OpenStreetMap'
  },
  voyager: {
    tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],  // ← @2x
    attribution: '© CARTO © OpenStreetMap'
  },
  light: {
    tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
    attribution: '© CARTO © OpenStreetMap'
  },
  dark: {
    tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
    attribution: '© CARTO © OpenStreetMap'
  },
  osm: {
    // OSM doesn't support @2x, but this is already decent quality
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap Contributors'
  },
  satellite: {
    // Satellite imagery is NOT available offline via PMTiles — this style
    // always requires internet (Esri CDN). Keep this as an online-only option.
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© Esri, Maxar, Earthstar Geographics'
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE MAP SUPPORT — PMTiles
//
// PMTiles is a single-file tile archive format. MapLibre fetches only the
// byte ranges it needs via HTTP range requests to the local file, so no
// tile server process is required.
//
// SETUP (one-time, per deployment):
//   1. Download a regional extract from https://protomaps.com/downloads
//      Choose the area covering your deployment region (e.g. Southern Africa).
//   2. Place the file at: /public/tiles/region.pmtiles
//      Vite serves /public/ at the root, so the browser sees /tiles/region.pmtiles
//   3. Update PMTILES_PATH below (or set VITE_PMTILES_PATH in .env).
//   4. The PMTiles protocol adapter is registered in main.jsx (startup).
//
// The offline styles use vector tiles (not raster), so they render crisply
// at any zoom level and use far less storage than raster tile downloads.
// ─────────────────────────────────────────────────────────────────────────────

// Path to the local .pmtiles file (served from /public/tiles/).
// Change this to match the filename you downloaded.
const PMTILES_PATH = import.meta.env.VITE_PMTILES_PATH || '/tiles/region.pmtiles';

// Build a MapLibre style spec that reads vector tiles from the local PMTiles file.
// `theme` — 'light' | 'dark' — controls fill/road/label colors.
const getOfflinePmtilesStyle = (theme = 'light') => {
  const isLight = theme === 'light';
  return {
    version: 8,
    // Glyphs are needed to render road labels. These are still fetched from the
    // network. To go fully offline, download and self-host a glyph set, then
    // change this URL to point to your local server.
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      protomaps: {
        type: 'vector',
        // "pmtiles://" prefix is handled by the Protocol adapter registered in main.jsx
        url: `pmtiles://${PMTILES_PATH}`,
        attribution: '© Protomaps © OpenStreetMap',
      },
    },
    layers: [
      // Canvas background
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': isLight ? '#f2ede8' : '#12192f' },
      },
      // Water bodies
      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        paint: { 'fill-color': isLight ? '#a8d4f0' : '#1a2f4a' },
      },
      // Natural land (parks, forests)
      {
        id: 'natural',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'natural',
        paint: { 'fill-color': isLight ? '#d8e8c8' : '#1a2b1a' },
      },
      // Land use zones (urban, residential, industrial)
      {
        id: 'landuse',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'landuse',
        paint: { 'fill-color': isLight ? '#e8e0d8' : '#1c2133', 'fill-opacity': 0.6 },
      },
      // Roads — minor (residential, service)
      {
        id: 'roads-minor',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', ['get', 'pmap:kind'], ['literal', ['minor_road', 'service']]],
        paint: {
          'line-color': isLight ? '#e0d8d0' : '#2a3550',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 2],
        },
      },
      // Roads — major (primary, secondary, trunk)
      {
        id: 'roads-major',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', ['get', 'pmap:kind'], ['literal', ['primary', 'secondary', 'trunk']]],
        paint: {
          'line-color': isLight ? '#ffffff' : '#3a4a6a',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 4],
        },
      },
      // Roads — motorway / highway
      {
        id: 'roads-motorway',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['==', ['get', 'pmap:kind'], 'highway'],
        paint: {
          'line-color': isLight ? '#f5c842' : '#8a7020',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 14, 5],
        },
      },
      // Place labels (cities, towns)
      {
        id: 'places',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'places',
        layout: {
          // Before — local language name
          'text-field': ['get', 'name'],

          // After — English name, falls back to local if English not available
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],

          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 12, 14],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': isLight ? '#333333' : '#cccccc',
          'text-halo-color': isLight ? '#ffffff' : '#12192f',
          'text-halo-width': 1.5,
        },
      },
    ],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE STYLE LOADING — OpenFreeMap style JSONs
//
// Maps each online style key to the closest OpenFreeMap style file.
// Style files live in /public/styles/ and are served as static assets.
// They are patched at runtime to replace the OpenFreeMap CDN tile source
// with the local PMTiles file at PMTILES_PATH.
// ─────────────────────────────────────────────────────────────────────────────
const OFFLINE_STYLE_MAP = {
  light:     'protomaps-data-viz-white.json', // Light →  White
  voyager:   'protomaps-light.json',              // Street → Light
  outdoors:  'protomaps-light.json',              // Terrain → Light
  osm:       'protomaps-data-viz-grayscale.json',  // OSM →  Grayscale
  dark:      'protomaps-dark.json',               // Dark → Dark
  satellite: 'protomaps-light.json',              // No offline satellite — hidden in picker, fallback to light
};

// Walk all style layers and force English-first labels.
// Protomaps styles show bilingual labels (local script + English) when tiles
// have non-Latin place names. This simplifies all name text-fields to prefer
// name:en, falling back to the local name only if English is unavailable.
const forceEnglishLabels = (style) => {
  for (const layer of style.layers) {
    const layout = layer.layout;
    if (!layout?.['text-field']) continue;
    const tf = JSON.stringify(layout['text-field']);
    // Skip house numbers, road shields, and other non-place labels
    if (tf.includes('"name"') && !tf.includes('"addr_housenumber"') && !tf.includes('"shield_text"')) {
      layout['text-field'] = ['coalesce', ['get', 'name:en'], ['get', 'name']];
    }
  }
  return style;
};

// Fetch a Protomaps style JSON from /public/styles/ and patch it for local use:
// 1. Replace the demo CDN tile source URL with the local PMTiles file
// 2. Force English-first place labels
const loadOfflineStyle = async (styleFile) => {
  const resp = await fetch(`/styles/${styleFile}`);
  const style = await resp.json();
  // Protomaps style JSONs reference their demo CDN as the tile source.
  // Patch it to use the local PMTiles file instead.
  for (const src of Object.values(style.sources)) {
    if (src.url?.includes('protomaps.com')) src.url = `pmtiles://${PMTILES_PATH}`;
    if (src.tiles) src.tiles = src.tiles.map(t => t.includes('protomaps.com') ? `pmtiles://${PMTILES_PATH}/{z}/{x}/{y}` : t);
  }
  return forceEnglishLabels(style);
};

// ─────────────────────────────────────────────────────────────────────────────
// getMapStyle — routes a style key to the correct MapLibre style spec object.
//
// Online  → MAP_STYLES raster tiles from external CDN (requires internet)
// Offline → OpenFreeMap style JSONs patched to use local PMTiles file
//           (auto-detected via navigator.onLine, no user action needed)
// ─────────────────────────────────────────────────────────────────────────────
const getMapStyle = (styleKey, isOnline, offlineMapStyle) => {
  if (!isOnline) {
    // Offline: return the pre-fetched+patched OpenFreeMap style, or a blank
    // placeholder while the async fetch is still in progress.
    return offlineMapStyle || { version: 8, sources: {}, layers: [] };
  }
  // Online: raster tiles from CDN, fall back to voyager if key is unknown.
  const style = MAP_STYLES[styleKey] || MAP_STYLES.voyager;
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: style.tiles,
        tileSize: 256,
        attribution: style.attribution,
      },
    },
    layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }],
  };
};

// const MAP_STYLES = {
//   streets:   `https://api.mapbox.com/styles/v1/mapbox/streets-v12/style.json?access_token=${MAPBOX_TOKEN}`,
//   light:     `https://api.mapbox.com/styles/v1/mapbox/light-v11/style.json?access_token=${MAPBOX_TOKEN}`,
//   dark:      `https://api.mapbox.com/styles/v1/mapbox/dark-v11/style.json?access_token=${MAPBOX_TOKEN}`,
//   satellite: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/style.json?access_token=${MAPBOX_TOKEN}`,
//   outdoors:  `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/style.json?access_token=${MAPBOX_TOKEN}`,
// };

// const getMapStyle = (styleKey) => 
//   MAP_STYLES[styleKey] || MAP_STYLES.streets;

const hexToRgba = (hex, opacity = 1) => {

  if (!hex) return [0,150,255,255];

  const bigint = parseInt(hex.replace("#", ""), 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const a = Math.round(opacity * 255);

  return [r,g,b,a];

};

const haversineKm = ([lng1, lat1], [lng2, lat2]) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
              Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

/** Datayog `gis-engine/page.js` — shared with on-map Fit / Layers / Settings. */
const GIS_TRAY_BTN_CLASS = TELECOM_GIS_NAV_BTN_CLASS;

/** Stable empty `widgets` array (avoid new [] each render). */
const DECK_WIDGETS_NONE = [];
/* Legacy top-right compass (restorable): `import { CompassWidget } from "@deck.gl/widgets";`
   then `widgets={[new CompassWidget({ placement: "top-right" })]}` instead of `DECK_WIDGETS_NONE`. */

const TelecomMap = ({ operator, mapKey = null, geojsonLayer = null, fullscreenRootRef = null }) => {

  const dispatch = useDispatch();
  const deckRef = useRef(null);
  const mapAreaRef = useRef(null);
  const didAutoFitRef = useRef(false);
  const [mapBox, setMapBox] = useState({ w: 800, h: 600 });
  // const debounceRef = useRef(null); //to not send viewport data to backend on every minor change, but only after user stops interacting for 500ms
  
  const navigate = useNavigate();

  /* ============================================================
     🔹 REDUX STATE
  ============================================================ */

  const rawCellsGlobal = useSelector(state => state.map.rawCells);
  const rawCellsPerMap = useSelector(state => state.map.rawCellsPerMap);
  // In multi-map mode a mapKey is provided — use the per-map dataset; fall back to shared rawCells for single-map page
  const rawCells = mapKey ? (rawCellsPerMap?.[mapKey] ?? []) : rawCellsGlobal;
  const filters = useSelector(state => state.map.filters);
  const viewState = useSelector(state => state.map.viewState);
  const syncEnabled = useSelector(state => state.map.syncEnabled);
  const config = useSelector(state => state.map.config);

  const selectedCell = useSelector(state => state.map.selectedCell);
  const boundaryGeoJson = useSelector(state => state.map.boundaryGeoJson);
  const activeThematic = useSelector(state => state.map.activeThematic);
  const cellKpiData = useSelector(state => state.map.cellKpiData ?? {});
  const siteKpiData = useSelector(state => state.map.siteKpiData ?? {});
  const highlightedCell = useSelector(state => state.map.highlightedCell);

  const [showCellProRulesModal, setShowCellProRulesModal] = useState(false);
  const [cellProRulesCell, setCellProRulesCell] = useState(null);

  const driveTestData = useSelector(state => state.map.driveTestData);
  const driveTestFilters = useSelector(state => state.map.driveTestFilters);
  const activeDriveSessions = useSelector(state => state.map.activeDriveSessions);

  const rfPredictionGeoJson = useSelector(state => state.map.rfPredictionGeoJson);
  const rfColorConfig = useSelector(state => state.map.rfColorConfig || []);
  const layerOpacity = useSelector(state => state.map.layerOpacity);
  const layerVisibility = useSelector(state => state.map.layerVisibility);

  const rawSites = useSelector(state => state.map.rawSites);
  const activeSiteThematic = useSelector(state => state.map.activeSiteThematic);
  const selectedTaCells = useSelector(state => state.map.selectedTaCells || []);
  const neighbourRelationsRaw = useSelector(state => state.map.neighbourRelations);
  const planNeighbourLines = useSelector(state => state.map.planNeighbourLines || []);
  // Attach a pre-built Set of target cell_ids so getFillColor can do O(1) lookups
  const neighbourRelations = useMemo(() => {
    if (!neighbourRelationsRaw) return null;
    return {
      ...neighbourRelationsRaw,
      targetIds: new Set(neighbourRelationsRaw.data?.map(d => d.target) ?? []),
    };
  }, [neighbourRelationsRaw]);

  const rulerMode = useSelector(state => state.map.rulerMode);
  const zoomConfig = useSelector(state => state.adminManagement?.zoomConfig ?? { sectorVisibilityZoom: 9, markerHideZoom: 12 });
  const sectorVisibilityZoom = zoomConfig.sectorVisibilityZoom;
  const markerHideZoom = zoomConfig.markerHideZoom;

  const [localViewState, setLocalViewState] = useState(viewState);
  const [rulerHover, setRulerHover] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, cell }
  const [taError, setTaError] = useState(null); // { cellId, message }
  const [nrTooltip, setNrTooltip] = useState(null); // { x, y, source, target, type }
  const [planNrTooltip, setPlanNrTooltip] = useState(null); // { x, y, source, target, operation_type, distance }
  const [rfTooltip, setRfTooltip] = useState(null); // { x, y, range, color_hex, parameter }
  const [nrSkippedDismissed, setNrSkippedDismissed] = useState(false);
  const [nrPanelCollapsed, setNrPanelCollapsed] = useState(false);
  const nrRadiusCacheRef = useRef({});
  const [nrCacheTrigger, setNrCacheTrigger] = useState(0);
  const [hoveringRulerDot, setHoveringRulerDot] = useState(false);
  const [isDraggingRulerDot, setIsDraggingRulerDot] = useState(false);
  const [rulerSegments, setRulerSegments] = useState([]); // [{id, a:[lng,lat], b:[lng,lat]|null}]
  const draggingRulerRef = useRef(null); // {segId, endpoint:'a'|'b'} — ref avoids stale closures

  const [toolsExpanded, setToolsExpanded] = useState(false);
  /** Datayog-style on-map basemap picker (dy3 logic: same `mapView` keys + `setupConf` as RightFilters). */
  const [mapStylePickerOpen, setMapStylePickerOpen] = useState(false);

  // Tracks real network connectivity — updates on browser online/offline events
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Manual override: user can force offline basemap even when internet is available
  const [forceOffline, setForceOffline] = useState(false);
  // Derived: use offline PMTiles if truly offline OR user manually forced it
  const isOfflineMode = forceOffline || !isOnline;
  // Holds the fetched+patched OpenFreeMap style object used when in offline mode
  const [offlineMapStyle, setOfflineMapStyle] = useState(null);
  const mapStylePickerRef = useRef(null);
  const [gisMeasuring, setGisMeasuring] = useState(false);
  const [gisMeasurements, setGisMeasurements] = useState([]);
  const [gisDraftMeasurement, setGisDraftMeasurement] = useState(null);
  const [gisMeasurementCursor, setGisMeasurementCursor] = useState(null);
  const gisDraftRef = useRef(null);
  const gisPendingAddRef = useRef(null);
  const gisLastTouchRef = useRef({ t: 0, x: 0, y: 0 });

  const flushGisPendingAdd = useCallback(() => {
    if (gisPendingAddRef.current != null) {
      window.clearTimeout(gisPendingAddRef.current);
      gisPendingAddRef.current = null;
    }
  }, []);

  /** Datayog `handleMapClick`: triple-click → popup at lng/lat (only when not measuring / not legacy ruler). */
  const [coordinatePopup, setCoordinatePopup] = useState(null); // { longitude, latitude }
  const [copiedCoordinate, setCopiedCoordinate] = useState(false);
  /** DeckGL `onClick` often wraps events so `MouseEvent.detail` stays 1 — burst detect by time + screen distance. */
  const mapTripleBurstRef = useRef({ n: 0, t: 0, x: 0, y: 0 });

  useEffect(() => {
    gisDraftRef.current = gisDraftMeasurement;
  }, [gisDraftMeasurement]);

  useEffect(() => {
    mapTripleBurstRef.current = { n: 0, t: 0, x: 0, y: 0 };
  }, [gisMeasuring, rulerMode]);

  useEffect(() => {
    if (!gisMeasuring) flushGisPendingAdd();
  }, [gisMeasuring, flushGisPendingAdd]);

  useEffect(
    () => () => {
      if (gisPendingAddRef.current != null) {
        window.clearTimeout(gisPendingAddRef.current);
        gisPendingAddRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!coordinatePopup) return undefined;
    const t = window.setTimeout(() => setCoordinatePopup(null), 5000);
    return () => window.clearTimeout(t);
  }, [coordinatePopup]);

  useEffect(() => {
    if (!copiedCoordinate) return undefined;
    const t = window.setTimeout(() => setCopiedCoordinate(false), 1400);
    return () => window.clearTimeout(t);
  }, [copiedCoordinate]);

  useEffect(() => {
    if (rulerMode) setCoordinatePopup(null);
  }, [rulerMode]);

  useEffect(() => {
    // nrRadiusCacheRef.current = {};   // clear on source change — old targets are irrelevant
    setNrSkippedDismissed(false);
    setNrPanelCollapsed(false);
  }, [neighbourRelations?.cellId]);

  useEffect(() => {
    dispatch(
      MapActions.setLayerLegend(
        "NEIGHBORS",
        !!neighbourRelations?.data?.length
      )
    );
  }, [dispatch, neighbourRelations]);

  useEffect(() => {
    const cache = nrRadiusCacheRef.current;
    let grew = false;
    rawCells.forEach(c => {
      if (Number.isFinite(c.radius_m) && c.radius_m > 0 && cache[c.cell_id] === undefined) {
        cache[c.cell_id] = c.radius_m;
        grew = true;
      }
    });
    if (grew) setNrCacheTrigger(t => t + 1);
  }, [rawCells]);

  const layerLegends = useSelector(state => state.map.layerLegends);
  const boundaryGroups = useSelector(state => state.map.boundaryGroups || []);
  const boundaryColors = useSelector(state => state.map.boundaryColors || {});

  const driveTestThematic = driveTestFilters
    ? {
        type: "KPIs",
        kpiConfig: {
          kpi: driveTestFilters.thematic,
          ranges: driveTestFilters.ranges
        }
      }
    : null;
    
const selectedBoundaries = useSelector(state => state.map.selectedBoundaries || {});

const rfLegendThematic = useMemo(() => {
    const activeParam = config.rfParameter || "RSRP";
    const filtered = rfColorConfig
        .filter(c => c.parameter_name === activeParam)
        .sort((a, b) => a.display_order - b.display_order);
    if (filtered.length) {
        const colors = Object.fromEntries(filtered.map(c => [c.range_label, c.color_hex]));
        return { type: activeParam, colors };
    }
    // Derive ranges from actual GeoJSON features using RF_CATEGORY_COLORS
    const features = rfPredictionGeoJson?.features || [];
    const colorMap = {};
    features.forEach(f => {
        if (f.properties?.parameter !== activeParam) return;
        const rangeLabel = f.properties?.range;
        if (!rangeLabel || colorMap[rangeLabel]) return;
        const categoryMatch = rangeLabel.match(/\(([^)]+)\)$/);
        const category = categoryMatch?.[1];
        colorMap[rangeLabel] = RF_CATEGORY_COLORS[category] || "#9CA3AF";
    });
    if (!Object.keys(colorMap).length) return null;
    return { type: activeParam, colors: colorMap };
}, [rfColorConfig, config.rfParameter, rfPredictionGeoJson]);

const nrLegendThematic = useMemo(() => {

  if (!neighbourRelations?.data?.length) return null;

  return {
    type: "Neighbour Relations",
    colors: {
      "3G-2G": "#f97316",
      "3G-3G_Intra": "#3b82f6",
      "3G-3G_Inter": "#a855f7",
      "4G-4G_Intra": "#22c55e",
      "4G-4G_Inter": "#ef4444",
      "2G-2G": "#eab308",
    }
  };

}, [neighbourRelations]);

const boundaryLegendThematic = useMemo(() => {
    // Build colors object: one entry per group that has selections
    const colors = {};
    boundaryGroups.forEach(group => {
        const selections = selectedBoundaries[group.shapegroup];
        const hasSelections = Array.isArray(selections) && selections.length > 0;
        if (hasSelections) {
            colors[group.shapegroup] = boundaryColors[group.shapegroup] || "#000000";
        }
    });
    if (Object.keys(colors).length === 0) return null;
    return { type: "Boundary", colors };
}, [boundaryGroups, selectedBoundaries, boundaryColors]);

// const neighborsLegendThematic = useMemo(() => {

//   if (!neighbourRelations?.data?.length) return null;

//   return {
//     type: "",
//     colors: Object.fromEntries(
//       Object.entries(NR_TYPE_COLORS).map(
//         ([key, value]) => [
//           key,
//           `rgb(${value[0]}, ${value[1]}, ${value[2]})`
//         ]
//       )
//     )
//   };

// }, [neighbourRelations]);

const planNeighboursLegendThematic = useMemo(() => {
    if (!planNeighbourLines.length) return null;
    const uniqueOps = [...new Set(planNeighbourLines.map(l => l.operation_type).filter(Boolean))];
    // Group by plan type so same color family appears together vertically
    const groups = {};
    uniqueOps.forEach(op => {
      const dashIdx = op.lastIndexOf("-");
      const planType = dashIdx > 0 ? op.slice(dashIdx + 1) : op;
      if (!groups[planType]) groups[planType] = [];
      groups[planType].push(op);
    });
    const sorted = Object.values(groups).flat();
    return {
      type: "Plan Neighbors",
      colors: Object.fromEntries(sorted.map(op => [op, getNeighbourOperationColor(op)])),
    };
  }, [planNeighbourLines]);

const neighborsLegendThematic = useMemo(() => {

  if (!neighbourRelations?.data?.length) return null;
    return {
      type: "",
      colors: Object.fromEntries(
        Object.entries(NR_TYPE_COLORS).map(
          ([key, value]) => [
            key,
            `rgb(${value[0]}, ${value[1]}, ${value[2]})`
          ]
        )
      ),

      typeCount: Object.fromEntries(
        Object.entries(neighbourRelations.typeCount || {}).map(
          ([key, value]) => [
            key,
            { name: value }
          ]
        )
      ),
    };

  }, [neighbourRelations]);

  const activeLegendKeys = useMemo(() => {
    const a = [];
    if (layerLegends.SITES) a.push("SITES");
    if (layerLegends.CELLS) a.push("CELLS");
    if (layerLegends.DRIVE_TEST && driveTestThematic) a.push("DRIVE_TEST");
    if (layerLegends.BOUNDARY && boundaryLegendThematic) a.push("BOUNDARY");
    if (layerLegends.RF && rfLegendThematic) a.push("RF");
    
    if (layerLegends.NEIGHBORS && neighborsLegendThematic) a.push("NEIGHBORS");
    if (layerLegends.NEIGHBOURS && planNeighboursLegendThematic) a.push("NEIGHBOURS");
    return a;
  }, [
    layerLegends.SITES,
    layerLegends.CELLS,
    layerLegends.DRIVE_TEST,
    layerLegends.BOUNDARY,
    layerLegends.RF,
    layerLegends.NEIGHBOURS,
    driveTestThematic,
    boundaryLegendThematic,
    rfLegendThematic,
    planNeighboursLegendThematic,
  ]);

  const activeLegendKeysSig = activeLegendKeys.join("|");

  const [legendStackOrder, setLegendStackOrder] = useState([]);

  useLayoutEffect(() => {
    setLegendStackOrder((prev) => {
      const activeSet = new Set(activeLegendKeys);
      const kept = prev.filter((k) => activeSet.has(k));
      const added = activeLegendKeys.filter((k) => !kept.includes(k));
      return [...kept, ...added];
    });
  }, [activeLegendKeysSig]);

  const bringLegendToFront = useCallback((key) => {
    setLegendStackOrder((prev) => [...prev.filter((k) => k !== key), key]);
  }, []);

  const sendLegendBackward = useCallback((key) => {
    setLegendStackOrder((prev) => {
      const i = prev.indexOf(key);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }, []);

  const legendZIndex = useCallback(
    (key) => {
      const si = legendStackOrder.indexOf(key);
      const ai = activeLegendKeys.indexOf(key);
      const rank = si >= 0 ? si : ai >= 0 ? ai : 0;
      return 10080 + rank * 10;
    },
    [legendStackOrder, activeLegendKeys],
  );

  // Default view state of map - when no data loaded yet,  
  // or if sync disabled and no local view state (e.g. on first load)
  const activeViewState =
  (syncEnabled ? viewState : localViewState) || {
    longitude: Number(import.meta.env.VITE_DEFAULT_MAP_LNG) || 34.3,
    latitude: Number(import.meta.env.VITE_DEFAULT_MAP_LAT) || -13.2,
    zoom: Number(import.meta.env.VITE_DEFAULT_MAP_ZOOM) || 6,
    pitch: 0,
    bearing: 0
  };

  const currentZoom = activeViewState?.zoom ?? 6;

  const activeViewStateRef = useRef(activeViewState);
  activeViewStateRef.current = activeViewState;

  const lngLatFromDeckPick = useCallback((info) => {
    const c = info?.coordinate;
    if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
      return { longitude: c[0], latitude: c[1] };
    }
    const el = mapAreaRef.current;
    const w = el?.clientWidth || 800;
    const h = el?.clientHeight || 600;
    const vs = activeViewStateRef.current;
    const vp = new WebMercatorViewport({
      width: w,
      height: h,
      longitude: vs.longitude,
      latitude: vs.latitude,
      zoom: vs.zoom,
      pitch: vs.pitch ?? 0,
      bearing: vs.bearing ?? 0,
    });
    const px = info?.x;
    const py = info?.y;
    if (typeof px !== "number" || typeof py !== "number") return null;
    const un = vp.unproject([px, py]);
    if (!un || !Number.isFinite(un[0]) || !Number.isFinite(un[1])) return null;
    return { longitude: un[0], latitude: un[1] };
  }, []);

  const tryConsumeMapTripleClick = useCallback((screenX, screenY) => {
    const maxGapMs = 650;
    const maxDistPx = 36;
    const now = performance.now();
    const r = mapTripleBurstRef.current;
    const dt = r.t > 0 ? now - r.t : Number.POSITIVE_INFINITY;
    const dist = r.t > 0 ? Math.hypot(screenX - r.x, screenY - r.y) : 0;
    if (dt > maxGapMs || dist > maxDistPx) {
      r.n = 1;
    } else {
      r.n += 1;
    }
    r.t = now;
    r.x = screenX;
    r.y = screenY;
    if (r.n >= 3) {
      r.n = 0;
      r.t = 0;
      return true;
    }
    return false;
  }, []);

  const THEMATIC_FIELD_MAP = {
    Technology: "technology",
    Band: "band",
    Region: "region"
  };

  /* ============================================================
     🔹 LOCAL VIEW STATE (used only if sync disabled)
  ============================================================ */

  const fitToData = useCallback(() => {
    if (!rawCells || rawCells.length === 0) return;

    // Only include cells with genuinely valid coordinates (null → 0 passes isNaN, so use isFinite)
    const coords = rawCells
      .map(d => [Number(d.longitude), Number(d.latitude)])
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat) && (lng !== 0 || lat !== 0));
    if (coords.length === 0) return;

    // fitBounds needs [[minLng, minLat], [maxLng, maxLat]], not the raw point array
    const lngs = coords.map(([lng]) => lng);
    const lats = coords.map(([, lat]) => lat);
    const sw = [Math.min(...lngs), Math.min(...lats)];
    const ne = [Math.max(...lngs), Math.max(...lats)];

    const el = mapAreaRef.current;
    const width = el?.clientWidth || window.innerWidth;
    const height = el?.clientHeight || window.innerHeight;

    const viewport = new WebMercatorViewport({ width, height });

    let { longitude, latitude, zoom } =
      viewport.fitBounds([sw, ne], { padding: 40 });

    zoom = Math.min(zoom, 13);

    const newView = {
      longitude,
      latitude,
      zoom,
      pitch: 0,
      bearing: 0
    };

    dispatch(MapActions.setViewState(newView));
    if (!syncEnabled) {
      setLocalViewState(newView);
    }
  }, [rawCells, dispatch, syncEnabled]);

  useEffect(() => {
    if (rawCells.length === 0 || didAutoFitRef.current) return;
    didAutoFitRef.current = true;
    fitToData();
  }, [rawCells.length, fitToData]);

  useEffect(() => {
    if (!syncEnabled && viewState) {
      setLocalViewState(viewState);
    }
  }, [syncEnabled, viewState]);


  useEffect(() => {
    dispatch(MapActions.getDriveTestData());
  }, []);

  useLayoutEffect(() => {
    const el = mapAreaRef.current;
    if (!el) return undefined;
    const measure = () => setMapBox({ w: el.clientWidth || 800, h: el.clientHeight || 600 });
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  /** Datayog `gis-engine/page.js` — `measurementContrast` (mapStyle → same keys as `config.mapView`). */
  const measurementContrast = useMemo(() => {
    const mapStyle = config.mapView || "voyager";
    return LIGHT_MEASURE_STYLES.has(mapStyle)
      ? {
          dotFill: "#0B1220",
          dotBorder: "#FFFFFF",
          chipText: "#0B1220",
          chipBg: "rgba(255,255,255,0.92)",
          chipBorder: "rgba(11,18,32,0.15)",
        }
      : {
          dotFill: "#FFFFFF",
          dotBorder: "#0B1220",
          chipText: "#FFFFFF",
          chipBg: "rgba(8,18,36,0.92)",
          chipBorder: "rgba(255,255,255,0.12)",
        };
  }, [config.mapView]);

  /** Normalize legacy `mapbox://…` saved prefs so basemap picker highlights a real tile key. */
  const mapStyleKeyForUi = useMemo(() => {
    const v = config.mapView || "voyager";
    return typeof v === "string" && v.startsWith("mapbox://") ? "voyager" : v;
  }, [config.mapView]);

  // Listen for browser online/offline events to reactively switch basemap
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // When offline (or style changes while offline), fetch+patch the matching
  // OpenFreeMap style JSON so getMapStyle() can return it synchronously.
  useEffect(() => {
    if (!isOfflineMode) { setOfflineMapStyle(null); return; }
    const styleFile = OFFLINE_STYLE_MAP[mapStyleKeyForUi] || 'positron.json';
    loadOfflineStyle(styleFile).then(setOfflineMapStyle);
  }, [isOfflineMode, mapStyleKeyForUi]);

  useEffect(() => {
    if (!mapStylePickerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMapStylePickerOpen(false);
    };
    const onDown = (e) => {
      const el = mapStylePickerRef.current;
      if (el && !el.contains(e.target)) setMapStylePickerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [mapStylePickerOpen]);

  const blockMapDataPick = rulerMode || gisMeasuring;

  // Close context menu on any click outside (without blocking map scroll/zoom)
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

/* ============================================================
     🔹 APPLY GLOBAL FILTERS
  ============================================================ */

  const globallyFiltered = useMemo(() => {
    return rawCells.filter(cell => {

    // REGION MULTISELECT
    if (
        filters.regions.length > 0 &&
        !filters.regions.includes(cell.region)
    ) return false;

    // TECHNOLOGY MULTISELECT
    if (
        filters.technologies.length > 0 &&
        !filters.technologies.includes(cell.technology)
        ) return false;

      return true;
    });
  }, [rawCells, filters.regions, filters.technologies]);

  const filteredCellsThematic = useMemo(() => {
    if (!activeThematic?.colors) return activeThematic;
    if (activeThematic.type === "KPIs" || activeThematic.type === "Default" || activeThematic.type === "Alarms")
      return activeThematic;
    const field = THEMATIC_FIELD_MAP[activeThematic.type];
    if (!field) return activeThematic;
    const visibleValues = new Set(globallyFiltered.map(c => c[field]).filter(Boolean));
    const colors = Object.fromEntries(
      Object.entries(activeThematic.colors).filter(([k]) => visibleValues.has(k))
    );
    return { ...activeThematic, colors };
  }, [activeThematic, globallyFiltered]);

  /* ============================================================
     🔹 APPLY OPERATOR FILTER (PROP-BASED)
  ============================================================ */
  // const operatorFiltered = useMemo(() => {
  //   return globallyFiltered.filter(
  //     cell => cell.operator === operator
  //   );
  // }, [globallyFiltered, operator]);
 
  // const operatorFiltered = globallyFiltered;

   const operatorFiltered = rawCells;  //cell dataset

   /* ============================================================
   🔹 SITE AGGREGATION (1 marker per site)  -> siet datacet
============================================================ */
  const siteAggregated = useMemo(() => {

    const siteMap = {};

    operatorFiltered.forEach(cell => {

      if (!siteMap[cell.site_name]) {
        siteMap[cell.site_name] = {
          site_name: cell.site_name,
          latitude: Number(cell.latitude),
          longitude: Number(cell.longitude),
          cell_count: 1
        };
      } else {
        siteMap[cell.site_name].cell_count += 1;
      }

    });
    return Object.values(siteMap);

  }, [operatorFiltered]);

   /* ============================================================
   🔹 GENERATE COORDINATES FOR DRAWING
============================================================ */
const generateCoordinates = (x, y, Dir, antBW, c_length, scale = 20) => {
    const coords = [];
    coords.push([x, y]);

    // original denominator (110 - scale) * 100 inverts at scale > 110 (mapScale > 5.5)
    // replaced with linear growth: same output at mapScale=1, keeps growing beyond 5.5
    const factor = c_length / (69.093 * 9000) * (scale / 20);

    for (let j = 10; j >= 1; j--) {
        const angle = (Dir - antBW / 2 + (antBW / 10) * j) * 0.01745329252;

        const x1 = x + Math.sin(angle) * factor;
        const y1 = y + Math.cos(angle) * factor;

        coords.push([x1, y1]);
    }

    coords.push([x, y]);
    return coords;
};

// Generates an annular sector polygon (donut wedge) in geographic coordinates.
// innerMeters=0 produces a full sector (pie slice); innerMeters>0 excludes the inner portion.
const DEG_TO_RAD = Math.PI / 180;
const METERS_PER_DEG = 111320;
const generateAnnularSector = (lng, lat, azimuth, beamWidthDeg, innerMeters, outerMeters, steps = 30) => {
    const lngScale = Math.cos(lat * DEG_TO_RAD);
    const coords = [];

    // inner arc: left → right (collapses to center point when innerMeters = 0)
    for (let j = 0; j <= steps; j++) {
        const angle = (azimuth - beamWidthDeg / 2 + (beamWidthDeg / steps) * j) * DEG_TO_RAD;
        if (innerMeters === 0) {
            coords.push([lng, lat]);
        } else {
            coords.push([
                lng + Math.sin(angle) * innerMeters / (METERS_PER_DEG * lngScale),
                lat + Math.cos(angle) * innerMeters / METERS_PER_DEG,
            ]);
        }
    }

    // outer arc: right → left
    for (let j = steps; j >= 0; j--) {
        const angle = (azimuth - beamWidthDeg / 2 + (beamWidthDeg / steps) * j) * DEG_TO_RAD;
        coords.push([
            lng + Math.sin(angle) * outerMeters / (METERS_PER_DEG * lngScale),
            lat + Math.cos(angle) * outerMeters / METERS_PER_DEG,
        ]);
    }

    coords.push(coords[0]); // close polygon
    return coords;
};
  /* ============================================================
     🔹 MARKER LAYER (deck.gl) for CELLS
  ============================================================ */
  const markerLayer = useMemo(() => {
    // console.log(
    //   "MARKER DATA:",
    //   currentZoom < 9 ? "SITES" : "CELLS",
    //   currentZoom < 9 ? siteAggregated.length : operatorFiltered.length
    // );
    // console.log("MAP SCALE IN MAP:", config.mapScale);

    if (!layerVisibility.CELLS) return null; 

    if (!operatorFiltered || operatorFiltered.length === 0) return null;
    const mapScale = config.mapScale || 1;

    return new ScatterplotLayer({
      id: `marker-layer-${operator}`,
      data: siteAggregated
              .filter(d => !isNaN(Number(d.longitude)) && !isNaN(Number(d.latitude))),
      pickable: !blockMapDataPick,
      getPosition: d => {
        const lng = Number(d.longitude);
        const lat = Number(d.latitude);
        if (isNaN(lng) || isNaN(lat)) return null;
        return [lng, lat];
      },
      getRadius: d => {
        // Site markers (zoomed out)
        if (currentZoom < 10) {
          return 200 + (d.cell_count || 1) * 20;
        }
        // Cell markers (mid zoom)
        if (currentZoom < 12) {
          return 120;
        }
        // When sectors appear
        return 60;
      },
      radiusScale: config.mapScale,
      radiusMaxPixels: currentZoom < 10 ? 28 : 18,
      radiusMinPixels: 3,
      // getFillColor: [255, 0, 0, 200],
      getFillColor: d => {
        const opacity =
          (layerOpacity.CELLS ?? 1) *
          (activeThematic?.opacity ?? 1);

        // highlight selected
        if (selectedCell && d.cell_id === selectedCell.cell_id) {
          return [255, 255, 0, 255];
        }

        // ── NOTE: siteAggregated (used here at zoom < 12) only carries
        // { site_name, latitude, longitude, cell_count } — no band / technology /
        // region / kpi fields. All thematic logic below is preserved for when
        // siteAggregated is enriched with per-cell fields in the future.
        // For now, dots are intentionally black (neutral site-position markers).
        // Thematic coloring applies at zoom ≥ 12 via the sector/PathLayer.

        // // KPI thematic — color by fetched KPI value
        // if (activeThematic?.type === "KPIs") {
        //   const kpiConfig = activeThematic.kpiConfig || {};
        //   const kpiValue = cellKpiData[d.cell_id];
        //   if (kpiValue != null) {
        //     const { color } = getDriveTestColor(
        //       kpiValue,
        //       kpiConfig.kpi,
        //       kpiConfig.mode,
        //       kpiConfig.ranges
        //     );
        //     return hexToRgba(color, opacity);
        //   }
        //   return hexToRgba("#888888", opacity); // grey = no data
        // }

        // // DEFAULT thematic
        // if (activeThematic?.type === "Default") {
        //   const hex =
        //     activeThematic.colors?.[d.band] ||
        //     activeThematic.colors?.[d.technology] ||
        //     activeThematic.colors?.[d.region];
        //   if (hex) return hexToRgba(hex, opacity);
        // }

        // // Generic thematics (Band, Region, Vendor, etc.)
        // const field = THEMATIC_FIELD_MAP[activeThematic?.type];
        // if (field) {
        //   const hex = activeThematic.colors?.[d[field]];
        //   if (hex) return hexToRgba(hex, opacity);
        // }

        return hexToRgba("#000000", opacity);
      },
      getLineColor: [0, 0, 0],
      getLineWidth: 1,
      updateTriggers: {
        getFillColor: [
          activeThematic?.type,
          activeThematic?.colors,
          activeThematic?.opacity,
          activeThematic?.kpiConfig,
          layerOpacity.CELLS,
          selectedCell,
          cellKpiData,
        ]
      },
      visible: layerVisibility.CELLS && currentZoom < markerHideZoom, // markers visible below markerHideZoom
      // visible: currentZoom < 9 || selectedCell !== null, // show markers only at low zooms
      onClick: info => {
        if (blockMapDataPick) return;
        if (info.object) {
          // dispatch(MapActions.setSelectedCell({
          //   ...info.object,
          //   _lng: info.object.longitude,
          //   _lat: info.object.latitude
          // }));
          if (currentZoom < 10) {
            dispatch(MapActions.setViewState({
              longitude: info.object.longitude,
              latitude: info.object.latitude,
              zoom: 13,
              transitionDuration: 800
            }));

          } else {
              dispatch(MapActions.setSelectedCell({
                ...info.object,
                _lng: info.object.longitude,
                _lat: info.object.latitude
              }));
          }
        }
      },

    });
  }, [operatorFiltered, 
      operator, 
      dispatch, 
      currentZoom, 
      selectedCell, 
      siteAggregated, 
      config.mapScale, 
      layerVisibility.CELLS,

      activeThematic?.type,
      activeThematic?.colors,
      activeThematic?.opacity,
      activeThematic?.kpiConfig,
      cellKpiData,
      layerOpacity.CELLS,
      blockMapDataPick
    ]);

  /* ============================================================
     🔹 SECTOR LAYER (deck.gl) for CELLS
  ============================================================ */
  const sortedCells = useMemo(() => {

    if (!operatorFiltered) return [];
    const order = { "2G":1,"3G":2,"4G":3,"5G":4 };
    return [...operatorFiltered]
      .filter(d =>
        Number.isFinite(Number(d.longitude)) &&
        Number.isFinite(Number(d.latitude)) &&
        Number(d.radius_m) > 0
      )
      .sort((a,b) => (order[a.technology]||0)-(order[b.technology]||0));
  }, [operatorFiltered]);
  
  // derived here so handleMapContextMenu and ruler layers can both use it
  const activeSegment = rulerSegments.find(s => s.b === null) ?? null;

  // Native contextmenu on the map wrapper → pickMultipleObjects → show cell context menu
  const handleMapContextMenu = useCallback((e) => {
    e.preventDefault();

    // If ruler mode is active and we have a pending point A, right-click cancels it
    if (rulerMode && activeSegment) {
      setRulerSegments(prev => prev.filter(s => s.b !== null));
      setRulerHover(null);
      return;
    }

    if (gisMeasuring && (gisDraftRef.current?.points?.length > 0)) {
      const cleared = buildDraftMeasurement([]);
      setGisDraftMeasurement(cleared);
      setGisMeasurementCursor(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hits = deckRef.current?.pickMultipleObjects({ x, y, radius: 5 });
    if (!hits?.length) return;

    // prefer a real cell sector; if not found, accept a TA sector (knows its cellId)
    const sectorHit = hits.find(h => h.layer?.id?.startsWith('sector-layer-'));
    if (sectorHit?.object) {
      setContextMenu({ x, y, cell: sectorHit.object });
      return;
    }
    const taHit = hits.find(h => h.layer?.id === 'ta-sector-layer-fill');
    if (taHit?.object?.cellId) {
      const cell = operatorFiltered.find(c => c.cell_id === taHit.object.cellId);
      if (cell) setContextMenu({ x, y, cell });
    }
  }, [operatorFiltered, rulerMode, activeSegment, gisMeasuring]);

  const sectorLayer = useMemo(() => {

    if (!layerVisibility.CELLS) return null;
    if (!sortedCells.length) return null; 

    return new PolygonLayer({
      id: `sector-layer-${operator}`,
      data: sortedCells,
      // data: sectorCells,

      pickable: !blockMapDataPick,
      stroked: true,
      filled: true,

        // getPolygon: d =>
        //     generateSectorPolygon(
        //     d.latitude,
        //     d.longitude,
        //     d.azimuth,
        //     d.beam_width || 60,
        //     d.radius_m || 500,
        //     config.mapScale
        //     ),

        getPolygon: d => {
          const zoomBoost = computeZoomBoost(currentZoom);

          // generateCoordinates parameter mapping (intentional):
          //   antBW   ← d.radius_m  (= gisCells API: item.length)
          //   c_length← d.radius_m * zoomBoost
          //
          // d.beam_width (= item.beamwidth) is intentionally NOT used as antBW.
          // Using radius_m for both antBW and c_length produces the correct visual sector shape
          // with this formula. Switching to beam_width here would break the rendering.
          return generateCoordinates(
            d.longitude,
            d.latitude,
            d.azimuth,
            d.radius_m,             // antBW  — intentionally radius_m, not beam_width
            d.radius_m * zoomBoost, // c_length
            config.mapScale * 20,
          );
        },

        // getFillColor: d => {
        //   if (selectedCell && d.cell_id === selectedCell.cell_id) {
        //     return [255, 255, 0, 220]; // bright yellow highlight
        //   }
        //   if (d.status === "down") return [255, 0, 0, 180];
        //   return [0, 150, 255, 160];
        // },
        // getFillColor: d => {
        //   if (selectedCell && d.cell_id === selectedCell.cell_id) {
        //     return [255,255,0,220];
        //   }

        //   if (activeThematic?.type === "Technology") {
        //     const hex = activeThematic.colors?.[d.technology];
        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (activeThematic?.type === "Default") {
        //     const hex = activeThematic.colors?.[d.band] ||
        //                 activeThematic.colors?.[d.technology] ||
        //                 activeThematic.colors?.[d.region];

        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (activeThematic?.type === "Band") {
        //     const hex = activeThematic.colors?.[d.band];
        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (activeThematic?.type === "Region") {
        //     const hex = activeThematic.colors?.[d.region];
        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (d.status === "down") return [255,0,0,180];

        //   return [0,150,255,160];
        // },

        getFillColor: d => {
          if (d.cell_id === neighbourRelations?.cellId) return [80, 80, 80, 140];
          if (neighbourRelations?.targetIds?.has(d.cell_id)) return [100, 100, 255, 110];
          return [0, 0, 0, 0];
        },

        updateTriggers: {
          getPolygon: [config.mapScale, currentZoom],
          getLineColor: [
            selectedCell,
            activeThematic?.type,
            activeThematic?.colors,
            activeThematic?.opacity,
            activeThematic?.kpiConfig,
            cellKpiData,
            layerOpacity.CELLS,
          ],
          getFillColor: [neighbourRelations?.cellId, neighbourRelations?.data?.length],
        },

        getLineColor: d => {

          // highlight selected cell
          if (selectedCell && d.cell_id === selectedCell.cell_id) {
            return [255,255,0,255];
          }

          const opacity =
            (layerOpacity.CELLS ?? 1) *
            (activeThematic?.opacity ?? 1);

          // KPI thematic
          if (activeThematic?.type === "KPIs") {
            const kpiConfig = activeThematic.kpiConfig || {};
            const kpiValue = cellKpiData[d.cell_id];
            if (kpiValue != null) {
              const { color } = getDriveTestColor(
                kpiValue,
                kpiConfig.kpi,
                kpiConfig.mode,
                kpiConfig.ranges
              );
              return hexToRgba(color, opacity);
            }
            return hexToRgba("#888888", opacity);
          }

          // DEFAULT thematic (special logic)
          if (activeThematic?.type === "Default") {

            const hex =
              activeThematic.colors?.[d.band] ||
              activeThematic.colors?.[d.technology] ||
              activeThematic.colors?.[d.region];

            if (hex) return hexToRgba(hex, opacity);

          }

          // Generic thematics
          const field = THEMATIC_FIELD_MAP[activeThematic?.type];

          if (field) {
            const hex = activeThematic.colors?.[d[field]];
            if (hex) return hexToRgba(hex, opacity);
          }

          // Cell down fallback
          if (d.status === "down") return [255,0,0,255];

          // Default fallback
          return [0,150,255,255]; // fallback color instead of black
        },
        getLineWidth: 5,
        lineWidthUnits: "pixels",
        lineJointRounded: true,
        lineCapRounded: true,

        visible: layerVisibility.CELLS, // zoom gating handled by the layers array

        onClick: (info, event) => {
            if (blockMapDataPick) return;
            if (event?.srcEvent?.button === 2) return; // ignore right-click
            if (info.object) {
                dispatch(MapActions.setSelectedCell({
                ...info.object,
                _lng: info.coordinate[0],
                _lat: info.coordinate[1]
                }));
            }
        },

    });

  },
      [operatorFiltered,
      sortedCells,
      operator,
      config.mapScale,
      dispatch,
      currentZoom,
      selectedCell,
      activeThematic?.type,
      activeThematic?.colors,
      activeThematic?.opacity,
      activeThematic?.kpiConfig,
      cellKpiData,
      layerOpacity.CELLS,
      layerVisibility.CELLS,
      blockMapDataPick,
      neighbourRelations?.cellId,
      neighbourRelations?.data?.length,
    ]);

const siteLayer = useMemo(() => {
    if (!layerVisibility.SITES) return null;
    if (!rawSites || rawSites.length === 0) return null;

    return new ScatterplotLayer({
        id: `site-layer-${operator}`,
        data: rawSites.filter(
            d => !isNaN(Number(d.longitude)) && !isNaN(Number(d.latitude))
        ),
        pickable: !blockMapDataPick,
        getPosition: d => [Number(d.longitude), Number(d.latitude)],
        radiusUnits: "pixels",
        getRadius: 6,
        radiusScale: config.siteScale / 2,
        getFillColor: d => {
            if (selectedCell && d.site_name === selectedCell.site_name)
                return [255, 255, 0, 255];

            const opacity = activeSiteThematic?.opacity ?? 1;

            if (activeSiteThematic?.type === "KPIs") {
                const kpiConfig = activeSiteThematic.kpiConfig || {};
                const kpiValue = siteKpiData[d.tower_id];
                if (kpiValue != null) {
                    const { color } = getDriveTestColor(kpiValue, kpiConfig.kpi, kpiConfig.mode, kpiConfig.ranges);
                    return hexToRgba(color, opacity);
                }
                return hexToRgba("#888888", opacity); // grey = no data
            }

            const field = THEMATIC_FIELD_MAP[activeSiteThematic?.type];
            if (field) {
                const hex = activeSiteThematic.colors?.[d[field]];
                if (hex) return hexToRgba(hex, opacity);
            }

            if (d.status === "Deactivated") return [255, 0, 0, 180];
            return [255, 140, 0, 220];
        },
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 1,
        lineWidthUnits: "pixels",
        updateTriggers: {
            getFillColor: [
                selectedCell,
                activeSiteThematic?.type,
                activeSiteThematic?.colors,
                activeSiteThematic?.opacity,
                activeSiteThematic?.kpiConfig,
                siteKpiData,
            ]
        },
        onClick: info => {
            if (blockMapDataPick) return;
            if (info.object) {
                dispatch(MapActions.setViewState({
                    longitude: Number(info.object.longitude),
                    latitude: Number(info.object.latitude),
                    zoom: 14,
                    transitionDuration: 800
                }));
            }
        }
    });
}, [
    rawSites,
    operator,
    dispatch,
    selectedCell,
    layerVisibility.SITES,
    config.siteScale,
    activeSiteThematic?.type,
    activeSiteThematic?.colors,
    activeSiteThematic?.opacity,
    activeSiteThematic?.kpiConfig,
    siteKpiData,
    blockMapDataPick,
]);
  /* ============================================================
     🔹 Highlight LAYER (deck.gl) - highlighting cell/site
  ============================================================ */

  // Highlights the site location with a dot — used when searching by site
  const siteHighlightLayer = useMemo(() => {

    if (!highlightedCell || !operatorFiltered) return null;
    if (selectedCell) return null; // cell sector highlight takes over

    const siteHighlightData = operatorFiltered.filter(
      d => d.cell_id === highlightedCell?.cell_id &&
        d.longitude != null && d.latitude != null &&
        !isNaN(Number(d.longitude)) && !isNaN(Number(d.latitude)) &&
        Number(d.longitude) !== 0 && Number(d.latitude) !== 0
    );
    if (!siteHighlightData.length) return null;

    return new ScatterplotLayer({
      id: "site-highlight",

      data: siteHighlightData,

      pickable: false,

      getPosition: d => [Number(d.longitude), Number(d.latitude)],

      getFillColor: [255, 215, 0, 255],

      getRadius: 14,
      radiusUnits: "pixels",
    });
  }, [operatorFiltered, highlightedCell, selectedCell]);


  /* ============================================================
     🔹 TA SECTOR LAYER (deck.gl) — annular sectors per distance band
  ============================================================ */
  const taSectorLayer = useMemo(() => {

    if (!selectedTaCells?.length) return null;

    // HSL → RGB helper
    const hslToRgb = (h, s, l) => {
      s /= 100; l /= 100;
      const k = n => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    };

    const perRingCount = s => (s.total_samples || 0) * (s['Share in range %'] || 0) / 100;

    // Build slices per cell; each cell gets a distinct hue band
    const cellCount = selectedTaCells.length;
    const allSlices = [];
    selectedTaCells.forEach(({ cellId, taData, cellCoords }, cellIndex) => {
      const sorted = [...taData].sort((a, b) => a.distance - b.distance);
      const n = sorted.length;
      sorted.forEach((row, i) => {
        allSlices.push({
          ...row,
          // Pin to the cell's known coordinates so the TA rings always appear on the correct cell
          latitude:  cellCoords?.lat      ?? row.latitude,
          longitude: cellCoords?.lng      ?? row.longitude,
          azimuth:   cellCoords?.azimuth  ?? row.azimuth,
          length:    cellCoords?.beamWidth ?? row.length,
          cellId,
          innerMeters: i === 0 ? 0 : sorted[i - 1].distance,
          outerMeters: row.distance,
          ringIndex: i,
          ringCount: n,
          cellIndex,
          cellCount,
        });
      });
    });

    // scale so the tallest ring across all cells = ~3000m
    // const maxSamples = Math.max(...allSlices.map(perRingCount), 1);
    // const elevationScale = 3000 / maxSamples;

    // zoom-aware height scaling
    const zoomFactor = Math.pow(2, Math.max(0, 14 - currentZoom)); // grows as you zoom out

    const MIN_HEIGHT = 10;   // smallest ring is always visible (meters)
    const MAX_HEIGHT = 600; // tallest ring caps here (meters)

    // normalisaton using (Logarithmic )
    const logVal = d => Math.log(perRingCount(d) + 1);
    const maxLogVal = Math.max(...allSlices.map(logVal), 1);

    // normalisaton using (cube root)
    const cbrtVal = d => Math.cbrt(perRingCount(d));
    const maxCbrtVal = Math.max(...allSlices.map(cbrtVal), 1);

    // Square root
    const sqrtVal = d => Math.sqrt(perRingCount(d));
    const maxSqrtVal = Math.max(...allSlices.map(sqrtVal), 1);

    // Min-Max with power cap
    const rawVal = d => perRingCount(d);
    const maxRawVal = Math.max(...allSlices.map(rawVal), 1);

    const sharedProps = {
      data: allSlices,
      getPolygon: d => generateAnnularSector(
        d.longitude, d.latitude,
        d.azimuth, d.length,
        d.innerMeters, d.outerMeters,
      ),
      // getElevation: d => perRingCount(d) * elevationScale,
      // getElevation: d => MIN_HEIGHT + (logVal(d) / maxLogVal) * (MAX_HEIGHT - MIN_HEIGHT),
      // getElevation: d => {
      //   const raw = perRingCount(d);
      //   const height = MIN_HEIGHT + (logVal(d) / maxLogVal) * (MAX_HEIGHT - MIN_HEIGHT);
      //   console.log(`[TA] cell=${d.cellId} dist=${d.distance}m raw=${raw.toFixed(0)} → height=${height.toFixed(0)}m`);
      //   return height;
      // },
      // getElevation: d => MIN_HEIGHT + (cbrtVal(d) / maxCbrtVal) * (MAX_HEIGHT - MIN_HEIGHT),
      // getElevation: d => MIN_HEIGHT + (sqrtVal(d) / maxSqrtVal) * (MAX_HEIGHT - MIN_HEIGHT),
      getElevation: d => Math.pow(rawVal(d) / maxRawVal, 0.3) * MAX_HEIGHT,

      extruded: true,
      updateTriggers: {
        getPolygon: selectedTaCells,
        getFillColor: selectedTaCells,
        getLineColor: selectedTaCells,
        getElevation: selectedTaCells,
      },
    };

    // Layer 1: solid fill (semi-transparent so rings are distinguishable)
    const fillLayer = new PolygonLayer({
      ...sharedProps,
      id: 'ta-sector-layer-fill',
      pickable: !blockMapDataPick,
      filled: true,
      stroked: false,
      wireframe: false,
      getFillColor: d => {
        // golden angle (137.508°) guarantees adjacent rings are always maximally far apart in hue
        const hue = (d.ringIndex * 137.508 + d.cellIndex * 47) % 360;
        return [...hslToRgb(hue, 80, 48), 150];
      },
      material: { ambient: 0.35, diffuse: 0.6, shininess: 32 },
      onClick: (info, event) => {
        if (blockMapDataPick) return;
        if (event?.srcEvent?.button === 2) return;
        const hits = deckRef.current?.pickMultipleObjects({
          x: info.pixel[0], y: info.pixel[1], radius: 2,
        });
        const sectorHit = hits?.find(h => h.layer?.id?.startsWith('sector-layer-'));
        if (sectorHit?.object) {
          dispatch(MapActions.setSelectedCell({
            ...sectorHit.object,
            _lng: info.coordinate[0],
            _lat: info.coordinate[1],
          }));
        }
      },
    });

    return [fillLayer];
  }, [selectedTaCells, dispatch, blockMapDataPick]);

  /* ============================================================
     🔹 GEO Json LAYER (deck.gl)
  ============================================================ */
  // Testing from frontend file load
    // const customGeoJsonLayer = useMemo(() => {
    //   if (!geojsonLayer) return null;
    //   return new GeoJsonLayer({
    //     id: 'custom-geojson-layer',
    //     data: geojsonLayer,
    //     filled: true,
    //     stroked: true,
    //     getFillColor: [0, 229, 160, 60],      // moderate teal fill
    //     getLineColor: [10, 40, 30, 220],      // dark near-black green borders 
    //     lineWidthUnits: 'pixels',
    //     pickable: true,
    //   });
    // }, [geojsonLayer]);
  
  const customGeoJsonLayer = useMemo(() => {
    if (!boundaryGeoJson) return null;

    return new GeoJsonLayer({
      id: `boundary-layer-${Object.keys(boundaryColors).length}`,
      data: boundaryGeoJson,
      dataComparator: () => false,
      filled: false,
      stroked: true,
      getFillColor: [0,0,0,0],
      getLineColor: feature => {
        // Get the group name from the feature properties
        const groupName = feature.properties?.shapegroup;
        // Look up the color for this group
        const hex = boundaryColors[groupName] || "#000000";

        const [r,g,b] = hexToRgba(hex);
        return [r, g, b, 200];
      },
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 2,
      pickable: !blockMapDataPick,
      opacity: layerOpacity.BOUNDARY,
      updateTriggers: {
        getLineColor: [boundaryColors],
        getFillColor: [boundaryColors, layerOpacity.BOUNDARY]
      }
    });
  }, [boundaryGeoJson, boundaryColors, layerOpacity.BOUNDARY, blockMapDataPick]);

  const rfPredictionLayer = useMemo(() => {
    if (!rfPredictionGeoJson) return null;

    // console.log(rfPredictionGeoJson);
    const activeParam = config.rfParameter || "RSRP";

    return new GeoJsonLayer({
      id: "rf-prediction-layer",
      data: rfPredictionGeoJson,
      filled: true,
      stroked: true,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 3,
      getLineWidth: 30,
      getLineColor: feature => {
        const props = feature.properties;
        const entry = rfColorConfig.find(
          c => c.parameter_name === props.parameter && c.range_label === props.range
        );
        if (entry) return hexToRgba(entry.color_hex, 1);
        const categoryMatch = props.range?.match(/\(([^)]+)\)$/);
        const category = categoryMatch?.[1];
        return hexToRgba(RF_CATEGORY_COLORS[category] || "#9CA3AF", 1);
      },
      // getFillColor: feature => {
      //   const range = feature.properties.range;
      //   const entry = rfColorConfig.find(
      //     c => c.parameter_name === activeParam && c.range_label === range
      //   );
      //   if (entry) return hexToRgba(entry.color_hex, layerOpacity.RF);
      //   return [200, 200, 200, Math.round(layerOpacity.RF * 255)];

      //     // console.log(feature.properties.range, "feature.properties.range");
      //     // console.log(rfColorConfig, "rfColorConfig");
      // },
      getFillColor: feature => {
        const props = feature.properties;
        const entry = rfColorConfig.find(
          c => c.parameter_name === props.parameter && c.range_label === props.range
        );
        if (entry) return hexToRgba(entry.color_hex, 1);
        // Extract category from range_label like "-105 to -100 dBm (Bad)" → "Bad"
        const categoryMatch = props.range?.match(/\(([^)]+)\)$/);
        const category = categoryMatch?.[1];
        return hexToRgba(RF_CATEGORY_COLORS[category] || "#9CA3AF", 1);
      },
      pickable: !blockMapDataPick,
      opacity: layerOpacity.RF,
      updateTriggers: {
        getFillColor: [rfColorConfig, config.rfParameter, layerOpacity.RF],
        getLineColor: [rfColorConfig, config.rfParameter],
      },
      // onHover: (info) => {
      //   if (info.object) {
      //     const range = info.object.properties.range;
      //     const activeParam = config.rfParameter || "RSRP";
      //     const entry = rfColorConfig.find(
      //       c => c.parameter_name === activeParam && c.range_label === range
      //     );
      //     setRfTooltip({
      //       x: info.x,
      //       y: info.y,
      //       range,
      //       color_hex: entry?.color_hex || "#C8C8C8",
      //       parameter: activeParam,
      //     });
      //   } else {
      //     setRfTooltip(null);
      //   }
      // },
onHover: (info) => {

  if (!info.object) {
    setRfTooltip(null);
    return;
  }

  const props = info.object.properties;

  const parameter = props.parameter;
  const range = props.range;

  const entry = rfColorConfig.find(
    c => c.parameter_name === parameter && c.range_label === range
  );
  let fallbackColor = "#9CA3AF";
  if (!entry) {
    const categoryMatch = range?.match(/\(([^)]+)\)$/);
    const category = categoryMatch?.[1];
    fallbackColor = RF_CATEGORY_COLORS[category] || "#9CA3AF";
  }

  setRfTooltip({
    x: info.x,
    y: info.y,
    parameter,
    range,
    color_hex: entry?.color_hex || fallbackColor,
  });
},
    });
  }, [rfPredictionGeoJson, rfColorConfig, config.rfParameter, layerOpacity.RF, blockMapDataPick]);

  // At low zoom (< 8) the RF polygons are sub-pixel. Show one colored dot per region at its centroid.
  const rfCentroidLayer = useMemo(() => {
    if (!rfPredictionGeoJson?.features?.length || currentZoom >= 4) return null;

    const seen = new Set();
    const points = [];

    rfPredictionGeoJson.features.forEach(f => {
      const region = f.properties?.region || f.properties?.name || "unknown";
      if (seen.has(region)) return;
      seen.add(region);

      const geom = f.geometry;
      const coords = geom?.type === "Polygon"
        ? geom.coordinates[0]
        : geom?.type === "MultiPolygon"
          ? geom.coordinates.flat(2)
          : [];
      if (!coords.length) return;

      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;

      const props = f.properties;
      const entry = rfColorConfig.find(
        c => c.parameter_name === props.parameter && c.range_label === props.range
      );
      let colorHex = "#9CA3AF";
      if (entry) {
        colorHex = entry.color_hex;
      } else {
        const categoryMatch = props.range?.match(/\(([^)]+)\)$/);
        const category = categoryMatch?.[1];
        colorHex = RF_CATEGORY_COLORS[category] || "#9CA3AF";
      }
      const color = hexToRgba(colorHex, layerOpacity.RF);

      points.push({ position: [lng, lat], color, region });
    });

    if (!points.length) return null;

    return new ScatterplotLayer({
      id: "rf-centroid-layer",
      data: points,
      getPosition: d => d.position,
      getFillColor: d => d.color,
      getRadius: 40000,
      radiusMinPixels: 6,
      radiusMaxPixels: 20,
      pickable: false,
      opacity: layerOpacity.RF,
      updateTriggers: {
        getFillColor: [rfColorConfig, config.rfParameter, layerOpacity.RF],
      },
    });
  }, [rfPredictionGeoJson, rfColorConfig, config.rfParameter, layerOpacity.RF, currentZoom]);

  /* ============================================================
     🔹 RF Drive TEST LAYER (deck.gl)
  ============================================================ */
  const drivetestLayer = useMemo(() => {

    if (!activeDriveSessions.length) return null;
    const filtered = driveTestData.filter(
      d => activeDriveSessions.includes(d.session_id)
    );

    if (!filtered.length) return null;
    // if (!driveTestData || driveTestData.length === 0) return null;

    return new ScatterplotLayer({
      id: "drivetest-layer",
      data: filtered,
      pickable: !blockMapDataPick,
      opacity: layerOpacity.DRIVE_TEST,

      getPosition: d => [
        Number(d.longitude),
        Number(d.latitude)
      ],

      // radiusUnits: "meters",
      // getRadius: 20,

      radiusUnits: "pixels",
      getRadius: 5,
      radiusMinPixels: 3,
      radiusScale: (driveTestFilters?.driveTestScale ?? 1) / 2,

      getFillColor: d => {
        const quality = getSignalQuality(d.rssi);
        return quality.colorRGB;
      },
      updateTriggers: {
        getFillColor: [driveTestFilters?.thematic, driveTestFilters?.thematicMode, driveTestFilters?.ranges]
      }
      // opacity: 0.9
    });

  }, [driveTestData, activeDriveSessions, driveTestFilters, blockMapDataPick]);

  // for hover values(color of string), dot colors
  const getSignalQuality = (rssi) => {
      const { color, label } = getDriveTestColor(
          rssi,
          driveTestFilters?.thematic || "RSSI",
          driveTestFilters?.thematicMode || "Default",
          driveTestFilters?.ranges || []
      );
      return {
          label,
          colorText: color,
          colorRGB: hexToRgba(color).slice(0, 3)
      };
  };

  const toggleGisFullscreen = useCallback(() => {
    const el = fullscreenRootRef?.current ?? mapAreaRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, [fullscreenRootRef]);

  const applyGisZoomDelta = useCallback(
    (delta) => {
      const z0 = activeViewState?.zoom ?? 6;
      const z = Math.min(20, Math.max(2, z0 + delta));
      const nv = { ...activeViewState, zoom: z, transitionDuration: 250 };
      if (syncEnabled) {
        dispatch(MapActions.setViewState(nv));
      } else {
        setLocalViewState(nv);
      }
    },
    [activeViewState, dispatch, syncEnabled],
  );

  const toggleGisMeasuring = useCallback(() => {
    setGisMeasuring((current) => {
      const next = !current;
      if (!next) {
        if (gisPendingAddRef.current != null) {
          window.clearTimeout(gisPendingAddRef.current);
          gisPendingAddRef.current = null;
        }
        setGisMeasurements([]);
        setGisDraftMeasurement(null);
        setGisMeasurementCursor(null);
      } else {
        if (rulerMode) dispatch(MapActions.setRulerMode(false));
        setCoordinatePopup(null);
        setGisDraftMeasurement(buildDraftMeasurement([]));
        setGisMeasurementCursor(null);
        dispatch(MapActions.setSelectedCell(null));
      }
      return next;
    });
  }, [dispatch, rulerMode]);

  /**
   * Double-click / double-tap: finish path — solid orange line + black labels (draft → completed).
   * Does not add the dblclick as an extra vertex when ≥2 points (avoids duplicate corner).
   * One point + dblclick: adds click as second vertex if >2 m from first, then completes.
   */
  const finalizeGisDoubleClick = useCallback((lng, lat, screenX, screenY) => {
    const el = mapAreaRef.current;
    const w = el?.clientWidth || 800;
    const h = el?.clientHeight || 600;
    const vs = activeViewStateRef.current;
    const currentDraft = gisDraftRef.current?.points || [];
    const clickedPoint = { longitude: lng, latitude: lat };

    if (currentDraft.length === 0) return;

    const cleared = buildDraftMeasurement([]);

    if (currentDraft.length === 1) {
      const shouldAppend =
        !currentDraft[0] || haversineDistanceMeters(currentDraft[0], clickedPoint) > 2;
      const nextPoints = shouldAppend ? [...currentDraft, clickedPoint] : currentDraft;
      if (nextPoints.length < 2) return;
      setGisMeasurements((prev) => [...prev, createMeasurement(nextPoints, false)]);
      setGisDraftMeasurement(cleared);
      setGisMeasurementCursor(null);
      return;
    }

    const closed =
      currentDraft.length >= 3 &&
      isCloseToFirstPointScreen(currentDraft, screenX, screenY, vs, w, h);
    setGisMeasurements((prev) => [...prev, createMeasurement(currentDraft, closed)]);
    setGisDraftMeasurement(cleared);
    setGisMeasurementCursor(null);
  }, []);

  const handleGisMeasureMapClick = useCallback(
    (coordinate, screenX, screenY, nativeEvent) => {
      if (!gisMeasuring || !coordinate) return;
      const lng = coordinate[0];
      const lat = coordinate[1];
      const el = mapAreaRef.current;
      const w = el?.clientWidth || 800;
      const h = el?.clientHeight || 600;
      const clickCount = Number(nativeEvent?.detail) || 1;

      if (clickCount >= 3) return;

      const currentDraft = gisDraftRef.current?.points || [];
      const vs = activeViewStateRef.current;

      if (clickCount >= 2) {
        flushGisPendingAdd();
        finalizeGisDoubleClick(lng, lat, screenX, screenY);
        return;
      }

      if (isCloseToFirstPointScreen(currentDraft, screenX, screenY, vs, w, h)) {
        flushGisPendingAdd();
        const cleared = buildDraftMeasurement([]);
        setGisMeasurements((prev) => [...prev, createMeasurement(currentDraft, true)]);
        setGisDraftMeasurement(cleared);
        setGisMeasurementCursor(null);
        return;
      }

      const nextPoint = { longitude: lng, latitude: lat };
      const draftLen = currentDraft.length;

      flushGisPendingAdd();

      const applyVertex = () => {
        setGisDraftMeasurement((current) => {
          const pts = current?.points || [];
          return buildDraftMeasurement([...pts, nextPoint]);
        });
        setGisMeasurementCursor(null);
        dispatch(MapActions.setSelectedCell(null));
      };

      if (draftLen >= 2) {
        gisPendingAddRef.current = window.setTimeout(() => {
          gisPendingAddRef.current = null;
          applyVertex();
        }, GIS_MEASURE_CLICK_DELAY_MS);
      } else {
        applyVertex();
      }
    },
    [gisMeasuring, dispatch, finalizeGisDoubleClick, flushGisPendingAdd],
  );

  /** Native dblclick / pick — Deck `srcEvent.detail` is often 1; browser `dblclick` still fires. */
  const runGisFinalizeFromScreen = useCallback(
    (clientX, clientY) => {
      const rect = mapAreaRef.current?.getBoundingClientRect();
      const deck = deckRef.current;
      if (!rect) return;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (!(gisDraftRef.current?.points?.length >= 1)) return;

      let lng;
      let lat;
      const picked = deck?.pickObject?.({ x, y, radius: 48 });
      if (picked?.coordinate) {
        [lng, lat] = picked.coordinate;
      } else {
        const vs = activeViewStateRef.current;
        const w = rect.width || mapBox.w || 800;
        const h = rect.height || mapBox.h || 600;
        const vp = new WebMercatorViewport({
          width: w,
          height: h,
          longitude: vs.longitude,
          latitude: vs.latitude,
          zoom: vs.zoom,
          pitch: vs.pitch ?? 0,
          bearing: vs.bearing ?? 0,
        });
        const u = vp.unproject([x, y]);
        if (!u) return;
        [lng, lat] = u;
      }

      flushGisPendingAdd();
      finalizeGisDoubleClick(lng, lat, x, y);
    },
    [finalizeGisDoubleClick, flushGisPendingAdd, mapBox.w, mapBox.h],
  );

  const gisMeasurementLineGeoJson = useMemo(
    () => buildMeasurementLineCollection(gisMeasurements),
    [gisMeasurements],
  );
  const gisMeasurementFillGeoJson = useMemo(
    () => buildMeasurementPolygonCollection(gisMeasurements),
    [gisMeasurements],
  );
  const gisMeasurementPoints = useMemo(
    () => buildMeasurementPointMarkers(gisMeasurements, gisDraftMeasurement, gisMeasurementCursor),
    [gisMeasurements, gisDraftMeasurement, gisMeasurementCursor],
  );
  const gisAreaLabels = useMemo(() => buildMeasurementAreaLabels(gisMeasurements), [gisMeasurements]);
  const gisDraftMeasurementGeoJson = useMemo(
    () => buildDraftMeasurementLineCollection(gisDraftMeasurement, gisMeasurementCursor),
    [gisDraftMeasurement, gisMeasurementCursor],
  );
  /** Datayog `liveMeasurementLabel` */
  const gisLiveCursorLabel = useMemo(() => {
    if (!gisDraftMeasurement?.points?.length || !gisMeasurementCursor) return null;
    const lastPoint = gisDraftMeasurement.points[gisDraftMeasurement.points.length - 1];
    const draftDistance =
      gisDraftMeasurement.pointReadings?.[gisDraftMeasurement.points.length - 1] || 0;
    const totalDistance =
      draftDistance + haversineDistanceMeters(lastPoint, gisMeasurementCursor);
    return {
      longitude: gisMeasurementCursor.longitude,
      latitude: gisMeasurementCursor.latitude,
      text: formatDistance(totalDistance),
    };
  }, [gisDraftMeasurement, gisMeasurementCursor]);

  /** Screen positions for Next.js–parity HTML markers (above WebGL canvas). */
  const gisHtmlOverlay = useMemo(() => {
    const has =
      gisMeasurementPoints.length > 0 || gisLiveCursorLabel || gisAreaLabels.length > 0;
    if (!has) return null;
    const { w, h } = mapBox;
    if (w < 16 || h < 16) return null;
    const vs = activeViewState;
    const vp = new WebMercatorViewport({
      width: w,
      height: h,
      longitude: vs.longitude,
      latitude: vs.latitude,
      zoom: vs.zoom,
      pitch: vs.pitch ?? 0,
      bearing: vs.bearing ?? 0,
    });
    const project = (lng, lat) => {
      const [x, y] = vp.project([lng, lat]);
      return { x, y };
    };
    return {
      vertices: gisMeasurementPoints.map((p, idx) => {
        const base = {
          ...p,
          ...project(p.longitude, p.latitude),
        };
        const { lox, loy } = gisVertexLabelOffsetPx(vp, p, idx);
        return { ...base, lox, loy };
      }),
      live: gisLiveCursorLabel
        ? (() => {
            const lastPt =
              gisDraftMeasurement.points[gisDraftMeasurement.points.length - 1];
            const { lox, loy } = gisLiveDraftLabelOffsetPx(
              vp,
              lastPt,
              gisLiveCursorLabel,
              gisDraftMeasurement.points,
            );
            return {
              ...gisLiveCursorLabel,
              ...project(gisLiveCursorLabel.longitude, gisLiveCursorLabel.latitude),
              lox,
              loy,
            };
          })()
        : null,
      areas: gisAreaLabels.map((a) => ({
        ...a,
        ...project(a.longitude, a.latitude),
      })),
    };
  }, [
    mapBox,
    activeViewState,
    gisMeasurementPoints,
    gisLiveCursorLabel,
    gisAreaLabels,
    gisDraftMeasurement,
  ]);

  /** Screen position for coordinate triple-click popup (`PopupView` anchor bottom + offset 18 in Datayog). */
  const coordinatePopupScreen = useMemo(() => {
    if (!coordinatePopup) return null;
    const { w, h } = mapBox;
    if (w < 16 || h < 16) return null;
    const vs = activeViewState;
    const vp = new WebMercatorViewport({
      width: w,
      height: h,
      longitude: vs.longitude,
      latitude: vs.latitude,
      zoom: vs.zoom,
      pitch: vs.pitch ?? 0,
      bearing: vs.bearing ?? 0,
    });
    const [px, py] = vp.project([coordinatePopup.longitude, coordinatePopup.latitude]);
    return { x: px, y: py };
  }, [coordinatePopup, mapBox, activeViewState]);

  /** Datayog only mounts fill source when `measurementAreaLabels.length` (page.js ~4187). */
  const gisFillLayer = useMemo(() => {
    if (!gisAreaLabels.length || !gisMeasurementFillGeoJson?.features?.length) return null;
    return new GeoJsonLayer({
      id: "gis-measure-fill",
      data: gisMeasurementFillGeoJson,
      pickable: false,
      filled: true,
      stroked: false,
      getFillColor: [242, 101, 34, Math.round(255 * 0.16)],
    });
  }, [gisAreaLabels, gisMeasurementFillGeoJson]);

  const gisCompletedLinesLayer = useMemo(() => {
    if (!gisMeasurementLineGeoJson?.features?.length) return null;
    return new GeoJsonLayer({
      id: "gis-measure-lines",
      data: gisMeasurementLineGeoJson,
      pickable: false,
      stroked: true,
      filled: false,
      getLineColor: [242, 101, 34, Math.round(255 * 0.95)],
      getLineWidth: gisCompletedLineWidthPx(currentZoom),
      lineWidthUnits: "pixels",
    });
  }, [gisMeasurementLineGeoJson, currentZoom]);

  const gisDraftPathData = useMemo(() => {
    if (!gisMeasuring) return [];
    const coords = gisDraftMeasurementGeoJson?.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return [];
    return [{ path: coords }];
  }, [gisMeasuring, gisDraftMeasurementGeoJson]);

  const gisDraftPathLayer = useMemo(() => {
    if (!gisMeasuring || gisDraftPathData.length === 0) return null;
    return new PathLayer({
      id: "gis-measure-draft-path",
      data: gisDraftPathData,
      getPath: (d) => d.path,
      getColor: [242, 101, 34, Math.round(255 * 0.9)],
      getWidth: gisDraftLineWidthPx(currentZoom),
      widthUnits: "pixels",
      capRounded: true,
      jointRounded: true,
      extensions: [GIS_DRAFT_PATH_EXTENSION],
      getDashArray: GIS_DRAFT_DASH_ARRAY,
      dashJustified: true,
    });
  }, [gisMeasuring, gisDraftPathData, currentZoom]);

  /* ============================================================
     🔹 Ruler — independent line segments
  ============================================================ */
  // Lines for all completed segments
  const rulerLineLayer = useMemo(() => {
    const complete = rulerSegments.filter(s => s.b !== null);
    if (!rulerMode || complete.length === 0) return null;
    return new LineLayer({
      id: "ruler-line",
      data: complete,
      getSourcePosition: d => d.a,
      getTargetPosition: d => d.b,
      getColor: [20, 20, 20, 220],
      getWidth: 2,
      widthUnits: "pixels",
    });
  }, [rulerMode, rulerSegments]);

  // Preview line from active segment's A to cursor
  const rulerPreviewLayer = useMemo(() => {
    if (!rulerMode || !activeSegment || !rulerHover) return null;
    return new LineLayer({
      id: "ruler-preview",
      data: [{ from: activeSegment.a, to: rulerHover }],
      getSourcePosition: d => d.from,
      getTargetPosition: d => d.to,
      getColor: [20, 20, 20, 100],
      getWidth: 1.5,
      widthUnits: "pixels",
    });
  }, [rulerMode, activeSegment, rulerHover]);

  // All endpoint dots + hover preview dot; dots are draggable and clickable (snap)
  const rulerDotsLayer = useMemo(() => {
    if (!rulerMode || rulerSegments.length === 0) return null;

    const dots = [];
    rulerSegments.forEach(seg => {
      const isPendingA = !seg.b; // this is the A of the in-progress segment
      dots.push({ position: seg.a, segId: seg.id, endpoint: 'a', preview: false, pendingA: isPendingA });
      if (seg.b) dots.push({ position: seg.b, segId: seg.id, endpoint: 'b', preview: false, pendingA: false });
    });
    if (rulerHover && activeSegment) {
      dots.push({ position: rulerHover, segId: null, endpoint: null, preview: true, pendingA: false });
    }

    return new ScatterplotLayer({
      id: "ruler-dots",
      data: dots,
      getPosition: d => d.position,
      // amber = pending A (click to cancel), grey = hover preview, white = confirmed
      getFillColor: d => d.preview ? [200, 200, 200, 180] : d.pendingA ? [251, 191, 36, 255] : [255, 255, 255, 255],
      getLineColor: d => d.pendingA ? [180, 120, 0, 255] : [20, 20, 20, 255],
      getRadius: d => d.preview ? 5 : d.pendingA ? 14 : 8,
      radiusUnits: "pixels",
      stroked: true,
      lineWidthUnits: "pixels",
      getLineWidth: 2,
      pickable: true,

      updateTriggers: { getFillColor: rulerSegments, getLineColor: rulerSegments },

      onHover: (info) => {
        const obj = info.object;
        setHoveringRulerDot(!!obj && !obj.preview);
      },
      onClick: (info, event) => {
        if (!info.object || info.object.preview) return;
        if (event?.rightButton) return; // right-click handled by contextmenu
        // snap to this dot — start or complete a segment
        const snapPos = info.object.position;
        setRulerSegments(prev => {
          const active = prev.find(s => s.b === null);
          if (active) return prev.map(s => s.id === active.id ? { ...s, b: snapPos } : s);
          return [...prev, { id: Date.now(), a: snapPos, b: null }];
        });
        setRulerHover(null);
      },
      onDragStart: (info) => {
        if (!info.object || info.object.preview) return;
        draggingRulerRef.current = { segId: info.object.segId, endpoint: info.object.endpoint };
        setIsDraggingRulerDot(true);
      },
      onDrag: (info) => {
        if (!draggingRulerRef.current || !info.coordinate) return;
        const { segId, endpoint } = draggingRulerRef.current;
        setRulerSegments(prev => prev.map(s => s.id === segId ? { ...s, [endpoint]: info.coordinate } : s));
      },
      onDragEnd: () => {
        draggingRulerRef.current = null;
        setIsDraggingRulerDot(false);
      },
    });
  }, [rulerMode, rulerSegments, rulerHover, activeSegment]);


  // Distance label per completed segment + hover preview label
  const rulerLabelLayer = useMemo(() => {
    if (!rulerMode || rulerSegments.length === 0) return null;

    const fmtDist = (a, b) => {
      const d = haversineKm(a, b);
      return d >= 1 ? `${d.toFixed(2)} km` : `${(d * 1000).toFixed(0)} m`;
    };
    const midPt = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

    const labels = rulerSegments
      .filter(s => s.b !== null)
      .map(s => ({ position: midPt(s.a, s.b), text: fmtDist(s.a, s.b) }));

    if (activeSegment && rulerHover) {
      labels.push({ position: midPt(activeSegment.a, rulerHover), text: fmtDist(activeSegment.a, rulerHover) });
    }
    if (labels.length === 0) return null;

    return new TextLayer({
      id: "ruler-label",
      data: labels,
      getPosition: d => d.position,
      getText: d => d.text,
      getSize: 13,
      getColor: [20, 20, 20, 255],
      getBackgroundColor: [255, 255, 255, 220],
      background: true,
      backgroundPadding: [6, 3, 6, 3],
      getBorderColor: [20, 20, 20, 180],
      getBorderWidth: 1,
      fontWeight: 600,
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      pickable: false,
      fontFamily: "sans-serif",
    });
  }, [rulerMode, rulerSegments, rulerHover, activeSegment]);


  
  /* ============================================================
     🔹 NEIGHBOR RELATIONS LAYERS
  ============================================================ */

  // Classify each NR relation. Radius comes from rawCells.radius_m via nrRadiusCacheRef —
  // the SAME value generateCoordinates uses to draw the sector polygon, so tips land exactly
  // on the visible arc edge. Lines with missing radius are SKIPPED (never drawn at apex).
  const nrClassified = useMemo(() => {
    if (!neighbourRelations?.data?.length) return { drawable: [], skipped: [] };
console.log("CACHE SIZE", Object.keys(nrRadiusCacheRef.current).length);
    const cache = nrRadiusCacheRef.current;
    const drawable = [];
    const skipped  = [];

    for (const d of neighbourRelations.data) {
      const reasons = [];

      if (d.s_latitude == null || d.s_longitude == null) reasons.push('source coords missing');
      if (d.t_latitude == null || d.t_longitude == null) reasons.push('target coords missing');
      if (d.s_azimuth == null)                           reasons.push('s_azimuth missing');
      if (d.t_azimuth == null)                           reasons.push('t_azimuth missing');
      if (reasons.length) { skipped.push({ source: d.source, target: d.target, type: d.type, reasons }); continue; }

      const srcRadius = cache[d.source];
      const tgtRadius = cache[d.target];
      if (!Number.isFinite(srcRadius) || srcRadius <= 0) reasons.push('source cell radius not yet loaded (pan to its site)');
      if (!Number.isFinite(tgtRadius) || tgtRadius <= 0) reasons.push('target cell radius not yet loaded (pan to its site)');

      if (reasons.length) {
        skipped.push({ source: d.source, target: d.target, type: d.type, reasons });
      } else {
        drawable.push({ ...d, srcRadius, tgtRadius });
      }
    }

    return { drawable, skipped };
  }, [neighbourRelations, nrCacheTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const nrSkipped   = nrClassified.skipped;
  const nrPositions = nrClassified.drawable.length ? nrClassified.drawable : null;

  // Tips computed dynamically with the same zoomBoost as sectorLayer so lines always land on
  // the visible sector arc edge. updateTriggers explicitly forces DeckGL to recompute positions
  // on every zoom/scale change, preventing stale-accessor issues at zoom transitions.
  const neighbourLinesLayer = useMemo(() => {
    if (!nrPositions?.length) return null;
    const mapScale  = config.mapScale || 1;
    const zoomBoost = computeZoomBoost(currentZoom); // same function as sectorLayer — never diverges
    return new LineLayer({
      id: "nr-lines-layer",
      data: nrPositions,
      pickable: true,
      getSourcePosition: d => getSectorTip(d.s_latitude, d.s_longitude, d.s_azimuth, d.srcRadius, mapScale, zoomBoost),
      getTargetPosition: d => getSectorTip(d.t_latitude, d.t_longitude, d.t_azimuth, d.tgtRadius, mapScale, zoomBoost),
      updateTriggers: {
        getSourcePosition: [currentZoom, config.mapScale],
        getTargetPosition: [currentZoom, config.mapScale],
      },
      getColor: d => getNrColor(d.type, d.bi_directional),
      getWidth: d => d.bi_directional ? 3 : 1.5,
      widthUnits: "pixels",
      onHover: info => {
        if (info.object) {
          const distance = haversineKm(
            [info.object.s_longitude, info.object.s_latitude],
            [info.object.t_longitude, info.object.t_latitude]
          );
          setNrTooltip({
            x: info.x,
            y: info.y,
            source: info.object.source,
            target: info.object.target,
            type: info.object.type,
            distance,
            biDirectional: info.object.bi_directional,
          });
        } else {
          setNrTooltip(null);
        }
      },
    });
  }, [nrPositions, currentZoom, config.mapScale]);

  const planNeighbourLinesLayer = useMemo(() => {
    if (!layerVisibility.NEIGHBOURS || !planNeighbourLines.length) return null;
    const mapScale  = config.mapScale || 1;
    const zoomBoost = computeZoomBoost(currentZoom);
    return new LineLayer({
      id: "plan-nr-lines-layer",
      data: planNeighbourLines,
      pickable: true,
      getSourcePosition: d => getSectorTip(d.s_latitude, d.s_longitude, d.s_azimuth, d.srcRadius || 500, mapScale, zoomBoost),
      getTargetPosition: d => getSectorTip(d.t_latitude, d.t_longitude, d.t_azimuth, d.tgtRadius || 500, mapScale, zoomBoost),
      getColor: d => {
        const hex = getNeighbourOperationColor(d.operation_type);
        return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16), 200];
      },
      getWidth: 2,
      widthUnits: "pixels",
      updateTriggers: {
        getSourcePosition: [currentZoom, config.mapScale],
        getTargetPosition: [currentZoom, config.mapScale],
      },
      onHover: info => {
        if (info.object) {
          const distance = haversineKm(
            [info.object.s_longitude, info.object.s_latitude],
            [info.object.t_longitude, info.object.t_latitude]
          );
          setPlanNrTooltip({ x: info.x, y: info.y, source: info.object.source, target: info.object.target, operation_type: info.object.operation_type, distance });
        } else {
          setPlanNrTooltip(null);
        }
      },
    });
  }, [planNeighbourLines, layerVisibility.NEIGHBOURS, currentZoom, config.mapScale]);

  /* ============================================================
     🔹 ALL LAyers Dispatching logic
  ============================================================ */
  const layers = useMemo(() => {
    const baseLayers = [];
    /** GIS fill/lines/draft under cell layers (Next.js measurement layers before cell layer). */
    if (gisFillLayer) baseLayers.push(gisFillLayer);
    if (gisCompletedLinesLayer) baseLayers.push(gisCompletedLinesLayer);
    if (gisDraftPathLayer) baseLayers.push(gisDraftPathLayer);

    if (layerVisibility.CELLS) {
      if (currentZoom < sectorVisibilityZoom && markerLayer) baseLayers.push(markerLayer); // site aggregated blobs
      if (currentZoom >= sectorVisibilityZoom && sectorLayer) baseLayers.push(sectorLayer); // cell sectors

      if (siteHighlightLayer) baseLayers.push(siteHighlightLayer);
      if (taSectorLayer) baseLayers.push(...taSectorLayer);
    }

    // NR lines visible at zoom ≥ 9 (same as sectorLayer). zoomBoost is baked into the layer
    // accessors so tips always land on the visible sector arc edge at every zoom level.
    if (currentZoom >= sectorVisibilityZoom && neighbourLinesLayer) baseLayers.push(neighbourLinesLayer);
    if (currentZoom >= sectorVisibilityZoom && planNeighbourLinesLayer) baseLayers.push(planNeighbourLinesLayer);

    if (siteLayer) baseLayers.push(siteLayer);

     // NON-CELL layers
    if (customGeoJsonLayer) baseLayers.push(customGeoJsonLayer); // kenya and other boundaries (when selected)
    if (rfPredictionLayer) baseLayers.push(rfPredictionLayer); // RF PRediction Layer (when selected)
    if (rfCentroidLayer) baseLayers.push(rfCentroidLayer);   // centroid dots at low zoom
    if (drivetestLayer) baseLayers.push(drivetestLayer); // RF drive test layer (when selected)

    // Ruler last so clicks work on top of RF / drive-test
    if (rulerLineLayer) baseLayers.push(rulerLineLayer);
    if (rulerPreviewLayer) baseLayers.push(rulerPreviewLayer);
    if (rulerDotsLayer) baseLayers.push(rulerDotsLayer);
    if (rulerLabelLayer) baseLayers.push(rulerLabelLayer);

    return baseLayers;
  }, [
    currentZoom,
    markerLayer,
    sectorLayer,
    siteHighlightLayer,
    taSectorLayer,
    nrPositions,
    neighbourLinesLayer,
    planNeighbourLinesLayer,
    customGeoJsonLayer,
    rfPredictionLayer,
    rfCentroidLayer,
    drivetestLayer,
    gisFillLayer,
    gisCompletedLinesLayer,
    gisDraftPathLayer,
    layerVisibility.CELLS,
    siteLayer,
    rulerLineLayer,
    rulerPreviewLayer,
    rulerDotsLayer,
    rulerLabelLayer,
  ]);

  /* ============================================================
     🔹 VIEW STATE HANDLER (SYNC LOGIC)
  ============================================================ */

  const handleViewStateChange = ({ viewState }) => {

    const cleanedViewState = {
      longitude: viewState.longitude,
      latitude: viewState.latitude,
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing
    };

    //   const cleanViewState = (vs) => {
    //   const { longitude, latitude, zoom, pitch, bearing } = vs;
    //   return { longitude, latitude, zoom, pitch, bearing };
    // };
    if (syncEnabled) {
      dispatch(MapActions.setViewState(cleanedViewState));
    } else {
      setLocalViewState(cleanedViewState);
    }
  };

  /** Datayog `gis-engine/page.js` — compass: one click resets bearing + pitch, `transitionDuration: 700`. */
  const handleResetNorth = useCallback(() => {
    const vs = activeViewState;
    const payload = {
      longitude: vs.longitude,
      latitude: vs.latitude,
      zoom: vs.zoom,
      bearing: 0,
      pitch: 0,
      transitionDuration: 700,
      transitionInterpolator: new FlyToInterpolator(),
    };
    if (syncEnabled) {
      dispatch(MapActions.setViewState(payload));
    } else {
      setLocalViewState(payload);
    }
  }, [activeViewState, syncEnabled, dispatch]);

  /* ============================================================
     🔹 Styling of popup dragger with cell details
  ============================================================ */
    // const cellStyle = {
    //     border: "1px solid #d1d5db",
    //     padding: "4px",
    //     fontWeight: "600",
    //     background: "#f9fafb"
    // };

    // const valueStyle = {
    //     border: "1px solid #d1d5db",
    //     padding: "4px"
    // };


  /* ============================================================
     🔹 Draggable pop functions 
  ============================================================ */
  const fallbackCopyText = (text) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  const copyToClipboarding = (data) => {
    const finalData = Object.entries(data)
        .map((itm) => `${itm[0]}: ${itm[1]}`)
        .join('; ');
    navigator.clipboard.writeText(finalData);
    dispatch(ALERTS({
        show: true,
        icon: 'info',
        buttons: [],
        type: 1,
        text: 'Text copied Successfully'
    }));
  };

  const siteUniqueFromPopup = (data) => data.Physical_id ?? data.site_name ?? "";
  const cellUniqueFromPopup = (data) => data.cell_name ?? data.Cell_name ?? "";

  const moveToSiteAnalyticsWindow = (data, from) => {
      dispatch(CommonActions.setLastName(true, 'Site Analytics'));
      const id = encodeURIComponent(siteUniqueFromPopup(data));
      if (from === 'one') {
          navigate('/analytics-pro/site-analytics?uniqueId=' + id);
      } else {
          const newWin = window.open('/analytics-pro/site-analytics?uniqueId=' + id, '_blank', 'noopener,noreferrer');
          if (newWin) newWin.opener = null;
      }
  };

  const moveToCellAnalyticsWindow = (data, from) => {
      dispatch(CommonActions.setLastName(true, 'Cell Analytics'));
      const id = encodeURIComponent(cellUniqueFromPopup(data));
      if (from === 'one') {
          navigate('/analytics-pro/cell-analytics?uniqueId=' + id);
      } else {
          const newWin = window.open('/analytics-pro/cell-analytics?uniqueId=' + id, '_blank', 'noopener,noreferrer');
          if (newWin) newWin.opener = null;
      }
  };

  const moveToSiteProrulesWindow = (data, from) => {
      dispatch(CommonActions.setLastName(true, 'Site Pro Rules'));
      const id = encodeURIComponent(siteUniqueFromPopup(data));
      if (from === 'one') {
          navigate('/analytics-pro/site-pro-rules?uniqueId=' + id);
      } else {
          const newWin = window.open('/analytics-pro/site-pro-rules?uniqueId=' + id, '_blank', 'noopener,noreferrer');
          if (newWin) newWin.opener = null;
      }
  };

  const moveToCellProrulesWindow = (data, from) => {
      dispatch(CommonActions.setLastName(true, 'Cell Pro Rules'));
      const id = encodeURIComponent(cellUniqueFromPopup(data));
      if (from === 'one') {
          navigate('/analytics-pro/cell-pro-rules?uniqueId=' + id);
      } else {
          const newWin = window.open('/analytics-pro/cell-pro-rules?uniqueId=' + id, '_blank', 'noopener,noreferrer');
          if (newWin) newWin.opener = null;
      }
  };

  const openCellProRulesModal = (data) => {
      setCellProRulesCell(data);
      setShowCellProRulesModal(true);
  };

  useEffect(() => {
      if (showCellProRulesModal && selectedCell) {
          setCellProRulesCell(selectedCell);
      }
  }, [selectedCell]);

  // Handle Closing of Legends
  const handleLegendClose = (layer) => {
    dispatch(MapActions.setLayerLegend(layer, false));
    const updatedLegends = { ...layerLegends, [layer]: false };
    dispatch(AuthActions.setupConf(true, {
      saveLayerLegends: JSON.stringify(updatedLegends),
    }, () => {}));
  };

  /* Previously: `widgets={[new CompassWidget({ placement: "top-right" })]}` — replaced by Datayog compass UI below. */

  /* ============================================================
     🔹 RENDER
  ============================================================ */
  return (
    <div
      ref={mapAreaRef}
      className="relative isolate h-full w-full min-h-0 overflow-hidden"
      onContextMenu={handleMapContextMenu}
      onDoubleClick={(e) => {
        if (!gisMeasuring) return;
        e.preventDefault();
        e.stopPropagation();
        runGisFinalizeFromScreen(e.clientX, e.clientY);
      }}
      onTouchEnd={(e) => {
        if (!gisMeasuring || e.changedTouches.length !== 1) return;
        const touch = e.changedTouches[0];
        const now = Date.now();
        const prev = gisLastTouchRef.current;
        const dt = now - prev.t;
        const dx = touch.clientX - prev.x;
        const dy = touch.clientY - prev.y;
        gisLastTouchRef.current = { t: now, x: touch.clientX, y: touch.clientY };
        if (dt > 40 && dt < 380 && dx * dx + dy * dy < 900) {
          e.preventDefault();
          runGisFinalizeFromScreen(touch.clientX, touch.clientY);
        }
      }}
    >
      {/* <button
        onClick={fitToData}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "white",
          padding: "6px 10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          cursor: "pointer"
        }}
      >
        📍
      </button> */}
      {/* zoom level badge */}
      <div style={{
        position: "absolute", bottom: 8, left: 8, zIndex: 999,
        background: "rgba(0,0,0,0.65)", color: "#fff",
        fontSize: 11, fontFamily: "monospace",
        padding: "2px 7px", borderRadius: 4, pointerEvents: "none",
      }}>
        Zoom Level {currentZoom?.toFixed(2)}x
      </div>

      {/* Basemap mode toggle — always visible.
          · Online mode  : subtle grey, click to force offline PMTiles
          · Offline mode : orange, click to switch back to online CDN tiles
          · Truly offline: orange + locked (forceOffline toggle disabled — no internet anyway) */}
      <button
        onClick={() => {
          // Only allow toggling when internet is actually available
          if (isOnline) setForceOffline(f => !f);
        }}
        title={
          !isOnline
            ? 'No internet — using offline basemap'
            : isOfflineMode
              ? 'Using offline basemap (click to switch to online)'
              : 'Using online basemap (click to switch to offline)'
        }
        style={{ position: 'absolute', bottom: 36, left: 8, zIndex: 1000 }}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide backdrop-blur-sm transition-all duration-200 ${
          isOfflineMode
            ? 'border-[#F26522]/40 bg-[#F26522]/15 text-[#F26522] cursor-pointer'
            : 'border-white/15 bg-black/30 text-white/50 cursor-pointer hover:border-white/30 hover:text-white/80'
        } ${!isOnline ? 'cursor-default' : ''}`}
      >
        <WifiOff className="h-3 w-3" />
        {isOfflineMode ? 'Offline Map' : 'Online Map'}
      </button>

      <DeckGL
        ref={deckRef}
        viewState={{ ...activeViewState }}
        controller={{
          dragPan: !isDraggingRulerDot,
          dragRotate: !isDraggingRulerDot,
          touchZoom: !isDraggingRulerDot,
          touchRotate: !isDraggingRulerDot,
          doubleClickZoom: !rulerMode && !gisMeasuring,
        }}
        // getMapboxApiAccessToken={() => MAPBOX_TOKEN}
        // layers={[
        //   ...(currentZoom < 9
        //     ? (markerLayer ? [markerLayer] : [])
        //     : (sectorLayer ? [sectorLayer] : [])),
        //       customGeoJsonLayer,
        // ].filter(Boolean)}
        // layers={[
        //   markerLayer,
        //   sectorLayer,
        //   customGeoJsonLayer
        // ].filter(Boolean)}
        layers={layers}
        onViewStateChange={handleViewStateChange}
        className="absolute h-full w-full"
        widgets={DECK_WIDGETS_NONE}
        //  Tooltip on layers
        getTooltip={({ object, layer }) => {
          if (!object || !layer?.id) return null;

          // TA Sector Layer
          // if (layer.id === 'ta-sector-layer') {
          //   return {
          //     html: `
          //       <div style="font-size:12px; max-width: 220px;">
          //         <div style="font-weight:700; margin-bottom:4px; color:#60a5fa;">${object.cellId || ''}</div>
          //         <div><b>Distance:</b> ${object.distance?.toFixed(0) || 0} m</div>
          //         <div><b>Frequency Reports:</b> ${object['Freq of reports']?.toLocaleString() || 0}</div>
          //         <div><b>Share in Range:</b> ${object['Share in range %']?.toFixed(2) || 0}%</div>
          //       </div>
          //     `
          //   };
          // }
          if (layer.id === 'ta-sector-layer-fill') {
  return {
    html: `
      <div style="font-size:12px; min-width:210px; font-family:sans-serif;">
        <div style="font-weight:700; margin-bottom:8px; color:#60a5fa; font-size:13px; border-bottom:1px solid #2c4a85; padding-bottom:5px;">
          ${object.cell_name || object.cellId || ''}
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:4px;">
          <span style="color:#9ca3af;">Distance</span>
          <span style="font-weight:600;">${(object.distance ?? 0).toFixed(0)} m</span>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:4px;">
          <span style="color:#9ca3af;">Freq of Reports</span>
          <span style="font-weight:600;">${(object['Freq of reports'] ?? 0).toLocaleString()}</span>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:4px;">
          <span style="color:#9ca3af;">Total Samples</span>
          <span style="font-weight:600;">${(object.total_samples ?? 0).toLocaleString()}</span>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span style="color:#9ca3af;">Share in Range</span>
          <span style="font-weight:600; color:#34d399;">${(object['Share in range %'] ?? 0).toFixed(2)}%</span>
        </div>
      </div>
    `
  };
}

          // Drive Test Layer
          if (layer.id === "drivetest-layer") {
            const signal = getSignalQuality(object.rssi);
            return {
              html: `
                <div style="font-size:12px">
                  <div>
                    <b>Signal:</b>
                    <span style="
                      font-weight:bold;
                      color:${signal.colorText};
                    ">
                      ${signal.label}
                    </span>
                  </div>
                  <div><b>RSSI:</b> ${object.rssi} dBm</div>
                  <div><b>Latitude:</b> ${object.latitude}</div>
                  <div><b>Longitude:</b> ${object.longitude}</div>
                  <div><b>Session:</b> ${object.session_id}</div>
                </div>
              `
            };
          }

          return null;
        }}

        onHover={(info) => {
          const coordinate = info.coordinate;
          if (gisMeasuring) {
            if (gisDraftRef.current?.points?.length && coordinate) {
              setGisMeasurementCursor({
                longitude: coordinate[0],
                latitude: coordinate[1],
              });
            } else if (!coordinate) {
              setGisMeasurementCursor(null);
            }
          }
          if (rulerMode && activeSegment && coordinate && draggingRulerRef.current === null) {
            setRulerHover(coordinate);
          }
        }}
        onClick={(info, event) => {
          const { coordinate, layer, object, x, y } = info;

          if (gisMeasuring && coordinate) {
            handleGisMeasureMapClick(coordinate, x, y, event?.srcEvent);
            return true;
          }

          if (!gisMeasuring && !rulerMode) {
            const ll = lngLatFromDeckPick(info);
            if (ll) {
              const rawDetail = event?.srcEvent?.detail;
              const nativeTriple = typeof rawDetail === "number" && rawDetail >= 3;
              if (nativeTriple) {
                mapTripleBurstRef.current = { n: 0, t: 0, x: 0, y: 0 };
              }
              const burstTriple = nativeTriple ? false : tryConsumeMapTripleClick(x, y);
              if (nativeTriple || burstTriple) {
                setCoordinatePopup({ longitude: ll.longitude, latitude: ll.latitude });
                setCopiedCoordinate(false);
                return true;
              }
            }
          }

          if (!rulerMode || !coordinate) return;
          if (event?.rightButton) return; // right-click is handled by contextmenu → cancel
          if (layer?.id === "ruler-dots" && !object?.preview) return;
          setRulerSegments((prev) => {
            const active = prev.find((s) => s.b === null);
            if (active) return prev.map((s) => (s.id === active.id ? { ...s, b: coordinate } : s));
            return [...prev, { id: Date.now(), a: coordinate, b: null }];
          });
          setRulerHover(null);
        }}
        /* Upstream GIS: crosshair cursor (not hand/grab) */
        getCursor={() => {
          if (draggingRulerRef.current !== null) return "crosshair";
          if (gisMeasuring) return "crosshair";
          if (rulerMode && hoveringRulerDot) return "crosshair";
          if (rulerMode) return "crosshair";
          return "crosshair";
        }}
      >
       {/* <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          // mapStyle={config.mapView}
          mapStyle={config.mapView || "mapbox://styles/mapbox/streets-v11"}
          style={{ pointerEvents: "auto" }}
          //  mapStyle="mapbox://styles/mapbox/light-v10"
        >
          {/* <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          <ScaleControl position="bottom-right" unit="metric" /> */}
        {/* </Map>  */}
        {/* <Map
          mapStyle={{
            version: 8,
            sources: {
              "basemap": {
                type: "raster",
                tiles: [
                  `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`
                ],
                tileSize: 256,
                attribution: "© Mapbox © OpenStreetMap"
              }
            },
            layers: [{ id: "basemap-layer", type: "raster", source: "basemap" }]
          }}
          style={{ pointerEvents: "auto" }}
        /> */}

          <Map
              mapStyle={getMapStyle(config.mapView || "voyager", !isOfflineMode, offlineMapStyle)}
              className="pointer-events-auto"
              doubleClickZoom={!gisMeasuring}
              attributionControl={false}
            // language="en"
          />
        </DeckGL>

        

        {/* Compass only (top-right). Map style tray lives bottom-right above Settings. */}
        <div
          className="pointer-events-auto absolute right-5 top-5 z-[10020]"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {(() => {
            const compassActive =
              Math.abs(activeViewState.bearing ?? 0) > 0.01 ||
              Math.abs(activeViewState.pitch ?? 0) > 0.01;
            return (
              <button
                type="button"
                title="Reset North"
                onClick={handleResetNorth}
                className={`${GIS_TRAY_BTN_CLASS} ${
                  compassActive ? "border-[#F26522]/45 bg-[rgba(31,21,26,0.96)] text-[#F26522]" : ""
                }`}
              >
                <Compass
                  className="h-5 w-5 transition-transform duration-200"
                  style={{ transform: `rotate(${-(activeViewState.bearing ?? 0)}deg)` }}
                  aria-hidden
                />
              </button>
            );
          })()}
        </div>

        {coordinatePopup && coordinatePopupScreen ? (
          <div
            className="pointer-events-auto absolute z-[10040]"
            style={{
              left: coordinatePopupScreen.x,
              top: coordinatePopupScreen.y,
              transform: "translate(-50%, calc(-100% - 18px))",
            }}
          >
            <div className="min-w-[242px] rounded-[20px] border border-[#27365C] bg-[rgba(8,18,36,0.98)] px-4 py-3 text-white shadow-[0_20px_40px_rgba(3,8,24,0.42)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F26522]">
                    Coordinates
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `${coordinatePopup.latitude.toFixed(6)}, ${coordinatePopup.longitude.toFixed(6)}`;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(text).then(() => setCopiedCoordinate(true)).catch(() => {
                          fallbackCopyText(text);
                          setCopiedCoordinate(true);
                        });
                      } else {
                        fallbackCopyText(text);
                        setCopiedCoordinate(true);
                      }
                    }}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#27365C] bg-[rgba(13,24,49,0.96)] text-white/70 transition hover:border-[#F26522]/35 hover:bg-[rgba(23,33,60,0.96)] hover:text-[#F26522]"
                    title="Copy coordinates"
                  >
                    {copiedCoordinate ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCoordinatePopup(null)}
                  className="relative -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-red-300 transition hover:border-red-400/45 hover:bg-red-500/18 hover:text-red-200 active:scale-[0.98] active:bg-red-500/22"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="mt-2">
                <div className="truncate pr-4 text-[12px] text-white/82">
                  {coordinatePopup.latitude.toFixed(6)}, {coordinatePopup.longitude.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {gisHtmlOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 z-[8]"
            aria-hidden
          >
            {gisHtmlOverlay.vertices.map((p) => (
              <div
                key={p.id}
                className="absolute"
                style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
              >
                <div className="relative">
                  <div
                    className="flex h-3 w-3 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: measurementContrast.dotFill,
                      borderColor: measurementContrast.dotBorder,
                    }}
                  >
                    <span className="block h-1.5 w-1.5 rounded-full bg-[#F26522]" />
                  </div>
                  <div
                    className="pointer-events-none absolute whitespace-nowrap text-[12px] font-bold tracking-[0.02em]"
                    style={{
                      left: p.lox,
                      top: p.loy,
                      color: p.draft ? "#F26522" : GIS_MEASURE_LABEL_DONE,
                    }}
                  >
                    {p.text}
                  </div>
                </div>
              </div>
            ))}
            {gisHtmlOverlay.live ? (
              <div
                className="absolute"
                style={{
                  left: gisHtmlOverlay.live.x,
                  top: gisHtmlOverlay.live.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="pointer-events-none absolute whitespace-nowrap text-[12px] font-bold text-[#F26522]"
                  style={{ left: gisHtmlOverlay.live.lox, top: gisHtmlOverlay.live.loy }}
                >
                  {gisHtmlOverlay.live.text}
                </div>
              </div>
            ) : null}
            {gisHtmlOverlay.areas.map((a) => (
              <div
                key={a.id}
                className="absolute text-center"
                style={{ left: a.x, top: a.y, transform: "translate(-50%, -50%)" }}
              >
                <div className="text-[11px] font-semibold text-[#F26522]">{a.text}</div>
                <div className="mt-0.5 text-[9px] text-white/70">{a.perimeter}</div>
              </div>
            ))}
          </div>
        ) : null}

        {/* ✅ LEGENDs — USE_LEGEND_BOX_V2=false restores original LegendBox.jsx */}
        {layerLegends.SITES &&
          (USE_LEGEND_BOX_V2 ? (
            <LegendBoxV2
              layer="SITES"
              thematic={activeSiteThematic}
              onClose={() => handleLegendClose("SITES")}
              zIndex={legendZIndex("SITES")}
              onBringToFront={() => bringLegendToFront("SITES")}
              onSendBackward={() => sendLegendBackward("SITES")}
            />
          ) : (
            <LegendBox
              layer="SITES"
              thematic={activeSiteThematic}
              onClose={() => handleLegendClose("SITES")}
            />
          ))}

        {layerLegends?.CELLS &&
          (USE_LEGEND_BOX_V2 ? (
            <LegendBoxV2
              layer="CELLS"
              thematic={filteredCellsThematic}
              onClose={() => handleLegendClose("CELLS")}
              zIndex={legendZIndex("CELLS")}
              onBringToFront={() => bringLegendToFront("CELLS")}
              onSendBackward={() => sendLegendBackward("CELLS")}
            />
          ) : (
            <LegendBox
              layer="CELLS"
              thematic={filteredCellsThematic}
              onClose={() => handleLegendClose("CELLS")}
            />
          ))}

        {layerLegends?.DRIVE_TEST &&
          driveTestThematic &&
          (USE_LEGEND_BOX_V2 ? (
            <LegendBoxV2
              layer="DRIVE TEST"
              thematic={driveTestThematic}
              onClose={() => handleLegendClose("DRIVE_TEST")}
              zIndex={legendZIndex("DRIVE_TEST")}
              onBringToFront={() => bringLegendToFront("DRIVE_TEST")}
              onSendBackward={() => sendLegendBackward("DRIVE_TEST")}
            />
          ) : (
            <LegendBox
              layer="DRIVE TEST"
              thematic={driveTestThematic}
              onClose={() => handleLegendClose("DRIVE_TEST")}
            />
          ))}

        {layerLegends?.BOUNDARY &&
          boundaryLegendThematic &&
          (USE_LEGEND_BOX_V2 ? (
            <LegendBoxV2
              layer="BOUNDARY"
              thematic={boundaryLegendThematic}
              onClose={() => handleLegendClose("BOUNDARY")}
              zIndex={legendZIndex("BOUNDARY")}
              onBringToFront={() => bringLegendToFront("BOUNDARY")}
              onSendBackward={() => sendLegendBackward("BOUNDARY")}
            />
          ) : (
            <LegendBox
              layer="BOUNDARY"
              thematic={boundaryLegendThematic}
              onClose={() => handleLegendClose("BOUNDARY")}
            />
          ))}

        {layerLegends?.RF &&
          rfLegendThematic &&
          (USE_LEGEND_BOX_V2 ? (
            <LegendBoxV2
              layer="RF"
              thematic={rfLegendThematic}
              onClose={() => handleLegendClose("RF")}
              zIndex={legendZIndex("RF")}
              onBringToFront={() => bringLegendToFront("RF")}
              onSendBackward={() => sendLegendBackward("RF")}
            />
          ) : (
            <LegendBox
              layer="RF"
              thematic={rfLegendThematic}
              onClose={() => handleLegendClose("RF")}
            />
          ))}

          {layerLegends.NEIGHBORS && neighborsLegendThematic && (
            <LegendBoxV2
              layer="NEIGHBORS"
              thematic={neighborsLegendThematic}
              zIndex={legendZIndex("NEIGHBORS")}
              onFocus={() => bringLegendToFront("NEIGHBORS")}
              onSendBackward={() => sendLegendBackward("NEIGHBORS")}
              initialPosition={{ x: Math.max(10, (mapBox?.w ?? window.innerWidth) - 260), y: 100 }}
              onClose={() => dispatch(MapActions.setLayerLegend("NEIGHBORS", false))}
            />
          )}
          {layerLegends.NEIGHBOURS && planNeighboursLegendThematic && (
            <LegendBoxV2
              layer="NEIGHBOURS"
              thematic={planNeighboursLegendThematic}
              zIndex={legendZIndex("NEIGHBOURS")}
              onFocus={() => bringLegendToFront("NEIGHBOURS")}
              onSendBackward={() => sendLegendBackward("NEIGHBOURS")}
              initialPosition={{ x: Math.max(10, (mapBox?.w ?? window.innerWidth) - 260), y: 200 }}
              onClose={() => dispatch(MapActions.setLayerLegend("NEIGHBOURS", false))}
            />
          )}

        {/* Cell info popup */}
        {selectedCell && selectedCell.operator === operator && (
          USE_CELL_INFO_POPUP_V2 ? (
            <CellInfoPopupV2
              data={{
                cell_name: selectedCell.cell_name ?? selectedCell.cell_id,
                site_name: selectedCell.site_name,
                technology: selectedCell.technology,
                operator: selectedCell.operator,
                region: selectedCell.region,
                band: selectedCell.band,
                latitude: selectedCell.latitude,
                longitude: selectedCell.longitude,
                azimuth: selectedCell.azimuth,
              }}
              mapH="100%"
              mapW="100%"
              mapContainerHeight={mapBox.h}
              onClose={() => {
                dispatch(MapActions.setSelectedCell(null));
                setShowCellProRulesModal(false);
              }}
              onCopy={copyToClipboarding}
              onSiteAnalytics={(d, mode) => moveToSiteAnalyticsWindow(d, mode === "newTab" ? "two" : "one")}
              onCellAnalytics={(d, mode) => moveToCellAnalyticsWindow(d, mode === "newTab" ? "two" : "one")}
              onSiteProRules={(d, mode) => moveToSiteProrulesWindow(d, mode === "newTab" ? "two" : "one")}
              onCellProRules={(d, mode) => {
                if (mode === "newTab") moveToCellProrulesWindow(d, "two");
                else openCellProRulesModal(d);
              }}
              // onChartClick={(d) => {
              //   const cell = encodeURIComponent(d.cell_name ?? d.Cell_name ?? "");
              //   window.location.href = `/Filtered-cell-dashboard/${DASHBOARD_UUID}?cell=${cell}&filterId=${FILTER_Id}`;
              // }}
              onChartClick={(d) => {
                const cell = encodeURIComponent(d.cell_name ?? d.Cell_name ?? "");
                const reactUrl = `/Filtered-cell-dashboard/${DASHBOARD_UUID}?cell=${cell}&filterId=${FILTER_Id}`;
                window.open(reactUrl, "_blank");
              }}
              onChartRightClick={(d) => {
                const cell = encodeURIComponent(d.cell_name ?? d.Cell_name ?? "");
                window.open(
                  `/Filtered-cell-dashboard/${DASHBOARD_UUID}?cell=${cell}&filterId=${FILTER_Id}`,
                  "_blank",
                );
              }}
            />
          ) : (
            <CellInfoPopup
              data={{
                cell_name: selectedCell.cell_name ?? selectedCell.cell_id,
                site_name: selectedCell.site_name,
                technology: selectedCell.technology,
                operator: selectedCell.operator,
                region: selectedCell.region,
                band: selectedCell.band,
                latitude: selectedCell.latitude,
                longitude: selectedCell.longitude,
                azimuth: selectedCell.azimuth,
              }}
              mapH="100%"
              mapW="100%"
              mapContainerHeight={mapBox.h}
              onClose={() => {
                dispatch(MapActions.setSelectedCell(null));
                setShowCellProRulesModal(false);
              }}
              onCopy={copyToClipboarding}
              onSiteAnalytics={(d, mode) => moveToSiteAnalyticsWindow(d, mode === "newTab" ? "two" : "one")}
              onCellAnalytics={(d, mode) => moveToCellAnalyticsWindow(d, mode === "newTab" ? "two" : "one")}
              onSiteProRules={(d, mode) => moveToSiteProrulesWindow(d, mode === "newTab" ? "two" : "one")}
              onCellProRules={(d, mode) => {
                if (mode === "newTab") moveToCellProrulesWindow(d, "two");
                else openCellProRulesModal(d);
              }}
              onChartClick={(d) => {
                const cell = encodeURIComponent(d.cell_name ?? d.Cell_name ?? "");
                window.location.href = `/Filtered-cell-dashboard/${DASHBOARD_UUID}?cell=${cell}&filterId=${FILTER_Id}`;
              }}
              onChartRightClick={(d) => {
                const cell = encodeURIComponent(d.cell_name ?? d.Cell_name ?? "");
                window.open(
                  `/Filtered-cell-dashboard/${DASHBOARD_UUID}?cell=${cell}&filterId=${FILTER_Id}`,
                  "_blank",
                );
              }}
            />
          )
        )}

        {showCellProRulesModal && (
          <CellProRulesModal
            isOpen={showCellProRulesModal}
            setIsOpen={setShowCellProRulesModal}
            cellId={cellProRulesCell?.cell_id || cellProRulesCell?.Cell_name}
            cellName={cellProRulesCell?.Cell_name || cellProRulesCell?.cell_name}
          />
        )}

        {/* Datayog `gis-engine/page.js` — Bottom Right Control Stack (order + classes match) */}
        <div
          ref={mapStylePickerRef}
          className="pointer-events-auto absolute bottom-6 right-5 z-[10050] flex flex-col items-end gap-3"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Fit to Data"
            onClick={fitToData}
            className={`${GIS_TRAY_BTN_CLASS} ${rawCells?.length ? "" : "pointer-events-none opacity-60"}`}
          >
            <MapPin className="h-5 w-5" aria-hidden />
          </button>

          <TelecomMapStyleRightControl
            mapStyleKeyForUi={mapStyleKeyForUi}
            onSelectMapStyle={(value) => {
              dispatch(MapActions.setMapConfig({ mapView: value }));
              dispatch(AuthActions.setupConf(true, { mapView: value }));
            }}
            mapStylePickerOpen={mapStylePickerOpen}
            setMapStylePickerOpen={setMapStylePickerOpen}
            isOnline={!isOfflineMode}
          />

          <div className="flex items-center justify-end gap-3">
            {(gisMeasuring || rulerMode) && (
              <div className="pointer-events-none select-none rounded-full bg-[rgba(11,23,48,0.88)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#F26522] ring-1 ring-[#F26522]/30">
                {gisMeasuring ? "Measuring · double-click zoom off" : "Ruler · double-click zoom off"}
              </div>
            )}
            {toolsExpanded ? (
              <>
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => applyGisZoomDelta(1)}
                  className={GIS_TRAY_BTN_CLASS}
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => applyGisZoomDelta(-1)}
                  className={GIS_TRAY_BTN_CLASS}
                >
                  <Minus className="h-5 w-5" aria-hidden />
                </button>
                <button type="button" title="Fullscreen" onClick={toggleGisFullscreen} className={GIS_TRAY_BTN_CLASS}>
                  <Maximize className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  title="Measurement"
                  onClick={toggleGisMeasuring}
                  className={`${GIS_TRAY_BTN_CLASS} ${
                    gisMeasuring ? "border-[#F26522]/45 bg-[rgba(31,21,26,0.96)] text-[#F26522]" : ""
                  }`}
                >
                  <Ruler className={`h-5 w-5 ${gisMeasuring ? "!text-[#F26522]" : ""}`} aria-hidden />
                </button>
              </>
            ) : null}
            <button
              type="button"
              title={toolsExpanded ? "Close tools" : "Tools — zoom, fullscreen, measurement"}
              onClick={() => setToolsExpanded((c) => !c)}
              className={`${GIS_TRAY_BTN_CLASS} ${
                (toolsExpanded || gisMeasuring || rulerMode) ? "border-[#F26522]/45 bg-[rgba(31,21,26,0.96)] text-[#F26522]" : ""
              }`}
            >
              {toolsExpanded ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Settings className={`h-5 w-5 ${(gisMeasuring || rulerMode) ? "!text-[#F26522]" : ""}`} aria-hidden />
              )}
            </button>
          </div>
        </div>

        {/* ── Context Menu (right-click on cell sector) ── */}
        {nrTooltip && (
            <div
                className="absolute z-[25] pointer-events-none bg-[#162a52] text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-blue-500/30"
                style={{ left: nrTooltip.x + 12, top: nrTooltip.y - 10 }}
            > 
                <div className="font-semibold text-blue-300 mb-1.5">{nrTooltip.type}</div>
                <div className="space-y-1 text-gray-200">
                    <div><span className="text-gray-400">Source:</span> {nrTooltip.source}</div>
                    <div><span className="text-gray-400">Target:</span> {nrTooltip.target}</div>
                    <div className={nrTooltip.biDirectional ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                        {nrTooltip.biDirectional ? '↔ Bidirectional' : '→ Unidirectional'}
                    </div>
                    <div><span className="text-gray-400">Distance:</span> {nrTooltip.distance?.toFixed(2)} km</div>
                </div>
            </div>
        )}

        {planNrTooltip && (
          <div
            className="absolute z-[25] pointer-events-none bg-[#162a52] text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-500/30"
            style={{ left: planNrTooltip.x + 12, top: planNrTooltip.y - 10 }}
          >
            <div className="font-semibold text-orange-300 mb-1.5">{planNrTooltip.operation_type}</div>
            <div className="space-y-1 text-gray-200">
              <div><span className="text-gray-400">Source:</span> {planNrTooltip.source}</div>
              <div><span className="text-gray-400">Target:</span> {planNrTooltip.target}</div>
              <div><span className="text-gray-400">Distance:</span> {planNrTooltip.distance?.toFixed(2)} km</div>
            </div>
          </div>
        )}

      {rfTooltip && (
        <div
            className="absolute z-[25] pointer-events-none bg-[#162a52] text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-blue-500/30"
            style={{
                left: rfTooltip.x + 12,
                top: rfTooltip.y - 10,
            }}
        >
            <div className="font-semibold text-blue-300 mb-1.5">
                {rfTooltip.parameter}
                <div>{rfTooltip.range}</div>
            </div>

            <div className="flex items-center gap-2 text-gray-200">
                <div
                    className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                    style={{
                        background: rfTooltip.color_hex,
                    }}
                />

                <span className="text-gray-200">
                    {rfTooltip.range}
                </span>
            </div>
        </div>
    )}

        {contextMenu && (
            <>
                {/* backdrop – click outside closes menu */}
                <div
                    className="absolute inset-0 z-[19]"
                    onMouseDown={() => setContextMenu(null)}
                />
                <div
                    onMouseDown={e => e.stopPropagation()}
                    className="absolute z-[20] min-w-[210px] rounded-xl overflow-hidden shadow-2xl border border-[#2c4a85]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {/* ── Header ── */}
                    <div className="bg-[#162a52] px-3 py-2 flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className="shrink-0">
                            <circle cx="12" cy="10" r="3"/>
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        </svg>
                        <span className="text-white text-[13px] font-semibold tracking-wide truncate max-w-[160px]">
                            {contextMenu.cell?.cell_id}
                        </span>
                    </div>

                    {/* ── Body ── */}
                    <div className="bg-white/95 px-3 pt-3 pb-3 flex flex-col gap-3">
                        {/* TA Rings toggle */}
                        <label
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                            onClick={e => e.stopPropagation()}
                        >
                            <input
                                type="checkbox"
                                checked={selectedTaCells.some(c => c.cellId === contextMenu.cell.cell_id)}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setTaError(null);
                                        dispatch(MapActions.fetchTaSectors(
                                            contextMenu.cell.cell_id,
                                            contextMenu.cell.cell_id,
                                            {
                                                lat: Number(contextMenu.cell.latitude),
                                                lng: Number(contextMenu.cell.longitude),
                                                azimuth: Number(contextMenu.cell.azimuth),
                                                beamWidth: Number(contextMenu.cell.radius_m) || 60,
                                            },
                                            (msg) => setTaError({ cellId: contextMenu.cell.cell_id, message: msg })
                                        ));
                                    } else {
                                        setTaError(null);
                                        dispatch(MapActions.setTaSectorData(contextMenu.cell.cell_id, null));
                                    }
                                }}
                                className="w-4 h-4 shrink-0 cursor-pointer accent-[#162a52]"
                            />
                            <span className="text-[13px] font-medium text-gray-800">TA Rings</span>
                        </label>

                        {taError?.cellId === contextMenu.cell.cell_id && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-[12px] text-amber-800">
                                <div className="text-amber-700">{taError.message || "No TA data found for this cell."}</div>
                            </div>
                        )}

                        {/* Neighbor Relations toggle */}
                        <label
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                            onClick={e => e.stopPropagation()}
                        >
                            <input
                                type="checkbox"
                                checked={neighbourRelations?.cellId === contextMenu.cell.cell_id}
                                onChange={e => {
                                    if (e.target.checked) {
                                        dispatch(MapActions.fetchNeighbourRelations(contextMenu.cell.cell_id));
                                    } else {
                                        dispatch(MapActions.clearNeighbourRelations());
                                    }
                                }}
                                className="w-4 h-4 shrink-0 cursor-pointer accent-[#162a52]"
                            />
                            <span className="text-[13px] font-medium text-gray-800">Neighbors</span>
                        </label>

                        {neighbourRelations?.hasNoData && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-[12px] text-amber-800">
                                {/* <div className="font-medium mb-1">No neighbor data available</div> */}
                                <div className="text-amber-700">{neighbourRelations?.message || "This cell has no recorded neighbor relations."}</div>
                            </div>
                        )}

                        {/* Dismiss button */}
                        <button
                            onClick={() => setContextMenu(null)}
                            className="w-full py-1.5 text-[13px] font-medium text-white bg-[#162a52] hover:bg-[#1e3a70] border border-[#2c4a85] rounded-lg cursor-pointer transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </>
        )}

    </div>
  );
};

export default TelecomMap;
