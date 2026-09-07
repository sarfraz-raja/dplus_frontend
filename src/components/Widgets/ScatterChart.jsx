import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { buildAxisTitle, gridMarginForVerticalTitle } from './axisTitle';
import { resolveTruncatedBounds } from '../DashboardBuilder/charts/axisTypeUtils';

/**
 * Scatter chart for correlating two KPIs (e.g. RSRP vs throughput per cell). Paired
 * `(x, y)` points aren't representable in the `{label, value}[]` shape every other
 * chart widget here uses — this is a genuinely new `dataShape: 'xy'`
 * (`{x, y, name?}[]`, see mockDataSources.js's `throughputVsRsrp`), not a reuse of
 * `dataShape: 'series'`.
 */
export default function ScatterChart({
  title = '', xLabel = '', yLabel = '', xAxisLabel = null, yAxisLabel = null, unit = '', data = [], color = '#378ADD', height = 140, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left',
  truncateXAxis = null, xAxisMin = null, xAxisMax = null,
  truncateYAxis = null, yAxisMin = null, yAxisMax = null,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  const points = data.map((d) => [d.x, d.y, d.name]);
  const xBounds = resolveTruncatedBounds(truncateXAxis, xAxisMin, xAxisMax);
  const yBounds = resolveTruncatedBounds(truncateYAxis, yAxisMin, yAxisMax);

  const option = {
    // Extra left margin only when the Y axis has its own title — see axisTitle.js's own doc
    // comment (previously a fixed 36 regardless, from when this axis unconditionally showed
    // the raw column name).
    grid: { left: gridMarginForVerticalTitle(yAxisLabel, 24, 42), right: 12, top: 12, bottom: xAxisLabel ? 28 : 20, containLabel: false },
    xAxis: {
      type: 'value',
      // Explicit X-axis bounds ("Truncate X Axis" — see TRUNCATE_X_AXIS_FIELD in
      // ChartLibrary.jsx, Scatter-only since its x_axis is a raw numeric measure, not a
      // dimension/time column like every other chart_type's) — same pattern as
      // BarChart.jsx's Y-axis truncation, mirrored onto X here.
      min: xBounds.min,
      max: xBounds.max,
      ...buildAxisTitle(xAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont, gap: 20 }),
      axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined },
    },
    yAxis: {
      type: 'value',
      // See BarChart.jsx's own comment on this same pattern.
      min: yBounds.min,
      max: yBounds.max,
      ...buildAxisTitle(yAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont, vertical: true }),
      axisLabel: { fontSize: axisTextSize || 8, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined },
    },
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
    <div className="kpi-scatter-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-scatter-title font-bold text-[0.6875rem] block truncate"
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
        <ReactECharts option={option} theme={echartsThemeName(isDark)} style={{ height: '100%', width: '100%' }} opts={{ devicePixelRatio: 2 }} notMerge lazyUpdate />
      </div>
    </div>
  );
}
