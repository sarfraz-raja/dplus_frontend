import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { buildAxisTitle, gridMarginForVerticalTitle } from './axisTitle';

/**
 * Stacked bar/column — composition per category (e.g. traffic by technology per site).
 * Categories x multiple named series can't be represented in the single-series
 * `{label, value}[]` shape every other bar/line widget here uses — this needs its own
 * `dataShape: 'multiSeries'` (`{categories, series: [{name, data}]}`, see
 * mockDataSources.js's `trafficByTechnology`). No single accent `color` prop — each
 * named series gets its own color from the shared theme's palette, like PieChart.
 */
export default function StackedBarChart({
  title = '', unit = '', categories = [], series = [], showLegend = true, height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null, seriesColors = null, palette = null,
  titlePosition = 'top-left', onPointClick = null, onPointContextMenu = null, categoryAxisLabel = null, valueAxisLabel = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const option = {
    grid: { left: gridMarginForVerticalTitle(valueAxisLabel, 32, 46), right: 4, top: 8, bottom: categoryAxisLabel ? 54 : 40 },
    xAxis: {
      type: 'category',
      data: categories,
      // Which column the tick labels actually represent — see BarChart.jsx's own comment on
      // this same prop.
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize: axisTextSize || 8, axisTextColor, axisTextWeight, axisTextFont, gap: categories.length > 5 ? 36 : 22 }),
      axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: 0, rotate: categories.length > 5 ? 30 : 0 },
    },
    yAxis: {
      type: 'value', splitNumber: 2,
      ...buildAxisTitle(valueAxisLabel, { axisTextSize: axisTextSize || 8, axisTextColor, axisTextWeight, axisTextFont, vertical: true }),
      axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined },
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${v} ${unit}` },
    legend: { show: showLegend, bottom: 0, textStyle: { fontSize: 9, color: subColor }, itemWidth: 10, itemHeight: 10 },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'bar',
      stack: 'total',
      barMaxWidth: 24,
      // A pinned per-series color (Phase 8b) always wins; otherwise cycle through the
      // resolved theme/dashboard palette explicitly (see PieChart.jsx's own comment on why
      // this can't just rely on ECharts' registered theme color array).
      itemStyle: { color: seriesColors?.[s.name] || (palette ? palette[i % palette.length] : undefined) },
      data: s.data,
    })),
  };

  return (
    <div className="kpi-stackedbar-card h-full box-border flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-stackedbar-title font-bold text-[0.6875rem] block truncate"
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
      {/* Cross-filter matches by category (params.name, i.e. mapping.x_axis) only — a
          clicked segment's own series/grouping value (params.seriesName, mapping.series)
          isn't part of the match for this first cut. */}
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={(onPointClick || onPointContextMenu) ? {
          ...(onPointClick ? { click: (p) => onPointClick(p.name) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(p.name, p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
    </div>
  );
}
