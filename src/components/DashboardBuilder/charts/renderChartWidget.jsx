import React from 'react';
import BarChart from '../../Widgets/BarChart';
import AreaChart from '../../Widgets/AreaChart';
import PieChart from '../../Widgets/PieChart';
import LineAreaChart from '../../Widgets/LineAreaChart';
import StatCard from '../../Widgets/StatCard';
import GaugeCard from '../../Widgets/GaugeCard';
import ScatterChart from '../../Widgets/ScatterChart';
import HorizontalBarChart from '../../Widgets/HorizontalBarChart';
import StackedBarChart from '../../Widgets/StackedBarChart';
import FunnelChart from '../../Widgets/FunnelChart';
import WaterfallChart from '../../Widgets/WaterfallChart';
import TreemapChart from '../../Widgets/TreemapChart';
import HeatStripChart from '../../Widgets/HeatStripChart';
import VirtualizedTable from './VirtualizedTable';
import { isTimeAxis, DEFAULT_TIME_AXIS_FORMAT, resolveTickInterval } from './axisTypeUtils';
import { formatCompactNumber } from '../utils/formatNumber';

// Undernote for a single-value chart_type's delta (KPI_CARD/GAUGE — see
// SINGLE_VALUE_COMPARISON_GROUP in ChartLibrary.jsx) — what it's actually being compared
// against, since "▲ 12%" alone doesn't say what the baseline is. Custom's own shape depends on
// aggregation: LATEST has a single cutoff instant (compare_custom_date — no window to speak
// of), every other aggregation has an explicit from/to range (compare_custom_from/_to).
function describeCompareTo(mapping) {
  if (!mapping.compare_to || mapping.compare_to === 'None') return '';
  if (mapping.compare_to !== 'Custom') return `vs ${mapping.compare_to}`;
  if (mapping.aggregation === 'LATEST') return `vs ${mapping.compare_custom_date || 'custom date'}`;
  return mapping.compare_custom_from && mapping.compare_custom_to
    ? `vs ${mapping.compare_custom_from} – ${mapping.compare_custom_to}`
    : 'vs custom range';
}

/**
 * Maps a real backend chart_type + mapping + queried rows onto whichever existing themed
 * Widgets/ component matches its shape. Shared between ChartLibrary.jsx (standalone preview)
 * and any dashboard view that renders attached real widgets, so both stay in sync instead of
 * each re-implementing the chart_type switch. LINE uses LineAreaChart (ECharts, themed)
 * rather than the separate MapBox/LineChart.jsx, which is Recharts-based, unrelated to
 * DashboardBuilder, and doesn't follow this app's shared theming.
 *
 * `style` (optional) — per-placement visual overrides (titleColor/titleWeight/titleSize/
 * titleFont/bgColor/bgGradient/palette/valueTextColor/valueTextSize/axisTextColor/
 * axisTextWeight/axisTextSize/axisTextFont), from a dashboard widget's own `style` object
 * (see widgetTypeRegistry.js's `chartLibrary` styleFields, cascaded through
 * DashboardCanvasEditor.jsx's resolveWidgetProps the same way every mock widget's style is)
 * — layered on top of the chart's shared chart_type/mapping/data, never touching those.
 * Passed to every case uniformly; each underlying component simply ignores whichever of
 * these props it doesn't support (e.g. StatCard has no axis, PieChart has no axis, etc.) —
 * safe to pass regardless.
 */
export default function renderChartWidget({ chartType, name, mapping = {}, rows = [], height = 300, style = {}, onPointClick = null, onPointContextMenu = null, comparison = undefined, drillDown = undefined }) {
  // The backend swaps the row's actual grouping column to `drill_down.dimension` the moment
  // a drill-down hierarchy is configured on this chart — not just once you've clicked to
  // drill deeper (confirmed: a freshly-configured, never-yet-clicked drill hierarchy already
  // returns rows keyed by the drill dimension, e.g. "region", not `mapping.x_axis`'s
  // "starttime" — the two `columns` responses differ). `mapping.x_axis` alone is stale the
  // instant drill_down.enabled is true, so every label built from it renders "undefined".
  const xAxis = (drillDown?.enabled && drillDown.dimension) || mapping.x_axis;
  const yAxis = mapping.y_axis;
  // "As of <timestamp>" — appended directly onto the axis title below (categoryAxisLabel),
  // right beside the column name it's already showing, rather than a separate floating badge
  // (tried first, then moved here per the conversation this was decided in — one label saying
  // "this is column X, freshest reading Y" reads better than two disconnected pieces of UI).
  // Only meaningful for LATEST (every other aggregation covers a whole range, not a single
  // "as of" instant) — the single most recent latest_by value across whatever rows actually
  // came back, so a grouped chart (LATEST + a dimension, one "latest" row per category) still
  // shows one honest instant rather than picking an arbitrary row's.
  const latestAsOf = mapping.aggregation === 'LATEST' && mapping.latest_by && rows.length
    ? rows.reduce((max, r) => {
      const v = r[mapping.latest_by];
      return v != null && (max == null || String(v) > String(max)) ? v : max;
    }, null)
    : null;
  // `mapping.x_axis_title`/`mapping.y_axis_title` (see X_AXIS_TITLE_FIELD/Y_AXIS_TITLE_FIELD
  // in ChartLibrary.jsx) — when left blank, falls back to the underlying column name
  // (xAxis/yAxis) rather than hiding the axis title entirely.
  const categoryAxisLabel = (() => {
    const base = mapping.x_axis_title || xAxis;
    return latestAsOf != null ? `${base} (As of ${latestAsOf})` : base;
  })();
  const valueAxisLabel = mapping.y_axis_title || yAxis;
  // Fully custom tick spacing (X_AXIS_TICK_INTERVAL_VALUE_FIELD/_UNIT_FIELD in ChartLibrary.jsx)
  // — undefined when left blank, meaning "Auto" (ECharts' own span/width-based spacing).
  const tickInterval = resolveTickInterval(mapping.x_axis_tick_interval_value, mapping.x_axis_tick_interval_unit);
  // Cross-filtering — `onPointClick` (from DashboardCanvasEditor's widget-level handler)
  // needs to know which column the clicked point actually came from. Wired for every
  // chart_type whose mapping has a real dimension column and whose click event reports back
  // a category/slice *label* rather than raw x/y measures: BAR, PIE, LINE, AREA,
  // HORIZONTAL_BAR, FUNNEL, WATERFALL, TREEMAP, HEAT_MAP, STACKED_BAR (matched by category/
  // x_axis only — a stacked segment's own series/grouping dimension isn't part of the match
  // for this first cut). That label is always `String(row[xAxis])` (see seriesData() below),
  // so the column is always `xAxis` regardless of chart type. Deliberately NOT wired for
  // SCATTER (its mapping is two raw measures, no dimension column at all — RAW_CHART_TYPES),
  // GAUGE/KPI_CARD (measure-only mapping, nothing to click into), or TABLE (a DOM row/cell
  // click, not an ECharts event — a separate mechanism, out of scope here).
  //
  // A real SQL NULL in the row becomes the 3-character string "null" once it passes through
  // `String(row[xAxis])` for display — ECharts has no other way to render a missing category.
  // Sending that string straight back as the filter value produces `column = 'null'` (a string
  // comparison), which matches zero rows even though the null row genuinely exists — the
  // backend needs a real `null` here to build an IS NULL check instead. This only
  // mis-identifies a genuine string value that happens to literally be "null", which is the
  // same ambiguity the chart's own category label already has (nothing displayed can tell the
  // two apart either).
  const handlePointClick = onPointClick
    ? (label) => onPointClick({ column: xAxis, value: label === 'null' ? null : label })
    : null;
  // Right-click on a point — separate from handlePointClick above (which drives left-click
  // cross-filter/drill-in); this instead opens the point-anchored "Drill down into X / Drill
  // up" menu (DrillContextMenu, rendered by ChartLibraryWidgetView, which owns the actual
  // open/closed menu state) rather than acting immediately. Same label/null-handling as
  // handlePointClick, and wired for the identical chart_type set.
  const handlePointContextMenu = onPointContextMenu
    ? (label, x, y) => onPointContextMenu(label === 'null' ? null : label, x, y)
    : null;
  const {
    titleColor, titleWeight, titleSize, titleFont, titlePosition, bgColor,
    bgGradient: bgGradientRaw, bgGradientFrom, bgGradientTo, palette, color,
    colorFrom, colorTo, valuePosition,
    valueTextColor, valueTextSize, axisTextColor, axisTextWeight, axisTextSize, axisTextFont,
    valueDecimals: valueDecimalsRaw, unit, donut, showLegend, numberFormat, showPercent, showDataPoints,
  } = style;
  // Y-axis truncation reads from `mapping` (Data tab, Y Axis group — see
  // TRUNCATE_Y_AXIS_FIELD in ChartLibrary.jsx), not `style` — it's a data-scoping concern
  // (which values are even visible/comparable), not a cosmetic one, so it belongs with
  // Measure/Aggregation, not colors/text sizing.
  const truncateYAxis = mapping.truncate_y_axis;
  const yAxisMin = mapping.y_axis_min;
  const yAxisMax = mapping.y_axis_max;
  // X-axis equivalent — only meaningful for SCATTER (see TRUNCATE_X_AXIS_FIELD's own doc
  // comment in ChartLibrary.jsx for why every other chart_type's x_axis, a dimension/time
  // column, doesn't take a numeric bound the same way).
  const truncateXAxis = mapping.truncate_x_axis;
  const xAxisMin = mapping.x_axis_min;
  const xAxisMax = mapping.x_axis_max;
  // `?? 2` here too (not just in DashboardCanvasEditor.jsx's cascade) since ChartLibrary.jsx's
  // own standalone preview calls this directly with `mapping.style`, bypassing that cascade
  // entirely — this is the one spot both paths funnel through, so the default lives here as
  // a safety net regardless of which caller it came from.
  const valueDecimals = valueDecimalsRaw ?? 2;
  // Same story as valueDecimals above: DashboardCanvasEditor.jsx's cascade pre-combines
  // bgGradientFrom/bgGradientTo into a `bgGradient` array before calling this — but
  // ChartLibrary.jsx's own standalone preview passes `mapping.style` directly, which only
  // ever has the two raw pieces (that's literally how WidgetStyleFields stores them, one key
  // per field), never a pre-combined array. Combining it here too means both callers work.
  const bgGradient = bgGradientRaw || ((bgGradientFrom || bgGradientTo) ? [bgGradientFrom, bgGradientTo] : null);
  const round = (v) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(valueDecimals)) : v);
  const seriesData = () => rows.map((r) => ({ label: String(r[xAxis]), value: round(Number(r[yAxis]) || 0) }));
  const styleProps = {
    titleColor, titleWeight, titleSize, titleFont, titlePosition, bgColor, bgGradient, palette, color,
    valueTextColor, valueTextSize, axisTextColor, axisTextWeight, axisTextSize, axisTextFont,
  };
  // Optional multi-series grouping (mapping.series — see SERIES_FIELD in ChartLibrary.jsx),
  // same grouping shape STACKED_BAR already builds below, reused by BAR/AREA/LINE's own cases.
  // Only called once mapping.series is actually set (checked at each call site) — an unset
  // `mapping.series` must never reach here, since `rows.find(... === undefined)` would still
  // "match" every row against `String(r[undefined])` ("undefined" === "undefined").
  const buildMultiSeries = () => {
    const seriesAxis = mapping.series;
    const categories = [...new Set(rows.map((r) => String(r[xAxis])))];
    const seriesNames = [...new Set(rows.map((r) => String(r[seriesAxis])))];
    const series = seriesNames.map((sName) => ({
      name: sName,
      data: categories.map((cat) => {
        const match = rows.find((r) => String(r[xAxis]) === cat && String(r[seriesAxis]) === sName);
        return match ? round(Number(match[yAxis]) || 0) : 0;
      }),
    }));
    return { categories, series };
  };

  switch (chartType) {
    case 'BAR': {
      // mapping.series unset (every pre-existing saved BAR widget) keeps today's exact
      // single-series `data`/`color` path below. isTimeAxis/dateFormat/tickInterval now flow
      // into the multi-series branch too (previously dropped entirely — see the conversation
      // this was fixed in) — BarChart.jsx's own multi-series case decides whether to render a
      // real continuous time axis (categories are real timestamps, each series remapped to
      // [epoch, value] pairs) or keep the discrete category axis it already had.
      const barTimeAxis = isTimeAxis(rows.map((r) => r[xAxis]));
      const barDateFormat = mapping.x_axis_date_format || DEFAULT_TIME_AXIS_FORMAT;
      if (mapping.series) {
        const { categories, series } = buildMultiSeries();
        return <BarChart title={name} categories={categories} series={series} isTimeAxis={barTimeAxis} dateFormat={barDateFormat} tickInterval={tickInterval} height={height} showLegend={showLegend} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
      }
      return <BarChart title={name} data={seriesData()} isTimeAxis={barTimeAxis} dateFormat={barDateFormat} tickInterval={tickInterval} height={height} valuePosition={valuePosition} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
    }
    case 'AREA': {
      // Same mapping.series/time-axis branch as BAR above.
      const areaTimeAxis = isTimeAxis(rows.map((r) => r[xAxis]));
      const areaDateFormat = mapping.x_axis_date_format || DEFAULT_TIME_AXIS_FORMAT;
      if (mapping.series) {
        const { categories, series } = buildMultiSeries();
        return <AreaChart title={name} categories={categories} series={series} isTimeAxis={areaTimeAxis} dateFormat={areaDateFormat} tickInterval={tickInterval} height={height} showLegend={showLegend} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
      }
      return <AreaChart title={name} data={seriesData()} isTimeAxis={areaTimeAxis} dateFormat={areaDateFormat} tickInterval={tickInterval} height={height} valuePosition={valuePosition} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
    }
    case 'PIE':
      return <PieChart title={name} data={seriesData()} height={height} donut={donut} showLegend={showLegend} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} {...styleProps} />;
    case 'LINE': {
      // Same mapping.series/time-axis branch as BAR above.
      const lineTimeAxis = isTimeAxis(rows.map((r) => r[xAxis]));
      const lineDateFormat = mapping.x_axis_date_format || DEFAULT_TIME_AXIS_FORMAT;
      if (mapping.series) {
        const { categories, series } = buildMultiSeries();
        return <LineAreaChart title={name} categories={categories} series={series} isTimeAxis={lineTimeAxis} dateFormat={lineDateFormat} tickInterval={tickInterval} height={height} showLegend={showLegend} showDataPoints={showDataPoints} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
      }
      // Raw (un-stringified) x-values, so a time-shaped column can be handed to LineAreaChart
      // as real Date.parse-able values instead of already-flattened display labels.
      const lineData = rows.map((r) => ({ label: String(r[xAxis]), value: round(Number(r[yAxis]) || 0) }));
      return <LineAreaChart title={name} data={lineData} isTimeAxis={lineTimeAxis} dateFormat={lineDateFormat} tickInterval={tickInterval} height={height} valuePosition={valuePosition} showDataPoints={showDataPoints} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
    }
    case 'KPI_CARD': {
      const rawValue = rows[0]?.[yAxis];
      // `round()` still runs first so 'full' mode keeps its existing decimal-place behavior;
      // 'compact' formats off the same rounded number rather than the raw one, so e.g. a
      // 2-decimal setting doesn't leak a 3rd significant digit into "1.23M" vs "1.2M".
      // `?? 'compact'` for the same reason as valueDecimals' `?? 2` above — ChartLibrary.jsx's
      // own standalone preview passes `mapping.style` directly, bypassing resolveWidgetStyle's
      // default-filling cascade, so the field default needs a safety net here too.
      const formatValue = (v) => ((numberFormat ?? 'compact') === 'compact'
        ? formatCompactNumber(round(v), valueDecimals)
        : String(round(v)));
      const displayValue = typeof rawValue === 'number' ? formatValue(rawValue) : String(rawValue ?? '—');
      // "Compare to" (mapping.compare_to/delta_format — see CHART_TYPE_FIELDS's KPI_CARD
      // entry in ChartLibrary.jsx) — `comparison` is computed by DashboardCanvasEditor.jsx's
      // own second-query effect (this component has no fetch of its own); `null` there means
      // that fetch failed, `undefined` means compare_to isn't set (or this is the standalone
      // ChartLibrary.jsx preview, which never runs the comparison fetch at all) — both cases
      // fall through to no delta shown at all, same as before this feature existed.
      const deltaFormat = mapping.delta_format || 'Percent';
      const deltaText = comparison && comparison.delta != null
        ? (deltaFormat === 'Number'
          ? `${comparison.delta >= 0 ? '+' : ''}${formatValue(comparison.delta)}`
          : comparison.deltaPercent != null
            ? `${comparison.deltaPercent >= 0 ? '+' : ''}${round(comparison.deltaPercent)}%`
            : `${comparison.delta >= 0 ? '+' : ''}${formatValue(comparison.delta)}`) // no prior-period value to divide by — fall back to the raw number even in Percent mode
        : null;
      const deltaTooltip = deltaText ? describeCompareTo(mapping) : '';
      return (
        <StatCard
          label={name}
          value={displayValue}
          unit={unit}
          delta={deltaText}
          deltaUp={comparison?.deltaUp}
          deltaTooltip={deltaTooltip}
          bgColor={bgColor}
          bgGradient={bgGradient}
          valueTextColor={valueTextColor}
          valueTextSize={valueTextSize}
          titleColor={titleColor}
          titleWeight={titleWeight}
          titleSize={titleSize}
          titleFont={titleFont}
          titlePosition={titlePosition}
          valuePosition={valuePosition}
        />
      );
    }
    case 'GAUGE': {
      // Same compact-vs-full toggle as KPI_CARD above, reused here since a gauge's center
      // label is the same kind of raw-number display, just inside an ECharts gauge instead
      // of a plain <span> — the "not using Echarts" framing in the design ask was about which
      // widgets render a number as-is with no formatting at all, not literally which library
      // draws the widget's chrome.
      const gaugeFormatter = (v) => ((numberFormat ?? 'compact') === 'compact'
        ? formatCompactNumber(round(v), valueDecimals)
        : String(round(v)));
      // Same "Compare to" feature as KPI_CARD above (see SINGLE_VALUE_COMPARISON_GROUP in
      // ChartLibrary.jsx) — identical delta/tooltip derivation, just handed to GaugeCard's
      // own delta props instead of StatCard's.
      const gaugeDeltaFormat = mapping.delta_format || 'Percent';
      const gaugeDeltaText = comparison && comparison.delta != null
        ? (gaugeDeltaFormat === 'Number'
          ? `${comparison.delta >= 0 ? '+' : ''}${gaugeFormatter(comparison.delta)}`
          : comparison.deltaPercent != null
            ? `${comparison.deltaPercent >= 0 ? '+' : ''}${round(comparison.deltaPercent)}%`
            : `${comparison.delta >= 0 ? '+' : ''}${gaugeFormatter(comparison.delta)}`)
        : null;
      const gaugeDeltaTooltip = gaugeDeltaText ? describeCompareTo(mapping) : '';
      return (
        <GaugeCard
          title={name}
          value={round(Number(rows[0]?.[yAxis]) || 0)}
          height={height}
          valueFormatter={gaugeFormatter}
          showPercent={showPercent ?? true}
          delta={gaugeDeltaText}
          deltaUp={comparison?.deltaUp}
          deltaTooltip={gaugeDeltaTooltip}
          {...styleProps}
        />
      );
    }
    case 'SCATTER':
      return (
        <ScatterChart
          title={name}
          // `xLabel`/`yLabel` are the tooltip's own column identifiers — always shown (falls
          // back to the raw column name) since a tooltip with no label at all ("+: 42") is
          // just confusing, unlike the axis title below, which is a deliberate opt-in.
          xLabel={mapping.x_axis_title || xAxis}
          yLabel={mapping.y_axis_title || yAxis}
          // The actual on-chart axis titles — falls back to the raw column name when blank,
          // same as categoryAxisLabel/valueAxisLabel above.
          xAxisLabel={mapping.x_axis_title || xAxis}
          yAxisLabel={mapping.y_axis_title || yAxis}
          truncateXAxis={truncateXAxis} xAxisMin={xAxisMin} xAxisMax={xAxisMax}
          truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax}
          data={rows.map((r) => ({
            x: round(Number(r[xAxis]) || 0),
            y: round(Number(r[yAxis]) || 0),
            // Optional — mapping.label (see CHART_TYPE_FIELDS's SCATTER entry in
            // ChartLibrary.jsx) identifies which row a dot came from on hover; ScatterChart
            // already reads `name` per point into its tooltip, this just populates it.
            name: mapping.label ? String(r[mapping.label]) : undefined,
          }))}
          height={height}
          {...styleProps}
        />
      );
    case 'HORIZONTAL_BAR': {
      // Same mapping.series branch as BAR above — buildMultiSeries() is orientation-agnostic
      // (just categories/series arrays), HorizontalBarChart itself decides which ECharts axis
      // (rotated: category on yAxis, measure on xAxis) each one lands on. `isTimeAxis`/
      // `dateFormat` apply regardless of series grouping — HorizontalBarChart.jsx formats each
      // row's own label text with it (a discrete/ranked axis, no continuous tick formatter to
      // hand this to the way BAR/AREA/LINE do — see that component's own comment).
      const hbarTimeAxis = isTimeAxis(rows.map((r) => r[xAxis]));
      if (mapping.series) {
        const { categories, series } = buildMultiSeries();
        return <HorizontalBarChart title={name} categories={categories} series={series} isTimeAxis={hbarTimeAxis} dateFormat={mapping.x_axis_date_format || DEFAULT_TIME_AXIS_FORMAT} height={height} limit={20} showLegend={showLegend} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
      }
      return <HorizontalBarChart title={name} data={seriesData()} isTimeAxis={hbarTimeAxis} dateFormat={mapping.x_axis_date_format || DEFAULT_TIME_AXIS_FORMAT} height={height} limit={20} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
    }
    case 'FUNNEL':
      return <FunnelChart title={name} data={seriesData()} height={height} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} {...styleProps} />;
    case 'WATERFALL':
      return <WaterfallChart title={name} data={seriesData()} height={height} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
    case 'TREEMAP':
      return <TreemapChart title={name} data={seriesData()} height={height} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} {...styleProps} />;
    case 'STACKED_BAR': {
      const seriesAxis = mapping.series;
      const categories = [...new Set(rows.map((r) => String(r[xAxis])))];
      const seriesNames = [...new Set(rows.map((r) => String(r[seriesAxis])))];
      const series = seriesNames.map((sName) => ({
        name: sName,
        data: categories.map((cat) => {
          const match = rows.find((r) => String(r[xAxis]) === cat && String(r[seriesAxis]) === sName);
          return match ? round(Number(match[yAxis]) || 0) : 0;
        }),
      }));
      return <StackedBarChart title={name} categories={categories} series={series} height={height} showLegend={showLegend} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} valueAxisLabel={valueAxisLabel} truncateYAxis={truncateYAxis} yAxisMin={yAxisMin} yAxisMax={yAxisMax} {...styleProps} />;
    }
    case 'TABLE': {
      const cols = mapping.columns || [];
      return (
        <div
          className="border border-slate-100 rounded-lg h-full"
          style={{ background: bgGradient ? `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` : bgColor || undefined }}
        >
          <VirtualizedTable
            rows={rows}
            cols={cols}
            round={round}
            valueTextColor={valueTextColor}
            formatValue={(numberFormat ?? 'compact') === 'compact' ? (v) => formatCompactNumber(v, valueDecimals) : null}
          />
        </div>
      );
    }
    case 'HEAT_MAP':
      return <HeatStripChart title={name} unit={unit} data={seriesData()} colorFrom={colorFrom} colorTo={colorTo} height={height} onPointClick={handlePointClick} onPointContextMenu={handlePointContextMenu} categoryAxisLabel={categoryAxisLabel} {...styleProps} />;
    default:
      return <div className="text-xs text-slate-500">{rows.length} row(s) returned.</div>;
  }
}
