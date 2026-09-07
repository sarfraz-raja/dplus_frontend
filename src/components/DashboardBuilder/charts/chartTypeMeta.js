import {
  Hash, Gauge, LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon,
  BarChartHorizontal, AreaChart as AreaChartIcon, Grid3x3, Funnel, BarChart4, Boxes,
  ChartNoAxesCombined, ScatterChart as ScatterChartIcon, Table as TableIcon,
} from 'lucide-react';

// Icon + accent color per real backend chart_type — one source of truth shared by
// ChartLibrary.jsx (chart-type picker) and DashboardCanvasEditor.jsx (the "Your Charts"
// palette list), so both show the same visual language for a given chart_type.
// `description` — shown as the picker button's hover tooltip (see ChartLibrary.jsx's
// Visualization Type grid) so the chart's intended use case is visible at the moment someone's
// choosing between them, not discovered later by trial and error against the wrong kind of
// column. Framed as "best for X" rather than restating what the shape looks like — the icon
// already shows the shape, the tooltip's job is the *when*, not the *what*.
const CHART_TYPE_META = {
  LINE: { icon: LineChartIcon, color: '#8B5CF6', label: 'Line', description: 'Best for a trend over time — every point plotted at its real position along a continuous timeline.' },
  BAR: { icon: BarChart3, color: '#EC4899', label: 'Bar', description: 'Best for comparing values across categories, or a trend over time (same continuous-timeline behavior as Line).' },
  PIE: { icon: PieChartIcon, color: '#F97316', label: 'Pie', description: 'Best for showing how a few categories split up a whole (parts of 100%) — not for more than ~6-8 slices.' },
  AREA: { icon: AreaChartIcon, color: '#6366F1', label: 'Area', description: 'Best for a trend over time where the filled volume under the line matters, not just its shape.' },
  KPI_CARD: { icon: Hash, color: '#378ADD', label: 'KPI Card', description: 'Best for one headline number — a single metric, optionally compared against a prior period.' },
  TABLE: { icon: TableIcon, color: '#F59E0B', label: 'Table', description: 'Best when the exact values matter more than a visual pattern, or many columns need to sit side by side.' },
  GAUGE: { icon: Gauge, color: '#10B981', label: 'Gauge', description: 'Best for one number read against a fixed target or threshold range, not a trend.' },
  HEAT_MAP: { icon: Grid3x3, color: '#DB2777', label: 'Heat Map', description: 'Best for spotting intensity patterns across a dense grid — color says more than exact numbers here.' },
  SCATTER: { icon: ScatterChartIcon, color: '#2563EB', label: 'Scatter', description: 'Best for finding a relationship or correlation between two raw numeric measures, point by point.' },
  HORIZONTAL_BAR: { icon: BarChartHorizontal, color: '#14B8A6', label: 'Horizontal Bar', description: 'Best for a ranked "Top N" leaderboard — sorted by value, not a chronological trend, even if the category is a date.' },
  STACKED_BAR: { icon: BarChart4, color: '#D97706', label: 'Stacked Bar', description: 'Best for comparing category totals while also showing what sub-groups make each one up.' },
  FUNNEL: { icon: Funnel, color: '#0D9488', label: 'Funnel', description: 'Best for a sequential process where each stage narrows from the one before it (e.g. signup → activation → purchase).' },
  WATERFALL: { icon: ChartNoAxesCombined, color: '#059669', label: 'Waterfall', description: 'Best for showing how a series of gains/losses add up to a final total, step by step.' },
  TREEMAP: { icon: Boxes, color: '#7C3AED', label: 'Treemap', description: 'Best for many categories at once, sized by value — fits far more categories legibly than a Pie chart can.' },
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
