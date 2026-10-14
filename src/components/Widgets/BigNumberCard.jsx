import React from 'react';
import { cn } from '../../utils/common';

/**
 * "Big Number" tile (Dashboard Builder chart type BIG_NUMBER — a KPI_CARD with
 * mapping.kpi_variant 'big_number', see chartTypeMeta.js). Separate from StatCard so existing
 * KPI Cards are untouched. Reads top to bottom: title (+ optional subtitle), the number, the
 * comparison line, an optional trend sparkline.
 *
 * `status` ('good' | 'warn' | 'bad' | null) colors the number against the user's targets;
 * `deltaGood` colors the comparison by whether its direction is good ("Is higher better?"),
 * not just up/down. `trend` is [{ x, y }] already in x order. No ECharts — plain SVG, so it
 * stays light on a dashboard full of cards.
 */

const STATUS_TEXT = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
};
const STATUS_STROKE = { good: '#059669', warn: '#D97706', bad: '#DC2626' };
const STATUS_LABEL = { good: 'On target', warn: 'Warning', bad: 'Off target' };

function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  // 100 x 30 viewBox stretched to the card's width; 2-unit padding top/bottom so the stroke
  // isn't clipped at the extremes.
  const coords = points.map((p, i) => [
    (i / (points.length - 1)) * 100,
    28 - ((p.y - min) / span) * 26,
  ]);
  const line = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `0,30 ${line} 100,30`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <polygon points={area} fill={color} fillOpacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export default function BigNumberCard({
  label = '', subtitle = '', value = '', unit = '', status = null,
  delta = '', deltaUp = true, deltaGood = null, deltaNote = '',
  trend = null, accentColor = '#0891B2',
  bgColor = null, bgGradient = null, valueTextColor = null, valueTextSize = null,
  titleColor = null, titleWeight = null, titleSize = null, titleFont = null,
}) {
  const background = bgGradient
    ? `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})`
    : bgColor || undefined;
  // A target status wins over a picked value color — it's the whole point of setting targets.
  const valueColor = status ? undefined : (valueTextColor || undefined);
  const deltaClass = deltaGood == null
    ? 'text-slate-500 dark:text-slate-300'
    : deltaGood ? STATUS_TEXT.good : STATUS_TEXT.bad;
  const hasTrend = Array.isArray(trend) && trend.length > 1;

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg bg-white p-3 dark:bg-[#22273C]"
      style={background ? { background } : undefined}
    >
      <div className="min-w-0 shrink-0">
        <div
          className="truncate text-xs text-slate-500 dark:text-white/80"
          title={label}
          style={{
            color: titleColor || undefined,
            fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined,
            fontSize: titleSize ? `${titleSize}px` : undefined,
            fontFamily: titleFont || undefined,
          }}
        >
          {label}
        </div>
        {subtitle && <div className="truncate text-[10.5px] text-slate-400 dark:text-white/50" title={subtitle}>{subtitle}</div>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn('whitespace-nowrap text-[32px] font-bold leading-none text-slate-900 dark:text-white', status && STATUS_TEXT[status])}
            style={{ color: valueColor, fontSize: valueTextSize ? `${valueTextSize}px` : undefined }}
          >
            {value}
          </span>
          {unit && <span className="text-sm font-medium text-slate-500 dark:text-white/60">{unit}</span>}
          {status && (
            <span className={cn('ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide', STATUS_TEXT[status])}>
              {STATUS_LABEL[status]}
            </span>
          )}
        </div>
        {delta && (
          <div className={cn('mt-1.5 truncate text-[11.5px] font-semibold', deltaClass)} title={deltaNote || undefined}>
            {deltaUp ? '▲' : '▼'} {delta}
            {deltaNote && <span className="ml-1 font-normal text-slate-400 dark:text-white/50">{deltaNote}</span>}
          </div>
        )}
      </div>

      {hasTrend && (
        <div className="mt-1 h-[28%] min-h-[24px] shrink-0">
          <Sparkline points={trend} color={status ? STATUS_STROKE[status] : accentColor} />
        </div>
      )}
    </div>
  );
}
