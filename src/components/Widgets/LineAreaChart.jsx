import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * Small single-series line+area chart for a card, e.g. "DL Throughput (Mbps)". Despite the
 * old "Sparkline" naming still used elsewhere (the widget picker's "Sparkline Chart" label,
 * the mock registry's `sparklineCard` type key — both left as-is, since the latter is
 * persisted in existing saved dashboards' JSON), this isn't a true sparkline: it has a
 * visible axis, labels, and a tooltip, unlike a real (axis-less) sparkline.
 */
export default function LineAreaChart({
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
  const latest = values.length ? values[values.length - 1] : 0;

  const option = {
    grid: { left: 28, right: 4, top: 8, bottom: 18 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
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
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        itemStyle: { color, borderColor: '#ffffff', borderWidth: 1.5 },
        lineStyle: { width: 2, color },
        areaStyle: { color, opacity: 0.1 },
      },
    ],
  };

  return (
    <div className="kpi-spark-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-spark-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
        // Latest-point value, commented out for now rather than removed — see BarChart.jsx's
        // own comment on this same decision (questionable value, not deleted in case it
        // should come back).
        // value={`${latest}${unit}`}
        // valueClassName="kpi-spark-latest text-[0.6875rem]"
        // valueStyle={{ color: valueTextColor || textColor, fontSize: valueTextSize ? `${valueTextSize}px` : undefined }}
        // valuePosition={valuePosition}
      />
    </div>
  );
}
