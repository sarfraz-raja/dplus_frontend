// Dashboard Builder "Open on map" hand-off: a widget opens /gis-engine?mapFilters=…&from=… and the
// GIS engine applies those filters for this visit only (never saved to the user's map setup).
//
// URL params:
//   mapFilters  JSON array of filter rows [{ column, operator, value }] (same row shape the
//               Dashboard Builder sends everywhere — value is a scalar or an array)
//   from        optional, the source dashboard's name — shown in DashboardFilterBanner
//
// readDashboardMapLink (TelecomMapsPage) parses the URL; toGisFilters (MapActions.getUserMapSetup)
// maps the rows onto the GIS filter lists once those are loaded.

const SUPPORTED_OPERATORS = new Set(["=", "in", "IN", "eq"]);
const SITE_COLUMNS = new Set(["site_name", "sitename", "site"]);
// Technology / band aren't filter lists of their own: each technology ("4G") is a list of its bands.
const TECH_COLUMNS = new Set(["technology", "tech", "rat"]);
const BAND_COLUMNS = new Set(["band", "frequencyband", "freqband"]);
// cell_gis columns sent to /map/gisCells as typed (no list to check them against) — the backend only
// takes a safe column name and escapes the values; quotes / backslashes / very long values are still
// dropped here, and the list is capped.
const FREE_TEXT_COLUMNS = { cellname: "cell_name", cell: "cell_name", nodename: "node_name", node: "node_name", vendor: "vendor" };
const FREE_TEXT_LABELS = { cell_name: "Cell", node_name: "Node", vendor: "Vendor" };
const MAX_FREE_TEXT_VALUES = 500;
const isSafeText = (v) => v.length <= 200 && !/['\\]/.test(v);

// "Site Name" / "site_name" / "SITE-NAME" → "sitename" — dashboard columns and GIS filter names
// don't always share a case or separator.
const normKey = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const normValue = (s) => String(s ?? "").trim().toLowerCase();

const asValues = (value) => (Array.isArray(value) ? value : [value])
  .filter((v) => v !== undefined && v !== null && v !== "")
  .map((v) => String(v));

// `search`: location.search. null when the URL carries no (usable) dashboard link.
// Rows that can't be used at all are kept in `dropped` so the banner can say so.
export function readDashboardMapLink(search) {
  try {
    const params = new URLSearchParams(search || "");
    const raw = params.get("mapFilters");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const filters = [];
    const dropped = [];
    parsed.forEach((row) => {
      if (!row || typeof row !== "object" || !row.column) return;
      if (row.operator && !SUPPORTED_OPERATORS.has(row.operator)) {
        dropped.push({ column: String(row.column), reason: `operator "${row.operator}" isn't supported on the map` });
        return;
      }
      const values = asValues(row.value);
      if (!values.length) return;
      filters.push({ column: String(row.column), operator: "=", value: values });
    });

    if (!filters.length && !dropped.length) return null;
    return { filters, dropped, from: params.get("from") || null };
  } catch (e) {
    if (import.meta.env.DEV) console.warn("dashboardMapFilter: bad mapFilters param", e?.message ?? e);
    return null;
  }
}

// `filters`: readDashboardMapLink's rows; `filterGroups`: the GIS filter lists (filterRes d1 —
// [{ child: [{ name, columnName: [{ name }] }] }]).
// Returns { gisFilters, labels: [{ field, values }], skipped: [{ column, reason }] } — gisFilters is
// the getGisCells payload ({ [tb.name]: [values], site_name: [one site] }), values matched
// case-insensitively and returned in the list's own spelling.
export function toGisFilters(filters = [], filterGroups = []) {
  const gisFilters = {};
  const labels = [];
  const skipped = [];

  const fields = {};
  (filterGroups || []).forEach((group) => {
    (group?.child || []).forEach((tb) => {
      if (!tb?.name) return;
      const options = new Map((tb.columnName || []).map((v) => [normValue(v.name), v.name]));
      fields[normKey(tb.name)] = { name: tb.name, options };
    });
  });

  // Technology + band → { "4G": [its bands] }: a technology alone = all its bands, a band alone =
  // every technology that has it, both = only those bands of those technologies.
  const techGroups = ((filterGroups || []).find((g) => normKey(g?.parent) === "technology")?.child || [])
    .filter((tb) => tb?.name);
  const techRows = (filters || []).filter(({ column }) => TECH_COLUMNS.has(normKey(column)));
  const bandRows = (filters || []).filter(({ column }) => BAND_COLUMNS.has(normKey(column)));
  if (techRows.length || bandRows.length) {
    const techValues = new Set(techRows.flatMap((r) => asValues(r.value)).map(normValue));
    const bandValues = new Set(bandRows.flatMap((r) => asValues(r.value)).map(normValue));
    const matchedTechs = new Set();
    const matchedBands = new Map(); // normalized → the list's own spelling
    techGroups.forEach((tb) => {
      if (techValues.size && !techValues.has(normValue(tb.name))) return;
      const bands = (tb.columnName || []).map((v) => v.name)
        .filter((b) => !bandValues.size || bandValues.has(normValue(b)));
      if (!bands.length) return;
      gisFilters[tb.name] = [...new Set([...(gisFilters[tb.name] || []), ...bands])];
      matchedTechs.add(normValue(tb.name));
      bands.forEach((b) => matchedBands.set(normValue(b), b));
    });
    const missingTech = [...techValues].filter((v) => !matchedTechs.has(v));
    const missingBand = [...bandValues].filter((v) => !matchedBands.has(v));
    if (missingTech.length) skipped.push({ column: "Technology", reason: `not on the map: ${missingTech.join(", ")}` });
    if (missingBand.length) skipped.push({ column: "Band", reason: `not on the map${techValues.size ? " for that technology" : ""}: ${missingBand.join(", ")}` });
    if (techValues.size && matchedTechs.size) labels.push({ field: "Technology", values: techGroups.filter((tb) => matchedTechs.has(normValue(tb.name))).map((tb) => tb.name) });
    if (bandValues.size && matchedBands.size) labels.push({ field: "Band", values: [...matchedBands.values()] });
  }

  (filters || []).forEach(({ column, value }) => {
    const values = asValues(value);
    const key = normKey(column);
    if (TECH_COLUMNS.has(key) || BAND_COLUMNS.has(key)) return; // handled above

    // Cell / node / vendor: sent as typed (see FREE_TEXT_COLUMNS).
    if (FREE_TEXT_COLUMNS[key] && !fields[key]) {
      const gisKey = FREE_TEXT_COLUMNS[key];
      const safe = values.filter(isSafeText);
      const unsafe = values.length - safe.length;
      const kept = safe.slice(0, MAX_FREE_TEXT_VALUES);
      if (unsafe) skipped.push({ column, reason: `${unsafe} value(s) with quotes or over 200 characters` });
      if (safe.length > kept.length) skipped.push({ column, reason: `only the first ${MAX_FREE_TEXT_VALUES} values are used` });
      if (!kept.length) return;
      gisFilters[gisKey] = [...new Set([...(gisFilters[gisKey] || []), ...kept])];
      labels.push({ field: FREE_TEXT_LABELS[gisKey], values: kept });
      return;
    }

    // Site: free-text search on the map (one site) — not a filter list.
    if (SITE_COLUMNS.has(key) && !fields[key]) {
      gisFilters.site_name = [values[0]];
      labels.push({ field: "Site", values: [values[0]] });
      if (values.length > 1) skipped.push({ column, reason: "the map searches one site at a time — showing the first" });
      return;
    }

    const field = fields[key];
    if (!field) {
      skipped.push({ column, reason: "no matching map filter" });
      return;
    }
    const matched = [];
    const missing = [];
    values.forEach((v) => {
      const hit = field.options.get(normValue(v));
      if (hit !== undefined) matched.push(hit);
      else missing.push(v);
    });
    if (missing.length) {
      skipped.push({ column, reason: `not in the map's ${field.name} list: ${missing.join(", ")}` });
    }
    if (!matched.length) return;
    gisFilters[field.name] = [...new Set([...(gisFilters[field.name] || []), ...matched])];
    labels.push({ field: field.name, values: matched });
  });

  return { gisFilters, labels, skipped };
}
