import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { isTimeValue, formatDateLabel } from './axisTypeUtils';

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

// First matching rule (in order) wins — same "top rule wins" convention Power BI's own
// rule-based conditional formatting uses, so rules can be stacked broad-to-narrow
// (e.g. a catch-all "< 100" after a more specific "< 50") without the later, broader rule
// stealing cells the earlier one was meant to catch.
function matchRule(cellValue, rules) {
  const n = Number(cellValue);
  if (Number.isNaN(n)) return null;
  for (const r of rules) {
    const t = Number(r.value);
    if (r.operator === '<' && n < t) return r.color;
    if (r.operator === '<=' && n <= t) return r.color;
    if (r.operator === '>' && n > t) return r.color;
    if (r.operator === '>=' && n >= t) return r.color;
    if (r.operator === '=' && n === t) return r.color;
    if (r.operator === '!=' && n !== t) return r.color;
  }
  return null;
}

// Sensible floor so a column can never be dragged down to unreadable/invisible — matches the
// same "keep it usable" reasoning SliderRow's own min/max bounds use elsewhere in this app.
const MIN_COLUMN_WIDTH = 40;

export default function VirtualizedTable({
  rows, cols, round, valueTextColor, cellFormatRules = null, rowBanding = false, bandColor = null, bandTextColor = null,
  headerBgColor = null, headerTextColor = null, formatValue = null, onReorderColumns = null, dateFormat = null,
  columnWidths = null, onColumnResize = null, columnLabels = null, onColumnLabelChange = null,
}) {
  // No column metadata (data_type) is threaded down to this component — same constraint
  // axisTypeUtils.js's own doc comment notes for chart axes — so the date column is detected
  // from the actual row values instead: any column whose values all look like a date/time
  // (isTimeValue) gets `dateFormat` applied. Assumes at most one such column is displayed at
  // a time (see ChartLibrary.jsx's `table_date_format` field comment); if more than one
  // qualifies, all of them share this one format.
  const dateColumns = useMemo(() => {
    if (!rows.length) return new Set();
    return new Set(cols.filter((c) => rows.every((r) => r[c] == null || r[c] === '' || isTimeValue(r[c]))
      && rows.some((r) => isTimeValue(r[c]))));
  }, [cols, rows]);
  // Drag-to-reorder directly on the column headers — replaces the old "Column order" tray in
  // the Data tab's column picker (ColumnMultiSelect.jsx), which made you drag an abstract list
  // item to guess at a layout instead of dragging the actual header you're looking at. Only
  // active when `onReorderColumns` is supplied (the live Chart Library preview, which can
  // write back to `mapping.columns` — a read-only dashboard placement passes nothing here).
  const dragColRef = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const reorderCols = (fromIdx, toIdx) => {
    if (!onReorderColumns || fromIdx === toIdx) return;
    const next = [...cols];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorderColumns(next);
  };
  // Drag-to-resize on each header's right edge — same "only in the live editable preview"
  // gating as reorder above (`onColumnResize` is only ever passed from ChartLibrary.jsx's own
  // preview, never a read-only dashboard placement). Live width tracked in a ref (not state)
  // during the drag itself so a fast drag doesn't re-render on every pixel of mousemove —
  // applied straight to the DOM's own `<col>` element and only committed to `onColumnResize`
  // (and so re-rendered from actual props) once the drag ends.
  const resizeRef = useRef(null); // { col, startX, startWidth } | null
  const colRefs = useRef({}); // { [colName]: <col> DOM node }
  const [resizingCol, setResizingCol] = useState(null);
  useEffect(() => {
    if (!resizingCol) return undefined;
    const onMove = (e) => {
      const r = resizeRef.current;
      if (!r) return;
      const next = Math.max(MIN_COLUMN_WIDTH, r.startWidth + (e.clientX - r.startX));
      const node = colRefs.current[r.col];
      if (node) node.style.width = `${next}px`;
    };
    const onUp = () => {
      const r = resizeRef.current;
      if (r) {
        const node = colRefs.current[r.col];
        const finalWidth = node ? parseFloat(node.style.width) : r.startWidth;
        onColumnResize?.(r.col, Math.max(MIN_COLUMN_WIDTH, Math.round(finalWidth)));
      }
      resizeRef.current = null;
      setResizingCol(null);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingCol, onColumnResize]);
  const startResize = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    // Falls back to the header cell's own currently-rendered width (not yet an explicit
    // columnWidths entry) so the very first drag on an auto-sized column starts from where it
    // visually already is, instead of jumping to some arbitrary default the moment it's touched.
    const th = e.currentTarget.closest('th');
    const startWidth = columnWidths?.[col] || th?.offsetWidth || 120;
    resizeRef.current = { col, startX: e.clientX, startWidth };
    setResizingCol(col);
  };
  // Double-click a header to give it a display label independent of the raw column name —
  // same "rename/give a title" capability every other chart_type already has for its axes
  // (X/Y Axis title fields) and the same double-click-to-edit interaction TextBox.jsx/Shape.jsx
  // already use, just applied per-column here instead of once per widget. Stored separately
  // from the column name itself (`columnLabels`, keyed by raw column) so the underlying query
  // mapping never has to change just to relabel a header.
  const [renamingCol, setRenamingCol] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const startRename = (col) => {
    setRenamingCol(col);
    setRenameDraft(columnLabels?.[col] ?? col);
  };
  const commitRename = () => {
    if (renamingCol) onColumnLabelChange?.(renamingCol, renameDraft.trim());
    setRenamingCol(null);
  };
  // Column -> ordered rule list, built once per rules change rather than re-scanning
  // `cellFormatRules` for every cell on every scroll/re-render (this loop runs per visible
  // row under virtualization — see VIRTUALIZE_THRESHOLD above).
  const rulesByColumn = useMemo(() => {
    const map = {};
    (cellFormatRules || []).forEach((entry) => { map[entry.column] = { rules: entry.rules, mode: entry.mode || 'background' }; });
    return map;
  }, [cellFormatRules]);
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
      {/* `resizingCol` also forces fixed layout — an auto-layout table mostly ignores a <col>'s
          own explicit width (sized by content instead), so the very first drag on a
          never-resized table would otherwise barely track the cursor until the drag commits
          and `columnWidths` actually gains an entry.
          `width: max-content` + `minWidth: 100%` (instead of a flat `w-full`/100%) once fixed
          widths are in play — a plain 100% width forces the browser to always cram every
          column into the container regardless of their specified pixel widths, which is why a
          horizontal scrollbar never appeared no matter how wide columns were resized: the
          table just silently re-proportioned itself back to 100%, and "resizing" one column
          only ever squeezed the others instead of the table actually growing wider. This lets
          it grow past its container's width when the summed column widths call for it (the
          ancestor's own `overflow-auto` — this component's own root div above — then scrolls
          it), while still filling the full width when they don't. */}
      <table
        className="text-xs"
        style={{
          tableLayout: (columnWidths && Object.keys(columnWidths).length) || resizingCol ? 'fixed' : 'auto',
          width: (columnWidths && Object.keys(columnWidths).length) || resizingCol ? 'max-content' : '100%',
          minWidth: '100%',
        }}
      >
        {/* One <col> per column so an explicit width applies consistently to the header AND
            every body cell in that column, not just wherever it happens to be set directly —
            the standard way to size an HTML table's columns rather than fighting individual
            <td>/<th> widths that can disagree with each other. */}
        <colgroup>
          {cols.map((c) => (
            <col key={c} ref={(node) => { colRefs.current[c] = node; }} style={{ width: columnWidths?.[c] ? `${columnWidths[c]}px` : undefined }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            {cols.map((c, i) => {
              const active = sort?.col === c ? sort.direction : null;
              const label = columnLabels?.[c] || c;
              const isRenaming = renamingCol === c;
              return (
                <th
                  key={c}
                  draggable={!!onReorderColumns && !isRenaming}
                  onDragStart={(e) => { dragColRef.current = i; e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnter={() => onReorderColumns && setDragOverCol(i)}
                  onDragOver={(e) => onReorderColumns && e.preventDefault()}
                  onDragEnd={() => { setDragOverCol(null); dragColRef.current = null; }}
                  onDrop={(e) => {
                    if (!onReorderColumns) return;
                    e.preventDefault();
                    if (dragColRef.current != null) reorderCols(dragColRef.current, i);
                    setDragOverCol(null);
                    dragColRef.current = null;
                  }}
                  onClick={() => !isRenaming && handleHeaderClick(c)}
                  onDoubleClick={onColumnLabelChange ? (e) => { e.stopPropagation(); startRename(c); } : undefined}
                  className={`relative text-left px-2 py-1.5 font-semibold text-slate-500 dark:text-white/85 whitespace-nowrap overflow-hidden text-ellipsis select-none${headerBgColor ? '' : ' bg-slate-50 dark:bg-[#2a2f47]'}${onReorderColumns ? ' cursor-grab' : ' cursor-pointer'}${dragOverCol === i ? ' ring-2 ring-inset ring-[#EC7D09]' : ''}`}
                  style={{ backgroundColor: headerBgColor || undefined, color: headerTextColor || undefined }}
                  title={onColumnLabelChange ? 'Double-click to rename' : undefined}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingCol(null);
                      }}
                      className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-[#EC7D09] rounded px-1 py-0.5 text-xs font-normal outline-none"
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1 w-full">
                      <span className="truncate">{label}</span>
                      {/* Sort arrows and the reorder grip both moved to the right edge of the
                          header's own content — previously the arrows sat right after the
                          label, and the grip was first; both crowded the label text and a
                          double-click-to-rename's unobstructed click target (see the
                          conversation this was reported in). Purely visual affordances now
                          (the whole `<th>` is still what's actually draggable/sortable). */}
                      <span className="inline-flex items-center gap-1 shrink-0 ml-auto">
                        <span className="inline-flex flex-col leading-none shrink-0">
                          <span style={{ fontSize: 8, opacity: active === 'asc' ? 1 : 0.3, color: headerTextColor || undefined }}>&#9650;</span>
                          <span style={{ fontSize: 8, opacity: active === 'desc' ? 1 : 0.3, color: headerTextColor || undefined }}>&#9660;</span>
                        </span>
                        {onReorderColumns && <GripVertical size={11} className="opacity-40 shrink-0" />}
                      </span>
                    </span>
                  )}
                  {/* Resize handle — the actual grab target is a wider (8px) invisible strip
                      so it's grabbable without needing pixel-perfect aim (same convention
                      ChartLibrary.jsx's own side panel resize handle uses), but a real 1px
                      line renders inside it at all times, not just on hover — an invisible-
                      until-touched handle gave no indication a column was even resizable at
                      all (see the conversation this was reported in). Turns orange while
                      hovered or actively being dragged, matching the same active-state color
                      the reorder drag-over ring already uses. Only rendered when resizing is
                      wired up at all, and not on the very last column (nothing to its right to
                      widen into without also affecting layout in a way that's hard to reason
                      about). */}
                  {onColumnResize && i < cols.length - 1 && (
                    <span
                      onMouseDown={(e) => startResize(e, c)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className="group absolute top-0 right-0 h-full w-2 cursor-col-resize z-10 flex items-center justify-center"
                    >
                      <span
                        className={`w-px h-full transition-colors ${resizingCol === c ? 'bg-[#EC7D09]' : 'bg-slate-300 dark:bg-white/20 group-hover:bg-[#EC7D09]'}`}
                      />
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {topSpacerHeight > 0 && (
            <tr style={{ height: topSpacerHeight }} aria-hidden="true"><td colSpan={cols.length} style={{ padding: 0, border: 'none' }} /></tr>
          )}
          {visibleRows.map((row, i) => {
            const realIndex = startIndex + i;
            const bandThisRow = rowBanding && realIndex % 2 === 1;
            return (
            <tr
              key={realIndex}
              className="border-t border-slate-100 dark:border-white/10"
              style={{ backgroundColor: bandThisRow ? (bandColor || undefined) : undefined }}
            >
              {cols.map((c) => {
                const isDateCol = dateColumns.has(c);
                const cellValue = isDateCol ? row[c] : round(row[c]);
                const display = isDateCol && isTimeValue(cellValue)
                  ? formatDateLabel(cellValue, dateFormat)
                  : typeof cellValue === 'number' && formatValue
                    ? formatValue(cellValue)
                    : String(cellValue ?? '');
                const colRules = rulesByColumn[c];
                const matched = colRules ? matchRule(cellValue, colRules.rules) : null;
                const isTextMode = colRules?.mode === 'text';
                return (
                  <td
                    key={c}
                    className="px-2 py-1 text-slate-600 dark:text-white/70 whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{
                      // Priority: a matching Conditional Formatting text-color rule wins
                      // outright (same "rules override banding" precedence backgroundColor
                      // below already follows); otherwise Band text color applies only on
                      // banded rows, same scope as Band color itself; otherwise the table-wide
                      // Value text color, then the component/theme default.
                      color: (isTextMode && matched) || (bandThisRow && bandTextColor) || valueTextColor || undefined,
                      backgroundColor: (!isTextMode && matched) || undefined,
                    }}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
            );
          })}
          {bottomSpacerHeight > 0 && (
            <tr style={{ height: bottomSpacerHeight }} aria-hidden="true"><td colSpan={cols.length} style={{ padding: 0, border: 'none' }} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
