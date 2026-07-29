/**
 * Default grid layout/widgets for the 5G KPI Monitoring Dashboard, rendered through
 * DashboardCanvasEditor. Every widget's dataSource points at a path inside the `kpi`
 * object built by `mapLiveDataToKpi` (see KpiMonitoringDashboard.jsx) via the
 * `kpiLive` data-source type — resolved live, not stored in this preset.
 */

const live = (field) => ({ type: 'kpiLive', field });

// x/y/w/h are in grid-column/row units (GRID_CONFIG.cols:144, rowHeight:5+margin:1, see
// DashboardCanvasEditor.jsx). This is a hand-tuned arrangement — captured directly from
// localStorage after manual drag/resize in "Resize widgets" mode and baked in here as the
// new permanent default, so "Reset layout" restores *this*, not the old generated grid.
export const KPI_DASHBOARD_LAYOUT = [
  { i: 'stat-0', x: 0, y: 0, w: 24, h: 14 },
  { i: 'stat-1', x: 24, y: 0, w: 24, h: 14 },
  { i: 'stat-2', x: 48, y: 0, w: 24, h: 14 },
  { i: 'stat-3', x: 72, y: 0, w: 24, h: 14 },
  { i: 'stat-4', x: 96, y: 0, w: 24, h: 14 },
  { i: 'stat-5', x: 120, y: 0, w: 24, h: 14 },
  { i: 'gauge-0', x: 0, y: 14, w: 27, h: 36 },
  { i: 'spark-0', x: 27, y: 14, w: 29, h: 36 },
  { i: 'spark-1', x: 56, y: 14, w: 29, h: 36 },
  { i: 'spark-2', x: 85, y: 14, w: 30, h: 36 },
  // 'spark-3': { type: 'sparklineCard', title: 'Voice DR (%)', dataSource: live('sparklines.3') },
  { i: 'spark-4', x: 115, y: 14, w: 29, h: 36 },
  { i: 'kpiTable-0', x: 0, y: 50, w: 96, h: 99 },
  { i: 'degraded-0', x: 96, y: 50, w: 48, h: 99 },
  { i: 'degraded-map-0', x: 0, y: 149, w: 144, h: 88 },
];

export const KPI_DASHBOARD_WIDGETS = {
  'stat-0': { type: 'statCard', title: 'Availability', dataSource: live('stats.0') },
  'stat-1': { type: 'statCard', title: 'Data Volume', dataSource: live('stats.1') },
  'stat-2': { type: 'statCard', title: 'Voice Traffic', dataSource: live('stats.2') },
  'stat-3': { type: 'statCard', title: 'Data SR', dataSource: live('stats.3') },
  'stat-4': { type: 'statCard', title: 'Voice DR', dataSource: live('stats.4') },
  'stat-5': { type: 'statCard', title: 'Voice SR', dataSource: live('stats.5') },
  'gauge-0': { type: 'gaugeCard', title: 'Availability (%)', dataSource: live('gauge') },
  'spark-0': { type: 'sparklineCard', title: 'Data Volume (MB)', dataSource: live('sparklines.0') },
  'spark-1': { type: 'sparklineCard', title: 'Voice Traffic', dataSource: live('sparklines.1') },
  'spark-2': { type: 'sparklineCard', title: 'Data SR (%)', dataSource: live('sparklines.2') },
  // 'spark-3': { type: 'sparklineCard', title: 'Voice DR (%)', dataSource: live('sparklines.3') },
  'spark-4': { type: 'sparklineCard', title: 'Voice SR (%)', dataSource: live('sparklines.4') },
  'degraded-map-0': { type: 'degradedCellsMap', title: 'Degraded Cells Map', dataSource: live('degradedCells') },
  'degraded-0': { type: 'degradedCellsTable', title: 'Top Degraded Cells', dataSource: live('degradedCells') },
  'kpiTable-0': { type: 'kpiTable', title: 'KPIs', dataSource: live('kpiTableProps') },

};
