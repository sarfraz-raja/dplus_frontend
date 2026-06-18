import { useState, useMemo } from 'react';
import Table from './Table';

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
}) => {
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
                    className="w-64 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
                />

                {/* Column-specific filters */}
                {filters.map(f => (
                    <div key={f.key} className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-medium">{f.label}:</span>
                        {f.type === 'select' ? (
                            <select
                                value={filterValues[f.key] ?? ''}
                                onChange={(e) => setFilter(f.key, e.target.value)}
                                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm text-slate-700"
                            >
                                <option value="">All</option>
                                {(f.options ?? []).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={filterValues[f.key] ?? ''}
                                onChange={(e) => setFilter(f.key, e.target.value)}
                                placeholder={`Filter ${f.label}…`}
                                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm w-36"
                            />
                        )}
                    </div>
                ))}

                {/* Clear all */}
                {activeFilterCount > 0 && (
                    <button
                        onClick={clearAllFilters}
                        className="px-2 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        ✕ Clear
                    </button>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Count */}
                <span className="text-sm text-slate-500 font-medium">
                    {total} {countLabel}{total !== 1 ? 's' : ''}
                </span>

                {/* Column toggle */}
                <div className="relative">
                    <button
                        onClick={() => setShowColToggle(p => !p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/>
                        </svg>
                        Columns
                    </button>
                    {showColToggle && (
                        <div className="absolute left-0 top-9 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[160px]">
                            {columns.map(col => (
                                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenCols.includes(col.key)}
                                        onChange={() => toggleCol(col.key)}
                                    />
                                    {col.label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Glass table ── */}
            <div
                className="flex-1 overflow-auto rounded-xl min-h-0 backdrop-blur-md border border-white/60 shadow-lg 
                scrollbar scrollbar-w-2 scrollbar-thumb-[#EC7D09] scrollbar-track-transparent scrollbar-thumb-rounded-none"
                style={{ background: 'rgba(255,255,255,0.55)' }}
            >
                <Table headers={visibleCols.map(col => col.label)} className="w-full min-w-max text-left text-sm">
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={visibleCols.length} className="text-center text-slate-400 py-12 text-sm">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row, idx) => (
                                <tr
                                    key={idx}
                                    className="border-b border-white/40 transition-colors"
                                    style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
                                >
                                    {visibleCols.map(col => (
                                        <td key={col.key} className="px-4 py-3 text-slate-700">
                                            {cellRenderer(row, col)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>

            {/* ── Pagination footer ── */}
            <div className="flex items-center justify-between shrink-0 text-xs text-slate-500">
                <span>
                    {total === 0
                        ? `No ${countLabel}s`
                        : `Showing ${Math.min(startIdx + 1, total)}–${endIdx} of ${total}`}
                </span>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1">
                        Rows per page:
                        <select
                            value={rpp}
                            onChange={(e) => { setRpp(Number(e.target.value)); setCurrentPage(1); }}
                            className="ml-1 border border-slate-300 rounded px-1 py-0.5 text-xs"
                        >
                            {rppOptions.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100"
                        >‹</button>

                        {paginationPages.map((p, i) =>
                            p === '…'
                                ? <span key={`e-${i}`} className="px-1">…</span>
                                : <button
                                    key={p}
                                    onClick={() => goToPage(p)}
                                    className={`px-2 py-0.5 border rounded ${currentPage === p ? 'bg-[#EC7D09] text-white border-[#EC7D09]' : 'border-slate-300 hover:bg-slate-100'}`}
                                >{p}</button>
                        )}

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100"
                        >›</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
