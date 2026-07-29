import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

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
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null, seriesColors = null, palette = null,
  titlePosition = 'top-left',
}) {
  const { theme } = useTheme();
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
    <div className="kpi-treemap-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-treemap-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
      />
    </div>
  );
}
