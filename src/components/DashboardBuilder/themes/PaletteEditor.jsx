import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { PALETTE_PRESETS } from '../../../theme/tokens';

// A small horizontal strip of color dots — the swatch preview shown next to a preset's name,
// both in the trigger (once picked) and in each dropdown row (Superset's own "Color scheme"
// picker shows the same at-a-glance preview per option, not just a bare name to pick blind).
function SwatchStrip({ colors, size = 12 }) {
  return (
    <div className="flex items-center -space-x-1 shrink-0">
      {colors.slice(0, 8).map((c, i) => (
        <span
          key={i}
          className="rounded-full border border-white"
          style={{ width: size, height: size, background: c, zIndex: 8 - i }}
        />
      ))}
    </div>
  );
}

/**
 * Superset-style "Color scheme" editor for a categorical chart palette (array of hex
 * strings) — a dropdown trigger showing the active scheme's own swatch preview (not just its
 * name), opening a list of presets each previewed the same way, plus a row of small editable
 * color chips underneath for fully custom tweaking afterward (picking a preset always just
 * fills these chips, never a separate storage mechanism). Extracted from ThemeManager.jsx
 * (where it originally only edited a Theme's own `style.palette`) so the same editor also
 * drives a per-dashboard override (DashboardCanvasEditor.jsx) and a per-chart one
 * (MappingFields.jsx's SERIES_PALETTE_FIELD) without duplicating this UI three times.
 */
export default function PaletteEditor({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const matchingPreset = PALETTE_PRESETS.find((p) => JSON.stringify(p.colors) === JSON.stringify(value));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-300 transition-colors"
      >
        {value.length > 0 ? <SwatchStrip colors={value} /> : <span className="w-3 h-3 rounded-full border border-dashed border-slate-300 shrink-0" />}
        <span className="flex-1 text-xs font-medium text-slate-700 truncate">
          {matchingPreset ? matchingPreset.name : value.length ? 'Custom palette' : 'Pick a color scheme…'}
        </span>
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg py-1 max-h-60 overflow-y-auto">
          {PALETTE_PRESETS.map((p) => {
            const active = matchingPreset?.name === p.name;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => { onChange([...p.colors]); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${active ? 'bg-orange-50' : ''}`}
              >
                <SwatchStrip colors={p.colors} />
                <span className="flex-1 text-xs font-medium text-slate-700 truncate">{p.name}</span>
                {active && <Check size={13} className="text-[#EC7D09] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
