import React, { useEffect, useState } from 'react';
import Button from '../../Button';

// Auto-groups a field into one of four collapsible sections purely from its own
// key/type shape — no per-field `group` metadata needed on every styleFields entry across
// widgetTypeRegistry.js (which would've meant touching every existing field descriptor).
// Cross-filter toggles get their own section (checked first, before the generic Layout &
// Behavior catch-all, since they'd otherwise match no other rule and fall through to it
// anyway); colors always go together; *Weight/*Size/*Position text fields go together;
// everything else (row-count limits, donut/legend/value-label toggles) is "layout & behavior."
function groupFor(field) {
  if (field.key === 'crossFilterSource' || field.key === 'crossFilterTarget') return 'Cross-Filtering';
  if (field.type === 'color') return 'Colors & Branding';
  if (/Weight$|Size$|Position$/.test(field.key)) return 'Text Styling';
  return 'Layout & Behavior';
}
// Cross-Filtering leads — it's the "what does this widget do" decision, worth seeing before
// both the other behavior toggles and the purely cosmetic groups.
const GROUP_ORDER = ['Cross-Filtering', 'Layout & Behavior', 'Colors & Branding', 'Text Styling'];

const isShowHide = (field) => field.type === 'select' && field.options?.length === 2
  && field.options.every((o) => ['show', 'hide'].includes(String(o.value).toLowerCase()));

function ColorRow({ field, current, resolvedDefaults, onChange }) {
  const swatchValue = current || resolvedDefaults[field.key] || '#000000';
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <div className="dbe-style-color-input">
        <input type="color" value={swatchValue} onChange={(e) => onChange(field.key, e.target.value)} />
        <input
          type="text"
          value={current || ''}
          placeholder={resolvedDefaults[field.key] || 'auto'}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </div>
    </div>
  );
}

function SliderRow({ field, current, resolvedDefaults = {}, onChange }) {
  // Sensible defaults for fields with no declared min/max (e.g. valueTextSize/axisTextSize,
  // whose real per-widget fallback varies too much to hardcode a single schema default).
  const isSizeField = /Size$/.test(field.key);
  const min = field.min ?? (isSizeField ? 8 : 1);
  const max = field.max ?? (isSizeField ? 48 : 50);
  // Never show the literal word "auto" — always a real number, so the slider's own handle
  // position and its pill always agree, and dragging from here always starts from (and
  // applies) a real value instead of a placeholder. Prefers the field's actual currently-
  // resolved value (resolvedDefaults, when the caller supplied one) over the schema default
  // or an arbitrary midpoint.
  const fallback = resolvedDefaults[field.key] ?? field.default ?? Math.round((min + max) / 2);
  const numeric = current === '' || current == null ? fallback : Number(current);
  return (
    <div className="dbe-style-row">
      <div className="dbe-style-row-label-line">
        <span className="dbe-style-row-label">{field.label}</span>
        <span className="dbe-style-value-pill">{numeric}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={numeric}
        onChange={(e) => onChange(field.key, Number(e.target.value))}
      />
    </div>
  );
}

function SwitchRow({ field, current, onChange }) {
  const onValue = field.options.find((o) => String(o.value).toLowerCase() === 'show')?.value ?? field.options[0].value;
  const offValue = field.options.find((o) => String(o.value).toLowerCase() === 'hide')?.value ?? field.options[1].value;
  const checked = (current || field.default) === onValue;
  return (
    <div className="dbe-style-row dbe-style-row-inline">
      <span className="dbe-style-row-label">{field.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(field.key, checked ? offValue : onValue)}
        className={`dbe-style-switch${checked ? ' on' : ''}`}
      >
        <span className="dbe-style-switch-knob" />
      </button>
    </div>
  );
}

function SegmentedRow({ field, current, onChange }) {
  const active = current || field.default;
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <div className="dbe-style-segmented">
        {field.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(field.key, opt.value)}
            className={active === opt.value ? 'active' : ''}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectRow({ field, current, onChange }) {
  return (
    <label className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <select value={current} onChange={(e) => onChange(field.key, e.target.value)}>
        {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}

// A 3x3 grid of small clickable squares instead of a 9-option dropdown — position is a
// spatial concept, easier to pick visually than to read off a list of "top-center"/"mid-
// right" text labels. `field.options` is already laid out in the same row-major order
// (top-left..top-right, mid-left..mid-right, bottom-left..bottom-right — see
// POSITION_OPTIONS in Widgets/titlePositions.js), so it maps directly onto the grid.
function PositionPickerRow({ field, current, onChange }) {
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <div className="dbe-style-position-grid">
        {(field.options || []).map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            aria-label={opt.label}
            onClick={() => onChange(field.key, opt.value)}
            className={current === opt.value ? 'active' : ''}
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}

function TextRow({ field, current, onChange }) {
  return (
    <label className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <input
        type="text"
        value={current}
        placeholder={field.placeholder || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="dbe-style-text-input"
      />
    </label>
  );
}

function FieldRow({ field, value, resolvedDefaults, onChange }) {
  const raw = value?.[field.key];
  // A field only counts as an explicit override once it holds a real value — an empty
  // string (cleared text input) or undefined (cleared via the × below) both mean "inherit
  // from the dashboard theme/local default," same as never having touched it.
  const isOverridden = raw !== undefined && raw !== null && raw !== '';
  const current = raw ?? field.default ?? '';

  let row = null;
  if (field.type === 'color') row = <ColorRow field={field} current={current} resolvedDefaults={resolvedDefaults} onChange={onChange} />;
  else if (field.type === 'number') row = <SliderRow field={field} current={current} resolvedDefaults={resolvedDefaults} onChange={onChange} />;
  else if (field.type === 'text') row = <TextRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'position') row = <PositionPickerRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'select') {
    if (isShowHide(field)) row = <SwitchRow field={field} current={current} onChange={onChange} />;
    else if (field.options?.length === 2) row = <SegmentedRow field={field} current={current} onChange={onChange} />;
    else row = <SelectRow field={field} current={current} onChange={onChange} />;
  }
  if (!row) return null;

  return (
    <div className={`dbe-style-field-wrap${isOverridden ? '' : ' inherited'}`}>
      {row}
      {isOverridden && (
        <button
          type="button"
          className="dbe-style-field-clear"
          title="Clear override — inherit from theme/default"
          aria-label={`Clear ${field.label} override`}
          onClick={() => onChange(field.key, undefined)}
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Renders the style controls for a selected widget, driven entirely by its type's
 * `styleFields` metadata (see widgetTypeRegistry.js) — one generic renderer instead of
 * hand-written fields per widget type. `value` is the widget's raw `style` object (may be
 * missing keys — falls back to each field's own `default` for display only).
 *
 * Fields are auto-grouped into collapsible "Colors & Branding" / "Text Styling" /
 * "Layout & Behavior" sections (see groupFor above) and rendered with richer controls per
 * type — color swatch+hex, a slider for numbers, a switch for show/hide toggles, a
 * segmented button pair for other 2-option selects, a plain dropdown otherwise.
 *
 * `resolvedDefaults`: optional `{ [fieldKey]: realCurrentColor }` map for `type:'color'`
 * fields whose schema `default` is `null` (titleColor/bgColor/etc. — theme-dependent, so the
 * registry can't hardcode one) — without this an unset field would show a black placeholder
 * instead of the color it's actually currently rendering with.
 *
 * `deferred`: when true, edits are staged locally and only committed via the "Apply changes"
 * button (calls `onApply(fullStyleObject)`); "Reset" reverts to the last-applied `value`.
 * When false (default, unchanged from before this redesign), every edit calls `onChange`
 * immediately — existing callers that don't pass `deferred` see no behavior change.
 *
 * `columns`: opt-in multi-column layout for each group's field rows — default 1 (the
 * original single-column stack, correct for the narrow Dashboard Style popover/per-widget
 * panel this was originally built for). Wide contexts with a lot of horizontal room to spare
 * (ThemeManager.jsx's Settings tab, which has 10+ fields) can pass a higher value instead of
 * leaving most of the panel empty.
 */
export default function WidgetStyleFields({ fields = [], value = {}, onChange, resolvedDefaults = {}, deferred = false, onApply, columns = 1 }) {
  const [pending, setPending] = useState(value);
  useEffect(() => { if (deferred) setPending(value); }, [deferred, value]);

  if (!fields.length) {
    return <div className="dbe-style-empty">No style options for this widget.</div>;
  }

  const activeValue = deferred ? pending : value;
  const handleChange = deferred
    ? (key, val) => setPending((prev) => ({ ...prev, [key]: val }))
    : onChange;

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    fields: fields.filter((f) => groupFor(f) === group),
  })).filter((g) => g.fields.length > 0);

  return (
    <div className="dbe-style-fields">
      {grouped.map(({ group, fields: groupFields }) => (
        <details key={group} className="dbe-style-subsection" open>
          <summary>{group}</summary>
          <div
            className="dbe-style-subsection-body"
            style={columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 24 } : undefined}
          >
            {groupFields.map((field) => (
              <FieldRow key={field.key} field={field} value={activeValue} resolvedDefaults={resolvedDefaults} onChange={handleChange} />
            ))}
          </div>
        </details>
      ))}
      {deferred && (
        <div className="dbe-style-actions">
          <Button variant="secondary" size="sm" fullWidth onClick={() => setPending(value)}>Reset</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => onApply?.(pending)}>Apply changes</Button>
        </div>
      )}
      {/* Kept inline here (not in DashboardCanvasEditor.jsx's own stylesheet) so these
          controls render correctly wherever this component is used, including contexts where
          DashboardCanvasEditor isn't mounted at all — e.g. ChartLibrary.jsx's own Style tab. */}
      <style>{`
        .dbe-style-fields { display:flex; flex-direction:column; gap:4px; }
        .dbe-style-subsection + .dbe-style-subsection { margin-top:4px; }
        .dbe-style-subsection summary {
          cursor:pointer; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.03em;
          color:#64748b; padding:6px 8px; border-radius:6px; background:rgb(241 245 249);
          list-style:none; display:flex; align-items:center; gap:4px;
        }
        [data-theme="dark"] .dbe-style-subsection summary { background:rgba(255,255,255,0.06); color:#94a3b8; }
        .dbe-style-subsection summary:hover { background:rgb(226 232 240); }
        [data-theme="dark"] .dbe-style-subsection summary:hover { background:rgba(255,255,255,0.1); }
        .dbe-style-subsection summary::-webkit-details-marker { display:none; }
        .dbe-style-subsection summary::before { content:'▸'; font-size:9px; transition:transform .1s; }
        .dbe-style-subsection[open] summary::before { transform:rotate(90deg); }
        .dbe-style-subsection-body { display:flex; flex-direction:column; gap:8px; padding:4px 6px 8px; }
        .dbe-style-row { display:flex; flex-direction:column; gap:4px; }
        .dbe-style-row-inline { flex-direction:row; align-items:center; justify-content:space-between; }
        .dbe-style-row-label { font-size:11px; color:#475569; }
        [data-theme="dark"] .dbe-style-row-label { color:#cbd5e1; }
        .dbe-style-row-label-line { display:flex; align-items:center; justify-content:space-between; }
        .dbe-style-value-pill {
          font-size:10px; font-weight:600; color:#EC7D09; background:rgba(236,125,9,0.12);
          border-radius:4px; padding:1px 6px; min-width:24px; text-align:center;
        }
        .dbe-style-row input[type="range"] { width:100%; accent-color:#EC7D09; }
        .dbe-style-color-input { display:flex; align-items:center; gap:6px; }
        .dbe-style-color-input input[type="color"] { width:26px; height:26px; padding:0; border:1px solid rgb(203 213 225); border-radius:6px; cursor:pointer; }
        .dbe-style-color-input input[type="text"] { flex:1; min-width:0; font-size:11px; font-family:monospace; padding:4px 6px; border:1px solid rgb(203 213 225); border-radius:6px; }
        .dbe-style-row select {
          width:100%; font-size:11px; padding:5px 6px; border:1px solid rgb(203 213 225); border-radius:6px; background:#fff;
        }
        .dbe-style-row select:focus {
          outline:none; border-color:#EC7D09; box-shadow:0 0 0 2px rgba(236,125,9,0.25);
        }
        .dbe-style-text-input {
          width:100%; font-size:11px; padding:5px 6px; border:1px solid rgb(203 213 225); border-radius:6px; background:#fff; box-sizing:border-box;
        }
        .dbe-style-segmented { display:flex; border:1px solid rgb(203 213 225); border-radius:6px; overflow:hidden; }
        .dbe-style-segmented button {
          flex:1; padding:5px 0; font-size:11px; font-weight:600; color:#64748b; background:#fff; cursor:pointer;
          text-align:center;
        }
        .dbe-style-segmented button + button { border-left:1px solid rgb(203 213 225); }
        .dbe-style-segmented button.active { background:#EC7D09; color:#fff; }
        .dbe-style-position-grid {
          display:grid; grid-template-columns:repeat(3, 1fr); gap:3px; width:64px;
        }
        .dbe-style-position-grid button {
          width:20px; height:20px; border:1px solid rgb(203 213 225); border-radius:4px;
          background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;
        }
        .dbe-style-position-grid button span { width:6px; height:6px; border-radius:50%; background:rgb(203 213 225); }
        .dbe-style-position-grid button:hover { border-color:#EC7D09; }
        .dbe-style-position-grid button.active { background:#EC7D09; border-color:#EC7D09; }
        .dbe-style-position-grid button.active span { background:#fff; }
        .dbe-style-switch {
          width:34px; height:19px; border-radius:999px; background:rgb(203 213 225); position:relative;
          border:none; cursor:pointer; transition:background .15s; flex-shrink:0;
        }
        .dbe-style-switch.on { background:#EC7D09; }
        .dbe-style-switch-knob {
          position:absolute; top:2px; left:2px; width:15px; height:15px; border-radius:50%; background:#fff;
          transition:transform .15s; box-shadow:0 1px 2px rgba(0,0,0,0.2);
        }
        .dbe-style-switch.on .dbe-style-switch-knob { transform:translateX(15px); }
        /* Reserves a gutter for the × clear button below, on the wrap itself rather than on
           any one row type's own right-aligned content — a value pill (slider), a switch, a
           select, all sit flush against the row's right edge, and every one of them would
           otherwise collide with the button rendered on top of that same corner. Reserved
           unconditionally (not just when the button is actually rendered) so a field doesn't
           visibly reflow every time it's overridden/cleared. */
        .dbe-style-field-wrap { position:relative; padding-right:20px; }
        .dbe-style-field-wrap.inherited { opacity:0.6; }
        .dbe-style-field-clear {
          position:absolute; top:0; right:0; width:16px; height:16px; border-radius:50%;
          border:1px solid rgb(203 213 225); background:#fff; color:#64748b; font-size:11px;
          line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;
        }
        .dbe-style-field-clear:hover { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }
        .dbe-style-actions { display:flex; gap:8px; margin-top:8px; padding-top:8px; border-top:1px solid rgb(226 232 240); }
        .dbe-style-actions > * { flex:1; }
      `}</style>
    </div>
  );
}
