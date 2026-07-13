import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';

/**
 * Small single-series line+area chart for a card, e.g. "DL Throughput (Mbps)".
 */
export default function SparklineCard({ title = '', unit = '', data = [], color = '#378ADD', height = 90, isDark: isDarkProp = null, titleColor = null }) {
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
      axisLabel: { fontSize: 9, interval: Math.max(0, Math.ceil(labels.length / 6) - 1) },
    },
    yAxis: {
      type: 'value',
      splitNumber: 2,
      axisLabel: {
        fontSize: 8,
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
    <div className="kpi-spark-card h-full box-border flex flex-col rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C] px-3 py-2.5">
      <div className="kpi-spark-head flex justify-between text-[0.6875rem] mb-1">
        <span className="kpi-spark-title font-bold" style={{ color: titleColor || subColor }}>{title}</span>
        <span className="kpi-spark-latest" style={{ color: textColor }}>{latest}{unit}</span>
      </div>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height, width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
