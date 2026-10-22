import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { useChartAnimation, applyChartAnimation } from '../DashboardBuilder/utils/chartAnimation';

/**
 * Radial gauge — originally built for percentage-style KPIs (RNA, Radio Network Availability,
 * etc), now also usable for any single aggregated measure (see `showPercent`).
 */
export default function GaugeCard({
  title = '', value = 0, max = 100, color = '#378ADD', ringWidth = 10, height = 130, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, titleBgColor = null, valueTextColor = null, valueTextSize = null,
  titlePosition = 'top-left', valueFormatter = null, showPercent = true,
  delta = '', deltaUp = true, deltaTooltip = '',
}) {
  const { theme } = useTheme();
  // Style → Animation settings (dashboard/Charts-tab provider; none elsewhere = ECharts defaults).
  const chartAnimation = useChartAnimation();
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
        progress: { show: true, width: ringWidth, roundCap: true, itemStyle: { color } },
        axisLine: { lineStyle: { width: ringWidth } },
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
          // `v` is the series' own animated value, same domain as `value`/`max` below (NOT
          // already a 0-100 percent) — showPercent now actually computes value/max*100, instead
          // of just appending a literal "%" to the raw formatted number (which read as
          // nonsense, e.g. "306.63M%", for any measure not already 0-100 — see the conversation
          // this was reported in). The ring itself always plots the raw value against `max`
          // either way, so the ring and the center readout stay in agreement.
          formatter: (v) => {
            const shown = showPercent ? (max ? (v / max) * 100 : v) : v;
            const text = valueFormatter ? valueFormatter(shown) : String(shown);
            return showPercent ? `${text}%` : text;
          },
        },
        data: [{ value }],
      },
    ],
  };

  return (
    <div className="kpi-gauge-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {(title || delta) && (
        // OLD: height: 20 (fixed) — clipped the title as soon as Title size (px) grew past the
        // default ~12px, since the row never grew with it. Now grows with the font size (+8px
        // for the row's own padding/line-height), 20px floor keeps the default look unchanged.
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5 flex items-center justify-between gap-1.5" style={{ minHeight: Math.max(20, Math.ceil((titleSize || 12) * 1.35) + 10), background: titleBgColor || undefined }}>
          <span
            className="kpi-gauge-title text-xs font-bold block truncate"
            style={{
              color: titleColor || subColor,
              fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined,
              fontSize: titleSize ? `${titleSize}px` : undefined,
              // `text-xs` (below) bakes in a fixed 16px line-height — with fontSize overridden
              // larger, the glyph still rendered inside that 16px line box and got clipped by
              // the card's own overflow-hidden (the crop was in the line-height, not the row's
              // own height, which the row-height fix above didn't touch).
              lineHeight: titleSize ? 1.3 : undefined,
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
        <ReactECharts option={applyChartAnimation(option, chartAnimation)} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      </div>
    </div>
  );
}
