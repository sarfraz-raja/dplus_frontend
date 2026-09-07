import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Play, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, LayoutGrid, Settings2, Palette, AlertTriangle, BarChart3 } from 'lucide-react';
import MappingFields from './MappingFields';
import WidgetStyleFields from '../widgetConfig/WidgetStyleFields';
import Button from '../../Button';
import ConfirmModal from '../../ConfirmModal';
import CustomTooltip from '../../CustomTooltip';
import ChartListItem from './ChartListItem';
import ChartListSearchBar from './ChartListSearchBar';
import useChartListFilter from './useChartListFilter';
import { chartLibraryStyleFieldsFor } from '../widgetConfig/widgetTypeRegistry';
import { exportRowsCSV } from '../utils/exportUtils';
import ChartLibraryWidgetView from './ChartLibraryWidgetView';
import CHART_TYPE_META, { CHART_TYPES } from './chartTypeMeta';
import { useTheme } from '../../../context/ThemeContext';
import { chartTokens } from '../../../theme/tokens';
import {
  listDatasources,
  getDatasourceDetail,
  createWidget,
  listWidgets,
  getWidgetDetail,
  updateWidget,
  duplicateWidget,
  deleteWidget,
  getStandaloneWidgetData,
} from '../../../store/actions/dashboardBuilder-actions';
import { subscribeDatasourcesChanged } from '../../../store/actions/datasourceEvents';
import { subscribeWidgetsChanged, notifyWidgetsChanged } from '../../../store/actions/widgetEvents';
import { sortWidgetsByRecency, withDatasourceOnly } from './sortWidgets';
import { resolveFiltersForQuery, buildComparisonFilters, buildCustomComparisonFilters, buildDateFilterFromPreset } from '../utils/resolveTimeRange';
import { DEFAULT_TIME_AXIS_FORMAT, TIME_AXIS_FORMAT_OPTIONS, DEFAULT_TICK_INTERVAL_UNIT, TICK_INTERVAL_UNIT_MAX } from './axisTypeUtils';

const AGGREGATIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'LATEST'];

// mapping is a free-form key/value bag (no fixed schema server-side) — the field keys used
// here are just the conventions this codebase picks per chart_type, matching whatever the
// backend's SQL-generation logic reads for that type. Each entry is a field-descriptor
// array consumed by MappingFields.jsx (same generic-renderer pattern WidgetStyleFields.jsx
// already established for per-widget-type style controls).
const AGG_FIELD = { key: 'aggregation', label: 'Aggregation', type: 'select', options: AGGREGATIONS, default: 'SUM' };
// Optional, appended to every chart_type below whose primary dimension (x_axis/Category) can
// have a drill-down hierarchy under it — lets a chart's own definition declare "drilling into
// this bar/slice should walk through these columns, in this order" (mapping.drill_down; see
// getWidgetData's own doc comment for the backend-side contract). Left off SCATTER (no
// dimension, two raw measures), KPI_CARD/GAUGE (measure-only), and TABLE (a plain column list,
// no chart to drill within).
// Wrapped in a 'group' (its own collapsible bordered card, same as X Axis/Y Axis) rather than
// left as a bare top-level field — every other section of the Data tab got that treatment, so
// a lone unboxed field here would be the one visual outlier. The inner field's own label is
// left blank; MappingFields.jsx's orderedColumns case skips rendering an empty label, so the
// group header text is the only place "Drill-down/Drill-up hierarchy" appears, not duplicated.
const DRILL_DOWN_FIELD = { key: 'drill_down_group', label: 'Drill-down/Drill-up hierarchy', type: 'group', fields: [
  { key: 'drill_down', label: '', type: 'orderedColumns', optional: true },
] };

// Optional display-only overrides for the axis titles — a chart otherwise always shows the
// picked column's own name (e.g. "starttime") as its axis label, which is rarely a title
// worth showing to an end user as-is. Purely cosmetic (renderChartWidget.jsx falls back to
// the column name whenever these are blank), never touches the actual mapping.x_axis/y_axis
// column selection.
const X_AXIS_TITLE_FIELD = { key: 'x_axis_title', label: 'X Axis title', type: 'text', optional: true, placeholder: 'Leave blank to use column name' };
const Y_AXIS_TITLE_FIELD = { key: 'y_axis_title', label: 'Y Axis title', type: 'text', optional: true, placeholder: 'Leave blank to use column name' };

// Explicit Y-axis value bounds ("Truncate Y Axis" — same concept as Superset's own Truncate
// Y Axis + Min/Max) — clips the axis to a fixed range instead of auto-scaling to the data,
// maps directly onto ECharts' yAxis.min/max (see renderChartWidget.jsx). This is a *data*
// concern (it changes which values are visible/comparable, not just their appearance), which
// is why it lives in the Y Axis mapping group alongside Measure/Aggregation, not in the Style
// tab's cosmetic panel. Min/Max only render once truncate_y_axis is checked (`showIf`).
// Optional per chart_type, opted into via buildAxisFields' `showYAxisBounds` — each
// chart_type's own component builds its own ECharts option independently (no shared
// option-builder), so this needs the actual yAxis.min/max wiring added per component before
// it belongs in that chart_type's fields; extend chart-type by chart-type as each is wired
// (see LineAreaChart.jsx for the first one).
const TRUNCATE_Y_AXIS_FIELD = { key: 'truncate_y_axis', label: 'Truncate Y Axis', type: 'checkbox', default: false, optional: true };
// `warnIf` — surfaces resolveTruncatedBounds' own silent min>max fallback (axisTypeUtils.js)
// right where the user is looking, instead of a truncation bound that just quietly does
// nothing with no explanation. Put on both fields so the warning shows next to whichever one
// the user is actually looking at/editing, not just one of the pair.
const Y_AXIS_BOUNDS_INVALID = (m) => m.y_axis_min != null && m.y_axis_max != null && m.y_axis_min > m.y_axis_max;
const Y_AXIS_MIN_FIELD = { key: 'y_axis_min', label: 'Min', type: 'number', optional: true, showIf: (m) => !!m.truncate_y_axis, warnIf: (m) => (Y_AXIS_BOUNDS_INVALID(m) ? 'Max must be ≥ Min — ignored until fixed' : null) };
const Y_AXIS_MAX_FIELD = { key: 'y_axis_max', label: 'Max', type: 'number', optional: true, showIf: (m) => !!m.truncate_y_axis, warnIf: (m) => (Y_AXIS_BOUNDS_INVALID(m) ? 'Max must be ≥ Min — ignored until fixed' : null) };
// X-axis equivalent — only wired for SCATTER (see its own CHART_TYPE_FIELDS entry), the one
// chart_type whose x_axis is a raw numeric measure rather than a dimension/time column (every
// other chart_type's x_axis is a category or `type: 'time'` axis, where a numeric min/max
// bound doesn't map onto ECharts' axis.min/max the same way — see the conversation this was
// scoped down from "every chart_type" to just Scatter).
const TRUNCATE_X_AXIS_FIELD = { key: 'truncate_x_axis', label: 'Truncate X Axis', type: 'checkbox', default: false, optional: true };
const X_AXIS_BOUNDS_INVALID = (m) => m.x_axis_min != null && m.x_axis_max != null && m.x_axis_min > m.x_axis_max;
const X_AXIS_MIN_FIELD = { key: 'x_axis_min', label: 'Min', type: 'number', optional: true, showIf: (m) => !!m.truncate_x_axis, warnIf: (m) => (X_AXIS_BOUNDS_INVALID(m) ? 'Max must be ≥ Min — ignored until fixed' : null) };
const X_AXIS_MAX_FIELD = { key: 'x_axis_max', label: 'Max', type: 'number', optional: true, showIf: (m) => !!m.truncate_x_axis, warnIf: (m) => (X_AXIS_BOUNDS_INVALID(m) ? 'Max must be ≥ Min — ignored until fixed' : null) };

// Only meaningful once the X Axis column actually turns out to be time-shaped at render time
// (renderChartWidget.jsx's isTimeAxis check, run against the real data — this field has no way
// to know that at config time) — harmlessly ignored otherwise, same permissive pattern every
// other optional field here already follows. Two separate concerns, per the conversation these
// were split out of: which *style* the same instant is written in (day-tier ordering, "MM-DD"
// vs "DD MMM" ...) vs *which zone's clock* is being read out at all — see axisTypeUtils.js's
// own doc comment on toAxisTimeValue for why the latter needs real zone math, not just a
// different string template.
// Applies to the day-tier tick label (e.g. "05-18" vs "18 May") — the year and hour:minute
// can optionally be folded into that same tick ("05-18-2026" / "18 May, 2026 14:30", see the
// "-YYYY"/"-YYYY HH:mm" presets in TIME_AXIS_FORMAT_PRESETS) for an axis where every day-level
// tick needs to carry more than just the day. The year/hour/minute/second *tiers* above/below
// day still stay fixed at a plain 4-digit year and 24-hour clock regardless — those only ever
// show once ticks zoom out/in past the day tier, not something a "style" choice applies to.
// No AM/PM option: ECharts' time-axis template tokens have no AM/PM marker at all, so a 12-hour
// toggle would just render "1:00" for both 1am and 1pm with no way to tell them apart — worse
// than the unambiguous 24-hour clock this app's own timestamps already use everywhere else
// (see resolveTimeRange.js's 'HH:MM:SS' convention).
const X_AXIS_DATE_FORMAT_FIELD = { key: 'x_axis_date_format', label: 'Date format', type: 'select', options: TIME_AXIS_FORMAT_OPTIONS, default: DEFAULT_TIME_AXIS_FORMAT, hint: 'Day-level ticks' };
// Fully custom tick spacing — a number + unit pair (rendered as one combined "Tick every [N]
// [unit ▾]" control, see MappingFields.jsx's 'numberUnit' case) rather than a fixed preset
// list, so it can match any real sampling rate (e.g. "3 hours" for 3-hourly readings), not just
// whatever intervals happened to be offered. Blank value = Auto (ECharts' own span/width-based
// spacing, today's existing behavior) — see resolveTickInterval in axisTypeUtils.js.
const X_AXIS_TICK_INTERVAL_FIELD = {
  key: 'x_axis_tick_interval_value', unitKey: 'x_axis_tick_interval_unit', label: 'Tick every',
  type: 'numberUnit', optional: true, placeholder: 'Auto',
  unitOptions: ['minutes', 'hours', 'days', 'weeks'], unitDefault: DEFAULT_TICK_INTERVAL_UNIT,
  unitMax: TICK_INTERVAL_UNIT_MAX,
};

// "LATEST" (aggregation: 'LATEST') needs a date/timestamp column to order by — the backend
// requires mapping.latest_by whenever aggregation is LATEST (validate_widget_mapping rejects
// its absence), translating to `SELECT DISTINCT ON (dims) ... ORDER BY dims, latest_by DESC`
// (or a plain `ORDER BY latest_by DESC LIMIT 1` with no dimension) instead of wrapping y_axis
// in a SQL aggregate — the most-recent-row-per-category (or overall) reading, not a sum/average
// over a range. Only shown once LATEST is actually selected (`showIf`, see MappingFields.jsx)
// so it doesn't clutter/block save for the other five aggregations that don't need it.
const LATEST_BY_FIELD = {
  key: 'latest_by', label: 'Latest by (date column)', type: 'column', role: 'date',
  showIf: (mapping) => mapping.aggregation === 'LATEST',
};

// Shared by every single-aggregated-value chart_type (KPI_CARD, GAUGE — anything whose
// mapping is "one measure, one aggregation, no dimension axis") so "own date range" and
// "compare to" are defined and behave identically everywhere they appear, instead of each
// chart_type declaring its own near-identical copy. See each field's own original doc
// comment (moved here unchanged) for why every individual choice below is what it is.
const SINGLE_VALUE_DATE_FILTER_GROUP = { key: 'date_filter_group', label: 'Date Filter', type: 'group', fields: [
  { key: 'date_filter_column', label: 'Column', type: 'column', role: 'date', optional: true, showIf: (m) => m.aggregation !== 'LATEST' },
  { key: 'date_filter_range', label: 'Range', type: 'select', options: ['Last hour', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'This month', 'This quarter', 'This year'], default: 'Last 7 days', showIf: (m) => m.aggregation !== 'LATEST' },
] };
const SINGLE_VALUE_COMPARISON_GROUP = { key: 'comparison_group', label: 'Comparison', type: 'group', fields: [
  {
    key: 'compare_to', label: 'Compare to', type: 'select', default: 'None',
    options: (m) => (m.aggregation === 'LATEST' ? ['None', 'Custom'] : ['None', '1 hour ago', '1 day ago', '7 days ago', '30 days ago', 'Custom']),
  },
  // LATEST has no "current window" to shift (its own date_filter_column is hidden/cleared —
  // see LATEST_BY_FIELD's comment) — its own Custom is a single cutoff instant ("the latest
  // reading at or before this date"), so one date/time picker is the right, unambiguous
  // input there. Every other aggregation DOES have a real current window (date_filter_range,
  // e.g. "This year") — comparing that against a single picked instant was ambiguous (what's
  // actually being diffed against?), so it takes an explicit from/to range instead, matching
  // the same shape Date Filter's own Range picker implies.
  { key: 'compare_custom_date', label: 'Compare to date/time', type: 'dateInput', showIf: (m) => m.compare_to === 'Custom' && m.aggregation === 'LATEST' },
  { key: 'compare_custom_from', label: 'Compare from', type: 'dateInput', showIf: (m) => m.compare_to === 'Custom' && m.aggregation !== 'LATEST' },
  { key: 'compare_custom_to', label: 'Compare to', type: 'dateInput', showIf: (m) => m.compare_to === 'Custom' && m.aggregation !== 'LATEST' },
  { key: 'delta_format', label: 'Delta format', type: 'select', options: ['Percent', 'Number'], default: 'Percent' },
] };

// `role` ('dimension' | 'measure') restricts each field's column dropdown to columns actually
// flagged that way on the datasource (see MappingFields.jsx's 'column' case) — without it, a
// numeric-only field like SCATTER's "X (measure)" would accept a text dimension column and
// silently collapse every point to 0 (Number(textValue) is NaN).
//
// Shared X-Axis/Y-Axis grouped field set — every chart_type below whose mapping is a plain
// {x_axis: dimension, y_axis: measure} pair (LINE's original shape) uses this exact same
// layout, so the "X Axis"/"Y Axis" boxes, Aggregation-next-to-Measure ordering, and axis title
// overrides stay consistent everywhere instead of drifting per chart_type. `xLabel`/`yLabel`
// vary (e.g. PIE's "Category"/"Value" vs LINE's "Dimension"/"Measure") since the same
// underlying x_axis/y_axis keys mean something slightly different per chart shape, but the
// structure itself — group, Aggregation beside Measure, title field last — never does.
// `showTitles` (default true) drops both title fields for chart_types with no rendered axis
// at all (PIE/FUNNEL/TREEMAP — slices/stages/rectangles, not an x/y plot) — an axis title
// input with nothing to attach to would just be dead weight in the config panel. `showTimeAxis`
// (default false) additionally adds the Date format field — LINE/BAR/AREA (a real continuous
// `type: 'time'` x-axis — see renderChartWidget.jsx's isTimeAxis wiring) and HORIZONTAL_BAR
// (a discrete/ranked axis whose own row labels still get date-formatted — see
// HorizontalBarChart.jsx's own comment) opt in; WATERFALL/STACKED_BAR/HEAT_MAP remain
// deliberately excluded (see the conversation this was decided in). `showTickInterval`
// (defaults to mirroring showTimeAxis) is HORIZONTAL_BAR's one deliberate override — set to
// `false` there. Bucket granularity for that chart_type comes entirely from Date format (see
// HorizontalBarChart.jsx's own bucket-and-sum comment); "Tick every" (continuous-axis tick
// spacing) has never had anything to apply to on its discrete/ranked category axis, in
// bucketed mode or not — showing it anyway would be a dead field with no effect, so it's
// hidden here rather than left visible-but-inert.
// Optional multi-series grouping dimension — same field STACKED_BAR already has (see its own
// CHART_TYPE_FIELDS entry), now opted into by LINE/BAR/AREA too (`showSeries`). Kept
// `optional: true` (unlike STACKED_BAR's required one) since every existing saved LINE/BAR/AREA
// widget has no mapping.series at all and must keep rendering its current single-series shape
// unchanged (see renderChartWidget.jsx's `mapping.series` branch for the fallback).
const SERIES_FIELD = { key: 'series', label: 'Series (grouping dimension)', type: 'column', role: 'dimension', optional: true };
// Sits directly under SERIES_FIELD in the Data tab (not the Style tab, where every other
// color field lives) — a palette only makes sense once Series is actually set, so putting it
// right where that decision was just made means never having to go hunt for it in a separate
// tab. `showIf` hides it until then, same as any other conditionally-relevant field. Writes to
// mapping.style.palette via MappingFields' own styleValue/onStyleChange pair (see its doc
// comment) — a style-tree value, not a real mapping key, despite living in this field list.
const SERIES_PALETTE_FIELD = { key: 'palette', label: 'Series colors', type: 'palette', showIf: (m) => !!m.series };

// `xGroupLabel`/`yGroupLabel` — HORIZONTAL_BAR's own group headers (see its call site below):
// its `x_axis`/`y_axis` mapping keys are the same category/measure pair every other chart_type
// here uses, but HorizontalBarChart.jsx deliberately renders them on the *rotated* ECharts axis
// (category on the vertical yAxis, measure on the horizontal xAxis — see that component's own
// comment on why). Labeling the group "X Axis" when its field actually draws on the chart's
// vertical axis reads as self-contradictory, so HORIZONTAL_BAR overrides these to the neutral
// "Category"/"Measure" (no axis-direction claim at all) instead of the default "X Axis"/"Y Axis"
// every axis-having chart_type otherwise shares.
// `showTickInterval` (defaults to mirroring `showTimeAxis`) — split out separately for
// HORIZONTAL_BAR: it's a *ranked* chart (sorted by value, top-N sliced — see
// HorizontalBarChart.jsx), never a continuous chronological axis, so "Tick every N hours"
// (a continuous-axis tick-spacing control) has nothing to apply to there. Its own date-shaped
// category values still benefit from Date format, though — it just governs how each row's
// own label is displayed, not tick spacing along a timeline — so that field stays available
// while tick spacing doesn't.
function buildAxisFields(xLabel = 'Dimension', yLabel = 'Measure', showTitles = true, showTimeAxis = false, showYAxisBounds = false, showSeries = false, xGroupLabel = 'X Axis', yGroupLabel = 'Y Axis', showTickInterval = showTimeAxis) {
  return [
    { key: 'x_axis_group', label: xGroupLabel, type: 'group', fields: [
      { key: 'x_axis', label: xLabel, type: 'column', role: 'dimension' },
      ...(showSeries ? [SERIES_FIELD, SERIES_PALETTE_FIELD] : []),
      ...(showTitles ? [{ ...X_AXIS_TITLE_FIELD, label: `${xGroupLabel} title` }] : []),
      ...(showTimeAxis ? [X_AXIS_DATE_FORMAT_FIELD] : []),
      ...(showTickInterval ? [X_AXIS_TICK_INTERVAL_FIELD] : []),
    ] },
    // Aggregation (and LATEST's own "latest by" column) only ever apply to the measure —
    // `SELECT x_axis, AGG(y_axis) ... GROUP BY x_axis`, never the dimension itself — so both
    // live inside the Y Axis group, matching Superset's own layout (Aggregation sits under
    // Metrics, not Dimensions) instead of standing alone between the two groups where it read
    // as ambiguous about which axis it modified.
    { key: 'y_axis_group', label: yGroupLabel, type: 'group', fields: [
      // Aggregation right next to Measure (both wrap onto the same row, group's flex-wrap
      // container) — it's a direct modifier of the measure column, not the title, so it reads
      // as "SUM of cs_traffic" sitting together rather than looking related to the title field.
      { key: 'y_axis', label: yLabel, type: 'column', role: 'measure' },
      AGG_FIELD,
      LATEST_BY_FIELD,
      ...(showTitles ? [{ ...Y_AXIS_TITLE_FIELD, label: `${yGroupLabel} title` }] : []),
      ...(showYAxisBounds ? [TRUNCATE_Y_AXIS_FIELD, Y_AXIS_MIN_FIELD, Y_AXIS_MAX_FIELD] : []),
    ] },
  ];
}

const CHART_TYPE_FIELDS = {
  LINE: [...buildAxisFields('Dimension', 'Measure', true, true, true, true), DRILL_DOWN_FIELD],
  BAR: [...buildAxisFields('Dimension', 'Measure', true, true, true, true), DRILL_DOWN_FIELD],
  AREA: [...buildAxisFields('Dimension', 'Measure', true, true, true, true), DRILL_DOWN_FIELD],
  PIE: [...buildAxisFields('Category', 'Value (measure)', false), DRILL_DOWN_FIELD],
  KPI_CARD: [
    // Measure + Aggregation grouped together, same reasoning as buildAxisFields' Y Axis
    // group above — Aggregation is a direct modifier of the measure column, so it sits right
    // beside it rather than floating loose in the panel.
    { key: 'measure_group', label: 'Measure', type: 'group', fields: [
      { key: 'y_axis', label: 'Measure', type: 'column', role: 'measure' },
      AGG_FIELD,
      LATEST_BY_FIELD,
    ] },
    SINGLE_VALUE_DATE_FILTER_GROUP,
    SINGLE_VALUE_COMPARISON_GROUP,
  ],
  GAUGE: [
    { key: 'measure_group', label: 'Measure', type: 'group', fields: [
      { key: 'y_axis', label: 'Measure', type: 'column', role: 'measure' },
      AGG_FIELD,
      LATEST_BY_FIELD,
    ] },
    // Same single-value comparison feature as KPI_CARD, reusing the exact same field
    // descriptors/groups (see SINGLE_VALUE_DATE_FILTER_GROUP/SINGLE_VALUE_COMPARISON_GROUP's
    // own doc comment) — GAUGE is structurally identical to KPI_CARD (one aggregated measure,
    // no dimension axis), so "compare to" means the same thing here: diff this gauge's value
    // against the same measure computed over a shifted/earlier window.
    SINGLE_VALUE_DATE_FILTER_GROUP,
    SINGLE_VALUE_COMPARISON_GROUP,
  ],
  SCATTER: [
    // Both axes are plain measures here (no dimension/aggregation at all — each dot is one
    // row's raw X/Y pair), so these groups are just the column picker + title override, same
    // "X Axis"/"Y Axis" box pattern as every other chart_type, minus Aggregation, which
    // doesn't apply to a raw per-row scatter axis.
    { key: 'x_axis_group', label: 'X Axis', type: 'group', fields: [
      { key: 'x_axis', label: 'X (measure)', type: 'column', role: 'measure' },
      X_AXIS_TITLE_FIELD,
      TRUNCATE_X_AXIS_FIELD, X_AXIS_MIN_FIELD, X_AXIS_MAX_FIELD,
    ] },
    { key: 'y_axis_group', label: 'Y Axis', type: 'group', fields: [
      { key: 'y_axis', label: 'Y (measure)', type: 'column', role: 'measure' },
      Y_AXIS_TITLE_FIELD,
      TRUNCATE_Y_AXIS_FIELD, Y_AXIS_MIN_FIELD, Y_AXIS_MAX_FIELD,
    ] },
    // Scatter has no dimension axis by design (each dot is one row's X/Y measure pair) — this
    // is purely for identifying a dot on hover (e.g. which region/date/cell it came from),
    // wired into ScatterChart's own `name` per point + tooltip (see renderChartWidget.jsx's
    // SCATTER case), which already supported this, just never had anything to populate it.
    { key: 'label', label: 'Label (dimension)', type: 'column', role: 'dimension', optional: true },
  ],
  TABLE: [{ key: 'columns', label: 'Columns to display', type: 'multiColumn' }],
  HEAT_MAP: [...buildAxisFields('Dimension', 'Measure'), DRILL_DOWN_FIELD],
  HORIZONTAL_BAR: [...buildAxisFields('Category', 'Measure', true, true, true, true, 'Category', 'Measure', false), DRILL_DOWN_FIELD],
  FUNNEL: [...buildAxisFields('Stage', 'Value (measure)', false), DRILL_DOWN_FIELD],
  WATERFALL: [...buildAxisFields('Step', 'Delta (measure)', true, false, true), DRILL_DOWN_FIELD],
  TREEMAP: [...buildAxisFields('Category', 'Value (measure)', false), DRILL_DOWN_FIELD],
  STACKED_BAR: [
    { key: 'x_axis_group', label: 'X Axis', type: 'group', fields: [
      { key: 'x_axis', label: 'Category', type: 'column', role: 'dimension' },
      { key: 'series', label: 'Series (grouping dimension)', type: 'column', role: 'dimension' },
      SERIES_PALETTE_FIELD,
      X_AXIS_TITLE_FIELD,
    ] },
    { key: 'y_axis_group', label: 'Y Axis', type: 'group', fields: [
      { key: 'y_axis', label: 'Measure', type: 'column', role: 'measure' },
      AGG_FIELD,
      LATEST_BY_FIELD,
      Y_AXIS_TITLE_FIELD,
      TRUNCATE_Y_AXIS_FIELD, Y_AXIS_MIN_FIELD, Y_AXIS_MAX_FIELD,
    ] },
    DRILL_DOWN_FIELD,
  ],
};

// Chart types whose dimension picker benefits from a low-cardinality warning — anything
// with a raw x_axis/series dimension can render unreadably with a high-cardinality column
// (e.g. a timestamp), so the hint only shows for types that actually use one.
const DIMENSION_HINT_TYPES = new Set(['LINE', 'BAR', 'AREA', 'PIE', 'HEAT_MAP', 'HORIZONTAL_BAR', 'FUNNEL', 'WATERFALL', 'TREEMAP', 'STACKED_BAR']);

/**
 * The reusable chart library — widgets created here (POST /widgets) have no dashboard
 * attached; they're standalone chart definitions that can later be attached to one or more
 * dashboards (see createAndAttachWidget in dashboardBuilder-actions.js for that separate
 * join-row concern). Three-column layout (list / config / large preview), mirroring
 * DashboardCanvasEditor.jsx's select-then-configure interaction and Superset's own chart
 * editor layout.
 *
 * Exposes `resetForm` via ref so DashboardBuilder.jsx's header-level "New Chart" button can
 * trigger the same reset this component's own internal "New chart" link does.
 */
const ChartLibrary = React.forwardRef(function ChartLibrary({ prefill, onSavedForDashboard, returnToDashboard, onReturnToDashboard, onCancel }, ref) {
  // Pending destructive action awaiting user confirmation via <ConfirmModal/> below — see
  // ConfirmModal.jsx (replaces window.confirm/redux ALERTS with the app's current
  // FormModal-based modal styling).
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  // "Your Charts" list search/type-filter state now lives in useChartListFilter.js (shared
  // with DashboardCanvasEditor.jsx's own "Your Widgets" panel) — see its destructuring further
  // down, near sortedWidgets.
  // Data/Style/Charts now live as three tabs inside one collapsible panel (matches the
  // reference "Style Editor" mockup) instead of three separate side-by-side boxes.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  // Drag-to-resize width for the Chart Editor panel — persisted only for this component's
  // lifetime (not across reloads), same scope as panelCollapsed above. Clamped to keep the
  // preview canvas usable on one side (MIN) and the panel itself from swallowing the whole
  // screen on the other (MAX), regardless of how far the user drags past either edge.
  const [panelWidth, setPanelWidth] = useState(384); // w-96 in px, this panel's original fixed width
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  // Visualization Type's own collapse state — lives here, not in MappingFields.jsx's
  // collapsedGroups, since this card isn't a mapping field at all (chartType is separate,
  // top-level state), just styled to match the same collapsible-card look as the field groups
  // below it.
  const [vizTypeCollapsed, setVizTypeCollapsed] = useState(false);
  const PANEL_MIN_WIDTH = 320;
  const PANEL_MAX_WIDTH = 720;
  const [activeTab, setActiveTab] = useState('data');

  // Same theme-token derivation DashboardCanvasEditor.jsx uses for its own Style panel's
  // resolvedDefaults — without this, every unset color field showed a plain black swatch
  // regardless of what the preview is actually rendering with.
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { text: resolvedTextColor, sub: resolvedSubColor } = chartTokens(isDark);
  const resolvedBgColor = isDark ? '#22273C' : '#ffffff';

  const [datasources, setDatasources] = useState([]);
  // "Charts" tab list items only carry datasource_id, not a name — resolved against this
  // same list (already fetched for the Data tab's Datasource picker), no extra call needed.
  const datasourceNamesById = Object.fromEntries(datasources.map((d) => [d.id, d.name]));

  const [editingId, setEditingId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [name, setName] = useState('');
  const [datasourceId, setDatasourceId] = useState('');
  const [columns, setColumns] = useState([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [chartType, setChartType] = useState('BAR');
  const [mapping, setMapping] = useState({});
  const [dirty, setDirty] = useState(false); // unsaved changes since last successful save

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [running, setRunning] = useState(false); // combined save-then-fetch in flight
  const [runStatus, setRunStatus] = useState(''); // small status line, e.g. "Saving…" / "Running query…"
  const [previewError, setPreviewError] = useState(null);
  const [previewData, setPreviewData] = useState(null); // { columns, rows }
  // KPI_CARD's "Compare to" — mirrors DashboardCanvasEditor.jsx's own comparisonData, just for
  // this single in-progress widget rather than a whole canvas of them. { delta, deltaPercent,
  // deltaUp } | null (comparison fetch failed) | undefined (not applicable/not yet run).
  const [previewComparison, setPreviewComparison] = useState(undefined);
  // True once a Preview has actually succeeded at least once for the widget currently loaded
  // — gates the auto-refresh effect below so it never fires before the user's first explicit
  // Preview click (a brand-new/unconfigured widget has nothing worth auto-running yet), but
  // then keeps every later mapping/chart-type/datasource edit auto-refreshing without a
  // second manual click. A ref, not state, since it's read-only inside an effect and its own
  // changes shouldn't themselves trigger a re-render.
  const hasPreviewedRef = useRef(false);
  // Bumped on every runPreview() call and checked after its fetch resolves — if a newer call
  // started before an older one's fetch finished (e.g. the user changed another field while a
  // request was in flight), the older, now-superseded response is discarded instead of
  // clobbering the newer one.
  const previewRequestIdRef = useRef(0);

  const refreshList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      setWidgets(await listWidgets());
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
    listDatasources().then(setDatasources).catch(() => {});
  }, []);

  // Datasources may be registered/deleted from elsewhere (e.g. DatasourceManager.jsx's
  // Datasources tab) while this component stays mounted (it's always kept alive — see
  // DashboardBuilder.jsx) — without this, its dataset dropdown would stay stale until a
  // full page reload since the effect above only runs once.
  useEffect(() => subscribeDatasourcesChanged(() => {
    listDatasources().then(setDatasources).catch(() => {});
  }), []);

  // Same staleness problem, for widgets instead of datasources — DashboardCanvasEditor.jsx's
  // "Your Charts" panel keeps its own separate list cache, live at the same time this one is
  // (mounted-but-hidden, not unmounted). Without this, a widget created/edited/deleted/
  // duplicated from THERE never showed up here until this tab was manually revisited/remounted.
  useEffect(() => subscribeWidgetsChanged(() => { refreshList(); }), []);

  // Drag-to-resize — listeners only attached while a drag is actually in progress (not on
  // every render) so mousemove doesn't fire into a stale closure once the drag ends. Delta is
  // measured from the drag's own start point each time (startX/startWidth), not a running
  // "previous event" diff, so occasional dropped mousemove events (fast drags) don't cause
  // any cumulative drift between the cursor and the panel edge.
  const panelResizeStartRef = useRef(null);
  const startPanelResize = (e) => {
    panelResizeStartRef.current = { x: e.clientX, width: panelWidth };
    setIsResizingPanel(true);
  };
  useEffect(() => {
    if (!isResizingPanel) return undefined;
    const onMove = (e) => {
      const start = panelResizeStartRef.current;
      if (!start) return;
      // Panel sits on the right edge of the screen — dragging the handle LEFT (cursor moves
      // to a smaller clientX) should WIDEN the panel, the opposite sign of a left-edge panel.
      const next = start.width + (start.x - e.clientX);
      setPanelWidth(Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, next)));
    };
    const onUp = () => setIsResizingPanel(false);
    // Selecting the preview text/labels mid-drag is a common accidental side effect of a fast
    // drag crossing over other elements — suppressed only while a drag is actually in flight.
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizingPanel]);

  // "Add a widget" from a dashboard editor hands off here with a chart_type + datasource
  // already chosen (see DashboardBuilder.jsx's handleCreateViaChartsTab) — pre-fill the
  // form and jump straight to configuring the field mapping, instead of starting blank.
  useEffect(() => {
    if (!prefill) return;
    setEditingId(null);
    setName(prefill.name || '');
    setChartType(prefill.chartType);
    setDatasourceId(prefill.datasourceId);
    setMapping({});
    setDirty(false);
    setPreviewData(null);
    setPreviewComparison(undefined);
    setPreviewError(null);
    hasPreviewedRef.current = false;
    setSaveError(null);
    loadColumnsFor(prefill.datasourceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const loadColumnsFor = async (id) => {
    if (!id) {
      setColumns([]);
      return;
    }
    setColumnsLoading(true);
    try {
      const { columns: cols } = await getDatasourceDetail(id);
      setColumns(cols);
    } catch (err) {
      setColumns([]);
    } finally {
      setColumnsLoading(false);
    }
  };

  const markDirty = () => setDirty(true);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDatasourceId('');
    setColumns([]);
    setChartType('BAR');
    setMapping({});
    setDirty(false);
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewComparison(undefined);
    hasPreviewedRef.current = false;
    setRunStatus('');
    // Every "New widget"/"New chart" entry point (both buttons in this file, plus
    // DashboardBuilder.jsx's header button via the exposed ref) funnels through here — the
    // Charts tab (a list to pick an *existing* chart) makes no sense to land on right after
    // clearing the form specifically to configure a brand new one.
    setActiveTab('data');
  };

  const editWidget = async (summary) => {
    setEditingId(summary.id);
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewComparison(undefined);
    hasPreviewedRef.current = false;
    setRunStatus('');
    setDirty(false);
    setDetailLoading(true);
    try {
      const widget = await getWidgetDetail(summary.id);
      setName(widget.name);
      setDatasourceId(widget.datasource_id);
      setChartType(widget.chart_type);
      setMapping(widget.mapping || {});
      await loadColumnsFor(widget.datasource_id);
      setDetailLoading(false);

      // Already-saved chart — run it immediately so selecting one from the list shows its
      // data right away, no separate Preview click needed. Uses `summary.id` directly
      // rather than the `editingId` state (which may not have re-rendered yet) to avoid a
      // race. Best-effort: a failure here shows as a normal preview error, not a save error.
      setRunning(true);
      setRunStatus('Running query…');
      try {
        setPreviewData(await getStandaloneWidgetData(summary.id));
        hasPreviewedRef.current = true;
        setRunStatus('');
      } catch (err) {
        setRunStatus('');
        setPreviewError(err.message);
      } finally {
        setRunning(false);
      }
    } catch (err) {
      setSaveError(err.message);
      setDetailLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    resetForm,
    // Called by DashboardBuilder.jsx's "Edit chart" flow (a placed Real Chart widget's
    // side panel) — loads that exact chart the same way clicking it in the list does.
    // Guarded the same as a list click below (`guardedRun`, defined just after this) — a
    // fresh closure over the current `guardedRun`/`editWidget` is captured on every render
    // since `useImperativeHandle` here has no deps array, so this always sees the latest
    // `dirty`.
    loadChart: (id) => guardedRun(() => editWidget({ id })),
  }));

  // Shared guard for every action that would silently discard whatever's unsaved in the form
  // (`dirty`) — "New widget", picking a different chart from the list, "Cancel", or the
  // imperative `loadChart` entry point DashboardBuilder.jsx's "Edit chart" flow uses. Runs
  // `action` immediately when there's nothing to lose; otherwise routes through the same
  // `pendingConfirm`/`ConfirmModal` plumbing already wired up for delete confirmations below.
  const guardedRun = (action, message = 'Discard unsaved changes and continue? This can\'t be undone.') => {
    if (dirty) {
      setPendingConfirm({ title: 'Unsaved Changes', message, run: action });
      return;
    }
    action();
  };

  // Guards both "New widget" buttons below — resetForm() discards whatever's unsaved in the
  // form outright, same silent-data-loss risk DashboardBuilder.jsx's "New dashboard" button
  // had (see that fix) — reuses the same `dirty` tracking this component already had for its
  // "Unsaved changes" indicator, just not previously consulted before a reset.
  const handleNewWidgetClick = () => guardedRun(resetForm, 'Discard unsaved changes and start a new widget? This can\'t be undone.');

  const onDatasourceChange = (id) => {
    setDatasourceId(id);
    setMapping({});
    // Cleared synchronously (not just left to loadColumnsFor's async setColumns) so
    // MappingFields shows its empty/loading state instead of the OLD datasource's columns
    // lingering in the dropdowns during the fetch. The old preview is cleared outright too —
    // a new datasource makes `canSave` false until the mapping is redone (no column names
    // carry over), so the auto-refresh effect below won't fire until then; without this the
    // OLD datasource's chart would otherwise just sit there in the meantime.
    setColumns([]);
    setPreviewData(null);
    setPreviewComparison(undefined);
    setPreviewError(null);
    markDirty();
    loadColumnsFor(id);
  };

  const onChartTypeChange = (type) => {
    // Keeps any mapping key still valid for the new chart_type (e.g. BAR -> LINE share
    // x_axis/y_axis/aggregation/drill_down — identical field sets, so nothing here was lost
    // before this fix) plus `style` (the Style tab's own key, never part of
    // CHART_TYPE_FIELDS, so it isn't caught by the allowedKeys check at all and needs its
    // own explicit carve-out). Anything not in the new type's own field list (e.g.
    // `aggregation` when switching to SCATTER, which has none) is correctly dropped.
    // A 'group' field (see X_AXIS_TITLE_FIELD/Y_AXIS_TITLE_FIELD's grouping in LINE) has its
    // own key (e.g. 'x_axis_group') that's never an actual mapping key — only the fields
    // nested inside it are, so those need flattening in here too, or every grouped field
    // (x_axis, x_axis_title, ...) would look "not allowed" and get dropped on every type
    // change even when switching between two chart_types that both group the same fields.
    const allowedKeys = new Set((CHART_TYPE_FIELDS[type] || []).flatMap((f) => (f.type === 'group' ? f.fields.map((sub) => sub.key) : [f.key])));
    setChartType(type);
    setMapping((prev) => Object.fromEntries(
      Object.entries(prev).filter(([k]) => allowedKeys.has(k) || k === 'style'),
    ));
    markDirty();
    // Preview auto-refreshes via the effect below (chartType is one of its deps) once the
    // widget has been previewed at least once — nothing else to do here.
  };

  const onMappingChange = (key, val) => {
    setMapping((prev) => {
      const next = { ...prev, [key]: val };
      // Switching TO 'LATEST' clears any already-set date filter — its field hides
      // immediately (see date_filter_column/range's showIf), but the mapping value itself
      // would otherwise silently linger and still apply, reintroducing the exact
      // "filter finds nothing" failure LATEST exists to avoid (see LATEST_BY_FIELD's own
      // comment). Switching AWAY from LATEST is left alone — re-enabling those fields with
      // their last value is a reasonable default, not a correctness risk like the reverse.
      if (key === 'aggregation' && val === 'LATEST') {
        delete next.date_filter_column;
        delete next.date_filter_range;
        // The window-shifting presets (1 hour/1 day/7 days/30 days ago) have no
        // window to shift under LATEST (see compare_to's own options fn) — clear rather than
        // leave a now-meaningless value sitting in mapping while the dropdown itself falls
        // back to displaying 'None'.
        if (next.compare_to && next.compare_to !== 'None' && next.compare_to !== 'Custom') {
          delete next.compare_to;
          delete next.compare_custom_date;
        }
        // Custom's own shape flips under LATEST too — from an explicit from/to range to a
        // single cutoff instant (see compare_custom_date/_from/_to's own showIf in
        // SINGLE_VALUE_COMPARISON_GROUP) — clear the now-hidden range fields so a stale value
        // can't silently linger and get sent once the field re-hides.
        if (next.compare_to === 'Custom') {
          delete next.compare_custom_from;
          delete next.compare_custom_to;
        }
      }
      // Switching AWAY from LATEST while Custom is still selected — the reverse flip: the
      // single-cutoff field hides, the from/to range field pair takes over. Same staleness
      // guard as above, just the opposite direction.
      if (key === 'aggregation' && val !== 'LATEST' && prev.aggregation === 'LATEST' && next.compare_to === 'Custom') {
        delete next.compare_custom_date;
      }
      return next;
    });
    markDirty();
    // Preview auto-refreshes via the effect below (mapping is one of its deps) once the
    // widget has been previewed at least once — this used to clear the preview outright and
    // require a manual re-click, but re-running it automatically means the user never sees
    // it mismatched against the old mapping in the first place (see runPreview's own
    // requestId guard for why an in-flight, now-superseded fetch can't clobber a newer one).
  };

  const fields = CHART_TYPE_FIELDS[chartType] || [];
  // A 'group' field (see buildAxisFields/KPI_CARD's grouped sections in CHART_TYPE_FIELDS) has
  // its own key (e.g. 'x_axis_group') that's never actually written into mapping — only the
  // fields nested inside it are — so it needs flattening here too, same as onChartTypeChange's
  // allowedKeys above, or every grouped field would look permanently unfilled (mapping['x_axis_
  // group'] is always undefined) and Save would never enable for any chart_type using a group.
  const flatFields = fields.flatMap((f) => (f.type === 'group' ? f.fields : [f]));
  const canSave = name.trim() && datasourceId
    && flatFields.every((f) => {
      // A conditionally-hidden field (e.g. latest_by, only relevant when aggregation ===
      // 'LATEST' — see LATEST_BY_FIELD's showIf) never blocks Save while it isn't shown;
      // MappingFields.jsx applies the exact same showIf check to decide what to render, so
      // this always matches what's actually on screen.
      if (f.showIf && !f.showIf(mapping)) return true;
      // 'palette' is a display-only style field whose real value lives in mapping.style.palette,
      // never in the flat mapping[f.key] this check reads — so it must never gate Save/Preview,
      // or picking a series (which flips SERIES_PALETTE_FIELD's showIf on) locks canSave false
      // forever, silently killing the live preview and the Save/Preview buttons.
      return f.optional || f.type === 'palette' ? true : f.type === 'multiColumn' ? (mapping[f.key] || []).length > 0 : f.type === 'select' || mapping[f.key];
    });

  // Shared create-or-update save, used by both runPreview (save-then-run) and
  // saveForDashboard (save-then-attach-to-dashboard) below, so the two flows can't drift.
  // Returns the full saved widget (not just its id) — DashboardCanvasEditor's
  // refreshChartDefinition needs the fresh name/chart_type/mapping (incl. mapping.style) to
  // sync into any dashboard placement of this same chart, since a placement's own local
  // copy of this data is otherwise never told a shared chart definition changed.
  const saveWidget = async () => {
    let widget;
    if (editingId) {
      widget = await updateWidget(editingId, { name: name.trim(), datasource_id: datasourceId, chart_type: chartType, mapping });
    } else {
      widget = await createWidget({ name: name.trim(), datasourceId, chartType, mapping });
      setEditingId(widget.id);
    }
    setDirty(false);
    await refreshList();
    // Covers create, update, AND Preview's own implicit first-save (runPreview always routes
    // through this) in one place — DashboardCanvasEditor.jsx's "Your Charts" panel picks this
    // up via its own subscribeWidgetsChanged listener.
    notifyWidgetsChanged();
    return widget;
  };

  // Explicit Save — separate from Preview, so saving doesn't force a query run every time
  // (and vice versa).
  const saveOnly = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const widget = await saveWidget();
      toast.success('Saved');
      // "Edit chart" from a dashboard placement (see DashboardBuilder.jsx's
      // handleEditInChartsTab) — the chart's already attached there, so saving just
      // returns to it instead of leaving the user on this now-done edit. Passes the fresh
      // widget back so the dashboard can sync its (otherwise stale) local copy of this
      // chart's definition — see DashboardCanvasEditor.jsx's refreshChartDefinition.
      if (returnToDashboard) onReturnToDashboard?.(widget);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Preview is available as soon as the form is configured (canSave), not only after an
  // explicit Save — there's no ad-hoc "run this unsaved chart_type/mapping" backend endpoint
  // (getStandaloneWidgetData only takes a persisted widget id), so an accurate preview of the
  // CURRENT mapping/chartType/datasource/name always saves first, whether this is a brand-new
  // widget or one that's already saved (and possibly placed on live dashboards) — there's no
  // way to query "as if saved" without actually saving. `isAuto` (set by the debounced
  // auto-refresh effect below, for every edit after the widget's first Preview) surfaces a
  // toast so that implicit persist is never silent, without a blocking confirmation
  // interrupting the edit — an explicit Preview click doesn't need that same toast, since the
  // user's own action already tells them something happened.
  const runPreview = async (isAuto = false) => {
    if (!canSave) return;
    const requestId = ++previewRequestIdRef.current;
    setRunning(true);
    setPreviewError(null);
    try {
      setRunStatus(isAuto ? 'Refreshing preview…' : 'Saving…');
      const widget = await saveWidget();
      if (isAuto) toast('Auto-saved for preview', { icon: '↻' });
      setRunStatus('Running query…');
      // KPI_CARD's own date filter (mapping.date_filter_column/range) — same reasoning as
      // DashboardCanvasEditor.jsx's own fetch effect: resolved and sent as a request-level
      // filter, never written into the saved mapping.filters (which the backend applies
      // literally, with no re-resolution). No dashboard context exists here at all (this is
      // the standalone preview, not a placed dashboard widget), so unlike the canvas version
      // there's no dashboard-global filter to merge with/exclude — just this card's own.
      const dateFilter = mapping.date_filter_column
        ? buildDateFilterFromPreset(mapping.date_filter_column, mapping.date_filter_range || 'Last 7 days')
        : null;
      const filters = dateFilter ? resolveFiltersForQuery([dateFilter]) : undefined;
      const data = await getStandaloneWidgetData(widget.id, { filters });
      // A newer run (e.g. the user changed another field while this one was still in
      // flight) already landed — discard this now-superseded response instead of
      // clobbering it.
      if (previewRequestIdRef.current !== requestId) return;
      setPreviewData(data);
      hasPreviewedRef.current = true;
      setRunStatus('');

      // "Compare to" — for the preset shifts, only possible here when a date_filter_column is
      // set (there's no dashboard-level filter to fall back to in this standalone preview,
      // unlike the canvas version's kpiEffectiveFilters). 'Custom' with LATEST doesn't need
      // dateFilter at all — it uses latest_by directly (see buildCustomComparisonFilters).
      // Best-effort: any failure just clears the delta rather than surfacing as a preview
      // error, since the base chart itself still loaded fine.
      const isLatestCustom = mapping.compare_to === 'Custom' && mapping.aggregation === 'LATEST';
      if ((chartType === 'KPI_CARD' || chartType === 'GAUGE') && mapping.compare_to && mapping.compare_to !== 'None' && (dateFilter || isLatestCustom)) {
        const compareFilters = mapping.compare_to === 'Custom'
          ? buildCustomComparisonFilters({
            filters: dateFilter ? [dateFilter] : [],
            customDate: mapping.compare_custom_date,
            customFrom: mapping.compare_custom_from,
            customTo: mapping.compare_custom_to,
            latestByColumn: isLatestCustom ? mapping.latest_by : null,
          })
          : buildComparisonFilters([dateFilter], mapping.compare_to);
        if (compareFilters) {
          try {
            const compareData = await getStandaloneWidgetData(widget.id, { filters: compareFilters });
            if (previewRequestIdRef.current !== requestId) return;
            const yAxis = mapping.y_axis;
            const currentVal = Number(data.rows?.[0]?.[yAxis]) || 0;
            const pastVal = Number(compareData.rows?.[0]?.[yAxis]) || 0;
            const delta = currentVal - pastVal;
            setPreviewComparison({ delta, deltaPercent: pastVal !== 0 ? (delta / pastVal) * 100 : null, deltaUp: delta >= 0 });
          } catch {
            if (previewRequestIdRef.current === requestId) setPreviewComparison(null);
          }
        } else {
          setPreviewComparison(undefined);
        }
      } else {
        setPreviewComparison(undefined);
      }
    } catch (err) {
      if (previewRequestIdRef.current !== requestId) return;
      setRunStatus('');
      setPreviewError(err.message);
    } finally {
      if (previewRequestIdRef.current === requestId) setRunning(false);
    }
  };

  // Purely cosmetic mapping fields — never sent to the backend as part of the query itself,
  // only read client-side by renderChartWidget (categoryAxisLabel/valueAxisLabel) off the
  // live `mapping` prop the preview below is already passed directly. That means an axis
  // title already re-renders on every keystroke with zero backend round trip — re-saving +
  // re-querying for it (see the auto-refresh effect below) is pure waste, and on a free-text
  // field triggers exactly the "auto-saves on every character" chatter this comment is
  // sitting next to fix. Any future purely-display-only mapping field belongs in this list.
  const COSMETIC_MAPPING_KEYS = ['x_axis_title', 'y_axis_title', 'x_axis_date_format', 'x_axis_tick_interval_value', 'x_axis_tick_interval_unit', 'truncate_y_axis', 'y_axis_min', 'y_axis_max', 'truncate_x_axis', 'x_axis_min', 'x_axis_max'];
  const queryRelevantMapping = JSON.stringify(
    Object.fromEntries(Object.entries(mapping).filter(([k]) => !COSMETIC_MAPPING_KEYS.includes(k))),
  );

  // Auto-refresh — once a widget has been explicitly Previewed at least once
  // (hasPreviewedRef), every later edit to what actually drives the query
  // (mapping/chartType/datasourceId — NOT `name`, which stays purely local until an explicit
  // Save or the next auto-save sweeps it in as a side effect) re-runs Preview shortly after
  // the user stops changing things, so the chart never sits mismatched against the current
  // form state waiting for a manual re-click. Debounced (600ms) so a quick sequence of edits
  // (e.g. picking X axis then Y axis) only triggers one request, not one per field. Keyed off
  // `queryRelevantMapping` (not `mapping` itself) so cosmetic-only edits — see above — don't
  // trigger this at all; the title still shows instantly via the live `mapping` prop, it just
  // doesn't force a save+requery to do it.
  useEffect(() => {
    if (!hasPreviewedRef.current || !canSave) return undefined;
    const t = setTimeout(() => { runPreview(true); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryRelevantMapping, chartType, datasourceId]);

  // Saves and hands the widget id back to the dashboard that requested it (see the
  // `prefill` effect above) instead of previewing — the chart gets placed on that
  // dashboard's canvas and the user is routed back to it (DashboardBuilder.jsx).
  const saveForDashboard = async () => {
    if (!canSave) return;
    setRunning(true);
    setSaveError(null);
    try {
      setRunStatus('Saving…');
      const widget = await saveWidget();
      toast.success('Saved');
      setRunStatus('');
      onSavedForDashboard(widget.id);
    } catch (err) {
      setRunStatus('');
      setSaveError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWidget(editingId);
      await refreshList();
      notifyWidgetsChanged();
      resetForm();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Delete straight from the list row — doesn't require opening the widget in the Data tab
  // first (unlike `remove` above, which only acts on whatever's currently loaded there).
  const deleteFromList = (widget) => setPendingConfirm({
    title: 'Delete Chart',
    // `widget.dashboard_count` — a real field on listWidgets()' own summary rows (the exact
    // row `widget` here is), so this needs no extra fetch, unlike the datasource-delete usage
    // check above (which has no equivalent count field and has to fetch+filter widgets
    // itself). ConfirmModal renders `message` inside a plain <p>, so this stays a string
    // rather than the richer icon+box treatment the datasource version uses.
    message: widget.dashboard_count
      ? `Delete "${widget.name}"? It's used on ${widget.dashboard_count} dashboard${widget.dashboard_count === 1 ? '' : 's'} — deleting it will remove it from all of them.`
      : `Delete "${widget.name}"? This removes it from the Chart Library and from any dashboard it's placed on.`,
    run: async () => {
      try {
        await deleteWidget(widget.id);
        await refreshList();
        notifyWidgetsChanged();
        if (editingId === widget.id) resetForm();
      } catch (err) {
        setSaveError(err.message);
      }
    },
  });

  // Shared with DashboardCanvasEditor.jsx's own "Your Charts" list and canvas-tile Duplicate
  // button — see duplicateWidget's own doc comment in dashboardBuilder-actions.js. Doesn't
  // touch the currently-open editor form, just refreshes the list so the new copy shows up.
  const duplicateFromList = async (widget) => {
    try {
      await duplicateWidget(widget.id);
      await refreshList();
      notifyWidgetsChanged();
    } catch (err) {
      setSaveError(err.message);
    }
  };

  // Same CSV export a placed dashboard widget's own download icon offers, just without a
  // `resolved` widget-props object to draw from (this chart isn't placed anywhere yet) — so
  // it fetches the standalone data fresh and exports it via the generic row-object path.
  const exportFromList = async (widget) => {
    try {
      const { rows } = await getStandaloneWidgetData(widget.id);
      exportRowsCSV(rows, widget.name);
    } catch (err) {
      setSaveError(err.message);
    }
  };

  // Drill-in/drill-up for the standalone preview — same mechanism DashboardCanvasEditor.jsx's
  // own fetchDrilledWidget uses (a fresh getStandaloneWidgetData call with `drillPath`, since
  // drilling is a query-time concept, not something baked into the saved widget), just against
  // `previewData` instead of a canvas widget's chartLibraryData entry. Preserves this preview's
  // own date filter (mapping.date_filter_column/range, if set) across drill levels the same
  // way the initial Preview fetch already applies it.
  const fetchPreviewAtDrillPath = async (drillPath) => {
    if (!editingId) return;
    const dateFilter = mapping.date_filter_column
      ? buildDateFilterFromPreset(mapping.date_filter_column, mapping.date_filter_range || 'Last 7 days')
      : null;
    const filters = dateFilter ? resolveFiltersForQuery([dateFilter]) : undefined;
    try {
      const data = await getStandaloneWidgetData(editingId, { filters, drillPath });
      setPreviewData(data);
    } catch (err) {
      setPreviewError(err.message);
    }
  };
  const handlePreviewPointClick = (point) => {
    const path = [...(previewData?.drillDown?.path || []), point.value];
    fetchPreviewAtDrillPath(path);
  };
  const handlePreviewDrillUp = (level) => {
    const path = (previewData?.drillDown?.path || []).slice(0, level);
    fetchPreviewAtDrillPath(path);
  };

  // Up/down icon pair, overlaid directly on the preview chart's own top-right corner (not the
  // toolbar far above it — that read as disconnected from the chart it actually controls).
  // Down drills into the top-ranked category (highest y_axis value among the current preview
  // rows), the same deterministic stand-in for "click a bar" the dashboard's own toolbar icon
  // uses (DashboardCanvasEditor.jsx's widget action row).
  const renderPreviewDrillControls = () => {
    if (!previewData?.drillDown?.enabled) return null;
    const path = previewData.drillDown.path || [];
    const canUp = path.length > 0;
    const xAxis = previewData.drillDown.dimension || mapping.x_axis;
    const yAxis = mapping.y_axis;
    const topRow = previewData.drillDown.has_next_level && previewData.rows?.length
      ? previewData.rows.reduce((best, r) => (best == null || Number(r[yAxis]) > Number(best[yAxis]) ? r : best), null)
      : null;
    return (
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={() => handlePreviewDrillUp(path.length - 1)}
          disabled={!canUp}
          title={canUp ? 'Up one level' : 'Already at the top level'}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 border border-slate-200 bg-white/95 hover:bg-slate-50 disabled:opacity-30 shadow-sm"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={() => topRow && handlePreviewPointClick({ value: String(topRow[xAxis]) })}
          disabled={!topRow}
          title={topRow ? `Drill into "${String(topRow[xAxis])}" (top result)` : 'No further level to drill into'}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 border border-slate-200 bg-white/95 hover:bg-slate-50 disabled:opacity-30 shadow-sm"
        >
          <ChevronDown size={13} />
        </button>
      </div>
    );
  };

  const renderPreview = () => {
    if (!previewData) return null;
    // Same component (and so the same right-click "Drill down into X / Drill up" menu) the
    // real dashboard canvas uses — previously this called renderChartWidget directly, which
    // meant drilling only ever worked once a chart was actually placed on a dashboard, not
    // while still configuring/previewing it here.
    return (
      <div className="relative h-full">
        {renderPreviewDrillControls()}
        <ChartLibraryWidgetView
          chartType={chartType} name={name} mapping={mapping} rows={previewData.rows}
          picked loading={false} error={null} height={440}
          // `mapping.style` alone still holds each 'show'/'hide' field as that raw string —
          // renderChartWidget.jsx's LineAreaChart/PieChart/etc. consumers expect the resolved
          // boolean (see DashboardCanvasEditor.jsx's own `extraStyle.showLegend !== 'hide'`
          // conversion for the real dashboard-canvas render path), so a toggle set here
          // previously had no visible effect — every string value, including the literal
          // "hide", is truthy.
          style={{
            ...(mapping.style || {}),
            donut: mapping.style?.donut === 'donut',
            showLegend: mapping.style?.showLegend !== 'hide',
            showDataPoints: mapping.style?.showDataPoints !== 'hide',
            showPercent: mapping.style?.showPercent !== 'no',
            showValueLabels: mapping.style?.showValueLabels !== 'hide',
          }}
          onPointClick={handlePreviewPointClick}
          onDrillUp={handlePreviewDrillUp}
          drillDown={previewData.drillDown}
          comparison={previewComparison}
        />
      </div>
    );
  };

  const showDimensionHint = DIMENSION_HINT_TYPES.has(chartType) && mapping.x_axis
    && columns.find((c) => c.column_name === mapping.x_axis)?.data_type?.match(/date|time|timestamp/i);

  // Latest-first, only fully-configured (datasource-attached) charts — shared with
  // DashboardCanvasEditor.jsx's "Your Charts" panel so both lists always match.
  const sortedWidgets = sortWidgetsByRecency(withDatasourceOnly(widgets));
  const {
    search: chartSearch, setSearch: setChartSearch,
    typeFilter: chartTypeFilter, setTypeFilter: setChartTypeFilter,
    visibleWidgets, typeOptions: sortedChartTypeOptions,
  } = useChartListFilter(sortedWidgets);

  return (
    <div className="flex gap-4 flex-1 min-h-0 h-full">
      {/* Left column: toolbar + preview canvas, stacked — the toolbar only spans THIS column's
          width, not the side panel's too (see the conversation this was reported in: it used
          to span the full width above both, pushing the side panel's own Data/Style/Charts
          tab strip down and wasting vertical space there for no reason, unlike
          DashboardBuilder.jsx's own dashboard editor, where the toolbar and the "Your Widgets"
          panel are independent siblings that both start at the very top). Own card chrome
          (rounded/border/shadow/backdrop-blur) rather than one shared card wrapping this and
          the side panel together — matches DashboardBuilder.jsx's own Dashboards-view row,
          where the preview panel and the dashboard-list sidebar are each their own card, not
          one card split in half. */}
      <div
        className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-xl backdrop-blur-md border border-white/60 shadow-lg p-3"
        style={{ background: 'rgba(255,255,255,0.55)' }}
      >
      {/* Top toolbar — same "actions live at the top" convention DashboardCanvasEditor.jsx
          uses for its own Save/Cancel/Export row, instead of buried below the form. `pb-2.5` +
          `border-b` is the only spacing between toolbar and content below (no separate `gap-3`
          stacking on top of it, unlike before, which doubled the visual gap) — matches
          DashboardBuilder.jsx's own dashboard-preview header's single-divider spacing. */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-2.5 border-b border-slate-100">
        {/* Same widget-name field as the Data tab's own "Widget Name" input (same
            name/setName/markDirty state) — mirrors DashboardCanvasEditor.jsx's own dashboard
            name input sitting in this exact toolbar slot, so the name is editable right here
            on the canvas side too, not only by switching to the Data tab. */}
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); markDirty(); }}
            placeholder="Widget name"
            className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 min-w-[180px] focus:outline-none focus:border-[#EC7D09] focus:ring-2 focus:ring-[#EC7D09]/20"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {prefill && (
            <button
              type="button"
              onClick={saveForDashboard}
              disabled={!canSave || running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 disabled:opacity-50"
            >
              {running ? (runStatus || 'Saving…') : 'Save & add to dashboard'}
            </button>
          )}
          {editingId && dirty && !saving && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={() => guardedRun(onCancel, 'Discard unsaved changes and leave without saving? This can\'t be undone.')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={saveOnly}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#EC7D09] disabled:opacity-50"
          >
            {saving ? 'Saving…' : returnToDashboard ? 'Save & return to dashboard' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => runPreview(false)}
            disabled={!canSave || running}
            title={!canSave ? 'Finish configuring the chart first' : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            <Play size={12} /> {running ? (runStatus || 'Running…') : 'Preview'}
          </button>
          {editingId && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          {editingId && confirmingDelete && (() => {
            // `dashboard_count` — a real field on listWidgets()' own summary rows now (no
            // extra call needed, unlike the datasource-delete usage check above, which had to
            // fetch+filter a whole separate list since datasources have no such field). Just
            // looked up from the already-loaded `widgets` state by id.
            const count = widgets.find((w) => w.id === editingId)?.dashboard_count || 0;
            return (
              <div className="flex flex-col gap-1.5">
                {count > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                    Used on {count} dashboard{count === 1 ? '' : 's'} — deleting it will remove it from all of them.
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Delete this widget?</span>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}
          <button
            type="button"
            onClick={handleNewWidgetClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#EC7D09] border border-[#EC7D09]/30 bg-white hover:bg-orange-50"
          >
            <Plus size={12} /> New widget
          </button>
        </div>
      </div>
      {(saveError || deleteError || previewError) && (
        <div className="flex flex-col gap-1.5 shrink-0 mt-3">
          {saveError && (
            <div className="flex items-center justify-between gap-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span>{saveError}</span>
              <button type="button" onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600 shrink-0">×</button>
            </div>
          )}
          {deleteError && (
            <div className="flex items-center justify-between gap-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span>{deleteError}</span>
              <button type="button" onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600 shrink-0">×</button>
            </div>
          )}
          {previewError && (
            <div className="flex items-center justify-between gap-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span>{previewError}</span>
              <button type="button" onClick={() => setPreviewError(null)} className="text-red-400 hover:text-red-600 shrink-0">×</button>
            </div>
          )}
        </div>
      )}

      {/* Preview canvas — the rest of this left column, below the toolbar. Dashed bordered
          box, matching DashboardCanvasEditor.jsx's own `.dbe-canvas-wrap` treatment exactly
          (border:1px dashed, rounded, padded) — the side panel deliberately has no border of
          its own (see below), same pairing as that editor's canvas/"Your Widgets" panel. */}
      <div className="flex-1 min-h-0 mt-3 flex flex-col border border-dashed border-slate-300 rounded-lg p-2 bg-white/40">
        {previewData ? (
          <div className="flex-1 min-h-0">{renderPreview()}</div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <BarChart3 size={28} className="text-slate-300" />
            <div className="text-sm font-medium text-slate-500">Configure a chart to preview</div>
            <div className="text-xs text-slate-400">pick a datasource and visualization type, then click Preview</div>
          </div>
        )}
      </div>
      </div>
      {/* Chart Editor — sibling of the left column above, not nested inside its own flex row —
          starts at the very top of this component's own bounding box, independent of the
          toolbar's height (matches DashboardCanvasEditor.jsx's own "Your Widgets" panel). One
          collapsible box (matches the reference "Style Editor" mockup:
          single panel, internal tab row) instead of three separate side-by-side boxes.
          Tabs: Data (name/datasource/chart type/field mapping), Style (this chart's own
          default style), Charts (the reusable chart list + New chart). */}
      <div
        className={`relative shrink-0 flex flex-col overflow-y-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg p-3 pl-5 ${
          isResizingPanel ? '' : 'transition-[width] duration-200'
        } ${panelCollapsed ? 'w-10 px-1' : ''}`}
        style={{ ...(panelCollapsed ? undefined : { width: panelWidth }), background: 'rgba(255,255,255,0.55)' }}
      >
        {/* Drag handle — a thin strip straddling the panel's own left border, widened past its
            visible 1px line so it's actually grabbable without needing pixel-perfect aim.
            Hidden while collapsed (nothing to resize — panelCollapsed forces a fixed w-10). */}
        {!panelCollapsed && (
          <div
            onMouseDown={startPanelResize}
            title="Drag to resize"
            className="absolute top-0 -left-1 w-2 h-full cursor-col-resize z-20 group"
          >
            <div className={`w-px h-full mx-auto transition-colors ${isResizingPanel ? 'bg-[#EC7D09]' : 'bg-transparent group-hover:bg-[#EC7D09]/60'}`} />
          </div>
        )}
        {/* Floating badge straddling the gap between this panel and the left column — same
          `.dbe-right-panel-toggle` treatment DashboardCanvasEditor.jsx's own "Your Widgets"
          panel uses (absolute, shifted left of the panel's own edge, own bordered/white
          background), not a row inside the panel's content flow — so it costs zero vertical
          space here and never needs the panel's own padding/content to make room for it. */}
        <button
          type="button"
          onClick={() => setPanelCollapsed((c) => !c)}
          title={panelCollapsed ? 'Expand' : 'Collapse'}
          className="absolute -left-3 top-0 w-[22px] h-[22px] rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-[#EC7D09] hover:border-[#EC7D09] transition-colors z-30 shadow-sm"
        >
          {panelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {panelCollapsed ? (
          <div className="flex flex-col items-center gap-3 mt-1">
            {[
              { id: 'data', label: 'Data', Icon: Settings2 },
              { id: 'style', label: 'Style', Icon: Palette },
              { id: 'charts', label: 'Charts', Icon: LayoutGrid },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => { setActiveTab(id); setPanelCollapsed(false); }}
                className="text-slate-400 hover:text-[#EC7D09] transition-colors"
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-1 flex flex-col gap-3 min-h-0 flex-1">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
              {[
                { id: 'data', label: 'Data', Icon: Settings2 },
                { id: 'style', label: 'Style', Icon: Palette },
                { id: 'charts', label: 'Charts', Icon: LayoutGrid },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeTab === id ? 'bg-[#0b1830] text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {activeTab === 'data' && (
              <div className="flex flex-col gap-4 overflow-y-auto">
                {detailLoading && <div className="text-xs text-slate-400">Loading widget…</div>}

                {/* No card here, unlike the collapsible sections below — Widget Name/Data
                    Source are always-visible identity fields (nothing to fold away), set apart
                    instead by a tinted input background rather than a bordered box. */}
                <div className="flex flex-col gap-3 w-full">
                  <label className="text-xs font-medium text-slate-600">
                    Widget Name
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); markDirty(); }}
                      placeholder="e.g. Traffic by Cell"
                      className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-transparent bg-orange-50 text-xs"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Data Source
                    <select
                      value={datasourceId}
                      onChange={(e) => onDatasourceChange(e.target.value)}
                      className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-transparent bg-orange-50 text-xs font-medium"
                    >
                      <option value="">Select a datasource</option>
                      {datasources.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </label>
                </div>

                <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white w-full">
                  <button
                    type="button"
                    onClick={() => setVizTypeCollapsed((c) => !c)}
                    className="flex items-center justify-between text-xs font-semibold text-[#EC7D09] uppercase tracking-wide"
                  >
                    Visualization Type
                    {vizTypeCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  {!vizTypeCollapsed && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {CHART_TYPES.map((t) => {
                        const meta = CHART_TYPE_META[t];
                        const Icon = meta.icon;
                        const active = chartType === t;
                        const button = (
                          <button
                            type="button"
                            onClick={() => onChartTypeChange(t)}
                            className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[0.625rem] leading-tight transition-colors w-full ${
                              active ? 'border-[#EC7D09] bg-orange-50' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={18} color={meta.color} />
                            <span className="text-slate-600 text-center">{meta.label}</span>
                          </button>
                        );
                        // Styled popup ("best for X") instead of the plain native browser
                        // tooltip `title` used to fall back to — see chartTypeMeta.js's own
                        // comment on why this needs to be visible at pick-time, not discovered
                        // later by trial and error.
                        return (
                          <CustomTooltip key={t} text={meta.description || meta.label} wrap>{button}</CustomTooltip>
                        );
                      })}
                    </div>
                  )}
                </div>

                <MappingFields
                  fields={fields}
                  value={mapping}
                  onChange={onMappingChange}
                  columns={columns}
                  columnsLoading={columnsLoading}
                  styleValue={mapping.style || {}}
                  onStyleChange={(key, val) => { setMapping((prev) => ({ ...prev, style: { ...(prev.style || {}), [key]: val } })); markDirty(); }}
                />

                {showDimensionHint && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    This dimension looks like a raw timestamp — charts with many unique labels can render unreadably. Consider a lower-cardinality column (a category/name field) for a cleaner chart.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'style' && (
              // This chart's own default style — stored in mapping.style (mapping is already
              // a free-form JSON bag server-side, no schema change needed to add this key).
              // Seeds every new placement of this chart on any dashboard
              // (DashboardCanvasEditor.jsx's addWidget reads it), taking priority over the
              // dashboard's own style defaults since it's more specific to this one chart — a
              // per-placement Style edit in the editor still wins over both, same override
              // order used everywhere else in this cascade.
              <div className="overflow-y-auto">
                {Object.keys(mapping.style || {}).length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    className="mb-2.5"
                    onClick={() => setPendingConfirm({
                      title: 'Reset Chart Style',
                      message: "Reset this chart's default style? This clears all style overrides saved with it.",
                      run: () => setMapping((prev) => ({ ...prev, style: {} })),
                    })}
                  >
                    Reset to Default
                  </Button>
                )}
                <WidgetStyleFields
                  fields={chartLibraryStyleFieldsFor(chartType)}
                  value={mapping.style || {}}
                  onChange={(key, val) => setMapping((prev) => ({ ...prev, style: { ...(prev.style || {}), [key]: val } }))}
                  resolvedDefaults={{
                    bgColor: resolvedBgColor,
                    titleColor: resolvedSubColor,
                    valueTextColor: resolvedTextColor,
                    axisTextColor: resolvedSubColor,
                  }}
                  columns={2}
                />
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="flex flex-col gap-2 overflow-y-auto">
                <div className="flex items-center gap-1.5 mb-1">
                  <button
                    type="button"
                    onClick={handleNewWidgetClick}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#EC7D09] hover:opacity-80 shrink-0"
                  >
                    <Plus size={14} /> New widget
                  </button>
                  <ChartListSearchBar
                    search={chartSearch}
                    onSearchChange={setChartSearch}
                    typeFilter={chartTypeFilter}
                    onTypeFilterChange={setChartTypeFilter}
                    typeOptions={sortedChartTypeOptions}
                  />
                </div>
                {listLoading && <div className="text-xs text-slate-400 text-center mt-4">Loading…</div>}
                {listError && <div className="text-xs text-red-500 px-1">{listError}</div>}
                {visibleWidgets.map((w) => (
                  <ChartListItem
                    key={w.id}
                    widget={w}
                    selected={editingId === w.id}
                    onClick={() => guardedRun(() => editWidget(w))}
                    onDelete={() => deleteFromList(w)}
                    onDuplicate={() => duplicateFromList(w)}
                    onExport={() => exportFromList(w)}
                    datasourceNamesById={datasourceNamesById}
                  />
                ))}
                {!listLoading && sortedWidgets.length === 0 && (
                  <div className="text-xs text-slate-400 text-center mt-4">No widgets yet.</div>
                )}
                {!listLoading && sortedWidgets.length > 0 && visibleWidgets.length === 0 && (
                  <div className="text-xs text-slate-400 text-center mt-4">
                    No charts match{chartSearch.trim() ? ` "${chartSearch.trim()}"` : ''}{chartTypeFilter ? ` in ${CHART_TYPE_META[chartTypeFilter]?.label || chartTypeFilter}` : ''}.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    <ConfirmModal
      isOpen={!!pendingConfirm}
      title={pendingConfirm?.title}
      message={pendingConfirm?.message}
      onCancel={() => setPendingConfirm(null)}
      onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null); }}
    />
    </div>
  );
});

export default ChartLibrary;
