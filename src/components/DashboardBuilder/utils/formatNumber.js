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
