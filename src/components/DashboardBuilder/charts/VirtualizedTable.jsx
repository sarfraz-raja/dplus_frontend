import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, ChevronLeft, ChevronRight, ChevronDown, Check, Search } from 'lucide-react';
// OLD: import Select from '../../Select'; — the Show-entries control is now a typeable combo (below).
import FloatingPanel from '../../FloatingPanel';
import { isTimeValue, formatDateLabel } from './axisTypeUtils';
import { pickReadableTextColor, contrastRatio } from '../utils/contrast';

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

const PAGER_DEFAULT_COLOR = '#EC7D09';
// "Show N entries" choices in the table toolbar (the table's own Rows per page is added if custom).
const VIEWER_PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100];
// '#rrggbb' (or '#rgb') -> 'rgba(r,g,b,a)'; anything else is returned as-is.
function hexToRgba(hex, alpha) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Page buttons to show: all of them up to 7 pages, otherwise first / last / current ±1 with
// '…' gaps — keeps the pager one short row however many pages there are.
function pageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const set = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export default function VirtualizedTable({
  rows, cols, round, valueTextColor, valueTextSize = null, cellFormatRules = null, rowBanding = false, bandColor = null, bandTextColor = null,
  headerBgColor = null, headerTextColor = null, formatValue = null, onReorderColumns = null, dateFormat = null,
  columnWidths = null, onColumnResize = null, columnLabels = null, onColumnLabelChange = null,
  pageSize: configuredPageSize = null, pagerColor = null, isDark = false, framed = false, gridLines = 'rows', gridColor = null,
  showToolbar = false,
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

  // Table toolbar (Style → Search & entries): a search box and, when the table is paged, a
  // "Show N entries" choice — both live controls for whoever is looking at the table, kept in
  // this component's state only (never saved). Search matches any shown column's raw value,
  // case-insensitive; deferred so typing stays smooth on a few thousand rows.
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [viewerPageSize, setViewerPageSize] = useState(null);
  // Show-entries is ONE typeable combo: type any count (1–1000, Enter / click away applies) or open
  // the list for the presets — no separate "Custom" field.
  const sizeAnchorRef = useRef(null);
  const [sizeListOpen, setSizeListOpen] = useState(false);
  const [sizeDraft, setSizeDraft] = useState('');
  useEffect(() => { setViewerPageSize(null); }, [configuredPageSize]);
  useEffect(() => { if (!showToolbar) { setQuery(''); setViewerPageSize(null); } }, [showToolbar]);
  const pageSize = (showToolbar && viewerPageSize) || configuredPageSize;
  useEffect(() => { setSizeDraft(pageSize ? String(pageSize) : ''); }, [pageSize]);
  const commitSize = (raw) => {
    const n = Math.round(Number(raw));
    if (!raw || Number.isNaN(n)) { setSizeDraft(String(pageSize)); return; }
    const clamped = Math.min(1000, Math.max(1, n));
    setSizeDraft(String(clamped));
    setViewerPageSize(clamped);
  };
  const filteredRows = useMemo(() => {
    if (!deferredQuery) return rows;
    return rows.filter((r) => cols.some((c) => r[c] != null && String(r[c]).toLowerCase().includes(deferredQuery)));
  }, [rows, cols, deferredQuery]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => sign * compareValues(a[sort.col], b[sort.col]));
  }, [filteredRows, sort]);

  // Pagination (Style → Rows per page). Sorting applies to all rows first, then the page is
  // cut from that, so page 1 of a sorted table really holds the top rows. Back to page 1 when
  // the sort or the data changes; pages are small (≤100 rows), so no virtualization inside one.
  const paged = !!pageSize && sortedRows.length > 0;
  const pageCount = paged ? Math.ceil(sortedRows.length / pageSize) : 1;
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [sort, rows, pageSize, deferredQuery]);
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => (paged ? sortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : sortedRows),
    [paged, sortedRows, currentPage, pageSize],
  );
  useEffect(() => { if (containerRef.current) containerRef.current.scrollTop = 0; }, [currentPage]);

  const shouldVirtualize = !paged && sortedRows.length > VIRTUALIZE_THRESHOLD;
  // Value text size (Style → Value) scales the body rows; unset keeps the original text-xs / 25px rows.
  const rowHeight = valueTextSize ? Math.round(valueTextSize * 1.4 + 8) : ROW_HEIGHT;

  const { startIndex, endIndex } = useMemo(() => {
    if (!shouldVirtualize) return { startIndex: 0, endIndex: sortedRows.length };
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + BUFFER_ROWS * 2;
    return { startIndex: first, endIndex: Math.min(sortedRows.length, first + visibleCount) };
  }, [shouldVirtualize, scrollTop, viewportHeight, sortedRows.length, rowHeight]);

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

  const topSpacerHeight = shouldVirtualize ? startIndex * rowHeight : 0;
  const bottomSpacerHeight = shouldVirtualize ? (sortedRows.length - endIndex) * rowHeight : 0;
  const visibleRows = shouldVirtualize ? sortedRows.slice(startIndex, endIndex) : pageRows;
  // Grid (Style → Grid): one line color for row lines, column lines and the frame border.
  // Unset keeps the original light line (slate-100 / white at 10% in dark).
  // Light/dark chrome from `isDark` = the card's real background (renderChartWidget), not the
  // app theme's `dark:` classes — a dark card in the light theme still gets dark chrome.
  const tone = (light, dark) => (isDark ? dark : light);
  const lineCls = tone('border-slate-100', 'border-white/10');
  const lineStyle = gridColor ? { borderColor: gridColor } : undefined;
  const rowLines = gridLines !== 'none';
  const colLines = gridLines === 'rows-columns';
  // Pager: ONE color (Style → Rows per page swatch). The current page is filled with it; the other
  // buttons are a faint tint of it with the number in it (darker/lighter text instead when the
  // color itself wouldn't read on the card), so the pager always matches itself in both modes.
  const pagerBase = pagerColor || PAGER_DEFAULT_COLOR;
  const pagerSurface = isDark ? '#22273C' : '#ffffff';
  const pagerVars = {
    '--pg-bg': hexToRgba(pagerBase, isDark ? 0.18 : 0.1),
    '--pg-hover': hexToRgba(pagerBase, isDark ? 0.3 : 0.2),
    '--pg-border': hexToRgba(pagerBase, 0.35),
    '--pg-text': (contrastRatio(pagerBase, pagerSurface) ?? 0) >= 3 ? pagerBase : pickReadableTextColor(pagerSurface, isDark),
  };
  const pagerBtnCls = 'h-6 inline-flex items-center justify-center rounded border tabular-nums border-[color:var(--pg-border)] bg-[var(--pg-bg)] text-[color:var(--pg-text)] hover:bg-[var(--pg-hover)] disabled:opacity-40 disabled:hover:bg-[var(--pg-bg)] disabled:cursor-not-allowed';
  // Row index across the whole result (banding stays continuous from one page to the next).
  const rowOffset = paged ? currentPage * pageSize : startIndex;

  const pageSizeChoices = configuredPageSize && !VIEWER_PAGE_SIZES.includes(configuredPageSize)
    ? [...VIEWER_PAGE_SIZES, configuredPageSize].sort((a, b) => a - b)
    : VIEWER_PAGE_SIZES;
  const fieldCls = `h-6 rounded border ${tone('border-slate-200 bg-white text-slate-700', 'border-white/15 bg-white/5 text-white/80')}`;
  // Inputs on a dark card: transparent (keep-dark-input) so the global dark-mode "inputs are white"
  // rule doesn't paint a white box; on a light card they stay plain inputs.
  const inputDarkCls = isDark ? 'keep-dark-input' : '';
  const fieldBoxCls = tone('border-slate-200 bg-white text-slate-700', 'border-white/15 bg-[#1E2235] text-white/80');

  return (
    <div className="h-full flex flex-col">
    {showToolbar && (
      // Mouse-down stays here so selecting search text / opening the dropdown never starts a
      // widget drag on the dashboard editor's grid.
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`shrink-0 flex items-center gap-2 flex-wrap pb-1.5 text-[11px] ${tone('text-slate-500', 'text-white/60')} ${framed ? 'px-2.5' : 'px-2 pt-1'}`}
      >
        {configuredPageSize && (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            Show
            <span
              ref={sizeAnchorRef}
              className={`h-6 w-[62px] inline-flex items-center rounded border ${fieldBoxCls} focus-within:border-[#EC7D09]`}
              title="Type a number (1–1000) or pick one"
            >
              <input
                type="text"
                inputMode="numeric"
                aria-label="Entries per page"
                value={sizeDraft}
                onChange={(e) => setSizeDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                onBlur={(e) => commitSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { commitSize(e.currentTarget.value); setSizeListOpen(false); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSizeListOpen(true); }
                  if (e.key === 'Escape') { setSizeDraft(String(pageSize)); setSizeListOpen(false); }
                }}
                className={`${inputDarkCls} min-w-0 flex-1 bg-transparent pl-1.5 text-[11px] tabular-nums outline-none`}
              />
              <button
                type="button"
                aria-label="Choose entries per page"
                aria-haspopup="listbox"
                aria-expanded={sizeListOpen}
                onClick={() => setSizeListOpen((o) => !o)}
                className="h-full px-1 inline-flex items-center text-slate-400 hover:text-[#EC7D09]"
              >
                <ChevronDown size={12} className={`transition-transform ${sizeListOpen ? 'rotate-180' : ''}`} />
              </button>
            </span>
            {/* Same list look as the shared Select (Body rows, orange hover, selected bold + check). */}
            <FloatingPanel anchorRef={sizeAnchorRef} open={sizeListOpen} onClose={() => setSizeListOpen(false)} minWidth={96} maxHeight={260}>
              <div role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
                {pageSizeChoices.map((n) => {
                  const isSel = n === pageSize;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => { setViewerPageSize(n); setSizeListOpen(false); }}
                      className={`dp-option flex w-full items-center gap-2 px-3 py-1.5 text-left text-dbe-body text-slate-700 hover:bg-[#EC7D09]/[0.08]${isSel ? ' font-semibold' : ''}`}
                    >
                      <span className="min-w-0 flex-1 tabular-nums">{n}</span>
                      {isSel && <Check size={12} className="shrink-0 text-[#EC7D09]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </FloatingPanel>
            entries per page
          </span>
        )}
        <label className={`h-6 rounded border ${fieldBoxCls} inline-flex items-center gap-1 px-1.5 w-40 max-w-full focus-within:border-[#EC7D09]`}>
          <Search size={11} className="shrink-0 opacity-50" aria-hidden="true" />
          <input
            // type="search" gets the global dark search-box fill in dark mode — only wanted on a dark card.
            type={isDark ? 'search' : 'text'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search table"
            className={`${inputDarkCls} min-w-0 flex-1 bg-transparent outline-none text-[11px] ${tone('placeholder:text-slate-400', 'placeholder:text-white/40')}`}
          />
        </label>
        <span className="ml-auto whitespace-nowrap tabular-nums">
          {deferredQuery ? `${sortedRows.length} of ${rows.length} rows` : `${rows.length} rows`}
        </span>
      </div>
    )}
    <div
      ref={measureRef}
      onScroll={shouldVirtualize ? handleScroll : undefined}
      // Table frame: the grid is set in from the card edges, rounded, with an outer border in
      // the grid line color (the pager stays outside, under it).
      className={`overflow-auto flex-1 min-h-0${framed ? ` mx-2.5 rounded-lg border ${lineCls}${paged ? '' : ' mb-2.5'}` : ''}`}
      style={framed ? lineStyle : undefined}
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
                  className={`relative text-left px-2 py-1.5${colLines && i > 0 ? ` border-l ${lineCls}` : ''} font-semibold ${tone('text-slate-500', 'text-white/85')} whitespace-nowrap overflow-hidden text-ellipsis select-none${headerBgColor ? '' : ` ${tone('bg-slate-50', 'bg-[#2a2f47]')}`}${onReorderColumns ? ' cursor-grab' : ' cursor-pointer'}${dragOverCol === i ? ' ring-2 ring-inset ring-[#EC7D09]' : ''}`}
                  style={{ backgroundColor: headerBgColor || undefined, color: headerTextColor || undefined, ...(colLines && i > 0 ? lineStyle : null) }}
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
                      className={`${inputDarkCls} w-full ${tone('bg-white text-slate-900', 'bg-slate-700 text-white')} border border-[#EC7D09] rounded px-1 py-0.5 text-xs font-normal outline-none`}
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
                        // With column grid lines on, the grid line already marks the edge — the
                        // idle handle line is hidden (it sat 4px inside it, a doubled line) and
                        // only shows, orange, on hover / while dragging.
                        className={`w-px h-full transition-colors ${resizingCol === c ? 'bg-[#EC7D09]' : `${colLines ? 'bg-transparent' : tone('bg-slate-300', 'bg-white/20')} group-hover:bg-[#EC7D09]`}`}
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
            const realIndex = rowOffset + i;
            const bandThisRow = rowBanding && realIndex % 2 === 1;
            return (
            <tr
              key={realIndex}
              className={rowLines ? `border-t ${lineCls}` : undefined}
              style={{ backgroundColor: bandThisRow ? (bandColor || undefined) : undefined, height: valueTextSize ? rowHeight : undefined, ...(rowLines ? lineStyle : null) }}
            >
              {cols.map((c, ci) => {
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
                    className={`px-2 py-1 ${tone('text-slate-600', 'text-white/70')} whitespace-nowrap overflow-hidden text-ellipsis${colLines && ci > 0 ? ` border-l ${lineCls}` : ''}`}
                    style={{
                      ...(colLines && ci > 0 ? lineStyle : null),
                      // Priority: a matching Conditional Formatting text-color rule wins
                      // outright (same "rules override banding" precedence backgroundColor
                      // below already follows); otherwise Band text color applies only on
                      // banded rows, same scope as Band color itself; otherwise the table-wide
                      // Value text color, then the component/theme default.
                      color: (isTextMode && matched) || (bandThisRow && bandTextColor) || valueTextColor || undefined,
                      backgroundColor: (!isTextMode && matched) || undefined,
                      fontSize: valueTextSize ? `${valueTextSize}px` : undefined,
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
          {deferredQuery && sortedRows.length === 0 && (
            <tr><td colSpan={cols.length} className={`px-2 py-3 text-center ${tone('text-slate-400', 'text-white/50')}`}>No matching rows</td></tr>
          )}
        </tbody>
      </table>
    </div>
    {paged && (
      <div
        className={`shrink-0 flex items-center justify-between gap-2 text-[11px] ${tone('text-slate-500', 'text-white/60')} ${framed ? 'px-2.5 py-2' : `px-2 py-1.5 border-t ${lineCls}`}`}
        style={{ ...pagerVars, ...(framed ? null : lineStyle) }}
      >
        <span className="whitespace-nowrap tabular-nums">
          {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedRows.length)} of {sortedRows.length}
        </span>
        {pageCount > 1 && (
          <nav className="flex items-center gap-1" aria-label="Table pages">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              aria-label="Previous page"
              className={`${pagerBtnCls} w-6`}
            >
              <ChevronLeft size={12} />
            </button>
            {pageItems(currentPage, pageCount).map((p) => (typeof p === 'string' ? (
              <span key={p} className="px-0.5">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === currentPage ? 'page' : undefined}
                className={p === currentPage
                  ? 'h-6 min-w-[24px] px-1.5 inline-flex items-center justify-center rounded border tabular-nums font-semibold'
                  : `${pagerBtnCls} min-w-[24px] px-1.5`}
                // Current page: filled with the pager color, text white/dark — whichever reads.
                style={p === currentPage ? {
                  backgroundColor: pagerBase,
                  borderColor: pagerBase,
                  color: pagerColor ? pickReadableTextColor(pagerColor, isDark) : '#ffffff',
                } : undefined}
              >
                {p + 1}
              </button>
            )))}
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Next page"
              className={`${pagerBtnCls} w-6`}
            >
              <ChevronRight size={12} />
            </button>
          </nav>
        )}
      </div>
    )}
    </div>
  );
}
