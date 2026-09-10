import React, { useState } from 'react';
import { RefreshCw, X, Search, Check, Filter } from 'lucide-react';

/**
 * The on-canvas rendering of a `slicer`-type widget — a real grid widget (draggable/
 * resizable like KPI Card/Line/etc., see widgetTypeRegistry.js), styled after the Power BI/
 * Superset "slicer" pattern: a persistent vertical checklist card, not a one-line dropdown.
 * Every value is visible at a glance, selected rows are highlighted, and a search box only
 * appears once there are enough values to need one — this reads as its own dashboard object
 * the way a real slicer does, rather than a filter control borrowed from a toolbar.
 *
 * `slicer` is resolved by DashboardCanvasEditor's WidgetContent from its own `slicers` state
 * (matched on `widget.dataSource.slicerId`) — not fetched here, so this stays a dumb view.
 * Selecting/clearing values writes straight through to the backend via `onChange` (no local
 * "Apply" staging — see the slicer API's own dedicated PATCH endpoint).
 */
export default function SlicerWidgetCard({ slicer, onChange, onRefresh, busy = false }) {
  const [search, setSearch] = useState('');

  if (!slicer) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 px-3 text-center">
        Slicer unavailable — it may have been removed from the dashboard elsewhere.
      </div>
    );
  }

  const options = (slicer.available_values || []).map(String);
  const selected = Array.isArray(slicer.selected_values) ? slicer.selected_values.map(String) : [];
  const filtered = search ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase())) : options;
  const allSelected = options.length > 0 && selected.length === options.length;

  const toggleValue = (v) => {
    onChange?.(slicer.id, selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  const toggleAll = () => onChange?.(slicer.id, allSelected ? [] : options);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-slate-100 shrink-0">
        <span className="flex items-center gap-1.5 min-w-0 text-[0.7rem] font-semibold text-slate-600 uppercase tracking-wide truncate">
          <Filter size={11} className="shrink-0 text-slate-400" />
          <span className="truncate">{slicer.label || slicer.column_name}</span>
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {selected.length > 0 && (
            <button
              type="button"
              title="Clear selection"
              aria-label="Clear selection"
              onClick={(e) => { e.stopPropagation(); onChange?.(slicer.id, []); }}
              disabled={busy}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={12} />
            </button>
          )}
          <button
            type="button"
            title="Refresh available values"
            aria-label="Refresh available values"
            onClick={(e) => { e.stopPropagation(); onRefresh?.(slicer.id); }}
            disabled={busy}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {options.length > 6 && (
        <div className="px-2 py-1.5 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-6 pr-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {busy && options.length === 0 && <div className="px-3 py-1.5 text-xs text-slate-400">Loading…</div>}
        {!busy && options.length === 0 && <div className="px-3 py-1.5 text-xs text-slate-400">No values available</div>}

        {options.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 text-left"
          >
            <span className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center ${allSelected ? 'bg-[#EC7D09] border-[#EC7D09]' : 'border-slate-300'}`}>
              {allSelected && <Check size={10} className="text-white" />}
            </span>
            (Select all)
          </button>
        )}

        {filtered.map((opt) => {
          const isChecked = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleValue(opt)}
              className={`w-full flex items-center gap-2 px-2.5 py-1 text-xs text-left truncate transition-colors ${
                isChecked ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center ${isChecked ? 'bg-[#EC7D09] border-[#EC7D09]' : 'border-slate-300'}`}>
                {isChecked && <Check size={10} className="text-white" />}
              </span>
              <span className="truncate">{opt}</span>
            </button>
          );
        })}

        {filtered.length === 0 && options.length > 0 && (
          <div className="px-3 py-1.5 text-xs text-slate-400">No matches</div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="px-2.5 py-1 border-t border-slate-100 text-[0.65rem] text-slate-400 shrink-0">
          {selected.length} of {options.length} selected
        </div>
      )}
    </div>
  );
}
