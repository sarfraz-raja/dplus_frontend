// Basemap styles shared by every MapLibre map in the app — one place for the online (CARTO/OSM/Esri
// raster) and offline (local PMTiles + /public/styles JSON) basemaps, and for the env flags that pick
// between them (see docs/ENV_VARS.md). Moved here verbatim from TelecomMap.jsx so the GIS Engine and
// the Dashboard Builder map can't drift apart. The `pmtiles://` protocol itself stays registered once
// in main.jsx.

// Set app-wide via VITE_OFFLINE_MAPS_ENABLED (defaults to offline when unset).
export const IS_OFFLINE_MODE = import.meta.env.VITE_OFFLINE_MAPS_ENABLED !== 'false';

// Fallback map center when there's no data to fit to (same env vars DegradedCellsMap.jsx reads).
export const DEFAULT_MAP_VIEW = {
  latitude: Number(import.meta.env.VITE_DEFAULT_MAP_LAT) || -0.8,
  longitude: Number(import.meta.env.VITE_DEFAULT_MAP_LNG) || 11.6,
  zoom: Number(import.meta.env.VITE_DEFAULT_MAP_ZOOM) || 5.5,
};

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY;
const CARTO_KEY_PARAM = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : '';

// ─────────────────────────────────────────────────────────────────────────────
// ONLINE MAP STYLES (require internet)
// These fetch raster tiles from external CDNs on every pan/zoom.
// Keys here must match the `value` field in telecomMapStyleOptions.js.
// ─────────────────────────────────────────────────────────────────────────────
export const MAP_STYLES = {
  // outdoors: {
  //   tiles: ['https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}@2x.png'],
  //   attribution: '© Stadia Maps © OpenStreetMap'
  // },
  // OpenStreetMap keyless fallback used while CARTO required a key we didn't
  // have yet. Now that VITE_CARTO_API_KEY is set, CARTO is back in use below.
  // Uncomment these four to fall back to OSM again if the CARTO key stops working.
  // outdoors: {
  //   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  //   attribution: '© OpenStreetMap Contributors'
  // },
  outdoors: {
    tiles: [`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${CARTO_KEY_PARAM}`], // ← use voyager as fallback
    attribution: '© CARTO © OpenStreetMap'
  },
  // voyager: {
  //   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  //   attribution: '© OpenStreetMap Contributors'
  // },
  voyager: {
    tiles: [`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${CARTO_KEY_PARAM}`],  // ← @2x
    attribution: '© CARTO © OpenStreetMap'
  },
  // light: {
  //   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  //   attribution: '© OpenStreetMap Contributors'
  // },
  light: {
    tiles: [`https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png${CARTO_KEY_PARAM}`],
    attribution: '© CARTO © OpenStreetMap'
  },
  // dark: {
  //   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  //   attribution: '© OpenStreetMap Contributors'
  // },
  dark: {
    tiles: [`https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png${CARTO_KEY_PARAM}`],
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
export const PMTILES_PATH = import.meta.env.VITE_PMTILES_PATH || '/tiles/region.pmtiles';

// Build a MapLibre style spec that reads vector tiles from the local PMTiles file.
// `theme` — 'light' | 'dark' — controls fill/road/label colors.
export const getOfflinePmtilesStyle = (theme = 'light') => {
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
export const OFFLINE_STYLE_MAP = {
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
    if ((tf.includes('"name"') || tf.includes('"name:en"')) && !tf.includes('"addr_housenumber"') && !tf.includes('"shield_text"')) {
      layout['text-field'] = ['coalesce', ['get', 'name:en'], ['get', 'name']];
    }
  }
  return style;
};

// Fetch a Protomaps style JSON from /public/styles/ and patch it for local use:
// 1. Replace the demo CDN tile source URL with the local PMTiles file
// 2. Force English-first place labels
const fetchOfflineStyle = async (styleFile) => {
  const resp = await fetch(`/styles/${styleFile}`);
  const style = await resp.json();

  // 1. Patch tile source → local PMTiles file
  for (const src of Object.values(style.sources)) {
    // if (src.url?.includes('protomaps.com')) src.url = `pmtiles://${PMTILES_PATH}`;

     if (src.url?.includes('protomaps.com')) {
      src.url = `pmtiles://${PMTILES_PATH}`;
      src.maxzoom = 15;
    }
    if (src.tiles) src.tiles = src.tiles.map(t => t.includes('protomaps.com') ? `pmtiles://${PMTILES_PATH}/{z}/{x}/{y}` : t);
  }

  // 2. Patch sprite → local /sprites/ folder
  // MapLibre auto-appends @2x.json and @2x.png based on device pixel ratio.
  // Sprites are blocked on client servers with corporate firewalls (protomaps.github.io → 403).
  if (style.sprite) {
    const flavorMatch = style.sprite.match(/sprites\/v4\/(\w+)$/);
    const flavor = flavorMatch?.[1] || 'light';
    style.sprite = `/sprites/${flavor}`;
  }

  // 3. Patch glyphs → local /fonts/ folder
  // Same firewall issue as sprites — glyph PBF files must be served locally.
  if (style.glyphs) {
    style.glyphs = '/fonts/{fontstack}/{range}.pbf';
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
export const getMapStyle = (styleKey, isOnline, offlineMapStyle) => {
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

// Fetches + patches each offline style file once per page load (several maps on one dashboard would
// otherwise each fetch the same JSON). Every caller gets its own copy, since MapLibre may hold on to
// the object it's given. A failed fetch is dropped from the cache so the next map retries.
const offlineStyleCache = new Map();
export const loadOfflineStyle = (styleFile) => {
  if (!offlineStyleCache.has(styleFile)) {
    offlineStyleCache.set(styleFile, fetchOfflineStyle(styleFile).catch((err) => {
      offlineStyleCache.delete(styleFile);
      throw err;
    }));
  }
  return offlineStyleCache.get(styleFile).then((style) => structuredClone(style));
};
