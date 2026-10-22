import { useState, useMemo, useRef } from 'react';
import Table, { TableCell, TableEmpty, TableRow, tableFrameCls } from './Table';
import Select from './Select';
import FloatingPanel from './FloatingPanel';

/** Case-insensitive value getter — handles PascalCase/camelCase/lowercase API keys */
const getVal = (row, key) => {
    if (row == null) return undefined;
    if (key in row) return row[key];
    const lower = key.toLowerCase();
    const match = Object.keys(row).find(k => k.toLowerCase() === lower);
    return match ? row[match] : undefined;
};

/**
 * Reusable data table — consistent with DBConfig / XAlertConfigure styling.
 *
 * Props
 * ─────
 * columns          [{ label, key }]
 * data             array of row objects
 * renderCell       (row, col) => ReactNode   (optional)
 * emptyMessage     string
 * searchPlaceholder string
 * countLabel       singular noun for footer  e.g. "rule", "alert"
 * rppOptions       number[]  default [15,30,45,100]
 * rowKey           row field name or (row) => key, for stable row keys (default: row index)
 *
 * The look (header, rows, cells, empty state, frame) comes from Table.jsx — style it there.
 *
 * filters          Client-side column filters shown as inline controls:
 *                  [{ label, key, type: 'select'|'text', options?: [{label,value}] }]
 *                  Each filter is AND-ed with search.
 */
const DataTable = ({
    columns = [],
    data = [],
    renderCell,
    emptyMessage = 'No records found.',
    searchPlaceholder = 'Search…',
    countLabel = 'record',
    rppOptions = [15, 30, 50, 100, 200],
    filters = [],
    rowKey,
}) => {
    const colToggleRef = useRef(null);
    const [hiddenCols,    setHiddenCols]    = useState([]);
    const [showColToggle, setShowColToggle] = useState(false);
    const [currentPage,   setCurrentPage]   = useState(1);
    const [rpp,           setRpp]           = useState(rppOptions[0]);
    const [search,        setSearch]        = useState('');

    // One state entry per filter key, initialised to ''
    const [filterValues, setFilterValues] = useState(
        () => Object.fromEntries(filters.map(f => [f.key, '']))
    );

    const setFilter = (key, value) => {
        setFilterValues(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearAllFilters = () => {
        setFilterValues(Object.fromEntries(filters.map(f => [f.key, ''])));
        setSearch('');
        setCurrentPage(1);
    };

    const activeFilterCount = Object.values(filterValues).filter(v => v !== '').length
        + (search.trim() ? 1 : 0);

    const toggleCol = (key) =>
        setHiddenCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const visibleCols = columns.filter(col => !hiddenCols.includes(col.key));

    const filtered = useMemo(() => {
        let rows = data;

        // Apply each column filter (case-insensitive key lookup)
        for (const f of filters) {
            const val = filterValues[f.key];
            if (!val) continue;
            if (f.type === 'select') {
                rows = rows.filter(row => String(getVal(row, f.key) ?? '') === val);
            } else {
                rows = rows.filter(row =>
                    String(getVal(row, f.key) ?? '').toLowerCase().includes(val.toLowerCase())
                );
            }
        }

        // Apply search across all columns
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(row =>
                Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
            );
        }

        return rows;
    }, [data, filterValues, search, filters]);

    const total      = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / rpp));
    const startIdx   = (currentPage - 1) * rpp;
    const endIdx     = Math.min(startIdx + rpp, total);
    const pageRows   = filtered.slice(startIdx, endIdx);

    const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

    const defaultRenderCell = (row, col) => {
        const val = getVal(row, col.key);
        return (
            <span className="truncate max-w-[180px] block" title={String(val ?? '')}>
                {val}
            </span>
        );
    };

    const cellRenderer = renderCell || defaultRenderCell;

    const getRowKey = (row, idx) => {
        const k = typeof rowKey === 'function' ? rowKey(row) : rowKey ? getVal(row, rowKey) : undefined;
        return k ?? idx;
    };

    const paginationPages = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
        .reduce((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
            acc.push(p);
            return acc;
        }, []);

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-3">

            {/* ── Toolbar: search + filters + column toggle ── */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">

                {/* Search */}
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder={searchPlaceholder}
                    className="w-64 px-3 py-1.5 text-ui-body border border-line rounded-lg bg-field text-content placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />

                {/* Column-specific filters */}
                {filters.map(f => (
                    <div key={f.key} className="flex items-center gap-1">
                        <span className="text-ui-small text-muted font-medium">{f.label}:</span>
                        {f.type === 'select' ? (
                            <Select
                                value={filterValues[f.key] ?? ''}
                                onChange={(e) => setFilter(f.key, e.target.value)}
                                aria-label={f.label}
                                className="min-w-[96px] px-2 py-1.5 text-ui-small border border-line rounded-lg bg-field text-content focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                            >
                                <option value="">All</option>
                                {(f.options ?? []).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </Select>
                        ) : (
                            <input
                                type="text"
                                value={filterValues[f.key] ?? ''}
                                onChange={(e) => setFilter(f.key, e.target.value)}
                                placeholder={`Filter ${f.label}…`}
                                className="px-2 py-1.5 text-ui-small border border-line rounded-lg bg-field text-content placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 w-36"
                            />
                        )}
                    </div>
                ))}

                {/* Clear all */}
                {activeFilterCount > 0 && (
                    <button
                        onClick={clearAllFilters}
                        className="px-2 py-1.5 text-ui-small font-medium text-muted border border-line rounded-lg bg-surface-2 hover:border-accent transition-colors"
                    >
                        ✕ Clear
                    </button>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Count */}
                <span className="text-ui-small text-muted font-medium">
                    {total} {countLabel}{total !== 1 ? 's' : ''}
                </span>

                {/* Column toggle */}
                <div>
                    <button
                        ref={colToggleRef}
                        type="button"
                        aria-expanded={showColToggle}
                        onClick={() => setShowColToggle(p => !p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-ui-small font-medium border border-line rounded-lg bg-surface-2 hover:border-accent text-content transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/>
                        </svg>
                        Columns
                    </button>
                    {/* OLD: absolute top-9 popup — could be clipped by an overflow parent; FloatingPanel can't */}
                    <FloatingPanel anchorRef={colToggleRef} open={showColToggle} onClose={() => setShowColToggle(false)} minWidth={160} align="end">
                        <div className="p-3">
                            {columns.map(col => (
                                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-ui-body text-content">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenCols.includes(col.key)}
                                        onChange={() => toggleCol(col.key)}
                                    />
                                    {col.label}
                                </label>
                            ))}
                        </div>
                    </FloatingPanel>
                </div>
            </div>

            {/* ── Glass table ── */}
            <div className={tableFrameCls}>
                <Table headers={visibleCols.map(col => col.label)} className="w-full min-w-max">
                    <tbody>
                        {pageRows.length === 0 ? (
                            <TableEmpty colSpan={visibleCols.length}>{emptyMessage}</TableEmpty>
                        ) : (
                            pageRows.map((row, idx) => (
                                <TableRow key={getRowKey(row, startIdx + idx)} index={idx}>
                                    {visibleCols.map(col => (
                                        <TableCell key={col.key}>
                                            {cellRenderer(row, col)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>

            {/* ── Pagination footer ── */}
            <div className="flex items-center justify-between shrink-0 text-ui-small text-muted">
                <span>
                    {total === 0
                        ? `No ${countLabel}s`
                        : `Showing ${Math.min(startIdx + 1, total)}–${endIdx} of ${total}`}
                </span>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1">
                        Rows per page:
                        <Select
                            value={rpp}
                            onChange={(e) => { setRpp(Number(e.target.value)); setCurrentPage(1); }}
                            aria-label="Rows per page"
                            className="ml-1 w-16 border border-line bg-field text-content rounded px-1.5 py-0.5 text-ui-small"
                        >
                            {rppOptions.map(n => <option key={n} value={n}>{n}</option>)}
                        </Select>
                    </label>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-2 py-0.5 border border-line text-content rounded disabled:opacity-40 hover:bg-hoverlay"
                        >‹</button>

                        {paginationPages.map((p, i) =>
                            p === '…'
                                ? <span key={`e-${i}`} className="px-1">…</span>
                                : <button
                                    key={p}
                                    onClick={() => goToPage(p)}
                                    className={`px-2 py-0.5 border rounded ${currentPage === p ? 'bg-accent text-white border-accent' : 'border-line text-content hover:bg-hoverlay'}`}
                                >{p}</button>
                        )}

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-2 py-0.5 border border-line text-content rounded disabled:opacity-40 hover:bg-hoverlay"
                        >›</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
