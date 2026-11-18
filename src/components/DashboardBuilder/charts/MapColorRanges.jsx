import React from 'react';
import { Plus, X } from 'lucide-react';
import Select from '../../Select'; // shared dropdown (CLAUDE.md)
import ColorPicker from '../../MapsUsingDeckgl/ColorPicker';
import { KPI_RANGE_DEFAULTS, deepCopyRanges } from '../../MapsUsingDeckgl/Utils/colorEngine';

// Map chart "Custom ranges" editor (Data → Color). Same range system as the GIS Engine's KPI
// thematics (CellThematicsPanel / RangeFilter): rows of { min, max, color, label }, a value matches
// a row when min ≤ value ≤ max, the first matching row wins, no match = grey. Presets are the GIS
// Engine's own KPI_RANGE_DEFAULTS. Unlike the GIS, a blank Min / Max means open-ended (no lower /
// upper limit) — see mapChartLayers.js normalizeRanges. Not RangeFilter itself: that one is styled
// for the GIS's dark panel.

// KPI_RANGE_DEFAULTS repeats some presets under lowercase keys for old GIS lookups — list each once.
const PRESETS = Object.keys(KPI_RANGE_DEFAULTS).filter((k, _, all) => !(k === k.toLowerCase() && all.some((o) => o !== k && o.toLowerCase() === k)));
const NEW_ROW_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
// Rows still exactly a preset's (bounds compared as numbers, so "98" = "98.00" = 98).
// OLD (ignored signs): bounds, color and label only.
// Signs too: a preset with a clicked sign is "Custom". (Hoisted function so effectiveOps can sit lower.)
function sameRanges(a = [], b = []) {
  if (a.length !== b.length) return false;
  const ea = effectiveOps(a);
  const eb = effectiveOps(b);
  return a.every((r, i) => (
    Number(r.min) === Number(b[i].min) && Number(r.max) === Number(b[i].max)
    && String(r.color).toLowerCase() === String(b[i].color).toLowerCase() && (r.label || '') === (b[i].label || '')
    && ea[i].min === eb[i].min && ea[i].max === eb[i].max
  ));
}
// OLD: const ROW_COLS = 'grid-cols-[10px_1fr_10px_1fr_24px_1.4fr_16px]';
const ROW_COLS = 'grid-cols-[40px_1fr_40px_1fr_24px_1.2fr_14px]';
const signCls = 'w-full px-1 py-1 rounded border border-slate-200 text-xs';

// The sign each bound really has. Matching is min ≤ value ≤ max with the first row winning, so a
// bound shared with an EARLIER row belongs to that row: here it's exclusive (> / <). E.g. CSSR
// 98–100, 95–98, 0–95 → [98, 100], [95, 98), [0, 95) — 98 is Strong. Display only.
const boundSigns = (ranges) => ranges.map((r, i) => {
  const earlier = ranges.slice(0, i);
  const same = (a, b) => a !== '' && b !== '' && a != null && b != null && Number(a) === Number(b);
  // OLD: min: earlier.some(...) ? '>' : '≥', max: earlier.some(...) ? '<' : '≤' — showed ≤ / ≥ next to a
  // blank bound too, which reads as "≤ nothing" / the number counted twice. Blank = no limit = no sign.
  const blank = (v) => v === '' || v == null || !Number.isFinite(Number(v));
  return {
    min: blank(r.min) ? '' : earlier.some((e) => same(e.max, r.min)) ? '>' : '≥',
    max: blank(r.max) ? '' : earlier.some((e) => same(e.min, r.max)) ? '<' : '≤',
  };
});

// Signs the user can click (stored per row as minOp '>=' | '>' and maxOp '<=' | '<'; unset = '>=' / '<=',
// the GIS Engine's rule). Matching stays "first row it fits wins" (mapChartLayers.js matchRangeColor), so
// where two rows both include a shared number the earlier row gets it and the later one shows the
// exclusive sign — the signs always show where a number really goes. Replaces boundSigns for display.
const SIGN = { '>=': '≥', '>': '>', '<=': '≤', '<': '<' };
const isBlankBound = (v) => v === '' || v == null || !Number.isFinite(Number(v));
const sameBound = (a, b) => !isBlankBound(a) && !isBlankBound(b) && Number(a) === Number(b);
export const effectiveOps = (ranges) => ranges.reduce((acc, r, i) => {
  const earlier = acc.slice(0, i);
  let min = isBlankBound(r.min) ? '' : (r.minOp === '>' ? '>' : '>=');
  if (min === '>=' && earlier.some((e, k) => e.max === '<=' && sameBound(ranges[k].max, r.min))) min = '>';
  let max = isBlankBound(r.max) ? '' : (r.maxOp === '<' ? '<' : '<=');
  if (max === '<=' && earlier.some((e, k) => e.min === '>=' && sameBound(ranges[k].min, r.max))) max = '<';
  acc.push({ min, max });
  return acc;
}, []);

// A row an earlier row fully contains can never color anything (first row wins) — flagged, not blocked.
const num = (v, open) => (v === '' || v == null || !Number.isFinite(Number(v)) ? open : Number(v));
const coveredBy = (ranges) => ranges.map((r, i) => {
  const lo = num(r.min, -Infinity);
  const hi = num(r.max, Infinity);
  // OLD: const j = ranges.slice(0, i).findIndex((e) => num(e.min, -Infinity) <= lo && num(e.max, Infinity) >= hi);
  // A row with neither Min nor Max isn't applied (mapChartLayers.js normalizeRanges drops it), so it
  // can't cover anything — before, a just-added blank row read as "everything" and dimmed the next one.
  const isBlank = (e) => num(e.min, null) === null && num(e.max, null) === null;
  if (isBlank(r)) return null;
  const j = ranges.slice(0, i).findIndex((e) => !isBlank(e) && num(e.min, -Infinity) <= lo && num(e.max, Infinity) >= hi);
  return j === -1 ? null : j;
});

const inputCls = 'w-full min-w-0 px-1.5 py-1 rounded border border-slate-200 text-xs';

// OLD: export default function MapColorRanges({ value = [], onChange }) {
export default function MapColorRanges({ value = [], onChange, label = 'Color ranges' }) {
  const ranges = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(ranges.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i) => onChange(ranges.filter((_, idx) => idx !== i));
  // A new row starts where the last one ended (its Min), like the GIS's RangeFilter addRange.
  const add = () => {
    const last = ranges[ranges.length - 1];
    onChange([...ranges, { min: '', max: last?.min ?? '', color: NEW_ROW_COLORS[ranges.length % NEW_ROW_COLORS.length], label: '' }]);
  };

  // OLD: const signs = boundSigns(ranges);
  const ops = effectiveOps(ranges);
  // Click a sign: flip it, and give a row sharing that number the opposite sign, so the number is in
  // exactly one row (never both, never neither). Every row's current signs are saved first, so the
  // flip can't be undone by "first row wins".
  const flip = (i, side) => {
    const next = ranges.map((r, k) => ({ ...r, minOp: ops[k].min || undefined, maxOp: ops[k].max || undefined }));
    if (side === 'max') {
      const op = ops[i].max === '<' ? '<=' : '<';
      next[i].maxOp = op;
      next.forEach((r, k) => { if (k !== i && sameBound(r.min, ranges[i].max)) r.minOp = op === '<=' ? '>' : '>='; });
    } else {
      const op = ops[i].min === '>' ? '>=' : '>';
      next[i].minOp = op;
      next.forEach((r, k) => { if (k !== i && sameBound(r.max, ranges[i].min)) r.maxOp = op === '>=' ? '<' : '<='; });
    }
    onChange(next);
  };
  const covered = coveredBy(ranges);
  const activePreset = PRESETS.find((k) => sameRanges(ranges, KPI_RANGE_DEFAULTS[k])) || null;

  return (
    <div className="flex flex-col gap-1.5 w-full text-xs font-medium text-slate-600">
      {/* OLD (a dropdown that always read "Pick a preset…", even after one was picked):
      <label className="w-full">
      Start from a KPI preset
      <Select
      value=""
      onChange={(e) => { if (e.target.value) onChange(deepCopyRanges(KPI_RANGE_DEFAULTS[e.target.value])); }}
      className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
      >
      <option value="">Pick a preset (replaces the rows)…</option>
      {PRESETS.map((k) => <option key={k} value={k}>{k}</option>)}
      </Select>
      </label>
      */}
      {/* OLD (presets as a wrapped row of text buttons — read as loose words, not a control):
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="text-slate-400">Presets</span>
      {PRESETS.map((k) => (
      <button
      key={k}
      type="button"
      onClick={() => onChange(deepCopyRanges(KPI_RANGE_DEFAULTS[k]))}
      title={`Replace the rows with the GIS Engine's ${k} ranges`}
      aria-pressed={k === activePreset}
      className={k === activePreset ? 'font-semibold text-[#EC7D09] underline underline-offset-2' : 'text-slate-500 hover:text-[#EC7D09]'}
      >
      {k}
      </button>
      ))}
      </div>
      */}
      {/* Label + preset on one row. The preset shows which one the rows still match, else "Custom". */}
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <Select
          value={activePreset || 'custom'}
          onChange={(e) => { if (KPI_RANGE_DEFAULTS[e.target.value]) onChange(deepCopyRanges(KPI_RANGE_DEFAULTS[e.target.value])); }}
          className="w-36 px-2.5 py-1 rounded-lg border border-slate-200 text-xs"
          aria-label="Range preset"
        >
          <option value="custom">{ranges.length ? 'Custom' : 'Pick a preset'}</option>
          {PRESETS.map((k) => <option key={k} value={k}>{k}</option>)}
        </Select>
      </div>

      {ranges.length > 0 && (
        // OLD header: <span>Min (≥)</span><span>Max (≤)</span> on grid-cols-[1fr_1fr_24px_1.4fr_16px]
        <div className={`grid ${ROW_COLS} gap-1 items-center text-ui-micro text-slate-400`}>
          <span /><span>Min</span><span /><span>Max</span><span />
          <span>Label</span><span />
        </div>
      )}
      {ranges.map((r, i) => (
        // Rows have no id and are edited in place; the index is the row's identity.
        // OLD: className="grid grid-cols-[1fr_1fr_24px_1.4fr_16px] gap-1 items-center", no signs
        <div
          key={i}
          className={`grid ${ROW_COLS} gap-1 items-center ${covered[i] !== null ? 'opacity-50' : ''}`}
          title={covered[i] !== null ? `Never used: row ${covered[i] + 1} above already covers ${r.min || 'no min'} – ${r.max || 'no max'}` : undefined}
        >
          {/* OLD: <span className="text-center text-slate-400" title={signs[i].min === '>' ? `${r.min} itself goes to an earlier row` : undefined}>{signs[i].min}</span> */}
          {/* OLD (click-to-flip sign):
          {ops[i].min ? (
          <button type="button" onClick={() => flip(i, 'min')} title={`${r.min} ${ops[i].min.length === 2 ? 'is' : 'is not'} in this row. Click to switch`} className="text-center text-slate-500 hover:text-[#EC7D09] font-semibold">{SIGN[ops[i].min]}</button>
          ) : <span />}
          */}
          {ops[i].min ? (
            <Select value={ops[i].min} onChange={(e) => { if (e.target.value !== ops[i].min) flip(i, 'min'); }} className={signCls} aria-label={`Range ${i + 1} min operator`} displayValue={SIGN[ops[i].min]} panelMinWidth={170}>
              {/* OLD: <option value=">=">≥</option><option value=">">&gt;</option> (list as wide as the 40px box — the sign was cut off) */}
              <option value=">=">≥  at least (includes it)</option><option value=">">&gt;  more than</option>
            </Select>
          ) : <span />}
          <input type="number" step="any" value={r.min ?? ''} placeholder="no min" onChange={(e) => update(i, { min: e.target.value })} className={inputCls} aria-label={`Range ${i + 1} minimum`} />
          {/* OLD: <span className="text-center text-slate-400" title={signs[i].max === '<' ? `${r.max} itself goes to an earlier row` : undefined}>{signs[i].max}</span> */}
          {/* OLD (click-to-flip sign):
          {ops[i].max ? (
          <button type="button" onClick={() => flip(i, 'max')} title={`${r.max} ${ops[i].max.length === 2 ? 'is' : 'is not'} in this row. Click to switch`} className="text-center text-slate-500 hover:text-[#EC7D09] font-semibold">{SIGN[ops[i].max]}</button>
          ) : <span />}
          */}
          {ops[i].max ? (
            <Select value={ops[i].max} onChange={(e) => { if (e.target.value !== ops[i].max) flip(i, 'max'); }} className={signCls} aria-label={`Range ${i + 1} max operator`} displayValue={SIGN[ops[i].max]} panelMinWidth={170}>
              {/* OLD: <option value="<=">≤</option><option value="<">&lt;</option> (list as wide as the 40px box — the sign was cut off) */}
              <option value="<=">≤  up to (includes it)</option><option value="<">&lt;  less than</option>
            </Select>
          ) : <span />}
          <input type="number" step="any" value={r.max ?? ''} placeholder="no max" onChange={(e) => update(i, { max: e.target.value })} className={inputCls} aria-label={`Range ${i + 1} maximum`} />
          <ColorPicker value={r.color || '#888888'} onChange={(color) => update(i, { color })} />
          <input type="text" value={r.label ?? ''} placeholder="optional" onChange={(e) => update(i, { label: e.target.value })} className={inputCls} aria-label={`Range ${i + 1} label`} />
          <button type="button" onClick={() => remove(i)} title="Remove range" className="text-slate-400 hover:text-red-500"><X size={12} /></button>
        </div>
      ))}

      <button type="button" onClick={add} className="self-start flex items-center gap-1 text-[#EC7D09] font-semibold">
        <Plus size={12} /> Add range
      </button>
      {/* OLD note (too long for the panel):
      <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-ui-micro font-normal leading-snug text-slate-500">
      A value takes the first row it fits (Min ≤ value ≤ Max), from the top. Blank Min / Max = no limit. No matching row = grey. No rows = automatic steps.
      </p>
      */}
    </div>
  );
}
