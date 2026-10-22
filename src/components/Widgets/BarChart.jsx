import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens, FONT_WEIGHT_CSS } from '../../theme/tokens';
import { echartsThemeName } from '../../theme/echartsTheme';
import { POSITION_TEXT_ALIGN } from './titlePositions';
import { buildAxisTitle, gridMarginForVerticalTitle } from './axisTitle';
import { resolveCustomTickFormatter, toAxisTimeValue, buildCustomTimeTicks, resolveTruncatedBounds } from '../DashboardBuilder/charts/axisTypeUtils';
import { useChartAnimation, applyChartAnimation } from '../DashboardBuilder/utils/chartAnimation';
import { formatAxisValue } from './chartStyleHelpers';

/**
 * Small single-series bar chart for a card, e.g. "Traffic by Site". Mirrors
 * LineAreaChart.jsx's structure/props — same theme wiring, just `type: 'bar'`
 * instead of `type: 'line'` (no smoothing/symbol/area options, which are line-only).
 */
export default function BarChart({
  title = '', unit = '', data = [], color = '#378ADD', height = 90, isDark: isDarkProp = null,
  titleColor = null, bgColor = null, bgGradient = null, titleWeight = null, titleSize = null, titleFont = null, titleBgColor = null, valueTextColor = null, valueTextSize = null,
  axisTextColor = null, axisTextSize = null, axisTextWeight = null, axisTextFont = null,
  titlePosition = 'top-left', valuePosition = 'top-right', onPointClick = null, onPointContextMenu = null, categoryAxisLabel = null,
  isTimeAxis = false, valueAxisLabel = null, dateFormat = undefined, tickInterval = undefined,
  truncateYAxis = null, yAxisMin = null, yAxisMax = null,
  // Optional multi-series grouping (mapping.series — see ChartLibrary.jsx's SERIES_FIELD and
  // renderChartWidget.jsx's BAR case). When present, `categories`/`series` drive a grouped
  // (side-by-side, not stacked — that's STACKED_BAR's own job) bar per named series, same
  // per-series coloring/legend as StackedBarChart.jsx. `data`/`color` are ignored in this mode.
  // `isTimeAxis`/`dateFormat`/`tickInterval` above apply here too, same as single-series —
  // `categories` are just each series' shared x positions, so the same continuous-time-axis
  // branch (below) works whether there's one series or several.
  categories = null, series = null, showLegend = true, seriesColors = null, palette = null, seriesOpacity = null,
  // Style → Value labels (BAR_VALUE_LABELS_FIELD): 'hide' (default) | 'inside' | 'top'.
  barValueLabels = 'hide',
}) {
  const { theme } = useTheme();
  // Style → Animation settings (dashboard/Charts-tab provider; none elsewhere = ECharts defaults).
  const chartAnimation = useChartAnimation();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  // Style tab's opacity slider (0-100, null = this chart's built-in default) — see
  // widgetTypeRegistry.js's OPACITY fields.
  const barOpacity = seriesOpacity == null ? 1 : seriesOpacity / 100;
  const { text: textColor, sub: subColor } = chartTokens(isDark);
  const isMultiSeries = Array.isArray(series) && series.length > 0;

  const values = data.map((d) => d.value);
  const labels = isMultiSeries ? categories : data.map((d) => d.label);
  const total = values.reduce((sum, v) => sum + v, 0);
  // Raw (unformatted) labels used for click/context-menu identification below — kept separate
  // from whatever ECharts actually displays, same reasoning as HorizontalBarChart.jsx's own
  // `rawLabels`: a cross-filter click must send the real column value back, not a display
  // string, and once a time axis is in play there's no `p.name` to read at all (only a
  // category axis has one) — dataIndex-based lookup works for every axis mode uniformly.
  const clickLabels = labels;
  // Every series shares the same x positions (all plotted against the same `categories` list)
  // — computed once here rather than per-series. See LineAreaChart.jsx's own comment on this
  // same pattern: re-expressed in DEPLOYMENT_TIME_ZONE via toAxisTimeValue so every viewer sees
  // identical axis numbers regardless of their own browser's timezone.
  const timeXValues = isTimeAxis ? labels.map((l) => toAxisTimeValue(l)) : null;
  const seriesValues = isTimeAxis ? values.map((v, i) => [timeXValues[i], v]) : values;
  // ECharts' own time-axis auto-tick always snaps to its fixed internal ladder (1h/6h/12h/1d/
  // ...) regardless of minInterval/maxInterval/interval — see axisTypeUtils.js's own doc
  // comment on buildCustomTimeTicks for why an explicit tick list is the only way to get an
  // arbitrary exact spacing like "every 3 hours".
  const customTicks = isTimeAxis ? buildCustomTimeTicks(timeXValues, tickInterval) : undefined;
  const yBounds = resolveTruncatedBounds(truncateYAxis, yAxisMin, yAxisMax);
  // Value labels on each bar. 'inside' runs the number vertically up the inside of the bar
  // (Superset-style) in white; 'top' sits above the bar in the normal text color. Compact
  // numbers (17.8k) like the Y axis. On a time axis the point value is [epoch, value].
  const showBarLabels = barValueLabels === 'inside' || barValueLabels === 'top';
  const barLabel = showBarLabels ? {
    show: true,
    ...(barValueLabels === 'inside'
      ? { position: 'inside', rotate: 90, color: '#ffffff' }
      : { position: 'top', color: subColor }),
    fontSize: 9,
    formatter: (p) => formatAxisValue(Array.isArray(p.value) ? p.value[1] : p.value),
  } : undefined;
  // Inside labels: hide one that doesn't fit in its bar's height (a short bar would spill
  // white text over the background); top labels: just drop ones that overlap each other.
  const barLabelLayout = barValueLabels === 'inside'
    ? (p) => (p.labelRect.height > p.rect.height - 2 ? { hide: true } : {})
    : barValueLabels === 'top' ? { hideOverlap: true } : undefined;
  const labelProps = showBarLabels ? { label: barLabel, labelLayout: barLabelLayout } : {};

  const option = {
    // Extra bottom margin only when the category axis has a title — the default 18px is
    // already tight for tick labels alone. Extra left margin when the Y axis has a title too —
    // see axisTitle.js's own doc comment.
    grid: { left: gridMarginForVerticalTitle(valueAxisLabel, 28, 42), right: 4, top: barValueLabels === 'top' ? 16 : 8, bottom: (categoryAxisLabel ? 32 : 18) + (isMultiSeries ? 14 : 0) },
    xAxis: isTimeAxis ? {
      type: 'time',
      // See LineAreaChart.jsx's own comment — pairs with toAxisTimeValue above.
      useUTC: true,
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: {
        fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: resolveCustomTickFormatter(dateFormat, tickInterval, customTicks),
        ...(customTicks ? { customValues: customTicks } : {}),
      },
      ...(customTicks ? { axisTick: { customValues: customTicks } } : {}),
    } : {
      type: 'category',
      data: labels,
      // Which column the tick labels actually represent — static (mapping.x_axis) unless
      // drilling is active, in which case it's the CURRENT drill level's own dimension (see
      // renderChartWidget.jsx's own xAxis resolution) — without this, a drilled chart's bare
      // category labels ("2G"/"3G") give no clue whether that's a region, technology, etc.
      ...buildAxisTitle(categoryAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont }),
      axisLabel: { fontSize: axisTextSize || 9, color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined, interval: Math.max(0, Math.ceil(labels.length / 6) - 1) },
    },
    yAxis: {
      type: 'value',
      splitNumber: 2,
      // Explicit Y-axis bounds ("Truncate Y Axis" — see TRUNCATE_Y_AXIS_FIELD in
      // ChartLibrary.jsx) — resolveTruncatedBounds falls back to Auto/undefined when
      // truncateYAxis is off, a bound is blank, or min > max (an invalid combination ECharts
      // itself doesn't guard against).
      min: yBounds.min,
      max: yBounds.max,
      ...buildAxisTitle(valueAxisLabel, { axisTextSize, axisTextColor, axisTextWeight, axisTextFont, vertical: true }),
      axisLabel: {
        fontSize: axisTextSize || 8,
        color: axisTextColor || undefined, fontWeight: FONT_WEIGHT_CSS[axisTextWeight], fontFamily: axisTextFont || undefined,
        formatter: formatAxisValue,
      },
    },
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} ${unit}` },
    // Legend only meaningful once there's more than one named series to distinguish — see
    // StackedBarChart.jsx's own identical block.
    ...(isMultiSeries ? { legend: { show: showLegend, bottom: 0, textStyle: { fontSize: 9, color: subColor }, itemWidth: 10, itemHeight: 10 } } : {}),
    series: isMultiSeries ? series.map((s, i) => ({
      name: s.name,
      type: 'bar',
      barMaxWidth: 24,
      itemStyle: { color: seriesColors?.[s.name] || (palette ? palette[i % palette.length] : undefined), borderRadius: [2, 2, 0, 0], opacity: barOpacity },
      // Positional array (aligned to `categories`/xAxis.data by index) for the discrete
      // category axis; [epoch, value] pairs for the continuous time axis instead — same
      // isTimeAxis branch the xAxis block above already switches on.
      data: isTimeAxis ? s.data.map((v, j) => [timeXValues[j], v]) : s.data,
      ...labelProps,
    })) : [
      {
        type: 'bar',
        data: seriesValues,
        itemStyle: { color, borderRadius: [2, 2, 0, 0], opacity: barOpacity },
        barMaxWidth: 24,
        ...labelProps,
      },
    ],
  };

  return (
    <div className="kpi-bar-card h-full box-border flex flex-col overflow-hidden rounded-lg bg-white dark:bg-[#22273C]" style={bgGradient ? { background: `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})` } : bgColor ? { background: bgColor } : undefined}>
      {/* Reserved header row, not an absolutely-positioned overlay — see LineAreaChart.jsx's
          own comment for why (a bar can reach the very top of the chart just as easily as a
          line can, so no fixed title position can reliably avoid it). */}
      {title && (
        <div className="shrink-0 px-2.5 pt-1.5 pb-0.5" style={{ minHeight: Math.max(20, Math.ceil((titleSize || 12) * 1.35) + 10), background: titleBgColor || undefined }}>
          <span
            className="kpi-bar-title font-bold text-[0.6875rem] block truncate"
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
          ...(onPointClick ? { click: (p) => onPointClick(clickLabels[p.dataIndex]) } : {}),
          ...(onPointContextMenu ? { contextmenu: (p) => { p.event.event.preventDefault(); onPointContextMenu(clickLabels[p.dataIndex], p.event.event.clientX, p.event.event.clientY); } } : {}),
        } : undefined} />
      </div>
      {/* Sum-of-all-bars total — never actually enabled (see the old commented-out value=
          prop this replaced); questionable value for a many-category bar chart (reads as a
          random aggregate, not a KPI). If it comes back, it belongs as an absolutely-
          positioned span inside the chart area above, not this reserved header row.
          `${Math.round(total * 10) / 10}${unit}`, valuePosition, valueTextColor/valueTextSize
          are that value slot's own formatting/position, kept as accepted-but-unused props. */}
    </div>
  );
}
