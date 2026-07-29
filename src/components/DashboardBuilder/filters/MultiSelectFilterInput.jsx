import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Check, X } from 'lucide-react';

/**
 * Fixed-size, single-line multi-select combobox for IN/NOT IN filter values — matches the
 * Superset reference exactly: the closed trigger is a fixed width/height box (never wraps
 * to a second line no matter how many values are selected), showing the first selected
 * value plus a "+N ..." count once more than one is picked, with a search icon on the right.
 * Opening it reveals a search box (filters the option list live) above a scrollable
 * checklist with a checkmark next to whatever's currently selected.
 *
 * `options`/`loading` are supplied by the caller (FilterPanel.jsx resolves them per-column,
 * best-effort, from sample data — see its own comment on why there's no real distinct-values
 * endpoint to call instead).
 *
 * `fullWidth`: FilterPanel.jsx's compact toolbar strip needs a small fixed-size trigger (the
 * default); FilterEditorModal.jsx's form needs it to match its other full-width, taller
 * fields (Operator/Datasource/Column) instead of looking like a visibly smaller control.
 */
export default function MultiSelectFilterInput({ options = [], value = [], onChange, loading = false, fullWidth = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const toggleValue = (v) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const removeFirst = (e) => {
    e.stopPropagation();
    onChange(value.slice(1));
  };

  const filteredOptions = useMemo(() => (
    search ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase())) : options
  ), [options, search]);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 shrink-0 border border-slate-200 bg-white cursor-pointer ${
          fullWidth ? 'w-full h-[38px] rounded-lg pl-2.5 pr-3 text-sm' : 'w-44 h-7 rounded-md pl-1.5 pr-2 text-xs'
        }`}
      >
        {value.length === 0 ? (
          <span className="flex-1 min-w-0 truncate text-slate-400">Select…</span>
        ) : (
          <>
            <span className="flex items-center gap-1 min-w-0 max-w-[70%] bg-slate-100 rounded pl-1.5 pr-1 py-0.5">
              <span className="truncate">{value[0]}</span>
              <X size={10} className="shrink-0 text-slate-400 hover:text-slate-700" onClick={removeFirst} />
            </span>
            {value.length > 1 && (
              <span className="shrink-0 bg-slate-100 rounded px-1.5 py-0.5 text-slate-500">+{value.length - 1} …</span>
            )}
          </>
        )}
        <Search size={12} className="ml-auto shrink-0 text-slate-400" />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-56 max-h-64 bg-white border border-slate-200 rounded-lg shadow-lg flex flex-col">
          <div className="p-1.5 border-b border-slate-100 shrink-0">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs"
            />
          </div>
          <div className="overflow-y-auto py-1">
            {loading && <div className="px-3 py-1.5 text-xs text-slate-400">Loading…</div>}
            {!loading && filteredOptions.length === 0 && (
              <div className="px-3 py-1.5 text-xs text-slate-400">No values found</div>
            )}
            {!loading && filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleValue(opt)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50"
              >
                <span className="truncate">{opt}</span>
                {value.includes(opt) && <Check size={12} className="shrink-0 text-[#EC7D09]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
