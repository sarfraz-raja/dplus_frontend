import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { getDatasourceDetail, getColumnDistinctValues } from '../../../store/actions/dashboardBuilder-actions';
import MultiSelectFilterInput from './MultiSelectFilterInput';
import SingleSelectFilterInput from './SingleSelectFilterInput';
import { resolveTimeRangeValue } from '../utils/resolveTimeRange';

// `filters` (dashboard.global_filters, optionally merged with deep-link overrides from the
// parent — see EmbeddedDashboard.jsx's B6 param parsing) now carries an optional `name` (the
// custom "Filter Name" typed in FilterEditorModal.jsx, once it actually differs from the raw
// column — see that file's own toSavedFilter) alongside {column,operator,value,datasource_id}.
// Prefers that custom name for display; falls back to the column name for a filter saved
// before this change, or one whose name was never customized.
function labelFor(f) {
  return f.name || f.column;
}

// Guards against `f` being undefined — every other isX(f) helper below calls this first, so
// the same guard covers them too.
function isDateRange(f) {
  return !!f && f.operator === 'BETWEEN';
}

function isNowEndpoint(endpoint) {
  return !!(endpoint && typeof endpoint === 'object' && endpoint.type === 'now');
}

// A relative/thisPeriod spec, or a Custom spec with either endpoint pinned to "Now" (see
// FilterEditorModal.jsx's Range type), has no plain fixed date this strip can safely offer as
// an editable input — it's resolved fresh at query time. Editing that shape only happens in
// "Add and edit filters"; this strip just shows the currently-resolved window as read-only
// info instead of date inputs.
function isLiveTimeRange(f) {
  if (!isDateRange(f) || !f.value || typeof f.value !== 'object' || Array.isArray(f.value)) return false;
  if (f.value.mode && f.value.mode !== 'custom') return true;
  return isNowEndpoint(f.value.from) || isNowEndpoint(f.value.to);
}

// A plain-editable Custom BETWEEN's value is `{mode:'custom', from, to, granularity}` (or the
// legacy bare `[from, to]` array) — this normalizes either into a `[from, to]` pair for
// display, and `toEditablePatch` reconstructs whichever shape the filter already uses on edit.
function editableRangeOf(value) {
  if (Array.isArray(value)) return value;
  return [value?.from || '', value?.to || ''];
}

function isMultiSelect(f) {
  return !!f && (f.operator === 'IN' || f.operator === 'NOT IN');
}

function isComparison(f) {
  return !!f && (f.operator === '>' || f.operator === '>=' || f.operator === '<' || f.operator === '<=');
}

// Everything else this popover renders as a free-text/select box — not a date range, not a
// numeric comparison, not already a multi-select. A "pick one value" filter (typically =, !=,
// or LIKE), the one case that benefits from a dropdown of real sampled values instead of
// typing a value in blind.
function isPlainValue(f) {
  return !isDateRange(f) && !isComparison(f) && !isMultiSelect(f);
}

// A filter saved since datasource_id started being persisted (see FilterEditorModal.jsx's
// toSavedFilter) already knows exactly which datasource its column belongs to — go straight
// there, no guessing needed. Only a legacy filter (saved before that change, so
// `datasourceId` is empty) falls back to the old best-effort search: try every registered
// datasource for one whose OWN column metadata includes this column name, and call the real
// GET .../columns/<column>/distinct-values endpoint on it. That search is inherently
// unreliable — a registered datasource's column metadata can be incomplete/stale even when
// the column obviously has real data (every widget using it renders fine), and more than one
// datasource can share a column name — see the conversation this was diagnosed in, which is
// exactly why persisting datasource_id was worth doing. Keeps searching past a datasource
// whose call succeeds but comes back empty, rather than stopping at the first name match
// regardless of whether it actually had data; only gives up once every candidate is tried.
async function resolveColumnValues(column, datasourceId, datasourceOptions) {
  if (datasourceId) {
    try {
      const values = await getColumnDistinctValues(datasourceId, column);
      if (values.length > 0) return values;
    } catch (_) {
      // Saved datasource_id no longer resolves (e.g. the datasource was deleted) — fall
      // through to the legacy search rather than giving up outright.
    }
  }
  let lastResult = [];
  for (const ds of datasourceOptions) {
    if (ds.id === datasourceId) continue; // already tried above
    try {
      const { columns } = await getDatasourceDetail(ds.id);
      if (!(columns || []).some((c) => c.column_name === column)) continue;
      const values = await getColumnDistinctValues(ds.id, column);
      if (values.length > 0) return values;
      lastResult = values;
    } catch (_) {
      // This datasource didn't have the column, or the lookup failed (e.g. a calculated
      // column/metric, which the endpoint 422s on) — try the next one.
    }
  }
  return lastResult;
}

// Same datasource_id-first, guess-as-fallback approach as resolveColumnValues above, just
// returning the column's discovered data_type instead of its distinct values — drives whether
// BETWEEN/comparison operators render date or number inputs.
async function resolveColumnType(column, datasourceId, datasourceOptions) {
  if (datasourceId) {
    try {
      const { columns } = await getDatasourceDetail(datasourceId);
      const match = (columns || []).find((c) => c.column_name === column);
      if (match) return match.data_type || '';
    } catch (_) {
      // Saved datasource_id no longer resolves — fall through to the legacy search.
    }
  }
  for (const ds of datasourceOptions) {
    if (ds.id === datasourceId) continue;
    try {
      const { columns } = await getDatasourceDetail(ds.id);
      const match = (columns || []).find((c) => c.column_name === column);
      if (match) return match.data_type || '';
    } catch (_) {
      // Try the next datasource.
    }
  }
  return '';
}

/**
 * Horizontal "Filters" strip, sitting directly above the widget grid (not a vertical rail —
 * see Phase 18's layout revision note in the plan). Renders nothing when there are no filters
 * — the "Add and edit filters" trigger lives in the toolbar now (next to the dashboard name),
 * not here, so this component no longer owns that gear icon/modal itself; the parent controls
 * that separately and just feeds this component whatever's currently saved via `filters`.
 * Purely controlled around local edit state — persistence/data-refetch is the parent's job
 * (onApply). `datasourceOptions` is only needed for resolving IN/NOT IN dropdown values
 * (see resolveColumnValues above) — harmless to omit for dashboards with no such filters.
 */
export default function FilterPanel({ filters = [], onApply, onClear, datasourceOptions = [], onEditInFilters, columnValueHints = {} }) {
  const [localValues, setLocalValues] = useState(filters);
  const [applying, setApplying] = useState(false);
  // Collapsed by default — a row of always-shown input boxes (empty or filled) took a full
  // strap's worth of height even when nothing was set. Collapsed shows one readable line of
  // whatever's actually applied instead; clicking it (or making an edit) expands back to the
  // real input row. See summaryText() below for how that line is built.
  const [expanded, setExpanded] = useState(false);
  const [optionsByColumn, setOptionsByColumn] = useState({});
  const [loadingColumns, setLoadingColumns] = useState({});
  const [typeByColumn, setTypeByColumn] = useState({});
  const fetchedColumnsRef = useRef(new Set());
  const fetchedTypesRef = useRef(new Set());

  // Re-seed local edit state whenever the saved/deep-linked filters change (e.g. after the
  // editor modal saves a new set, or a fresh dashboard/deep-link mounts) — but not on every
  // parent re-render, so in-progress edits aren't clobbered mid-typing.
  useEffect(() => {
    setLocalValues(filters);
  }, [filters]);

  // Resolves dropdown options once per column that actually needs them — multi-select filters
  // (unchanged), AND now plain single-value filters too (e.g. "region"), so this popover offers
  // a dropdown of real sampled values there instead of a free-text box the user has to guess
  // the exact spelling/casing into. Date-range and comparison filters are excluded — those
  // aren't a "pick one value" shape (see the read-only "Edit in Filters" treatment for the
  // former just below).
  useEffect(() => {
    const rowsNeeded = localValues.filter((f) => isMultiSelect(f) || isPlainValue(f));
    // Cache key includes datasource_id, not just the column name — a filter's OWN
    // datasource_id can change after this column was already "resolved" once (e.g. re-saving
    // it through "Add and edit filters" to pick a datasource, per the conversation this was
    // diagnosed in: saving picked up the new datasource_id, but this component's own
    // fetch-once-per-column-name cache still remembered the column as already (unsuccessfully)
    // tried from BEFORE the save, so the new, now-correct fetch never actually ran). Keying on
    // both means a datasource_id change is correctly treated as "needs fetching again."
    const cacheKeyFor = (f) => `${f.column}::${f.datasource_id || ''}`;
    const toFetch = rowsNeeded.filter((f) => !fetchedColumnsRef.current.has(cacheKeyFor(f)));
    if (toFetch.length === 0) return;
    toFetch.forEach((f) => {
      const { column, datasource_id: datasourceId } = f;
      fetchedColumnsRef.current.add(cacheKeyFor(f));
      setLoadingColumns((prev) => ({ ...prev, [column]: true }));
      resolveColumnValues(column, datasourceId, datasourceOptions)
        .then((values) => {
          // Falls back to values derived from this dashboard's own already-loaded widget rows
          // (see DashboardCanvasEditor.jsx's filterColumnValueHints) when the datasource-search
          // comes back empty — e.g. a registered datasource's OWN column metadata can be
          // incomplete/stale even though the column clearly has real data (every widget using
          // it renders fine) — see the conversation this was diagnosed in.
          const hint = columnValueHints[column] || [];
          const resolved = values.length > 0 ? values : hint;
          setOptionsByColumn((prev) => ({ ...prev, [column]: resolved }));
        })
        .catch(() => setOptionsByColumn((prev) => ({ ...prev, [column]: columnValueHints[column] || [] })))
        .finally(() => setLoadingColumns((prev) => ({ ...prev, [column]: false })));
    });
  }, [localValues, datasourceOptions]);

  // Backfills a column whose resolution already finished empty (no API match AND no hint
  // available yet) once real hint data actually arrives — e.g. this dashboard's widgets were
  // still loading their own rows at the exact moment the value fetch above resolved, so
  // columnValueHints[column] was still `undefined`/empty then even though it becomes real data
  // moments later. Only ever fills in an EMPTY result, never overwrites one that already has
  // real values (from the API or an earlier hint), so this can't clobber a good answer.
  useEffect(() => {
    setOptionsByColumn((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(prev).forEach((column) => {
        if (prev[column]?.length > 0) return;
        const hint = columnValueHints[column];
        if (hint?.length > 0) {
          next[column] = hint;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columnValueHints]);

  // Same lazy, once-per-column pattern as the values fetch above — resolves whether a
  // BETWEEN/comparison filter's column is date-typed or numeric, so the right input type
  // renders instead of a plain text field.
  useEffect(() => {
    const rowsNeeded = localValues.filter((f) => isDateRange(f) || isComparison(f));
    // Same datasource_id-aware cache key as the value fetch above, same reason.
    const cacheKeyFor = (f) => `${f.column}::${f.datasource_id || ''}`;
    const toFetch = rowsNeeded.filter((f) => !fetchedTypesRef.current.has(cacheKeyFor(f)));
    if (toFetch.length === 0) return;
    toFetch.forEach((f) => {
      const { column, datasource_id: datasourceId } = f;
      fetchedTypesRef.current.add(cacheKeyFor(f));
      resolveColumnType(column, datasourceId, datasourceOptions)
        .then((dataType) => setTypeByColumn((prev) => ({ ...prev, [column]: dataType })))
        .catch(() => setTypeByColumn((prev) => ({ ...prev, [column]: '' })));
    });
  }, [localValues, datasourceOptions]);

  // Timestamp/datetime columns need the full datetime-local editor here too, or editing a
  // fixed Custom endpoint through this strip would silently truncate its time-of-day — same
  // granularity split FilterEditorModal.jsx's dateGranularity uses.
  const inputTypeFor = (column) => {
    const dataType = typeByColumn[column] || '';
    if (/timestamp|datetime/i.test(dataType)) return 'datetime-local';
    if (/^time$/i.test(dataType.trim())) return 'time';
    if (/date/i.test(dataType)) return 'date';
    return 'number';
  };

  if (localValues.length === 0) return null;

  // Apply lights up only when there's an actual unapplied edit (matches the reference —
  // Apply reads as inactive/greyed once localValues matches what's already applied). Clear
  // all lights up only when at least one filter currently holds a real value to clear.
  // Date-range checked BEFORE the generic array-length branch — a cleared BETWEEN's value is
  // reset to a plain `['', '']` (see clearOne below), which is an array, but two empty strings
  // is NOT "has a value" the way a real IN/NOT IN selection's non-empty array is. Also no
  // longer treats isLiveTimeRange as unconditionally "always has a value" — clearOne resets a
  // live range's value to that same plain blank array too (Array.isArray makes isLiveTimeRange
  // false immediately, see its own guard), so a cleared live filter correctly reads as
  // inactive here instead of being stuck permanently "active" regardless of its from/to.
  const hasValue = (f) => {
    if (isDateRange(f)) {
      if (isLiveTimeRange(f)) return true;
      const [from, to] = editableRangeOf(f.value);
      return !!from || !!to;
    }
    if (Array.isArray(f.value)) return f.value.length > 0;
    return !!f.value;
  };
  const isDirty = JSON.stringify(localValues) !== JSON.stringify(filters);
  const hasAnyValue = localValues.some(hasValue);
  const activeFilters = localValues.filter(hasValue);
  // One short readable fragment per active filter, for the collapsed chip — mirrors exactly
  // what each filter type's own expanded control shows (isLiveTimeRange's resolved from/to,
  // isDateRange's editable from/to, isComparison's operator, a plain value otherwise), just
  // condensed to text instead of inputs.
  const summaryText = (f) => {
    if (isMultiSelect(f)) {
      const shown = f.value.slice(0, 2).join(', ');
      return `${labelFor(f)}: ${shown}${f.value.length > 2 ? ` +${f.value.length - 2}` : ''}`;
    }
    if (isLiveTimeRange(f)) {
      const [from, to] = resolveTimeRangeValue(f.value);
      return `${labelFor(f)}: ${from} – ${to}`;
    }
    if (isDateRange(f)) {
      const [from, to] = editableRangeOf(f.value);
      return `${labelFor(f)}: ${from || '…'} – ${to || '…'}`;
    }
    if (isComparison(f)) return `${labelFor(f)} ${f.operator} ${f.value}`;
    return `${labelFor(f)}: ${f.value}`;
  };
  // isDirty (mid-edit) forces the row open even if collapse was toggled off, so Apply never
  // hides a field the user is actively editing right before they click it.
  const showExpanded = expanded || isDirty;

  const updateValue = (column, value) => {
    setLocalValues((prev) => prev.map((f) => (f.column === column ? { ...f, value } : f)));
  };

  const apply = async (rows) => {
    setApplying(true);
    try {
      await onApply?.(rows);
      // Back to the compact chip on a successful Apply — "I'm done editing" collapses the row
      // the same way opening it was an explicit action, rather than leaving it expanded
      // indefinitely until manually toggled shut.
      setExpanded(false);
    } finally {
      setApplying(false);
    }
  };

  const handleApply = () => apply(localValues);
  // Only blanks each filter's value — never removes the filter itself (that's only possible
  // from the "Add and edit filters" form). Uses the separate onClear callback rather than
  // onApply/apply([]), since apply([]) would persist an empty global_filters array and
  // delete every configured filter, not just reset its value — see onClear's own doc
  // comment (DashboardCanvasEditor.jsx's clearFilterValues) for the full reasoning.
  const handleClearAll = async () => {
    // Same uniform blanking as clearOne — including a live/relative range, reset to a plain
    // `['', '']` rather than left untouched, so the "Active" chip actually reflects nothing
    // being set any more instead of staying stuck showing the live range regardless.
    const cleared = localValues.map((f) => ({
      ...f,
      value: isMultiSelect(f) ? [] : isDateRange(f) ? ['', ''] : '',
    }));
    setLocalValues(cleared);
    setApplying(true);
    try {
      await onClear?.();
    } finally {
      setApplying(false);
    }
  };

  // Blanks ONE filter's value (the filter stays defined — deleting it outright is only
  // possible from "Add and edit filters") and applies immediately, uniformly for every filter
  // type including a live/relative time range — its value is reset to a plain `['', '']`
  // rather than patched via withEditableRange (which preserved the relative mode/amount/unit
  // fields, leaving isLiveTimeRange true forever and the "Active" chip stuck showing it as set
  // no matter what — see hasValue's own updated comment for why that was the actual bug).
  const clearOne = async (column) => {
    const next = localValues.map((f) => (f.column !== column ? f : {
      ...f,
      value: isMultiSelect(f) ? [] : isDateRange(f) ? ['', ''] : '',
    }));
    setLocalValues(next);
    await apply(next);
  };

  // The "Active: tag ×, tag ×" row — always shown (collapsed OR expanded), clicking any tag's
  // own text (not its ×) opens the popover below. No separate "Filters N" pill here — that
  // duplicated FiltersToggleButton's own gear button right next to it (see the conversation
  // this was reported in); the count now lives there instead, the one button that actually
  // opens "add/edit filters."
  const tagsRow = (
    <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-xs text-slate-500">
      {/* This whole row's own affordance that it's clickable — with the "Filters N" pill
          folded into FiltersToggleButton's gear button (see the conversation this was
          reported in, and leave that button as-is), nothing here signaled "click to edit
          values" any more once it was just plain text. */}
      <button type="button" onClick={() => setExpanded(true)} title="Edit filter values" aria-label="Edit filter values" className="shrink-0 text-slate-400 hover:text-slate-600">
        <SlidersHorizontal size={12} aria-hidden="true" />
      </button>
      {activeFilters.length > 0 ? (
        <>
          <span className="shrink-0 text-slate-400">Active:</span>
          {activeFilters.map((f) => (
            <span key={f.column} className="shrink-0 flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-slate-50 border border-slate-200">
              <button type="button" onClick={() => setExpanded(true)} className="hover:text-slate-700">
                {summaryText(f)}
              </button>
              <button
                type="button"
                title={`Clear ${labelFor(f)}`}
                aria-label={`Clear ${labelFor(f)}`}
                disabled={applying}
                onClick={() => clearOne(f.column)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </>
      ) : (
        // Reachable only when localValues.length > 0 (the whole panel returns null above
        // otherwise) — so getting here always means "N filters are DEFINED, just none has a
        // value yet" (see the Save-without-a-value change in FilterEditorModal.jsx), never
        // "there are no filters at all." The old "No filters applied" wording didn't
        // distinguish those two states, silently hiding that filters were already configured.
        <button type="button" onClick={() => setExpanded(true)} className="text-slate-400 hover:text-slate-600">
          {localValues.length} filter{localValues.length === 1 ? '' : 's'} configured — click to set values
        </button>
      )}
    </div>
  );

  if (!showExpanded) {
    return tagsRow;
  }

  return (
    <div className="relative">
      {tagsRow}
      {/* Editing opens as a floating popover, not inline in place — this used to reflow the
          whole row open right where the collapsed chip sat, which (particularly inside the
          toolbar's own flex row, where this component has limited width to work with) forced
          several filters' inputs to wrap onto stacked lines and visibly distort the toolbar
          around it. A popover has its own fixed width and sits in its own stacking context
          (position:absolute), so opening it can never reflow or squeeze anything else on the
          page — see the conversation this was reported in. */}
      <div className="fixed inset-0 z-30" onClick={() => !isDirty && setExpanded(false)} />
      <div className="absolute left-0 top-full mt-2 z-40 w-[420px] max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl p-3">
        <FilterPanelExpanded
          localValues={localValues} isDirty={isDirty} hasAnyValue={hasAnyValue} applying={applying}
          inputTypeFor={inputTypeFor} updateValue={updateValue} optionsByColumn={optionsByColumn} loadingColumns={loadingColumns}
          handleApply={handleApply} handleClearAll={handleClearAll} onCollapse={() => setExpanded(false)}
          onEditInFilters={onEditInFilters}
        />
      </div>
    </div>
  );
}

// The actual input row + Apply/Clear/✕ — split out from FilterPanel's main render so it can be
// dropped into the popover above without duplicating this JSX. Pure presentation; all the state
// (localValues, isDirty…) is still owned by FilterPanel itself and passed straight through.
function FilterPanelExpanded({
  localValues, isDirty, hasAnyValue, applying, inputTypeFor, updateValue, optionsByColumn, loadingColumns,
  handleApply, handleClearAll, onCollapse, onEditInFilters,
}) {
  return (
    <div className="flex flex-col gap-2.5 px-1">
      {/* Filter inputs on their own row, Apply/Clear/✕ on their own below — the popover has a
          fixed width, so keeping these as two stacked rows (rather than one `justify-between`
          row like the old inline strap) means a filter list that wraps never crowds the
          action buttons. */}
      <div className="flex items-center gap-2.5 flex-wrap">
      {/* Label sits to the left of its control, single line — matches the reference
          (Region / Site Name / Cell Name laid out inline) and keeps the strip from taking
          extra vertical space the way a label-above-control stack would. */}
      {localValues.map((f) => (
        <div key={f.column} className="shrink-0 flex items-center gap-1.5">
          <label className="text-[0.6875rem] font-semibold text-slate-600 whitespace-nowrap">
            {labelFor(f)}
          </label>
          {/* Date/time ranges (live OR a fixed custom range) are read-only here, not editable —
              this popover's own compact inputs had no real date/datetime picker (just a bare
              number spinner once a column's type hadn't resolved yet, letting someone type
              garbage like "21324312155" into what's supposed to be a date — see the
              conversation this was reported in), and a live range has no "value" to edit
              anyway. The full "Add and edit filters" modal already has a proper picker for
              this — "Edit in Filters" jumps straight there instead of duplicating it here. */}
          {isLiveTimeRange(f) ? (() => {
            const [from, to] = resolveTimeRangeValue(f.value);
            return (
              <button
                type="button"
                onClick={onEditInFilters}
                disabled={!onEditInFilters}
                className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 hover:bg-slate-100 disabled:hover:bg-slate-50 disabled:cursor-default"
              >
                {from} – {to} <span className="text-slate-400 underline">(live, edit in Filters)</span>
              </button>
            );
          })() : isDateRange(f) ? (() => {
            const [from, to] = editableRangeOf(f.value);
            return (
              <button
                type="button"
                onClick={onEditInFilters}
                disabled={!onEditInFilters}
                className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 hover:bg-slate-100 disabled:hover:bg-slate-50 disabled:cursor-default"
              >
                {from || '—'} – {to || '—'} <span className="text-slate-400 underline">edit in Filters</span>
              </button>
            );
          })() : isComparison(f) ? (
            <input
              type={inputTypeFor(f.column)}
              value={f.value || ''}
              onChange={(e) => updateValue(f.column, e.target.value)}
              className="w-24 border border-slate-200 rounded-md px-1.5 py-1 text-xs bg-white"
            />
          ) : isMultiSelect(f) ? (
            <MultiSelectFilterInput
              options={optionsByColumn[f.column] || []}
              loading={!!loadingColumns[f.column]}
              value={Array.isArray(f.value) ? f.value : []}
              onChange={(next) => updateValue(f.column, next)}
            />
          ) : (
            // Plain single-value filter (e.g. "region") — same searchable-dropdown UI as the
            // multi-select control right next to it (resolveColumnValues sample-based fetch,
            // same as multi-select already used), instead of a free-text box or a bare native
            // <select>, so picking a value doesn't need typing the exact spelling/casing blind.
            <SingleSelectFilterInput
              options={optionsByColumn[f.column] || []}
              loading={!!loadingColumns[f.column]}
              value={f.value || ''}
              onChange={(next) => updateValue(f.column, next)}
            />
          )}
        </div>
      ))}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleApply}
          disabled={applying || !isDirty}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isDirty
              ? 'text-white bg-[#EC7D09] hover:opacity-90'
              : 'text-slate-400 bg-slate-100 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {applying ? 'Applying…' : 'Apply filters'}
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={applying || !hasAnyValue}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            hasAnyValue ? 'text-slate-500 hover:bg-slate-50' : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          Clear all
        </button>
        {/* Manual close back to the chip without applying — a no-op while there's an unsaved
            edit (isDirty), since `showExpanded` in the parent already forces the popover open
            in that case; this button only has effect once there's nothing unsaved left to lose.
            A labeled "Close" button, not a bare ✕ — right next to "Clear all", an icon-only ✕
            read as if it might also clear something rather than just closing the popover (see
            the conversation this was reported in); text removes that ambiguity, and pushing it
            to the far end with its own left border reads as a distinct, lower-emphasis action
            from the two filter actions beside it. */}
        <button
          type="button"
          onClick={onCollapse}
          className="ml-auto pl-2.5 border-l border-slate-200 text-xs text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
