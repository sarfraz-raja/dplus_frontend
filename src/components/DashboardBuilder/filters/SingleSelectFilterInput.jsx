import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Check, X } from 'lucide-react';

/**
 * Single-select sibling to MultiSelectFilterInput.jsx — same searchable-combobox look/behavior
 * (fixed-size trigger, search box + scrollable checklist on open), just for a plain "=" filter
 * (e.g. "region") instead of IN/NOT IN. `options`/`loading` come from the same
 * resolveColumnValues sample-based fetch FilterPanel.jsx already resolves for multi-select
 * columns — see FilterPanel.jsx's own doc comment on why there's no real distinct-values
 * endpoint to call instead.
 */
export default function SingleSelectFilterInput({ options = [], value = '', onChange, loading = false, fullWidth = false }) {
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

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  // The current value is always offered even if the sample missed it (e.g. set from
  // elsewhere, or a rarer value the small sample didn't happen to include) — never silently
  // dropped out of the list just because it's currently selected.
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;
  const filteredOptions = useMemo(() => (
    search ? allOptions.filter((o) => o.toLowerCase().includes(search.toLowerCase())) : allOptions
  ), [allOptions, search]);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 shrink-0 border border-slate-200 bg-white cursor-pointer ${
          fullWidth ? 'w-full h-[38px] rounded-lg pl-2.5 pr-3 text-sm' : 'w-32 h-7 rounded-md pl-1.5 pr-2 text-xs'
        }`}
      >
        {!value ? (
          <span className="flex-1 min-w-0 truncate text-slate-400">Select…</span>
        ) : (
          <span className="flex items-center gap-1 min-w-0 flex-1 bg-slate-100 rounded pl-1.5 pr-1 py-0.5">
            <span className="truncate">{value}</span>
            <X size={10} className="shrink-0 text-slate-400 hover:text-slate-700" onClick={clear} />
          </span>
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
              <div className="px-3 py-1.5 text-xs text-slate-400">
                No values found{options.length === 0 ? '' : ` (${options.length} available, none match "${search}")`}
              </div>
            )}
            {!loading && filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50"
              >
                <span className="truncate">{opt}</span>
                {value === opt && <Check size={12} className="shrink-0 text-[#EC7D09]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
