import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Plain KPI stat tile — no ECharts, just a colored gradient card with a value + delta.
 * `darkGradient` is a [from, to] pair matching the reference snapshot's dark palette;
 * `color` is used for the light-mode tint.
 */
export default function StatCard({ label = '', fullName = '', value = '', delta = '', deltaUp = true, icon = null, color = '#378ADD', darkGradient = null, isDark: isDarkProp = null }) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';

  // A sheen layer on top of the gradient makes the light->dark shift read clearly
  // even when the two picked stops are close in lightness.
  const sheen = 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%)';
  // `darkGradient` is optional (only the KPI dashboard's own preset supplies one) — without
  // it, fall back to the same neutral dark card look the other widgets use, not the light tint.
  const background = isDark
    ? (darkGradient
        ? `${sheen}, linear-gradient(135deg, ${darkGradient[0]}, ${darkGradient[1]})`
        : `${sheen}, linear-gradient(135deg, #22273C, #22273C)`)
    : `${sheen}, linear-gradient(135deg, ${color}33, ${color}08)`;
  const border = isDark ? 'rgba(255,255,255,0.10)' : `${color}44`;

  return (
    <div
      className="kpi-stat-card relative h-full box-border rounded-lg p-3 flex flex-col justify-center"
      style={{ background, border: `0.5px solid ${border}` }}
    >
      <div className="kpi-stat-row flex items-center justify-between gap-2 min-w-0">
        <div className="kpi-stat-top kpi-tooltip flex items-center gap-1.5 text-xs leading-none min-w-0 flex-1 text-slate-500 dark:text-white/85" data-tooltip={fullName || label}>
          {icon && <span className="kpi-stat-icon inline-flex items-center justify-center shrink-0 text-base leading-none" style={{ color: isDark ? '#eef1f6' : color }}>{icon}</span>}
          <span className="kpi-stat-label text-[1.2rem] leading-none overflow-hidden text-ellipsis whitespace-nowrap block min-w-0">{label}</span>
        </div>
        <div className="kpi-stat-value flex items-center gap-1 text-xl font-semibold text-right whitespace-nowrap shrink-0 text-slate-900 dark:text-white" style={isDark ? { color } : undefined}>
          {value}
          <span className={`kpi-stat-delta absolute right-3.5 bottom-3 text-[0.6875rem] ${deltaUp ? 'up text-emerald-600 dark:text-emerald-400' : 'down text-amber-600 dark:text-amber-400'}`}>
            {deltaUp ? '▲' : '▼'} {delta}
          </span>
        </div>
      </div>
    </div>
  );
}
