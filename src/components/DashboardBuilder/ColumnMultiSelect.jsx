import React, { useMemo, useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';

/**
 * Shared "pick multiple columns" checklist — a search box + Select all/Clear all header over a
 * height-capped, internally-scrolling list of checkboxes, plus a reorderable "Column order" tray
 * for the columns actually picked. Extracted out of MappingFields.jsx's 'multiColumn' field and
 * widgetConfig/DataMappingFields.jsx's 'multi' role, which had reimplemented the exact same
 * control independently (down to the same orange Select all/Clear all button) — one copy in
 * Tailwind classes, the other in inline styles. A plain flex-wrap grid of checkboxes reads fine
 * for ~6 columns but grows unwieldy past the ~16 a typical table/report datasource exposes, so
 * this caps it with a scroll region and adds search rather than switching to a closed dropdown —
 * keeping every option glanceable still matters more than saving space here, per the UI
 * discussion that prompted this extraction.
 *
 * `selected`'s own array order IS the display order downstream (renderChartWidget.jsx's TABLE
 * case passes `mapping.columns` straight to VirtualizedTable as `cols`) — checking a box appends
 * to the end, same as before. The reorder tray only lets a user rearrange that same array via
 * native HTML5 drag-and-drop; it doesn't add a second, separate "order" concept to persist.
 *
 * `showOrderTray` (default true) — MappingFields.jsx's TABLE 'multiColumn' field passes false:
 * once the live preview's own column headers support drag-to-reorder directly (see
 * VirtualizedTable.jsx's `onReorderColumns`), rearranging in this abstract list too was a
 * second, redundant way to do the exact same thing — reordering what you're actually looking
 * at is more direct than dragging a text label that stands in for it. Left on for
 * widgetConfig/DataMappingFields.jsx's own 'multi' role fields, which have no such live grid
 * to drag against.
 *
 * `columnLabels`/`onColumnLabelChange` (optional) — the same rename capability
 * VirtualizedTable.jsx's own headers offer via double-click, surfaced here too so it's
 * reachable without hunting for which header to double-click, and so the raw column name (what
 * the query actually reads) always stays visible right next to whatever display label was
 * given it — the whole point being that renaming never loses track of the real underlying
 * name. Rendered inline, one label input per checkbox row (right half of the row, disabled
 * until that column is checked) rather than as a separate list — keeps the "which name goes
 * with which label" mapping unambiguous without a second list to scan against this one.
 */
export default function ColumnMultiSelect({
  label, required = false, columns = [], columnsLoading = false, selected = [], onChange, showOrderTray = true,
  columnLabels = null, onColumnLabelChange = null,
}) {
  const [query, setQuery] = useState('');
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((c) => (c.display_name || c.column_name).toLowerCase().includes(q));
  }, [columns, query]);

  const labelFor = (colName) => columns.find((c) => c.column_name === colName)?.display_name || colName;

  const toggle = (colName) => {
    onChange(selected.includes(colName) ? selected.filter((c) => c !== colName) : [...selected, colName]);
  };

  const allSelected = columns.length > 0 && selected.length === columns.length;

  const reorder = (from, to) => {
    if (from === to) return;
    const next = [...selected];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">
          {label}{required && <span className="text-red-500"> *</span>}
          {columns.length > 0 && <span className="ml-1.5 font-normal text-slate-400">({selected.length}/{columns.length} selected)</span>}
        </div>
        {columns.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : columns.map((c) => c.column_name))}
            className="text-xs font-medium text-[#EC7D09] hover:opacity-80"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>
      {!columns.length && (
        <div className="text-xs text-slate-400">{columnsLoading ? 'Loading…' : 'Select a datasource first.'}</div>
      )}
      {columns.length > 6 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search columns…"
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
        />
      )}
      {showOrderTray && selected.length > 1 && (
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-1.5">
          <div className="text-[10px] font-medium text-slate-400 px-0.5">Column order — drag to rearrange</div>
          {selected.map((colName, i) => (
            <div
              key={colName}
              draggable
              onDragStart={() => { dragIndex.current = i; }}
              onDragEnter={() => setDragOverIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={() => { setDragOverIndex(null); dragIndex.current = null; }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex.current != null) reorder(dragIndex.current, i);
                setDragOverIndex(null);
                dragIndex.current = null;
              }}
              className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-xs text-slate-600 bg-slate-50 ${dragOverIndex === i ? 'ring-1 ring-[#EC7D09]' : ''}`}
            >
              <GripVertical size={13} className="text-slate-400 cursor-grab shrink-0" />
              <span className="flex-1 truncate">{labelFor(colName)}</span>
              <button type="button" onClick={() => toggle(colName)} className="text-slate-400 hover:text-red-500 shrink-0" title="Remove">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {columns.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
          {!filtered.length && <div className="text-xs text-slate-400 px-1">No matching columns.</div>}
          {filtered.map((c) => {
            const isChecked = selected.includes(c.column_name);
            return (
              <div key={c.column_name} className="flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 w-1/2 min-w-0">
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(c.column_name)} className="shrink-0" />
                  <span className="truncate">{c.display_name || c.column_name}</span>
                </label>
                {onColumnLabelChange && (
                  <input
                    type="text"
                    value={columnLabels?.[c.column_name] || ''}
                    onChange={(e) => onColumnLabelChange(c.column_name, e.target.value)}
                    disabled={!isChecked}
                    placeholder="Custom label…"
                    className="w-1/2 min-w-0 px-2 py-1 rounded-md border border-slate-200 bg-white text-xs disabled:opacity-40"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
