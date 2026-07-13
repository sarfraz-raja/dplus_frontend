import { Hash, Gauge, Activity, Table, AlertTriangle, MapPin } from 'lucide-react';
import StatCard from '../Charts/StatCard';
import GaugeCard from '../Charts/GaugeCard';
import SparklineCard from '../Charts/SparklineCard';
import KpiTable from '../Charts/KpiTable';
import DegradedCellsMap from '../Charts/DegradedCellsMap';
import DegradedCellsTable from './KpiDashboard/DegradedCellsTable';

/**
 * Catalog of widget types available in the Dashboard Builder palette.
 * `dataShape` must match a mockDataSources entry's `dataShape` for the
 * data-source picker to offer compatible sources for a given widget
 * (widgets bound to a `kpiLive` data source ignore this — see DashboardCanvasEditor).
 */
// w values are in grid-column units — GRID_CONFIG.cols is 144 (12 visual columns × 12,
// see DashboardCanvasEditor.jsx), so these are the old 12-col widths ×12.
const WIDGET_REGISTRY = {
  statCard: { label: 'Stat Card', icon: Hash, component: StatCard, defaultSize: { w: 36, h: 2 }, dataShape: 'single-value' },
  gaugeCard: { label: 'Gauge', icon: Gauge, component: GaugeCard, defaultSize: { w: 36, h: 3 }, dataShape: 'gauge' },
  sparklineCard: { label: 'Sparkline Chart', icon: Activity, component: SparklineCard, defaultSize: { w: 48, h: 3 }, dataShape: 'series' },
  kpiTable: { label: 'KPI Table', icon: Table, component: KpiTable, defaultSize: { w: 72, h: 5 }, dataShape: 'table' },
  degradedCellsTable: { label: 'Top Degraded Cells', icon: AlertTriangle, component: DegradedCellsTable, defaultSize: { w: 72, h: 5 }, dataShape: 'table' },
  degradedCellsMap: { label: 'Degraded Cells Map', icon: MapPin, component: DegradedCellsMap, defaultSize: { w: 72, h: 40 }, dataShape: 'table' },
};

export default WIDGET_REGISTRY;
