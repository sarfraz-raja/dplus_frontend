import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Radial gauge for percentage-style KPIs (RNA, Radio Network Availability, etc).
 */
export default function GaugeCard({ title = '', value = 0, max = 100, color = '#378ADD', height = 130, isDark: isDarkProp = null, titleColor = null }) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const textColor = isDark ? '#eef1f6' : '#1a1a18';
  const subColor = isDark ? '#8b93a7' : '#5f5e5a';
  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const option = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max,
        radius: '92%',
        pointer: { show: false },
        progress: { show: true, width: 10, roundCap: true, itemStyle: { color } },
        axisLine: { lineStyle: { width: 10, color: [[1, trackColor]] } },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 22,
          fontWeight: 500,
          color: textColor,
          offsetCenter: [0, '10%'],
          formatter: (v) => `${v}%`,
        },
        data: [{ value }],
      },
    ],
  };

  return (
    <div className="kpi-gauge-card">
      <div className="kpi-gauge-title" style={{ color: titleColor || subColor }}>{title}</div>
      <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
