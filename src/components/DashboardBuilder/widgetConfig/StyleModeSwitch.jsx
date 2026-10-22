import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../../utils/common';

// Light | Dark switch shown above any style panel whose color fields are stored per mode
// (see utils/themedStyle.js) — shared by the Charts-tab Style panel, the dashboard editor's
// Dashboard Style popover + Selected Widget Style, and Settings → Themes so they all edit the
// same way. `value` is 'light' | 'dark'; `hint` overrides the default helper line, `showHint={false}`
// drops it (when a StyleModeTint below already labels the mode).
const MODE_OPTIONS = [['light', 'Light', Sun], ['dark', 'Dark', Moon]];

// `tone="dark"`: on the navy Dark colors box — dark track, orange-tinted active pill (mockup).
// `compact`: icons only (☀ / ☾, labels as tooltips) — for the colors box header, where the heading
// already names the mode and a labelled switch made the header wrap in the narrow inspector.
const StyleModeSwitch = ({ value, onChange, hint = null, showHint = true, className = '', tone = 'light', compact = false }) => (
  <div className={cn('mb-2.5', className)}>
    <div role="tablist" aria-label="Edit colors for" className={cn('flex rounded-lg p-0.5', tone === 'dark' ? 'bg-white/10' : 'bg-slate-100')}>
      {MODE_OPTIONS.map(([mode, label, Icon]) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          aria-label={`${label} mode`}
          title={compact ? `${label} mode` : undefined}
          onClick={() => onChange(mode)}
          className={cn(
            // OLD: gap-1.5 py-1 — compact now: never taller than the panel's own controls (22px).
            'flex h-[22px] items-center justify-center gap-1 rounded-md text-dbe-body font-semibold transition-colors',
            compact ? 'w-6' : 'flex-1',
            // Darker-gray pill on a light-gray track — a white pill on slate-100 was too faint to
            // tell which mode was being edited.
            tone === 'dark'
              ? (value === mode ? 'bg-white/20 text-white' : 'bg-transparent text-slate-300 hover:bg-white/10 hover:text-white') // OLD active: bg-[#EC7D09]/25 (read brown)
              : (value === mode
                ? 'bg-slate-300 text-slate-800'
                : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-700'),
          )}
        >
          <Icon size={11} aria-hidden="true" />{!compact && label}
        </button>
      ))}
    </div>
    {showHint && (
      <p className="mt-1 text-dbe-meta text-slate-400">
        {hint || <>Colors below apply to <b>{value}</b> mode only; sizes and fonts are shared.</>}
      </p>
    )}
  </div>
);

export default StyleModeSwitch;
