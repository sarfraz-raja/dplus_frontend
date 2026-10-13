import React, { useState } from 'react';
import { Check, Link2, Palette } from 'lucide-react';
import { cn } from '../../../utils/common';
import { CHART_PALETTE } from '../../../theme/tokens';
import { resolveStyleForMode } from '../utils/themedStyle';

// Theme popover's "linked Theme" control (DashboardCanvasEditor.jsx). A Theme is a shared
// resource referenced by id, never edited here — so it reads as a linked item (a card with the
// theme's name, a Linked badge and its palette strip, Change/Unlink below) rather than a form input.
// `themes` are GET /dashboard-builder/themes rows, which already carry `style`.

const themeStyle = (theme) => {
  if (typeof theme?.style !== 'string') return theme?.style || {};
  try { return JSON.parse(theme.style); } catch { return {}; }
};

// The theme's palette as one continuous strip of equal segments — reads as "this theme's
// colors" at a glance and fits any width, unlike a row of dots competing with the name.
function PaletteStrip({ theme, isDark, className }) {
  const palette = resolveStyleForMode(themeStyle(theme), isDark)?.palette;
  const colors = (Array.isArray(palette) && palette.length ? palette : CHART_PALETTE).slice(0, 8);
  return (
    <span className={cn('flex overflow-hidden rounded-full', className)} aria-hidden="true">
      {colors.map((c, i) => (
        <span key={`${c}-${i}`} className="h-full flex-1" style={{ background: c }} />
      ))}
    </span>
  );
}

export default function ThemePicker({ themes = [], value = null, onChange, isDark = false }) {
  const [open, setOpen] = useState(false);
  const linked = value ? themes.find((t) => String(t.id) === String(value)) : null;
  const pick = (id) => { onChange(id); setOpen(false); };

  return (
    <div className="flex flex-col gap-1.5">
      {value ? (
        // Stacked, not one row: the popover is narrow, and name + swatches + two actions on a
        // single line wrapped into a cramped jumble.
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 px-3 pb-2.5 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[13px] font-semibold text-slate-800">{linked?.name || 'Loading…'}</span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                <Link2 size={10} aria-hidden="true" /> Linked
              </span>
            </div>
            <PaletteStrip theme={linked} isDark={isDark} className="h-2 w-full" />
          </div>
          <div className="flex border-t border-slate-200 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex-1 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {open ? 'Close' : 'Change theme'}
            </button>
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex-1 border-l border-slate-200 py-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[12px] font-semibold text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          <Palette size={13} aria-hidden="true" /> {open ? 'Close' : 'Link a theme'}
        </button>
      )}

      {open && (
        <div role="listbox" aria-label="Themes" className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
          {themes.length === 0 && (
            <div className="px-2 py-3 text-center text-[11px] text-slate-400">No themes yet — create one in Settings → Themes.</div>
          )}
          {themes.map((t) => {
            const selected = String(t.id) === String(value);
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(t.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-100',
                  selected && 'bg-slate-100 font-semibold text-slate-900',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                <PaletteStrip theme={t} isDark={isDark} className="h-2 w-12 shrink-0" />
                {selected && <Check size={13} className="shrink-0 text-slate-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
