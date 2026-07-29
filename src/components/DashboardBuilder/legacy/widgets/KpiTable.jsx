import React from 'react';
import { FONT_WEIGHT_CSS } from '../../../../theme/tokens';

// Exported so DashboardCanvasEditor.jsx can build the same fixed name/label/default-color
// set for the shared SeriesColorFields picker (Phase 8b) — one "name → color" mechanism
// used by both chart legends and this table's status legend, not two separate ones.
export const DEFAULT_STATUS_COLORS = { ok: '#34d399', warn: '#f5c542', crit: '#f2b155' };
export const STATUS_LABELS = { ok: 'Ordinal', warn: 'Warning', crit: 'Listring' };

/**
 * KPI status table: legend row of status dots + rows of {name, value, criteria, status, trend}.
 * Expected row shape: { name, value, criteria, status: 'ok'|'warn'|'crit', fullName?, icon? }
 * — a different shape than DegradedCellsTable's rows despite both sharing dataShape:'table'.
 * `statusColors` lets a caller override the ok/warn/crit dot colors (e.g. from a live color picker).
 * `rowTextColor`/`rowFontWeight`/`rowFontSize` are optional per-widget style overrides (see
 * widgetTypeRegistry.js's `styleFields` for kpiTable) — rowTextColor overrides the per-status
 * color when set; the other two apply uniformly to all cells. `rowFontSize` is a raw px number.
 */
export default function KpiTable({
  rows = [], trendRenderer = null, statusColors = DEFAULT_STATUS_COLORS,
  rowTextColor = null, rowFontWeight = null, rowFontSize = null, bgColor = null, bgGradient = null,
}) {
  const rowStyle = {
    fontWeight: rowFontWeight ? FONT_WEIGHT_CSS[rowFontWeight] : undefined,
    fontSize: rowFontSize ? `${rowFontSize}px` : undefined,
  };
  // No bg/border/rounded by default on this wrapper — unlike StatCard/GaugeCard/LineAreaChart
  // (which paint their own chrome), this widget's *ancestor* (DashboardCanvasEditor's
  // `.dbe-widget`) already supplies the card box, both standalone in the Builder (its generic
  // `.dbe-widget` rule) and inside the KPI dashboard (`.dbe-widget-kpiTable`, which specifically
  // boxes the wrapper for this reason — see KpiMonitoringDashboard.jsx's comment above that
  // rule). Boxing this element too would double it up (the bug that shipped once already) —
  // `bgColor` stays opt-in (undefined unless the user explicitly picks one) so it can't
  // reintroduce that regression on its own.
  return (
    <div className="kpi-table-wrap relative h-full flex flex-col" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {/* Header and body are the SAME <table> (thead + tbody), not a separate flex div —
          a flex header next to a table-fixed body only *approximates* matching column
          widths; once content lengths differ (short "100" vs a long header label,
          truncated headers vs untruncated values) the two layout engines resolve widths
          independently and drift apart, however carefully the percentages are matched by
          hand. One table with declared <col> widths guarantees identical column
          boundaries structurally, not just visually. */}
      <table className="kpi-status-tbl flex-1 border-collapse text-sm w-full table-fixed">
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '16%' }} />
          {trendRenderer && <col style={{ width: '40%' }} />}
        </colgroup>
        <thead>
          <tr className="kpi-card-header rounded-t-lg text-xs font-bold bg-slate-50 dark:bg-[#282E41] text-slate-500 dark:text-white/85">
            <th className="px-3 py-2 text-left font-bold overflow-hidden text-ellipsis whitespace-nowrap">
              {/* Invisible spacer matching each row's status dot (w-[0.4375rem] + mr-1) so
                  "KPIs" lines up with the actual start of "RNA"/"5G Payload" text below,
                  not the dot that precedes it. */}
              <span className="inline-block w-[0.4375rem] mr-1" aria-hidden="true" />KPIs
            </th>
            <th className="px-3 py-2 text-left font-bold overflow-hidden text-ellipsis whitespace-nowrap">Real-Time Value</th>
            <th className="px-3 py-2 text-left font-bold overflow-hidden text-ellipsis whitespace-nowrap">Criteria</th>
            {trendRenderer && <th className="px-3 py-2 text-left font-bold overflow-hidden text-ellipsis whitespace-nowrap">Trend</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-100 dark:border-white/5 last:border-none">
              <td className="kpi-tooltip px-3 py-1.5 overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: rowTextColor || statusColors[r.status], ...rowStyle }} data-tooltip={r.fullName || r.name}>
                <span className="kpi-legend-dot inline-block w-[0.4375rem] h-[0.4375rem] rounded-full mr-1" style={{ background: statusColors[r.status] }} />
                {r.icon && <span className="kpi-row-icon inline-flex items-center mr-1.5">{r.icon}</span>}
                {r.name}
              </td>
              <td className="px-3 py-1.5 overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: rowTextColor || statusColors[r.status], ...rowStyle }}>{r.value}</td>
              <td className="px-3 py-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-slate-500 dark:text-white/60" style={rowStyle}>{r.criteria}</td>
              {trendRenderer && <td className="px-3 py-1.5" style={rowStyle}>{trendRenderer(r, statusColors[r.status])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Moved from the header row (was competing with KPIs/Real-Time Value/Criteria for
          horizontal space, truncating "Real-Time Value") — bottom legend matches the
          convention Pie/Stacked Bar Chart already use (ECharts' legend: {bottom: 0}). */}
      <div className="kpi-table-legend flex items-center justify-center gap-3 py-1.5 border-t border-slate-100 dark:border-white/5">
        {Object.keys(STATUS_LABELS).map((k) => (
          <span key={k} className="kpi-legend-item flex items-center gap-1 text-[0.625rem] font-normal text-slate-500 dark:text-white/60">
            <span className="kpi-legend-dot inline-block w-[0.4375rem] h-[0.4375rem] rounded-full shrink-0" style={{ background: statusColors[k] }} />
            {STATUS_LABELS[k]}
          </span>
        ))}
      </div>
    </div>
  );
}
