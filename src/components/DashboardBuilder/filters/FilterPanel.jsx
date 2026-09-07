import React, { useEffect, useRef, useState } from 'react';
import { getDatasourceDetail, sampleDatasource } from '../../../store/actions/dashboardBuilder-actions';
import MultiSelectFilterInput from './MultiSelectFilterInput';
import { resolveTimeRangeValue, toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/resolveTimeRange';

// `filters` (dashboard.global_filters, optionally merged with deep-link overrides from the
// parent — see EmbeddedDashboard.jsx's B6 param parsing) only carries {column,operator,value}
// — no name/type. This panel infers a display label/control purely from each row's shape, the
// same convention FilterEditorModal.jsx uses, so both stay in sync without a second metadata store.
function labelFor(f) {
  return f.column;
}

function isDateRange(f) {
  return f.operator === 'BETWEEN';
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
function withEditableRange(value, from, to) {
  if (Array.isArray(value)) return [from, to];
  return { ...value, mode: 'custom', from, to };
}

function isMultiSelect(f) {
  return f.operator === 'IN' || f.operator === 'NOT IN';
}

function isComparison(f) {
  return f.operator === '>' || f.operator === '>=' || f.operator === '<' || f.operator === '<=';
}

// Global filters only ever carry {column, operator, value} — no datasourceId (that's
// intentionally local-only, edit-modal metadata, never persisted — see FilterEditorModal's
// own note on why). So for a multi-select filter's dropdown, there's no direct way to know
// which datasource to pull distinct values from. Since there's also no real distinct-values
// endpoint yet (per the backend's own documented v1 scope), this resolves both gaps the same
// best-effort way: search the dashboard's registered datasources for one whose columns
// include this filter's column, then sample it for a small set of real, unique values.
async function resolveColumnValues(column, datasourceOptions) {
  for (const ds of datasourceOptions) {
    try {
      const { columns } = await getDatasourceDetail(ds.id);
      if (!(columns || []).some((c) => c.column_name === column)) continue;
      const { rows } = await sampleDatasource(ds.id);
      const values = [...new Set((rows || []).map((r) => r[column]).filter((v) => v !== null && v !== undefined))];
      return values.map(String);
    } catch (_) {
      // This datasource didn't have the column, or the lookup failed — try the next one.
    }
  }
  return [];
}

// Same best-effort datasource search as resolveColumnValues, but returns the column's
// discovered data_type instead of sample values — drives whether BETWEEN/comparison
// operators render date or number inputs.
async function resolveColumnType(column, datasourceOptions) {
  for (const ds of datasourceOptions) {
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
export default function FilterPanel({ filters = [], onApply, onClear, datasourceOptions = [] }) {
  const [localValues, setLocalValues] = useState(filters);
  const [applying, setApplying] = useState(false);
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

  // Resolves dropdown options once per column that actually needs them (multi-select
  // filters only), not on every render/keystroke.
  useEffect(() => {
    const columnsNeeded = localValues.filter(isMultiSelect).map((f) => f.column);
    const toFetch = columnsNeeded.filter((c) => !fetchedColumnsRef.current.has(c));
    if (toFetch.length === 0) return;
    toFetch.forEach((column) => {
      fetchedColumnsRef.current.add(column);
      setLoadingColumns((prev) => ({ ...prev, [column]: true }));
      resolveColumnValues(column, datasourceOptions)
        .then((values) => setOptionsByColumn((prev) => ({ ...prev, [column]: values })))
        .catch(() => setOptionsByColumn((prev) => ({ ...prev, [column]: [] })))
        .finally(() => setLoadingColumns((prev) => ({ ...prev, [column]: false })));
    });
  }, [localValues, datasourceOptions]);

  // Same lazy, once-per-column pattern as the values fetch above — resolves whether a
  // BETWEEN/comparison filter's column is date-typed or numeric, so the right input type
  // renders instead of a plain text field.
  useEffect(() => {
    const columnsNeeded = localValues.filter((f) => isDateRange(f) || isComparison(f)).map((f) => f.column);
    const toFetch = columnsNeeded.filter((c) => !fetchedTypesRef.current.has(c));
    if (toFetch.length === 0) return;
    toFetch.forEach((column) => {
      fetchedTypesRef.current.add(column);
      resolveColumnType(column, datasourceOptions)
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
  const hasValue = (f) => {
    if (Array.isArray(f.value)) return f.value.length > 0;
    if (isDateRange(f) && f.value && typeof f.value === 'object') return isLiveTimeRange(f) || !!f.value.from || !!f.value.to;
    return !!f.value;
  };
  const isDirty = JSON.stringify(localValues) !== JSON.stringify(filters);
  const hasAnyValue = localValues.some(hasValue);

  const updateValue = (column, value) => {
    setLocalValues((prev) => prev.map((f) => (f.column === column ? { ...f, value } : f)));
  };

  const apply = async (rows) => {
    setApplying(true);
    try {
      await onApply?.(rows);
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
    const cleared = localValues.map((f) => ({
      ...f,
      // A relative/thisPeriod/now-anchored filter has no free-form value to blank — it's
      // always "live" — so "Clear all" leaves it untouched rather than collapsing it into an
      // empty custom range.
      value: isLiveTimeRange(f) ? f.value : isDateRange(f) ? withEditableRange(f.value, '', '') : isMultiSelect(f) ? [] : '',
    }));
    setLocalValues(cleared);
    setApplying(true);
    try {
      await onClear?.();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2.5 flex-wrap px-1">
      {/* Every filter control grouped together on the left, Apply/Clear pinned to the far
          right via the outer `justify-between` — matches the reference strap (filters on
          one side, actions on the other), instead of the buttons sitting immediately after
          whichever filter happens to be last. */}
      <div className="flex items-center gap-2.5 flex-wrap">
      {/* Label sits to the left of its control, single line — matches the reference
          (Region / Site Name / Cell Name laid out inline) and keeps the strip from taking
          extra vertical space the way a label-above-control stack would. */}
      {localValues.map((f) => (
        <div key={f.column} className="shrink-0 flex items-center gap-1.5">
          <label className="text-[0.6875rem] font-semibold text-slate-600 whitespace-nowrap">
            {labelFor(f)}
          </label>
          {isLiveTimeRange(f) ? (() => {
            const [from, to] = resolveTimeRangeValue(f.value);
            return (
              <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                {from} – {to} <span className="text-slate-400">(live, edit in Filters)</span>
              </span>
            );
          })() : isDateRange(f) ? (() => {
            const [from, to] = editableRangeOf(f.value);
            const rangeType = inputTypeFor(f.column);
            const isDateTime = rangeType === 'datetime-local';
            const toInput = (v) => (isDateTime ? toDateTimeLocalInput(v) : v);
            const fromInput = (v) => (isDateTime ? fromDateTimeLocalInput(v) : v);
            return (
              <div className="flex items-center gap-1">
                <input
                  type={rangeType}
                  step={rangeType === 'time' ? 1 : undefined}
                  value={toInput(from)}
                  onChange={(e) => updateValue(f.column, withEditableRange(f.value, fromInput(e.target.value), to))}
                  className="border border-slate-200 rounded-md px-1.5 py-1 text-xs bg-white"
                />
                <span className="text-xs text-slate-400">–</span>
                <input
                  type={rangeType}
                  step={rangeType === 'time' ? 1 : undefined}
                  value={toInput(to)}
                  onChange={(e) => updateValue(f.column, withEditableRange(f.value, from, fromInput(e.target.value)))}
                  className="border border-slate-200 rounded-md px-1.5 py-1 text-xs bg-white"
                />
              </div>
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
            <input
              value={f.value || ''}
              onChange={(e) => updateValue(f.column, e.target.value)}
              className="w-32 border border-slate-200 rounded-md px-1.5 py-1 text-xs bg-white"
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
      </div>
    </div>
  );
}
