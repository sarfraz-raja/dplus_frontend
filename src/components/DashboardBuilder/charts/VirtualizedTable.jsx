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

export default function VirtualizedTable({ rows, cols, round, valueTextColor }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD;

  const { startIndex, endIndex } = useMemo(() => {
    if (!shouldVirtualize) return { startIndex: 0, endIndex: rows.length };
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + BUFFER_ROWS * 2;
    return { startIndex: first, endIndex: Math.min(rows.length, first + visibleCount) };
  }, [shouldVirtualize, scrollTop, viewportHeight, rows.length]);

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
  const bottomSpacerHeight = shouldVirtualize ? (rows.length - endIndex) * ROW_HEIGHT : 0;
  const visibleRows = shouldVirtualize ? rows.slice(startIndex, endIndex) : rows;

  return (
    <div
      ref={measureRef}
      onScroll={shouldVirtualize ? handleScroll : undefined}
      className="overflow-auto h-full"
    >
      <table className="text-xs w-full">
        <thead className="bg-slate-50 sticky top-0">
          <tr>{cols.map((c) => <th key={c} className="text-left px-2 py-1.5 font-semibold text-slate-500 whitespace-nowrap">{c}</th>)}</tr>
        </thead>
        <tbody>
          {topSpacerHeight > 0 && (
            <tr style={{ height: topSpacerHeight }} aria-hidden="true"><td colSpan={cols.length} style={{ padding: 0, border: 'none' }} /></tr>
          )}
          {visibleRows.map((row, i) => (
            <tr key={startIndex + i} className="border-t border-slate-100">
              {cols.map((c) => <td key={c} className="px-2 py-1 text-slate-600 whitespace-nowrap" style={{ color: valueTextColor || undefined }}>{String(round(row[c]) ?? '')}</td>)}
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
