import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../../utils/common';

// Tinted backdrop around a style panel whose colors are stored per mode (themedStyle.js) —
// the real widget surface of each mode (near-white for Light, the app's dark widget navy #22273C —
// themedStyle.js's surfaceBg — for Dark), so it shows what's being designed for and makes it
// obvious the two modes are two separately saved sets of colors, not one. The field cards
// inside stay white either way, so only the surround changes. Used by the Dashboard Style
// popover's overrides and the Selected Widget Style panel (DashboardCanvasEditor.jsx).
// `attached`: the tint is the body of a section whose header sits directly above it (the left
// panel's Selected Widget Style) — square top corners, border on the other three sides only, so
// header + body read as one card.
const StyleModeTint = ({ mode, children, attached = false, className = '' }) => {
  const dark = mode === 'dark';
  const Icon = dark ? Moon : Sun;
  return (
    <div
      className={cn(
        'p-2 transition-colors',
        dark ? 'bg-[#22273C]' : 'bg-slate-50',
        attached ? cn('rounded-b-lg border-x border-b', dark ? 'border-[#343a52]' : 'border-slate-200') : cn('rounded-lg ring-1', dark ? 'ring-[#343a52]' : 'ring-slate-200'),
        className,
      )}
    >
      <div className="mb-2">
        <div className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider', dark ? 'text-slate-200' : 'text-slate-600')}>
          <Icon size={11} aria-hidden="true" />
          {dark ? 'Dark' : 'Light'} mode colors
        </div>
        <div className="text-[10px] text-slate-400">Sizes &amp; fonts are shared by both modes.</div>
      </div>
      {children}
    </div>
  );
};

export default StyleModeTint;
