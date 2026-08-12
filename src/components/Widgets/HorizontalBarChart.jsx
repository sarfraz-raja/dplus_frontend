import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';

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
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);

  // Ranked highest-first, but ECharts' category axis draws bottom-to-top — reverse so the
  // highest value still ends up visually at the top of the chart.
  const ranked = [...data].sort((a, b) => b.value - a.value).slice(0, limit).reverse();
  const values = ranked.map((d) => d.value);
  const labels = ranked.map((d) => d.label);

  const option = {
    grid: { left: 8, right: 12, top: categoryAxisLabel ? 20 : 8, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      // This chart's category axis is the vertical one (yAxis, below) — the measure sits
      // horizontally, so the Y-Axis-title override (valueAxisLabel — see renderChartWidget.jsx,
      // still keyed off mapping.y_axis_title/the measure column) lands here instead.
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
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color, borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 16,
        label: { show: true, position: 'right', fontSize: valueTextSize || 9, color: valueTextColor || textColor, formatter: (p) => `${p.value}${unit}` },
      },
    ],
  };

  return (
    <div className="kpi-hbar-card h-full box-border flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
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
        <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={(onPointClick || onPointContextMenu) ? {
          ...(onPointClick ? { click: (p) => onPointClick(p.name) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(p.name, p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
    </div>
  );
}
