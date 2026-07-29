import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * Radial gauge for percentage-style KPIs (RNA, Radio Network Availability, etc).
 */
export default function GaugeCard({
  title = '', value = 0, max = 100, color = '#378ADD', height = 130, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null,
  titlePosition = 'top-left',
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);

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
          fontSize: valueTextSize || 22,
          fontWeight: 500,
          color: valueTextColor || textColor,
          offsetCenter: [0, '10%'],
          formatter: (v) => `${v}%`,
        },
        data: [{ value }],
      },
    ],
  };

  return (
    <div className="kpi-gauge-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-gauge-title text-xs font-bold"
        titleStyle={{
          color: titleColor || subColor,
          fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined,
          fontSize: titleSize ? `${titleSize}px` : undefined,
          fontFamily: titleFont || undefined,
        }}
        titlePosition={titlePosition}
      />
    </div>
  );
}
