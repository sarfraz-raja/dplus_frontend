import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * Funnel chart for sequential stage drop-off — call/session setup funnels (attempts →
 * setup → connected → completed). Same `{label, value}[]` data shape as
 * BarChart/LineAreaChart (mapped to ECharts' `{name, value}` like PieChart.jsx already
 * does), reusing `dataShape: 'series'` safely — but expects an *ordered, monotonic-ish*
 * series (see mockDataSources.js's `callSetupFunnel`), not a random hourly trend.
 * No single accent `color` prop — like PieChart, each stage gets its own color from the
 * shared theme's palette (theme/echartsTheme.js's `color` array), not one flat hue.
 */
export default function FunnelChart({
  title = '', unit = '', data = [], height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null, seriesColors = null, palette = null,
  titlePosition = 'top-left', onPointClick = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);

  // A pinned per-stage color (Phase 8b) always wins; otherwise cycle through the resolved
  // theme/dashboard palette explicitly (see PieChart.jsx's own comment on why).
  const funnelData = data.map((d, i) => ({
    name: d.label, value: d.value,
    itemStyle: { color: seriesColors?.[d.label] || (palette ? palette[i % palette.length] : undefined) },
  }));

  const option = {
    tooltip: { trigger: 'item', valueFormatter: (v) => `${v} ${unit}` },
    series: [
      {
        type: 'funnel',
        left: '6%',
        right: '6%',
        top: 8,
        bottom: 8,
        minSize: '30%',
        maxSize: '100%',
        gap: 2,
        sort: 'none',
        label: { fontSize: valueTextSize || 9, color: valueTextColor || textColor, formatter: '{b}: {c}' },
        itemStyle: { borderColor: isDark ? '#10131a' : '#ffffff', borderWidth: 1 },
        data: funnelData,
      },
    ],
  };

  return (
    <div className="kpi-funnel-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={onPointClick ? { click: (p) => onPointClick(p.name) } : undefined} />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-funnel-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
      />
    </div>
  );
}
