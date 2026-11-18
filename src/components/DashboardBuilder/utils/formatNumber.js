// Compact display formatting (1.2K / 3.4M / 5.6B / 7.8T) for KPI-style values.
// Purely a display concern — callers must keep doing math (deltas, percentages) on the
// raw number and only pass the final value through here at render time.
export function formatCompactNumber(value, decimals = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '—');
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: decimals,
  }).format(value);
}

// Style → Value → Number format (`numberFormat`): 'compact' picks K/M/B/T per value (Intl),
// 'full' never shortens, and the fixed levels always divide by the same power of 1000 so every
// card on a dashboard reads in one scale (e.g. 0.45M next to 12.3M, not 450K next to 12.3M).
export const NUMBER_SCALES = { thousands: { div: 1e3, suffix: 'K', steps: 1 }, millions: { div: 1e6, suffix: 'M', steps: 2 }, billions: { div: 1e9, suffix: 'B', steps: 3 }, trillions: { div: 1e12, suffix: 'T', steps: 4 } };
export const NUMBER_FORMAT_OPTIONS = [
  // OLD: { value: 'compact', label: 'Compact (1.2M)' },
  { value: 'compact', label: 'Auto (K / M / B / T)' },
  { value: 'full', label: 'Full (1,234,567)' },
  { value: 'thousands', label: 'Thousands (K)' },
  { value: 'millions', label: 'Millions (M)' },
  { value: 'billions', label: 'Billions (B)' },
  { value: 'trillions', label: 'Trillions (T)' },
];

// Rounds to `decimals` places, except a non-zero value that would round to 0 (4.5M shown in
// Billions, or 0.0004 in Full) keeps `decimals` significant digits instead — 0.0045B, not 0B.
function roundReadable(v, decimals) {
  const r = Number(v.toFixed(decimals));
  if (r !== 0 || v === 0) return String(r);
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: Math.max(decimals, 1), useGrouping: false }).format(v);
}

// A plain number in the picked Number format. Used by every single-value readout (KPI card,
// Big Number, gauge) and table cells, so the same pick means the same thing everywhere.
export function formatScaledNumber(value, numberFormat = 'compact', decimals = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '—');
  const round = (v) => Number(v.toFixed(decimals));
  const scale = NUMBER_SCALES[numberFormat];
  // OLD: if (scale) return `${round(value / scale.div)}${scale.suffix}`;
  if (scale) return `${roundReadable(value / scale.div, decimals)}${scale.suffix}`;
  // OLD: return (numberFormat ?? 'compact') === 'compact' ? formatCompactNumber(round(value), decimals) : String(round(value));
  return (numberFormat ?? 'compact') === 'compact' && Math.abs(value) >= 1 ? formatCompactNumber(round(value), decimals) : roundReadable(value, decimals);
}

// Style → Value → Unit (`unit`): the unit the column is stored in. A known unit lets the
// formatter pick the scale and suffix itself, instead of compacting to K/M and gluing the unit
// on (which gave "4.53M%" or "4.53M MB"). Anything else is free text, appended as before.
export const RATIO_PERCENT_UNIT = '%ratio'; // a 0–1 ratio, shown ×100 as "%"
export const DATA_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
export const DATA_RATE_UNITS = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
export const UNIT_PRESETS = [
  { value: '', label: 'None' },
  { value: '%', label: '%' },
  { value: RATIO_PERCENT_UNIT, label: '% (from 0–1)' },
  ...['B', 'KB', 'MB', 'GB', 'TB'].map((u) => ({ value: u, label: u })),
  ...['bps', 'Kbps', 'Mbps', 'Gbps'].map((u) => ({ value: u, label: u })),
];

// Moves `value` (in `units[fromIndex]`) to the largest unit it's still ≥ 1 in. Always base
// 1000 — the telecom/traffic convention (1 GB = 1000 MB, 1 Mbps = 1000 Kbps).
function autoScale(value, units, fromIndex) {
  let v = value;
  let i = fromIndex;
  while (Math.abs(v) >= 1000 && i < units.length - 1) { v /= 1000; i += 1; }
  while (Math.abs(v) < 1 && v !== 0 && i > 0) { v *= 1000; i -= 1; }
  return { v, unit: units[i] };
}

// One number → { text, unit } for a value readout. `unit` is the suffix to draw after the
// number ('' for none) — returned apart so cards can style it, with a leading space where it's
// a word ("4.53 TB"), none for "%". Deltas/targets must keep using the raw number; display only.
//   numberFormat 'compact' (default): plain numbers → 1.2M; data sizes/rates → auto-scaled.
//   numberFormat 'full': the number in its stored unit, unscaled (4531879 MB).
//   numberFormat 'thousands'…'trillions': plain numbers → that fixed K/M/B/T; data sizes/rates
//     move that many units up (Millions of MB → TB), so a fixed scale stays fixed there too.
//   '%' / '% (from 0–1)': never shortened to K/M.
export function formatWithUnit(value, { unit = '', numberFormat = 'compact', decimals = 2 } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { text: String(value ?? '—'), unit: '' };
  // OLD: const round = (v) => Number(v.toFixed(decimals));
  const round = (v) => roundReadable(v, decimals);
  const compact = (numberFormat ?? 'compact') === 'compact';
  const scale = NUMBER_SCALES[numberFormat];
  if (unit === '%') return { text: String(round(value)), unit: '%' };
  if (unit === RATIO_PERCENT_UNIT) return { text: String(round(value * 100)), unit: '%' };
  const units = DATA_SIZE_UNITS.includes(unit) ? DATA_SIZE_UNITS : DATA_RATE_UNITS.includes(unit) ? DATA_RATE_UNITS : null;
  if (units) {
    if (scale) {
      const i = Math.min(units.indexOf(unit) + scale.steps, units.length - 1);
      return { text: String(round(value / 1000 ** (i - units.indexOf(unit)))), unit: ` ${units[i]}` };
    }
    if (!compact) return { text: String(round(value)), unit: ` ${unit}` };
    const { v, unit: scaled } = autoScale(value, units, units.indexOf(unit));
    return { text: String(round(v)), unit: ` ${scaled}` };
  }
  // Custom text: a word gets a space like the known units ("4.53M calls"); a symbol ($, °) and
  // anything already starting with a space stay as typed.
  const custom = unit || '';
  // OLD: return { text: compact ? formatCompactNumber(round(value), decimals) : String(round(value)), unit: /^[A-Za-z]/.test(custom) ? ` ${custom}` : custom };
  return { text: formatScaledNumber(value, numberFormat, decimals), unit: /^[A-Za-z]/.test(custom) ? ` ${custom}` : custom };
}

// Whether `unit` is one formatWithUnit understands (so a delta should carry it too).
export const isKnownUnit = (unit) => unit === '%' || unit === RATIO_PERCENT_UNIT
  || DATA_SIZE_UNITS.includes(unit) || DATA_RATE_UNITS.includes(unit);
