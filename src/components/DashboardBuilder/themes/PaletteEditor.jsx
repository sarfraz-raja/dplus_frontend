import React from 'react';
import { Plus, X } from 'lucide-react';
import { PALETTE_PRESETS } from '../../../theme/tokens';

/**
 * Superset-style "Color scheme" editor for a categorical chart palette (array of hex
 * strings) — a preset picker (fills the swatches below, still freely editable afterward,
 * not a separate storage mechanism) plus per-swatch color/remove controls and an "add
 * color" button. Extracted from ThemeManager.jsx (where it originally only edited a Theme's
 * own `style.palette`) so the same editor can also drive a per-dashboard palette override
 * (DashboardCanvasEditor.jsx's "Dashboard Level Theme" popover) without duplicating this UI.
 */
export default function PaletteEditor({ value = [], onChange }) {
  const matchingPresetName = PALETTE_PRESETS.find((p) => JSON.stringify(p.colors) === JSON.stringify(value))?.name || '';

  return (
    <div>
      <label className="flex items-center gap-2 mb-2.5">
        <span className="text-xs text-slate-500 shrink-0">Preset</span>
        <select
          value={matchingPresetName}
          onChange={(e) => {
            const preset = PALETTE_PRESETS.find((p) => p.name === e.target.value);
            if (preset) onChange([...preset.colors]);
          }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs flex-1"
        >
          <option value="">
            {matchingPresetName ? '— custom (edited since) —' : '— pick a preset to fill the swatches below —'}
          </option>
          {PALETTE_PRESETS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        {value.map((c, i) => (
          <div key={i} className="relative group">
            <input
              type="color"
              value={c}
              onChange={(e) => onChange(value.map((p, pi) => (pi === i ? e.target.value : p)))}
              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, pi) => pi !== i))}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, '#94a3b8'])}
          className="w-9 h-9 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-[#EC7D09] hover:border-[#EC7D09] flex items-center justify-center"
          title="Add color"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
