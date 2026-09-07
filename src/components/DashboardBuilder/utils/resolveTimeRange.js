// Deployment-pinned timezone for relative date/time filters ("Last 7 days", "This month",
// etc.) — deliberately always this env var, never the TopBar's per-user display-timezone
// override (see src/components/TopBar.jsx's own DEFAULT_TIMEZONE), so two viewers in
// different personal timezones querying the same relative filter get the identical absolute
// date window. Same fallback TopBar.jsx uses, for parity if the env var is ever unset.
export const DEPLOYMENT_TIME_ZONE = import.meta.env.VITE_TIME_ZONE || 'Africa/Libreville';

// Reads the wall-clock calendar date/time in `timeZone` for a given instant, as plain numbers
// — this is the standard no-dependency trick for timezone-aware calendar math (no moment-tz/
// date-fns-tz in this project's deps, and this repo runs offline so adding one is non-trivial,
// see the "new libraries" discussion for this module).
// Exported so axisTypeUtils.js can reuse the exact same zone-math instead of re-deriving it —
// see that module's own toAxisTimeValue for why a chart axis needs this too (a configurable
// per-widget "display timezone," defaulting to DEPLOYMENT_TIME_ZONE).
export function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'), month: get('month'), day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'), minute: get('minute'), second: get('second'),
  };
}

// Treats the zoned parts as a naive UTC calendar date so day/week/month/quarter/year
// arithmetic (which only ever needs to add whole calendar units) can use plain Date math
// without any real-timezone offset ever entering the calculation.
function partsToNaiveUTC({ year, month, day, hour = 0, minute = 0, second = 0 }) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function naiveUTCToDateString(naiveDate) {
  return naiveDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// Space-separated (not ISO 'T'), per the backend's own documented contract — it sends
// whatever string we give it straight into the SQL query as-is, so this must match exactly
// what a timestamp column expects: 'YYYY-MM-DD HH:MM:SS'.
function naiveUTCToDateTimeString(naiveDate) {
  return naiveDate.toISOString().slice(0, 19).replace('T', ' '); // 'YYYY-MM-DD HH:MM:SS'
}

function naiveUTCToTimeString(naiveDate) {
  return naiveDate.toISOString().slice(11, 19); // 'HH:MM:SS'
}

// `granularity` — 'date' (plain DATE columns), 'datetime' (TIMESTAMP/DATETIME columns), or
// 'time' (plain TIME-only columns) — is decided once, at filter-configuration time in
// FilterEditorModal.jsx (from the column's own discovered data_type) and stored on the value
// itself, so resolution here never needs to re-look-up column metadata. Defaults to 'date' for
// any pre-existing saved value that predates this field.
function formatBoundary(naiveDate, granularity) {
  if (granularity === 'datetime') return naiveUTCToDateTimeString(naiveDate);
  if (granularity === 'time') return naiveUTCToTimeString(naiveDate);
  return naiveUTCToDateString(naiveDate);
}

/** "Now", expressed as this deployment's own wall-clock calendar date/time. */
function deploymentNow() {
  return zonedParts(new Date(), DEPLOYMENT_TIME_ZONE);
}

const UNIT_TO_MS_DAYS = { days: 1, weeks: 7 };

function addCalendarUnits(naiveDate, amount, unit, direction) {
  const signed = direction === 'before' ? -amount : amount;
  const d = new Date(naiveDate);
  if (unit === 'hours') {
    d.setUTCHours(d.getUTCHours() + signed);
  } else if (unit === 'minutes') {
    d.setUTCMinutes(d.getUTCMinutes() + signed);
  } else if (unit === 'days' || unit === 'weeks') {
    d.setUTCDate(d.getUTCDate() + signed * (UNIT_TO_MS_DAYS[unit] || 1));
  } else if (unit === 'months') {
    d.setUTCMonth(d.getUTCMonth() + signed);
  } else if (unit === 'quarters') {
    d.setUTCMonth(d.getUTCMonth() + signed * 3);
  } else if (unit === 'years') {
    d.setUTCFullYear(d.getUTCFullYear() + signed);
  }
  return d;
}

function startOfPeriod(naiveDate, unit) {
  const d = new Date(naiveDate);
  if (unit === 'week') {
    // Monday-start week, matching this app's other calendar conventions.
    const day = d.getUTCDay(); // 0=Sun..6=Sat
    const diffToMonday = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diffToMonday);
  } else if (unit === 'month') {
    d.setUTCDate(1);
  } else if (unit === 'quarter') {
    const quarterStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
    d.setUTCMonth(quarterStartMonth, 1);
  } else if (unit === 'year') {
    d.setUTCMonth(0, 1);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Resolves one time-range filter value into concrete `[from, to]` date strings, run fresh
 * right before every query — never persisted as resolved dates (see FilterEditorModal.jsx's
 * toSavedFilter, which keeps saving the tagged spec), so "Last 7 days" stays live across
 * dashboard reloads instead of freezing to whatever day it was first configured.
 *
 * Accepts the legacy plain `[from, to]` array shape too (today's fixed-date BETWEEN), passed
 * through unchanged — only the new tagged-object shapes actually get resolved.
 */
export function resolveTimeRangeValue(value) {
  if (Array.isArray(value)) return value; // legacy/custom fixed range — already concrete
  if (!value || typeof value !== 'object') return value;

  const nowParts = deploymentNow();
  const nowNaive = partsToNaiveUTC(nowParts);
  const granularity = value.granularity === 'datetime' || value.granularity === 'time' ? value.granularity : 'date';

  if (value.mode === 'custom') {
    // Each endpoint is either a plain fixed date/datetime string (legacy/default shape) or
    // `{ type: 'now' }`, resolved fresh at query time — same deployment-pinned `now` as the
    // relative/thisPeriod presets, so "from a fixed date to now" stays live across reloads.
    const resolveEndpoint = (endpoint) => (
      endpoint && typeof endpoint === 'object' && endpoint.type === 'now'
        ? formatBoundary(nowNaive, granularity)
        : (endpoint || '')
    );
    return [resolveEndpoint(value.from), resolveEndpoint(value.to)];
  }

  if (value.mode === 'relative') {
    const { amount, unit, direction } = value;
    const boundary = addCalendarUnits(nowNaive, Number(amount) || 0, unit, direction);
    return direction === 'before'
      ? [formatBoundary(boundary, granularity), formatBoundary(nowNaive, granularity)]
      : [formatBoundary(nowNaive, granularity), formatBoundary(boundary, granularity)];
  }

  if (value.mode === 'thisPeriod') {
    const start = startOfPeriod(nowNaive, value.unit);
    return [formatBoundary(start, granularity), formatBoundary(nowNaive, granularity)];
  }

  return value;
}

// Native <input type="datetime-local"> uses 'T' with no seconds by default ('YYYY-MM-DDTHH:mm')
// — converts to/from the backend's own space-separated, seconds-included format
// ('YYYY-MM-DD HH:MM:SS', see FilterEditorModal.jsx's/FilterPanel.jsx's fixed-endpoint inputs).
export function toDateTimeLocalInput(value) {
  if (!value) return '';
  return value.replace(' ', 'T').slice(0, 16);
}
export function fromDateTimeLocalInput(value) {
  if (!value) return '';
  return `${value.replace('T', ' ')}:00`;
}

/**
 * Resolves every BETWEEN filter's time-range spec in a filters array to concrete dates,
 * leaving every other filter (and every non-tagged/legacy BETWEEN value) untouched. Call
 * this immediately before sending `filters` to getDashboardData/getStandaloneWidgetData —
 * never persist its output back to dashboard.global_filters.
 */
export function resolveFiltersForQuery(filters) {
  return (filters || []).map((f) => (
    f.operator === 'BETWEEN' ? { ...f, value: resolveTimeRangeValue(f.value) } : f
  ));
}

// A KPI_CARD's own per-card date filter (see CHART_TYPE_FIELDS's KPI_CARD entry in
// ChartLibrary.jsx) — a tagged relative/thisPeriod spec, same shape FilterEditorModal.jsx's
// dashboard-level filters already use, so it goes through the exact same resolveTimeRangeValue
// resolution at request time. Deliberately built as a plain request-level filter (passed via
// getWidgetData/getStandaloneWidgetData's own `filters` param), never written into the
// widget's persisted `mapping.filters` — the backend applies `mapping.filters` values as
// literal bound parameters with no resolution step of its own (confirmed with the backend
// team), so a relative spec stored there would freeze at whatever concrete dates were true
// the moment the chart was saved, never re-resolving to "7 days ago from today" on later
// loads. Keeping it client-side/request-level, like every other relative filter in this app,
// avoids that entirely.
const KPI_DATE_FILTER_PRESETS = {
  // `granularity: 'datetime'` on the two sub-day presets — without it, formatBoundary
  // defaults to plain date-only strings ('YYYY-MM-DD'), which can't represent an hour-level
  // window at all (both boundaries would just resolve to today's date, indistinguishable from
  // "no filter"). The day/month+ presets don't need it — a date-only boundary is exactly the
  // right precision for them, and DB timestamp columns compare fine against a bare date.
  'Last hour': { mode: 'relative', amount: 1, unit: 'hours', direction: 'before', granularity: 'datetime' },
  'Last 24 hours': { mode: 'relative', amount: 24, unit: 'hours', direction: 'before', granularity: 'datetime' },
  'Last 7 days': { mode: 'relative', amount: 7, unit: 'days', direction: 'before' },
  'Last 30 days': { mode: 'relative', amount: 30, unit: 'days', direction: 'before' },
  'This month': { mode: 'thisPeriod', unit: 'month' },
  'This quarter': { mode: 'thisPeriod', unit: 'quarter' },
  'This year': { mode: 'thisPeriod', unit: 'year' },
};

export function buildDateFilterFromPreset(column, preset) {
  const spec = KPI_DATE_FILTER_PRESETS[preset];
  if (!column || !spec) return null;
  return { column, operator: 'BETWEEN', value: spec };
}

// Shifts an already-resolved boundary string ('YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS', per
// formatBoundary above) back by `ms` milliseconds — length tells us which format it is, no
// granularity tag needed here since resolveFiltersForQuery has already baked that decision
// into the string's own shape. Millisecond-based (not whole-day) so sub-day presets like
// "1 hour ago" actually move the boundary — a date-only string has no sub-day precision to
// shift in the first place, so this only has a visible effect on a datetime-granularity value,
// same limitation formatBoundary itself already has.
function shiftDateByMs(str, ms) {
  if (!str) return str;
  const isDateTime = str.length > 10;
  const iso = isDateTime ? `${str.replace(' ', 'T')}Z` : `${str}T00:00:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return str;
  const shifted = new Date(d.getTime() - ms);
  return isDateTime ? shifted.toISOString().slice(0, 19).replace('T', ' ') : shifted.toISOString().slice(0, 10);
}

const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const COMPARISON_PRESET_SHIFT_MS = {
  '1 hour ago': MS_PER_HOUR,
  '1 day ago': MS_PER_DAY,
  '7 days ago': 7 * MS_PER_DAY,
  '30 days ago': 30 * MS_PER_DAY,
};

// KPI_CARD's "Compare to" (see CHART_TYPE_FIELDS's KPI_CARD entry in ChartLibrary.jsx) needs
// a second query against a shifted date window — the backend has no comparison-period concept
// of its own (confirmed: getWidgetData/getStandaloneWidgetData only take `{filters,
// drillPath}`), so this is computed client-side from whatever BETWEEN filter the widget
// already has, reusing the same resolution this module already does for the live query.
// Returns null when there's no BETWEEN filter to shift (nothing meaningful to compare
// against) or `preset` is unset/'None'.
export function buildComparisonFilters(filters, preset) {
  if (!preset || preset === 'None') return null;
  const resolved = resolveFiltersForQuery(filters);
  let shiftedAny = false;
  const next = resolved.map((f) => {
    if (f.operator !== 'BETWEEN' || !Array.isArray(f.value) || f.value.length !== 2) return f;
    const [from, to] = f.value;
    if (!from || !to) return f;
    const fromMs = Date.parse(from.length > 10 ? from.replace(' ', 'T') : `${from}T00:00:00`);
    const toMs = Date.parse(to.length > 10 ? to.replace(' ', 'T') : `${to}T00:00:00`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return f;
    const shiftMs = COMPARISON_PRESET_SHIFT_MS[preset];
    if (!shiftMs) return f;
    shiftedAny = true;
    return { ...f, value: [shiftDateByMs(from, shiftMs), shiftDateByMs(to, shiftMs)] };
  });
  return shiftedAny ? next : null;
}

// "Compare to: Custom" (mapping.compare_to === 'Custom' — see SINGLE_VALUE_COMPARISON_GROUP
// in ChartLibrary.jsx) — for the cases the preset shifts above can't express: most notably
// `aggregation === 'LATEST'`, which has no "current window" to shift at all (its
// date_filter_column is deliberately hidden/cleared — see LATEST_BY_FIELD's own comment — so
// buildComparisonFilters above has nothing to work with).
//
// Three distinct shapes, chosen by which args are given:
// - `latestByColumn` set (LATEST aggregation): returns a `<=` cutoff on that column —
//   "the latest reading at or before this date" — mirroring what the live LATEST query itself
//   does (`ORDER BY latest_by DESC LIMIT 1`), just anchored at a past date instead of now. The
//   one shape where a single instant is genuinely all that's meaningful (no window to speak of).
// - `customFrom`/`customTo` both set (every other aggregation's current, preferred UI):
//   the user's own explicit comparison window, applied directly — no inference at all about
//   what window length "should" apply, unlike the legacy shape below.
// - `customDate` alone (legacy — pre-dates compare_custom_from/_to, kept for any already-saved
//   mapping that still has only this field set): keeps the SAME window length as the live
//   query, just re-ends it at `customDate` — "the same N-day window, ending on this date".
export function buildCustomComparisonFilters({ filters, customDate, customFrom, customTo, latestByColumn }) {
  if (latestByColumn) {
    if (!customDate) return null;
    return [{ column: latestByColumn, operator: '<=', value: customDate }];
  }
  // Explicit from/to range (see SINGLE_VALUE_COMPARISON_GROUP's compare_custom_from/_to in
  // ChartLibrary.jsx) — the user picks the exact comparison window directly, rather than this
  // module inferring a same-length window from wherever the live query's own window happens
  // to end. Only the BETWEEN filter that matches the widget's own date_filter_column gets
  // replaced (there's normally exactly one); every other filter passes through untouched.
  if (customFrom && customTo) {
    const resolved = resolveFiltersForQuery(filters);
    let replacedAny = false;
    const next = resolved.map((f) => {
      if (f.operator !== 'BETWEEN' || !Array.isArray(f.value) || f.value.length !== 2) return f;
      replacedAny = true;
      return { ...f, value: [customFrom, customTo] };
    });
    return replacedAny ? next : null;
  }
  if (!customDate) return null;
  const resolved = resolveFiltersForQuery(filters);
  let shiftedAny = false;
  const next = resolved.map((f) => {
    if (f.operator !== 'BETWEEN' || !Array.isArray(f.value) || f.value.length !== 2) return f;
    const [from, to] = f.value;
    if (!from || !to) return f;
    const fromMs = Date.parse(from.length > 10 ? from.replace(' ', 'T') : `${from}T00:00:00`);
    const toMs = Date.parse(to.length > 10 ? to.replace(' ', 'T') : `${to}T00:00:00`);
    const customMs = Date.parse(customDate.length > 10 ? customDate.replace(' ', 'T') : `${customDate}T00:00:00`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || Number.isNaN(customMs)) return f;
    const spanMs = toMs - fromMs;
    const isDateTime = to.length > 10;
    const newTo = new Date(customMs);
    const newFrom = new Date(customMs - spanMs);
    const fmt = (d) => (isDateTime ? d.toISOString().slice(0, 19).replace('T', ' ') : d.toISOString().slice(0, 10));
    shiftedAny = true;
    return { ...f, value: [fmt(newFrom), fmt(newTo)] };
  });
  return shiftedAny ? next : null;
}
