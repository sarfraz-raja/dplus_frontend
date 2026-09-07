import React, { useEffect, useState } from 'react';
import FormModal from '../../FormModal';
import Button from '../../Button';
import { getDatasourceDetail } from '../../../store/actions/dashboardBuilder-actions';

/**
 * "Add slicer" modal — pick a datasource + column (same discovered-columns lookup
 * FilterEditorModal.jsx uses) and an optional display label. `available_values` isn't
 * collected here — the backend populates it itself from the live datasource on create.
 */
export default function AddSlicerModal({ isOpen, setIsOpen, datasourceOptions = [], onCreate }) {
  const [datasourceId, setDatasourceId] = useState('');
  const [columnName, setColumnName] = useState('');
  const [label, setLabel] = useState('');
  const [columns, setColumns] = useState([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setDatasourceId(datasourceOptions[0]?.id || '');
    setColumnName('');
    setLabel('');
    setError(null);
  }, [isOpen, datasourceOptions]);

  useEffect(() => {
    if (!datasourceId) { setColumns([]); return; }
    let cancelled = false;
    setColumnsLoading(true);
    getDatasourceDetail(datasourceId)
      .then(({ columns: cols }) => { if (!cancelled) setColumns(cols || []); })
      .catch(() => { if (!cancelled) setColumns([]); })
      .finally(() => { if (!cancelled) setColumnsLoading(false); });
    return () => { cancelled = true; };
  }, [datasourceId]);

  const handleSave = async () => {
    if (!datasourceId || !columnName) { setError('Pick a datasource and a column.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onCreate({ datasourceId, columnName, label: label || columnName });
      setIsOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal title="Add slicer" isOpen={isOpen} setIsOpen={setIsOpen} size="md">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Datasource</label>
            <select
              value={datasourceId}
              onChange={(e) => { setDatasourceId(e.target.value); setColumnName(''); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— pick a datasource —</option>
              {datasourceOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Column</label>
            <select
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              disabled={!datasourceId || columnsLoading}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">
                {!datasourceId ? '— pick a datasource first —' : columnsLoading ? 'Loading…' : '— pick a column —'}
              </option>
              {columns.map((c) => <option key={c.column_name} value={c.column_name}>{c.column_name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={columnName || 'e.g. Region'}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Adding…' : 'Add slicer'}</Button>
      </div>
    </FormModal>
  );
}
