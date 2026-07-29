import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * Small single-series bar chart for a card, e.g. "Traffic by Site". Mirrors
 * LineAreaChart.jsx's structure/props — same theme wiring, just `type: 'bar'`
 * instead of `type: 'line'` (no smoothing/symbol/area options, which are line-only).
 */
export default function BarChart({
  title = '', unit = '', data = [], color = '#378ADD', height = 90, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null,
  axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', valuePosition = 'top-right',
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);

  const values = data.map((d) => d.value);
  const labels = data.map((d) => d.label);
  const total = values.reduce((sum, v) => sum + v, 0);

  const option = {
    grid: { left: 28, right: 4, top: 8, bottom: 18 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: Math.max(0, Math.ceil(labels.length / 6) - 1) },
    },
    yAxis: {
      type: 'value',
      splitNumber: 2,
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
        data: values,
        itemStyle: { color, borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 24,
      },
    ],
  };

  return (
    <div className="kpi-bar-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-bar-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
        // Sum-of-all-bars total, commented out for now rather than removed — questionable
        // value for a many-category bar chart (reads as a random aggregate, not a KPI).
        // Re-enable by uncommenting these four if that changes.
        // value={`${Math.round(total * 10) / 10}${unit}`}
        // valueClassName="kpi-bar-total text-[0.6875rem]"
        // valueStyle={{ color: valueTextColor || textColor, fontSize: valueTextSize ? `${valueTextSize}px` : undefined }}
        // valuePosition={valuePosition}
      />
    </div>
  );
}
