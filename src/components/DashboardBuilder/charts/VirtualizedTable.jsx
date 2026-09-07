import React, { useEffect, useMemo, useRef, useState } from 'react';

// Only mount real DOM rows for whatever's actually scrolled into view (+ a small buffer),
// rather than every row in the result set — a few hundred real <tr> elements is the specific
// thing that made resizing/selecting a Table widget feel laggy compared to chart widgets
// (which redraw a canvas/SVG, not hundreds of DOM nodes, on every re-render). Below
// VIRTUALIZE_THRESHOLD rows this isn't worth the extra bookkeeping, so it just renders
// everything directly, matching the previous plain-<table> behavior exactly.
const ROW_HEIGHT = 25; // px — matches the existing px-2 py-1 text-xs row's rendered height
const BUFFER_ROWS = 8;
const VIRTUALIZE_THRESHOLD = 50;

// Click a header to cycle asc -> desc -> unsorted, Superset-style. Only one column sorted
// at a time; unsorted falls back to the original row order the query returned.
function compareValues(a, b) {
  const aNum = Number(a);
  const bNum = Number(b);
  if (a !== '' && a != null && b !== '' && b != null && !Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }
  return String(a ?? '').localeCompare(String(b ?? ''));
}

export default function VirtualizedTable({ rows, cols, round, valueTextColor, formatValue = null }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [sort, setSort] = useState(null); // { col, direction: 'asc' | 'desc' } | null

  const handleHeaderClick = (col) => {
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, direction: 'asc' };
      if (prev.direction === 'asc') return { col, direction: 'desc' };
      return null;
    });
  };

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => sign * compareValues(a[sort.col], b[sort.col]));
  }, [rows, sort]);

  const shouldVirtualize = sortedRows.length > VIRTUALIZE_THRESHOLD;

  const { startIndex, endIndex } = useMemo(() => {
    if (!shouldVirtualize) return { startIndex: 0, endIndex: sortedRows.length };
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + BUFFER_ROWS * 2;
    return { startIndex: first, endIndex: Math.min(sortedRows.length, first + visibleCount) };
  }, [shouldVirtualize, scrollTop, viewportHeight, sortedRows.length]);

  const handleScroll = (e) => setScrollTop(e.currentTarget.scrollTop);
  // Measures the actual scrollable viewport once mounted — needed to know how many rows are
  // visible at once, which depends on the widget's own (resizable-via-grid) height. A plain
  // `onResize` prop isn't a real DOM event for an arbitrary element (only `window` fires
  // one) — ResizeObserver is the correct way to track this element's own size changes, e.g.
  // when the user drags the widget's react-grid-layout resize handle.
  const measureRef = (node) => {
    containerRef.current = node;
    if (node) setViewportHeight(node.clientHeight);
  };
  useEffect(() => {
    if (!shouldVirtualize || !containerRef.current) return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldVirtualize]);

  const topSpacerHeight = shouldVirtualize ? startIndex * ROW_HEIGHT : 0;
  const bottomSpacerHeight = shouldVirtualize ? (sortedRows.length - endIndex) * ROW_HEIGHT : 0;
  const visibleRows = shouldVirtualize ? sortedRows.slice(startIndex, endIndex) : sortedRows;

  return (
    <div
      ref={measureRef}
      onScroll={shouldVirtualize ? handleScroll : undefined}
      className="overflow-auto h-full"
    >
      <table className="text-xs w-full">
        <thead className="bg-slate-50 dark:bg-white/5 sticky top-0">
          <tr>
            {cols.map((c) => {
              const active = sort?.col === c ? sort.direction : null;
              return (
                <th
                  key={c}
                  onClick={() => handleHeaderClick(c)}
                  className="text-left px-2 py-1.5 font-semibold text-slate-500 dark:text-white/85 whitespace-nowrap cursor-pointer select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    {c}
                    <span className="inline-flex flex-col leading-none">
                      <span className="text-slate-500 dark:text-white/85" style={{ fontSize: 8, opacity: active === 'asc' ? 1 : 0.3 }}>&#9650;</span>
                      <span className="text-slate-500 dark:text-white/85" style={{ fontSize: 8, opacity: active === 'desc' ? 1 : 0.3 }}>&#9660;</span>
                    </span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {topSpacerHeight > 0 && (
            <tr style={{ height: topSpacerHeight }} aria-hidden="true"><td colSpan={cols.length} style={{ padding: 0, border: 'none' }} /></tr>
          )}
          {visibleRows.map((row, i) => (
            <tr key={startIndex + i} className="border-t border-slate-100 dark:border-white/10">
              {cols.map((c) => {
                const cellValue = round(row[c]);
                const display = typeof cellValue === 'number' && formatValue
                  ? formatValue(cellValue)
                  : String(cellValue ?? '');
                return <td key={c} className="px-2 py-1 text-slate-600 dark:text-white/70 whitespace-nowrap" style={{ color: valueTextColor || undefined }}>{display}</td>;
              })}
            </tr>
          ))}
          {bottomSpacerHeight > 0 && (
            <tr style={{ height: bottomSpacerHeight }} aria-hidden="true"><td colSpan={cols.length} style={{ padding: 0, border: 'none' }} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
