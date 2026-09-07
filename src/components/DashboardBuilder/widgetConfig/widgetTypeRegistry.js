import {
  Hash, Gauge, LineChart, BarChart3, PieChart as PieChartIcon, BarChartHorizontal,
  AreaChart as AreaChartIcon, Grid3x3, Funnel, BarChart4, Boxes, ChartNoAxesCombined,
  ScatterChart as ScatterChartIcon, Table, AlertTriangle, MapPin, Server, ListFilter,
} from 'lucide-react';
import { FONT_FAMILY_OPTIONS } from '../../../theme/tokens';
import { POSITION_OPTIONS } from '../../Widgets/titlePositions';
import ChartLibraryWidgetView from '../charts/ChartLibraryWidgetView';
import SlicerWidgetCard from '../filters/SlicerWidgetCard';
import StatCard from '../../Widgets/StatCard';
import GaugeCard from '../../Widgets/GaugeCard';
import LineAreaChart from '../../Widgets/LineAreaChart';
import BarChart from '../../Widgets/BarChart';
import PieChart from '../../Widgets/PieChart';
import HorizontalBarChart from '../../Widgets/HorizontalBarChart';
import AreaChart from '../../Widgets/AreaChart';
import HeatmapChart from '../legacy/widgets/HeatmapChart';
import FunnelChart from '../../Widgets/FunnelChart';
import WaterfallChart from '../../Widgets/WaterfallChart';
import TreemapChart from '../../Widgets/TreemapChart';
import ScatterChart from '../../Widgets/ScatterChart';
import StackedBarChart from '../../Widgets/StackedBarChart';
import KpiTable from '../legacy/widgets/KpiTable';
import DegradedCellsMap from '../legacy/widgets/DegradedCellsMap';
import DegradedCellsTable from '../legacy/KpiDashboard/DegradedCellsTable';

/**
 * Catalog of widget *types* available in the Dashboard Builder palette. Each entry
 * describes one type, not one placed widget instance.
 *
 * `dataShape` must match a mockDataSources entry's `dataShape` for the data-source
 * picker to offer compatible sources for a given widget (widgets bound to a `kpiLive`
 * data source ignore this — see DashboardCanvasEditor). `dataShape` is coarse and
 * advisory-only — e.g. kpiTable/degradedCellsTable/degradedCellsMap all share
 * `dataShape: 'table'` despite expecting different row shapes (this exact mismatch
 * caused a crash — see DegradedCellsTable.jsx). Anything requiring an exact
 * compatibility guarantee (which component renders, `styleFields` below, expected row
 * fields) must key off `type` (this object's own keys), never off `dataShape`.
 *
 * `builderVisible: false` hides a type from the "add widget" palette while keeping
 * its type→component mapping intact for rendering (needed by the KPI dashboard's own
 * grid, which references these types via `kpiLive` data sources). Use this for widgets
 * whose row shape is specific to one dashboard's data (e.g. DegradedCellsTable/Map expect
 * `{cellId, delta, kpi, latitude, longitude}`, not generic mock "table" rows) — until a
 * truly generic table/map widget exists, offering them in the generic palette lets users
 * pair them with mismatched mock data and crash. See DashboardCanvasEditor.jsx's palette render.
 *
 * `styleFields`: declarative list of the style controls this type exposes in the
 * Builder's widget-style panel (see WidgetStyleFields, added in a later phase) —
 * `{ key, label, type: 'color'|'select'|'number', options?, default }`. Omitted or
 * empty for types with no user-customizable style (e.g. degradedCellsMap, which manages
 * its own basemap style picker internally).
 *
 * `iconColor`: accent tint for this type's palette button (DashboardCanvasEditor.jsx's
 * `.dbe-palette-icon`) — a second (color) cue on top of the icon's (shape) cue, closer to
 * how Power BI's "Get more visuals" grid uses distinct colored glyphs per chart type.
 *
 * `defaultDataSourceKey`: overrides which mockDataSources entry `addWidget` binds on
 * creation. Without it, the default is just the first entry matching this type's
 * `dataShape` (declaration order in mockDataSources.js) — fine for types that can render
 * any generic series, but wrong for ones needing a specifically-shaped default (Funnel
 * needs monotonic stages, Waterfall needs signed deltas) — set explicitly there instead
 * of relying on dataShape's coarse, order-dependent guess.
 */
const FONT_WEIGHT_FIELD_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
];

/**
 * Generates a `{ color, weight?, size? }` field group for one named text "role" — title,
 * row, value, axis, etc. One shared shape (color always; weight/size opt-in per role)
 * instead of hand-writing near-identical field arrays per role. Key names are passed in
 * explicitly (not derived from `role`/`label`) so existing widget-component prop names
 * stay exactly as they already are — this is a pure DRY-up of the *declarations*, not a
 * rename of anything already wired through resolveWidgetProps/the widget components.
 */
function textStyleFields({ colorKey, colorLabel, weightKey, weightLabel, sizeKey, sizeLabel, sizeDefault = null, fontKey, fontLabel }) {
  const fields = [{ key: colorKey, label: colorLabel, type: 'color', default: null }];
  if (weightKey) {
    fields.push({ key: weightKey, label: weightLabel, type: 'select', options: FONT_WEIGHT_FIELD_OPTIONS, default: 'normal' });
  }
  if (sizeKey) {
    fields.push({ key: sizeKey, label: sizeLabel, type: 'number', min: 8, max: 48, default: sizeDefault });
  }
  if (fontKey) {
    fields.push({ key: fontKey, label: fontLabel, type: 'select', options: FONT_FAMILY_OPTIONS, default: '' });
  }
  return fields;
}

// Row-text style fields shared by table-shaped widgets (kpiTable, degradedCellsTable) —
// same three controls the KPI dashboard's own "Row Text" customize-colors group exposes.
// rowFontSize is a raw px number (not a sm/md/lg preset) for precise control.
const ROW_TEXT_STYLE_FIELDS = textStyleFields({
  colorKey: 'rowTextColor', colorLabel: 'Row text color',
  weightKey: 'rowFontWeight', weightLabel: 'Row font weight',
  sizeKey: 'rowFontSize', sizeLabel: 'Row font size (px)', sizeDefault: 14,
});

// Background override — every widget component accepts `bgColor` and applies it as an
// opt-in inline-style override on its own card (undefined/unset falls back to its normal
// Tailwind default, e.g. bg-white dark:bg-[#22273C]). Every type gets this field.
const BG_COLOR_FIELD = { key: 'bgColor', label: 'Background color', type: 'color', default: null };

// Single accent/data color for a chartLibrary chart_type that only ever renders one series
// (Bar/Area/Line/Scatter/Horizontal Bar have exactly one fill/stroke color, unlike Pie/
// Stacked Bar/Funnel/Treemap which cycle through a palette per-category instead — see
// CHART_TYPE_EXTRA_STYLE_FIELDS below). `default: null` (not a hex) matches every other
// color field's convention — the underlying Widgets/*.jsx component's own prop default
// (`#378ADD`) is what actually renders when unset, this just lets it be overridden.
const ACCENT_COLOR_FIELD = { key: 'color', label: 'Accent color', type: 'color', default: null };

// Two-stop background gradient (Item 9) — generalizes StatCard's own pre-existing
// darkGradient/shadeFrom/shadeTo concept to every widget type, cascading from the theme/
// dashboard level the same way bgColor already does. Mutually exclusive with bgColor at
// render time (every widget component checks bgGradient first) — set either, not both.
const BG_GRADIENT_FIELDS = [
  { key: 'bgGradientFrom', label: 'Background gradient from', type: 'color', default: null },
  { key: 'bgGradientTo', label: 'Background gradient to', type: 'color', default: null },
];

// Title/label color+weight+size+font — every chartLibrary chart_type has a title (the chart's
// own `name`, rendered as `label`/`title` by whichever Widgets/*.jsx component it maps to).
// `chartLibraryStyleFieldsFor` below previously only ever exposed a bare `titleColor` field
// (no weight/size/font), unlike every legacy mock widget type — see WIDGET_TYPE_REGISTRY's
// own per-type styleFields — which already gets the full set via this exact helper. That
// meant a real chart's title could never actually be resized/bolded/re-fonted at all, even
// though every Widgets/*.jsx component itself already accepts titleWeight/titleSize/
// titleFont props (DashboardCanvasEditor.jsx's resolveWidgetProps already computes and
// passes finalTitleWeight/finalTitleSize/finalTitleFont through) — the UI to set them per-
// chart was simply missing.
const TITLE_TEXT_STYLE_FIELDS = textStyleFields({
  colorKey: 'titleColor', colorLabel: 'Title color',
  weightKey: 'titleWeight', weightLabel: 'Title weight',
  sizeKey: 'titleSize', sizeLabel: 'Title size (px)',
  fontKey: 'titleFont', fontLabel: 'Title font',
});
// Where in the widget's 3x3 layout the title sits — universal (every widget renders its
// title as plain HTML outside the chart canvas, see TitleValueOverlay.jsx), unlike
// VALUE_POSITION_FIELD below which only applies to the few widgets with a movable value.
const TITLE_POSITION_FIELD = { key: 'titlePosition', label: 'Title position', type: 'position', default: 'top-left', options: POSITION_OPTIONS };
TITLE_TEXT_STYLE_FIELDS.push(TITLE_POSITION_FIELD);
// Not part of any shared bundle — only added directly to the handful of widget types that
// actually have a separate, movable value/total text element (see VALUE_TEXT_STYLE_FIELDS'
// own comment below for why: that bundle is reused by types with NO such element, e.g. Pie's
// values live inside ECharts' own series.label, not a plain HTML node this can reposition).
const VALUE_POSITION_FIELD = { key: 'valuePosition', label: 'Value position', type: 'position', default: 'top-right', options: POSITION_OPTIONS };

// Value-text color/size — for widgets with one obvious "the number/label the chart is
// actually showing" element (a stat's big number, a gauge's center %, a sparkline's
// latest-value readout, a pie/funnel/treemap's slice/segment labels). Not added to widgets
// with no single such element (heatmap's cells are color-only, waterfall/scatter/stacked-bar
// don't display inline value text) — kpiTable/degradedCellsTable already have the equivalent
// via ROW_TEXT_STYLE_FIELDS.
const VALUE_TEXT_STYLE_FIELDS = textStyleFields({
  colorKey: 'valueTextColor', colorLabel: 'Value text color',
  sizeKey: 'valueTextSize', sizeLabel: 'Value text size (px)',
});

// Rounds every displayed value (KPI Card's big number, a gauge's %, tooltip values, bar/pie/
// funnel/waterfall value labels) to this many decimal places — defaults to 2 rather than
// showing whatever raw float the backend's AVG/SUM aggregation happens to produce.
const VALUE_DECIMALS_FIELD = { key: 'valueDecimals', label: 'Decimal places', type: 'number', min: 0, max: 4, default: 2 };
VALUE_TEXT_STYLE_FIELDS.push(VALUE_DECIMALS_FIELD);

// Axis text color/weight/size/font — for widgets with a visible category/value axis.
const AXIS_TEXT_STYLE_FIELDS = textStyleFields({
  colorKey: 'axisTextColor', colorLabel: 'Axis text color',
  weightKey: 'axisTextWeight', weightLabel: 'Axis text weight',
  sizeKey: 'axisTextSize', sizeLabel: 'Axis text size (px)',
  fontKey: 'axisTextFont', fontLabel: 'Axis text font',
});

// w values are in grid-column units — GRID_CONFIG.cols is 144 (12 visual columns × 12,
// see DashboardCanvasEditor.jsx), so these are the old 12-col widths ×12.
// h values are in grid-row units — GRID_CONFIG.rowHeight:5/margin[1]:1, so pixelHeight =
// h*5 + (h-1)*1. Calibrated against the KPI dashboard's own hand-dragged, real-world-good
// layout (kpiDashboardPreset.js, captured under this exact same grid config) — e.g. its
// gauge/sparkline cards use h:36 (→215px). Every h below is picked to land in the same
// realistic range for that widget's actual content (title + legend/axis + chart body), not
// arbitrary small numbers — a mismatch here previously shipped every new widget type at a
// tiny, barely-visible height on add.
const WIDGET_TYPE_REGISTRY = {
  statCard: {
    label: 'KPI Card', icon: Hash, iconColor: '#378ADD', component: StatCard, defaultSize: { w: 36, h: 18 }, dataShape: 'single-value',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      // Same "Shaded Cards" mechanism as the real KPI dashboard's own "Customize colors"
      // panel (KpiMonitoringDashboard.jsx) — the user picks the diagonal gradient's two
      // literal corners directly (top-left "from", bottom-right "to") instead of a
      // computed shade, so it can match the dashboard's hand-picked look exactly.
      { key: 'shadeFrom', label: 'Shade from (top-left)', type: 'color', default: null },
      { key: 'shadeTo', label: 'Shade to (bottom-right)', type: 'color', default: null },
      // Own value-text fields (not the shared VALUE_TEXT_STYLE_FIELDS) so the size field's
      // `default` can be StatCard's real rendered size (20px, Tailwind's text-xl) instead
      // of null — with a null default the number input starts empty, and browsers jump an
      // empty spinner to its `min` (8) on the first click rather than the real current
      // size, so "increasing" the size from Auto visibly shrank the text first.
      BG_COLOR_FIELD, ...textStyleFields({
        colorKey: 'valueTextColor', colorLabel: 'Value text color',
        sizeKey: 'valueTextSize', sizeLabel: 'Value text size (px)', sizeDefault: 25,
      }), VALUE_DECIMALS_FIELD, VALUE_POSITION_FIELD,
      // Free-text suffix appended after the value (e.g. "%", "MB", "ms") — no fixed unit
      // list since a stat card's value can be anything, unlike gauge's always-% readout.
      { key: 'unit', label: 'Unit', type: 'text', default: '', placeholder: 'e.g. %, MB, ms' },
    ],
  },
  gaugeCard: {
    label: 'Gauge', icon: Gauge, iconColor: '#10B981', component: GaugeCard, defaultSize: { w: 36, h: 36 }, dataShape: 'gauge',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS,
    ],
  },
  sparklineCard: {
    label: 'Line', icon: LineChart, iconColor: '#8B5CF6', component: LineAreaChart, defaultSize: { w: 48, h: 36 }, dataShape: 'series',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS, VALUE_POSITION_FIELD, ...AXIS_TEXT_STYLE_FIELDS,
    ],
  },
  barChart: {
    label: 'Bar', icon: BarChart3, iconColor: '#EC4899', component: BarChart, defaultSize: { w: 48, h: 36 }, dataShape: 'series',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS, VALUE_POSITION_FIELD, ...AXIS_TEXT_STYLE_FIELDS,
    ],
  },
  horizontalBarChart: {
    label: 'Horizontal Bar', icon: BarChartHorizontal, iconColor: '#14B8A6', component: HorizontalBarChart, defaultSize: { w: 48, h: 45 }, dataShape: 'series',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      { key: 'limit', label: 'Rows shown', type: 'number', min: 3, max: 20, default: 8 },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS, ...AXIS_TEXT_STYLE_FIELDS,
    ],
  },
  areaChart: {
    label: 'Area', icon: AreaChartIcon, iconColor: '#6366F1', component: AreaChart, defaultSize: { w: 48, h: 36 }, dataShape: 'series',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS, VALUE_POSITION_FIELD, ...AXIS_TEXT_STYLE_FIELDS,
    ],
  },
  // Its own dataShape ('heatmap', not 'series') — a 2D day/hour grid is genuinely a
  // different row shape than every other chart widget here, not just advisory reuse.
  // No value-text fields — a heatmap's cells communicate value through color, not text.
  heatmapChart: {
    label: 'Heatmap', icon: Grid3x3, iconColor: '#DB2777', component: HeatmapChart, defaultSize: { w: 72, h: 55 }, dataShape: 'heatmap',
    styleFields: [
      { key: 'color', label: 'Heat color', type: 'color', default: '#EC4899' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...AXIS_TEXT_STYLE_FIELDS, VALUE_DECIMALS_FIELD,
    ],
  },
  // No accent-color field — a pie has one color per slice (drawn from the shared theme's
  // palette, see theme/echartsTheme.js), not a single per-widget accent.
  pieChart: {
    label: 'Pie', icon: PieChartIcon, iconColor: '#F97316', component: PieChart, defaultSize: { w: 56, h: 60 }, dataShape: 'series',
    styleFields: [
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      {
        key: 'donut', label: 'Style', type: 'select', default: 'pie',
        options: [{ value: 'pie', label: 'Pie' }, { value: 'donut', label: 'Donut' }],
      },
      {
        key: 'showValueLabels', label: 'Value labels', type: 'select', default: 'show',
        options: [{ value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide' }],
      },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS,
    ],
  },
  // No accent-color field — each funnel stage gets its own theme-palette color, like pie.
  funnelChart: {
    label: 'Funnel', icon: Funnel, iconColor: '#0D9488', component: FunnelChart, defaultSize: { w: 36, h: 40 }, dataShape: 'series',
    defaultDataSourceKey: 'callSetupFunnel',
    styleFields: [
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS,
    ],
  },
  // Uses `data`'s own signed values to color each bar up/down — no single accent color;
  // instead exposes both directional colors as separate style fields. No value-text fields
  // — bar values only show in the tooltip, not as inline chart text.
  waterfallChart: {
    label: 'Waterfall', icon: ChartNoAxesCombined, iconColor: '#059669', component: WaterfallChart, defaultSize: { w: 48, h: 40 }, dataShape: 'series',
    defaultDataSourceKey: 'kpiWaterfallDeltas',
    styleFields: [
      { key: 'upColor', label: 'Increase color', type: 'color', default: '#10B981' },
      { key: 'downColor', label: 'Decrease color', type: 'color', default: '#EF4444' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...AXIS_TEXT_STYLE_FIELDS, VALUE_DECIMALS_FIELD,
    ],
  },
  // No accent-color field — each rectangle gets its own theme-palette color, like pie.
  treemapChart: {
    label: 'Treemap', icon: Boxes, iconColor: '#7C3AED', component: TreemapChart, defaultSize: { w: 48, h: 50 }, dataShape: 'series',
    defaultDataSourceKey: 'trafficByRegion',
    styleFields: [
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS,
    ],
  },
  // Its own dataShape ('xy', not 'series') — paired (x,y) points are a genuinely different
  // row shape than every other chart widget here, not just advisory reuse. No value-text
  // fields — points don't display inline value labels, only in the tooltip.
  scatterChart: {
    label: 'Scatter', icon: ScatterChartIcon, iconColor: '#2563EB', component: ScatterChart, defaultSize: { w: 48, h: 40 }, dataShape: 'xy',
    styleFields: [
      { key: 'color', label: 'Point color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...AXIS_TEXT_STYLE_FIELDS, VALUE_DECIMALS_FIELD,
    ],
  },
  // Its own dataShape ('multiSeries', not 'series') — categories x multiple named series
  // is a genuinely different row shape than every other chart widget here. No single
  // accent color — each series gets its own theme-palette color, like pie. No value-text
  // fields — bars have no inline value labels, only tooltip + legend.
  stackedBarChart: {
    label: 'Stacked Bar', icon: BarChart4, iconColor: '#D97706', component: StackedBarChart, defaultSize: { w: 60, h: 45 }, dataShape: 'multiSeries',
    styleFields: [
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...AXIS_TEXT_STYLE_FIELDS, VALUE_DECIMALS_FIELD,
    ],
  },
  // No accent-color field — KpiTable colors each row by KPI status (ok/warn/crit), not a
  // single per-widget accent, so only row-text styling applies here.
  kpiTable: {
    label: 'KPI Table', icon: Table, iconColor: '#F59E0B', component: KpiTable, defaultSize: { w: 72, h: 60 }, dataShape: 'table',
    styleFields: [...ROW_TEXT_STYLE_FIELDS, BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS],
  },
  // Interactive filter widget (Power BI/Superset "slicer" pattern) — backed by its own
  // standalone `/dashboard-builder/slicers` resource, not a mock data source, so it's
  // created via a dedicated datasource/column picker (DashboardCanvasEditor's
  // addSlicerWidget) rather than the generic WidgetCreateWizard every other type here
  // goes through. No styleFields yet — its look is fixed (label + dropdown), not
  // per-placement customizable like a chart's title/axis/background.
  slicer: {
    label: 'Slicer', icon: ListFilter, iconColor: '#0891B2', component: SlicerWidgetCard, defaultSize: { w: 36, h: 16 }, dataShape: null,
  },
  degradedCellsTable: {
    label: 'Top Degraded Cells', icon: AlertTriangle, iconColor: '#EF4444', component: DegradedCellsTable, defaultSize: { w: 72, h: 60 }, dataShape: 'table', builderVisible: false,
    styleFields: ROW_TEXT_STYLE_FIELDS,
  },
  // No styleFields — DegradedCellsMap manages its own basemap style picker internally,
  // nothing here for a generic style panel to control.
  degradedCellsMap: { label: 'Degraded Cells Map', icon: MapPin, iconColor: '#0EA5E9', component: DegradedCellsMap, defaultSize: { w: 72, h: 40 }, dataShape: 'table', builderVisible: false },
  // Bound to a real, backend-persisted Chart Library widget (see ChartLibrary.jsx) rather
  // than a mock data source — its side panel (DashboardCanvasEditor.jsx) shows a read-only
  // chart summary + "Edit chart" link instead of a Source type toggle, since the chart's
  // own definition (chart_type/mapping/datasource) is a shared object edited once in the
  // Charts tab, not per-placement here. No dataShape (doesn't use MOCK_DATA_SOURCES).
  // Not offered as its own palette icon (builderVisible: false) — superseded by the
  // dedicated "Your Charts" list in DashboardCanvasEditor.jsx's palette, which places a
  // widget of this exact type already fully bound (datasource+mapping set), skipping the
  // empty-placeholder-then-pick-from-dropdown step this icon used to require. The type's
  // component/rendering stays wired here since placed instances still render through it.
  //
  // styleFields ARE per-placement (unlike chart_type/mapping) — a generic set covering
  // most chart shapes (title/background/axis/value text), applied as a visual overlay on
  // top of the shared chart's own render (see renderChartWidget.jsx). Not every field
  // applies to every chart_type (e.g. axis text does nothing on a KPI_CARD/TABLE), same
  // "some fields are no-ops for some types" tradeoff every mock widget type already has.
  chartLibrary: {
    label: 'Real Widget', icon: Server, iconColor: '#0EA5E9', component: ChartLibraryWidgetView, defaultSize: { w: 48, h: 40 }, dataShape: null, builderVisible: false,
    styleFields: [
      ...TITLE_TEXT_STYLE_FIELDS,
      BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS, ...VALUE_TEXT_STYLE_FIELDS, ...AXIS_TEXT_STYLE_FIELDS,
    ],
  },
};

export default WIDGET_TYPE_REGISTRY;

/**
 * Merges a widget instance's stored `style` values with its type's `styleFields`
 * defaults — every field the type declares is guaranteed present in the result
 * (using the field's `default` when the instance hasn't set/overridden it).
 */
export function resolveWidgetStyle(type, style, extraFields = []) {
  const fields = [...(WIDGET_TYPE_REGISTRY[type]?.styleFields || []), ...extraFields];
  const result = {};
  for (const field of fields) {
    const v = style?.[field.key];
    result[field.key] = v !== undefined && v !== null && v !== '' ? v : field.default;
  }
  return result;
}

// Extra style fields for 'chartLibrary' widgets, keyed by the real backend chart_type
// (not by mock registry type — a chartLibrary widget's actual visual shape depends on
// which chart_type it's bound to, unlike every other widget here where type IS the shape).
// Merged with chartLibrary's own generic styleFields (title/bg/axis/value) in
// DashboardCanvasEditor.jsx's side panel — same field-descriptor shape WidgetStyleFields
// already knows how to render, just computed per-instance instead of per-type.
// Opt-in cross-filter toggles (first cut: BAR/PIE/LINE/AREA only) — clicking a data point on
// a "source" widget filters every "target" widget sharing the clicked column + datasourceId.
// Deliberately opt-in per widget rather than automatic: matching is just column-name equality
// with no declared relationships between datasources, so an automatic "any shared column name"
// rule risks false-positive filters between widgets that only coincidentally share a column
// name. See DashboardCanvasEditor.jsx's cross-filter click handler for how these are read.
const CROSS_FILTER_FIELDS = [
  { key: 'crossFilterSource', label: 'Cross-filter source', type: 'select', default: 'off', options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }] },
  { key: 'crossFilterTarget', label: 'Cross-filter target', type: 'select', default: 'off', options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }] },
];

// Per-category/per-series color scheme — a preset picker (4 curated palettes) plus a fully
// custom swatch editor (add/remove/recolor), reusing the exact same PaletteEditor already
// built for ThemeManager.jsx's Theme editor and DashboardCanvasEditor.jsx's dashboard-level
// override. This is one level more specific than either of those: a per-chart palette lets
// one widget's series colors diverge from the dashboard's own theme, same override precedence
// as every other style field here (widget style > dashboard theme > CHART_PALETTE default —
// see DashboardCanvasEditor.jsx's `finalPalette` resolution). `default: undefined` (not
// CHART_PALETTE) is deliberate — an explicit default here would make every chart look
// "overridden" even when nobody touched it, and would freeze in today's default forever
// instead of following the dashboard theme if that changes later.
const PALETTE_FIELD = { key: 'palette', label: 'Series colors', type: 'palette' };
// LINE-only — dots are drawn only by LineAreaChart.jsx, not the BAR/AREA/HORIZONTAL_BAR
// components BAR_SERIES is also shared with. Exported so DashboardCanvasEditor.jsx's own
// extraFields computation (which has to mirror chartLibraryStyleFieldsFor's hasSeries branch
// field-for-field, or resolveWidgetStyle silently drops any key it doesn't know about) can
// reuse this exact descriptor instead of redefining it and risking drift.
export const SHOW_DATA_POINTS_FIELD = { key: 'showDataPoints', label: 'Data Points', type: 'select', default: 'show', options: [{ value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide' }] };

export const CHART_TYPE_EXTRA_STYLE_FIELDS = {
  PIE: [
    { key: 'donut', label: 'Style', type: 'select', default: 'pie', options: [{ value: 'pie', label: 'Pie' }, { value: 'donut', label: 'Donut' }] },
    { key: 'showLegend', label: 'Legend', type: 'select', default: 'show', options: [{ value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide' }] },
    PALETTE_FIELD,
    ...CROSS_FILTER_FIELDS,
  ],
  // Cross-filter matches by category (x_axis) only — a stacked segment's own series/grouping
  // dimension (mapping.series) isn't part of the match for this first cut (see
  // DashboardCanvasEditor.jsx's cross-filter handler's own comment on this simplification).
  // No PALETTE_FIELD here (unlike PIE/FUNNEL/TREEMAP below) — STACKED_BAR always has a Series
  // field, so its own palette editor lives right under that field in the Data tab instead (see
  // SERIES_PALETTE_FIELD in ChartLibrary.jsx) rather than duplicated here in the Style tab.
  STACKED_BAR: [
    { key: 'showLegend', label: 'Legend', type: 'select', default: 'show', options: [{ value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide' }] },
    ...CROSS_FILTER_FIELDS,
  ],
  // Single-series chart_types — one accent color, not a palette (see ACCENT_COLOR_FIELD).
  // BAR/AREA/LINE also get VALUE_POSITION_FIELD — the exact real-chart-type analogs of the
  // legacy barChart/areaChart/sparklineCard mock types, which have the same movable value
  // text (see widgetTypeRegistry.js's own styleFields for those). SCATTER/HORIZONTAL_BAR
  // don't — no separate value/total text element to reposition (see TitleValueOverlay.jsx's
  // own comment on the survey behind this scoping).
  //
  // Once mapping.series is set (see chartLibraryStyleFieldsFor's own `hasSeries` param), these
  // four switch to STACKED_BAR's own field set instead (below) — a single accent swatch makes
  // no sense once the chart is rendering one color per named series, and the value-position
  // field has nothing left to reposition against (multiple bars/lines/areas, not one).
  BAR: [ACCENT_COLOR_FIELD, VALUE_POSITION_FIELD, ...CROSS_FILTER_FIELDS],
  AREA: [ACCENT_COLOR_FIELD, VALUE_POSITION_FIELD, ...CROSS_FILTER_FIELDS],
  LINE: [ACCENT_COLOR_FIELD, VALUE_POSITION_FIELD, SHOW_DATA_POINTS_FIELD, ...CROSS_FILTER_FIELDS],
  // Same field set as STACKED_BAR (palette-cycled series, not a single accent) — reused
  // verbatim once BAR/AREA/LINE/HORIZONTAL_BAR actually have mapping.series set. No
  // PALETTE_FIELD here either, same reasoning as STACKED_BAR above — its own Data-tab Series
  // field already has SERIES_PALETTE_FIELD right underneath it.
  BAR_SERIES: [
    { key: 'showLegend', label: 'Legend', type: 'select', default: 'show', options: [{ value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide' }] },
    ...CROSS_FILTER_FIELDS,
  ],
  // SCATTER is deliberately excluded from CROSS_FILTER_FIELDS — its mapping (x_axis/y_axis)
  // is two raw measures (RAW_CHART_TYPES), not a dimension column, so there's no {column,
  // value} pair a click could ever produce here.
  SCATTER: [ACCENT_COLOR_FIELD],
  // No VALUE_POSITION_FIELD, unlike BAR/AREA/LINE above — no separate value/total text element
  // to reposition (see TitleValueOverlay.jsx). Swaps to BAR_SERIES once mapping.series is set,
  // same as BAR/AREA/LINE (see `hasSeries` below).
  HORIZONTAL_BAR: [ACCENT_COLOR_FIELD, ...CROSS_FILTER_FIELDS],
  // Free-text suffix appended after the value (e.g. "%", "MB", "ms") — mirrors statCard's
  // own `unit` field (widgetTypeRegistry.js's statCard entry) for the mock-widget path.
  KPI_CARD: [
    { key: 'unit', label: 'Unit', type: 'text', default: '', placeholder: 'e.g. %, MB, ms' },
    {
      // `asDropdown` forces WidgetStyleFields' plain <select> instead of its default
      // 2-option-select => segmented-buttons behavior — the segmented pair's labels wrap
      // to two lines here (they're value examples, not single words like other segmented
      // fields), which was making this row taller than every sibling row in the panel.
      key: 'numberFormat', label: 'Number format', type: 'select', default: 'compact', asDropdown: true,
      options: [
        { value: 'compact', label: 'Compact (1.2M)' },
        { value: 'full', label: 'Full (1,234,567)' },
      ],
    },
    VALUE_POSITION_FIELD,
  ],
  // Two-stop gradient (not a flat accent, not a palette) — a heat strip's cells communicate
  // value through color intensity, so it needs a low/high pair rather than one hex like
  // ACCENT_COLOR_FIELD above. `colorFrom: null` falls back to a translucent version of
  // colorTo (see HeatStripChart.jsx) so picking just one color still looks sensible.
  HEAT_MAP: [
    { key: 'colorFrom', label: 'Gradient — low color', type: 'color', default: null },
    { key: 'colorTo', label: 'Gradient — high color', type: 'color', default: '#EC4899' },
    ...CROSS_FILTER_FIELDS,
  ],
  // `showPercent` defaults to 'yes' — GAUGE was originally percentage-only ("Radial gauge for
  // percentage-style KPIs", see GaugeCard.jsx's own doc comment), so every already-saved gauge
  // (e.g. RNA/Radio Network Availability) keeps its existing "%" suffix unchanged. Only a
  // widget explicitly switched to 'no' (for a non-percentage measure, e.g. a SUM'd traffic-MB
  // value) drops it — same numberFormat field as KPI_CARD, reused verbatim (both center a
  // single formatted number).
  GAUGE: [
    {
      key: 'numberFormat', label: 'Number format', type: 'select', default: 'compact', asDropdown: true,
      options: [
        { value: 'compact', label: 'Compact (1.2M)' },
        { value: 'full', label: 'Full (1,234,567)' },
      ],
    },
    { key: 'showPercent', label: 'Show as percent', type: 'select', default: 'yes', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  ],
  FUNNEL: [PALETTE_FIELD, ...CROSS_FILTER_FIELDS],
  WATERFALL: [...CROSS_FILTER_FIELDS],
  TREEMAP: [PALETTE_FIELD, ...CROSS_FILTER_FIELDS],
};

// Which real backend chart_types actually have a visible axis, or an inline value label —
// mirrors exactly what renderChartWidget.jsx's own switch does per chart_type (a BAR has
// both an axis and a value label; a KPI_CARD has neither; a SCATTER has an axis but no
// inline label, only a tooltip). Used below to only offer style fields that do something for
// the specific chart_type currently selected, instead of showing every field unconditionally
// (axis controls on a KPI Card, etc.) regardless of whether it's a no-op for that type.
const CHART_TYPES_WITH_AXIS = new Set(['BAR', 'AREA', 'LINE', 'HORIZONTAL_BAR', 'SCATTER', 'STACKED_BAR', 'WATERFALL', 'HEAT_MAP']);
const CHART_TYPES_WITH_VALUE_LABEL = new Set(['BAR', 'AREA', 'LINE', 'HORIZONTAL_BAR', 'PIE', 'FUNNEL', 'TREEMAP', 'GAUGE', 'KPI_CARD', 'TABLE']);

/**
 * The actual style fields to render for a 'chartLibrary' widget's Style panel, given the
 * real chart_type it's bound to — filters WIDGET_TYPE_REGISTRY.chartLibrary's generic
 * superset (which stays as-is, unfiltered, for resolveWidgetStyle's own default-computation
 * elsewhere) down to only what's relevant: axis fields only for chart_types with a visible
 * axis, value-label color/size only for types with an inline value label. Decimal places
 * stays included regardless — nearly every chart_type displays a raw number somewhere (a
 * tooltip, if nothing else), so rounding it is rarely irrelevant even without an inline label.
 */
// `mapping` (optional — the widget's own dataSource.mapping) only matters for BAR/AREA/LINE:
// once mapping.series is set, they render one color per named series (see renderChartWidget.jsx
// /BarChart.jsx et al.'s multi-series branch) exactly like STACKED_BAR, so their style panel
// needs to swap ACCENT_COLOR_FIELD for STACKED_BAR's own legend field, not offer both/neither.
// Every other chart_type ignores `mapping` entirely (their field set never varied by mapping).
// The field set BAR/AREA/LINE/HORIZONTAL_BAR switch to once mapping.series is set — see
// CHART_TYPE_EXTRA_STYLE_FIELDS.BAR_SERIES's own doc comment. LINE's dot toggle is meaningful
// here too (unlike showLegend's cousins) since BAR/AREA/HORIZONTAL_BAR don't draw dots at all.
// Exported so DashboardCanvasEditor.jsx's own extraFields computation — which has to mirror
// this exactly, or resolveWidgetStyle silently drops any key it doesn't know about — can call
// this instead of re-deriving the same branch by hand.
export function seriesExtraStyleFields(chartType) {
  return [...CHART_TYPE_EXTRA_STYLE_FIELDS.BAR_SERIES, ...(chartType === 'LINE' ? [SHOW_DATA_POINTS_FIELD] : [])];
}

export function chartLibraryStyleFieldsFor(chartType, mapping) {
  const hasAxis = CHART_TYPES_WITH_AXIS.has(chartType);
  const hasValueLabel = CHART_TYPES_WITH_VALUE_LABEL.has(chartType);
  const hasSeries = ['BAR', 'AREA', 'LINE', 'HORIZONTAL_BAR'].includes(chartType) && !!mapping?.series;
  return [
    ...TITLE_TEXT_STYLE_FIELDS,
    BG_COLOR_FIELD, ...BG_GRADIENT_FIELDS,
    ...(hasValueLabel ? VALUE_TEXT_STYLE_FIELDS : [VALUE_DECIMALS_FIELD]),
    ...(hasAxis ? AXIS_TEXT_STYLE_FIELDS : []),
    ...(hasSeries ? seriesExtraStyleFields(chartType) : (CHART_TYPE_EXTRA_STYLE_FIELDS[chartType] || [])),
  ];
}
