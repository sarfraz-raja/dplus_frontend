import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { chartTokens } from '../../theme/tokens';
import TitleValueOverlay from './TitleValueOverlay';

/**
 * Plain KPI stat tile — no ECharts, just a colored gradient card with a value + delta.
 * `darkGradient` is a [from, to] pair matching the reference snapshot's dark palette;
 * `color` is used for the light-mode tint.
 */
export default function StatCard({
  label = '', fullName = '', value = '', unit = '', delta = '', deltaUp = true, icon = null, color = '#378ADD',
  darkGradient = null, isDark: isDarkProp = null, bgColor = null, bgGradient = null, valueTextColor = null, valueTextSize = null,
  titleColor = null, titleWeight = null, titleSize = null, titleFont = null,
  titlePosition = 'top-left', valuePosition = 'top-right',
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { sub: subColor } = chartTokens(isDark);

  // A sheen layer on top of the gradient makes the light->dark shift read clearly
  // even when the two picked stops are close in lightness.
  const sheen = 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%)';
  // `bgGradient` is the generic theme/dashboard/per-widget gradient every widget type now
  // supports (Item 9) — applies in both light and dark mode, taking priority over both the
  // flat `bgColor` and this component's own older `darkGradient` (still supported as-is for
  // the real KPI dashboard's existing dark-mode-only presets, unchanged, so its established
  // look isn't disturbed by this more general mechanism).
  const background = bgGradient
    ? `${sheen}, linear-gradient(135deg, ${bgGradient[0]}, ${bgGradient[1]})`
    : bgColor || (isDark
      ? (darkGradient
          ? `${sheen}, linear-gradient(135deg, ${darkGradient[0]}, ${darkGradient[1]})`
          : `${sheen}, linear-gradient(135deg, #22273C, #22273C)`)
      : `${sheen}, linear-gradient(135deg, ${color}33, ${color}08)`);
  const border = isDark ? 'rgba(255,255,255,0.10)' : `${color}44`;
  // `color` (accent) drives the icon (both themes — previously stuck on a fixed white in
  // dark mode, making Accent color invisible there once a shade gradient was picked) plus
  // the border/shade fallback. `valueTextColor`, when set, controls only the value number —
  // the delta line keeps its semantic green(up)/amber(down) tint always, so it can't get
  // flattened into one color by a Value text color pick.
  const valueStyle = {
    color: valueTextColor || undefined,
    fontSize: valueTextSize ? `${valueTextSize}px` : undefined,
  };
  const labelStyle = {
    color: titleColor || subColor,
    fontWeight: titleWeight === 'bold' ? 700 : titleWeight === 'normal' ? 400 : undefined,
    fontSize: titleSize ? `${titleSize}px` : undefined,
    fontFamily: titleFont || undefined,
  };

  const titleNode = (
    <span className="kpi-stat-top kpi-tooltip flex items-center gap-1.5 text-xs leading-none text-slate-500 dark:text-white/85" data-tooltip={fullName || label}>
      {icon && <span className="kpi-stat-icon inline-flex items-center justify-center shrink-0 text-base leading-none" style={{ color }}>{icon}</span>}
      <span className="kpi-stat-label text-[0.6875rem] leading-tight block" style={labelStyle}>{label}</span>
    </span>
  );
  const valueNode = (
    <span className="kpi-stat-value flex items-center gap-1 text-xl font-semibold whitespace-nowrap text-slate-900 dark:text-white" style={valueStyle}>
      {value}
      {unit && <span className="text-xs font-medium opacity-70">{unit}</span>}
      <span className={`kpi-stat-delta text-[0.6875rem] ml-1 ${deltaUp ? 'up text-emerald-600 dark:text-emerald-400' : 'down text-amber-600 dark:text-amber-400'}`}>
        {deltaUp ? '▲' : '▼'} {delta}
      </span>
    </span>
  );

  return (
    <div
      className="kpi-stat-card relative h-full box-border rounded-lg"
      style={{ background, border: `0.5px solid ${border}` }}
    >
      <TitleValueOverlay title={titleNode} titlePosition={titlePosition} value={valueNode} valuePosition={valuePosition} />
    </div>
  );
}
