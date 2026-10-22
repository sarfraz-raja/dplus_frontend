import React from 'react';
import { Sun, Moon, ChevronDown } from 'lucide-react';
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
// `headerRight`: optional control on the header line (e.g. the Light | Dark switch).
// `hintRight`: optional control on the hint line, right-aligned (e.g. "Copy to Dark →").
// `open` / `onToggle`: optional collapse — the heading becomes a button; the right-side controls stay usable.
// `badge`: optional marker after the heading (e.g. WidgetStyleFields' "Edited").
const StyleModeTint = ({ mode, children, attached = false, className = '', headerRight = null, hintRight = null, open = true, onToggle = null, badge = null }) => {
  const dark = mode === 'dark';
  const Icon = dark ? Moon : Sun;
  return (
    <div
      data-mode={dark ? 'dark' : 'light'} // lets WidgetStyleFields restyle the rows inside a Dark box
      className={cn(
        'p-2 transition-colors',
        // OLD light tint: bg-slate-50 / slate-200 border — too close to the neutral Shared box
        // (WidgetStyleFields' colorMode split), so Light now gets a warm tint.
        // OLD dark bg #22273C — now the mockup's dark card (--dbe-dark-card).
        dark ? 'bg-[var(--dbe-dark-card)]' : 'bg-[#EC7D09]/[0.06]',
        attached ? cn('rounded-b-lg border-x border-b', dark ? 'border-[#343a52]' : 'border-[#EC7D09]/30') : cn('rounded-xl border', dark ? 'border-[#343a52]' : 'border-slate-200'), // OLD: ring-1 + orange ring (light) — now the same 1px slate border as the Shared box
        className,
      )}
    >
      {/* Left: heading with its hint directly under it. Right: mode switch over the copy button.
          OLD layout: heading … switch on one row, hint … copy on a second row (left a gap under the
          heading, since the row took the switch's height). */}
      {/* flex-wrap: in a narrow panel the switch + copy drop under the heading instead of squeezing it. */}
      <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1.5', open && 'mb-2')}>
        <div
          className={cn('group min-w-0 flex-1', onToggle && 'cursor-pointer')}
          role={onToggle ? 'button' : undefined}
          aria-expanded={onToggle ? open : undefined}
          tabIndex={onToggle ? 0 : undefined}
          onClick={onToggle || undefined}
          onKeyDown={onToggle ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } } : undefined}
        >
          <div className={cn('flex items-center gap-1.5 whitespace-nowrap text-dbe-h2 font-semibold uppercase tracking-wider', dark ? 'text-slate-200' : 'text-[#EC7D09]')}>
            {/* OLD: ChevronRight before the heading */}
            <Icon size={11} aria-hidden="true" className={dark ? 'text-[#FACC15]' : 'text-[#EC7D09]'} />
            {/* OLD: {dark ? 'Dark' : 'Light'} mode colors */}
            {dark ? 'Dark' : 'Light'} colors
            {onToggle && <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" className={cn('text-slate-400 transition-transform group-hover:text-[#EC7D09]', !open && '-rotate-90')} />}
            {badge}
          </div>
          {/* OLD hint: "Sizes & fonts are shared by both modes." */}
          {/* OLD: the copy action sat inline on this hint line ("· Copy to Light →") — cramped. It's now an
              icon button next to the switch. */}
          {/* OLD: slate-400 (both), then orange on Dark. Now blue in both, like the mockup — a deliberate exception
              to the one-orange rule (CLAUDE.md §8): lighter blue on the navy box, deeper blue on the warm Light tint. */}
          <div className={cn('truncate text-dbe-meta leading-tight', dark ? 'text-[#60A5FA]' : 'text-[#2563EB]')}>Only for {dark ? 'Dark' : 'Light'} mode</div>
        </div>
        {/* OLD: right column held the switch AND the copy button stacked — taller than the Shared
            box's header. Now only the switch; the copy action sits on the hint line (below). */}
        {(headerRight || hintRight) && (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* OLD: fixed w-[116px] wrapper (labelled switch) — the compact switch sizes itself. */}
            {headerRight}
            {hintRight}
          </div>
        )}
      </div>
      {open && children}
    </div>
  );
};

export default StyleModeTint;
