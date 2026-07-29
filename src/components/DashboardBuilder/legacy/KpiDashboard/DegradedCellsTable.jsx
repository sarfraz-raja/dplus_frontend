import React from 'react';
import { FONT_WEIGHT_CSS } from '../../../../theme/tokens';

/**
 * Small "worst N cells" table — extracted out of KpiMonitoringDashboard so it can be
 * registered as its own widget type in the Dashboard Builder grid.
 * Expected row shape: { cellId, delta: string (e.g. '+3.2%'), kpi } — a different shape
 * than KpiTable's rows despite both sharing dataShape:'table'.
 * `rowTextColor`/`rowFontWeight`/`rowFontSize` are optional per-widget style overrides
 * (see widgetTypeRegistry.js's `styleFields` for degradedCellsTable) — rowTextColor
 * overrides the delta up/down color when set; the other two apply to all cells.
 * `rowFontSize` is a raw px number.
 */
export default function DegradedCellsTable({ rows = [], rowTextColor = null, rowFontWeight = null, rowFontSize = null }) {
  const rowStyle = {
    fontWeight: rowFontWeight ? FONT_WEIGHT_CSS[rowFontWeight] : undefined,
    fontSize: rowFontSize ? `${rowFontSize}px` : undefined,
  };
  // No bg/border/rounded here — same reasoning as KpiTable.jsx: the ancestor `.dbe-widget`
  // (generic in the Builder, `.dbe-widget-degradedCellsTable` inside the KPI dashboard)
  // already boxes this widget; adding our own here would double it up.
  return (
    <table className="kpi-cells-tbl border-collapse text-sm w-full">
      <thead>
        <tr>
          <th className="text-left font-semibold px-3 py-2.5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/85">Cell ID</th>
          <th className="text-left font-semibold px-3 py-2.5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/85">Δ</th>
          <th className="text-left font-semibold px-3 py-2.5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/85">KPI Impacted</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.cellId} className="border-b border-slate-100 dark:border-white/5 last:border-none">
            <td className="px-3 py-2" style={rowStyle}>{c.cellId}</td>
            <td
              className={`kpi-cells-delta px-3 py-2 ${rowTextColor ? '' : c.delta?.startsWith('+') ? 'up text-emerald-600 dark:text-emerald-400' : 'down text-amber-600 dark:text-amber-400'}`}
              style={{ color: rowTextColor || undefined, ...rowStyle }}
            >
              {c.delta}
            </td>
            <td className="px-3 py-2" style={rowStyle}>{c.kpi}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
