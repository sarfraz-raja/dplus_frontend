// Deployment-pinned timezone for relative date/time filters ("Last 7 days", "This month",
// etc.) — deliberately always this env var, never the TopBar's per-user display-timezone
// override (see src/components/TopBar.jsx's own DEFAULT_TIMEZONE), so two viewers in
// different personal timezones querying the same relative filter get the identical absolute
// date window. Same fallback TopBar.jsx uses, for parity if the env var is ever unset.
export const DEPLOYMENT_TIME_ZONE = import.meta.env.VITE_TIME_ZONE || 'Africa/Blantyre';

// Reads the wall-clock calendar date/time in `timeZone` for a given instant, as plain numbers
// — this is the standard no-dependency trick for timezone-aware calendar math (no moment-tz/
// date-fns-tz in this project's deps, and this repo runs offline so adding one is non-trivial,
// see the "new libraries" discussion for this module).
function zonedParts(date, timeZone) {
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
  if (unit === 'days' || unit === 'weeks') {
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
