import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import FieldHintMark from '../FieldHintMark';

// Threshold-rule conditional formatting for the TABLE widget — same shape as Power BI's
// "Background color by rule" / Superset's per-column conditional formatting: pick a column,
// stack ordered {operator, value, color} rules, first match wins, cell gets that color applied
// either as background or as the value's text color (`entry.mode`, Power BI offers this exact
// same choice per rule set). `value` is `mapping.style.cellFormatRules`: an array of one entry
// per column that has rules — `[{ column, mode: 'background'|'text', rules: [{ operator,
// value, color }] }]`. Kept as a
// standalone component (not a WidgetStyleFields field type) since it needs the datasource's
// `columns` list for the column picker, which the generic style-field renderer never
// receives — only ChartLibrary.jsx's Data tab (MappingFields) gets `columns` today. Reuses
// WidgetStyleFields.jsx's own `.dbe-style-*` classes (same `<details>` section chrome, row/
// input styling, dark-mode rules) instead of a separately-styled box, so it reads as one more
// section of that same Style panel rather than a visually distinct control — see the "make
// UI consistent" feedback this was built in response to.
const OPERATORS = [
  { value: '<', label: '<' },
  { value: '<=', label: '≤' },
  { value: '>', label: '>' },
  { value: '>=', label: '≥' },
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
];
const DEFAULT_COLORS = ['#EF4444', '#F59E0B', '#22C55E'];

export default function ConditionalFormatRules({ columns = [], value = [], onChange }) {
  const addColumnRule = () => {
    const used = new Set(value.map((v) => v.column));
    const next = columns.find((c) => !used.has(c.column_name));
    if (!next) return;
    onChange([...value, { column: next.column_name, mode: 'background', rules: [{ operator: '<', value: 0, color: DEFAULT_COLORS[0] }] }]);
  };

  const updateEntry = (i, patch) => onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const removeEntry = (i) => onChange(value.filter((_, idx) => idx !== i));

  const addRule = (i) => {
    const entry = value[i];
    const color = DEFAULT_COLORS[entry.rules.length % DEFAULT_COLORS.length];
    updateEntry(i, { rules: [...entry.rules, { operator: '<', value: 0, color }] });
  };
  const updateRule = (i, ri, patch) => {
    const entry = value[i];
    updateEntry(i, { rules: entry.rules.map((r, idx) => (idx === ri ? { ...r, ...patch } : r)) });
  };
  const removeRule = (i, ri) => {
    const entry = value[i];
    updateEntry(i, { rules: entry.rules.filter((_, idx) => idx !== ri) });
  };

  const usedColumns = new Set(value.map((v) => v.column));
  const canAddColumn = columns.some((c) => !usedColumns.has(c.column_name));

  return (
    // WidgetStyleFields.jsx's own `.dbe-style-subsection + .dbe-style-subsection` CSS rule
    // never applies to this section — it's rendered as ChartLibrary.jsx's sibling of
    // WidgetStyleFields' *wrapping* `.dbe-style-fields` div, not a direct sibling of that
    // div's own last subsection, so the adjacent-sibling selector never matches. `mt-1`
    // reproduces that same 4px gap explicitly instead.
    <details className="dbe-style-subsection mt-2" open>
      <summary>
        Conditional Formatting
        <FieldHintMark hint="Overrides Band color / row banding on any cell a rule matches." />
        {canAddColumn && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); addColumnRule(); }}
            className="ml-auto flex items-center gap-1 text-[#EC7D09] normal-case tracking-normal font-semibold"
          >
            <Plus size={12} /> Column
          </button>
        )}
      </summary>
      <div className="dbe-style-subsection-body">
        {!value.length && (
          <div className="text-xs text-slate-400 dark:text-slate-500 px-1">Color table cells by value — e.g. red under 50%, green above 80%.</div>
        )}
        {value.map((entry, i) => (
          <div key={entry.column} className="dbe-cfr-entry">
            <div className="dbe-cfr-entry-header">
              <select value={entry.column} onChange={(e) => updateEntry(i, { column: e.target.value })}>
                {columns.map((c) => (
                  <option key={c.column_name} value={c.column_name} disabled={usedColumns.has(c.column_name) && c.column_name !== entry.column}>
                    {c.display_name || c.column_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeEntry(i); }}
                className="dbe-cfr-icon-btn"
                title="Remove this column's rules"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="dbe-cfr-mode">
              {[{ value: 'background', label: 'Background' }, { value: 'text', label: 'Text color' }].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateEntry(i, { mode: opt.value })}
                  className={(entry.mode || 'background') === opt.value ? 'active' : ''}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {entry.rules.map((rule, ri) => (
              <div key={ri} className="dbe-cfr-rule">
                <select value={rule.operator} onChange={(e) => updateRule(i, ri, { operator: e.target.value })} className="dbe-cfr-op">
                  {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                <input
                  type="number"
                  value={rule.value}
                  onChange={(e) => updateRule(i, ri, { value: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="dbe-style-text-input dbe-cfr-value"
                />
                <span className="dbe-cfr-swatch" style={{ background: rule.color }}>
                  <input type="color" value={rule.color} onChange={(e) => updateRule(i, ri, { color: e.target.value })} />
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeRule(i, ri); }}
                  className="dbe-cfr-icon-btn"
                  title="Remove rule"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addRule(i)} className="dbe-cfr-add-rule">+ Add rule</button>
          </div>
        ))}
      </div>
      <style>{`
        /* Each rule set reads as its own nested card (white/dark, rounded, bordered) within
           the section's own card — same "grouped settings card" language WidgetStyleFields.jsx
           moved to, one level deeper. */
        .dbe-cfr-entry { display:flex; flex-direction:column; gap:8px; padding:10px; border-radius:10px; background:rgb(248 250 252); border:1px solid rgb(226 232 240); }
        [data-theme="dark"] .dbe-cfr-entry { background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.08); }
        .dbe-cfr-entry-header { display:flex; align-items:center; gap:6px; }
        .dbe-cfr-entry-header select { flex:1; min-width:0; font-size:11px; padding:6px 8px; border:1px solid rgb(226 232 240); border-radius:8px; background:#fff; color:#1e293b; }
        [data-theme="dark"] .dbe-cfr-entry-header select { background:#111527; border-color:rgba(255,255,255,0.1); color:#f1f5f9; }
        .dbe-cfr-mode { display:flex; gap:2px; padding:2px; background:rgb(226 232 240); border-radius:8px; }
        [data-theme="dark"] .dbe-cfr-mode { background:rgba(255,255,255,0.08); }
        .dbe-cfr-mode button { flex:1; padding:5px 0; font-size:10px; font-weight:500; color:#64748b; background:transparent; border:none; border-radius:6px; cursor:pointer; text-align:center; transition:background .12s, color .12s; }
        [data-theme="dark"] .dbe-cfr-mode button { color:#94a3b8; }
        .dbe-cfr-mode button.active { background:#fff; color:#0f172a; font-weight:700; box-shadow:0 1px 2px rgba(15,23,42,0.1); }
        /* Orange accent, not a slate shade — same fix as WidgetStyleFields.jsx's own
           .dbe-style-segmented: a dark-on-dark active pill read as barely-there in dark mode. */
        [data-theme="dark"] .dbe-cfr-mode button.active { background:#EC7D09; color:#fff; box-shadow:none; }
        .dbe-cfr-rule { display:flex; align-items:center; gap:6px; }
        .dbe-cfr-op { width:44px; flex-shrink:0; font-size:11px; padding:6px 4px; border:1px solid rgb(226 232 240); border-radius:8px; background:#fff; color:#1e293b; text-align:center; }
        [data-theme="dark"] .dbe-cfr-op { background:#111527; border-color:rgba(255,255,255,0.1); color:#f1f5f9; }
        .dbe-cfr-value { flex:1; min-width:0; }
        /* Self-contained (not shared with WidgetStyleFields.jsx's .dbe-style-color-swatch) so
           its absolutely-positioned <input type="color"> can never bleed past its own round
           box into the delete button sitting right next to it. Circular, not rounded-square —
           reads as a color "chip" the way the reference mockup's rule rows show it. */
        .dbe-cfr-swatch { position:relative; width:28px; height:28px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 0 1px rgb(226 232 240); flex-shrink:0; overflow:hidden; cursor:pointer; }
        [data-theme="dark"] .dbe-cfr-swatch { border-color:#1e2438; box-shadow:0 0 0 1px rgba(255,255,255,0.12); }
        .dbe-cfr-swatch input[type="color"] { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; padding:0; border:none; }
        .dbe-cfr-icon-btn {
          position:relative; z-index:1; color:#94a3b8; flex-shrink:0;
          width:24px; height:24px; display:flex; align-items:center; justify-content:center;
          background:transparent; border:none; border-radius:6px; cursor:pointer; transition:background .12s, color .12s;
        }
        .dbe-cfr-icon-btn:hover { color:#ef4444; background:rgba(239,68,68,0.1); }
        .dbe-cfr-add-rule { align-self:flex-start; font-size:11px; font-weight:600; color:#EC7D09; }
        .dbe-cfr-add-rule:hover { opacity:0.8; }
      `}</style>
    </details>
  );
}
