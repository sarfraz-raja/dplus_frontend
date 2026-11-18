// Widget "Open on map": opens the GIS Engine filtered to what the widget shows —
// /gis-engine?mapFilters=[{ column, operator, value }]&from=<dashboard name>, read on the GIS side by
// MapsUsingDeckgl/Utils/dashboardMapFilter.js (readDashboardMapLink → toGisFilters).
//
// A placement's own `mapLink` (widgets[id].mapLink) rides along in its dashboard.layout entry next to
// `link` (buildLocalLayoutAndWidgets + handleSave in pages/DashboardBuilder.jsx). Shape:
//   { carry: 'value' | 'filters' | 'value+filters', newWindow: boolean, fieldMap: { [column]: fieldKey | '' } }
//   carry    'value' → the clicked point (a bar, a cell / site on a Map chart); 'filters' → every
//            filter the widget is showing (dashboard + chart + this placement + a cross-filter on it).
//   fieldMap which GIS field each dashboard column is passed as; '' = don't pass. Columns not in it
//            fall back to the defaults (resolveMapField) — everything else isn't passed.

export const MAP_LINK_PATH = '/gis-engine';

// GIS fields a dashboard column can be passed as — `key` is what toGisFilters reads.
// Only `autoMatch` fields are picked by column name without the user choosing them (cell columns).
export const MAP_FIELDS = [
  { key: 'region', label: 'Region', aliases: ['region'] },
  { key: 'technology', label: 'Technology', aliases: ['technology', 'tech', 'rat'] },
  { key: 'band', label: 'Band', aliases: ['band', 'frequency_band', 'freq_band'] },
  { key: 'site_name', label: 'Site', aliases: ['site_name', 'sitename', 'site', 'site_code'] },
  { key: 'cell_name', label: 'Cell', aliases: ['cell_name', 'cellname', 'cell'], autoMatch: true },
  { key: 'node_name', label: 'Node', aliases: ['node_name', 'nodename', 'node'] },
  { key: 'vendor', label: 'Vendor', aliases: ['vendor'] },
];
const FIELD_KEYS = new Set(MAP_FIELDS.map((f) => f.key));

// A long IN list would push the URL past what servers / proxies accept (~8 KB) — the rest is dropped.
export const MAX_VALUES_PER_FIELD = 200;

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Field a column passes as by default, before the user picks: `defaults` (a Map chart's ID column →
// Cell / Site), else a cell-named column → Cell. null = not passed.
export function autoMapField(column, defaults = {}) {
  if (defaults[column]) return defaults[column];
  const n = norm(column);
  const hit = MAP_FIELDS.find((f) => f.autoMatch && f.aliases.some((a) => norm(a) === n));
  return hit ? hit.key : null;
}

// The GIS field a column is passed as, or null. An explicit fieldMap entry wins ('' = don't pass).
export function resolveMapField(column, fieldMap = {}, defaults = {}) {
  if (!column) return null;
  if (Object.prototype.hasOwnProperty.call(fieldMap, column)) {
    return FIELD_KEYS.has(fieldMap[column]) ? fieldMap[column] : null;
  }
  return autoMapField(column, defaults);
}

// A Map chart's ID column → Cell (cells layer) / Site (sites layer), so its clicked shape passes on
// without any setup. {} for every other chart.
export function mapChartFieldDefaults(mapping) {
  if (mapping?.chart_variant !== 'map' || !mapping.map_id) return {};
  return { [mapping.map_id]: mapping.map_layer === 'sites' ? 'site_name' : 'cell_name' };
}

const hasValue = (v) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));

// Filter rows → GIS rows: only `=` / IN rows on a column passed as a GIS field. `filters` in order of
// precedence, lowest first (dashboard, chart, placement, cross-filter) — a later row on the same field
// replaces an earlier one; the clicked point wins over all. Returns { rows, truncated }.
export function buildMapRows(mapLink, { filters = [], point = null, defaults = {} } = {}) {
  const fieldMap = mapLink?.fieldMap || {};
  const carry = mapLink?.carry || 'filters';
  const byField = new Map();
  if (carry === 'filters' || carry === 'value+filters') {
    filters.forEach((f) => {
      if (!f?.column || !hasValue(f.value)) return;
      const op = String(f.operator || '=').toLowerCase();
      if (op !== '=' && op !== 'in' && op !== 'eq') return;
      const field = resolveMapField(f.column, fieldMap, defaults);
      if (field) byField.set(field, Array.isArray(f.value) ? f.value : [f.value]);
    });
  }
  if ((carry === 'value' || carry === 'value+filters') && point?.column && hasValue(point.value)) {
    const field = resolveMapField(point.column, fieldMap, defaults);
    if (field) byField.set(field, [point.value]);
  }
  let truncated = false;
  const rows = [...byField.entries()].map(([field, values]) => {
    const clean = values.filter(hasValue).map(String);
    if (clean.length > MAX_VALUES_PER_FIELD) truncated = true;
    return { column: field, operator: '=', value: clean.slice(0, MAX_VALUES_PER_FIELD) };
  }).filter((r) => r.value.length);
  return { rows, truncated };
}

// The GIS Engine URL for these rows. `from`: the source dashboard's name (the GIS banner shows it).
export function mapLinkUrl(rows = [], { from = '' } = {}) {
  const params = new URLSearchParams();
  if (rows.length) params.set('mapFilters', JSON.stringify(rows));
  if (from) params.set('from', from);
  const qs = params.toString();
  return qs ? `${MAP_LINK_PATH}?${qs}` : MAP_LINK_PATH;
}
