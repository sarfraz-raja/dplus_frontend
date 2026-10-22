import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { useChartAnimation, applyChartAnimation } from '../DashboardBuilder/utils/chartAnimation';

/**
 * Flat (single-level) treemap — proportion by category, e.g. traffic by region. Same
 * `{label, value}[]` shape as BarChart/PieChart (mapped to ECharts' `{name, value}`),
 * reusing `dataShape: 'series'` safely. Hierarchical drill-down (nested `children`) isn't
 * built here — this is one flat level of rectangles, not a multi-level treemap.
 * No single accent `color` prop — like PieChart/FunnelChart, each rectangle gets its own
 * color from the shared theme's palette.
 */
export default function TreemapChart({
  title = '', unit = '', data = [], height = 160, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, titleBgColor = null, valueTextColor = null, valueTextSize = null, seriesColors = null, palette = null,
  titlePosition = 'top-left', onPointClick = null, onPointContextMenu = null,
}) {
  const { theme } = useTheme();
  // Style → Animation settings (dashboard/Charts-tab provider; none elsewhere = ECharts defaults).
  const chartAnimation = useChartAnimation();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  // A pinned per-rectangle color (Phase 8b) always wins; otherwise cycle through the
  // resolved theme/dashboard palette explicitly (see PieChart.jsx's own comment on why).
  const treeData = data.map((d, i) => ({
    name: d.label, value: d.value,
    itemStyle: { color: seriesColors?.[d.label] || (palette ? palette[i % palette.length] : undefined) },
  }));

  const option = {
    tooltip: { formatter: (p) => `${p.name}: ${p.value} ${unit}` },
    series: [
      {
        type: 'treemap',
        // ECharts' treemap defaults to a small top/bottom inset (originally reserved for
        // the breadcrumb bar) even with breadcrumb hidden — pin the series to the full
        // given box explicitly instead of relying on that default.
        left: 0, top: 0, right: 0, bottom: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: { fontSize: valueTextSize || 9, color: valueTextColor || '#fff' },
        upperLabel: { show: false },
        itemStyle: { borderColor: isDark ? '#10131a' : '#ffffff', borderWidth: 1, gapWidth: 1 },
        data: treeData,
      },
    ],
  };

  return (
    <div className="kpi-treemap-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ minHeight: Math.max(20, Math.ceil((titleSize || 12) * 1.35) + 10), background: titleBgColor || undefined }}>
          <span
            className="kpi-treemap-title font-bold text-[0.6875rem] block truncate"
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
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ReactECharts option={applyChartAnimation(option, chartAnimation)} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate onEvents={(onPointClick || onPointContextMenu) ? {
          ...(onPointClick ? { click: (p) => onPointClick(p.name) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(p.name, p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
    </div>
  );
}
