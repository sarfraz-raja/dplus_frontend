import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { PALETTE_PRESETS } from '../../../theme/tokens';
import usePalettes from './usePalettes';

// A small horizontal strip of color dots — the swatch preview shown next to a preset's name,
// both in the trigger (once picked) and in each dropdown row (Superset's own "Color scheme"
// picker shows the same at-a-glance preview per option, not just a bare name to pick blind).
function SwatchStrip({ colors, size = 12 }) {
  return (
    <div className="flex items-center -space-x-1 shrink-0">
      {/* OLD: colors.slice(0, 8) */}
      {colors.map((c, i) => (
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
import FloatingPanel from '../../FloatingPanel';

export default function PaletteEditor({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  // OLD: own outside-click listener + an absolute list inside this component — a scrolling parent
  // (Themes / Style panels) clipped it. The list is now a shared FloatingPanel (portal), never clipped.

  // Built-in (tokens.js) + Custom (GET /dashboard-builder/palettes, shared list). Picking one COPIES its
  // colours into this theme/chart — later edits to the palette don't change it (backend Option A).
  const custom = usePalettes();
  const same = (a, b) => JSON.stringify((a || []).map((c) => String(c).toLowerCase())) === JSON.stringify((b || []).map((c) => String(c).toLowerCase()));
  // OLD: const matchingPreset = PALETTE_PRESETS.find(…) — built-ins only.
  const matchingPreset = PALETTE_PRESETS.find((p) => same(p.colors, value)) || custom.find((p) => same(p.colors, value));
  const groups = [
    { label: 'Built-in', items: PALETTE_PRESETS.map((p) => ({ key: `b:${p.name}`, name: p.name, colors: p.colors })) },
    { label: 'Custom', items: custom.map((p) => ({ key: `c:${p.id}`, name: p.name, colors: p.colors })) },
  ].filter((g) => g.items.length > 0);

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

      <FloatingPanel anchorRef={rootRef} open={open} onClose={() => setOpen(false)} maxHeight={320}>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 pb-1 pt-2 text-dbe-h3 font-semibold uppercase tracking-wider text-slate-400">{g.label}</p>
              {g.items.map((p) => {
                const active = matchingPreset?.name === p.name && same(matchingPreset?.colors, p.colors);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => { onChange([...p.colors]); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#EC7D09]/[0.08] transition-colors ${active ? 'bg-[#EC7D09]/[0.08]' : ''}`}
                  >
                    <SwatchStrip colors={p.colors} />
                    <span className="flex-1 text-dbe-body text-slate-700 truncate">{p.name}</span>
                    {active && <Check size={13} className="text-[#EC7D09] shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </FloatingPanel>
    </div>
  );
}
