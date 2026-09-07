import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { resolveTruncatedBounds, formatDateLabel, toAxisTimeValue } from '../DashboardBuilder/charts/axisTypeUtils';

/**
 * Horizontal ranked-list bar chart — "Top N sites by traffic," worst-performing cells,
 * etc. Same `{label, value}[]` data shape as BarChart/LineAreaChart (reuses
 * `dataShape: 'series'` mock sources), but sorted descending and capped to `limit` rows,
 * matching the "ranked list" framing rather than a plain unordered bar chart.
 */
export default function HorizontalBarChart({
  title = '', unit = '', data = [], limit = 8, color = '#378ADD', height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null,
  axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', onPointClick = null, onPointContextMenu = null, categoryAxisLabel = null, valueAxisLabel = null,
  truncateYAxis = null, yAxisMin = null, yAxisMax = null,
  // Date format (X_AXIS_DATE_FORMAT_FIELD — see ChartLibrary.jsx) applied per-label, not to a
  // continuous axis: this chart's category axis is always discrete/ranked (see below), never
  // `type: 'time'`, so there's no tick formatter to hand this to the way BarChart.jsx/
  // LineAreaChart.jsx do — each row's own raw value is pre-formatted into its display label
  // instead. No `tickInterval` prop: that field is intentionally not offered for this
  // chart_type at all (see ChartLibrary.jsx's own `showTickInterval` comment) — tick spacing
  // is a continuous-axis concept this ranked list has no equivalent of.
  isTimeAxis = false, dateFormat = undefined,
  // Optional multi-series grouping — same `categories`/`series` shape and per-series
  // color/legend convention as BarChart.jsx's own SERIES_FIELD support, just laid out on the
  // rotated axis this chart already uses (category on yAxis, measure on xAxis). `data`/`color`
  // are ignored in this mode, same as BarChart.jsx.
  categories = null, series = null, showLegend = true, seriesColors = null, palette = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);
  const isMultiSeries = Array.isArray(series) && series.length > 0;

  // Ranked highest-first, but ECharts' category axis draws bottom-to-top — reverse so the
  // highest value still ends up visually at the top of the chart. In multi-series mode there's
  // no single per-category "value" to rank by, so categories are ranked by their own total
  // across every series instead — keeps the same "top N categories" framing this chart's
  // single-series mode already has, rather than silently dropping it once grouped.
  // `rawLabels` — parallel to `labels`, index-for-index, but never date-formatted: click/
  // context-menu cross-filtering (below) must send the actual raw column value back
  // (renderChartWidget.jsx's handlePointClick does `column = <raw value>`), not a display
  // string that's lost precision (e.g. a full timestamp collapsed to "05-18" by Date format)
  // and would no longer match anything in the backend's own column.
  // Date format bucketing (isTimeAxis) — a coarse format (e.g. "MMM DD") applied to raw rows
  // that are individually more granular (e.g. hourly) would otherwise just relabel several
  // *different* rows with the identical display text ("May 13" appearing several times, each
  // for a different hour) — confusing, reads as a bug, not a feature (see the conversation
  // this was reported in). Rows sharing a formatted label are summed into one bucket instead,
  // matching how Superset/Power BI's own "Time Grain" re-aggregates before ranking — each
  // visible bar is then genuinely one distinct period, never a coincidental label collision.
  // Once bucketed, a bar no longer maps to any single raw row, so cross-filtering by exact
  // column value (which handlePointClick sends) can't be done honestly — suppressed below via
  // `crossFilterDisabled` rather than sending a partial/wrong raw value from just one of the
  // rows that got summed into it.
  const crossFilterDisabled = isTimeAxis;
  let labels;
  let rawLabels;
  let seriesForOption;
  if (isMultiSeries) {
    let bucketCats = categories;
    let bucketSeries = series;
    let bucketEpochs = null;
    if (isTimeAxis) {
      const order = [];
      const indexOf = new Map();
      categories.forEach((cat) => {
        const key = formatDateLabel(cat, dateFormat);
        if (!indexOf.has(key)) { indexOf.set(key, order.length); order.push({ key, epoch: toAxisTimeValue(cat) }); }
      });
      bucketCats = order.map((o) => o.key);
      bucketEpochs = order.map((o) => o.epoch);
      bucketSeries = series.map((s) => {
        const bucketData = order.map(() => 0);
        categories.forEach((cat, i) => {
          bucketData[indexOf.get(formatDateLabel(cat, dateFormat))] += Number(s.data[i]) || 0;
        });
        return { name: s.name, data: bucketData };
      });
    }
    // Once bucketed by a time grain, order chronologically (most recent `limit` periods,
    // newest at top) rather than by magnitude — a ranked "top N" reading doesn't apply once
    // this became a real per-period trend (see the conversation this was reported in: ranking
    // by value scrambled the days into a non-chronological, confusing order). Ungrouped/
    // non-time categories keep the original top-N-by-value framing this chart is otherwise for.
    const rankedCats = bucketCats
      .map((cat, i) => ({ cat, total: bucketSeries.reduce((sum, s) => sum + (Number(s.data[i]) || 0), 0), epoch: bucketEpochs?.[i] }))
      .sort((a, b) => (isTimeAxis ? b.epoch - a.epoch : b.total - a.total))
      .slice(0, limit)
      .reverse();
    rawLabels = rankedCats.map((r) => r.cat);
    labels = rankedCats.map((r) => r.cat);
    seriesForOption = bucketSeries.map((s, i) => ({
      name: s.name,
      type: 'bar',
      barMaxWidth: 16,
      itemStyle: { color: seriesColors?.[s.name] || (palette ? palette[i % palette.length] : undefined), borderRadius: [0, 3, 3, 0] },
      data: rankedCats.map((r) => s.data[bucketCats.indexOf(r.cat)]),
    }));
  } else {
    let bucketData = data;
    if (isTimeAxis) {
      const byLabel = new Map();
      data.forEach((d) => {
        const key = formatDateLabel(d.label, dateFormat);
        const existing = byLabel.get(key);
        if (existing) existing.value += d.value;
        else byLabel.set(key, { label: key, value: d.value, epoch: toAxisTimeValue(d.label) });
      });
      bucketData = [...byLabel.values()];
    }
    // Same chronological-once-bucketed reasoning as the multi-series branch above.
    const ranked = [...bucketData].sort((a, b) => (isTimeAxis ? b.epoch - a.epoch : b.value - a.value)).slice(0, limit).reverse();
    rawLabels = ranked.map((d) => d.label);
    labels = ranked.map((d) => d.label);
    seriesForOption = [
      {
        type: 'bar',
        data: ranked.map((d) => d.value),
        itemStyle: { color, borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 16,
        label: { show: true, position: 'right', fontSize: valueTextSize || 9, color: valueTextColor || textColor, formatter: (p) => `${p.value}${unit}` },
      },
    ];
  }
  const yBounds = resolveTruncatedBounds(truncateYAxis, yAxisMin, yAxisMax);

  const option = {
    grid: { left: 8, right: 12, top: categoryAxisLabel ? 20 : 8, bottom: 4 + (isMultiSeries ? 22 : 0), containLabel: true },
    xAxis: {
      type: 'value',
      // This chart's category axis is the vertical one (yAxis, below) — the measure sits
      // horizontally, so the Y-Axis-title override (valueAxisLabel — see renderChartWidget.jsx,
      // still keyed off mapping.y_axis_title/the measure column) lands here instead. Same for
      // truncateYAxis/yAxisMin/yAxisMax (still keyed off the mapping's "Y Axis" group, i.e.
      // the measure) — the ECharts axis actually holding the measure is xAxis here, not yAxis,
      // due to the rotation, so the bound is applied to xAxis.min/max, not yAxis.min/max.
      min: yBounds.min,
      max: yBounds.max,
      name: valueAxisLabel || undefined,
      nameLocation: 'end',
      nameGap: 6,
      nameTextStyle: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined },
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined },
    },
    yAxis: {
      type: 'category',
      data: labels,
      // Which column the tick labels actually represent — see BarChart.jsx's own comment on
      // this same prop. Placed above the axis (this chart's category axis is vertical, on the
      // left) rather than 'middle', which would rotate 90° and cramp the bar labels.
      name: categoryAxisLabel || undefined,
      nameLocation: 'end',
      nameGap: 6,
      nameTextStyle: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, align: 'left' },
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined },
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${v} ${unit}` },
    // Legend only meaningful once there's more than one named series — see BarChart.jsx's own
    // identical block. Placed at the bottom, same as every other multi-series chart in this app.
    ...(isMultiSeries ? { legend: { show: showLegend, bottom: 0, textStyle: { fontSize: 9, color: subColor }, itemWidth: 10, itemHeight: 10 } } : {}),
    series: seriesForOption,
  };

  return (
    <div className="kpi-hbar-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-hbar-title font-bold text-[0.6875rem] block truncate"
            style={{
              color: titleColor || subColor,
              fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined,
              fontSize: titleSize ? `${titleSize}px` : undefined,
              fontFamily: titleFont || undefined,
              textAlign: POSITION_TEXT_ALIGN[titlePosition] || 'left',
            }}
          >
            {title}
          </span>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={(!crossFilterDisabled && (onPointClick || onPointContextMenu)) ? {
          ...(onPointClick ? { click: (p) => onPointClick(rawLabels[p.dataIndex]) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(rawLabels[p.dataIndex], p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
    </div>
  );
}
