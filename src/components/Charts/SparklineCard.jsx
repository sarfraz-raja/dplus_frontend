import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Small single-series line+area chart for a card, e.g. "DL Throughput (Mbps)".
 */
export default function SparklineCard({ title = '', unit = '', data = [], color = '#378ADD', height = 90, isDark: isDarkProp = null, titleColor = null }) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const textColor = isDark ? '#eef1f6' : '#1a1a18';
  const subColor = isDark ? '#8b93a7' : '#5f5e5a';
  const axisColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
  const splitColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const values = data.map((d) => d.value);
  const labels = data.map((d) => d.label);
  const latest = values.length ? values[values.length - 1] : 0;

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 28, right: 4, top: 8, bottom: 18 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: axisColor } },
      axisTick: { show: false },
      axisLabel: { color: subColor, fontSize: 9, interval: Math.max(0, Math.ceil(labels.length / 6) - 1) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitNumber: 2,
      splitLine: { lineStyle: { color: splitColor } },
      axisLabel: {
        color: subColor,
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
    <div className="kpi-spark-card">
      <div className="kpi-spark-head">
        <span className="kpi-spark-title" style={{ color: titleColor || subColor }}>{title}</span>
        <span className="kpi-spark-latest" style={{ color: textColor }}>{latest}{unit}</span>
      </div>
      <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
