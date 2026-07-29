import React from 'react';

/**
 * Renders a chart_type's mapping controls, driven entirely by its field-descriptor array
 * (see CHART_TYPE_FIELDS in ChartLibrary.jsx) — same pattern as WidgetStyleFields.jsx's
 * generic style-field renderer, applied to mapping fields instead. `value` is the
 * in-progress mapping object (keyed by field.key); `onChange(key, val)` updates one field.
 */
export default function MappingFields({ fields = [], value = {}, onChange, columns = [], columnsLoading = false }) {
  return (
    <div className="flex flex-wrap gap-4 items-start">
      {fields.map((field) => {
        const current = value?.[field.key];
        if (field.type === 'column') {
          return (
            <label key={field.key} className="text-xs font-medium text-slate-600 w-48">
              {field.label}
              <select
                value={current || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={!columns.length}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
              >
                <option value="">{columnsLoading ? 'Loading…' : 'Select column'}</option>
                {columns.map((c) => (
                  <option key={c.column_name} value={c.column_name}>{c.display_name || c.column_name}</option>
                ))}
              </select>
            </label>
          );
        }
        if (field.type === 'select') {
          return (
            <label key={field.key} className="text-xs font-medium text-slate-600 w-32">
              {field.label}
              <select
                value={current || field.default}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
              >
                {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
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
      })}
    </div>
  );
}
