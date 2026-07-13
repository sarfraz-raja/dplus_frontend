import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';

/**
 * Radial gauge for percentage-style KPIs (RNA, Radio Network Availability, etc).
 */
export default function GaugeCard({ title = '', value = 0, max = 100, color = '#378ADD', height = 130, isDark: isDarkProp = null, titleColor = null }) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const option = {
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
        axisLine: { lineStyle: { width: 10 } },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 22,
          fontWeight: 500,
          offsetCenter: [0, '10%'],
          formatter: (v) => `${v}%`,
        },
        data: [{ value }],
      },
    ],
  };

  return (
    <div className="kpi-gauge-card h-full box-border rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C] px-3 py-2 text-center">
      <div className="kpi-gauge-title text-xs font-bold mb-0.5" style={{ color: titleColor || subColor }}>{title}</div>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height, width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
