import React from 'react';
import { FONT_WEIGHT_CSS } from '../../theme/tokens';

const DEFAULT_STATUS_COLORS = { ok: '#34d399', warn: '#f5c542', crit: '#f2b155' };
const STATUS_LABELS = { ok: 'Ordinal', warn: 'Warning', crit: 'Listring' };

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
  rowTextColor = null, rowFontWeight = null, rowFontSize = null,
}) {
  const rowStyle = {
    fontWeight: rowFontWeight ? FONT_WEIGHT_CSS[rowFontWeight] : undefined,
    fontSize: rowFontSize ? `${rowFontSize}px` : undefined,
  };
  return (
    <div className="kpi-table-wrap relative h-full flex flex-col rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C] overflow-hidden">
      <div className="kpi-card-header flex items-center gap-2 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-[#282E41] text-slate-500 dark:text-white/85">
        <div className="kpi-header-col kpi-header-col-1 w-[22%] overflow-hidden text-ellipsis whitespace-nowrap">KPIs</div>
        <div className="kpi-header-col kpi-header-col-2 w-[18%] overflow-hidden text-ellipsis whitespace-nowrap">Real-Time Value</div>
        <div className="kpi-header-col kpi-header-col-3 w-[16%] overflow-hidden text-ellipsis whitespace-nowrap">Criteria</div>
        {trendRenderer && <div className="kpi-header-col kpi-header-col-4 w-[40%] overflow-hidden text-ellipsis whitespace-nowrap">Trend</div>}
        <div className="kpi-table-legend flex items-center gap-2 ml-auto shrink-0">
          {Object.keys(STATUS_LABELS).map((k) => (
            <span key={k} className="kpi-legend-item flex items-center gap-1 text-[0.625rem] font-normal text-slate-500 dark:text-white/60">
              <span className="kpi-legend-dot inline-block w-[0.4375rem] h-[0.4375rem] rounded-full shrink-0" style={{ background: statusColors[k] }} />
              {STATUS_LABELS[k]}
            </span>
          ))}
        </div>
      </div>
      <table className="kpi-status-tbl flex-1 border-collapse text-sm w-full table-fixed">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-100 dark:border-white/5 last:border-none">
              <td className="kpi-tooltip px-3 py-1.5" style={{ color: rowTextColor || statusColors[r.status], ...rowStyle }} data-tooltip={r.fullName || r.name}>
                <span className="kpi-legend-dot inline-block w-[0.4375rem] h-[0.4375rem] rounded-full mr-1" style={{ background: statusColors[r.status] }} />
                {r.icon && <span className="kpi-row-icon inline-flex items-center mr-1.5">{r.icon}</span>}
                {r.name}
              </td>
              <td className="px-3 py-1.5" style={{ color: rowTextColor || statusColors[r.status], ...rowStyle }}>{r.value}</td>
              <td className="px-3 py-1.5 text-slate-500 dark:text-white/60" style={rowStyle}>{r.criteria}</td>
              {trendRenderer && <td className="px-3 py-1.5" style={rowStyle}>{trendRenderer(r, statusColors[r.status])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
