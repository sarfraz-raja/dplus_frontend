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
// resolveTimeRange.js's own doc comment on that convention) and re-expresses it as a
// "naive-as-UTC" epoch. Handed to ECharts with `xAxis.useUTC: true`, that epoch's UTC getters
// read out exactly DEPLOYMENT_TIME_ZONE's numbers — so every viewer sees the identical axis
// regardless of their own browser's timezone, the same guarantee resolveTimeRange.js already
// gives relative filters ("Last 7 days").
export function toAxisTimeValue(value) {
  const str = String(value);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return NaN;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  const utcEpoch = zonedWallClockToUTC(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s), DEPLOYMENT_TIME_ZONE);
  const displayParts = zonedParts(new Date(utcEpoch), DEPLOYMENT_TIME_ZONE);
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
  // Year folded into the day-tier template itself (rather than left to the separate 'year'
  // tier, which only ever shows once ticks are spaced a year+ apart) — for a user who wants
  // the year visible on every day-level tick, not just once when the axis happens to zoom out
  // that far. Numeric (MM/DD) and alphabetic (MMM) month, each in both day-first and
  // month-first ordering — the same four stylistic choices as the day-only presets above, just
  // with {yyyy} appended.
  'MM-DD-YYYY': { year: '{yyyy}', month: '{MMM}', day: '{MM}-{dd}-{yyyy}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'DD-MM-YYYY': { year: '{yyyy}', month: '{MMM}', day: '{dd}-{MM}-{yyyy}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'MMM DD, YYYY': { year: '{yyyy}', month: '{MMM}', day: '{MMM} {dd}, {yyyy}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'DD MMM YYYY': { year: '{yyyy}', month: '{MMM}', day: '{dd} {MMM} {yyyy}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  // Same four, with the hour:minute also folded into the day-tier tick label — for an axis
  // whose ticks are dense enough (sub-day range) that "which day AND what time" both need to
  // read off one tick, without switching to the separate hour tier (which drops the date
  // entirely — fine when zoomed into a single day, not when a range still spans several).
  'MM-DD-YYYY HH:mm': { year: '{yyyy}', month: '{MMM}', day: '{MM}-{dd}-{yyyy} {HH}:{mm}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'DD-MM-YYYY HH:mm': { year: '{yyyy}', month: '{MMM}', day: '{dd}-{MM}-{yyyy} {HH}:{mm}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'MMM DD, YYYY HH:mm': { year: '{yyyy}', month: '{MMM}', day: '{MMM} {dd}, {yyyy} {HH}:{mm}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
  'DD MMM YYYY HH:mm': { year: '{yyyy}', month: '{MMM}', day: '{dd} {MMM} {yyyy} {HH}:{mm}', hour: '{HH}:{mm}', minute: '{HH}:{mm}', second: '{HH}:{mm}:{ss}' },
};
export const DEFAULT_TIME_AXIS_FORMAT = 'MM-DD';

/** Resolves a possibly-unset/possibly-stale preset key to a real formatter object, never undefined. */
export function resolveTimeAxisFormat(presetKey) {
  return TIME_AXIS_FORMAT_PRESETS[presetKey] || TIME_AXIS_FORMAT_PRESETS[DEFAULT_TIME_AXIS_FORMAT];
}

// Substitutes a day/hour-tier template's tokens against a real epoch — read via UTC getters
// since toAxisTimeValue/xAxis.useUTC already encode every axis value as a naive-as-UTC epoch
// (so getUTC* reads back exactly DEPLOYMENT_TIME_ZONE's own wall-clock numbers, not the
// browser's local ones). Shared by renderDayTierPreview (a fixed sample date, for the
// dropdown's own preview text) and resolveCustomTickFormatter below (real axis ticks).
function formatTemplateValue(epochMs, template) {
  const d = new Date(epochMs);
  const yyyy = String(d.getUTCFullYear());
  const MMM = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const HH = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return template.replace('{yyyy}', yyyy).replace('{MMM}', MMM).replace('{MM}', MM).replace('{dd}', dd).replace('{HH}', HH).replace('{mm}', mm);
}

// Formats one raw axis value (e.g. a row's own `starttime`) using a preset's `day`-tier
// template — for a *discrete* category axis (HorizontalBarChart.jsx's ranked bars, not a
// continuous `type: 'time'` axis), each label is its own independent row, not a tick along a
// timeline, so there's no ECharts axis-formatter callback to hand this to; the label string
// itself has to be pre-formatted before it ever reaches `data: labels`. Falls back to the raw
// string as-is for a non-time-shaped value (isTimeValue guards the call site) or an unset preset.
export function formatDateLabel(value, presetKey) {
  const epochMs = toAxisTimeValue(value);
  if (Number.isNaN(epochMs)) return String(value);
  return formatTemplateValue(epochMs, resolveTimeAxisFormat(presetKey).day);
}

// Renders a preset's own `day`-tier template against a fixed sample date (18 May), the same
// tier X_AXIS_DATE_FORMAT_FIELD actually lets the user choose between — so the field's dropdown
// can show e.g. "MMM DD | May 18" instead of a bare token string the user has to mentally
// decode.
function renderDayTierPreview(template) {
  return formatTemplateValue(Date.UTC(2026, 4, 18), template);
}

// `{ value, label }` pairs for X_AXIS_DATE_FORMAT_FIELD's dropdown — see MappingFields.jsx's
// 'select' case for how the object form is rendered (stored value stays the plain preset key,
// only the visible label gets the preview appended).
export const TIME_AXIS_FORMAT_OPTIONS = Object.keys(TIME_AXIS_FORMAT_PRESETS).map((key) => ({
  value: key,
  label: `${key} | ${renderDayTierPreview(TIME_AXIS_FORMAT_PRESETS[key].day)}`,
}));

// Unit multipliers (-> ms) for the fully-custom tick-spacing pair (X_AXIS_TICK_INTERVAL_FIELD
// in ChartLibrary.jsx) — lets a user pin a time axis's tick spacing to their data's actual
// sampling rate (e.g. "3 hours" for 3-hourly readings) instead of ECharts' own auto-tick
// algorithm (span ÷ pixel width), which picks spacing off its own internal ladder regardless
// of the real cadence and can silently skip most of the data's own timestamps as labeled ticks.
//
// SCOPE: minutes/hours/days/weeks only — every one of these is a *fixed* millisecond duration,
// so buildCustomTimeTicks below can just add a constant step repeatedly starting from the
// data's own min timestamp. `months`/`quarters`/`years` are deliberately NOT included: a month
// isn't a fixed duration (28-31 days), so stepping by a flat "30 days" approximation would
// drift ticks off real calendar boundaries the further out you go (e.g. "every 1 month" from
// Jan 1 landing on Jan 31, then Mar 2, then Apr 1...). Supporting those correctly needs
// calendar-aware stepping (Date#setMonth(date.getMonth() + n), not a millisecond multiplier) —
// a different code path from this table, not implemented here. In practice this gap matters
// less than it sounds: ECharts' own Auto tick ladder (see calcNiceForTimeScale's doc comment
// below) already includes month/quarter/half-year/year tiers, so wide multi-month+ ranges get
// sensible spacing without a custom override; this feature exists to cover the sub-day/day gap
// Auto's ladder jumps over (12h straight to ~1.2 days, no "every 3 hours" or "every 8 hours").
export const TICK_INTERVAL_UNIT_MS = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};
export const DEFAULT_TICK_INTERVAL_UNIT = 'hours';

// Per-unit ceiling — capped at the point where a value would just be the next unit up
// expressed clumsily (e.g. "24 hours" is "1 day"; "7 days" is "1 week"), so the field can't
// hold a value that's really a unit-selection mistake rather than a real custom interval.
// `weeks` has no unit above it here, so its cap (104 ≈ 2 years) exists only to block obvious
// typos, not to enforce a rollover.
export const TICK_INTERVAL_UNIT_MAX = {
  minutes: 59,
  hours: 23,
  days: 6,
  weeks: 104,
};

/** `value` blank/0/negative -> undefined (Auto, ECharts' own spacing) — never a 0ms interval, which ECharts would treat as "infinite ticks". */
export function resolveTickInterval(value, unit) {
  const n = Number(value);
  if (!n || n <= 0) return undefined;
  const max = TICK_INTERVAL_UNIT_MAX[unit];
  const clamped = max != null ? Math.min(n, max) : n;
  return clamped * (TICK_INTERVAL_UNIT_MS[unit] || TICK_INTERVAL_UNIT_MS[DEFAULT_TICK_INTERVAL_UNIT]);
}

// A `type: 'time'` axis's own tick auto-calculation (see calcNiceForTimeScale in ECharts'
// scale/Time.js) *always* snaps to a fixed internal ladder — 1s/1min/1h/6h/12h/~1.2d/3.5d/7d/
// 31d/95d/6mo/1yr — no matter what minInterval/maxInterval/interval are set to; those only
// narrow which ladder rung gets picked, they can't introduce a value that isn't already on it
// (confirmed by reading the installed echarts package directly — a "13 hours" or "3 hours"
// request silently rounds to 12h or 1h respectively, never landing on the literal value asked
// for). The only way to get an arbitrary exact spacing is to hand ECharts a pre-computed list
// of exact tick positions via axisLabel/axisTick's `customValues`, bypassing its ladder
// entirely — this builds that list from the real data's own time extent.
// Capped at `maxTicks` (default 500) — a tiny interval over a wide span (e.g. "5 minutes" over
// a 5-day range) would otherwise generate thousands of ticks and freeze the chart; past the
// cap this returns undefined so the caller falls back to ECharts' own Auto ladder instead.
export function buildCustomTimeTicks(timestamps, intervalMs, maxTicks = 500) {
  if (!intervalMs || !timestamps.length) return undefined;
  const finite = timestamps.filter(Number.isFinite);
  if (!finite.length) return undefined;
  const dataMin = Math.min(...finite);
  const dataMax = Math.max(...finite);
  // A single data point (or every point sharing one timestamp) means dataMax === dataMin — not
  // "no real span", just a degenerate one. Mirrors ECharts' own fallback for the identical
  // situation (calcNiceForTimeScale in scale/Time.js pads a single-point extent by ±1 day) so
  // the axis still gets a real, interval-spaced tick set across the same padded window ECharts
  // itself would show.
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const rangeMin = dataMax > dataMin ? dataMin : dataMin - ONE_DAY;
  const rangeMax = dataMax > dataMin ? dataMax : dataMax + ONE_DAY;
  if ((rangeMax - rangeMin) / intervalMs > maxTicks) return undefined;
  // Anchored AT `dataMin` (the real data's own earliest timestamp) and walked outward in both
  // directions by exactly `intervalMs`, rather than starting the sequence from `rangeMin` —
  // starting from rangeMin (the padded/data-derived range boundary, not a real data point)
  // means the whole tick sequence can drift away from the actual data by however much padding
  // was applied, e.g. a single point at May 18 with ±1-day padding and a 5-day interval would
  // place a tick at "May 17" — a day nothing happened on — instead of on May 18 itself. Walking
  // outward from dataMin guarantees at least one tick always lands exactly on real data.
  const ticks = [];
  for (let t = dataMin; t >= rangeMin - intervalMs; t -= intervalMs) ticks.unshift(t);
  for (let t = dataMin + intervalMs; t <= rangeMax + intervalMs; t += intervalMs) ticks.push(t);
  return ticks;
}

// Custom ticks (buildCustomTimeTicks above) hit an ECharts limitation the auto-tick path never
// runs into: with a caller-supplied tick list, ECharts has no idea what interval was actually
// configured, so it re-derives each tick's own "granularity" independently — purely by
// inspecting whether *that individual timestamp's* clock fields happen to be zero (see
// leveledFormat/getUnitFromValue in echarts' util/time.js). A tick that isn't exactly midnight
// is classified as an hour-level tick and only ever shows `HH:mm`, no matter how far apart the
// real ticks are or how many calendar days the axis actually spans.
//
// This bites in two shapes, both fixed here since the real interval (and the full tick list)
// are already known at this call site:
// - >=1 day interval: every tick is forced to the day-tier template outright — there's no
//   ambiguity to resolve, a daily-or-wider tick should always read as a date.
// - <1 day interval: forcing every tick to a date would be too noisy (most ticks are same-day),
//   but relying on ECharts' "exactly midnight" check silently fails whenever the axis's anchor
//   (a real data timestamp) isn't midnight-aligned — e.g. ticks every 6h starting from 14:30
//   land on 14:30/20:30/02:30/08:30, never 00:00, so NO tick would ever get a date no matter
//   how many days the axis spans. Fixed by comparing each tick's own calendar date to the tick
//   immediately before it (both known, since the ordered tick list is passed in) — the date is
//   shown alongside the time exactly when it actually changes (or on the very first tick),
//   which is the real question ("did the day change here?"), not "is this tick midnight?".
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export function resolveCustomTickFormatter(dateFormat, intervalMs, tickValues) {
  const presets = resolveTimeAxisFormat(dateFormat);
  // Auto (no custom interval at all) — untouched, original behavior: hand ECharts the plain
  // per-granularity dictionary and let its own auto-tick ladder (which, unlike a custom tick
  // list, DOES produce nice round/often-midnight-aligned ticks) pick the right tier per tick.
  // The day-diff logic below only makes sense once there's a real custom tick list to diff
  // against — with none, it would just show plain time forever, a regression from today.
  if (!intervalMs) return presets;
  if (intervalMs >= ONE_DAY_MS) {
    return (value) => formatTemplateValue(value, presets.day);
  }
  const dateKey = (ms) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  };
  return (value, idx) => {
    const timeLabel = formatTemplateValue(value, presets.hour);
    if (!tickValues || !tickValues.length) return timeLabel;
    const isNewDay = idx === 0 || dateKey(value) !== dateKey(tickValues[idx - 1]);
    return isNewDay ? `${formatTemplateValue(value, presets.day)} ${timeLabel}` : timeLabel;
  };
}

// Shared by every Truncate-Axis widget (BarChart/AreaChart/LineAreaChart/HorizontalBarChart/
// WaterfallChart/StackedBarChart/ScatterChart — see TRUNCATE_Y_AXIS_FIELD/TRUNCATE_X_AXIS_FIELD
// in ChartLibrary.jsx) instead of each repeating its own `truncate && min != null ? min :
// undefined` inline. A `min > max` combination is nonsensical to ECharts' own axis.min/max
// (inverts the scale unpredictably rather than erroring) — rather than let that reach the
// chart, both bounds are dropped back to Auto/undefined so a bad range degrades to "no
// truncation" instead of a broken axis. MappingFields.jsx's own `warnIf` on the Max field
// surfaces *why* nothing happened, so this silent fallback isn't silent to the user.
export function resolveTruncatedBounds(truncate, min, max) {
  if (!truncate) return { min: undefined, max: undefined };
  if (min != null && max != null && min > max) return { min: undefined, max: undefined };
  return { min: min != null ? min : undefined, max: max != null ? max : undefined };
}
