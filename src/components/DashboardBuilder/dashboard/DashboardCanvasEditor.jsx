import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Copy, Download, Pencil, Palette } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import Button from '../../Button';
import ConfirmModal from '../../ConfirmModal';
import WIDGET_TYPE_REGISTRY, { resolveWidgetStyle, CHART_TYPE_EXTRA_STYLE_FIELDS, chartLibraryStyleFieldsFor } from '../widgetConfig/widgetTypeRegistry';
import MOCK_DATA_SOURCES from '../legacy/mock/mockDataSources';
import WidgetStyleFields from '../widgetConfig/WidgetStyleFields';
import PaletteEditor from '../themes/PaletteEditor';
import SeriesColorFields from '../widgetConfig/SeriesColorFields';
import { useTheme } from '../../../context/ThemeContext';
import { chartTokens, CHART_PALETTE, darkenHex } from '../../../theme/tokens';
import { DEFAULT_STATUS_COLORS, STATUS_LABELS } from '../legacy/widgets/KpiTable';
import { exportWidgetCSV, exportWidgetPNG, exportDashboardCSV, exportDashboardPNG, exportDashboardPDF, exportRowsCSV } from '../utils/exportUtils';
import { loadDatasources } from '../datasource/dashboardDatasources';
import { aggregateDatasourceRows } from '../legacy/mock/dbDataSource';
import {
  listWidgets as listChartLibraryWidgets, getWidgetDetail as getChartLibraryWidgetDetail, getStandaloneWidgetData,
  deleteWidget as deleteChartLibraryWidget,
  duplicateWidget as duplicateChartLibraryWidgetDef,
  getDatasourceDetail as getChartDatasourceDetail, getDashboardData, getWidgetData, updateDashboard, listDatasources as listBackendDatasources,
  listThemes as listBackendThemes, getThemeDetail,
} from '../../../store/actions/dashboardBuilder-actions';
import { subscribeWidgetsChanged, notifyWidgetsChanged } from '../../../store/actions/widgetEvents';
import CHART_TYPE_META, { MOCK_TYPE_TO_CHART_TYPE } from '../charts/chartTypeMeta';
import ChartListItem from '../charts/ChartListItem';
import WidgetCreateWizard from '../charts/WidgetCreateWizard';
import DASHBOARD_STYLE_FIELDS from '../themes/dashboardStyleFields';
import FilterPanel from '../filters/FilterPanel';
import FiltersToggleButton from '../filters/FiltersToggleButton';
import { sortWidgetsByRecency, withDatasourceOnly } from '../charts/sortWidgets';
import { resolveFiltersForQuery, buildComparisonFilters, buildCustomComparisonFilters, buildDateFilterFromPreset } from '../utils/resolveTimeRange';

// Widget types whose legend/slice colors come from the shared theme palette (cycling by
// position) — Phase 8b lets each of these pin a specific color per category name instead.
const CATEGORY_COLOR_TYPES = new Set(['stackedBarChart', 'pieChart', 'funnelChart', 'treemapChart', 'kpiTable']);

/** Category names for a selected widget's SeriesColorFields picker — shape differs per
 * type (see widgetTypeRegistry.js's Phase 8b design note): chart types derive names from
 * their currently-resolved data; kpiTable's are a fixed constant set. */
function categoryNamesFor(type, resolved) {
  if (type === 'stackedBarChart') return (resolved.series || []).map((s) => s.name);
  if (type === 'pieChart' || type === 'funnelChart' || type === 'treemapChart') return (resolved.data || []).map((d) => d.label);
  if (type === 'kpiTable') return Object.keys(STATUS_LABELS);
  return [];
}

let uid = 0;
const nextId = () => `w${Date.now()}_${uid++}`;

// Must match the rowHeight/margin passed to <ResponsiveGridLayout> below (cols varies per
// breakpoint via COLS_BY_BREAKPOINT, but rowHeight/margin stay constant) — kept as one
// constant so per-widget pixel heights (for chart components that need an explicit height
// prop) stay in sync with the actual grid math.
// rowHeight/margin[1] set the vertical resize step: 24px (20 + 4) — fine enough that a
// widget's grid cell can land close to its actual content height instead of being stuck
// between two coarse 48px increments.
// rowHeight/margin[1] set the vertical resize step: 6px (5 + 1) — halved again from the
// previous 12px so widgets can be resized in even smaller, more precise increments.
// cols:144 (12x the visual 12-column layout) gives a much finer horizontal resize step —
// colWidth = containerWidth / cols, so more columns means each x/w unit is fewer pixels.
// margin[0] stays 8 (unchanged) so same-row card-to-card gaps don't shift.
const GRID_CONFIG = { cols: 144, rowHeight: 5, margin: [8, 1] };

// Below ~900px, a plain GridLayout just shrinks colWidth instead of reflowing — every
// widget keeps its desktop column-span and squeezes into unreadable slivers, and (in an
// earlier version of this file) widgets rendered through a separate hand-rolled static
// "stacked" fallback that was never wired for interactivity — no select/copy/delete/drag
// below the breakpoint. Replaced with react-grid-layout's own ResponsiveGridLayout: same
// underlying drag/resize/drop machinery at every width (so nothing loses interactivity),
// just with fewer columns at narrower breakpoints so widgets actually reflow to
// near-full-width instead of squeezing. BREAKPOINTS keys must match COLS_BY_BREAKPOINT's.
const BREAKPOINTS = { lg: 900, md: 600, sm: 0 };
const COLS_BY_BREAKPOINT = { lg: GRID_CONFIG.cols, md: 72, sm: 36 };

// Best-fit slot finder for a newly added widget — without this, a new widget always landed
// at x:0 one row below the tallest existing widget, ignoring any free horizontal space next
// to shorter widgets already on the canvas. Candidate y's are every existing widget's top and
// bottom edge (the only rows a new "shelf" could start at) plus a fresh row below everything.
// For each candidate row, find the leftmost x wide enough with no rectangle overlap, then pick
// the row that wastes the least leftover width — not just the first row that merely fits — so
// a new widget prefers slotting tightly into an existing row over opening a near-empty new one.
function findFreeSlot(layout, w, h, cols) {
  const maxY = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
  const candidateYs = new Set([0, maxY]);
  layout.forEach((l) => { candidateYs.add(l.y); candidateYs.add(l.y + l.h); });
  const ys = [...candidateYs].sort((a, b) => a - b);

  let best = null; // { x, y, leftover }
  for (const y of ys) {
    for (let x = 0; x + w <= cols; x++) {
      const overlaps = layout.some((l) => x < l.x + l.w && x + w > l.x && y < l.y + l.h && y + h > l.y);
      if (!overlaps) {
        const leftover = cols - (x + w);
        if (!best || leftover < best.leftover || (leftover === best.leftover && y < best.y)) {
          best = { x, y, leftover };
        }
        break; // leftmost fit for this row is the only one worth scoring
      }
    }
  }
  return best ? { x: best.x, y: best.y } : { x: 0, y: maxY };
}

const dataSourceKeysFor = (dataShape) =>
  Object.entries(MOCK_DATA_SOURCES)
    .filter(([, ds]) => ds.dataShape === dataShape)
    .map(([key, ds]) => ({ key, label: ds.label }));

/** Reads a dot-path (e.g. "stats.0", "kpiTableProps") off a live-data object. */
function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/**
 * Maps a widget's { type, dataSource, title, style } to the props its component expects.
 * `dataSource.type === 'kpiLive'` reads from the dashboard's already-fetched live data
 * (via `dataSource.field`) instead of the mock generators. `style` values come from
 * resolveWidgetStyle (widgetTypeRegistry.js), already merged with the type's styleFields
 * defaults — see WidgetStyleFields.jsx for where a widget's `style` object is edited.
 */
function resolveWidgetProps(widget, ctx) {
  const { type, dataSource, title } = widget;
  const {
    kpiLiveData, pixelHeight, isDark, titleColor: dashboardTitleColor, bgColor: dashboardBgColor,
    titleWeight: dashboardTitleWeight, titleSize: dashboardTitleSize, titleFont: dashboardTitleFont,
    palette: dashboardPalette, accentColor: dashboardAccentColor, titlePosition: dashboardTitlePosition,
    axisTextColor: dashboardAxisTextColor, axisTextWeight: dashboardAxisTextWeight,
    axisTextSize: dashboardAxisTextSize, axisTextFont: dashboardAxisTextFont,
    bgGradientFrom: dashboardBgGradientFrom, bgGradientTo: dashboardBgGradientTo,
    valueDecimals: dashboardValueDecimals,
    widgetId, onPointClick: onWidgetPointClick, onDrillUp: onWidgetDrillUp,
  } = ctx || {};
  // For a real (chartLibrary) widget, its own definition — edited via the Charts tab,
  // stored in dataSource.mapping.style — is the base default for EVERY placement of that
  // chart, the same way a Theme is a base default for a dashboard. This dashboard
  // placement's own per-widget style (edited via this editor's side panel) still wins
  // where it sets a key. Without this merge, a Charts-tab style edit only ever affected a
  // chart at the moment it was first placed (a one-time seed), never any dashboard it was
  // already sitting on — the exact "one edit path, works everywhere" cascade every other
  // style field here already follows (theme -> dashboard -> widget).
  const baseStyle = dataSource?.type === 'chartLibrary'
    ? { ...(dataSource.mapping?.style || {}), ...(widget.style || {}) }
    : widget.style;
  const style = resolveWidgetStyle(type, baseStyle);

  let resolved = {};
  if (dataSource?.type === 'kpiLive') {
    const raw = getByPath(kpiLiveData, dataSource.field);
    resolved = type === 'degradedCellsTable' || type === 'degradedCellsMap' ? { rows: raw || [] } : (raw || {});
  } else if (dataSource?.type === 'chartLibrary') {
    // Real backend widget, fetched asynchronously by the caller (see chartLibraryDataCache
    // in DashboardCanvasEditor's own state/effects below) — this just reads whatever's
    // already been fetched, same as kpiLiveData's already-fetched-elsewhere pattern.
    const entry = ctx?.chartLibraryData?.[dataSource.widgetId];
    resolved = {
      picked: !!dataSource.widgetId,
      chartType: dataSource.chartType,
      mapping: dataSource.mapping,
      rows: entry?.rows,
      drillDown: entry?.drillDown,
      drilling: !!entry?.drilling,
      comparison: entry?.comparison,
      loading: !!dataSource.widgetId && !entry,
      error: entry?.error,
    };
  } else if (dataSource?.type === 'db') {
    // No confirmed backend endpoint yet for real query execution (see the plan's Phase 10
    // notes) — aggregates the registered datasource's own cached sample_rows client-side
    // instead, via the same mapping the widget's DataMappingFields panel wrote. A real
    // stand-in for visual/testing purposes now; swap for a live API call once that endpoint
    // is confirmed, without touching anything else (this is the only place that changes).
    const cacheKey = `db:${dataSource.datasourceId}:${JSON.stringify(dataSource.mapping || {})}`;
    const cache = ctx?.dataCache;
    if (cache?.has(cacheKey)) {
      resolved = cache.get(cacheKey);
    } else {
      const ds = ctx?.datasources?.find((d) => d.id === dataSource.datasourceId);
      resolved = ds ? aggregateDatasourceRows(WIDGET_TYPE_REGISTRY[type]?.dataShape, dataSource.mapping || {}, ds.sampleRows || []) : {};
      cache?.set(cacheKey, resolved);
    }
  } else {
    // Cached per dataSource.key (see ctx.dataCache, a Map held in a ref by the caller) —
    // without this, `generate()` re-runs its Math.random() calls on *every* render of
    // *every* widget, not just when the data source actually changes. Harmless at rest,
    // but during a drag, react-grid-layout re-renders the grid on every dragover tick
    // (many times a second) — that meant every chart's mock data was being reshuffled and
    // every ECharts instance fully re-initialized dozens of times a second, which is what
    // made dragging feel slow. Caching turns those re-renders back into cheap no-ops.
    const cacheKey = `mock:${dataSource?.key}`;
    const cache = ctx?.dataCache;
    if (cache?.has(cacheKey)) {
      resolved = cache.get(cacheKey);
    } else {
      const ds = MOCK_DATA_SOURCES[dataSource?.key];
      resolved = ds ? ds.generate() : {};
      cache?.set(cacheKey, resolved);
    }
  }

  // Dashboard-level accentColor sits between the widget's own explicit color and whatever
  // the mock data generator happened to pick — previously this field was only ever read as
  // a one-time seed for brand-new widgets (see addWidget's defaultColor), never live here,
  // so changing it in the Dashboard Style popover never affected an already-placed widget.
  const finalColor = style.color || dashboardAccentColor || resolved.color;
  // A dashboard-level titleColor (e.g. the KPI dashboard's own "Customize colors" panel,
  // passed in via the `titleColor` prop on DashboardCanvasEditor) is the fallback when a
  // widget hasn't set its own style.titleColor override.
  const finalTitleColor = style.titleColor || dashboardTitleColor;
  // Same live fallback for background — previously bgColor had none at all (every render
  // case below used `style.bgColor` raw), so a Theme/dashboard-level background never showed
  // up on an existing widget even when its own style.bgColor was genuinely unset.
  const finalBgColor = style.bgColor || dashboardBgColor;
  // Item 9 — two-stop background gradient, cascading the same way bgColor does (per-widget
  // override wins, then theme/dashboard). Mutually exclusive with bgColor at render time —
  // each widget component checks bgGradient first, only falling back to bgColor if unset.
  const bgGradientFrom = style.bgGradientFrom || dashboardBgGradientFrom;
  const bgGradientTo = style.bgGradientTo || dashboardBgGradientTo;
  const finalBgGradient = (bgGradientFrom || bgGradientTo) ? [bgGradientFrom, bgGradientTo] : null;
  // Same live fallback for title weight/size — these had NO mechanism at all anywhere in the
  // rendering pipeline before now (not even a "seed once at creation" one): no widget type
  // declared them as a real styleField, and no Widgets/*.jsx component accepted a
  // titleWeight/titleSize prop, so the Dashboard Level Theme's Text Styling section was
  // entirely inert regardless of what was picked.
  const finalTitleWeight = style.titleWeight || dashboardTitleWeight;
  const finalTitleSize = style.titleSize || dashboardTitleSize;
  const finalTitleFont = style.titleFont || dashboardTitleFont;
  const finalTitlePosition = style.titlePosition || dashboardTitlePosition;
  // Resolved series/slice palette for multi-series chart types (Pie/Stacked Bar/Funnel/
  // Treemap) — a bound Theme's own `palette` (if set) wins, falling back to the app-wide
  // static CHART_PALETTE default, same override order every other style field here uses.
  // Always resolves to a real array (never undefined) so each chart component's explicit
  // per-index color assignment always has something to cycle through.
  const finalPalette = dashboardPalette || CHART_PALETTE;
  // Chart widgets need an explicit pixel height (ECharts doesn't fill a resizable
  // container on its own) — leave room for the widget's own title row + chrome.
  const chartHeight = pixelHeight ? Math.max(60, pixelHeight - 40) : undefined;

  // Shared by every widget with VALUE_TEXT_STYLE_FIELDS/AXIS_TEXT_STYLE_FIELDS
  // (widgetTypeRegistry.js) — the "the number/label this chart is actually showing"
  // and "the axis labels" color+size overrides, respectively.
  // `??` (not `||`) since 0 decimal places is a meaningful, valid value that must not be
  // clobbered by the fallback chain — defaults to 2 when neither the widget nor the theme/
  // dashboard has ever set one.
  const finalValueDecimals = style.valueDecimals ?? dashboardValueDecimals ?? 2;
  const valueText = { valueTextColor: style.valueTextColor, valueTextSize: style.valueTextSize, valueDecimals: finalValueDecimals };
  // Axis styling now cascades from the theme/dashboard level the same way title styling
  // already does — previously these were per-widget-only (`style.axisTextColor` raw, no
  // fallback), so a Theme's axis settings were entirely inert.
  const axisText = {
    axisTextColor: style.axisTextColor || dashboardAxisTextColor,
    axisTextWeight: style.axisTextWeight || dashboardAxisTextWeight,
    axisTextSize: style.axisTextSize || dashboardAxisTextSize,
    axisTextFont: style.axisTextFont || dashboardAxisTextFont,
  };

  // `__resolved` is attached below (after this switch) so callers that need the raw
  // resolved data for something generic across all types (CSV export — see exportUtils.js)
  // don't have to duplicate resolveWidgetProps' own data-fetch/cache logic. It's stripped
  // back out before spreading onto the actual widget component (WidgetTile does this).
  const typeProps = (() => {
  switch (type) {
    case 'statCard': {
      // "Shade from"/"Shade to" are the same two literal gradient corners the real KPI
      // dashboard's own "Customize colors" panel exposes (KpiMonitoringDashboard.jsx's
      // "Shaded Cards" section, dark from/dark to) — user-picked directly, not computed.
      // Falls back to darkenHex(color) when only one corner is set, so picking just one
      // still produces a real two-stop gradient instead of a flat/invalid one. "From" is
      // the lighter stop, "to" the darker one — matching the real KPI dashboard's own
      // presets (e.g. rna: darkFrom '#2a415b' lighter than darkTo '#1c253a').
      const shadeGradient = (style.shadeFrom || style.shadeTo)
        ? [style.shadeFrom || darkenHex(finalColor, 0.55), style.shadeTo || darkenHex(finalColor, 0.8)]
        : null;
      return {
        label: resolved.label ?? title, fullName: resolved.fullName, value: resolved.value, unit: style.unit || resolved.unit,
        delta: resolved.delta, deltaUp: resolved.deltaUp, icon: resolved.icon,
        color: finalColor, darkGradient: shadeGradient || resolved.darkGradient, isDark, bgColor: finalBgColor, bgGradient: finalBgGradient, valuePosition: style.valuePosition, ...valueText,
      };
    }
    case 'gaugeCard':
      return { title, value: resolved.value, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText };
    case 'sparklineCard':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, valuePosition: style.valuePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText, ...axisText };
    case 'barChart':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, valuePosition: style.valuePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText, ...axisText };
    case 'pieChart':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, donut: style.donut === 'donut', showValueLabels: style.showValueLabels !== 'hide', height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText, seriesColors: widget.style?.seriesColors, palette: finalPalette };
    case 'horizontalBarChart':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, limit: style.limit, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText, ...axisText };
    case 'areaChart':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, valuePosition: style.valuePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText, ...axisText };
    case 'heatmapChart':
      return { title, unit: resolved.unit, days: resolved.days, hours: resolved.hours, data: resolved.data, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, valueDecimals: finalValueDecimals, ...axisText };
    case 'funnelChart':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText, seriesColors: widget.style?.seriesColors, palette: finalPalette };
    case 'waterfallChart':
      return {
        title: resolved.title ?? title, unit: resolved.unit, data: resolved.data,
        upColor: style.upColor, downColor: style.downColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, valueDecimals: finalValueDecimals, ...axisText,
      };
    case 'treemapChart':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, ...valueText, seriesColors: widget.style?.seriesColors, palette: finalPalette };
    case 'scatterChart':
      return {
        title: resolved.title ?? title, unit: resolved.unit, data: resolved.data,
        xLabel: resolved.xLabel, yLabel: resolved.yLabel, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, valueDecimals: finalValueDecimals, ...axisText,
      };
    case 'stackedBarChart':
      return {
        title: resolved.title ?? title, unit: resolved.unit, categories: resolved.categories, series: resolved.series,
        height: chartHeight, isDark, titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, valueDecimals: finalValueDecimals, ...axisText, seriesColors: widget.style?.seriesColors, palette: finalPalette,
      };
    case 'kpiTable':
      return {
        rows: resolved.rows || [],
        // `resolved.statusColors` (kpiLive — the real KPI dashboard's own live color
        // picker) wins when present; otherwise fall back to this widget's own
        // SeriesColorFields picker (Phase 8b), merged over the component's own defaults
        // so any status the user hasn't explicitly recolored still shows something sane.
        statusColors: resolved.statusColors || (widget.style?.seriesColors ? { ...DEFAULT_STATUS_COLORS, ...widget.style.seriesColors } : undefined),
        trendRenderer: resolved.trendRenderer,
        rowTextColor: style.rowTextColor, rowFontWeight: style.rowFontWeight, rowFontSize: style.rowFontSize, bgColor: finalBgColor, bgGradient: finalBgGradient,
      };
    case 'degradedCellsTable':
      return { rows: resolved.rows || [], rowTextColor: style.rowTextColor, rowFontWeight: style.rowFontWeight, rowFontSize: style.rowFontSize };
    case 'degradedCellsMap':
      return { rows: resolved.rows || [] };
    case 'chartLibrary': {
      // Extra per-chart_type style fields (donut/legend — see widgetTypeRegistry.js) aren't
      // part of chartLibrary's own static styleFields (that's a per-widgetType concept;
      // these depend on which real chart_type this instance is bound to), so they're
      // resolved separately here and merged into the style object passed down.
      const extraFields = CHART_TYPE_EXTRA_STYLE_FIELDS[resolved.chartType] || [];
      // Uses `baseStyle` (chart's own saved mapping.style, then this placement's widget.style
      // on top — see baseStyle above), not just `widget.style` alone — otherwise a color/
      // donut/legend/unit edit made in the Chart Library's own Style tab would only ever seed
      // a newly-placed copy of the chart, never update one already sitting on a dashboard,
      // unlike every other style field here (titleColor/bgColor/etc.) which already cascades
      // correctly through `style = resolveWidgetStyle(type, baseStyle)` above.
      const extraStyle = resolveWidgetStyle(type, baseStyle, extraFields);
      return {
        picked: resolved.picked, chartType: resolved.chartType, mapping: resolved.mapping,
        rows: resolved.rows, loading: resolved.loading, error: resolved.error,
        name: title, height: chartHeight,
        // The backend's own drill_down.{enabled,has_next_level,hierarchy,path,level} for this
        // widget's current (possibly already-drilled) response — drives the breadcrumb and
        // whether a click drills vs. cross-filters (see handleWidgetPointClickRef's own check
        // in DashboardCanvasEditor, which reads this same entry).
        drillDown: resolved.drillDown,
        drilling: resolved.drilling,
        // KPI_CARD's "Compare to" — { delta, deltaPercent, deltaUp } | null (fetch failed) |
        // undefined (no compare_to set, or still loading) — see the comparisonData fetch
        // effect above. renderChartWidget.jsx's KPI_CARD case turns this into StatCard's
        // existing delta/deltaUp props, formatted per mapping.style.delta_format.
        comparison: resolved.comparison,
        onDrillUp: resolved.drillDown?.path?.length && onWidgetDrillUp
          ? (level) => onWidgetDrillUp(dataSource.widgetId, level)
          : undefined,
        // Cross-filtering (BAR/PIE/LINE/AREA only, first cut) — only wired when this
        // placement has explicitly opted in as a source (see CROSS_FILTER_FIELDS in
        // widgetTypeRegistry.js), OR when the backend says this widget can drill further —
        // a click only ever means one of the two, never both (see handleWidgetPointClickRef,
        // which checks drill_down first). `onWidgetPointClick` is a single stable callback
        // from DashboardCanvasEditor (see its own ref-backed useCallback), never recreated
        // here, so this doesn't defeat WidgetContent's memoization.
        onPointClick: (extraStyle.crossFilterSource === 'on' || resolved.drillDown?.enabled) && onWidgetPointClick
          ? (point) => onWidgetPointClick(widgetId, point)
          : undefined,
        style: {
          titleColor: finalTitleColor, titleWeight: finalTitleWeight, titleSize: finalTitleSize, titleFont: finalTitleFont, titlePosition: finalTitlePosition, bgColor: finalBgColor, bgGradient: finalBgGradient, palette: finalPalette, ...valueText, ...axisText,
          donut: extraStyle.donut === 'donut',
          showLegend: extraStyle.showLegend !== 'hide',
          unit: extraStyle.unit,
          // Same fallback chain as finalColor above (mock-widget path) — the chart's own
          // accent/gradient field wins, else the dashboard-level accentColor, else each
          // Widgets/*.jsx component's own hardcoded default.
          color: extraStyle.color || dashboardAccentColor,
          colorFrom: extraStyle.colorFrom,
          colorTo: extraStyle.colorTo || dashboardAccentColor,
          // No dashboard-level fallback — valuePosition isn't a DASHBOARD_STYLE_FIELDS entry
          // (only 4 real chart_types even have a movable value element), so it's chart-base
          // -> placement-override only, same as extraStyle's other per-chart_type fields.
          valuePosition: extraStyle.valuePosition,
        },
      };
    }
    default:
      return {};
  }
  })();
  return { ...roundTypeProps(typeProps, finalValueDecimals), __resolved: resolved };
}

// Rounds whatever raw numeric values ended up in a widget-type case's returned props (a
// StatCard/Gauge's single `value`, a bar/pie/etc.'s `data` array of {value}/{x,y}/[x,y,v]
// entries, a stacked-bar's `series[].data` arrays) to `decimals` places — applied once,
// generically, after the big switch above rather than touching all 13 cases individually.
// Only ever touches known numeric-value shapes; anything else (titleSize, kpiTable's `rows`,
// chartLibrary's raw `rows`, which renderChartWidget.jsx rounds itself) passes through
// untouched.
function roundValueNumber(v, decimals) {
  return typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(decimals)) : v;
}
function roundTypeProps(props, decimals) {
  if (!props || typeof props !== 'object') return props;
  const next = { ...props };
  if (typeof next.value === 'number') next.value = roundValueNumber(next.value, decimals);
  if (Array.isArray(next.data)) {
    next.data = next.data.map((d) => {
      if (typeof d === 'number') return roundValueNumber(d, decimals);
      if (Array.isArray(d)) return d.map((v, i) => (i === d.length - 1 ? roundValueNumber(v, decimals) : v));
      if (d && typeof d === 'object') {
        return {
          ...d,
          ...(d.value !== undefined ? { value: roundValueNumber(d.value, decimals) } : {}),
          ...(d.x !== undefined ? { x: roundValueNumber(d.x, decimals) } : {}),
          ...(d.y !== undefined ? { y: roundValueNumber(d.y, decimals) } : {}),
        };
      }
      return d;
    });
  }
  if (Array.isArray(next.series)) {
    next.series = next.series.map((s) => (
      s && Array.isArray(s.data) ? { ...s, data: s.data.map((v) => roundValueNumber(v, decimals)) } : s
    ));
  }
  return next;
}

function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width || 800);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Isolates each widget's actual data-resolution + rendering from the rest of the canvas —
// without this, `renderWidget` (a plain function, not a component) re-ran resolveWidgetProps
// and re-rendered *every* widget's own component on *any* canvas state change (selecting a
// widget, dragging/resizing any widget, opening a menu — anything that re-renders
// DashboardCanvasEditor itself). Chart widgets barely notice — they hand off to ECharts,
// which diffs its own canvas/SVG internally — but a Table widget with a few hundred real
// `<tr>` rows paid a full DOM reconcile + layout/paint on every one of those unrelated
// events, which is what made selecting/resizing it specifically feel laggy. `React.memo`
// here means this only redoes that work when *this* widget's own inputs actually changed —
// `widget` itself keeps a stable object reference across renders unless it was the one just
// edited (see updateWidget's `{...prev, [id]: ...}` merge, which leaves every other widget's
// reference untouched), and every other prop here is either a primitive or a single
// already-resolved cache entry (chartLibraryEntry), not a fresh object built fresh per render.
const WidgetContent = React.memo(function WidgetContent({
  widget, pixelHeight, kpiLiveData, isDark,
  titleColor, bgColor, titleWeight, titleSize, titleFont, titlePosition,
  palette, accentColor, axisTextColor, axisTextWeight, axisTextSize, axisTextFont,
  bgGradientFrom, bgGradientTo, valueDecimals,
  mockDataCache, datasources, chartLibraryEntry, comparisonEntry,
  widgetId, onPointClick, onDrillUp,
}) {
  const Comp = WIDGET_TYPE_REGISTRY[widget.type]?.component;
  if (!Comp) return null;
  // `comparisonEntry` (KPI_CARD's "Compare to") merged onto chartLibraryEntry here, inside
  // WidgetContent's own render — not at the call site below — so React.memo still compares
  // the two incoming prop references (chartLibraryEntry/comparisonEntry) rather than a fresh
  // object built every render, same reasoning as chartLibraryEntry's own comment above.
  const { __resolved, ...props } = resolveWidgetProps(widget, {
    kpiLiveData, pixelHeight, isDark,
    titleColor, bgColor, titleWeight, titleSize, titleFont, titlePosition,
    palette, accentColor, axisTextColor, axisTextWeight, axisTextSize, axisTextFont,
    bgGradientFrom, bgGradientTo, valueDecimals,
    dataCache: mockDataCache, datasources,
    chartLibraryData: widget.dataSource?.widgetId && chartLibraryEntry
      ? { [widget.dataSource.widgetId]: { ...chartLibraryEntry, comparison: comparisonEntry } }
      : {},
    widgetId, onPointClick, onDrillUp,
  });
  return <Comp {...props} />;
});

/**
 * Canvas editor: palette of widget types (click to add) + a react-grid-layout
 * canvas where placed widgets can be dragged/resized, plus a side panel to
 * pick each widget's data source. Renders read-only (no palette/side panel,
 * static grid) when `editable` is false.
 */
const DashboardCanvasEditor = React.forwardRef(function DashboardCanvasEditor({
  initialLayout = [], initialWidgets = {}, initialName = '', editable = true, onSave, onCancel,
  kpiLiveData = null, isDark = null, titleColor = null,
  showChrome = true, onLayoutChange, onCreateViaChartsTab, onEditInChartsTab, dashboardId,
  // Real backend dashboard id (distinct from `dashboardId` above, which is the local/editor
  // id) — Phase 18's Filters panel and the batched data-fetch path both key off this; both
  // stay inert (no FilterPanel, per-widget fetch unchanged) when it's absent (new/unsaved or
  // pure-mock dashboards, matching Phase 16's existing "only real dashboards sync" precondition).
  // Whether this component renders its own Filters strip above the canvas — set false by a
  // parent that instead renders its own <FilterPanel/> elsewhere (via applyFilters/
  // onFiltersState below), e.g. DashboardBuilder.jsx's read-only preview header. Left true for
  // EmbeddedDashboard and the editable editor, which have no such outer header of their own.
  backendId = null, initialGlobalFilters = [], deepLinkFilters = null, onFiltersState, showFiltersInline = true,
  initialDashboardStyle = {}, onDashboardStyleState,
}, ref) {
  // Pending destructive action awaiting user confirmation via <ConfirmModal/> below —
  // { title, message, run } | null. Replaces window.confirm/redux ALERTS with the app's
  // current FormModal-based modal styling (see ConfirmModal.jsx).
  const [pendingConfirm, setPendingConfirm] = useState(null);
  // Save-time validation for the Name field (empty, or backend-rejected as a duplicate) —
  // shown as a tooltip right at the input itself (see the toolbar below), not a page-level
  // banner elsewhere: that used to be DashboardBuilder.jsx's `syncError`, which only ever
  // renders in the *read-only preview* view, not here — so a name error from Save (this
  // view) silently surfaced later, out of context, whenever the user next previewed some
  // unrelated dashboard. `nameErrorKey` just forces the shake animation to replay on repeat
  // failures (changing `key` remounts the element, restarting a CSS animation that already
  // finished).
  const [nameError, setNameError] = useState(null);
  const [nameErrorKey, setNameErrorKey] = useState(0);
  const [savingLocal, setSavingLocal] = useState(false);
  const showNameError = (message) => {
    setNameError(message);
    setNameErrorKey((k) => k + 1);
  };
  const handleSaveClick = async () => {
    if (savingLocal) return;
    if (!name.trim()) {
      showNameError('Please enter a dashboard name.');
      return;
    }
    setSavingLocal(true);
    try {
      await onSave?.({ name: name.trim(), layout, widgets });
    } catch (err) {
      showNameError(err.message || 'Could not save this dashboard.');
    } finally {
      setSavingLocal(false);
    }
  };
  const [name, setName] = useState(initialName);
  const [layout, setLayout] = useState(initialLayout);
  const [widgets, setWidgets] = useState(initialWidgets);
  const [selectedId, setSelectedId] = useState(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  // The left panel's "Add Widget"/"Selected Widget"/"Selected Widget Style"/"Category
  // Colors" sections are an accordion — only one open at a time, so a long widget style
  // field list doesn't push the others out of view. Native <details> has no such grouping,
  // so this is driven explicitly instead of each section's own uncontrolled `open`.
  const [openLeftSection, setOpenLeftSection] = useState('addWidget');
  const toggleLeftSection = (key) => setOpenLeftSection((cur) => (cur === key ? null : key));
  // Clicking a widget on the canvas should jump straight to its style controls, not leave
  // whatever section happened to be open (e.g. "Add Widget") — matches the whole point of
  // selecting a widget in the editor.
  useEffect(() => {
    if (selectedId) setOpenLeftSection('selectedWidgetStyle');
  }, [selectedId]);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  // Superset-style "choose dataset, then chart type" flow for adding a new mock widget
  // (click-to-add only — drag-to-add stays instant, using the type's default dataset, for
  // a fast path). wizardType seeds the wizard's initial chart-type selection.
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState(null);
  // Tracked outside the native HTML5 drag event because dataTransfer.getData() is only
  // readable on the actual 'drop' event in most browsers, not during dragover — but the
  // grid needs to know the dragged type's own defaultSize *during* the drag to size its
  // placeholder correctly.
  const [draggedType, setDraggedType] = useState(null);
  // Same reasoning as draggedType above, but for dragging a pre-configured Chart Library
  // item from the new "Your Charts" palette section — mutually exclusive with draggedType
  // (a drag is either a mock widget type or a real chart, never both).
  const [draggedChartId, setDraggedChartId] = useState(null);
  // Per-dataSource-key cache for resolveWidgetProps' mock data generation — see the
  // comment there for why this exists (drag-induced re-render storm regenerating every
  // chart's random data dozens of times a second).
  const mockDataCacheRef = useRef(new Map());
  const [containerRef, containerWidth] = useContainerWidth();
  // Per-widget DOM node refs (id -> element), for PNG export via html2canvas — keyed by
  // widget id rather than one ref per component since widgets mount/unmount dynamically.
  const widgetNodeRefs = useRef({});
  // Which widget's export menu (CSV/PNG) is currently open, if any — only one at a time.
  const [exportMenuId, setExportMenuId] = useState(null);
  // Chart Library integration: the pickable list (loaded once, editor-only) and a
  // widgetId -> {rows} | {error} cache for real backend widgets placed on this canvas
  // (see resolveWidgetProps' 'chartLibrary' branch, which only reads from this cache —
  // the actual async fetch happens in the effect below).
  const [chartLibraryList, setChartLibraryList] = useState([]);
  const [chartListActionError, setChartListActionError] = useState(null);
  const [chartLibraryData, setChartLibraryData] = useState({});
  const chartLibraryFetchingRef = useRef(new Set());
  // KPI_CARD's "Compare to" (see resolveWidgetProps' 'chartLibrary' branch, and the fetch
  // effect below) — keyed by backend widgetId: { delta, deltaPercent, deltaUp }. Kept
  // separate from chartLibraryData since it's a second, independent query (only for KPI_CARD
  // widgets that opt in via mapping.compare_to), not part of the widget's own normal rows.
  const [comparisonData, setComparisonData] = useState({});
  // Map of widgetId -> the cacheKey (widgetId+compare_to+resolved filters) already fetched or
  // in flight for it — checked BEFORE fetching, and set as soon as a fetch starts (not just
  // while in-flight), so a stale value doesn't get silently kept once its cacheKey has moved
  // on, but a cacheKey that's already been fetched doesn't refetch on every subsequent render.
  const comparisonKeyRef = useRef(new Map());
  // KPI_CARD's own per-card date filter (mapping.date_filter_column/range) — same
  // cacheKey-in-a-ref dedupe pattern as comparisonKeyRef above, tracking which resolved
  // filter set this widget's own base rows were last fetched under.
  const kpiDateFilterKeyRef = useRef(new Map());
  // Cross-filtering (opt-in, BAR/PIE/LINE/AREA only) — transient, never persisted to
  // dashboard.global_filters/updateDashboard, unlike dashboardFilters below. Shape:
  // { sourceWidgetId, column, value, label, targetIds: string[] }. See
  // handleWidgetPointClickRef's assignment further down for the actual click logic.
  const [activeCrossFilter, setActiveCrossFilter] = useState(null);
  const [dashboardExportMenuOpen, setDashboardExportMenuOpen] = useState(false);
  // Phase 18 — dashboard-level global_filters, only meaningful when backendId is set.
  const [dashboardFilters, setDashboardFilters] = useState(initialGlobalFilters);
  const [filterDatasourceOptions, setFilterDatasourceOptions] = useState([]);
  // Phase 19a — dashboard-level style defaults (bgColor/accentColor/titleColor/titleWeight/
  // titleSize), stored in the dashboard's `theme` field (repurposed — was an unused
  // pass-through field, see Phase 19 plan). Only meaningful/persisted when backendId is set;
  // seeds new widgets' own `style` on creation but never touches an already-styled widget.
  const [dashboardStyle, setDashboardStyle] = useState(initialDashboardStyle);
  const [dashboardStylePanelOpen, setDashboardStylePanelOpen] = useState(false);
  // Snapshot of what this editor opened with — captured once per mount (this component
  // remounts on a `key` change, e.g. switching which dashboard is being edited, so this
  // naturally recaptures on that). Compared against current state in `isDirty` below, exposed
  // to DashboardBuilder.jsx so "New dashboard"/navigating away can warn before discarding
  // unsaved work instead of silently dropping it.
  const initialSnapshotRef = useRef(JSON.stringify({ name: initialName, layout: initialLayout, widgets: initialWidgets, dashboardStyle: initialDashboardStyle }));
  // "Add and edit filters" trigger lives in the toolbar (FiltersToggleButton, shared with
  // DashboardBuilder.jsx's preview header) rather than as a gear icon on FilterPanel's own
  // strip (which only appears once a filter already exists) — reachable before the first
  // filter is added.
  // Phase 19b — optional binding to a shared, reusable Theme (own id, editable independently,
  // referenced by any number of dashboards — see ThemeManager.jsx). `boundThemeStyle` is the
  // bound Theme's resolved style, used as `resolvedDefaults` for the local `dashboardStyle`
  // fields below (so an unset local field visually shows the bound theme's value, exactly like
  // WidgetStyleFields already does for per-widget fields) — local `dashboardStyle` always wins
  // over it once set, same override rule as everywhere else in this cascade.
  const [themeOptions, setThemeOptions] = useState([]);
  const [boundThemeId, setBoundThemeId] = useState(null);
  const [boundThemeStyle, setBoundThemeStyle] = useState({});
  // Theme first, local dashboard overrides on top — the actual live cascade value, recomputed
  // every render (cheap, both inputs are plain objects) so any widget that hasn't set its own
  // style.bgColor/titleColor falls back to THIS at render time, not just at widget-creation
  // time. Previously only used to seed brand-new widgets (addWidget) — bgColor/titleColor
  // changes to an already-placed widget's dashboard/theme never showed up until now, since
  // nothing re-read this after creation.
  const effectiveDashboardStyle = { ...boundThemeStyle, ...dashboardStyle };

  // Gathers every widget's resolved data for a whole-dashboard CSV export — re-resolves
  // via the same resolveWidgetProps used for rendering (cheap: mock data is cached per
  // dataSource.key in mockDataCacheRef, so this doesn't re-randomize anything already on
  // screen) rather than keeping a second copy of `resolved` in state just for export.
  const collectExportEntries = () => layout
    .map((l) => {
      const w = widgets[l.i];
      if (!w) return null;
      const { __resolved } = resolveWidgetProps(w, {
        kpiLiveData, pixelHeight: 0, isDark,
        titleColor: effectiveDashboardStyle.titleColor || titleColor,
        bgColor: effectiveDashboardStyle.bgColor,
        titleWeight: effectiveDashboardStyle.titleWeight,
        titleSize: effectiveDashboardStyle.titleSize,
        dataCache: mockDataCacheRef.current, datasources: loadDatasources(), chartLibraryData,
      });
      return { type: w.type, title: w.title, resolved: __resolved };
    })
    .filter(Boolean);

  // Exposes whole-dashboard export to parents that render this in read-only preview mode
  // (DashboardBuilder.jsx's browse view) — that context has its own header (name +
  // Edit/Clone/Delete) outside this component's own render tree, so the export trigger
  // needs to live there too, between Edit and Clone, rather than inside this component.
  // The editable/editor context still has its own in-toolbar export button below, calling
  // these same functions directly (no ref needed there since it's the same component).
  useImperativeHandle(ref, () => ({
    // True once name/layout/widgets/dashboardStyle have changed from what this editor opened
    // with — see initialSnapshotRef above.
    isDirty: () => JSON.stringify({ name, layout, widgets, dashboardStyle }) !== initialSnapshotRef.current,
    exportCSV: () => exportDashboardCSV(name, collectExportEntries()),
    exportPNG: () => exportDashboardPNG(containerRef.current, Object.values(widgetNodeRefs.current), name),
    exportPDF: () => exportDashboardPDF(containerRef.current, Object.values(widgetNodeRefs.current), name),
    // Called by DashboardBuilder.jsx after a widget started via onCreateViaChartsTab is
    // saved in the Charts tab and the user is routed back here — places it on the canvas
    // exactly like any "Your Charts" drag/click placement. Also refetches chartLibraryList
    // — it's only ever loaded once on mount, so without this a chart created just now would
    // stay invisible in "Your Charts" until the whole app was reloaded.
    addRealChart: (widgetId) => {
      addWidget('chartLibrary', undefined, widgetId);
      listChartLibraryWidgets().then(setChartLibraryList).catch(() => {});
    },
    // Called by DashboardBuilder.jsx after a chart already placed on this dashboard was
    // edited (and saved) in the Charts tab and the user is routed back here. Every placed
    // widget's `dataSource.mapping` is a one-time copy taken when the dashboard was
    // loaded/the chart was first placed — a Charts-tab edit updates the chart's own backend
    // record but never that copy, so without this sync the dashboard silently keeps showing
    // the pre-edit mapping/style until a full reload. One shared function (not duplicated
    // per call site) so any future "a chart definition changed elsewhere" case can reuse it.
    refreshChartDefinition: (widget) => {
      if (!widget?.id) return;
      setWidgets((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.entries(prev).forEach(([id, w]) => {
          if (w.dataSource?.type === 'chartLibrary' && w.dataSource.widgetId === widget.id) {
            changed = true;
            next[id] = {
              ...w,
              dataSource: { ...w.dataSource, chartType: widget.chart_type, mapping: widget.mapping },
            };
          }
        });
        return changed ? next : prev;
      });
      listChartLibraryWidgets().then(setChartLibraryList).catch(() => {});
    },
    // Lets a parent render its own <FilterPanel/> elsewhere (e.g. DashboardBuilder.jsx's
    // read-only preview header, next to the dashboard name) instead of the strip this
    // component renders above its own canvas while editable — see onFiltersState below for
    // how the parent gets the reactive state (filters/datasourceOptions) to feed it.
    applyFilters: persistAndApplyFilters,
    clearFilterValues,
  }));

  // Tracks which ResponsiveGridLayout breakpoint is currently active, so drop/layout-change
  // coordinates (in that breakpoint's own column system) can be rescaled back into the
  // canonical GRID_CONFIG.cols (144) system before being persisted — see handleDrop and the
  // ResponsiveGridLayout's onLayoutChange below.
  const breakpointRef = useRef('lg');
  // Same isDark-resolution fallback every widget component already does — needed here so
  // the style panel's color swatches can show the *real* current default (theme-matched),
  // not an arbitrary placeholder, when a field has no saved override yet.
  const { theme } = useTheme();
  const effectiveIsDark = typeof isDark === 'boolean' ? isDark : theme === 'dark';
  const { text: resolvedTextColor, sub: resolvedSubColor } = chartTokens(effectiveIsDark);
  const resolvedBgColor = effectiveIsDark ? '#22273C' : '#ffffff';

  // `posOverride` is set when a widget is dropped from the palette at a specific grid
  // cell (see handleDrop below) — the click-to-add path still uses findFreeSlot's
  // best-fit placement, since there's no drop position to honor there. `chartId` (only for
  // type === 'chartLibrary', from the "Your Charts" palette list) places the widget already
  // bound to that chart's id, title, and a fetch of its full chart_type/mapping — no empty
  // placeholder + separate picker step. Falls back to an empty placeholder if omitted
  // (kept for robustness; not exercised by any current UI path since chartLibrary's own
  // palette icon is hidden — see widgetTypeRegistry.js).
  const addWidget = (type, posOverride, chartId, mockSourceKey) => {
    const def = WIDGET_TYPE_REGISTRY[type];
    const id = nextId();
    const { x, y } = posOverride || findFreeSlot(layout, def.defaultSize.w, def.defaultSize.h, GRID_CONFIG.cols);
    setLayout((prev) => [...prev, { i: id, x, y, w: def.defaultSize.w, h: def.defaultSize.h }]);
    // `dataShape` alone picks whichever mock source happens to be declared first in
    // mockDataSources.js — fine for widgets that can show any generic series (Bar,
    // Sparkline, Area), but wrong for ones that need a specifically-shaped default
    // (Funnel needs monotonic stages, Waterfall needs signed deltas, Treemap reads best
    // with real flat proportions) — `defaultDataSourceKey` overrides the dataShape guess
    // when a type declares one.
    // Phase 19 — seeds a brand-new widget's own style from the dashboard's coarse defaults
    // (effectiveDashboardStyle, computed once per render above): the bound Theme's resolved
    // style first (19b), then local dashboardStyle overrides on top (19a) — same override
    // order as everywhere else in this cascade. An already-styled widget's `style` is never
    // touched by this — the dashboard layer only ever supplies a starting point (though it now
    // also applies live at render time for any field a widget hasn't explicitly set, see
    // resolveWidgetProps' finalBgColor/finalTitleColor).
    const dashboardStyleSeed = {
      ...(effectiveDashboardStyle.bgColor ? { bgColor: effectiveDashboardStyle.bgColor } : {}),
      ...(effectiveDashboardStyle.titleColor ? { titleColor: effectiveDashboardStyle.titleColor } : {}),
      ...(effectiveDashboardStyle.titleWeight ? { titleWeight: effectiveDashboardStyle.titleWeight } : {}),
      ...(effectiveDashboardStyle.titleSize ? { titleSize: effectiveDashboardStyle.titleSize } : {}),
    };
    if (type === 'chartLibrary') {
      const picked = chartId ? chartLibraryList.find((w) => w.id === chartId) : null;
      setWidgets((prev) => ({
        ...prev,
        [id]: { type, title: picked?.name || def.label, dataSource: { type: 'chartLibrary', widgetId: chartId || '' }, style: { ...dashboardStyleSeed } },
      }));
      setSelectedId(id);
      if (chartId) {
        getChartLibraryWidgetDetail(chartId)
          .then(async (detail) => {
            // Datasource name isn't on the widget detail response itself — fetched
            // separately for the side panel's Details block (best-effort: a failure here
            // just means the name is omitted, not a blocking error for the whole widget).
            let datasourceName;
            try {
              const { datasource } = await getChartDatasourceDetail(detail.datasource_id);
              datasourceName = datasource?.name;
            } catch (e) {
              // ignore — datasource name is optional display info
            }
            // The chart's own default style (set in ChartLibrary.jsx's "Default Style"
            // section, stored in mapping.style) wins over the dashboard's own seed — more
            // specific beats less specific, same override order as everywhere else in this
            // cascade. A per-placement edit made afterward in this editor's own Style panel
            // still wins over both.
            updateWidget(id, {
              title: picked?.name || detail.name,
              dataSource: {
                type: 'chartLibrary', widgetId: chartId, chartType: detail.chart_type, mapping: detail.mapping,
                datasourceId: detail.datasource_id, datasourceName,
              },
              style: { ...dashboardStyleSeed, ...(detail.mapping?.style || {}) },
            });
          })
          .catch(() => {
            // Leave the widget selected with just its id set — it'll show its own error
            // state next render via resolveWidgetProps' missing-cache-entry path, and the
            // widget's own "Edit chart" action (in its floating action row) still lets the
            // user fix it in the Charts tab.
          });
      }
      return;
    }
    const defaultSourceKey = mockSourceKey || def.defaultDataSourceKey || dataSourceKeysFor(def.dataShape)[0]?.key || '';
    const defaultColor = effectiveDashboardStyle.accentColor || MOCK_DATA_SOURCES[defaultSourceKey]?.generate()?.color || '#4f9eff';
    setWidgets((prev) => ({
      ...prev,
      [id]: { type, title: def.label, dataSource: { type: 'mock', key: defaultSourceKey }, style: { color: defaultColor, ...dashboardStyleSeed } },
    }));
    setSelectedId(id);
  };

  // Fires when a palette icon (mock type) or "Your Charts" list item is dropped onto the
  // grid — `item` is react-grid-layout's own placeholder layout entry, already resolved to
  // the grid cell under the cursor at drop time, so the new widget lands exactly where it
  // was dropped instead of wherever findFreeSlot would have best-fit it. `item.x` is in the
  // *currently active breakpoint's* column system (ResponsiveGridLayout uses fewer columns
  // at narrower widths) — our own `layout` state always stays in the canonical
  // GRID_CONFIG.cols (144) system, so it's rescaled here before being stored, the same way
  // onLayoutChange below rescales edits.
  const handleDrop = (_layout, item) => {
    const type = draggedType;
    const chartId = draggedChartId;
    setDraggedType(null);
    setDraggedChartId(null);
    const scale = GRID_CONFIG.cols / COLS_BY_BREAKPOINT[breakpointRef.current];
    const pos = { x: Math.round(item.x * scale), y: item.y };
    if (chartId) {
      addWidget('chartLibrary', pos, chartId);
      return;
    }
    if (!type || !WIDGET_TYPE_REGISTRY[type]) return;
    // Same real-chart-only flow the click path already uses (see the palette icon's
    // onClick) — dragging a widget-type icon no longer instantly creates a mock widget,
    // it opens the same "choose a dataset" wizard. The exact drop position isn't preserved
    // (the wizard's eventual placement already uses findFreeSlot regardless, same as
    // click-to-add), which is an acceptable, already-existing limitation of that flow.
    setWizardType(type);
    setWizardOpen(true);
  };

  const removeWidget = (id) => {
    setLayout((prev) => prev.filter((l) => l.i !== id));
    setWidgets((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedId((s) => (s === id ? null : s));
  };

  const updateWidget = (id, patch) => {
    setWidgets((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  // Copies a widget's full current settings (title, data source, style — everything in
  // `widgets[id]`) onto a fresh id, placed via the same best-fit slot finder addWidget
  // uses for click-to-add, at the source widget's own size (not the type's defaultSize —
  // a duplicate should match what you actually resized it to, not reset).
  //
  // For a chartLibrary-backed widget, the naive clone below (just deep-copying `widgets[id]`)
  // would leave the new tile's dataSource.widgetId pointing at the SAME shared chart
  // definition as the original — editing either tile's mapping/style would then edit both
  // (and every other dashboard that chart is placed on too), since chart edits always write
  // through updateWidget(widgetId, ...) to that one shared record. So this creates a real,
  // independent copy of the underlying widget first (same duplicateWidget backend action the
  // Charts-tab list and this dashboard's own "Your Charts" list already use — see its doc
  // comment in dashboardBuilder-actions.js), and points the new tile at THAT id instead.
  const duplicateWidget = async (id) => {
    const src = widgets[id];
    const srcLayout = layout.find((l) => l.i === id);
    if (!src || !srcLayout) return;
    const clone = JSON.parse(JSON.stringify(src));
    if (clone.dataSource?.type === 'chartLibrary' && clone.dataSource.widgetId) {
      try {
        const copy = await duplicateChartLibraryWidgetDef(clone.dataSource.widgetId);
        clone.dataSource.widgetId = copy.id;
        // This canvas placement's own `title` (shown on the tile header and in the Selected
        // Widget panel) is a separate field from the chart definition's own `name` — seeded
        // once from it when a chart is first placed (see addWidget), then independently
        // editable per-placement. The deep-clone above copied the OLD title verbatim, so
        // without this it'd keep reading e.g. "User Growth Trends" while the chart editor
        // (bound to the new copy's own `name`) shows "User Growth Trends (Copy)" — exactly
        // the mismatch reported. Syncing it from `copy.name` keeps both in agreement right
        // after duplicating; the user can still retitle the placement afterward as usual.
        clone.title = copy.name;
        refreshChartLibraryList();
        notifyWidgetsChanged();
      } catch (err) {
        setChartListActionError(err.message);
        return;
      }
    }
    const newId = nextId();
    const { x, y } = findFreeSlot(layout, srcLayout.w, srcLayout.h, GRID_CONFIG.cols);
    setLayout((prev) => [...prev, { i: newId, x, y, w: srcLayout.w, h: srcLayout.h }]);
    setWidgets((prev) => ({ ...prev, [newId]: clone }));
    setSelectedId(newId);
  };

  // Ctrl/Cmd+C copies the selected widget's id; Ctrl/Cmd+V duplicates whatever was last
  // copied. Ignored while focus is inside a text input/select so normal copy-paste in the
  // side panel's own fields (Title, etc.) isn't hijacked.
  const clipboardRef = useRef(null);
  useEffect(() => {
    if (!editable) return undefined;
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'c' || e.key === 'C') {
        if (selectedId) clipboardRef.current = selectedId;
      } else if (e.key === 'v' || e.key === 'V') {
        if (clipboardRef.current && widgets[clipboardRef.current]) {
          e.preventDefault();
          duplicateWidget(clipboardRef.current);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editable, selectedId, widgets, layout]);

  // Loaded once, editor-only — the read-only preview doesn't need the pickable list, only
  // the already-fetched data cache below.
  useEffect(() => {
    if (!editable) return;
    listChartLibraryWidgets().then(setChartLibraryList).catch(() => {});
  }, [editable]);

  const refreshChartLibraryList = () => listChartLibraryWidgets().then(setChartLibraryList).catch(() => {});

  // ChartLibrary.jsx's own Charts tab keeps a separate list cache, live at the same time this
  // one is (it's always mounted, just hidden via CSS while a dashboard is open — see
  // DashboardBuilder.jsx) — without this, a widget created/edited/deleted/duplicated from
  // THERE never showed up in this "Your Charts" panel until it was manually reopened.
  useEffect(() => {
    if (!editable) return undefined;
    return subscribeWidgetsChanged(() => { refreshChartLibraryList(); });
  }, [editable]);

  // Delete/duplicate straight from the "Your Charts" list — same actions ChartLibrary.jsx's
  // own Charts tab list offers, so a chart doesn't have to be added to this dashboard (or
  // opened in the Charts tab) just to remove or copy it from the shared library.
  const deleteChartFromList = (widget) => setPendingConfirm({
    title: 'Delete Chart',
    message: `Delete "${widget.name}"? This removes it from the Chart Library and from any dashboard it's placed on.`,
    run: async () => {
      try {
        await deleteChartLibraryWidget(widget.id);
        refreshChartLibraryList();
        notifyWidgetsChanged();
      } catch (err) {
        setChartListActionError(err.message);
      }
    },
  });

  // Shared with ChartLibrary.jsx's own Charts-tab list and this dashboard's own canvas-tile
  // Duplicate button (duplicateWidget below) — see duplicateWidget's doc comment in
  // dashboardBuilder-actions.js for what actually gets copied.
  const duplicateChartFromList = async (widget) => {
    try {
      await duplicateChartLibraryWidgetDef(widget.id);
      await refreshChartLibraryList();
      notifyWidgetsChanged();
    } catch (err) {
      setChartListActionError(err.message);
    }
  };

  const exportChartFromList = async (widget) => {
    try {
      const { rows } = await getStandaloneWidgetData(widget.id);
      exportRowsCSV(rows, widget.name);
    } catch (err) {
      setChartListActionError(err.message);
    }
  };

  // Fetches real data for any placed chartLibrary widget not yet in the cache — mirrors
  // kpiLiveData's "already fetched elsewhere, just read it" pattern, except the fetch
  // itself happens here since there's no dashboard-level parent doing it for us.
  //
  // NOT skipped when `backendId` exists — the batched-fetch effect below (Phase 18) only
  // runs once on mount, covering whatever was already attached to the backend dashboard at
  // that moment. A chart added to the canvas afterward (via addRealChart, before the next
  // save actually attaches it) has no other fetch path at all — it used to sit stuck on
  // "Loading…" forever until the next save+reload. The per-widget `chartLibraryData[id]`
  // check below already makes this a no-op for anything the batched fetch already covered,
  // so this only ever fills the gap, never double-fetches.
  useEffect(() => {
    Object.values(widgets).forEach((w) => {
      const id = w.dataSource?.widgetId;
      if (w.dataSource?.type !== 'chartLibrary' || !id) return;
      if (chartLibraryData[id] || chartLibraryFetchingRef.current.has(id)) return;
      chartLibraryFetchingRef.current.add(id);
      getStandaloneWidgetData(id)
        .then((data) => setChartLibraryData((prev) => ({ ...prev, [id]: { rows: data.rows, drillDown: data.drillDown } })))
        .catch((err) => setChartLibraryData((prev) => ({ ...prev, [id]: { error: err.message } })))
        .finally(() => chartLibraryFetchingRef.current.delete(id));
    });
  }, [widgets, chartLibraryData, backendId]);

  // A KPI_CARD's actually-effective filter set: its own date_filter_column/range if set
  // (excluding the dashboard's global filter on that SAME column, so the two can't stack into
  // a contradictory BETWEEN...AND BETWEEN that silently returns zero rows — see the
  // conversation this was decided in), otherwise just the dashboard's own filters unchanged.
  // Shared by both the base-rows fetch effect below and the "Compare to" effect further down,
  // so "what am I comparing against" always matches "what am I currently showing".
  const kpiEffectiveFilters = (mapping) => {
    const dateCol = mapping.date_filter_column;
    if (!dateCol) return dashboardFilters;
    const cardFilter = buildDateFilterFromPreset(dateCol, mapping.date_filter_range || 'Last 7 days');
    if (!cardFilter) return dashboardFilters;
    return [...dashboardFilters.filter((f) => f.column !== dateCol), cardFilter];
  };

  // KPI_CARD's own date filter (mapping.date_filter_column/range) — refetches this widget's
  // base rows under its own resolved filter set whenever that changes, independent of
  // whatever batched/generic fetch (Phase 18, the per-widget cache-fill effect above, etc.)
  // already populated chartLibraryData with. Only widgets that actually set
  // date_filter_column opt into this — everything else keeps using whatever the generic
  // fetch paths already provide.
  useEffect(() => {
    Object.values(widgets).forEach((w) => {
      if (w.dataSource?.type !== 'chartLibrary' || w.dataSource.chartType !== 'KPI_CARD') return;
      const widgetId = w.dataSource.widgetId;
      const mapping = w.dataSource.mapping || {};
      if (!widgetId || !mapping.date_filter_column) return;
      const filters = resolveFiltersForQuery(kpiEffectiveFilters(mapping));
      const cacheKey = `${widgetId}:${JSON.stringify(filters)}`;
      if (kpiDateFilterKeyRef.current.get(widgetId) === cacheKey) return;
      kpiDateFilterKeyRef.current.set(widgetId, cacheKey);
      const fetchPromise = backendId
        ? getWidgetData(backendId, widgetId, { filters })
        : getStandaloneWidgetData(widgetId, { filters });
      fetchPromise
        .then((data) => {
          if (kpiDateFilterKeyRef.current.get(widgetId) !== cacheKey) return; // superseded
          setChartLibraryData((prev) => ({ ...prev, [widgetId]: { rows: data.rows, drillDown: data.drillDown } }));
        })
        .catch((err) => {
          if (kpiDateFilterKeyRef.current.get(widgetId) === cacheKey) {
            setChartLibraryData((prev) => ({ ...prev, [widgetId]: { error: err.message } }));
          }
        });
    });
  }, [widgets, dashboardFilters, backendId]);

  // KPI_CARD "Compare to" — a second, independent fetch against a date-shifted filter set
  // (see buildComparisonFilters's own doc comment for why this can't just be a backend
  // parameter). Runs once this widget's own rows have already loaded (so the current value
  // it needs to diff against is available), and only for KPI_CARD widgets that actually opted
  // in via mapping.compare_to. `comparisonData` is keyed by widgetId (what resolveWidgetProps
  // looks it up by); `comparisonFetchingRef` instead tracks the full cacheKey (widgetId +
  // compare_to + resolved filters) so a changed comparison target or filter set is recognized
  // as needing a fresh fetch rather than silently keeping a now-stale value under the same
  // widgetId slot.
  useEffect(() => {
    Object.values(widgets).forEach((w) => {
      if (w.dataSource?.type !== 'chartLibrary' || w.dataSource.chartType !== 'KPI_CARD') return;
      const widgetId = w.dataSource.widgetId;
      const mapping = w.dataSource.mapping || {};
      const compareTo = mapping.compare_to;
      if (!widgetId || !compareTo || compareTo === 'None') return;
      const entry = chartLibraryData[widgetId];
      const yAxis = mapping.y_axis;
      if (!entry?.rows || !yAxis) return;
      // 'Custom' has no "current window" to shift for LATEST (its date_filter_column is
      // deliberately unset — see LATEST_BY_FIELD's comment), so it takes a fixed cutoff date
      // instead — see buildCustomComparisonFilters's own doc comment for the two shapes this
      // can produce depending on aggregation.
      const compareFilters = compareTo === 'Custom'
        ? buildCustomComparisonFilters({
          filters: kpiEffectiveFilters(mapping),
          customDate: mapping.compare_custom_date,
          latestByColumn: mapping.aggregation === 'LATEST' ? mapping.latest_by : null,
        })
        : buildComparisonFilters(kpiEffectiveFilters(mapping), compareTo);
      if (!compareFilters) return; // no BETWEEN filter to shift — nothing meaningful to compare
      const cacheKey = `${widgetId}:${compareTo}:${JSON.stringify(compareFilters)}`;
      if (comparisonKeyRef.current.get(widgetId) === cacheKey) return;
      comparisonKeyRef.current.set(widgetId, cacheKey);
      const fetchPromise = backendId
        ? getWidgetData(backendId, widgetId, { filters: compareFilters })
        : getStandaloneWidgetData(widgetId, { filters: compareFilters });
      fetchPromise
        .then((data) => {
          if (comparisonKeyRef.current.get(widgetId) !== cacheKey) return; // superseded
          const currentVal = Number(entry.rows[0]?.[yAxis]) || 0;
          const pastVal = Number(data.rows?.[0]?.[yAxis]) || 0;
          const delta = currentVal - pastVal;
          setComparisonData((prev) => ({
            ...prev,
            [widgetId]: { delta, deltaPercent: pastVal !== 0 ? (delta / pastVal) * 100 : null, deltaUp: delta >= 0 },
          }));
        })
        .catch(() => {
          if (comparisonKeyRef.current.get(widgetId) === cacheKey) {
            setComparisonData((prev) => ({ ...prev, [widgetId]: null }));
          }
        });
    });
  }, [widgets, chartLibraryData, dashboardFilters, backendId]);

  // Phase 18 — batched, filter-aware fetch for dashboards with a real backend id. Omitting
  // `filters` from the call (see getDashboardData's own doc comment) makes the backend
  // auto-apply whatever `global_filters` are already saved, so first paint already reflects
  // them in one call instead of N unfiltered per-widget ones.
  //
  // `deepLinkFilters` (Phase 18 B6 — set by EmbeddedDashboard from URL params) is an explicit
  // one-off override for this load: when present, it's sent instead of the saved filters and
  // the panel is seeded with it directly, rather than being overwritten back to the dashboard's
  // saved state a moment later once this call resolves.
  useEffect(() => {
    if (!backendId) return;
    let cancelled = false;
    const hasOverride = deepLinkFilters && deepLinkFilters.length > 0;
    const applyWidgetResults = (widgetResults) => {
      setChartLibraryData((prev) => {
        const next = { ...prev };
        Object.entries(widgetResults).forEach(([widgetId, result]) => {
          next[widgetId] = result.status === 200
            ? { rows: result.data?.rows, drillDown: result.data?.drill_down }
            : { error: result.msg || 'Failed to load' };
        });
        return next;
      });
    };
    getDashboardData(backendId, hasOverride ? { filters: deepLinkFilters } : {})
      .then(({ dashboard, widgets: widgetResults }) => {
        if (cancelled) return;
        const savedFilters = dashboard.global_filters || [];
        setDashboardFilters(hasOverride ? deepLinkFilters : savedFilters);
        // `theme` is a proper JSONB column (confirmed with the backend dev — it used to be
        // VARCHAR(64), which hard-crashed with a 500 on save for any real style object past
        // ~1-2 fields; now fixed, round-trips as a real object with no size limit) — the
        // `typeof === 'object'` check here just stays defensive against a genuinely absent/
        // null value, not a workaround for the old bug.
        if (dashboard.theme && typeof dashboard.theme === 'object') {
          setDashboardStyle(dashboard.theme);
        }
        setBoundThemeId(dashboard.theme_id || null);
        applyWidgetResults(widgetResults);

        // The backend's "omit filters, auto-apply dashboard.global_filters" fast path (above)
        // only works for filters it can interpret as-is — a saved relative/thisPeriod time
        // range (e.g. "Last 7 days") is a spec that must be resolved to concrete dates by us,
        // not something the backend can evaluate on its own. So when any saved filter needs
        // that resolution, immediately re-fetch once with the resolved dates and swap the
        // corrected widget data in — the common case (no relative filters) never pays this
        // second round trip.
        const needsResolution = !hasOverride && savedFilters.some(
          (f) => f.operator === 'BETWEEN' && f.value && typeof f.value === 'object' && !Array.isArray(f.value) && f.value.mode && f.value.mode !== 'custom',
        );
        if (needsResolution) {
          getDashboardData(backendId, { filters: resolveFiltersForQuery(savedFilters) })
            .then(({ widgets: resolvedWidgetResults }) => { if (!cancelled) applyWidgetResults(resolvedWidgetResults); })
            .catch(() => {});
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [backendId, deepLinkFilters]);

  // Options for FilterEditorModal's Datasource picker, for resolving each "Your Charts" row's
  // Datasource label (see ChartListItem.jsx's datasourceNamesById), and for FilterPanel's
  // multi-select value lookup (resolveColumnValues) — fetched unconditionally on mount, not
  // gated on `editable`/backendId, since Filters (and the read-only preview/embedded views
  // that use them) need this regardless of edit mode or draft/published status.
  useEffect(() => {
    let cancelled = false;
    listBackendDatasources()
      .then((list) => { if (!cancelled) setFilterDatasourceOptions(list); })
      .catch(() => { if (!cancelled) setFilterDatasourceOptions([]); });
    return () => { cancelled = true; };
  }, []);

  // Phase 19b/19c — list of every reusable Theme, for the Dashboard Style popover's Theme
  // picker. Fetched whenever the editor is editable, not gated on backendId, so a brand-new
  // unsaved dashboard can already pick a Theme before its first save.
  useEffect(() => {
    if (!editable) return;
    let cancelled = false;
    listBackendThemes()
      .then((list) => { if (!cancelled) setThemeOptions(list); })
      .catch(() => { if (!cancelled) setThemeOptions([]); });
    return () => { cancelled = true; };
  }, [editable]);

  // Resolves the currently-bound Theme's own style, whenever the binding changes — this is
  // what `resolvedDefaults` feeds into the local Dashboard Style fields below, so an unset
  // local field visually shows the bound theme's value instead of a black placeholder.
  useEffect(() => {
    if (!boundThemeId) { setBoundThemeStyle({}); return; }
    let cancelled = false;
    getThemeDetail(boundThemeId)
      .then((theme) => { if (!cancelled) setBoundThemeStyle(theme.style || {}); })
      .catch(() => { if (!cancelled) setBoundThemeStyle({}); });
    return () => { cancelled = true; };
  }, [boundThemeId]);

  // Binds/unbinds a shared Theme — persisted immediately (unlike local dashboardStyle edits,
  // which only persist via the popover's own field changes) since picking a theme from the
  // dropdown is a deliberate, singular action, not a value being typed field-by-field.
  const bindTheme = async (themeId) => {
    setBoundThemeId(themeId || null);
    if (!backendId) return;
    await updateDashboard(backendId, { theme_id: themeId || null });
  };

  // Mirrors filters/datasourceOptions out to a parent that wants to render its own
  // <FilterPanel/> elsewhere (see the `applyFilters` ref method above) instead of the strip
  // this component renders internally when editable — e.g. DashboardBuilder.jsx's read-only
  // preview header, which sits outside this component entirely.
  useEffect(() => {
    onFiltersState?.({ filters: dashboardFilters, datasourceOptions: filterDatasourceOptions });
  }, [dashboardFilters, filterDatasourceOptions]);

  // Phase 19c — mirrors the currently-staged dashboard style/theme binding out to
  // DashboardBuilder.jsx, so a brand-new (not-yet-saved) dashboard's first createDashboard
  // call can include whatever was picked in this popover before Save was ever clicked —
  // otherwise it would be silently lost once this editor closes on save.
  useEffect(() => {
    onDashboardStyleState?.({ style: dashboardStyle, themeId: boundThemeId });
  }, [dashboardStyle, boundThemeId]);

  // Shared by FilterPanel's "Apply filters"/"Clear all" and FilterEditorModal's Save — one
  // write path for dashboard.global_filters, so there's never two divergent ways the saved
  // array and the on-screen data can drift from each other (see Phase 18 plan's B4 note).
  const persistAndApplyFilters = async (rows) => {
    setDashboardFilters(rows);
    if (!backendId) return;
    const [dataResult] = await Promise.all([
      // Sends the resolved concrete dates for the query, but persists `rows` (the raw
      // relative/thisPeriod spec, if any) below — never the resolved dates — so "Last 7 days"
      // stays live on every future load instead of freezing to today's resolved window.
      getDashboardData(backendId, { filters: resolveFiltersForQuery(rows) }),
      updateDashboard(backendId, { global_filters: rows }),
    ]);
    setChartLibraryData((prev) => {
      const next = { ...prev };
      Object.entries(dataResult.widgets).forEach(([widgetId, result]) => {
        next[widgetId] = result.status === 200
          ? { rows: result.data?.rows, drillDown: result.data?.drill_down }
          : { error: result.msg || 'Failed to load' };
      });
      return next;
    });
  };

  // "Clear all" only blanks each filter's *value* — the configured filters themselves
  // (column/operator) are never removed here; deleting a filter is only possible from
  // within the "Add and edit filters" form. Deliberately does NOT call persistAndApplyFilters
  // (which would overwrite dashboard.global_filters with an empty array, deleting every
  // configured filter) — instead runs an explicit one-off `filters: []` override (per the
  // backend's own documented "force no filters for one request" semantics) so widgets show
  // unfiltered data without touching what's saved. dashboardFilters (and therefore which
  // filter cards render) is left untouched.
  const clearFilterValues = async () => {
    if (!backendId) return;
    const dataResult = await getDashboardData(backendId, { filters: [] });
    setChartLibraryData((prev) => {
      const next = { ...prev };
      Object.entries(dataResult.widgets).forEach(([widgetId, result]) => {
        next[widgetId] = result.status === 200
          ? { rows: result.data?.rows, drillDown: result.data?.drill_down }
          : { error: result.msg || 'Failed to load' };
      });
      return next;
    });
  };

  // Cross-filtering — ephemeral, scoped refetch for the widgets a click actually affects
  // (never dashboard.global_filters/updateDashboard, unlike persistAndApplyFilters above).
  // `dataResult.widgets` is keyed by backend chart widgetId, same key space chartLibraryData
  // itself uses (see WidgetContent's chartLibraryData prop) — only the entries for
  // `targetIds`'s own dataSource.widgetId get merged in, every other widget's cached data is
  // left untouched, unlike persistAndApplyFilters/clearFilterValues which merge everything.
  const applyCrossFilterTo = async (targetIds, crossFilterRow) => {
    if (!backendId || targetIds.length === 0) return;
    const filters = crossFilterRow ? [...dashboardFilters, crossFilterRow] : dashboardFilters;
    const dataResult = await getDashboardData(backendId, { filters: resolveFiltersForQuery(filters) });
    setChartLibraryData((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        const backendWidgetId = widgets[id]?.dataSource?.widgetId;
        const result = backendWidgetId ? dataResult.widgets[backendWidgetId] : undefined;
        if (result) {
          next[backendWidgetId] = result.status === 200
            ? { rows: result.data?.rows, drillDown: result.data?.drill_down }
            : { error: result.msg || 'Failed to load' };
        }
      });
      return next;
    });
  };

  // Drill-down — a click on a chart whose latest response has drill_down.enabled &&
  // has_next_level walks one level deeper into that response's own hierarchy, instead of
  // cross-filtering sibling widgets. Refetches only the one widget (getWidgetData when this
  // dashboard has a real backendId, so the dashboard's own current filters stay applied while
  // drilling; getStandaloneWidgetData otherwise, matching the no-backendId per-widget fetch
  // path above) and replaces its chartLibraryData entry — drillDown.path/level/hierarchy in
  // the new response drive the breadcrumb.
  const fetchDrilledWidget = async (backendWidgetId, drillPath) => {
    // `drilling: true` keeps the previous entry's rows/drillDown on screen (so the chart
    // doesn't flash blank/"Loading…") while ChartLibraryWidgetView shows a busy overlay —
    // set synchronously before the await so the click's own render already reflects it.
    setChartLibraryData((prev) => ({ ...prev, [backendWidgetId]: { ...prev[backendWidgetId], drilling: true } }));
    try {
      const data = backendId
        ? await getWidgetData(backendId, backendWidgetId, { filters: resolveFiltersForQuery(dashboardFilters), drillPath })
        : await getStandaloneWidgetData(backendWidgetId, { drillPath });
      setChartLibraryData((prev) => ({ ...prev, [backendWidgetId]: { rows: data.rows, drillDown: data.drillDown } }));
    } catch (err) {
      setChartLibraryData((prev) => ({ ...prev, [backendWidgetId]: { ...prev[backendWidgetId], drilling: false, error: err.message } }));
    }
  };

  // Kept in a ref, reassigned every render, so the single callback actually handed to every
  // WidgetContent (stableOnPointClick below) never changes identity — a fresh function prop
  // there would defeat WidgetContent's React.memo (the same perf issue already fixed once
  // this session for Table widgets) — while this still always reads the latest
  // widgets/dashboardFilters/activeCrossFilter via closure.
  const handleWidgetPointClickRef = useRef(() => {});
  handleWidgetPointClickRef.current = async (sourceWidgetId, { column, value }) => {
    const sourceWidget = widgets[sourceWidgetId];
    if (!sourceWidget?.dataSource) return;
    // Drilling takes priority over cross-filtering — a widget only ever wires onPointClick
    // for cross-filtering OR drilling (see resolveWidgetProps' 'chartLibrary' case), never
    // both interpretations of the same click, so this check is really "which mode is this
    // widget in right now", not a tie-break.
    const backendWidgetId = sourceWidget.dataSource.widgetId;
    const entry = backendWidgetId ? chartLibraryData[backendWidgetId] : undefined;
    if (entry?.drillDown?.enabled && entry?.drillDown?.has_next_level) {
      await fetchDrilledWidget(backendWidgetId, [...(entry.drillDown.path || []), value]);
      return;
    }
    const clickId = `${sourceWidgetId}:${column}:${value}`;
    // Clicking the same point again clears the cross-filter — matches Power BI/Superset's
    // click-to-toggle convention.
    if (activeCrossFilter?.clickId === clickId) {
      await applyCrossFilterTo(activeCrossFilter.targetIds, null);
      setActiveCrossFilter(null);
      return;
    }
    // Match strictness (confirmed with user): column name AND same datasourceId — avoids
    // matching two widgets that only coincidentally share a column name across different
    // datasources.
    const sourceDatasourceId = sourceWidget.dataSource.datasourceId;
    // `crossFilterTarget` may have been set at the chart's own base default (mapping.style,
    // via ChartLibrary.jsx's own Style tab) rather than this specific placement's own
    // widget.style override — resolving it via the same baseStyle/resolveWidgetStyle cascade
    // resolveWidgetProps' 'chartLibrary' case already uses for the source-side gating, so
    // both sides of the match see the same value regardless of which level it was set at.
    const isCrossFilterTarget = (w) => {
      if (w.dataSource?.type !== 'chartLibrary') return false;
      const baseStyle = { ...(w.dataSource.mapping?.style || {}), ...(w.style || {}) };
      const extraFields = CHART_TYPE_EXTRA_STYLE_FIELDS[w.dataSource.chartType] || [];
      return resolveWidgetStyle(w.type, baseStyle, extraFields).crossFilterTarget === 'on';
    };
    const targetIds = Object.entries(widgets)
      .filter(([id, w]) => id !== sourceWidgetId
        && isCrossFilterTarget(w)
        && w.dataSource?.datasourceId === sourceDatasourceId
        && Object.values(w.dataSource?.mapping || {}).includes(column))
      .map(([id]) => id);
    if (targetIds.length === 0) return;
    await applyCrossFilterTo(targetIds, { column, operator: '=', value });
    setActiveCrossFilter({ clickId, sourceWidgetId, column, value, label: String(value), targetIds });
  };
  // The actual prop passed down — stable across every render (empty dep array), so it never
  // breaks WidgetContent's memoization; always delegates to the freshest ref above.
  const stableOnPointClick = useCallback((widgetId, point) => handleWidgetPointClickRef.current(widgetId, point), []);
  // Explicit clear affordance (the clear-chip) — same effect as re-clicking the same point.
  const clearCrossFilter = () => {
    if (!activeCrossFilter) return;
    applyCrossFilterTo(activeCrossFilter.targetIds, null);
    setActiveCrossFilter(null);
  };

  // Drill-up (breadcrumb click) — `level` is the index of the clicked breadcrumb segment,
  // i.e. how many path entries should remain (0 = back to the root/undrilled view). Same
  // ref-then-stable-callback split as handleWidgetPointClickRef/stableOnPointClick above, for
  // the same reason: WidgetContent's props must stay identity-stable across renders.
  const handleDrillUpRef = useRef(() => {});
  handleDrillUpRef.current = async (backendWidgetId, level) => {
    const entry = chartLibraryData[backendWidgetId];
    const path = (entry?.drillDown?.path || []).slice(0, level);
    await fetchDrilledWidget(backendWidgetId, path);
  };
  const stableOnDrillUp = useCallback((backendWidgetId, level) => handleDrillUpRef.current(backendWidgetId, level), []);

  // Phase 19a — persists the dashboard-level style defaults (bgColor/accentColor/titleColor/
  // titleWeight/titleSize) into `theme`. Local-only (no backendId) dashboards can still edit
  // this in-session — it just won't survive a refresh, same limitation Filters/Publish already
  // have for unsaved dashboards.
  const persistDashboardStyle = async (next) => {
    setDashboardStyle(next);
    if (!backendId) return;
    await updateDashboard(backendId, { theme: next });
  };

  const selected = selectedId ? widgets[selectedId] : null;
  // Chart Library ids already placed on this canvas — drives the "Added" badge/dimming in
  // the "Your Charts" panel below, so a chart already on the dashboard can't be added again.
  const usedChartIds = new Set(
    Object.values(widgets)
      .filter((w) => w.dataSource?.type === 'chartLibrary' && w.dataSource.widgetId)
      .map((w) => w.dataSource.widgetId)
  );
  // Latest-first, only fully-configured (datasource-attached) charts — shared with
  // ChartLibrary.jsx's "Charts" tab so both lists always show the same set/order.
  const sortedChartLibraryList = sortWidgetsByRecency(withDatasourceOnly(chartLibraryList));

  // "Your Charts" list items only carry datasource_id (see ChartListItem.jsx's own comment)
  // — resolved against the same datasource list already fetched for the Filters modal's
  // picker, no extra network call needed just to show a name here.
  const datasourceNamesById = Object.fromEntries(filterDatasourceOptions.map((d) => [d.id, d.name]));

  // Hoisted out of renderWidget below — it used to call loadDatasources() (a synchronous
  // localStorage read + JSON.parse) once per *widget* on every render; every widget shares
  // the exact same list regardless, so this only needs to run once per render of the canvas.
  const datasources = loadDatasources();

  // Every widget renders through the same interactive path at every breakpoint now —
  // ResponsiveGridLayout handles the reflow, so there's no separate static/read-only
  // rendering path to keep in sync with this one.
  const renderWidget = (l) => {
    const w = widgets[l.i];
    if (!w) return <div key={l.i} />;
    const pixelHeight = l.h * GRID_CONFIG.rowHeight + (l.h - 1) * GRID_CONFIG.margin[1];
    // Style values (color/titleColor/rowTextColor/etc.) now flow directly into each
    // widget's own props via resolveWidgetProps — this wrapper only needs an explicit
    // height. Without it, this div defaults to height:auto — any child relying on
    // height:100% (e.g. a map) can't resolve a percentage against an ancestor with no
    // definite size, and collapses to 0 even though .dbe-widget (two levels up) does
    // have a real pixel height from react-grid-layout.
    const textStyle = { height: '100%' };
    const exportMenuOpen = exportMenuId === l.i;
    // Only this widget's own cache entry, not the whole map — passing `chartLibraryData`
    // wholesale into WidgetContent would defeat its memoization, since that object gets a
    // new reference whenever *any* widget's data resolves, not just this one's.
    const chartLibraryEntry = w.dataSource?.widgetId ? chartLibraryData[w.dataSource.widgetId] : undefined;
    const comparisonEntry = w.dataSource?.widgetId ? comparisonData[w.dataSource.widgetId] : undefined;
    // Shared context for resolveWidgetProps — used both by WidgetContent (rendering) and the
    // Export CSV button below (computed fresh on click, not cached from render, so it's
    // never stale and doesn't need `resolved` threaded out of the memoized child).
    const widgetCtx = {
      kpiLiveData, pixelHeight, isDark,
      titleColor: effectiveDashboardStyle.titleColor || titleColor,
      bgColor: effectiveDashboardStyle.bgColor,
      titleWeight: effectiveDashboardStyle.titleWeight,
      titleSize: effectiveDashboardStyle.titleSize,
      titleFont: effectiveDashboardStyle.titleFont,
      titlePosition: effectiveDashboardStyle.titlePosition,
      palette: effectiveDashboardStyle.palette,
      accentColor: effectiveDashboardStyle.accentColor,
      axisTextColor: effectiveDashboardStyle.axisTextColor,
      axisTextWeight: effectiveDashboardStyle.axisTextWeight,
      axisTextSize: effectiveDashboardStyle.axisTextSize,
      axisTextFont: effectiveDashboardStyle.axisTextFont,
      bgGradientFrom: effectiveDashboardStyle.bgGradientFrom,
      bgGradientTo: effectiveDashboardStyle.bgGradientTo,
      dataCache: mockDataCacheRef.current, datasources, chartLibraryData,
    };
    // Visual indicator (Power BI-style): this widget is currently narrowed by the active
    // cross-filter's own click, applied one level above the chart components (not inside
    // BarChart.jsx etc.) so those 4 components stay otherwise unchanged.
    const isCrossFilterTarget = !!activeCrossFilter?.targetIds.includes(l.i);
    return (
      <div
        key={l.i}
        className={`dbe-widget dbe-widget-${w.type}${selectedId === l.i ? ' selected' : ''}${isCrossFilterTarget ? ' dbe-cross-filtered' : ''}`}
        // Clicking anywhere on a widget selects it and swaps the side panel to its
        // fields — not just its title bar, which was too small a target to notice.
        onClick={editable && showChrome ? () => setSelectedId(l.i) : undefined}
      >
        {/* No duplicate title bar here — the widget's own inner title (styled via the
            "Title color" field) is the only one shown, in both edit and preview, so what
            you see while editing matches what gets saved exactly. Just a small floating
            remove control layered on top instead of a dedicated header row. */}
        {(() => {
          // Drill up/down — a single location (this same icon row export/edit/duplicate/
          // delete already use), not a separate in-chart control, and always rendered
          // (edit mode AND read-only/published view alike — see the conversation this was
          // consolidated in), unlike the rest of this row which is editor-only chrome. Down
          // drills into the top-ranked category (the row with the highest y-axis value) —
          // a deterministic stand-in for "click a bar", since a generic down-arrow has no
          // other unambiguous single target the way "up" does.
          const drillDown = chartLibraryEntry?.drillDown;
          const drillable = !!drillDown?.enabled;
          const canDrillUp = drillable && (drillDown.path?.length || 0) > 0;
          const xAxis = drillable ? (drillDown.dimension || w.dataSource?.mapping?.x_axis) : null;
          const yAxis = w.dataSource?.mapping?.y_axis;
          const topRow = drillable && drillDown.has_next_level && chartLibraryEntry?.rows?.length
            ? chartLibraryEntry.rows.reduce((best, r) => (best == null || Number(r[yAxis]) > Number(best[yAxis]) ? r : best), null)
            : null;
          const canDrillDown = !!topRow;
          if (!drillable && !showChrome) return null;
          return (
            <div className={`dbe-widget-actions${exportMenuOpen || drillable ? ' dbe-force-visible' : ''}`}>
              {drillable && (
                <>
                  <button
                    type="button"
                    className="dbe-widget-action"
                    title={canDrillUp ? 'Up one level' : 'Already at the top level'}
                    disabled={!canDrillUp}
                    onClick={(e) => { e.stopPropagation(); stableOnDrillUp(w.dataSource.widgetId, (drillDown.path?.length || 0) - 1); }}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="dbe-widget-action"
                    title={canDrillDown ? `Drill into "${String(topRow[xAxis])}" (top result)` : 'No further level to drill into'}
                    disabled={!canDrillDown}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canDrillDown) return;
                      const label = String(topRow[xAxis]);
                      stableOnPointClick(l.i, { column: xAxis, value: label === 'null' ? null : label });
                    }}
                  >
                    <ChevronDown size={13} />
                  </button>
                </>
              )}
              {showChrome && (
                <>
                  <div className="dbe-export-wrap">
                    <button
                      type="button"
                      className="dbe-widget-action"
                      title="Export"
                      onClick={(e) => { e.stopPropagation(); setExportMenuId(exportMenuOpen ? null : l.i); }}
                    >
                      <Download size={13} />
                    </button>
                    {exportMenuOpen && (
                      <>
                        {/* Transparent backdrop closes the menu on outside click without
                            needing a document-level listener. */}
                        <div className="dbe-export-backdrop" onClick={(e) => { e.stopPropagation(); setExportMenuId(null); }} />
                        <div className="dbe-export-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              // Computed fresh here rather than reused from render —
                              // `resolved` used to be captured every render of
                              // `renderWidget` regardless of whether anyone actually opened
                              // this menu; now it's only ever computed on an actual click,
                              // and WidgetContent below (the thing that's memoized against
                              // unrelated re-renders) never needs to leak this value back
                              // out to the toolbar.
                              const { __resolved: resolved } = resolveWidgetProps(w, widgetCtx);
                              exportWidgetCSV(w.type, w.title, resolved);
                              setExportMenuId(null);
                            }}
                          >
                            Export CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const node = widgetNodeRefs.current[l.i];
                              if (node) exportWidgetPNG(node, w.title);
                              setExportMenuId(null);
                            }}
                          >
                            Export PNG
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {editable && w.type === 'chartLibrary' && w.dataSource?.widgetId && (
                    <button
                      type="button"
                      className="dbe-widget-action"
                      title="Edit widget"
                      onClick={(e) => { e.stopPropagation(); onEditInChartsTab?.(w.dataSource.widgetId); }}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {editable && (
                    <>
                      <button type="button" className="dbe-widget-action" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateWidget(l.i); }}><Copy size={13} /></button>
                      <button type="button" className="dbe-widget-action dbe-widget-remove" title="Remove" onClick={(e) => { e.stopPropagation(); removeWidget(l.i); }}><X size={13} /></button>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })()}
        <div style={textStyle} ref={(el) => { widgetNodeRefs.current[l.i] = el; }}>
          <WidgetContent
            widget={w}
            pixelHeight={pixelHeight}
            kpiLiveData={kpiLiveData}
            isDark={isDark}
            titleColor={widgetCtx.titleColor}
            bgColor={widgetCtx.bgColor}
            titleWeight={widgetCtx.titleWeight}
            titleSize={widgetCtx.titleSize}
            titleFont={widgetCtx.titleFont}
            titlePosition={widgetCtx.titlePosition}
            palette={widgetCtx.palette}
            accentColor={widgetCtx.accentColor}
            axisTextColor={widgetCtx.axisTextColor}
            axisTextWeight={widgetCtx.axisTextWeight}
            axisTextSize={widgetCtx.axisTextSize}
            axisTextFont={widgetCtx.axisTextFont}
            bgGradientFrom={widgetCtx.bgGradientFrom}
            bgGradientTo={widgetCtx.bgGradientTo}
            mockDataCache={mockDataCacheRef.current}
            datasources={datasources}
            chartLibraryEntry={chartLibraryEntry}
            comparisonEntry={comparisonEntry}
            widgetId={l.i}
            onPointClick={stableOnPointClick}
            onDrillUp={stableOnDrillUp}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="dbe-root">
      <style>{`
        .dbe-root { display:flex; flex-direction:column; gap:10px; height:100%; }
        /* Bottom border separates the dashboard-level actions row (name, Filters,
           Save/Cancel/Theme/Export) from the canvas below, so it reads as its own distinct
           section rather than blending into the widget grid. */
        .dbe-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; padding-bottom:10px; border-bottom:1px solid rgb(226 232 240); }
        .dbe-name-input { font-size:14px; padding:6px 10px; border-radius:8px; border:1px solid rgb(203 213 225); min-width:220px; }
        .dbe-name-input:focus { outline:none; border-color:#EC7D09; box-shadow:0 0 0 2px rgba(236,125,9,0.25); }
        /* Drives the Name field's error state (empty/duplicate name on Save) — a quick shake
           on the input plus a fade-in on its tooltip, both Tailwind's arbitrary animate-[]
           syntax referencing these by name (see the toolbar JSX below). */
        @keyframes dbe-shake {
          0%, 100% { transform:translateX(0); }
          20%, 60% { transform:translateX(-4px); }
          40%, 80% { transform:translateX(4px); }
        }
        @keyframes dbe-fade-in {
          from { opacity:0; transform:translateY(-4px); }
          to { opacity:1; transform:translateY(0); }
        }
        .dbe-body { display:flex; gap:12px; flex:1; min-height:0; }
        .dbe-left-panel-wrap { position:relative; flex-shrink:0; height:100%; }
        .dbe-left-panel {
          width:220px; height:100%; flex-shrink:0; display:flex; flex-direction:column; overflow-y:auto;
          scrollbar-width:none; transition:width .15s;
        }
        .dbe-left-panel.collapsed { width:0; overflow:hidden; }
        .dbe-left-panel::-webkit-scrollbar { display:none; width:0; height:0; }
        .dbe-left-panel-toggle {
          position:absolute; top:0; right:-13px; width:22px; height:22px; z-index:3;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          border-radius:6px; border:1px solid rgb(203 213 225); background:#fff; color:#64748b;
        }
        .dbe-left-panel-toggle:hover { color:#EC7D09; border-color:#EC7D09; }
        .dbe-right-panel-wrap { position:relative; flex-shrink:0; height:100%; }
        .dbe-right-panel-toggle {
          position:absolute; top:0; left:-13px; width:22px; height:22px; z-index:3;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          border-radius:6px; border:1px solid rgb(203 213 225); background:#fff; color:#64748b;
        }
        .dbe-right-panel-toggle:hover { color:#EC7D09; border-color:#EC7D09; }
        .dbe-chart-list {
          width:220px; height:100%; flex-shrink:0; display:flex; flex-direction:column; gap:4px; overflow-y:auto;
          scrollbar-width:none; transition:width .15s;
        }
        .dbe-chart-list::-webkit-scrollbar { display:none; width:0; height:0; }
        .dbe-chart-list.collapsed { width:44px; }
        .dbe-chart-list-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:#94a3b8; margin-bottom:2px; padding-left:18px; text-align:right; }
        /* Each row's own styling (.chart-list-item*) now lives in ChartListItem.jsx itself —
           shared with ChartLibrary.jsx's "Charts" tab list, same underlying data. */
        .dbe-palette-row { display:flex; flex-wrap:wrap; gap:8px; }
        .dbe-palette-icon {
          width:64px; height:60px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
          border-radius:10px; border:1px solid rgb(203 213 225); background:#fff;
          cursor:pointer; transition:border-color .15s,filter .15s;
        }
        .dbe-palette-icon:hover { filter:brightness(0.92); }
        .dbe-palette-icon-label { font-size:10px; font-weight:500; line-height:1; text-align:center; color:#475569; }
        .dbe-canvas-col { flex:1; min-width:0; display:flex; flex-direction:column; gap:8px; min-height:0; }
        .dbe-canvas-wrap { flex:1; min-width:0; border:1px dashed rgb(203 213 225); border-radius:10px; padding:8px; overflow:auto; background:rgba(255,255,255,0.4); }
        /* Overrides the global index.css scrollbar rule (always-visible orange thumb) just
           for this canvas — hidden at rest, thin and neutral-colored only on hover, same
           pattern KpiMonitoringDashboard.jsx already uses for its own table widgets. */
        .dbe-canvas-wrap { scrollbar-width: none; }
        .dbe-canvas-wrap::-webkit-scrollbar { width: 0; height: 0; }
        .dbe-canvas-wrap:hover { scrollbar-width: thin; }
        .dbe-canvas-wrap:hover::-webkit-scrollbar { width: 6px; height: 6px; }
        .dbe-canvas-wrap:hover::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.25); border-radius: 3px; }
        .dbe-canvas-wrap:hover::-webkit-scrollbar-track { background: transparent; }
        .dbe-widget { height:100%; width:100%; background:#fff; border:1px solid rgb(226 232 240); border-radius:10px; padding:6px; overflow:hidden; position:relative; cursor:pointer; }
        /* Widgets that paint their own background (StatCard/GaugeCard/etc, via their own
           bg-white dark:bg-[#22273C] classes) are unaffected by this — but KpiTable
           deliberately doesn't (relies on this ancestor, to avoid double-boxing itself), so
           without a dark variant here it stayed white in dark mode while its text correctly
           followed the real theme — white-on-white, unreadable.
           :where(.dark) keeps this rule's specificity down to .dbe-widget alone (0,1,0) —
           KpiMonitoringDashboard.jsx's own .kpi-grid-wrap .dbe-widget rule (background:
           transparent, specificity 0,2,0) always wins there regardless of DOM insertion
           order, so its gauge/stat cards (which paint their own chrome and expect a
           transparent ancestor) can't accidentally get this background peeking through
           behind them. */
          [data-theme="dark"] .dbe-widget { background:#22273C; border-color:rgba(255,255,255,0.1); }
        /* Cross-filtering active-target indicator (Power BI-style) — a colored left edge on
           whichever widget(s) the current click narrowed, so it's clear at a glance which
           charts are affected. Accent color, not the app's brand orange, to read as
           "filtered" rather than "selected" (selectedId already uses its own outline). */
        .dbe-cross-filtered { box-shadow: inset 3px 0 0 #6366F1; }
        .dbe-cross-filter-chip { display:inline-flex; align-items:center; gap:8px; width:fit-content; margin-bottom:8px; padding:4px 10px; border-radius:999px; font-size:12px; background:rgba(99,102,241,0.12); color:#4F46E5; border:1px solid rgba(99,102,241,0.3); }
        [data-theme="dark"] .dbe-cross-filter-chip { background:rgba(99,102,241,0.18); color:#A5B4FC; border-color:rgba(99,102,241,0.4); }
        .dbe-cross-filter-chip button { background:none; border:none; cursor:pointer; color:inherit; font-size:12px; line-height:1; padding:0; }
        /* react-grid-layout's default resize-handle corner marks are a near-black
           rgba(0,0,0,0.4) — invisible against this editor's dark widget cards.
           Uses the [data-theme] attribute (not :where(.dark), which ties in specificity
           with the library's own .react-resizable-handle::after rule and loses the
           tie-break unpredictably depending on CSS insertion order) so this reliably wins. */
        [data-theme="dark"] .react-resizable-handle::after {
          border-right-color: rgba(255,255,255,0.7);
          border-bottom-color: rgba(255,255,255,0.7);
        }
        .dbe-widget.selected { outline:2px solid #EC7D09; }
        .dbe-widget-actions {
          position:absolute; top:4px; right:4px; z-index:2; display:flex; gap:4px;
          opacity:0; transition:opacity .1s;
        }
        .dbe-widget:hover .dbe-widget-actions, .dbe-widget.selected .dbe-widget-actions { opacity:1; }
        .dbe-widget-action {
          width:20px; height:20px; display:flex; align-items:center; justify-content:center;
          color:#64748b; cursor:pointer; background:rgba(255,255,255,0.9); border:none; border-radius:5px;
        }
        .dbe-widget-action:hover { filter:brightness(0.95); }
        .dbe-widget-action:disabled { opacity:0.35; cursor:default; }
        .dbe-widget-action:disabled:hover { filter:none; }
        .dbe-widget-action.dbe-widget-remove { color:#ef4444; }
        .dbe-widget-actions.dbe-force-visible { opacity:1; }
        .dbe-export-wrap { position:relative; }
        .dbe-export-backdrop { position:fixed; inset:0; z-index:3; }
        .dbe-export-menu {
          position:absolute; top:24px; right:0; z-index:4; min-width:110px;
          background:#fff; border:1px solid rgb(226 232 240); border-radius:8px;
          box-shadow:0 4px 12px rgba(0,0,0,0.12); overflow:hidden; display:flex; flex-direction:column;
        }
        [data-theme="dark"] .dbe-export-menu { background:#22273C; border-color:rgba(255,255,255,0.1); }
        .dbe-export-menu button {
          padding:7px 10px; text-align:left; border:none; background:none; cursor:pointer;
          font-size:12px; color:#334155;
        }
        [data-theme="dark"] .dbe-export-menu button { color:#e2e8f0; }
        .dbe-export-menu button:hover { background:#f1f5f9; }
        [data-theme="dark"] .dbe-export-menu button:hover { background:rgba(255,255,255,0.08); }
        .dbe-export-menu-dashboard { top:32px; }
        /* This popover's field list can run much taller than the viewport (10+ style
           fields) — scrollable, scrollbar always hidden (not even on hover). */
        .dbe-theme-popover { max-height:70vh; overflow-y:auto; scrollbar-width:none; }
        .dbe-theme-popover::-webkit-scrollbar { width:0; height:0; }
        .dbe-side-panel { flex-shrink:0; font-size:12px; }
        .dbe-side-panel-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:#94a3b8; margin-bottom:8px; }
        .dbe-side-panel label { display:block; margin-bottom:10px; color:#334155; font-weight:500; }
        .dbe-side-panel select, .dbe-side-panel input[type="text"], .dbe-side-panel input[type="number"] {
          width:100%; margin-top:4px; padding:5px 6px; border-radius:6px; border:1px solid rgb(203 213 225);
          font-weight:400; font-size:12px; box-sizing:border-box; background:#fff; color:#1e293b;
        }
        .dbe-side-panel select:focus, .dbe-side-panel input[type="text"]:focus, .dbe-side-panel input[type="number"]:focus {
          outline:none; border-color:#EC7D09; box-shadow:0 0 0 2px rgba(236,125,9,0.25);
        }
        .dbe-color-row { display:flex; gap:8px; }
        .dbe-color-row > label { flex:1; }
        .dbe-style-section { margin-top:6px; }
        .dbe-style-section summary {
          cursor:pointer; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.03em;
          color:#64748b; padding:6px 8px; border-radius:6px; background:rgb(241 245 249);
          list-style:none; display:flex; align-items:center; gap:4px;
        }
        [data-theme="dark"] .dbe-style-section summary { background:rgba(255,255,255,0.06); color:#94a3b8; }
        .dbe-style-section summary:hover { background:rgb(226 232 240); }
        [data-theme="dark"] .dbe-style-section summary:hover { background:rgba(255,255,255,0.1); }
        .dbe-style-section summary::-webkit-details-marker { display:none; }
        .dbe-style-section summary::before { content:'▸'; font-size:9px; transition:transform .1s; }
        .dbe-style-section[open] summary::before { transform:rotate(90deg); }
        .dbe-style-section .dbe-style-section-body { padding:8px 4px 4px; }

        .react-resizable-handle {
    width: 20px !important;
    height: 20px !important;
}

.react-resizable-handle-se {
    right: 0 !important;
    bottom: 0 !important;
}

.react-resizable-handle::after {
    width: 12px !important;
    height: 12px !important;
    border-right: 2px solid #EC7D09 !important;
    border-bottom: 2px solid #EC7D09 !important;
}
      `}</style>
      {/* WidgetStyleFields.jsx's own controls' CSS lives inside that component now (a
          `<style>` tag there, not here) — it renders in contexts (e.g. ChartLibrary.jsx's
          Style tab) where this component isn't mounted at all, so relying on this file's
          stylesheet left those unstyled. */}

      {editable && showChrome && (
        <div className="dbe-toolbar">
          {/* Name input + Filters (gear + value strip) grouped together on the left;
              Save/Cancel/Theme/Export grouped together on the right — `.dbe-toolbar`'s
              space-between splits these two wrapper divs to opposite ends of the row. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="relative" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              key={nameErrorKey}
              className={`dbe-name-input${nameError ? ' animate-[dbe-shake_0.4s_ease-in-out]' : ''}`}
              style={nameError ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined}
              type="text"
              placeholder="Dashboard name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(null); }}
            />
            {nameError && (
              <div className="absolute left-0 top-full mt-1.5 z-20 w-64 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white shadow-lg animate-[dbe-fade-in_0.15s_ease-out]">
                {nameError}
                <div className="absolute -top-1 left-4 w-2 h-2 bg-red-600 rotate-45" />
              </div>
            )}
          </div>
          {editable && (
            // persistAndApplyFilters now stages locally with no backendId (see above), and
            // the staged rows are carried into the very first createDashboard call the same
            // way pendingDashboardStyle/pendingThemeId already are (via onDashboardStyleState).
            // The gear button and the filter-value strip sit together in this one group,
            // instead of the strip appearing as a separate row above the canvas.
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiltersToggleButton
                filters={dashboardFilters}
                datasourceOptions={filterDatasourceOptions}
                onSave={persistAndApplyFilters}
              />
              {backendId && showFiltersInline && (
                <FilterPanel filters={dashboardFilters} onApply={persistAndApplyFilters} onClear={clearFilterValues} datasourceOptions={filterDatasourceOptions} />
              )}
            </div>
          )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Only shown in the actual editor context — the read-only preview
                (DashboardBuilder.jsx's browse view) has its own export trigger in its
                header (between Edit and Clone), calling this component's
                exportCSV/PNG/PDF via the ref exposed above, so it isn't duplicated here. */}
              <Button
              variant="primary"
              size="sm"
              className="h-8"
              disabled={savingLocal}
              onClick={handleSaveClick}
            >
              {savingLocal ? 'Saving…' : 'Save dashboard'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>Cancel</Button>
            {editable && (
              // Phase 19c — available while creating a new dashboard too, not just after the
              // first save: persistDashboardStyle/bindTheme already degrade gracefully with no
              // backendId (local-only, staged), and the staged values now get sent along with
              // the very first createDashboard call (see onDashboardStyleState below +
              // DashboardBuilder.jsx's handleSave).
              <div className="dbe-export-wrap">
                <button
                  type="button"
                  title="Dashboard style"
                  aria-label="Dashboard style"
                  onClick={() => setDashboardStylePanelOpen((o) => !o)}
                  className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <Palette size={14} /> Theme
                </button>
                {dashboardStylePanelOpen && (
                  <>
                    <div className="dbe-export-backdrop" onClick={() => setDashboardStylePanelOpen(false)} />
                    <div className="dbe-export-menu dbe-theme-popover" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                        Dashboard Level Theme
                      </div>
                      <label className="block">
                        <span className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Theme</span>
                        <select
                          value={boundThemeId || ''}
                          onChange={(e) => bindTheme(e.target.value || null)}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          <option value="">— none (local only) —</option>
                          {themeOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </label>
                      {/* Explicit per user request: this popover only binds an existing Theme
                          by reference and edits *local, this-dashboard-only* overrides on top
                          — it never edits the shared Theme's own definition. That's only
                          possible from the Settings tab (ThemeManager.jsx). */}
                      <div style={{ fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 }}>
                        Picking a Theme above only binds this dashboard to it. Fields below are
                        local overrides for this dashboard only — to edit the Theme itself
                        (affecting every dashboard bound to it), go to Settings.
                      </div>
                      {(boundThemeId || Object.keys(dashboardStyle || {}).length > 0) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => setPendingConfirm({
                            title: 'Reset Dashboard Theme',
                            message: 'Reset the dashboard theme to the application default? This clears all theme overrides and unbinds any linked Theme.',
                            run: () => { bindTheme(null); persistDashboardStyle({}); },
                          })}
                        >
                          Reset to Default
                        </Button>
                      )}
                      {/* Local overrides, layered on top of the bound theme (if any) — an
                          unset field here shows the bound theme's own resolved value via
                          resolvedDefaults, exactly like a per-widget style field falls back
                          to the widget's own real current color. */}
                      <WidgetStyleFields
                        fields={DASHBOARD_STYLE_FIELDS}
                        value={dashboardStyle}
                        resolvedDefaults={boundThemeStyle}
                        onChange={(key, val) => persistDashboardStyle({ ...dashboardStyle, [key]: val })}
                      />
                      {/* No `palette` field exists in DASHBOARD_STYLE_FIELDS (it's an array,
                          not a value the generic WidgetStyleFields renderer supports) — same
                          override rule as everything above it: local `dashboardStyle.palette`
                          (if set) wins over the bound Theme's own palette, via
                          effectiveDashboardStyle in resolveWidgetProps below. */}
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.03em', marginTop: 4 }}>
                        Chart Palette
                      </div>
                      <PaletteEditor
                        value={dashboardStyle.palette || boundThemeStyle.palette || CHART_PALETTE}
                        onChange={(next) => persistDashboardStyle({ ...dashboardStyle, palette: next })}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
             <div className="dbe-export-wrap">
              <button
                type="button"
                title="Export dashboard"
                aria-label="Export dashboard"
                onClick={() => setDashboardExportMenuOpen((o) => !o)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                <Download size={14} />
              </button>
              {dashboardExportMenuOpen && (
                <>
                  <div className="dbe-export-backdrop" onClick={() => setDashboardExportMenuOpen(false)} />
                  <div className="dbe-export-menu dbe-export-menu-dashboard">
                    <button type="button" onClick={() => { exportDashboardCSV(name, collectExportEntries()); setDashboardExportMenuOpen(false); }}>Export CSV</button>
                    <button type="button" onClick={async () => { setDashboardExportMenuOpen(false); await exportDashboardPNG(containerRef.current, Object.values(widgetNodeRefs.current), name); }}>Export PNG</button>
                    <button type="button" onClick={async () => { setDashboardExportMenuOpen(false); await exportDashboardPDF(containerRef.current, Object.values(widgetNodeRefs.current), name); }}>Export PDF</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dbe-body">
        {editable && showChrome && (
          <div className="dbe-left-panel-wrap">
            <button
              type="button"
              className="dbe-left-panel-toggle"
              title={leftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
              onClick={() => setLeftPanelCollapsed((c) => !c)}
            >
              {leftPanelCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
            <div className={`dbe-left-panel${leftPanelCollapsed ? ' collapsed' : ''}`}>
            <details className="dbe-style-section" open={openLeftSection === 'addWidget'}>
              <summary onClick={(e) => { e.preventDefault(); toggleLeftSection('addWidget'); }}>Add Widget</summary>
              <div className="dbe-style-section-body dbe-palette-row">
              {Object.entries(WIDGET_TYPE_REGISTRY).filter(([, def]) => def.builderVisible !== false).map(([type, def]) => {
                const Icon = def.icon;
                const color = def.iconColor || '#475569';
                return (
                  <button
                    key={type}
                    type="button"
                    title={def.label}
                    aria-label={def.label}
                    className="dbe-palette-icon"
                    style={{ color, background: `${color}14`, borderColor: `${color}44` }}
                    onClick={() => { setWizardType(type); setWizardOpen(true); }}
                    draggable={editable}
                    onDragStart={(e) => {
                      setDraggedType(type);
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('text/plain', type);
                    }}
                    onDragEnd={() => setDraggedType(null)}
                  >
                    {Icon && <Icon size={20} />}
                    <span className="dbe-palette-icon-label">{def.label}</span>
                  </button>
                );
              })}
              </div>
            </details>

            {selected && (
              <div className="dbe-side-panel">
                <details className="dbe-style-section" open={openLeftSection === 'selectedWidget'}>
                <summary onClick={(e) => { e.preventDefault(); toggleLeftSection('selectedWidget'); }}>Selected Widget</summary>
                <div className="dbe-style-section-body">
                <label>
                  Title
                  <input
                    type="text"
                    value={selected.title}
                    onChange={(e) => updateWidget(selectedId, { title: e.target.value })}
                  />
                </label>
                {selected.type === 'chartLibrary' ? (
                  selected.dataSource?.widgetId ? (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>
                        Details
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 3, fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>Datasource</span>
                        <span style={{ color: '#334155' }}>{selected.dataSource.datasourceName || '—'}</span>
                        <span style={{ color: '#94a3b8' }}>Widget ID</span>
                        <span style={{ color: '#334155' }} title={selected.dataSource.widgetId}>#{String(selected.dataSource.widgetId).slice(0, 8)}</span>
                        <span style={{ color: '#94a3b8' }}>Type</span>
                        <span style={{ color: '#334155' }}>{selected.dataSource.chartType}</span>
                      </div>
                      {/* "Edit chart" now lives with the other per-widget actions
                          (Export/Duplicate/Remove) on the widget itself, not duplicated here. */}
                    </div>
                  ) : (
                    <div className="dbe-style-empty">No widget picked — this shouldn't normally happen (placed via "Your Widgets" or the create wizard, both set one immediately).</div>
                  )
                ) : selected.dataSource?.type === 'kpiLive' ? (
                  <label>
                    Data source
                    <input type="text" value={`Live KPI data (${selected.dataSource.field})`} disabled />
                  </label>
                ) : (
                  // Legacy widget (mock, or old client-side 'db' aggregation) from a
                  // dashboard saved before those paths were retired in favor of Chart
                  // Library — mock data is reserved for the real KPI Monitoring Dashboard
                  // (kpiLive) only now, not creatable/editable here. Shown read-only rather
                  // than crashing since it may still be on-screen with data.
                  <div className="dbe-style-empty">
                    This widget uses a data source type that's no longer editable here — remove it and add a Real Widget instead.
                  </div>
                )}
                </div>
                </details>
                <details className="dbe-style-section" open={openLeftSection === 'selectedWidgetStyle'}>
                  <summary onClick={(e) => { e.preventDefault(); toggleLeftSection('selectedWidgetStyle'); }}>
                    <span>Selected Widget Style</span>
                    {Object.keys(selected.style || {}).length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="!py-1 !px-2 !text-xs ml-auto"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingConfirm({
                            title: 'Reset Widget Style',
                            message: 'Reset this widget to inherit the dashboard theme? This clears all widget-specific style overrides.',
                            run: () => updateWidget(selectedId, { style: {} }),
                          });
                        }}
                      >
                        Reset to Default
                      </Button>
                    )}
                  </summary>
                  <div className="dbe-style-section-body">
                    {(boundThemeId || Object.keys(dashboardStyle || {}).length > 0) && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                        {boundThemeId
                          ? `Inherited from Theme: ${themeOptions.find((t) => t.id === boundThemeId)?.name || '…'} (via Dashboard Level Theme)`
                          : 'Inherited from this dashboard\'s Level Theme defaults'}
                        {' — any field set here overrides it.'}
                      </div>
                    )}
                    <WidgetStyleFields
                      fields={
                        selected.type === 'chartLibrary'
                          ? chartLibraryStyleFieldsFor(selected.dataSource?.chartType)
                          : (WIDGET_TYPE_REGISTRY[selected.type]?.styleFields || [])
                      }
                      value={selected.style}
                      onChange={(key, val) => updateWidget(selectedId, { style: { ...selected.style, [key]: val } })}
                      resolvedDefaults={{
                        bgColor: effectiveDashboardStyle.bgColor || resolvedBgColor,
                        titleColor: effectiveDashboardStyle.titleColor || resolvedSubColor,
                        valueTextColor: resolvedTextColor,
                        rowTextColor: resolvedTextColor,
                        // Same `sub` token every axis already renders with by default (the
                        // registered ECharts theme's categoryAxis/valueAxis axisLabel color)
                        // — e.g. the grayish "Sun/Mon/00/03..." labels on the Heatmap in dark
                        // mode. The swatch should show that real value, not a placeholder.
                        axisTextColor: resolvedSubColor,
                        // Preview the same auto-derived gradient corners resolveWidgetProps
                        // falls back to when only one of shadeFrom/shadeTo is set, using the
                        // widget's own current accent color — so the swatch shows a real
                        // color instead of a black placeholder before the user picks one.
                        shadeFrom: darkenHex(resolveWidgetStyle(selected.type, selected.style).color || '#378ADD', 0.55),
                        shadeTo: darkenHex(resolveWidgetStyle(selected.type, selected.style).color || '#378ADD', 0.8),
                        // Numeric size fields — same dashboard-cascade-first fallback as the
                        // color fields above, so an unset slider previews the size it's
                        // actually currently rendering at (dashboard/theme's own pick, if
                        // any) instead of an arbitrary mid-range guess.
                        titleSize: effectiveDashboardStyle.titleSize || 12,
                        valueTextSize: effectiveDashboardStyle.valueTextSize || 20,
                        axisTextSize: effectiveDashboardStyle.axisTextSize || 9,
                      }}
                    />
                  </div>
                </details>
                {CATEGORY_COLOR_TYPES.has(selected.type) && (() => {
                  const resolvedProps = resolveWidgetProps(selected, { kpiLiveData, palette: effectiveDashboardStyle.palette });
                  const names = categoryNamesFor(selected.type, resolvedProps);
                  const isStatus = selected.type === 'kpiTable';
                  const labels = Object.fromEntries(names.map((n) => [n, `${isStatus ? STATUS_LABELS[n] : n} color`]));
                  // Swatch defaults mirror exactly what the chart itself would render for an
                  // unpinned category — resolvedProps.palette already resolved the theme's
                  // palette (falling back to the static default), so reuse it here instead of
                  // hardcoding CHART_PALETTE directly.
                  const categoryDefaults = isStatus
                    ? DEFAULT_STATUS_COLORS
                    : Object.fromEntries(names.map((n, i) => [n, resolvedProps.palette[i % resolvedProps.palette.length]]));
                  return names.length ? (
                    <details className="dbe-style-section" open={openLeftSection === 'categoryColors'}>
                      <summary onClick={(e) => { e.preventDefault(); toggleLeftSection('categoryColors'); }}>Category Colors</summary>
                      <div className="dbe-style-section-body">
                        <SeriesColorFields
                          names={names}
                          labels={labels}
                          value={selected.style?.seriesColors}
                          onChange={(name, color) => updateWidget(selectedId, { style: { ...selected.style, seriesColors: { ...selected.style?.seriesColors, [name]: color } } })}
                          resolvedDefaults={categoryDefaults}
                        />
                      </div>
                    </details>
                  ) : null;
                })()}
              </div>
            )}
            </div>
          </div>
        )}

        <div className="dbe-canvas-col">
          {/* Read-only contexts with no toolbar of their own (EmbeddedDashboard.jsx, for
              Insights Engine viewers) have nowhere else to combine this with a Filters gear
              button, so it still renders here as its own strip — only the editable case
              (toolbar above) moved it inline next to FiltersToggleButton. */}
          {!editable && backendId && showFiltersInline && (
            <FilterPanel filters={dashboardFilters} onApply={persistAndApplyFilters} onClear={clearFilterValues} datasourceOptions={filterDatasourceOptions} />
          )}
          {/* Cross-filter clear chip — shown in both editable and read-only/embedded views,
              since clicking a chart to cross-filter is a viewer action, not an edit-mode-only
              one (unlike the Filters strip above, which only ever shows for real backend
              dashboards). Placed once here rather than duplicated at both FilterPanel render
              sites above/below, since it isn't tied to either. */}
          {activeCrossFilter && (
            <div className="dbe-cross-filter-chip">
              Filtering by {activeCrossFilter.column} = {activeCrossFilter.label}
              <button type="button" onClick={clearCrossFilter} aria-label="Clear cross-filter">✕</button>
            </div>
          )}
          <div
            className="dbe-canvas-wrap"
            ref={containerRef}
            style={effectiveDashboardStyle.dashboardBgColor ? { background: effectiveDashboardStyle.dashboardBgColor } : undefined}
          >
          {/* The dashboard's own styled title — rendered here (inside the one shared canvas
              element) so it shows consistently in every context this component is used in
              (editor, DashboardBuilder.jsx's preview, EmbeddedDashboard.jsx) with no separate
              wiring needed per consumer. Purely a display of `name`, not an editable field —
              editing still happens via the toolbar's name input above. */}
          {name && (
            <div
              style={{
                color: effectiveDashboardStyle.dashboardTitleColor || undefined,
                fontWeight: effectiveDashboardStyle.dashboardTitleWeight === 'bold' ? 700 : effectiveDashboardStyle.dashboardTitleWeight === 'normal' ? 400 : 700,
                fontSize: effectiveDashboardStyle.dashboardTitleSize ? `${effectiveDashboardStyle.dashboardTitleSize}px` : '20px',
                fontFamily: effectiveDashboardStyle.dashboardTitleFont || undefined,
                padding: '2px 4px 10px',
              }}
            >
              {name}
            </div>
          )}
          <ResponsiveGridLayout
            // Only the `lg` breakpoint is ever supplied — react-grid-layout's own
            // findOrGenerateResponsiveLayout derives md/sm proportionally from it each time
            // the breakpoint changes, so there's no separate multi-breakpoint shape to
            // store/migrate; `layout` (canonical, 144-col) stays the single source of truth.
            layouts={{ lg: layout }}
            breakpoints={BREAKPOINTS}
            cols={COLS_BY_BREAKPOINT}
            width={containerWidth}
            rowHeight={GRID_CONFIG.rowHeight}
            margin={GRID_CONFIG.margin}
            dragConfig={{ enabled: editable }}
            resizeConfig={{ enabled: editable, handles: ['s', 'e', 'w', 'se'] }}
            dropConfig={{
              enabled: editable,
              // Sized to whatever palette icon or "Your Charts" item is currently being
              // dragged (tracked in React state, not dataTransfer — see draggedType's
              // comment above), rescaled into the currently active breakpoint's own column
              // count so the placeholder preview reads as the right proportion of the row
              // at any screen size. A chart-list drag always uses chartLibrary's defaultSize.
              defaultItem: {
                w: Math.round((WIDGET_TYPE_REGISTRY[draggedChartId ? 'chartLibrary' : draggedType]?.defaultSize?.w || 36) * (COLS_BY_BREAKPOINT[breakpointRef.current] / GRID_CONFIG.cols)),
                h: WIDGET_TYPE_REGISTRY[draggedChartId ? 'chartLibrary' : draggedType]?.defaultSize?.h || 18,
              },
            }}
            onDrop={handleDrop}
            autoSize
            onBreakpointChange={(bp) => { breakpointRef.current = bp; }}
            // Fires on EVERY layout change — including automatic breakpoint-driven reflows
            // (e.g. containerWidth defaulting to 800 for a moment before ResizeObserver
            // reports the real width on mount, briefly putting react-grid-layout at the 'md'
            // breakpoint and auto-generating a reflowed layout from `layouts.lg`), not just
            // genuine user drags/resizes. Only `lg` is safe to treat as a real edit — scale
            // is exactly 1 there, so rescaling is lossless/idempotent; at any other
            // breakpoint this is just react-grid-layout's own derived reflow, and persisting
            // it would silently corrupt the canonical layout with a degraded (often
            // full-width single-column) one — which is exactly what was happening.
            onLayoutChange={editable ? (newLayout) => {
              if (breakpointRef.current !== 'lg') return;
              const scale = GRID_CONFIG.cols / COLS_BY_BREAKPOINT[breakpointRef.current];
              const rescaled = newLayout.map((l) => ({ ...l, x: Math.round(l.x * scale), w: Math.max(1, Math.round(l.w * scale)) }));
              setLayout(rescaled);
              onLayoutChange?.(rescaled);
            } : undefined}
          >
            {layout.map((l) => renderWidget(l))}
          </ResponsiveGridLayout>
          </div>
        </div>

        {editable && showChrome && chartLibraryList.length > 0 && (
          <div className="dbe-right-panel-wrap">
            <button
              type="button"
              className="dbe-right-panel-toggle"
              title={rightPanelCollapsed ? 'Expand Your Widgets' : 'Collapse Your Widgets'}
              onClick={() => setRightPanelCollapsed((c) => !c)}
            >
              {rightPanelCollapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>
            <div className={`dbe-chart-list${rightPanelCollapsed ? ' collapsed' : ''}`}>
              {!rightPanelCollapsed && <div className="dbe-chart-list-title">Your Widgets</div>}
              {!rightPanelCollapsed && chartListActionError && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mb-1">
                  {chartListActionError}
                </div>
              )}
              {sortedChartLibraryList.map((w) => {
                const used = usedChartIds.has(w.id);
                const isSelected = selected?.type === 'chartLibrary' && selected?.dataSource?.widgetId === w.id;
                return (
                  <ChartListItem
                    key={w.id}
                    widget={w}
                    selected={isSelected}
                    disabled={used}
                    badge={used ? 'Added' : null}
                    collapsed={rightPanelCollapsed}
                    title={`${used ? `${w.name} — already on this dashboard` : `${w.name} — drag or click to add`} (id: ${w.id})`}
                    onClick={() => !used && addWidget('chartLibrary', undefined, w.id)}
                    onDelete={() => deleteChartFromList(w)}
                    onDuplicate={() => duplicateChartFromList(w)}
                    onExport={() => exportChartFromList(w)}
                    draggable={editable && !used}
                    onDragStart={(e) => {
                      setDraggedChartId(w.id);
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('text/plain', w.id);
                    }}
                    onDragEnd={() => setDraggedChartId(null)}
                    datasourceNamesById={datasourceNamesById}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <WidgetCreateWizard
        open={wizardOpen}
        initialType={wizardType}
        onClose={() => setWizardOpen(false)}
        onConfirm={(datasourceId) => {
          onCreateViaChartsTab?.({ chartType: MOCK_TYPE_TO_CHART_TYPE[wizardType], datasourceId, name: WIDGET_TYPE_REGISTRY[wizardType]?.label });
        }}
      />

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

export default DashboardCanvasEditor;
