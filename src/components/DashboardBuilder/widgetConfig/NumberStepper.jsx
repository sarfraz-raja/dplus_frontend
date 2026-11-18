import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Number box with ▲/▼ arrows and the allowed range beside it — replaces the style sliders
// (WidgetStyleFields' SliderRow), so an exact value can be typed instead of dragged.
//  - Typing: committed on Enter / blur, clamped to min–max; empty or invalid snaps back. Esc cancels.
//  - Arrows (buttons or ↑/↓ keys): ±step, Shift = ×10, applied at once.
//  - `inherited`: the value shown isn't set at this level (follows the level above) — drawn muted.
// The `!` utilities beat the Dashboard Builder side panel's global input rules (margin/border/padding).
// `showRange={false}`: the caller shows min – max itself (style rows put it on the label line);
// `fullWidth`: the box fills its row instead of a fixed 84px.
// OLD: export default function NumberStepper({ id, value, min, max, step = 1, onChange, inherited = false, ariaLabel }) {
export default function NumberStepper({ id, value, min, max, step = 1, onChange, inherited = false, ariaLabel, showRange = true, fullWidth = false }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(String(value ?? '')); }, [value, editing]);

  // Decimal places of `step`, so 0.1 steps don't drift into 0.30000000000000004.
  const decimals = (String(step).split('.')[1] || '').length;
  const clamp = (n) => Math.min(max, Math.max(min, Number(n.toFixed(decimals))));
  const commit = (raw) => {
    setEditing(false);
    const n = Number(String(raw).trim());
    if (String(raw).trim() === '' || Number.isNaN(n)) { setDraft(String(value ?? '')); return; }
    const next = clamp(n);
    setDraft(String(next));
    if (next !== Number(value)) onChange(next);
  };
  const bump = (dir, big = false) => {
    const base = Number.isNaN(Number(value)) ? min : Number(value);
    const next = clamp(base + dir * step * (big ? 10 : 1));
    setEditing(false);
    setDraft(String(next));
    if (next !== Number(value)) onChange(next);
  };
  const atMin = Number(value) <= min;
  const atMax = Number(value) >= max;

  return (
    <span className={`flex min-w-0 items-center gap-2${fullWidth ? ' w-full' : ''}`}>
      {/* OLD: w-[84px] shrink-0 always */}
      <span className={`flex h-7 items-stretch overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-[#EC7D09] ${fullWidth ? 'min-w-0 flex-1' : 'w-[84px] shrink-0'}`}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          aria-label={ariaLabel}
          onFocus={() => setEditing(true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value); e.currentTarget.blur(); }
            else if (e.key === 'Escape') { e.preventDefault(); setDraft(String(value ?? '')); setEditing(false); e.currentTarget.blur(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); bump(1, e.shiftKey); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1, e.shiftKey); }
          }}
          className={`!m-0 !h-full min-w-0 flex-1 !rounded-none !border-0 !bg-transparent !px-2 !py-0 !shadow-none text-dbe-body tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${inherited && !editing ? 'text-slate-600' : 'text-slate-800'}`}
        />
        <span className="flex w-5 shrink-0 flex-col border-l border-slate-200">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Increase"
            title={`+${step} (Shift: +${step * 10})`}
            disabled={atMax}
            onClick={(e) => bump(1, e.shiftKey)}
            className="flex flex-1 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#EC7D09] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
          >
            <ChevronUp size={11} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Decrease"
            title={`−${step} (Shift: −${step * 10})`}
            disabled={atMin}
            onClick={(e) => bump(-1, e.shiftKey)}
            className="flex flex-1 items-center justify-center border-t border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-[#EC7D09] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
          >
            <ChevronDown size={11} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </span>
      </span>
      {/* OLD: text-slate-400 — too faint on the light panel (and dimmed again on inherited fields). */}
      {showRange && <span className="shrink-0 text-dbe-meta tabular-nums text-slate-500" title={`Allowed: ${min} to ${max}`}>{min} – {max}</span>}
    </span>
  );
}
