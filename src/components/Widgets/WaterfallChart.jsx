import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * Waterfall chart — cumulative breakdown of what's driving a KPI change (e.g. what
 * contributed to this week's availability delta). ECharts has no native `waterfall`
 * series type; this uses the standard trick: an invisible stacked "placeholder" bar
 * (the running total up to each step) plus a visible "delta" bar on top of it, colored
 * by increase/decrease. Same `{label, value}[]` shape as other `dataShape: 'series'`
 * widgets, but `value` here is a signed delta at each step, not an absolute reading
 * (see mockDataSources.js's `kpiWaterfallDeltas`, which is signed — genHourlySeries
 * isn't, so it doesn't fit this widget).
 */
export default function WaterfallChart({
  title = '', unit = '', data = [], upColor = '#10B981', downColor = '#EF4444', height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left',
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const labels = data.map((d) => d.label);
  let running = 0;
  const placeholders = [];
  const deltas = [];
  const colors = [];
  data.forEach((d) => {
    const isDown = d.value < 0;
    placeholders.push(isDown ? running + d.value : running);
    deltas.push(Math.abs(d.value));
    colors.push(isDown ? downColor : upColor);
    running += d.value;
  });

  const option = {
    grid: { left: 32, right: 4, top: 8, bottom: 24 },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: 0, rotate: labels.length > 5 ? 30 : 0 } },
    yAxis: { type: 'value', splitNumber: 2, axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params.find((x) => x.seriesName === 'Delta');
        if (!p) return '';
        const original = data[p.dataIndex]?.value ?? 0;
        return `${p.name}<br/>${original >= 0 ? '+' : ''}${original} ${unit}`;
      },
    },
    series: [
      {
        name: 'Base', type: 'bar', stack: 'total',
        itemStyle: { color: 'transparent' }, silent: true, data: placeholders,
      },
      {
        name: 'Delta', type: 'bar', stack: 'total',
        itemStyle: { color: (p) => colors[p.dataIndex] },
        data: deltas,
      },
    ],
  };

  return (
    <div className="kpi-waterfall-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-waterfall-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
      />
    </div>
  );
}
