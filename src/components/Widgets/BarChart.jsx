import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { buildAxisTitle, gridMarginForVerticalTitle } from './axisTitle';
import { resolveTimeAxisFormat, toAxisTimeValue } from '../DashboardBuilder/charts/axisTypeUtils';

/**
 * Small single-series bar chart for a card, e.g. "Traffic by Site". Mirrors
 * LineAreaChart.jsx's structure/props — same theme wiring, just `type: 'bar'`
 * instead of `type: 'line'` (no smoothing/symbol/area options, which are line-only).
 */
export default function BarChart({
  title = '', unit = '', data = [], color = '#378ADD', height = 90, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null,
  axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', valuePosition = 'top-right', onPointClick = null, onPointContextMenu = null, categoryAxisLabel = null,
  isTimeAxis = false, valueAxisLabel = null, dateFormat = undefined, timezone = undefined,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);

  const values = data.map((d) => d.value);
  const labels = data.map((d) => d.label);
  const total = values.reduce((sum, v) => sum + v, 0);
  // See LineAreaChart.jsx's own comment on this same pattern — real [timestamp, value] pairs,
  // re-expressed in `timezone` (default DEPLOYMENT_TIME_ZONE) via toAxisTimeValue so every
  // viewer sees identical axis numbers regardless of their own browser's timezone.
  const seriesValues = isTimeAxis ? data.map((d) => [toAxisTimeValue(d.label, timezone), d.value]) : values;

  const option = {
    // Extra bottom margin only when the category axis has a title — the default 18px is
    // already tight for tick labels alone. Extra left margin when the Y axis has a title too —
    // see axisTitle.js's own doc comment.
    grid: { left: gridMarginForVerticalTitle(valueAxisLabel, 28, 42), right: 4, top: 8, bottom: categoryAxisLabel ? 32 : 18 },
    xAxis: isTimeAxis ? {
      type: 'time',
      // See LineAreaChart.jsx's own comment — pairs with toAxisTimeValue above.
      useUTC: true,
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: {
        fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: resolveTimeAxisFormat(dateFormat),
      },
    } : {
      type: 'category',
      data: labels,
      // Which column the tick labels actually represent — static (mapping.x_axis) unless
      // drilling is active, in which case it's the CURRENT drill level's own dimension (see
      // renderChartWidget.jsx's own xAxis resolution) — without this, a drilled chart's bare
      // category labels ("2G"/"3G") give no clue whether that's a region, technology, etc.
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: Math.max(0, Math.ceil(labels.length / 6) - 1) },
    },
    yAxis: {
      type: 'value',
      splitNumber: 2,
      ...buildAxisTitle(valueAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont, vertical: true }),
      axisLabel: {
        fontSize: axisTextSize || 8,
        color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v),
      },
    },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} ${unit}` },
    series: [
      {
        type: 'bar',
        data: seriesValues,
        itemStyle: { color, borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 24,
      },
    ],
  };

  return (
    <div className="kpi-bar-card h-full box-border flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {/* Reserved header row, not an absolutely-positioned overlay — see LineAreaChart.jsx's
          own comment for why (a bar can reach the very top of the chart just as easily as a
          line can, so no fixed title position can reliably avoid it). */}
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-bar-title font-bold text-[0.6875rem] block truncate"
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
          ...(onPointClick ? { click: (p) => onPointClick(p.name) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(p.name, p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
      {/* Sum-of-all-bars total — never actually enabled (see the old commented-out value=
          prop this replaced); questionable value for a many-category bar chart (reads as a
          random aggregate, not a KPI). If it comes back, it belongs as an absolutely-
          positioned span inside the chart area above, not this reserved header row.
          `${Math.round(total * 10) / 10}${unit}`, valuePosition, valueTextColor/valueTextSize
          are that value slot's own formatting/position, kept as accepted-but-unused props. */}
    </div>
  );
}
