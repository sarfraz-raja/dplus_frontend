import { Hash, Gauge, Activity, Table, AlertTriangle, MapPin } from 'lucide-react';
import StatCard from '../Widgets/StatCard';
import GaugeCard from '../Widgets/GaugeCard';
import SparklineCard from '../Widgets/SparklineCard';
import KpiTable from '../Widgets/KpiTable';
import DegradedCellsMap from '../Widgets/DegradedCellsMap';
import DegradedCellsTable from './KpiDashboard/DegradedCellsTable';

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
 */
const FONT_WEIGHT_FIELD_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
];

// Row-text style fields shared by table-shaped widgets (kpiTable, degradedCellsTable) —
// same three controls the KPI dashboard's own "Row Text" customize-colors group exposes.
// rowFontSize is a raw px number (not a sm/md/lg preset) for precise control.
const ROW_TEXT_STYLE_FIELDS = [
  { key: 'rowTextColor', label: 'Row text color', type: 'color', default: null },
  { key: 'rowFontWeight', label: 'Row font weight', type: 'select', options: FONT_WEIGHT_FIELD_OPTIONS, default: 'normal' },
  { key: 'rowFontSize', label: 'Row font size (px)', type: 'number', min: 8, max: 48, default: 14 },
];

// w values are in grid-column units — GRID_CONFIG.cols is 144 (12 visual columns × 12,
// see DashboardCanvasEditor.jsx), so these are the old 12-col widths ×12.
const WIDGET_TYPE_REGISTRY = {
  statCard: {
    label: 'Stat Card', icon: Hash, component: StatCard, defaultSize: { w: 36, h: 2 }, dataShape: 'single-value',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
    ],
  },
  gaugeCard: {
    label: 'Gauge', icon: Gauge, component: GaugeCard, defaultSize: { w: 36, h: 3 }, dataShape: 'gauge',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
    ],
  },
  sparklineCard: {
    label: 'Sparkline Chart', icon: Activity, component: SparklineCard, defaultSize: { w: 48, h: 3 }, dataShape: 'series',
    styleFields: [
      { key: 'color', label: 'Accent color', type: 'color', default: '#378ADD' },
      { key: 'titleColor', label: 'Title color', type: 'color', default: null },
    ],
  },
  // No accent-color field — KpiTable colors each row by KPI status (ok/warn/crit), not a
  // single per-widget accent, so only row-text styling applies here.
  kpiTable: {
    label: 'KPI Table', icon: Table, component: KpiTable, defaultSize: { w: 72, h: 5 }, dataShape: 'table',
    styleFields: ROW_TEXT_STYLE_FIELDS,
  },
  degradedCellsTable: {
    label: 'Top Degraded Cells', icon: AlertTriangle, component: DegradedCellsTable, defaultSize: { w: 72, h: 5 }, dataShape: 'table', builderVisible: false,
    styleFields: ROW_TEXT_STYLE_FIELDS,
  },
  // No styleFields — DegradedCellsMap manages its own basemap style picker internally,
  // nothing here for a generic style panel to control.
  degradedCellsMap: { label: 'Degraded Cells Map', icon: MapPin, component: DegradedCellsMap, defaultSize: { w: 72, h: 40 }, dataShape: 'table', builderVisible: false },
};

export default WIDGET_TYPE_REGISTRY;

/**
 * Merges a widget instance's stored `style` values with its type's `styleFields`
 * defaults — every field the type declares is guaranteed present in the result
 * (using the field's `default` when the instance hasn't set/overridden it).
 */
export function resolveWidgetStyle(type, style) {
  const fields = WIDGET_TYPE_REGISTRY[type]?.styleFields || [];
  const result = {};
  for (const field of fields) {
    const v = style?.[field.key];
    result[field.key] = v !== undefined && v !== null && v !== '' ? v : field.default;
  }
  return result;
}
