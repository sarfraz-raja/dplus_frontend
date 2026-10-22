import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import FloatingPanel from './FloatingPanel';
import { cn } from '../utils/common';

// Shared dropdown — a drop-in replacement for a native <select> (whose open list the browser
// draws and can't be styled). Same API as <select>: `value`, `onChange(e)` with `e.target.value`,
// `disabled`, `className` (applied to the closed control), and the same <option> / <optgroup>
// children. The list is a FloatingPanel, so it's never clipped, and every list looks the same:
// Body-size rows, brand-orange hover, the selected row bold with a check. Keyboard: ↑ ↓ Enter
// Esc, and typing filters (a search box appears for lists over 10 options).
// Scope today: the Dashboard Builder (CLAUDE.md §4) — other modules still use native selects.

const SEARCH_THRESHOLD = 10;

// <option>/<optgroup> children → [{ value, label, disabled, group }]
function readOptions(children, group = null, out = []) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) { readOptions(child.props.children, group, out); return; }
    if (child.type === 'optgroup') { readOptions(child.props.children, child.props.label, out); return; }
    if (child.type === 'option') {
      const label = React.Children.toArray(child.props.children).join('');
      out.push({
        value: String(child.props.value ?? label),
        label,
        disabled: !!child.props.disabled,
        hidden: !!child.props.hidden,
        group,
      });
    }
  });
  return out;
}

export default function Select({
  value, onChange, children, options: optionsProp, disabled = false, className = '', id, name,
  placeholder = 'Select…', searchable, 'aria-label': ariaLabel, title,
  // Open list at least this wide (px) — for a narrow control whose labels would otherwise be cut.
  panelMinWidth = 0,
  // Optional text for the closed control instead of the selected option's label — for a compact
  // control whose list labels are longer (e.g. "Auto · 1m" closed, "1 minute" in the list).
  displayValue,
}) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);

  const options = useMemo(
    () => (optionsProp ? optionsProp.map((o) => ({ ...o, value: String(o.value) })) : readOptions(children)).filter((o) => !o.hidden),
    [optionsProp, children],
  );
  const selected = options.find((o) => o.value === String(value ?? ''));
  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => { setOpen(false); setQuery(''); setActive(-1); };
  const pick = (o) => {
    if (o.disabled) return;
    close();
    if (o.value !== String(value ?? '')) {
      const target = { value: o.value, name };
      onChange?.({ target, currentTarget: target });
    }
    anchorRef.current?.focus();
  };
  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setActive(Math.max(0, options.findIndex((o) => o.value === String(value ?? ''))));
  };
  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      let i = active;
      for (let n = 0; n < shown.length; n += 1) {
        i = (i + step + shown.length) % shown.length;
        if (!shown[i].disabled) break;
      }
      setActive(i);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      // Mark Esc as handled so an enclosing modal doesn't close too (FormModal checks defaultPrevented).
      if (e.key === 'Escape') e.preventDefault();
      close();
    }
  };

  let lastGroup = null;
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'dp-select flex items-center gap-2 bg-white text-left text-slate-700 focus:outline-none focus-visible:border-[#EC7D09] disabled:cursor-not-allowed disabled:opacity-50',
          // A native <select> brings its own border/padding; a call site that relied on that (no
          // border/padding classes) gets the same here. Panel CSS (.dp-select rules) still wins.
          !/\bborder\b|\bborder-/.test(className) && 'border border-slate-200 rounded-lg',
          !/\bp[xl]?-/.test(className) && 'px-2.5',
          !/\bp[yt]?-|\bh-/.test(className) && 'py-1.5',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-slate-400')}>
          {/* OLD: {selected ? selected.label : placeholder} */}
          {displayValue ?? (selected ? selected.label : placeholder)}
        </span>
        <ChevronDown size={14} aria-hidden="true" className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      <FloatingPanel anchorRef={anchorRef} open={open} onClose={close} maxHeight={320} minWidth={panelMinWidth}>
        {showSearch && (
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-2.5 py-2">
            <Search size={12} className="text-slate-400" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder="Search…"
              aria-label="Search options"
              className="min-w-0 flex-1 bg-transparent text-dbe-body text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        )}
        <div role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
          {shown.length === 0 && <p className="px-3 py-3 text-center text-dbe-meta text-slate-400">No options</p>}
          {shown.map((o, i) => {
            const groupHead = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            const isSel = selected?.value === o.value;
            return (
              <React.Fragment key={`${o.group || ''}:${o.value}`}>
                {groupHead && <p className="px-3 pb-1 pt-2 text-dbe-h3 font-semibold uppercase tracking-wider text-slate-400">{groupHead}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  disabled={o.disabled}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                  className={cn(
                    'dp-option flex w-full items-center gap-2 px-3 py-1.5 text-left text-dbe-body text-slate-700',
                    i === active && 'bg-[#EC7D09]/[0.08]',
                    isSel && 'font-semibold',
                    o.disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {isSel && <Check size={12} className="shrink-0 text-[#EC7D09]" aria-hidden="true" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </FloatingPanel>
    </>
  );
}
