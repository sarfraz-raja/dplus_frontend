import React from 'react';
import { toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/resolveTimeRange';

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
export default function MappingFields({ fields = [], value = {}, onChange, columns = [], columnsLoading = false }) {
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
          return (
            <div key={field.key} className="flex flex-col gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 w-full">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{field.label}</div>
              {/* Equal-width columns (not flex-wrap's content-sized items) — Measure and
                  Aggregation, or Compare-to and Delta format, end up the same width as each
                  other instead of one field looking "bigger" purely because its label text
                  or fixed width class happened to be wider. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {visibleSubFields.map((f) => renderField(f, true))}
              </div>
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
              {field.label}
              <select
                value={current || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={!options.length}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
              >
                <option value="">{columnsLoading ? 'Loading…' : options.length ? 'Select column' : 'No matching columns'}</option>
                {options.map((c) => (
                  <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>
                ))}
              </select>
            </label>
          );
        }
        if (field.type === 'text') {
          // A free-form label override (e.g. a custom axis title) — falls back to whatever
          // the chart would otherwise derive on its own (the column name) when left blank,
          // so this is purely optional, never a required rename.
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-48'}`}>
              {field.label}
              <input
                type="text"
                value={current || ''}
                placeholder={field.placeholder || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
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
          const options = typeof field.options === 'function' ? field.options(value) : field.options;
          const selected = options.includes(current) ? current : field.default;
          return (
            <label key={field.key} className={`text-xs font-medium text-slate-600 ${groupChild ? 'w-full' : 'w-32'}`}>
              {field.label}
              <select
                value={selected}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
              >
                {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {/* A short caption under the field (e.g. "Default: Africa/Blantyre") instead of
                  baking that into the label itself — a long label wraps awkwardly onto two
                  lines inside a grid cell and misaligns against the field beside it. */}
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
              {field.label}
              <input
                type="datetime-local"
                value={toDateTimeLocalInput(current)}
                onChange={(e) => onChange(field.key, fromDateTimeLocalInput(e.target.value))}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
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
              <div className="text-xs font-medium text-slate-600">{field.label}</div>
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
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500"
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
                <div className="text-xs font-medium text-slate-600">{field.label}</div>
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
