import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * Scatter chart for correlating two KPIs (e.g. RSRP vs throughput per cell). Paired
 * `(x, y)` points aren't representable in the `{label, value}[]` shape every other
 * chart widget here uses — this is a genuinely new `dataShape: 'xy'`
 * (`{x, y, name?}[]`, see mockDataSources.js's `throughputVsRsrp`), not a reuse of
 * `dataShape: 'series'`.
 */
export default function ScatterChart({
  title = '', xLabel = '', yLabel = '', unit = '', data = [], color = '#378ADD', height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left',
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const points = data.map((d) => [d.x, d.y, d.name]);

  const option = {
    grid: { left: 36, right: 12, top: 12, bottom: 28, containLabel: false },
    xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 20, nameTextStyle: { fontSize: 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined }, axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined } },
    yAxis: { type: 'value', name: yLabel, nameTextStyle: { fontSize: 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined }, axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined } },
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.data[2] ?? ''}<br/>${xLabel}: ${p.data[0]}<br/>${yLabel}: ${p.data[1]} ${unit}`,
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 7,
        itemStyle: { color, opacity: 0.75 },
        data: points,
      },
    ],
  };

  return (
    <div className="kpi-scatter-card h-full box-border relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      <TitleValueOverlay
        title={title}
        titleClassName="kpi-scatter-title font-bold text-[0.6875rem]"
        titleStyle={{ color: titleColor || subColor, fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined, fontSize: titleSize ? `${titleSize}px` : undefined, fontFamily: titleFont || undefined }}
        titlePosition={titlePosition}
      />
    </div>
  );
}
