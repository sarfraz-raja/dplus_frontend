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
  const background = isDark && darkGradient
    ? `${sheen}, linear-gradient(135deg, ${darkGradient[0]}, ${darkGradient[1]})`
    : `${sheen}, linear-gradient(135deg, ${color}33, ${color}08)`;
  const border = isDark && darkGradient ? 'rgba(255,255,255,0.10)' : `${color}44`;

  return (
    <div className="kpi-stat-card" style={{ background, border: `0.5px solid ${border}` }}>
      <div className="kpi-stat-row">
        <div className="kpi-stat-top kpi-tooltip" data-tooltip={fullName || label}>
          {icon && <span className="kpi-stat-icon" style={{ color: isDark ? '#eef1f6' : color }}>{icon}</span>}
          <span className="kpi-stat-label">{label}</span>
        </div>
        <div className="kpi-stat-value" style={isDark ? { color } : undefined}>
          {value}
          <span className={`kpi-stat-delta ${deltaUp ? 'up' : 'down'}`}>
            {deltaUp ? '▲' : '▼'} {delta}
          </span>
        </div>
      </div>
    </div>
  );
}
