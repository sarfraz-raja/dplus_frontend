import React, { useId } from 'react';
import { cn } from '../../utils/common';
import { useTheme } from '../../context/ThemeContext';
import { POSITION_GRID_AREA, POSITION_TEXT_ALIGN } from './titlePositions';
import { KPI_ICONS } from './kpiIcons';

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
 *
 * Colors follow `isDark` (the mode the card is drawn in), not Tailwind `dark:` — the Charts-tab
 * preview draws in the Style tab's Light/Dark mode, which can differ from the app's theme
 * (same reason StatCard takes isDark). Falls back to the app theme when not passed.
 */

const STATUS_TEXT = {
  light: { good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-red-600' },
  dark: { good: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400' },
};
const STATUS_STROKE = { good: '#059669', warn: '#D97706', bad: '#DC2626' };
const STATUS_LABEL = { good: 'On target', warn: 'Warning', bad: 'Off target' };

// `lineOpacity`/`fillOpacity` are 0–100 like Line/Area's seriesOpacity/areaOpacity; unset → the
// defaults this sparkline always drew (solid line, 12% fill).
// Horizontal alignment of a cell's stacked items by column ('l' | 'c' | 'r' — the second letter
// of a 3x3 grid area name like 'tl', 'mc', 'br').
const CELL_ALIGN_COL = { l: 'flex-start', c: 'center', r: 'flex-end' };

// `fillStyle` 'fade' (Style → Trend fill style, same key as Area's) fades the fill from the
// line down to transparent instead of one flat tint.
function Sparkline({ points, color, lineOpacity = null, fillOpacity = null, fillStyle = null }) {
  // useId() contains ':' — not reliable inside an SVG url(#…) reference, so strip it.
  const gradientId = `bn-fade-${useId().replace(/:/g, '')}`;
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
      {fillStyle === 'fade' && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      <polygon points={area} fill={fillStyle === 'fade' ? `url(#${gradientId})` : color} fillOpacity={fillOpacity == null ? 0.12 : fillOpacity / 100} />
      <polyline points={line} fill="none" stroke={color} strokeOpacity={lineOpacity == null ? 1 : lineOpacity / 100} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export default function BigNumberCard({
  label = '', subtitle = '', value = '', unit = '', status = null,
  delta = '', deltaUp = true, deltaGood = null, deltaNote = '', showDeltaNote = true, deltaTextSize = null,
  trend = null, accentColor = '#0891B2', lineOpacity = null, fillOpacity = null, fillStyle = null,
  bgColor = null, bgGradient = null, valueTextColor = null, valueTextSize = null,
  titleColor = null, titleWeight = null, titleSize = null, titleFont = null, isDark: isDarkProp = null,
  // Style → Title icon (kpiIcons.js key) and the 3x3 positions (titlePositions.js keys).
  // Defaults reproduce the original layout: title top-left, number + change stacked middle-left.
  titleIcon = null, titlePosition = 'top-left', valuePosition = 'mid-left', deltaPosition = 'mid-left',
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const statusText = STATUS_TEXT[isDark ? 'dark' : 'light'];
  const muted = isDark ? 'text-white/60' : 'text-slate-500';
  const faint = isDark ? 'text-white/50' : 'text-slate-400';
  const accent = accentColor || '#0891B2';
  const background = bgGradient
    ? `linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})`
    : bgColor || undefined;
  // A target status wins over a picked value color — it's the whole point of setting targets.
  const valueColor = status ? undefined : (valueTextColor || undefined);
  const deltaClass = deltaGood == null
    ? muted
    : deltaGood ? statusText.good : statusText.bad;
  const hasTrend = Array.isArray(trend) && trend.length > 1;
  // Trend loaded but with 0–1 points (e.g. a datasource that only keeps the latest interval):
  // nothing honest to draw — a flat line would claim "steady", a lone dot looks broken — so say
  // so where the line would be. null/undefined (off, loading, failed) shows nothing.
  const tooFewPoints = Array.isArray(trend) && trend.length < 2;
  const Icon = titleIcon && titleIcon !== 'none' ? KPI_ICONS[titleIcon] : null;

  const titleNode = (label || Icon) ? (
    <div key="title" className="min-w-0 max-w-full">
      <div
        className={cn('flex min-w-0 items-center gap-1.5 text-xs', isDark ? 'text-white/80' : 'text-slate-500')}
        title={label}
        style={{
          color: titleColor || undefined,
          fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined,
          fontSize: titleSize ? `${titleSize}px` : undefined,
          // `text-xs` bakes in a fixed 16px line-height — see GaugeCard.jsx's own note, same fix.
          lineHeight: titleSize ? 1.3 : undefined,
          fontFamily: titleFont || undefined,
        }}
      >
        {/* Same color as the title text (currentColor), sized with it. */}
        {Icon && <Icon className="h-[1.15em] w-[1.15em] shrink-0" aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </div>
      {subtitle && <div className={cn('truncate text-[10.5px]', faint)} title={subtitle}>{subtitle}</div>}
    </div>
  ) : null;
  const valueNode = (
    <div key="value" className="flex max-w-full items-baseline gap-1.5">
      <span
        className={cn('whitespace-nowrap text-[32px] font-bold leading-none', isDark ? 'text-white' : 'text-slate-900', status && statusText[status])}
        style={{ color: valueColor, fontSize: valueTextSize ? `${valueTextSize}px` : undefined }}
      >
        {value}
      </span>
      {unit && <span className={cn('text-sm font-medium', muted)}>{unit}</span>}
      {status && (
        <span className={cn('ml-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide', statusText[status])}>
          {STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
  const deltaNode = delta ? (
    <div
      key="delta"
      className={cn('max-w-full truncate text-xs font-semibold', deltaClass)}
      title={deltaNote || undefined}
      style={deltaTextSize ? { fontSize: `${deltaTextSize}px` } : undefined}
    >
      {deltaUp ? '▲' : '▼'} {delta}
      {deltaNote && showDeltaNote && <span className={cn('ml-1 font-normal', faint)}>{deltaNote}</span>}
    </div>
  ) : null;
  // area -> { position, nodes } in title → number → change order, so shared cells stack.
  const cells = {};
  [[titleNode, titlePosition], [valueNode, valuePosition], [deltaNode, deltaPosition]].forEach(([node, pos]) => {
    if (!node) return;
    const position = POSITION_GRID_AREA[pos] ? pos : 'top-left';
    const area = POSITION_GRID_AREA[position];
    if (!cells[area]) cells[area] = { position, nodes: [] };
    cells[area].nodes.push(node);
  });

  return (
    <div
      // p-2.5 = the same 10px inner padding as StatCard (KPI Card, via TitleValueOverlay), so
      // the two tiles line up when placed side by side.
      // Hairline edge by default — the same 1px slate-200 / white-10% the dashboard tile itself
      // uses for non-chart widgets (.dbe-widget) — so a white card stays visible on the white
      // light-mode canvas. When the Border style setting is on, CARD_BORDERED_CLASS drops this
      // (border-0 on .rounded-lg) and the tile's own border takes over — never two borders.
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border p-2.5',
        isDark ? 'border-white/10 bg-[#22273C]' : 'border-slate-200 bg-white',
      )}
      style={background ? { background } : undefined}
    >
      {/* Positions (same 3x3 vocabulary as TitleValueOverlay) above the trend line, laid out
          row by row so an item only shares width with what's actually in its row — a lone
          top-left title gets the full width instead of a third. Items sharing a cell stack in
          order: title, number, change. The middle row takes the free height. */}
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        {['t', 'm', 'b'].map((row) => {
          const inRow = ['l', 'c', 'r'].filter((col) => cells[row + col]);
          const hasCenter = !!cells[`${row}c`];
          const columns = hasCenter ? 'minmax(0,1fr) auto minmax(0,1fr)' : (cells[`${row}r`] ? 'minmax(0,1fr) auto' : 'minmax(0,1fr)');
          // Left fills the free width; right hugs the right edge; center sits truly centered.
          const colIndex = hasCenter ? { l: 1, c: 2, r: 3 } : { l: 1, r: 2 };
          if (!inRow.length && row !== 'm') return null;
          return (
            <div
              key={row}
              className={cn('grid min-w-0 gap-2', row === 'm' ? 'min-h-0 flex-1 items-center' : 'shrink-0', row === 'b' && 'items-end')}
              style={{ gridTemplateColumns: columns }}
            >
              {inRow.map((col) => {
                const { position, nodes } = cells[row + col];
                return (
                  <div
                    key={col}
                    className="flex min-w-0 flex-col gap-1.5"
                    style={{
                      gridColumn: colIndex[col],
                      alignItems: CELL_ALIGN_COL[col],
                      textAlign: POSITION_TEXT_ALIGN[position] || 'left',
                    }}
                  >
                    {nodes}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {hasTrend && (
        // Full-bleed: -mx/-mb cancel the card's p-2.5 so the line runs to the card's left, right
        // and bottom edges (clipped by its rounded corners), like the KPI dashboard's trend cards —
        // inside the padding it left an empty band on three sides.
        <div className="-mx-2.5 -mb-2.5 mt-1 h-[30%] min-h-[24px] shrink-0">
          <Sparkline points={trend} color={status ? STATUS_STROKE[status] : accent} lineOpacity={lineOpacity} fillOpacity={fillOpacity} fillStyle={fillStyle} />
        </div>
      )}
      {tooFewPoints && (
        <div className={cn('mt-1 shrink-0 truncate text-[10.5px] italic', faint)}>Not enough history for a trend</div>
      )}
    </div>
  );
}
