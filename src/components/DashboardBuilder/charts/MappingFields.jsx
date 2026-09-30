import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/resolveTimeRange';
import PaletteEditor from '../themes/PaletteEditor';
import ColumnMultiSelect from '../ColumnMultiSelect';
import FieldHintMark from '../FieldHintMark';
import { ValidateExpressionButton } from './AdvancedSqlFields';

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
export default function MappingFields({ fields = [], value = {}, onChange, columns = [], columnsLoading = false, styleValue = {}, onStyleChange, paletteHeader = null, datasourceId = null }) {
  // `paletteHeader` — optional node rendered above the palette editor (ChartLibrary.jsx passes
  // its Light/Dark switch, since the palette is stored per mode).
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
        // Second arg (`columns`) lets a showIf that needs to know whether the CURRENTLY
        // SELECTED value is a saved metric (Phase A — see ChartLibrary.jsx's IS_SQL_MEASURE)
        // make that call — every existing showIf here only reads its first arg, so this is a
        // no-op for all of them.
        if (field.showIf && !field.showIf(value, columns)) return null;
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
          // Phase B — a measure field ('role' === 'measure') can be an ad-hoc SQL expression
          // instead of a real column: `current` is then `{type:'sql', expression, label}`
          // rather than a plain column-name string, sent through unchanged (no separate
          // mapping shape — see the backend's own "no new mapping shape needed" note). Only
          // measures get this toggle — a dimension/date column picker stays exactly as before,
          // since x_axis/series-shaped ad-hoc SQL isn't part of Phase B.
          const isSql = field.role === 'measure' && current && typeof current === 'object' && current.type === 'sql';
          if (field.role === 'measure') {
            // The column list is never optional/hidden — it's the same required `<select>`
            // for both modes, just reused for a different purpose in each: in Simple mode
            // it's the bound value itself; in Custom SQL mode picking an option INSERTS that
            // column into the expression instead (an on-top-of-the-column addition, matching
            // Superset's own Custom SQL tab, which still shows the underlying column/metric
            // context rather than swapping it away for a disconnected free-text box — see the
            // conversation this was reported in: an earlier version hid the real column select
            // behind a second, separately-built dropdown, losing exactly this).
            const columnSelect = (
              <select
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => {
                  if (!e.target.value) { if (!isSql) onChange(field.key, ''); return; }
                  if (isSql) {
                    const sep = current.expression && !/\s$/.test(current.expression) ? ' ' : '';
                    onChange(field.key, { ...current, expression: `${current.expression || ''}${sep}${e.target.value}` });
                  } else {
                    onChange(field.key, e.target.value);
                  }
                }}
                disabled={!options.length}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              >
                <option value="">
                  {columnsLoading ? 'Loading…' : !options.length ? 'No matching columns' : isSql ? '+ Insert a column into the expression…' : 'Select column'}
                </option>
                {options.map((c) => (
                  <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>
                ))}
              </select>
            );
            return (
              <div key={field.key} className={`flex flex-col gap-1 ${groupChild ? 'w-full' : 'w-48'}`}>
                <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
                  {/* A single span, not the bare FieldLabel fragment — a fragment's "Measure"
                      text node and its "*" span would otherwise become two SEPARATE flex
                      items in this justify-between row (each of a Fragment's children is its
                      own flex item), spreading the "*" away from "Measure" toward the middle
                      of the row instead of sitting right against it like every other field's
                      label does. */}
                  <span><FieldLabel field={field} /></span>
                  <button
                    type="button"
                    className="text-[0.65rem] font-semibold text-[#EC7D09] hover:opacity-80"
                    onClick={() => onChange(field.key, isSql
                      // Seeds from whatever column was already picked (e.g. "attempts" ->
                      // "SUM(attempts)") instead of a blank box — matches Superset's own
                      // Custom SQL tab, which always opens on top of the already-selected
                      // metric/column rather than starting from scratch. Falling back to a
                      // bare SUM(...) with the column left for the user to fill in when
                      // nothing was selected yet, rather than an empty aggregate call.
                      ? ''
                      : { type: 'sql', expression: typeof current === 'string' && current ? `SUM(${current})` : '', label: '' })}
                  >
                    {isSql ? 'Use column' : 'Use custom SQL'}
                  </button>
                </label>
                {columnSelect}
                {isSql && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <textarea
                      value={current.expression || ''}
                      onChange={(e) => onChange(field.key, { ...current, expression: e.target.value })}
                      placeholder="e.g. SUM(col_a)/NULLIF(SUM(col_b),0)"
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={current.label || ''}
                      onChange={(e) => onChange(field.key, { ...current, label: e.target.value })}
                      placeholder="Label for this measure"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    {datasourceId && <ValidateExpressionButton datasourceId={datasourceId} expression={current.expression} />}
                  </div>
                )}
              </div>
            );
          }
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
              {paletteHeader}
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
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild || field.fullWidth ? 'w-full' : 'w-32'}`}>
              <FieldLabel field={field} /><FieldHintMark hint={field.hint} />
              <select
                value={selected}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
              >
                {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
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
              <FieldLabel field={field} /><FieldHintMark hint={field.hint} />
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
          //
          // Level 1 is deliberately NOT stored in this array — it's always whatever column is
          // currently picked for X Axis/Category, derived live and rendered as a pinned,
          // read-only row. Storing it as its own editable entry would create two sources of
          // truth for the same thing (X Axis's own field vs. this list's first item) that can
          // silently drift apart the moment someone changes the X Axis column later without
          // remembering to also update the hierarchy here. `mapping.drill_down` holds only
          // levels 2+, i.e. what a user has explicitly added beneath that top level.
          const topLevelCol = value?.x_axis;
          // Filters out `topLevelCol` from the stored array, not just from what's offered in
          // the "add a level" dropdown below — covers charts saved before this derived-top-
          // level change (when level 1 WAS stored as the array's own first entry) and the case
          // where X Axis gets changed to a column that already exists further down the
          // hierarchy. Without this, that column would render twice: once as the pinned top
          // level, once again inside the list.
          const levels = (current || []).filter((c) => c !== topLevelCol);
          const excluded = new Set([topLevelCol, ...levels].filter(Boolean));
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
          const topCol = columns.find((c) => c.column_name === topLevelCol);
          return (
            <div key={field.key} className="flex flex-col gap-1.5 w-full">
              {field.label && <div className="text-xs font-medium text-slate-600"><FieldLabel field={field} /></div>}
              {!topLevelCol && (
                <div className="text-xs text-slate-400">Pick an X Axis / Category column first — it becomes the top drill-down level.</div>
              )}
              {topLevelCol && (
                // Progressively indented + connected by a vertical rail, one ring color per
                // depth — makes the "level 2 only exists inside whichever level 1 you clicked"
                // nesting relationship visible at config time, the same concentric-circle
                // relationship the runtime breadcrumb (DrillBreadcrumb, ChartLibraryWidgetView)
                // walks through one click at a time. Reordering/removing here only changes the
                // hierarchy's own definition — never touches an already-drilled dashboard
                // widget's current position in it.
                <div className="flex flex-col">
                  {/* Derived top level — same rail/ring visual as every other level, but no
                      reorder/remove controls since it isn't part of `levels` to act on; it
                      follows the X Axis field instead. */}
                  <div className="flex items-stretch">
                    <div className="flex flex-col items-center shrink-0" style={{ width: 22 }}>
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ borderColor: LEVEL_RING_COLORS[0], color: LEVEL_RING_COLORS[0], background: `${LEVEL_RING_COLORS[0]}1a` }}
                      >
                        1
                      </div>
                      {levels.length > 0 && <div className="w-px flex-1 bg-slate-200" style={{ minHeight: 6 }} />}
                    </div>
                    <div className="flex-1 flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mb-1.5 ml-1">
                      <span className="flex-1 text-slate-700 font-medium">{topCol?.display_name || topLevelCol}</span>
                      <span className="text-[10px] text-slate-400">top level · from X Axis</span>
                    </div>
                  </div>
                  {levels.map((colName, i) => {
                    const col = columns.find((c) => c.column_name === colName);
                    const ring = LEVEL_RING_COLORS[(i + 1) % LEVEL_RING_COLORS.length];
                    const prevLabel = i === 0 ? (topCol?.display_name || topLevelCol) : (columns.find((c) => c.column_name === levels[i - 1])?.display_name || levels[i - 1]);
                    return (
                      <div key={colName} className="flex items-stretch">
                        {/* Rail + ring column — one segment per level, indented to the right
                            so each level visibly nests inside the one above it. */}
                        <div className="flex flex-col items-center shrink-0" style={{ width: 22 + (i + 1) * 16, marginLeft: -6 }}>
                          <div className="w-px flex-1 bg-slate-200" style={{ minHeight: 6 }} />
                          <div
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0"
                            style={{ borderColor: ring, color: ring, background: `${ring}1a` }}
                          >
                            {i + 2}
                          </div>
                          {i < levels.length - 1 && <div className="w-px flex-1 bg-slate-200" style={{ minHeight: 6 }} />}
                        </div>
                        <div className="flex-1 flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mb-1.5 ml-1">
                          <span className="flex-1 text-slate-700 font-medium">{col?.display_name || colName}</span>
                          <span className="text-[10px] text-slate-400">within {prevLabel}</span>
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
                disabled={!topLevelCol || !availableCols.length}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500"
              >
                <option value="">{!topLevelCol ? 'Pick an X Axis column first' : availableCols.length ? '+ Add drill-down level…' : 'No more columns to add'}</option>
                {availableCols.map((c) => (
                  <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>
                ))}
              </select>
            </div>
          );
        }
        if (field.type === 'multiColumn') {
          // Column labels live on `mapping.column_labels` (not this field's own key) — the
          // same "display override, never touches the real name/query" slot X/Y Axis title
          // fields already use for their one axis each, just per-column here. Read/written
          // straight through this component's own `value`/`onChange`, same as any other
          // mapping field — no separate prop plumbing needed since `value` is already the
          // whole mapping object.
          const columnLabels = value?.column_labels;
          const setColumnLabel = (colName, text) => {
            const next = { ...(columnLabels || {}) };
            if (text) next[colName] = text; else delete next[colName];
            onChange('column_labels', next);
          };
          return (
            <ColumnMultiSelect
              key={field.key}
              label={field.label}
              required={isRequiredField(field)}
              columns={columns}
              columnsLoading={columnsLoading}
              selected={current || []}
              onChange={(next) => onChange(field.key, next)}
              showOrderTray={false}
              columnLabels={columnLabels}
              onColumnLabelChange={setColumnLabel}
            />
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
