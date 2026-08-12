import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { buildAxisTitle, gridMarginForVerticalTitle } from './axisTitle';
import { resolveTimeAxisFormat, toAxisTimeValue } from '../DashboardBuilder/charts/axisTypeUtils';

/**
 * Small single-series line+area chart for a card, e.g. "DL Throughput (Mbps)". Despite the
 * old "Sparkline" naming still used elsewhere (the widget picker's "Sparkline Chart" label,
 * the mock registry's `sparklineCard` type key — both left as-is, since the latter is
 * persisted in existing saved dashboards' JSON), this isn't a true sparkline: it has a
 * visible axis, labels, and a tooltip, unlike a real (axis-less) sparkline.
 */
export default function LineAreaChart({
  title = '', unit = '', data = [], color = '#378ADD', height = 90, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, valueTextColor = null, valueTextSize = null,
  axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', valuePosition = 'top-right', onPointClick = null, onPointContextMenu = null, categoryAxisLabel = null,
  isTimeAxis = false, valueAxisLabel = null, dateFormat = undefined, timezone = undefined,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { text: textColor, sub: subColor } = chartTokens(isDark);

  const values = data.map((d) => d.value);
  const labels = data.map((d) => d.label);
  const latest = values.length ? values[values.length - 1] : 0;
  // Time axis: each point becomes a real [timestamp, value] pair so ECharts positions it by
  // actual elapsed time (not evenly-spaced by index) and auto-picks a sparse tick interval,
  // instead of every raw ISO label fighting for its own category slot (see the conversation
  // this was decided in — that's what caused the overlapping "2026-05-12T00:00:00" labels).
  // `toAxisTimeValue` (not a plain Date.parse of d.label) re-expresses the raw naive timestamp
  // in `timezone` (defaulting to DEPLOYMENT_TIME_ZONE) as a "naive-as-UTC" epoch — paired with
  // `xAxis.useUTC: true` below, this is what makes every viewer see identical axis numbers
  // regardless of their own browser's timezone, instead of each browser silently reinterpreting
  // the naive string in its own local zone.
  const seriesValues = isTimeAxis ? data.map((d) => [toAxisTimeValue(d.label, timezone), d.value]) : values;

  const option = {
    // `top` back to its plain small value — the title no longer overlays this chart at all
    // (it now sits in its own reserved row above, see the JSX below), so there's nothing left
    // to leave clearance for.
    // Extra left margin when the Y axis has a title — it's rendered rotated/vertical (see
    // buildAxisTitle's `vertical: true` below), so it needs its own reserved column, not just
    // tick-label room.
    grid: { left: gridMarginForVerticalTitle(valueAxisLabel, 28, 42), right: 4, top: 8, bottom: categoryAxisLabel ? 32 : 18 },
    xAxis: isTimeAxis ? {
      type: 'time',
      // Pairs with toAxisTimeValue above — without this, ECharts reads the "naive-as-UTC"
      // epoch through the *browser's own* local getters, shifting it right back into whatever
      // timezone the viewer happens to be in and undoing the whole point of that conversion.
      useUTC: true,
      // Which column the tick labels actually represent — see BarChart.jsx's own comment on
      // this same prop for why it can differ from mapping.x_axis once drilling is active.
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: {
        fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: resolveTimeAxisFormat(dateFormat),
      },
    } : {
      type: 'category',
      data: labels,
      boundaryGap: false,
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: Math.max(0, Math.ceil(labels.length / 6) - 1) },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitNumber: 2,
      // Vertical, centered along the axis (Superset's own Y Axis Title convention) — see
      // buildAxisTitle's own doc comment.
      ...buildAxisTitle(valueAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont, vertical: true }),
      axisLabel: {
        fontSize: axisTextSize || 8,
        color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v),
      },
    },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} ${unit}` },
    series: [
      {
        type: 'line',
        data: seriesValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        itemStyle: { color, borderColor: '#ffffff', borderWidth: 1.5 },
        lineStyle: { width: 2, color },
        areaStyle: { color, opacity: 0.1 },
        emphasis: { disabled: true },
        blur: {
          lineStyle: { opacity: 1 },
          areaStyle: { opacity: 0.1 },
          itemStyle: { opacity: 1 },
        },
      },
    ],
  };

  return (
    <div className="kpi-spark-card h-full box-border flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {/* A real reserved row, not an absolutely-positioned overlay (the previous
          TitleValueOverlay approach) — the chart below can never draw underneath the title
          now, regardless of where its data happens to sit (see the conversation this was
          decided in: no fixed title position can reliably dodge a line that's near the top
          across most of its width). Fixed height (not a %) so the title stays readable on a
          short card instead of shrinking to near-nothing — `shrink-0` keeps the chart below
          from squeezing it further if the card itself is very short. Only the *value* half of
          TitleValueOverlay's old two-slot layout is gone from here; this chart type never
          used the value slot to begin with (see the commented-out block further down).
          `POSITION_TEXT_ALIGN` reuses the same left/center/right vocabulary titlePosition
          already had — vertical position ("top-"/"mid-"/"bottom-") no longer applies since
          this row is always at the top now, so it's dropped, not read from titlePosition. */}
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ height: 20 }}>
          <span
            className="kpi-spark-title font-bold text-[0.6875rem] block truncate"
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
      {/* Latest-point value — this chart never actually enabled the value slot
          TitleValueOverlay's old layout supported (see BarChart.jsx's own comment on this
          same decision — questionable value for a many-category chart, not deleted in case
          it should come back). If it does, it belongs inside the chart area above (an
          absolutely-positioned span there), not this reserved header row. */}
      {/* value={`${latest}${unit}`} valuePosition={valuePosition} */}
    </div>
  );
}
