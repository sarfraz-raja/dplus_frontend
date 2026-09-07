import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { buildAxisTitle, gridMarginForVerticalTitle } from './axisTitle';
import { resolveTruncatedBounds } from '../DashboardBuilder/charts/axisTypeUtils';

/**
 * Waterfall chart — cumulative breakdown of what's driving a KPI change (e.g. what
 * contributed to this week's availability delta). ECharts has no native `waterfall`
 * series type; this uses the standard trick: an invisible stacked "placeholder" bar
 * (the running total up to each step) plus a visible "delta" bar on top of it, colored
 * by increase/decrease. Same `{label, value}[]` shape as other `dataShape: 'series'`
 * widgets, but `value` here is a signed delta at each step, not an absolute reading
 * (see mockDataSources.js's `kpiWaterfallDeltas`, which is signed — genHourlySeries
 * isn't, so it doesn't fit this widget).
 */
export default function WaterfallChart({
  title = '', unit = '', data = [], upColor = '#10B981', downColor = '#EF4444', height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', onPointClick = null, onPointContextMenu = null, categoryAxisLabel = null, valueAxisLabel = null,
  truncateYAxis = null, yAxisMin = null, yAxisMax = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const labels = data.map((d) => d.label);
  let running = 0;
  const placeholders = [];
  const deltas = [];
  const colors = [];
  data.forEach((d) => {
    const isDown = d.value < 0;
    placeholders.push(isDown ? running + d.value : running);
    deltas.push(Math.abs(d.value));
    colors.push(isDown ? downColor : upColor);
    running += d.value;
  });
  const yBounds = resolveTruncatedBounds(truncateYAxis, yAxisMin, yAxisMax);

  const option = {
    grid: { left: gridMarginForVerticalTitle(valueAxisLabel, 32, 46), right: 4, top: 8, bottom: categoryAxisLabel ? 38 : 24 },
    xAxis: {
      type: 'category',
      data: labels,
      // Which column the tick labels actually represent — see BarChart.jsx's own comment on
      // this same prop.
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize: axisTextSize || 8, axisTextColor, axisTextWeight, axisTextFont, gap: labels.length > 5 ? 36 : 22 }),
      axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: 0, rotate: labels.length > 5 ? 30 : 0 },
    },
    yAxis: {
      type: 'value', splitNumber: 2,
      // See BarChart.jsx's own comment on this same pattern.
      min: yBounds.min,
      max: yBounds.max,
      ...buildAxisTitle(valueAxisLabel, { axisTextSize: axisTextSize || 8, axisTextColor, axisTextWeight, axisTextFont, vertical: true }),
      axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params.find((x) => x.seriesName === 'Delta');
        if (!p) return '';
        const original = data[p.dataIndex]?.value ?? 0;
        return `${p.name}<br/>${original >= 0 ? '+' : ''}${original} ${unit}`;
      },
    },
    series: [
      {
        name: 'Base', type: 'bar', stack: 'total',
        itemStyle: { color: 'transparent' }, silent: true, data: placeholders,
      },
      {
        name: 'Delta', type: 'bar', stack: 'total',
        itemStyle: { color: (p) => colors[p.dataIndex] },
        data: deltas,
      },
    ],
  };

  return (
    <div className="kpi-waterfall-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-waterfall-title font-bold text-[0.6875rem] block truncate"
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
          ...(onPointClick ? { click: (p) => p.seriesName === 'Delta' && onPointClick(p.name) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { if (p.seriesName === 'Delta') { p.event.event.preventDefault(); onPointContextMenu(p.name, p.event.event.clientX, p.event.event.clientY); } } } : {}),
        } : undefined} />
      </div>
    </div>
  );
}
