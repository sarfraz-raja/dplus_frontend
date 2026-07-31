import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * A single-row heatmap — one category axis (`data[].label`) colored by intensity
 * (`data[].value`), for the real Chart Library's HEAT_MAP chart_type. Unlike the legacy/mock
 * Heatmap widget (DashboardBuilder/legacy/widgets/HeatmapChart.jsx, a genuine 2D day×hour grid), the real backend
 * HEAT_MAP mapping is just one dimension + one aggregated measure (same {label, value}[]
 * shape every other chart_type here uses via renderChartWidget.jsx's seriesData()) — so this
 * renders as a 1×N strip, not a matrix.
 */
export default function HeatStripChart({
  title = '', unit = '', data = [], colorFrom = null, colorTo = '#EC4899', height = 160, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null,
  axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', onPointClick = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 100;

  const option = {
    grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: false },
    xAxis: {
      type: 'category', data: labels,
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: Math.max(0, Math.ceil(labels.length / 12) - 1) },
      splitArea: { show: true },
    },
    yAxis: { type: 'category', data: [unit || 'Value'], axisLabel: { show: false }, splitArea: { show: true } },
    tooltip: { position: 'top', valueFormatter: (v) => `${v} ${unit}` },
    visualMap: {
      min, max, calculable: false, show: false,
      // Same auto-derived-low-stop convention as the legacy Heatmap widget — pick just the
      // "high" color and get a sensible translucent low stop for free, or set both explicitly.
      inRange: { color: [colorFrom || `${colorTo}18`, colorTo] },
    },
    series: [
      {
        type: 'heatmap',
        data: data.map((d, i) => [i, 0, d.value]),
        label: { show: false },
        itemStyle: { borderWidth: 1, borderColor: isDark ? '#10131a' : '#ffffff' },
      },
    ],
  };

  return (
    <div className="kpi-heatmap-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={onPointClick ? { click: (p) => onPointClick(p.name) } : undefined} />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-heatmap-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
      />
    </div>
  );
}
