import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';

/**
 * Radial gauge — originally built for percentage-style KPIs (RNA, Radio Network Availability,
 * etc), now also usable for any single aggregated measure (see `showPercent`).
 */
export default function GaugeCard({
  title = '', value = 0, max = 100, color = '#378ADD', height = 130, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null,
  titlePosition = 'top-left', valueFormatter = null, showPercent = true,
  delta = '', deltaUp = true, deltaTooltip = '',
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
          formatter: valueFormatter
            ? (v) => (showPercent ? `${valueFormatter(v)}%` : valueFormatter(v))
            : (v) => (showPercent ? `${v}%` : String(v)),
        },
        data: [{ value }],
      },
    ],
  };

  return (
    <div className="kpi-gauge-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {(title || delta) && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5 flex items-center justify-between gap-1.5" style={{ height: 20 }}>
          <span
            className="kpi-gauge-title text-xs font-bold block truncate"
            style={{
              color: titleColor || subColor,
              fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined,
              fontSize: titleSize ? `${titleSize}px` : undefined,
              fontFamily: titleFont || undefined,
              textAlign: POSITION_TEXT_ALIGN[titlePosition] || 'left',
            }}
          >
            {title}
          </span>
          {delta && (
            <span
              className={`kpi-stat-delta kpi-tooltip text-[0.6875rem] shrink-0 whitespace-nowrap ${deltaUp ? 'up text-emerald-600 dark:text-emerald-400' : 'down text-amber-600 dark:text-amber-400'}`}
              data-tooltip={deltaTooltip || undefined}
            >
              {deltaUp ? '▲' : '▼'} {delta}
            </span>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      </div>
    </div>
  );
}
