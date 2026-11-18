// Layers for the Dashboard Builder's Map chart (MapChartView.jsx). Widget-only on purpose — the GIS
// Engine's own layers (TelecomMap.jsx) carry TA / neighbour / selection / Redux thematics this chart
// doesn't have — but built on the GIS Engine's SHARED helpers, so sectors look identical:
//   geometry → MapsUsingDeckgl/Utils/sectorGeometry.js (incl. the cos(latitude) correction)
//   colors   → MapsUsingDeckgl/Utils/colorEngine.js
import { PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
// OLD: import { generateCoordinates, computeZoomBoost, hexToRgba } from '../../MapsUsingDeckgl/Utils/sectorGeometry';
import { generateCoordinates, computeZoomBoost, hexToRgba, generateTrueSector, legacyReachMeters } from '../../MapsUsingDeckgl/Utils/sectorGeometry';
// OLD: import { COLOR_SCHEMES, generatePaletteColors } from '../../MapsUsingDeckgl/Utils/colorEngine';
import { COLOR_SCHEMES, generatePaletteColors, getRangeColor } from '../../MapsUsingDeckgl/Utils/colorEngine';

// Sector size when no "Sector size" column is mapped — the GIS Engine's `length` value (sweep and reach).
export const DEFAULT_SECTOR_SIZE = 60;
// The GIS Engine's own fallback outline color (TelecomMap sectorLayer's getLineColor default).
const DEFAULT_RGB = [0, 150, 255];
const NO_DATA_HEX = '#888888';
// 5 steps for a number column, worst → best (flipped when "Higher is" = Bad).
const STEP_COLORS = ['#D7263D', '#F46036', '#F2C14E', '#9BC53D', '#2E933C'];

const toNumber = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));

// Raw rows → one item per ID: { id, lat, lng, azimuth, size, value, row }. Rows with no usable
// lat/lng are counted in `skipped`. A number color column is averaged across an ID's rows; a text
// one keeps its first non-empty value. `row` (the first row) feeds the tooltip.
export function toMapItems(rows = [], mapping = {}) {
  const byId = new Map();
  let skipped = 0;
  const colorKey = mapping.map_color_by;
  rows.forEach((row) => {
    const lat = toNumber(row[mapping.map_lat]);
    const lng = toNumber(row[mapping.map_lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) { skipped += 1; return; }
    const id = row[mapping.map_id] ?? `${lat},${lng}`;
    let item = byId.get(id);
    if (!item) {
      const size = toNumber(row[mapping.map_sector_size]);
      const beamwidth = toNumber(row[mapping.map_beamwidth]);
      item = {
        id, lat, lng,
        azimuth: toNumber(row[mapping.map_azimuth]) || 0,
        size: Number.isFinite(size) && size > 0 ? size : DEFAULT_SECTOR_SIZE,
        // Only for the test geometries (buildSectorLayer `geometry`); null = use `size`, like the GIS.
        beamwidth: Number.isFinite(beamwidth) && beamwidth > 0 ? beamwidth : null,
        // Draw order column (sortForDrawing, "By a column"); NaN = drawn first.
        order: toNumber(row[mapping.map_order_by]),
        row, sum: 0, count: 0, text: null,
      };
      byId.set(id, item);
    }
    if (colorKey) {
      const raw = row[colorKey];
      const num = toNumber(raw);
      if (Number.isFinite(num)) { item.sum += num; item.count += 1; } else if (item.text === null && raw !== null && raw !== undefined && raw !== '') item.text = String(raw);
    }
  });
  const items = [...byId.values()].map(({ sum, count, text, ...rest }) => ({ ...rest, value: count ? sum / count : text }));
  return { items, skipped };
}

// Sector draw order (Data → Location → Draw order). Later items draw on top and win clicks — the
// transparent fill makes the whole wedge pickable, so a big sector drawn last hides the small ones
// under it from the pointer.
//   'data'   as the rows came (default, unchanged)
//   'size'   largest Sector size first → smallest on top (what arc_setting's `orderring` encodes)
//   'column' ascending by `map_order_by` (e.g. `orderring`: higher = drawn later = on top)
// Stable sort, so ties keep the data order.
// The Map chart now shows only the column picker (Draw order = `map_order_by`), so a picked column
// always sorts; 'size' is kept for a chart that saved it.
export function sortForDrawing(items = [], mapping = {}) {
  const mode = mapping.map_draw_order || 'data';
  // OLD: if (mode === 'size') return [...items].sort((a, b) => b.size - a.size);
  // OLD: if (mode === 'column' && mapping.map_order_by) {
  if (mode === 'size' && !mapping.map_order_by) return [...items].sort((a, b) => b.size - a.size);
  if (mapping.map_order_by) {
    const key = (d) => (Number.isFinite(d.order) ? d.order : -Infinity);
    return [...items].sort((a, b) => key(a) - key(b));
  }
  return items;
}

// The GIS Engine's getRangeColor (first row wins) plus the Map chart's clickable signs: a row's
// minOp '>' / maxOp '<' makes that bound exclusive. No signs saved = getRangeColor exactly (≥ / ≤).
export function matchRangeColor(value, ranges = []) {
  const hit = ranges.find((r) => (r.minOp === '>' ? value > r.min : value >= r.min) && (r.maxOp === '<' ? value < r.max : value <= r.max));
  return hit ? hit.color : null;
}

// Saved range rows → rows getRangeColor can match: numbers, blank min / max → -∞ / +∞, rows with
// neither bound or a min above the max dropped. Kept in the user's order (first match wins).
export function normalizeRanges(ranges) {
  if (!Array.isArray(ranges)) return [];
  const bound = (v, open) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? open : Number(v));
  return ranges
    .map((r) => ({ ...r, min: bound(r?.min, -Infinity), max: bound(r?.max, Infinity), color: r?.color || NO_DATA_HEX }))
    .filter((r) => (Number.isFinite(r.min) || Number.isFinite(r.max)) && r.min <= r.max);
}

// OLD: const rangeLabel = ({ min, max }) => (!Number.isFinite(min) ? `≤ ${formatNum(max)}`
//   : !Number.isFinite(max) ? `≥ ${formatNum(min)}`
//   : `${formatNum(min)} – ${formatNum(max)}`);
const rangeLabel = ({ min, max, minOp, maxOp }) => (!Number.isFinite(min) ? `${maxOp === '<' ? '<' : '≤'} ${formatNum(max)}`
  : !Number.isFinite(max) ? `${minOp === '>' ? '>' : '≥'} ${formatNum(min)}`
  : `${formatNum(min)} – ${formatNum(max)}`);

// "0.5, 1, 2 5" → [0.5, 1, 2, 5]: numbers only, sorted, no repeats. Commas, spaces or semicolons.
export function parseBreaks(text) {
  const nums = String(text ?? '').split(/[\s,;]+/).filter(Boolean).map(Number).filter(Number.isFinite);
  return [...new Set(nums)].sort((a, b) => a - b);
}

// n colors along STEP_COLORS (worst → best): the 5 as they are for 5 steps, evenly picked for fewer,
// blended between neighbours for more.
function stepColors(n) {
  if (n <= 1) return [STEP_COLORS[STEP_COLORS.length - 1]];
  const last = STEP_COLORS.length - 1;
  return Array.from({ length: n }, (_, i) => {
    const pos = (i * last) / (n - 1);
    const lo = Math.floor(pos);
    const t = pos - lo;
    if (t === 0) return STEP_COLORS[lo];
    const a = hexToRgba(STEP_COLORS[lo]);
    const b = hexToRgba(STEP_COLORS[lo + 1]);
    return `#${[0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t).toString(16).padStart(2, '0')).join('')}`;
  });
}

const formatNum = (n) => (Math.abs(n) >= 1000 ? n.toFixed(0) : Number(n.toFixed(2)).toString());

// Item → color, plus a legend. Number values → 5 equal-count steps; text → one palette color per
// value (the Style palette, else the GIS Engine's Default scheme); no Color by → one color.
export function buildColorScale(items = [], mapping = {}, palette = null) {
  if (!mapping.map_color_by) {
    return { getHex: () => null, legend: [] };
  }
  const values = items.map((d) => d.value).filter((v) => v !== null && v !== undefined);
  const numeric = values.length > 0 && values.every((v) => typeof v === 'number');

  // Custom ranges (MapColorRanges.jsx): the GIS Engine's KPI-thematic rows, matched by its own
  // getRangeColor — min ≤ value ≤ max, first row wins, no match = grey. Blank Min / Max = open-ended.
  // OLD: const customRanges = mapping.map_color_steps === 'custom' ? normalizeRanges(mapping.map_color_ranges) : [];
  // Only custom ranges + presets in the panel now (no Automatic / Custom picker) — rows always apply.
  const customRanges = normalizeRanges(mapping.map_color_ranges);
  if (numeric && customRanges.length) {
    const legend = customRanges.map((r) => ({ label: r.label || rangeLabel(r), color: r.color }));
    // OLD: return { getHex: (d) => (typeof d.value === 'number' ? getRangeColor(d.value, customRanges) || NO_DATA_HEX : NO_DATA_HEX), legend };
    return { getHex: (d) => (typeof d.value === 'number' ? matchRangeColor(d.value, customRanges) || NO_DATA_HEX : NO_DATA_HEX), legend };
  }

  if (numeric) {
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    // OLD (5 equal-count steps — tied values left steps empty: with many 0s the first two bounds were
    // both 0, red / orange matched nothing and every 0 went yellow, yet the legend still showed red):
    // const bounds = [1, 2, 3, 4].map((i) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * i) / 5))]);
    // const colors = mapping.map_higher_is === 'bad' ? [...STEP_COLORS].reverse() : STEP_COLORS;
    // const stepOf = (v) => { const i = bounds.findIndex((b) => v < b); return i === -1 ? 4 : i; };
    // const edges = [sorted[0], ...bounds, sorted[sorted.length - 1]];
    // const legend = colors.map((color, i) => ({ label: `${formatNum(edges[i])} – ${formatNum(edges[i + 1])}`, color }))
    //   .filter((step, i, all) => all.findIndex((s) => s.label === step.label) === i);
    // return { getHex: (d) => (typeof d.value === 'number' ? colors[stepOf(d.value)] : NO_DATA_HEX), legend };
    const custom = mapping.map_color_steps === 'custom' ? parseBreaks(mapping.map_color_breaks) : [];
    // Custom ranges: the typed breakpoints, fixed. Automatic: the 20/40/60/80% points (equal-count
    // steps), minus repeats and any at the minimum — a bound nothing falls below is an empty step.
    const bounds = custom.length
      ? custom
      : [...new Set([1, 2, 3, 4].map((i) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * i) / 5))]))].filter((b) => b > min);
    const ramp = stepColors(bounds.length + 1);
    const colors = mapping.map_higher_is === 'bad' ? [...ramp].reverse() : ramp;
    // A value on a bound goes to the step above it: [bound, next bound).
    const stepOf = (v) => { const i = bounds.findIndex((b) => v < b); return i === -1 ? bounds.length : i; };
    const legend = colors.map((color, i) => {
      if (custom.length) {
        const label = i === 0 ? `< ${formatNum(bounds[0])}`
          : i === bounds.length ? `≥ ${formatNum(bounds[i - 1])}`
          : `${formatNum(bounds[i - 1])} – ${formatNum(bounds[i])}`;
        return { label, color };
      }
      const edges = [min, ...bounds, max];
      return { label: `${formatNum(edges[i])} – ${formatNum(edges[i + 1])}`, color };
    });
    return { getHex: (d) => (typeof d.value === 'number' ? colors[stepOf(d.value)] : NO_DATA_HEX), legend };
  }

  const colorMap = generatePaletteColors(values.map(String), palette?.length ? palette : COLOR_SCHEMES.Default);
  const legend = Object.entries(colorMap).map(([label, color]) => ({ label, color }));
  return { getHex: (d) => (d.value === null || d.value === undefined ? NO_DATA_HEX : colorMap[String(d.value)]), legend };
}

const toRgba = (hex, opacity) => (hex ? hexToRgba(hex, opacity) : [...DEFAULT_RGB, Math.round(opacity * 255)]);

// Cell sectors — the GIS Engine's look: a colored outline (5px), no fill, same generateCoordinates
// call (size used for both sweep and reach, scaled by zoom). `scale` = the GIS mapScale (1 = default).
// `geometry` (Data → Location → Sector geometry, for comparing):
//   'gis'       generateCoordinates exactly as the GIS Engine calls it (default)
//   'beamwidth' generateTrueSector: real beamwidth, centred — reach kept at the GIS size
//   'true'      generateTrueSector: real beamwidth, centred — reach = Sector size in metres × scale
//   'nested'    generateTrueSector: opening = beamwidth × (size / largest size in the data), reach at
//               the GIS size — the longest band draws its real beamwidth and shorter bands shrink with
//               their length, so a site's bands nest like the GIS Engine's instead of stacking.
// OLD: export function buildSectorLayer({ items, zoom, getHex, opacity = 1, scale = 1, onClick, onHover }) {
// OLD: export function buildSectorLayer({ items, zoom, getHex, opacity = 1, scale = 1, geometry = 'gis', onClick, onHover }) {
//   const boost = computeZoomBoost(zoom);
// `minCellPx` (Style → "Min cell size when zoomed out"): the GIS zoom boost stops at ×8 (zoom ≤ 11),
// so with the map zoomed out to a region / country the sectors shrink to dots and you have to zoom
// far in to see them. This raises the boost just enough that the LARGEST Sector size draws at least
// `minCellPx` pixels long at the map's centre latitude; every other band keeps its proportion, so the
// GIS nesting is unchanged — only bigger. Zoomed in, where the GIS boost is already bigger, nothing
// changes. 0 = exactly the GIS Engine.
//   pixels → metres: 156,543 m × cos(lat) / 2^zoom per pixel (web mercator)
//   GIS length (radius) in metres = L × boost × scale × 111,320 / 621,837 (generateCoordinates)
//   → boost needed = minCellPx × m/px × 621,837 / (maxL × scale × 111,320)
// OLD: export const MIN_CELL_PX_DEFAULT = 24;
export const MIN_CELL_PX_DEFAULT = 0; // default = the GIS Engine's look; the Style slider turns it up
export function buildSectorLayer({ items, zoom, getHex, opacity = 1, scale = 1, geometry = 'gis', minCellPx = 0, latitude = 0, onClick, onHover }) {
  const gisBoost = computeZoomBoost(zoom);
  const largest = items.reduce((m, d) => Math.max(m, d.size), 0);
  const metresPerPx = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  const neededBoost = minCellPx > 0 && largest > 0 ? (minCellPx * metresPerPx * 621837) / (largest * scale * 111320) : 0;
  const boost = Math.max(gisBoost, neededBoost);
  const maxSize = geometry === 'nested' ? Math.max(...items.map((d) => d.size)) || 1 : 1;
  const getPolygon = geometry === 'nested'
    ? (d) => generateTrueSector(d.lng, d.lat, d.azimuth, (d.beamwidth ?? d.size) * (d.size / maxSize), legacyReachMeters(d.size, boost, scale))
    : geometry === 'beamwidth'
    ? (d) => generateTrueSector(d.lng, d.lat, d.azimuth, d.beamwidth ?? d.size, legacyReachMeters(d.size, boost, scale))
    : geometry === 'true'
      ? (d) => generateTrueSector(d.lng, d.lat, d.azimuth, d.beamwidth ?? d.size, d.size * scale)
      : (d) => generateCoordinates(d.lng, d.lat, d.azimuth, d.size, d.size * boost, scale * 20);
  return new PolygonLayer({
    id: 'map-chart-sectors',
    data: items,
    pickable: true,
    stroked: true,
    filled: true,
    // OLD: getPolygon: (d) => generateCoordinates(d.lng, d.lat, d.azimuth, d.size, d.size * computeZoomBoost(zoom), scale * 20),
    getPolygon,
    // Transparent fill still makes the whole wedge hoverable/clickable, not just its outline.
    getFillColor: [0, 0, 0, 0],
    getLineColor: (d) => toRgba(getHex(d), opacity),
    getLineWidth: 5,
    lineWidthUnits: 'pixels',
    lineJointRounded: true,
    lineCapRounded: true,
    // OLD: updateTriggers: { getPolygon: [zoom, scale], getLineColor: [getHex, opacity] },
    // OLD: updateTriggers: { getPolygon: [zoom, scale, geometry], getLineColor: [getHex, opacity] },
    updateTriggers: { getPolygon: [zoom, scale, geometry, boost], getLineColor: [getHex, opacity] },
    onClick,
    onHover,
  });
}

// Site points — the GIS Engine's site look: a filled dot with a light outline.
export function buildSiteLayer({ items, getHex, opacity = 1, radius = 6, onClick, onHover }) {
  return new ScatterplotLayer({
    id: 'map-chart-sites',
    data: items,
    pickable: true,
    getPosition: (d) => [d.lng, d.lat],
    radiusUnits: 'pixels',
    getRadius: radius,
    getFillColor: (d) => toRgba(getHex(d), opacity),
    stroked: true,
    getLineColor: [255, 255, 255, 200],
    lineWidthMinPixels: 1,
    updateTriggers: { getFillColor: [getHex, opacity], getRadius: radius },
    onClick,
    onHover,
  });
}
