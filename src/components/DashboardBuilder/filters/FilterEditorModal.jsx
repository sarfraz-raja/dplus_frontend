import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import FormModal from '../../FormModal';
import Button from '../../Button';
import { getDatasourceDetail, sampleDatasource } from '../../../store/actions/dashboardBuilder-actions';
import MultiSelectFilterInput from './MultiSelectFilterInput';
import { resolveTimeRangeValue, toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/resolveTimeRange';

const RELATIVE_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'quarters', label: 'Quarters' },
  { value: 'years', label: 'Years' },
];
const THIS_PERIOD_UNITS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
];

// The BETWEEN value's own `mode` tag drives which range-type UI shows — defaults to
// 'custom' (today's plain two-date-picker behavior) for both a brand-new filter and any
// legacy saved filter whose value is still a bare [from, to] array.
function rangeModeOf(value) {
  if (Array.isArray(value) || !value) return 'custom';
  return value.mode || 'custom';
}

function defaultValueForRangeMode(mode, granularity = 'date') {
  if (mode === 'relative') return { mode: 'relative', amount: 7, unit: 'days', direction: 'before', granularity };
  if (mode === 'thisPeriod') return { mode: 'thisPeriod', unit: 'month', granularity };
  return { mode: 'custom', from: '', to: '', granularity };
}


let localIdCounter = 0;
const nextLocalId = () => `f_${Date.now()}_${localIdCounter++}`;

// The full operator set the backend supports (see the Dashboard Builder Filters doc) — the
// value UI for a given filter is derived directly from which operator is picked, not a
// separate "Filter Type" abstraction layered on top of it.
const OPERATORS = [
  { value: '=', label: '= Equals' },
  { value: '!=', label: '≠ Not equals' },
  { value: '>', label: '> Greater than' },
  { value: '>=', label: '≥ Greater than or equal' },
  { value: '<', label: '< Less than' },
  { value: '<=', label: '≤ Less than or equal' },
  { value: 'LIKE', label: 'Like (pattern match)' },
  { value: 'IN', label: 'In (multiple values)' },
  { value: 'NOT IN', label: 'Not in (multiple values)' },
  { value: 'BETWEEN', label: 'Between (range)', dateLabel: 'Date/time range' },
];

function isMultiSelectOperator(operator) {
  return operator === 'IN' || operator === 'NOT IN';
}

function isRangeOperator(operator) {
  return operator === 'BETWEEN';
}

function isComparisonOperator(operator) {
  return operator === '>' || operator === '>=' || operator === '<' || operator === '<=';
}

function defaultValueForOperator(operator) {
  if (isRangeOperator(operator)) return ['', ''];
  if (isMultiSelectOperator(operator)) return [];
  return '';
}

// `dashboard.global_filters` only stores {column, operator, value} — name/datasourceId here
// are frontend-only display/lookup metadata, kept in local component state and folded away
// (not persisted) when rows are saved back — see Phase 18 plan's B1 note on why.
function toEditableRow(filter) {
  return {
    id: nextLocalId(),
    label: filter.column || '',
    column: filter.column || '',
    operator: filter.operator || '=',
    value: filter.value ?? defaultValueForOperator(filter.operator),
    datasourceId: filter.datasourceId || '',
  };
}

function toSavedFilter(row) {
  return { column: row.column, operator: row.operator, value: row.value };
}

/**
 * "Add and edit filters" modal — mirrors the Superset reference: a left rail listing this
 * dashboard's filters, a right-side form for whichever row is selected. Saving writes the
 * whole edited array back via onSave (parent persists it as dashboard.global_filters).
 */
export default function FilterEditorModal({ isOpen, setIsOpen, initialFilters = [], datasourceOptions = [], onSave }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [valueSuggestions, setValueSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const resolvedDatasourceRowsRef = useRef(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const editable = (initialFilters || []).map(toEditableRow);
    setRows(editable);
    setSelectedId(editable[0]?.id || null);
    setError(null);
    resolvedDatasourceRowsRef.current = new Set();
  }, [isOpen, initialFilters]);

  // Global filters don't persist datasourceId — see toEditableRow's own note on why — so on
  // every reopen it comes back empty even for an already fully-configured filter, which made
  // the Datasource field show "— pick a datasource —" and, worse, the Column field couldn't
  // show its real value at all (its options list stays empty with no datasource chosen, so
  // the select falls back to its placeholder even though `column` is already set). Re-resolves
  // it the same best-effort way FilterPanel.jsx does — search for a datasource whose columns
  // include the row's column — once per row, tracked in a ref so it isn't retried forever.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    rows
      .filter((r) => r.column && !r.datasourceId && !resolvedDatasourceRowsRef.current.has(r.id))
      .forEach((row) => {
        resolvedDatasourceRowsRef.current.add(row.id);
        (async () => {
          for (const ds of datasourceOptions) {
            try {
              const { columns: cols } = await getDatasourceDetail(ds.id);
              if (cancelled) return;
              if ((cols || []).some((c) => c.column_name === row.column)) {
                setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, datasourceId: ds.id } : r)));
                return;
              }
            } catch (_) {
              // This datasource didn't have the column, or the lookup failed — try the next one.
            }
          }
        })();
      });
    return () => { cancelled = true; };
  }, [isOpen, rows, datasourceOptions]);

  const selected = rows.find((r) => r.id === selectedId) || null;

  // Loads the picked datasource's discovered columns (for the Column datalist) and a small
  // set of sample values for whichever column is currently chosen (best-effort suggestions —
  // no distinct-values endpoint exists yet, see Phase 18 plan's confirmed v1 scope).
  useEffect(() => {
    if (!selected?.datasourceId) { setColumns([]); setValueSuggestions([]); return; }
    let cancelled = false;
    setColumnsLoading(true);
    getDatasourceDetail(selected.datasourceId)
      .then(({ columns: cols }) => { if (!cancelled) setColumns(cols || []); })
      .catch(() => { if (!cancelled) setColumns([]); })
      .finally(() => { if (!cancelled) setColumnsLoading(false); });
    sampleDatasource(selected.datasourceId)
      .then(({ rows: sampleRows }) => {
        if (cancelled || !selected.column) return;
        const values = [...new Set((sampleRows || []).map((r) => r[selected.column]).filter((v) => v !== null && v !== undefined))];
        setValueSuggestions(values.map(String));
      })
      .catch(() => { if (!cancelled) setValueSuggestions([]); });
    return () => { cancelled = true; };
  }, [selected?.datasourceId, selected?.column]);

  const updateSelected = (patch) => {
    setRows((prev) => prev.map((r) => (r.id === selectedId ? { ...r, ...patch } : r)));
  };

  const addFilter = () => {
    const row = { id: nextLocalId(), label: '', column: '', operator: '=', value: '', datasourceId: datasourceOptions[0]?.id || '' };
    setRows((prev) => [...prev, row]);
    setSelectedId(row.id);
  };

  const removeFilter = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const handleSave = async () => {
    const invalid = rows.some((r) => {
      if (!r.column) return true;
      if (r.operator === 'BETWEEN') {
        if (rangeModeOf(r.value) === 'relative') return !r.value?.amount || !r.value?.unit;
        if (rangeModeOf(r.value) === 'thisPeriod') return !r.value?.unit;
        const resolved = resolveTimeRangeValue(r.value);
        return !resolved?.[0] || !resolved?.[1];
      }
      if (r.operator === 'IN' || r.operator === 'NOT IN') return !r.value || r.value.length === 0;
      return !r.value;
    });
    if (invalid) { setError('Every filter needs a column and a value.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(rows.map(toSavedFilter), rows);
      setIsOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Drives BETWEEN's/the comparison operators' value inputs (date vs number) off the
  // selected column's own discovered data_type, rather than a manual per-filter toggle.
  const selectedColumnMeta = columns.find((c) => c.column_name === selected?.column);
  const isDateColumn = /date|time|timestamp/i.test(selectedColumnMeta?.data_type || '');
  const rangeInputType = isDateColumn ? 'date' : 'number';
  // TIMESTAMP/DATETIME columns need a full 'YYYY-MM-DD HH:MM:SS' per the backend's own
  // documented contract (it sends whatever string we give it straight into SQL, no
  // conversion) — plain DATE columns must stay date-only, or it's a DB error the other way.
  const selectedDataType = selectedColumnMeta?.data_type || '';
  const dateGranularity = /timestamp|datetime/i.test(selectedDataType)
    ? 'datetime'
    : /^time$/i.test(selectedDataType.trim())
      ? 'time'
      : 'date';

  // One Custom-mode endpoint (From or To) — either a fixed date/datetime, or pinned to `now`
  // (resolved fresh at query time, see resolveTimeRangeValue's custom branch). `side` is
  // 'from' or 'to'.
  const renderCustomEndpoint = (side, label) => {
    const endpoint = selected.value?.[side];
    const isNow = endpoint && typeof endpoint === 'object' && endpoint.type === 'now';
    const fixedValue = isNow ? '' : (endpoint || '');
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
        <div className="flex gap-2">
          <select
            value={isNow ? 'now' : 'fixed'}
            onChange={(e) => updateSelected({
              value: { ...selected.value, mode: 'custom', [side]: e.target.value === 'now' ? { type: 'now' } : '' },
            })}
            className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
          >
            <option value="fixed">
              {dateGranularity === 'datetime' ? 'Fixed date/time' : dateGranularity === 'time' ? 'Fixed time' : 'Fixed date'}
            </option>
            <option value="now">Now</option>
          </select>
          {!isNow && (
            <input
              type={dateGranularity === 'datetime' ? 'datetime-local' : dateGranularity === 'time' ? 'time' : 'date'}
              step={dateGranularity === 'time' ? 1 : undefined}
              value={dateGranularity === 'datetime' ? toDateTimeLocalInput(fixedValue) : fixedValue}
              onChange={(e) => updateSelected({
                value: {
                  ...selected.value,
                  mode: 'custom',
                  [side]: dateGranularity === 'datetime' ? fromDateTimeLocalInput(e.target.value) : e.target.value,
                },
              })}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <FormModal title="Add and edit filters" isOpen={isOpen} setIsOpen={setIsOpen} size="lg">
      <div className="flex gap-4 min-h-[360px]">
        <div className="w-48 shrink-0 flex flex-col gap-1 border-r border-slate-100 pr-3">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                r.id === selectedId ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{r.label || r.column || 'New filter'}</span>
              <Trash2
                size={12}
                className="shrink-0 text-slate-300 hover:text-red-500"
                onClick={(e) => { e.stopPropagation(); removeFilter(r.id); }}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={addFilter}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-orange-600 hover:bg-orange-50 mt-1"
          >
            <Plus size={13} /> Add filter
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Add a filter to configure it.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Filter Name</label>
                  <input
                    value={selected.label}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                    placeholder={selected.column || 'e.g. Region'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Datasource</label>
                  <select
                    value={selected.datasourceId}
                    onChange={(e) => updateSelected({ datasourceId: e.target.value, column: '' })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— pick a datasource —</option>
                    {datasourceOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Column</label>
                  {/* A real <select> instead of <input list>/<datalist> — browsers only
                      surface datalist suggestions that partially match the current text, so
                      once a column was picked (an exact match) the rest of the list became
                      invisible until the field was cleared. A select always shows every
                      discovered column on click, and only lets you pick a real one. */}
                  <select
                    value={selected.column}
                    onChange={(e) => updateSelected({ column: e.target.value })}
                    disabled={!selected.datasourceId || columnsLoading}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">
                      {!selected.datasourceId ? '— pick a datasource first —' : columnsLoading ? 'Loading…' : '— pick a column —'}
                    </option>
                    {columns.map((c) => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Operator</label>
                  <select
                    value={selected.operator}
                    onChange={(e) => updateSelected({
                      operator: e.target.value,
                      value: (e.target.value === 'BETWEEN' && isDateColumn)
                        ? defaultValueForRangeMode('custom', dateGranularity)
                        : defaultValueForOperator(e.target.value),
                    })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {/* BETWEEN reads as "Date/time range" once a date-typed column is picked
                        — same operator/value shape underneath, just a clearer label than the
                        generic "Between (range)" wording for a column where that's obviously
                        what it means (see the Option A vs. B filter-type discussion). */}
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{isDateColumn && op.dateLabel ? op.dateLabel : op.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isRangeOperator(selected.operator) && isDateColumn ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Range type</label>
                    <select
                      value={rangeModeOf(selected.value)}
                      onChange={(e) => updateSelected({ value: defaultValueForRangeMode(e.target.value, dateGranularity) })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {/* Calendar-day/period arithmetic doesn't apply to a plain TIME-only
                          column (no date to add days to) — only Custom (with an optional
                          "Now" endpoint for current time-of-day) makes sense there. */}
                      {dateGranularity !== 'time' && <option value="relative">Last N…</option>}
                      {dateGranularity !== 'time' && <option value="thisPeriod">This period…</option>}
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {rangeModeOf(selected.value) === 'relative' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Amount</label>
                        <input
                          type="number"
                          min="1"
                          value={selected.value?.amount ?? ''}
                          onChange={(e) => updateSelected({ value: { ...selected.value, amount: Number(e.target.value) } })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Unit</label>
                        <select
                          value={selected.value?.unit || 'days'}
                          onChange={(e) => updateSelected({ value: { ...selected.value, unit: e.target.value } })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                          {RELATIVE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Direction</label>
                        <select
                          value={selected.value?.direction || 'before'}
                          onChange={(e) => updateSelected({ value: { ...selected.value, direction: e.target.value } })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="before">Before now</option>
                          <option value="after">After now</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {rangeModeOf(selected.value) === 'thisPeriod' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Period</label>
                      <select
                        value={selected.value?.unit || 'month'}
                        onChange={(e) => updateSelected({ value: { ...selected.value, unit: e.target.value } })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        {THIS_PERIOD_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                  )}

                  {rangeModeOf(selected.value) === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      {renderCustomEndpoint('from', 'From')}
                      {renderCustomEndpoint('to', 'To')}
                    </div>
                  )}

                  {(() => {
                    const [from, to] = resolveTimeRangeValue(selected.value);
                    return (
                      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        Actual time range: <span className="font-semibold text-slate-700">{from || '…'} – {to || '…'}</span>
                      </div>
                    );
                  })()}
                </div>
              ) : isRangeOperator(selected.operator) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">From</label>
                    <input
                      type={rangeInputType}
                      value={selected.value?.[0] || ''}
                      onChange={(e) => updateSelected({ value: [e.target.value, selected.value?.[1] || ''] })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">To</label>
                    <input
                      type={rangeInputType}
                      value={selected.value?.[1] || ''}
                      onChange={(e) => updateSelected({ value: [selected.value?.[0] || '', e.target.value] })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : isMultiSelectOperator(selected.operator) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Values</label>
                  <MultiSelectFilterInput
                    fullWidth
                    options={valueSuggestions}
                    loading={columnsLoading}
                    value={Array.isArray(selected.value) ? selected.value : []}
                    onChange={(next) => updateSelected({ value: next })}
                  />
                </div>
              ) : isComparisonOperator(selected.operator) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Value</label>
                  <input
                    type={rangeInputType}
                    value={selected.value || ''}
                    onChange={(e) => updateSelected({ value: e.target.value })}
                    placeholder={rangeInputType === 'number' ? 'e.g. 100' : undefined}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    {selected.operator === 'LIKE' ? 'Value (use % as a wildcard)' : 'Value'}
                  </label>
                  <input
                    list={`filter-values-${selected.id}`}
                    value={selected.value || ''}
                    onChange={(e) => updateSelected({ value: e.target.value })}
                    placeholder={selected.operator === 'LIKE' ? 'e.g. %APAC%' : 'e.g. APAC'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <datalist id={`filter-values-${selected.id}`}>
                    {valueSuggestions.map((v) => <option key={v} value={v} />)}
                  </datalist>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </FormModal>
  );
}
