import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../../utils/common';

// Light | Dark switch shown above any style panel whose color fields are stored per mode
// (see utils/themedStyle.js) — shared by the Charts-tab Style panel, the dashboard editor's
// Dashboard Style popover + Selected Widget Style, and Settings → Themes so they all edit the
// same way. `value` is 'light' | 'dark'; `hint` overrides the default helper line.
const MODE_OPTIONS = [['light', 'Light', Sun], ['dark', 'Dark', Moon]];

const StyleModeSwitch = ({ value, onChange, hint = null, className = '' }) => (
  <div className={cn('mb-2.5', className)}>
    <div role="tablist" aria-label="Edit colors for" className="flex rounded-lg bg-slate-100 p-0.5">
      {MODE_OPTIONS.map(([mode, label, Icon]) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-[11px] font-semibold transition-colors',
            value === mode
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Icon size={12} aria-hidden="true" />{label}
        </button>
      ))}
    </div>
    <p className="mt-1 text-[10px] text-slate-400">
      {hint || <>Colors below apply to <b>{value}</b> mode only; sizes and fonts are shared.</>}
    </p>
  </div>
);

export default StyleModeSwitch;
