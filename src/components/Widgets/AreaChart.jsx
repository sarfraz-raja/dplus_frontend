import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { buildAxisTitle, gridMarginForVerticalTitle } from './axisTitle';
import { resolveCustomTickFormatter, toAxisTimeValue, buildCustomTimeTicks, resolveTruncatedBounds } from '../DashboardBuilder/charts/axisTypeUtils';

/**
 * Filled area trend chart — same `{label, value}[]` single-series shape and theme wiring
 * as LineAreaChart.jsx, with a more prominent fill (higher opacity, no line symbols) to
 * read as "volume over time" rather than a precise point-by-point trend line. A true
 * multi-series *stacked* area chart isn't built here — the mock data model
 * (mockDataSources.js's `dataShape: 'series'`) only produces one series per source, so
 * there's nothing yet to stack; this covers the single-series "area" half of that ask.
 */
export default function AreaChart({
  title = '', unit = '', data = [], color = '#378ADD', height = 90, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null,
  axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', valuePosition = 'top-right', onPointClick = null, onPointContextMenu = null, categoryAxisLabel = null,
  isTimeAxis = false, valueAxisLabel = null, dateFormat = undefined, tickInterval = undefined,
  truncateYAxis = null, yAxisMin = null, yAxisMax = null,
  // Optional multi-series grouping (mapping.series) — see BarChart.jsx's identical block for
  // the full rationale; `data`/`color` are ignored in this mode.
  categories = null, series = null, showLegend = true, seriesColors = null, palette = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);
  const isMultiSeries = Array.isArray(series) && series.length > 0;

  const values = data.map((d) => d.value);
  const labels = isMultiSeries ? categories : data.map((d) => d.label);
  const latest = values.length ? values[values.length - 1] : 0;
  // See BarChart.jsx's own comment on this same pattern — raw click-identification labels,
  // kept separate from whatever's actually displayed/formatted.
  const clickLabels = labels;
  // Every series shares the same x positions — see BarChart.jsx's own identical comment.
  const timeXValues = isTimeAxis ? labels.map((l) => toAxisTimeValue(l)) : null;
  const seriesValues = isTimeAxis ? values.map((v, i) => [timeXValues[i], v]) : values;
  // See BarChart.jsx's own comment on this same pattern.
  const customTicks = isTimeAxis ? buildCustomTimeTicks(timeXValues, tickInterval) : undefined;
  const yBounds = resolveTruncatedBounds(truncateYAxis, yAxisMin, yAxisMax);

  const option = {
    // Extra left margin when the Y axis has a title — see axisTitle.js's own doc comment.
    grid: { left: gridMarginForVerticalTitle(valueAxisLabel, 28, 42), right: 4, top: 8, bottom: (categoryAxisLabel ? 32 : 18) + (isMultiSeries ? 14 : 0) },
    xAxis: isTimeAxis ? {
      type: 'time',
      // See LineAreaChart.jsx's own comment — pairs with toAxisTimeValue above.
      useUTC: true,
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: {
        fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: resolveCustomTickFormatter(dateFormat, tickInterval, customTicks),
        ...(customTicks ? { customValues: customTicks } : {}),
      },
      ...(customTicks ? { axisTick: { customValues: customTicks } } : {}),
    } : {
      type: 'category',
      data: labels,
      boundaryGap: false,
      // Which column the tick labels actually represent — see BarChart.jsx's own comment on
      // this same prop for why it can differ from mapping.x_axis once drilling is active.
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: Math.max(0, Math.ceil(labels.length / 6) - 1) },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitNumber: 2,
      // See BarChart.jsx's own comment on this same pattern.
      min: yBounds.min,
      max: yBounds.max,
      ...buildAxisTitle(valueAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont, vertical: true }),
      axisLabel: {
        fontSize: axisTextSize || 8,
        color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v),
      },
    },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} ${unit}` },
    // Legend only meaningful once there's more than one named series — see BarChart.jsx's own
    // identical block.
    ...(isMultiSeries ? { legend: { show: showLegend, bottom: 0, textStyle: { fontSize: 9, color: subColor }, itemWidth: 10, itemHeight: 10 } } : {}),
    series: isMultiSeries ? series.map((s, i) => {
      const sColor = seriesColors?.[s.name] || (palette ? palette[i % palette.length] : undefined);
      return {
        name: s.name,
        type: 'line',
        // Positional array for the category axis; [epoch, value] pairs for the continuous
        // time axis — same isTimeAxis branch the xAxis block above already switches on. See
        // BarChart.jsx's own identical comment.
        data: isTimeAxis ? s.data.map((v, j) => [timeXValues[j], v]) : s.data,
        smooth: true,
        symbol: (onPointClick || onPointContextMenu) ? 'circle' : 'none',
        symbolSize: (onPointClick || onPointContextMenu) ? 10 : undefined,
        itemStyle: (onPointClick || onPointContextMenu) ? { opacity: 0, color: sColor } : { color: sColor },
        lineStyle: { width: 1.5, color: sColor },
        areaStyle: { color: sColor, opacity: 0.35 },
        emphasis: { disabled: true },
        blur: {
          lineStyle: { opacity: 1 },
          areaStyle: { opacity: 0.1 },
          itemStyle: { opacity: 1 },
        },
      };
    }) : [
      {
        type: 'line',
        data: seriesValues,
        smooth: true,
        // ECharts hit-tests a line series' click/contextmenu events against its symbol, not
        // the stroke/fill — `symbol: 'none'` (the plain look this chart wants) leaves nothing
        // for a click to land on, so cross-filtering/drilling never fired. When a click handler
        // is actually wired, swap in an invisible-but-real symbol (opacity 0 itemStyle) just
        // big enough to hit, instead of changing the chart's visual look.
        symbol: (onPointClick || onPointContextMenu) ? 'circle' : 'none',
        symbolSize: (onPointClick || onPointContextMenu) ? 10 : undefined,
        itemStyle: (onPointClick || onPointContextMenu) ? { opacity: 0 } : undefined,
        lineStyle: { width: 1.5, color },
        areaStyle: { color, opacity: 0.35 },
        emphasis: { disabled: true },
        blur: {
          lineStyle: { opacity: 1 },
          areaStyle: { opacity: 0.1 },
          itemStyle: { opacity: 1 },
        },
      },
    ],
  };

  return (
    <div className="kpi-area-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {/* Reserved header row, not an absolutely-positioned overlay — see LineAreaChart.jsx's
          own comment for why. */}
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-area-title font-bold text-[0.6875rem] block truncate"
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
        <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={(onPointClick || onPointContextMenu) ? {
          ...(onPointClick ? { click: (p) => onPointClick(clickLabels[p.dataIndex]) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(clickLabels[p.dataIndex], p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
      {/* Latest-point value — never actually enabled (see LineAreaChart.jsx's own comment on
          this same decision); if it comes back it belongs inside the chart area above, not
          this reserved header row. `latest`, valuePosition, valueTextColor/valueTextSize are
          that value slot's own formatting/position, kept as accepted-but-unused props. */}
    </div>
  );
}
