import React from 'react';

const DEFAULT_STATUS_COLORS = { ok: '#34d399', warn: '#f5c542', crit: '#f2b155' };
const STATUS_LABELS = { ok: 'Ordinal', warn: 'Warning', crit: 'Listring' };

/**
 * KPI status table: legend row of status dots + rows of {name, value, criteria, status, trend}.
 * `statusColors` lets a caller override the ok/warn/crit dot colors (e.g. from a live color picker).
 */
export default function KpiTable({ rows = [], trendRenderer = null, statusColors = DEFAULT_STATUS_COLORS }) {
  return (
    <div className="kpi-table-wrap">
      <div className="kpi-card-header">
        <div className="kpi-header-col kpi-header-col-1">KPIs</div>
        <div className="kpi-header-col kpi-header-col-2">Real-Time Value</div>
        <div className="kpi-header-col kpi-header-col-3">Criteria</div>
        {trendRenderer && <div className="kpi-header-col kpi-header-col-4">Trend</div>}
        <div className="kpi-table-legend">
          {Object.keys(STATUS_LABELS).map((k) => (
            <span key={k} className="kpi-legend-item">
              <span className="kpi-legend-dot" style={{ background: statusColors[k] }} />
              {STATUS_LABELS[k]}
            </span>
          ))}
        </div>
      </div>
      <table className="kpi-status-tbl">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td style={{ color: statusColors[r.status] }} className="kpi-tooltip" data-tooltip={r.fullName || r.name}>
                <span className="kpi-legend-dot" style={{ background: statusColors[r.status] }} />
                {r.icon && <span className="kpi-row-icon">{r.icon}</span>}
                {r.name}
              </td>
              <td style={{ color: statusColors[r.status] }}>{r.value}</td>
              <td>{r.criteria}</td>
              {trendRenderer && <td>{trendRenderer(r, statusColors[r.status])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
