import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import FloatingPanel from '../../FloatingPanel';
import { Copy, ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../../../utils/common';
import CHART_TYPE_META, { displayChartType } from './chartTypeMeta';

// Searchable, themed picker for "Copy style from another chart" (ChartLibrary.jsx Style tab) —
// replaces a native <select>, whose option list can't be styled. Same-type charts are listed
// first since their whole style transfers; other types only share the common fields.
// A Big Number is a KPI_CARD with a mapping marker — group/filter by what the user sees.
const typeOf = (o) => displayChartType(o.chart_type, o.mapping);

const ChartStylePicker = ({ options, currentType, value, disabled, loading, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // Collapsed group labels ('Same type' / 'Other types'). Both start open; a search shows every
  // match regardless, so nothing found is hidden inside a closed group.
  const [collapsed, setCollapsed] = useState({});
  const toggleGroup = (label) => setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  const rootRef = useRef(null);
  // OLD: own portal + fixed-position + outside-click code here — now the shared FloatingPanel
  // (components/FloatingPanel.jsx), which every dropdown uses so none can be clipped.

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Newest first. GET /widgets returns them oldest-first (ORDER BY created_at), so the chart just
    // made sat at the bottom. Sort by created_at desc; rows without a date keep reversed list order.
    const ts = (o) => { const t = Date.parse(o.created_at || ''); return Number.isNaN(t) ? null : t; };
    const newestFirst = options
      .map((o, i) => ({ o, i, t: ts(o) }))
      .sort((a, b) => (a.t !== null && b.t !== null && a.t !== b.t ? b.t - a.t : b.i - a.i))
      .map(({ o }) => o);
    // OLD: const filtered = options.filter((o) => (
    const filtered = newestFirst.filter((o) => (
      (!typeFilter || typeOf(o) === typeFilter)
      && (!q || `${o.name} ${typeOf(o)} ${typeOf(o).replace(/_/g, ' ')}`.toLowerCase().includes(q))
    ));
    return [
      { label: 'Same type', items: filtered.filter((o) => typeOf(o) === currentType) },
      { label: 'Other types', items: filtered.filter((o) => typeOf(o) !== currentType) },
    ].filter((g) => g.items.length > 0);
  }, [options, query, currentType, typeFilter]);

  const types = useMemo(() => [...new Set(options.map(typeOf))].sort(), [options]);

  const selected = options.find((o) => String(o.id) === String(value));

  const pick = (o) => { setOpen(false); setQuery(''); onSelect(String(o.id)); };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      {/* OLD: className="relative" — inside the flex .dbe-action-btn it only took its content width, so the chevron sat mid-button. */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-dbe-body font-semibold text-[#EC7D09] disabled:opacity-60"
      >
        <Copy size={13} className="shrink-0 text-[#EC7D09]" aria-hidden="true" />
        {/* OLD: showed the picked chart's name here in plain dark text (read like a typed value).
            This is an action button, so its label stays fixed; the picked chart is named in the
            "Copied from …" note under it (ChartLibrary.jsx). */}
        <span className="min-w-0 flex-1 truncate">
          {loading ? 'Copying…' : 'Copy style from…'}
        </span>
        <ChevronDown size={14} className={cn('shrink-0 text-[#EC7D09] transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <FloatingPanel anchorRef={rootRef} open={open} onClose={() => setOpen(false)} minWidth={300}>
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-2.5 py-2">
            <Search size={12} className="text-slate-400" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search charts…"
              aria-label="Search charts"
              className="min-w-0 flex-1 bg-transparent text-dbe-body text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          {types.length > 1 && (
            <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-100 px-2.5 py-1.5">
              {['', ...types].map((t) => (
                <button
                  key={t || 'all'}
                  type="button"
                  aria-pressed={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-dbe-meta transition-colors',
                    typeFilter === t
                      ? 'bg-[#EC7D09] text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-[#EC7D09]/[0.14]',
                  )}
                >
                  {/* OLD: raw type key (HORIZONTAL_BAR) */}
                  {t ? (CHART_TYPE_META[t]?.label || t) : 'All'}
                </button>
              ))}
            </div>
          )}
          <div role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
            {groups.length === 0 && <p className="px-3 py-3 text-center text-dbe-meta text-slate-400">No charts found</p>}
            {groups.map((g) => (
              <div key={g.label}>
                {/* OLD: <p className="px-3 pb-1 pt-2 …">{g.label}</p> — static label, now a collapsible header. */}
                {(() => {
                  const isOpen = !!query.trim() || !collapsed[g.label];
                  return (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleGroup(g.label)}
                      className="flex w-full items-center gap-1 px-3 pb-1 pt-2 text-left text-dbe-h3 font-semibold uppercase tracking-wider text-slate-400 hover:text-[#EC7D09]"
                    >
                      <ChevronDown size={12} aria-hidden="true" className={cn('shrink-0 transition-transform', !isOpen && '-rotate-90')} />
                      {g.label}
                      <span className="font-normal normal-case tracking-normal">({g.items.length})</span>
                    </button>
                  );
                })()}
                {(query.trim() || !collapsed[g.label]) && g.items.map((o) => {
                  const isSel = String(o.id) === String(value);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => pick(o)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-dbe-body text-slate-700 hover:bg-[#EC7D09]/[0.08]',
                        isSel && 'bg-[#EC7D09]/[0.08] font-semibold',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.name}</span>
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-dbe-meta text-slate-500">{CHART_TYPE_META[typeOf(o)]?.label || typeOf(o)}</span>
                      {isSel && <Check size={12} className="shrink-0 text-[#EC7D09]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
      </FloatingPanel>
    </div>
  );
};

export default ChartStylePicker;
