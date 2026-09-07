import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/resolveTimeRange';
import PaletteEditor from '../themes/PaletteEditor';

// One accent per drill-down depth (cycles if a hierarchy ever goes deeper than 5 levels) —
// purely a visual "which ring is this" cue in the orderedColumns editor below, distinct from
// this app's red/emerald delta up/down convention so it never reads as a status color.
const LEVEL_RING_COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#14B8A6', '#EC4899'];

/**
 * Renders a chart_type's mapping controls, driven entirely by its field-descriptor array
 * (see CHART_TYPE_FIELDS in ChartLibrary.jsx) — same pattern as WidgetStyleFields.jsx's
 * generic style-field renderer, applied to mapping fields instead. `value` is the
 * in-progress mapping object (keyed by field.key); `onChange(key, val)` updates one field.
 */
// `styleValue`/`onStyleChange` — a second, parallel value/setter pair for the one field type
// ('palette') that actually belongs to mapping.style, not the mapping object every other field
// here reads/writes. Kept separate rather than writing style keys into `value` alongside real
// mapping keys — mapping and style are two different persisted objects (see ChartLibrary.jsx's
// own mapping/mapping.style split), and blurring that here would make `value` no longer equal
// to what actually gets saved as the widget's own mapping.
export default function MappingFields({ fields = [], value = {}, onChange, columns = [], columnsLoading = false, styleValue = {}, onStyleChange }) {
  // Collapse state per group (keyed by field.key) — groups start expanded (matches every
  // group having something worth configuring the moment a chart_type is picked), a user can
  // fold away one they've already finished (e.g. X Axis) to focus on the one they're still
  // working on, same "focus what's active" reasoning as the Data/Style/Charts tab strip above
  // this in ChartLibrary.jsx. Local to this render tree, not part of `value` — purely a view
  // preference, never persisted into the saved mapping.
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (key) => setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  // "Required" here means "this deliberately shapes the query/chart" — broader than just
  // ChartLibrary.jsx's `canSave` (which only blocks Save on an unfilled column/multiColumn
  // picker with no default at all). A `select` with a `default` (e.g. Aggregation, Date
  // format) still silently picks a real behavior the moment it's left untouched — that's a
  // real, consequential choice, not a no-op, so it earns the same "*" as a field with no
  // fallback. `field.optional: true` is the one deliberate opt-out: a field whose blank/unset
  // state is itself a legitimate "do nothing" (e.g. Truncate Y Axis unchecked = no truncation,
  // an axis title left blank = fall back to the column name) rather than a defaulted choice.
  const isRequiredField = (field) => !field.optional;
  const FieldLabel = ({ field }) => (
    <>{field.label}{isRequiredField(field) && <span className="text-red-500"> *</span>}</>
  );
  // Extracted so a 'group' field (below) can render its own nested fields through the exact
  // same per-type logic, instead of duplicating it — a group is just a labeled box around a
  // sub-list of ordinary fields, not a distinct rendering path.
  // `groupChild` — true when called from the 'group' case below, so a field can stretch to
  // fill its grid cell (`w-full`) instead of the fixed w-48/w-32 it uses standalone, where a
  // narrower fixed width keeps unrelated top-level fields from spanning the whole panel.
  const renderField = (field, groupChild = false) => {
        // A conditionally-relevant field (e.g. LATEST_BY_FIELD, only meaningful once
        // aggregation === 'LATEST' — see ChartLibrary.jsx) — hidden until its own condition
        // is met, rather than always showing and just disabling it, so the form doesn't grow
        // fields most chart configs will never touch. ChartLibrary.jsx's own canSave applies
        // this exact same check, so a hidden field never blocks Save either.
        if (field.showIf && !field.showIf(value)) return null;
        const current = value?.[field.key];
        if (field.type === 'group') {
          // Everything related to one concern sits together — e.g. a column picker and its
          // title override, or Compare-to and its own date/delta-format fields — rendered as
          // one visual block (matching how Superset groups "X Axis" / "Y Axis" as their own
          // sections), instead of a related field landing wherever it happens to fall in the
          // flat field list.
          const visibleSubFields = field.fields.filter((f) => !f.showIf || f.showIf(value));
          // A group whose every child is conditionally hidden (e.g. "Date Filter" once
          // aggregation === 'LATEST' clears both its own fields) would otherwise render as a
          // bare labeled box with nothing inside it — skip the whole group instead.
          if (!visibleSubFields.length) return null;
          const isCollapsed = !!collapsedGroups[field.key];
          return (
            <div key={field.key} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white w-full">
              <button
                type="button"
                onClick={() => toggleGroup(field.key)}
                className="flex items-center justify-between text-xs font-semibold text-[#EC7D09] uppercase tracking-wide"
              >
                {field.label}
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              {/* Stacked one-per-row, full width — every sub-field gets its own line at full
                  panel width instead of packed two-to-a-row, matching the target layout: each
                  control reads clearly on its own rather than competing for a half-width cell. */}
              {!isCollapsed && (
                <div className="flex flex-col gap-2">
                  {visibleSubFields.map((f) => renderField(f, true))}
                </div>
              )}
            </div>
          );
        }
        if (field.type === 'column') {
          // `field.role` ('dimension' | 'measure' | 'date', set per-field in
          // CHART_TYPE_FIELDS) restricts the dropdown to columns actually flagged that way on
          // the datasource (is_dimension/is_measure — see DatasourceManager.jsx, the same
          // convention queryRoles.js documents — or, for 'date', an actual date/timestamp
          // data_type). Without this, e.g. SCATTER's "X (measure)" field would happily accept
          // a text dimension column — `Number("region")` is NaN, which renderChartWidget's
          // SCATTER case falls back to 0 for, collapsing every point onto x=0. Fields with no
          // `role` (e.g. TABLE's plain column picker) show every column, unchanged from before.
          const options = field.role === 'measure' ? columns.filter((c) => c.is_measure)
            : field.role === 'dimension' ? columns.filter((c) => c.is_dimension)
            : field.role === 'date' ? columns.filter((c) => /date|time|timestamp/i.test(c.data_type || ''))
            : columns;
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-48'}`}>
              <FieldLabel field={field} />
              <select
                value={current || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={!options.length}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              >
                <option value="">{columnsLoading ? 'Loading…' : options.length ? 'Select column' : 'No matching columns'}</option>
                {options.map((c) => (
                  <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>
                ))}
              </select>
            </label>
          );
        }
        if (field.type === 'palette') {
          // Reads/writes `styleValue`/`onStyleChange`, not `value`/`onChange` — see this
          // component's own doc comment on why a style-tree field can't just be another key on
          // the mapping object every other field type here belongs to.
          return (
            <div key={field.key} className="flex flex-col gap-1.5 w-full">
              <div className="text-xs font-medium text-slate-600">{field.label}</div>
              <PaletteEditor value={styleValue?.[field.key] || []} onChange={(next) => onStyleChange?.(field.key, next)} />
            </div>
          );
        }
        if (field.type === 'text') {
          // A free-form label override (e.g. a custom axis title) — falls back to whatever
          // the chart would otherwise derive on its own (the column name) when left blank,
          // so this is purely optional, never a required rename.
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-48'}`}>
              <FieldLabel field={field} />
              <input
                type="text"
                value={current || ''}
                placeholder={field.placeholder || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </label>
          );
        }
        if (field.type === 'select') {
          // `field.options` may be a plain array or a `(mapping) => array` function — the
          // latter for options whose validity depends on another field's current value (e.g.
          // compare_to's window-shifting presets only make sense when there's an actual
          // window to shift, which LATEST intentionally has none of — see its own options fn
          // in ChartLibrary.jsx). Falls back to 'None' if the currently-saved value isn't in
          // the now-narrowed list (e.g. switching to LATEST after "Previous period" was
          // already picked), so the select never silently keeps a now-meaningless value
          // selected/hidden from view.
          // Each entry is either a plain string (value === displayed label, the common case)
          // or a `{ value, label }` pair — the latter lets a field show a richer label (e.g.
          // a live-rendered preview like "MMM DD | May 18") while the stored mapping value
          // stays the plain preset key (see X_AXIS_DATE_FORMAT_FIELD in ChartLibrary.jsx).
          const rawOptions = typeof field.options === 'function' ? field.options(value) : field.options;
          const options = rawOptions.map((opt) => (typeof opt === 'object' ? opt : { value: opt, label: opt }));
          const selected = options.some((opt) => opt.value === current) ? current : field.default;
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-32'}`}>
              <FieldLabel field={field} />
              <select
                value={selected}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              >
                {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {/* A short caption under the field (e.g. "Default: Africa/Blantyre") instead of
                  baking that into the label itself — a long label wraps awkwardly onto two
                  lines inside a grid cell and misaligns against the field beside it. */}
              {field.hint && <span className="block mt-1 text-[10px] font-normal text-slate-400">{field.hint}</span>}
            </label>
          );
        }
        if (field.type === 'checkbox') {
          // Groups render one field per row now (see the 'group' case above), not packed
          // two-to-a-row — so a checkbox no longer needs to fake a label-height spacer to
          // line up against a sibling field's baseline; it can just sit at its own natural
          // height like every other stacked row.
          return (
            <div key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-32'}`}>
              <label className="flex items-center gap-1.5 h-[30px]">
                <input type="checkbox" checked={!!current} onChange={(e) => onChange(field.key, e.target.checked)} />
                <FieldLabel field={field} />
              </label>
            </div>
          );
        }
        if (field.type === 'number') {
          // Blank means "unset" (no bound) — distinct from 0, which is a real value an axis
          // bound genuinely might need (e.g. Min: 0 to pin the baseline).
          // `field.warnIf(mapping)` (e.g. Y_AXIS_MAX_FIELD's own "Min must be less than Max" —
          // see ChartLibrary.jsx) surfaces *why* a value silently has no effect: the chart
          // components themselves (resolveTruncatedBounds in axisTypeUtils.js) already drop
          // an invalid min>max pair back to Auto rather than passing it to ECharts, but that
          // fallback is invisible without this — a truncation bound that "does nothing" reads
          // as a bug, not as a validation failure, unless the reason is shown right here.
          const warning = field.warnIf?.(value);
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-32'}`}>
              <FieldLabel field={field} />
              <input
                type="number"
                value={current === undefined || current === null ? '' : current}
                placeholder={field.placeholder || 'auto'}
                onChange={(e) => onChange(field.key, e.target.value === '' ? undefined : Number(e.target.value))}
                className={`mt-1 w-full px-2.5 py-1.5 rounded-lg border text-xs ${warning ? 'border-amber-400' : 'border-slate-200'}`}
              />
              {warning && <span className="block mt-1 text-[10px] font-normal text-amber-600">{warning}</span>}
            </label>
          );
        }
        if (field.type === 'numberUnit') {
          // A number + unit select rendered as one combined control (e.g. "Tick every [47]
          // [hours ▾]") instead of two separately-labeled fields that happen to sit next to
          // each other — reads as a single concept with one label, not two unrelated ones.
          // Writes to two mapping keys (field.key for the number, field.unitKey for the unit)
          // since the stored mapping is still a flat key/value bag; only the rendering merges
          // them into one control.
          const currentUnit = value?.[field.unitKey] ?? field.unitDefault;
          // Per-unit ceiling (field.unitMax, e.g. hours -> 23) — past that point the value is
          // really "the next unit up" (24 hours is 1 day), not a bigger custom interval, so it
          // gets clamped rather than accepted as-is. Applied on every change (typing past the
          // input's own `max` attribute isn't blocked by the browser, only the spinner arrows
          // respect it), not just as a visual `max` hint.
          const maxForUnit = field.unitMax?.[currentUnit];
          const commitValue = (raw) => {
            if (raw === '') return onChange(field.key, undefined);
            const n = Number(raw);
            onChange(field.key, maxForUnit != null ? Math.min(n, maxForUnit) : n);
          };
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-48'}`}>
              <FieldLabel field={field} />
              <div className="mt-1 flex gap-1.5">
                <input
                  type="number"
                  min={field.min ?? 1}
                  max={maxForUnit}
                  value={current === undefined || current === null ? '' : current}
                  placeholder={field.placeholder || 'Auto'}
                  onChange={(e) => commitValue(e.target.value)}
                  className="w-1/2 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                />
                <select
                  value={currentUnit}
                  onChange={(e) => {
                    onChange(field.unitKey, e.target.value);
                    // Re-clamp the existing number against the *new* unit's own ceiling — e.g.
                    // "40" typed while on "hours" (clamped to 23) should re-clamp to 6 on
                    // switching to "days", not silently keep showing a since-invalid 23.
                    const newMax = field.unitMax?.[e.target.value];
                    if (current != null && newMax != null && current > newMax) onChange(field.key, newMax);
                  }}
                  className="w-1/2 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                >
                  {field.unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {field.hint && <span className="block mt-1 text-[10px] font-normal text-slate-400">{field.hint}</span>}
            </label>
          );
        }
        if (field.type === 'dateInput') {
          // A plain fixed date+time — e.g. "Compare to: Custom"'s cutoff (see
          // buildCustomComparisonFilters in resolveTimeRange.js). Unlike every relative filter
          // elsewhere in this app, this is a literal value the user picks once, not a tagged
          // spec re-resolved at query time — there's no "custom date" equivalent of "7 days
          // ago" to stay live across reloads, the whole point is a fixed comparison point.
          // datetime-local (not a bare date) so an hour/minute-level comparison is possible
          // when the underlying column has that precision — same toDateTimeLocalInput/
          // fromDateTimeLocalInput round-trip FilterEditorModal.jsx's own fixed-endpoint
          // inputs already use, keeping the stored value in the backend's own
          // 'YYYY-MM-DD HH:MM:SS' shape, not the native input's 'YYYY-MM-DDTHH:mm'.
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-48'}`}>
              <FieldLabel field={field} />
              <input
                type="datetime-local"
                value={toDateTimeLocalInput(current)}
                onChange={(e) => onChange(field.key, fromDateTimeLocalInput(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </label>
          );
        }
        if (field.type === 'orderedColumns') {
          // Drill-down hierarchy — an ordered list of dimension columns to walk through
          // beneath the chart's primary dimension (x_axis/Category), one level per click
          // (see DashboardCanvasEditor.jsx's drill-in/drill-up handling). Saved as
          // mapping.drill_down: string[], in the order a user drills through them — the
          // backend is expected to read this the same way it already reads x_axis/y_axis
          // (see getWidgetData's own doc comment: "mapping.drill_down for the column
          // hierarchy"). Order matters and is only ever changed here, never re-sorted.
          const levels = current || [];
          const excluded = new Set([value?.x_axis, ...levels].filter(Boolean));
          // Dimension-only, same reasoning as the 'column' field's `role` filter above —
          // drilling into a measure column isn't meaningful.
          const availableCols = columns.filter((c) => c.is_dimension && !excluded.has(c.column_name));
          const move = (i, dir) => {
            const next = [...levels];
            const j = i + dir;
            if (j < 0 || j >= next.length) return;
            [next[i], next[j]] = [next[j], next[i]];
            onChange(field.key, next);
          };
          const removeAt = (i) => onChange(field.key, levels.filter((_, idx) => idx !== i));
          const addLevel = (colName) => { if (colName) onChange(field.key, [...levels, colName]); };
          return (
            <div key={field.key} className="flex flex-col gap-1.5 w-full">
              {field.label && <div className="text-xs font-medium text-slate-600"><FieldLabel field={field} /></div>}
              {levels.length === 0 && (
                <div className="text-xs text-slate-400">No drill-down levels — this chart won't be drillable.</div>
              )}
              {levels.length > 0 && (
                // Progressively indented + connected by a vertical rail, one ring color per
                // depth — makes the "level 2 only exists inside whichever level 1 you clicked"
                // nesting relationship visible at config time, the same concentric-circle
                // relationship the runtime breadcrumb (DrillBreadcrumb, ChartLibraryWidgetView)
                // walks through one click at a time. Reordering/removing here only changes the
                // hierarchy's own definition — never touches an already-drilled dashboard
                // widget's current position in it.
                <div className="flex flex-col">
                  {levels.map((colName, i) => {
                    const col = columns.find((c) => c.column_name === colName);
                    const ring = LEVEL_RING_COLORS[i % LEVEL_RING_COLORS.length];
                    return (
                      <div key={colName} className="flex items-stretch">
                        {/* Rail + ring column — one segment per level, indented to the right
                            so each level visibly nests inside the one above it. */}
                        <div className="flex flex-col items-center shrink-0" style={{ width: 22 + i * 16, marginLeft: i > 0 ? -6 : 0 }}>
                          {i > 0 && <div className="w-px flex-1 bg-slate-200" style={{ minHeight: 6 }} />}
                          <div
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0"
                            style={{ borderColor: ring, color: ring, background: `${ring}1a` }}
                          >
                            {i + 1}
                          </div>
                          {i < levels.length - 1 && <div className="w-px flex-1 bg-slate-200" style={{ minHeight: 6 }} />}
                        </div>
                        <div className="flex-1 flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mb-1.5 ml-1">
                          <span className="flex-1 text-slate-700 font-medium">{col?.display_name || colName}</span>
                          <span className="text-[10px] text-slate-400">{i === 0 ? 'top level' : `within ${levels[i - 1]}`}</span>
                          <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-30 text-slate-500 hover:text-slate-700">↑</button>
                          <button type="button" disabled={i === levels.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-30 text-slate-500 hover:text-slate-700">↓</button>
                          <button type="button" onClick={() => removeAt(i)} className="text-red-500 hover:opacity-80">×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <select
                value=""
                onChange={(e) => addLevel(e.target.value)}
                disabled={!availableCols.length}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500"
              >
                <option value="">{availableCols.length ? '+ Add drill-down level…' : 'No more columns to add'}</option>
                {availableCols.map((c) => (
                  <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>
                ))}
              </select>
            </div>
          );
        }
        if (field.type === 'multiColumn') {
          const selected = current || [];
          const toggle = (colName) => {
            onChange(field.key, selected.includes(colName) ? selected.filter((c) => c !== colName) : [...selected, colName]);
          };
          const allSelected = columns.length > 0 && selected.length === columns.length;
          return (
            <div key={field.key} className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-600"><FieldLabel field={field} /></div>
                {columns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange(field.key, allSelected ? [] : columns.map((c) => c.column_name))}
                    className="text-xs font-medium text-[#EC7D09] hover:opacity-80"
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              {!columns.length && (
                <div className="text-xs text-slate-400">{columnsLoading ? 'Loading…' : 'Select a datasource first.'}</div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {columns.map((c) => (
                  <label key={c.column_name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" checked={selected.includes(c.column_name)} onChange={() => toggle(c.column_name)} />
                    {c.display_name || c.column_name}
                  </label>
                ))}
              </div>
            </div>
          );
        }
        return null;
  };

  return (
    <div className="flex flex-wrap gap-4 items-start">
      {fields.map((field) => renderField(field))}
    </div>
  );
}
