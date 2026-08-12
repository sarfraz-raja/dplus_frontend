// Value-based date/time detection for chart axes — no column metadata (data_type) required,
// since it isn't threaded down to every chart-rendering call site yet. Works off the actual
// row value instead, so it's usable from any chart type/component without new props.
import { DEPLOYMENT_TIME_ZONE, zonedParts } from '../utils/resolveTimeRange';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/;

/** True if `value` looks like a date/time (e.g. "2026-05-12T00:00:00"), not just any parseable number/string. */
export function isTimeValue(value) {
  if (value == null) return false;
  const str = String(value);
  return ISO_DATE_RE.test(str) && !Number.isNaN(Date.parse(str));
}

/** True if every value in `values` looks like a date/time — used to decide a whole axis, not one point. */
export function isTimeAxis(values) {
  return values.length > 0 && values.every(isTimeValue);
}

// Every named IANA zone the browser knows about — used as the "Timezone" select's option
// list (a per-widget override, defaulting to DEPLOYMENT_TIME_ZONE — see toAxisTimeValue).
// `Intl.supportedValuesOf` is unsupported only on quite old browsers; falls back to a short
// list (deployment zone + UTC) rather than nothing, so the field still works there.
export const TIMEZONE_OPTIONS = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : [DEPLOYMENT_TIME_ZONE, 'UTC'];

// Wall-clock parts already known to be `timeZone`'s own reading -> the real UTC instant they
// represent. Standard single-guess-and-correct trick (good enough for chart display — the
// same simplification resolveTimeRange.js's own zone math already relies on): treat the wall
// clock as if it were UTC, see what that guess actually reads as in `timeZone`, and shift by
// the difference.
function zonedWallClockToUTC(y, mo, d, h, mi, s, timeZone) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const zoned = zonedParts(new Date(guess), timeZone);
  const zonedAsUTC = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
  return guess - (zonedAsUTC - guess);
}

// Parses a raw axis value (a naive 'YYYY-MM-DD[ T]HH:mm[:ss]' string, already expressed in
// DEPLOYMENT_TIME_ZONE's own wall clock — the backend never sends real UTC, see
// resolveTimeRange.js's own doc comment on that convention) and re-expresses the same instant
// as `displayZone`'s wall clock, encoded as a "naive-as-UTC" epoch. Handed to ECharts with
// `xAxis.useUTC: true`, that epoch's UTC getters read out exactly `displayZone`'s numbers —
// so every viewer sees the identical axis regardless of their own browser's timezone, the same
// guarantee resolveTimeRange.js already gives relative filters ("Last 7 days"). Defaulting
// `displayZone` to DEPLOYMENT_TIME_ZONE makes this a no-op reshuffle unless a widget explicitly
// overrides it (mapping.x_axis_timezone — see X_AXIS_TIMEZONE_FIELD in ChartLibrary.jsx).
export function toAxisTimeValue(value, displayZone = DEPLOYMENT_TIME_ZONE) {
  const str = String(value);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return NaN;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  const utcEpoch = zonedWallClockToUTC(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s), DEPLOYMENT_TIME_ZONE);
  const displayParts = zonedParts(new Date(utcEpoch), displayZone);
  return Date.UTC(displayParts.year, displayParts.month - 1, displayParts.day, displayParts.hour, displayParts.minute, displayParts.second);
}

// Per-granularity tick-label formats (ECharts' own object-map convention for a `type: 'time'`
// axis) — sparse ticks show only as much precision as their zoom level needs. Several day-tier
// orderings/styles ("MM-DD" vs "DD-MM" vs "DD MMM" ...) since that's the one piece users
// actually asked to pick (see X_AXIS_DATE_FORMAT_FIELD) — the rest of the granularity ladder
// (year/month/hour/minute/second) stays consistent across presets, only the day-level format
// differs, since that's the tier shown for the vast majority of typical (multi-day) ranges.
export const TIME_AXIS_FORMAT_PRESETS = {
  'MM-DD': { year: '{yyyy}', month: '{MMM}', day: '{MM}-{dd}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'DD-MM': { year: '{yyyy}', month: '{MMM}', day: '{dd}-{MM}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'MMM DD': { year: '{yyyy}', month: '{MMM}', day: '{MMM} {dd}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'DD MMM': { year: '{yyyy}', month: '{MMM}', day: '{dd} {MMM}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
};
export const DEFAULT_TIME_AXIS_FORMAT = 'MM-DD';

/** Resolves a possibly-unset/possibly-stale preset key to a real formatter object, never undefined. */
export function resolveTimeAxisFormat(presetKey) {
  return TIME_AXIS_FORMAT_PRESETS[presetKey] || TIME_AXIS_FORMAT_PRESETS[DEFAULT_TIME_AXIS_FORMAT];
}
