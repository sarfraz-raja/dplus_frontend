import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../../../theme/tokens';
import { echartsThemeName } from '../../../../theme/echartsTheme';
import TitleValueOverlay from '../../../Widgets/TitleValueOverlay';

/**
 * Time-of-day x day-of-week heatmap — spotting recurring congestion windows. Needs a 2D
 * grid data shape (`days`, `hours` category axes + `[hourIndex, dayIndex, value]` triples),
 * its own `dataShape: 'heatmap'` (see mockDataSources.js's `congestionPattern`) — genuinely
 * incompatible with the `{label, value}[]` shape every other chart widget here uses, so it
 * doesn't share `dataShape: 'series'` (a real case of `type` needing its own `dataShape`,
 * not just advisory-only reuse — see widgetTypeRegistry.js's type-vs-dataShape note).
 */
export default function HeatmapChart({
  title = '', unit = '', days = [], hours = [], data = [], color = '#EC4899', height = 160, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left',
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const values = data.map((d) => d[2]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 100;

  const option = {
    grid: { left: 32, right: 8, top: 8, bottom: 40, containLabel: false },
    xAxis: { type: 'category', data: hours, axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: 2 }, splitArea: { show: true } },
    yAxis: { type: 'category', data: days, axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined }, splitArea: { show: true } },
    tooltip: { position: 'top', valueFormatter: (v) => `${v} ${unit}` },
    visualMap: {
      min, max, calculable: false, show: false,
      inRange: { color: [`${color}18`, color] },
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: { show: false },
        itemStyle: { borderWidth: 1, borderColor: isDark ? '#10131a' : '#ffffff' },
      },
    ],
  };

  return (
    <div className="kpi-heatmap-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-heatmap-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
      />
    </div>
  );
}
