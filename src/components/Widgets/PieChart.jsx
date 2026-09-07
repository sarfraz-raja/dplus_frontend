import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';

/**
 * Pie/donut chart for category-share widgets, e.g. "Technology Split". Unlike
 * BarChart/LineAreaChart/GaugeCard (one accent `color` prop), a pie has one slice per
 * category — colors come from the shared theme's palette (see echartsTheme.js's `color`
 * array), not a single per-widget accent. `data` is the same `{label, value}[]` shape
 * BarChart/LineAreaChart use (mapped to ECharts' expected `{name, value}` internally),
 * so it can reuse the same `dataShape: 'series'` mock sources safely.
 */
export default function PieChart({
  title = '', unit = '', data = [], donut = false, showValueLabels = true, showLegend = true, height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null, seriesColors = null, palette = null,
  titlePosition = 'top-left', onPointClick = null, onPointContextMenu = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);

  // A pinned per-slice color (Phase 8b) always wins; otherwise cycle through the resolved
  // theme/dashboard palette (see DashboardCanvasEditor.jsx's resolveWidgetProps) explicitly,
  // rather than relying on ECharts' own registered theme color array — that's a single
  // global default shared by every dashboard, so it can't reflect a per-dashboard bound
  // Theme's own custom palette.
  const pieData = data.map((d, i) => ({
    name: d.label, value: d.value,
    itemStyle: { color: seriesColors?.[d.label] || (palette ? palette[i % palette.length] : undefined) },
  }));

  const option = {
    tooltip: { trigger: 'item', valueFormatter: (v) => `${v} ${unit}` },
    legend: { show: showLegend, bottom: 0, textStyle: { fontSize: 9, color: subColor }, itemWidth: 10, itemHeight: 10 },
    series: [
      {
        type: 'pie',
        radius: donut ? ['45%', '70%'] : '70%',
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        // Percentage only — the category name already lives in the legend. Text color
        // follows the card's own background: dark background → light text, light
        // background → dark text — same chartTokens().text every other widget's value
        // text already uses, no border/shadow trick needed.
        label: { show: showValueLabels, fontSize: valueTextSize || 9, color: valueTextColor || textColor, formatter: '{d}%' },
        labelLine: { show: showValueLabels, length: 6, length2: 6 },
        data: pieData,
      },
    ],
  };

  return (
    <div className="kpi-pie-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-pie-title font-bold text-[0.6875rem] block truncate"
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
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={(onPointClick || onPointContextMenu) ? {
          ...(onPointClick ? { click: (p) => onPointClick(p.name) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(p.name, p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
    </div>
  );
}
