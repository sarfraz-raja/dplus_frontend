import React from 'react';

/**
 * Small "worst N cells" table — extracted out of KpiMonitoringDashboard so it can be
 * registered as its own widget type in the Dashboard Builder grid.
 */
export default function DegradedCellsTable({ rows = [] }) {
  return (
    <table className="kpi-cells-tbl">
      <thead>
        <tr><th>Cell ID</th><th>KPI Impacted</th><th>Δ</th></tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.cellId}>
            <td>{c.cellId}</td>
            <td className={`kpi-cells-delta ${c.delta.startsWith('+') ? 'up' : 'down'}`}>{c.delta}</td>
            <td>{c.kpi}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
