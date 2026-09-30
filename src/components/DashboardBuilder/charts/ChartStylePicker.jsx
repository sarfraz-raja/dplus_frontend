import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../../../utils/common';

// Searchable, themed picker for "Copy style from another chart" (ChartLibrary.jsx Style tab) —
// replaces a native <select>, whose option list can't be styled. Same-type charts are listed
// first since their whole style transfers; other types only share the common fields.
const ChartStylePicker = ({ options, currentType, value, disabled, loading, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = options.filter((o) => (
      (!typeFilter || o.chart_type === typeFilter)
      && (!q || `${o.name} ${o.chart_type} ${o.chart_type.replace(/_/g, ' ')}`.toLowerCase().includes(q))
    ));
    return [
      { label: 'Same type', items: filtered.filter((o) => o.chart_type === currentType) },
      { label: 'Other types', items: filtered.filter((o) => o.chart_type !== currentType) },
    ].filter((g) => g.items.length > 0);
  }, [options, query, currentType, typeFilter]);

  const types = useMemo(() => [...new Set(options.map((o) => o.chart_type))].sort(), [options]);

  const selected = options.find((o) => String(o.id) === String(value));

  const pick = (o) => { setOpen(false); setQuery(''); onSelect(String(o.id)); };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-xs font-medium text-slate-700 disabled:opacity-60"
      >
        <Copy size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-slate-400')}>
          {loading ? 'Copying…' : selected ? selected.name : 'Copy style from another chart…'}
        </span>
        <ChevronDown size={14} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-2">
            <Search size={12} className="text-slate-400" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search charts…"
              aria-label="Search charts"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          {types.length > 1 && (
            <div className="flex flex-wrap gap-1 border-b border-slate-100 px-2.5 py-1.5">
              {['', ...types].map((t) => (
                <button
                  key={t || 'all'}
                  type="button"
                  aria-pressed={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] font-medium transition-colors',
                    typeFilter === t
                      ? 'bg-[#EC7D09] text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-orange-100',
                  )}
                >
                  {t || 'All'}
                </button>
              ))}
            </div>
          )}
          <div role="listbox" className="max-h-56 overflow-y-auto py-1">
            {groups.length === 0 && <p className="px-3 py-3 text-center text-[11px] text-slate-400">No charts found</p>}
            {groups.map((g) => (
              <div key={g.label}>
                <p className="px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</p>
                {g.items.map((o) => {
                  const isSel = String(o.id) === String(value);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => pick(o)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-orange-50',
                        isSel && 'bg-orange-50 font-semibold',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.name}</span>
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">{o.chart_type}</span>
                      {isSel && <Check size={12} className="shrink-0 text-[#EC7D09]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartStylePicker;
