import React from 'react';

/**
 * One color picker per named category — the shared "assign a color to a name" mechanism
 * used by chart legends (stacked bar series, pie/funnel/treemap slices) AND KpiTable's
 * status legend (see widgetTypeRegistry.js's Phase 8b note). `names` is a plain list —
 * this component doesn't care whether the names came from bound data (charts) or are a
 * fixed set (KpiTable's ok/warn/crit) — same UI, same storage shape either way.
 *
 * `value` is the widget's raw `style.seriesColors` object (may be missing some/all
 * names — falls back to `resolvedDefaults[name]` for display, matching the same
 * "show the real current color" pattern WidgetStyleFields uses for its own color fields).
 */
export default function SeriesColorFields({ names = [], labels = {}, value = {}, onChange, resolvedDefaults = {} }) {
  if (!names.length) return null;

  // Compact grid (small inline swatch + label, wrapped 2-up) instead of one full-width
  // color bar per name — a widget with many categories (e.g. a 24-cell treemap) used to
  // turn this into a very long vertical scroll of near-identical wide bars.
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
      {names.map((name) => {
        const current = value?.[name] || resolvedDefaults[name] || '#000000';
        return (
          <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <input
              type="color"
              style={{ width: 22, height: 22, padding: 0, border: 'none', flexShrink: 0, cursor: 'pointer' }}
              value={current}
              onChange={(e) => onChange(name, e.target.value)}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={labels[name] || name}>
              {labels[name] || name}
            </span>
          </label>
        );
      })}
    </div>
  );
}
