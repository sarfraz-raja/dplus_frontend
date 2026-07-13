import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Wide sparkline used inline in a table's "Trend" column — fills the available
 * cell width (unlike a tiny fixed-size chart) with dot markers and x-axis time labels.
 */
export default function TrendMiniChart({ data = [], color = '#378ADD', height = 40, isDark: isDarkProp = null }) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const subColor = isDark ? '#8b93a7' : '#5f5e5a';
  const splitColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const values = data.map((d) => d.value);
  const labels = data.map((d) => d.label);

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 4, right: 4, top: 6, bottom: 16 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: subColor, fontSize: 9, interval: Math.max(0, Math.ceil(labels.length / 10) - 1) },
    },
    yAxis: { type: 'value', show: false, splitLine: { lineStyle: { color: splitColor } } },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        itemStyle: { color, borderColor: '#ffffff', borderWidth: 1.5 },
        lineStyle: { width: 1.5, color },
        areaStyle: { color, opacity: 0.08 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />;
}
