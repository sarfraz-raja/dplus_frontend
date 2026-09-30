import React from 'react';
import { QUERY_ROLES_BY_DATA_SHAPE } from '../utils/queryRoles';
import ColumnMultiSelect from '../ColumnMultiSelect';

/**
 * Generic per-widget data-mapping form — driven entirely by the selected widget's
 * `dataShape` (via QUERY_ROLES_BY_DATA_SHAPE) and the chosen datasource's column metadata
 * (from its cached /preview result), same "declarative metadata + one generic renderer"
 * shape as WidgetStyleFields.jsx. `value` is the widget's `dataSource.mapping` object
 * (`{ [roleKey]: columnName }` plus `filters: [{column, op, value}]`); `onChange(mapping)`
 * receives the whole updated mapping object each time (simpler than per-field onChange
 * here since filters are a list, not a flat key).
 */
export default function DataMappingFields({ dataShape, columns = [], value = {}, onChange }) {
  const roles = QUERY_ROLES_BY_DATA_SHAPE[dataShape] || [];
  const dimensionCols = columns.filter((c) => c.is_dimension);
  const measureCols = columns.filter((c) => c.is_measure);
  const filters = value.filters || [];
  

  const setRole = (roleKey, columnName) => {
    const patch = { ...value, [roleKey]: columnName };
    // Pre-fill the measure's aggregation with that column's own default_aggregation the
    // first time it's picked, so the user isn't left with an empty/invalid aggregation.
    const col = measureCols.find((c) => c.column_name === columnName);
    if (col && !value[`${roleKey}Aggregation`]) {
      patch[`${roleKey}Aggregation`] = col.default_aggregation || 'SUM';
    }
    onChange(patch);
  };

  const setAggregation = (roleKey, agg) => onChange({ ...value, [`${roleKey}Aggregation`]: agg });

  const addFilter = () => onChange({ ...value, filters: [...filters, { column: '', op: '=', value: '' }] });
  const updateFilter = (i, patch) => onChange({ ...value, filters: filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const removeFilter = (i) => onChange({ ...value, filters: filters.filter((_, idx) => idx !== i) });

  const filterableCols = columns.filter((c) => c.filterable);

  if (!roles.length) {
    return <div className="dbe-style-empty">No data mapping needed for this widget type.</div>;
  }

  return (
    <>
      {roles.map((r) => {
        if (r.role === 'multi') {
          return (
            <ColumnMultiSelect
              key={r.key}
              label={r.label}
              columns={columns}
              selected={value[r.key] || []}
              onChange={(next) => onChange({ ...value, [r.key]: next })}
            />
          );
        }
        const options = r.role === 'measure' ? measureCols : dimensionCols;
        return (
          <React.Fragment key={r.key}>
            <label>
              {r.label}{r.optional ? ' (optional)' : ''}
              <select value={value[r.key] || ''} onChange={(e) => setRole(r.key, e.target.value)}>
                <option value="">{r.optional ? 'None' : 'Select a column…'}</option>
                {options.map((c) => (
                  <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>
                ))}
              </select>
            </label>
            {r.role === 'measure' && value[r.key] && (
              <label>
                {r.label} aggregation
                <select value={value[`${r.key}Aggregation`] || 'SUM'} onChange={(e) => setAggregation(r.key, e.target.value)}>
                  {['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].map((agg) => <option key={agg} value={agg}>{agg}</option>)}
                </select>
              </label>
            )}
          </React.Fragment>
        );
      })}

      {filterableCols.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Filters</div>
          {filters.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <select value={f.column} onChange={(e) => updateFilter(i, { column: e.target.value })} style={{ flex: 1 }}>
                <option value="">Column…</option>
                {filterableCols.map((c) => <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>)}
              </select>
              <select value={f.op} onChange={(e) => updateFilter(i, { op: e.target.value })} style={{ width: 60 }}>
                {['=', '!=', '>', '<', '>=', '<='].map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              <input type="text" value={f.value} onChange={(e) => updateFilter(i, { value: e.target.value })} placeholder="Value" style={{ flex: 1 }} />
              <button type="button" onClick={() => removeFilter(i)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={addFilter} style={{ fontSize: 11, color: '#EC7D09', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add filter</button>
        </div>
      )}
    </>
  );
}
