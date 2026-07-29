import {
  Hash, Gauge, LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon,
  BarChartHorizontal, AreaChart as AreaChartIcon, Grid3x3, Funnel, BarChart4, Boxes,
  ChartNoAxesCombined, ScatterChart as ScatterChartIcon, Table as TableIcon,
} from 'lucide-react';

// Icon + accent color per real backend chart_type — one source of truth shared by
// ChartLibrary.jsx (chart-type picker) and DashboardCanvasEditor.jsx (the "Your Charts"
// palette list), so both show the same visual language for a given chart_type.
const CHART_TYPE_META = {
  LINE: { icon: LineChartIcon, color: '#8B5CF6', label: 'Line' },
  BAR: { icon: BarChart3, color: '#EC4899', label: 'Bar' },
  PIE: { icon: PieChartIcon, color: '#F97316', label: 'Pie' },
  AREA: { icon: AreaChartIcon, color: '#6366F1', label: 'Area' },
  KPI_CARD: { icon: Hash, color: '#378ADD', label: 'KPI Card' },
  TABLE: { icon: TableIcon, color: '#F59E0B', label: 'Table' },
  GAUGE: { icon: Gauge, color: '#10B981', label: 'Gauge' },
  HEAT_MAP: { icon: Grid3x3, color: '#DB2777', label: 'Heat Map' },
  SCATTER: { icon: ScatterChartIcon, color: '#2563EB', label: 'Scatter' },
  HORIZONTAL_BAR: { icon: BarChartHorizontal, color: '#14B8A6', label: 'Horizontal Bar' },
  STACKED_BAR: { icon: BarChart4, color: '#D97706', label: 'Stacked Bar' },
  FUNNEL: { icon: Funnel, color: '#0D9488', label: 'Funnel' },
  WATERFALL: { icon: ChartNoAxesCombined, color: '#059669', label: 'Waterfall' },
  TREEMAP: { icon: Boxes, color: '#7C3AED', label: 'Treemap' },
};

export const CHART_TYPES = Object.keys(CHART_TYPE_META);

// Maps a widgetTypeRegistry.js mock-widget-type key to its equivalent real backend
// chart_type — used by WidgetCreateWizard.jsx when the user picks a real datasource for a
// widget added via the palette, so it can be created as a real Chart Library widget
// (createWidget) instead of a mock one, reusing the exact same 'chartLibrary' rendering
// path everywhere else in this app already uses for real data.
export const MOCK_TYPE_TO_CHART_TYPE = {
  statCard: 'KPI_CARD',
  gaugeCard: 'GAUGE',
  sparklineCard: 'LINE',
  barChart: 'BAR',
  horizontalBarChart: 'HORIZONTAL_BAR',
  areaChart: 'AREA',
  heatmapChart: 'HEAT_MAP',
  pieChart: 'PIE',
  funnelChart: 'FUNNEL',
  waterfallChart: 'WATERFALL',
  treemapChart: 'TREEMAP',
  scatterChart: 'SCATTER',
  stackedBarChart: 'STACKED_BAR',
  kpiTable: 'TABLE',
};

export default CHART_TYPE_META;
