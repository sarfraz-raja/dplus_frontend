import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';

const COLUMNS = [
    { label: 'Vendor',           key: 'vendor'           },
    { label: 'Measurement ID',   key: 'measurement_id'   },
    { label: 'Measurement Name', key: 'measurement_name' },
    { label: 'Type',             key: 'type'             },
    { label: 'Active',           key: 'is_active'        },
    { label: 'Raw Schema',       key: 'raw_schema'       },
    { label: 'Hourly Schema',    key: 'hourly_schema'    },
    { label: 'Select Top',       key: 'select_top'       },
    { label: 'GID Table',        key: 'gid_table'        },
    { label: 'GID Join Col',     key: 'gid_join_col'     },
    { label: 'GID Filter Col',   key: 'gid_filter_col'   },
    { label: 'Group By',         key: 'group_by'         },
    { label: 'Del Join Col',     key: 'del_join_col'     },
    { label: 'Del Filter Col',   key: 'del_filter_col'   },
    { label: 'Conflict Cols',    key: 'conflict_cols'    },
];

const KPIMeasurements = () => {
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        setLoading(true);
        Api.get({ url: `${Urls.kpi_measurements}?page=1&page_size=50` })
            .then(res => {
                if (res?.status !== 200) throw new Error(`HTTP ${res?.status}`);
                setData(res?.data?.data?.data ?? []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const handleExport = () => {
        if (!data.length) return;
        const headers = COLUMNS.map(c => c.label).join(',');
        const rows = data.map(row =>
            COLUMNS.map(c => {
                const val = row[c.key] ?? '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'kpi_measurements.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderCell = (row, col) => {
        if (col.key === 'is_active') {
            return row.is_active
                ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                : <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">Inactive</span>;
        }

        if (col.key === 'type') {
            return (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {row.type ?? '—'}
                </span>
            );
        }

        // Long SQL / expression columns — monospace + truncate with full value on hover
        const longCols = ['gid_join_col', 'gid_filter_col', 'del_join_col', 'del_filter_col'];
        if (longCols.includes(col.key)) {
            const val = row[col.key] ?? '—';
            return (
                <span
                    className="truncate max-w-[220px] block text-xs font-mono text-slate-600"
                    title={val}
                >
                    {val}
                </span>
            );
        }

        const val = row[col.key] ?? '—';
        return (
            <span className="truncate max-w-[160px] block text-slate-700" title={String(val)}>
                {String(val)}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4" style={{ background: '#ffffff' }}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">KPI Measurements</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Browse and manage KPI measurement configurations</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="primary" size="md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Import
                    </Button>
                    <Button variant="primary" size="md" onClick={handleExport}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Export
                    </Button>
                </div>
            </div>

            {/* ── Body ── */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Loading measurements…
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
                    Failed to load measurements: {error}
                </div>
            ) : (
                <DataTable
                    columns={COLUMNS}
                    data={data}
                    renderCell={renderCell}
                    emptyMessage="No measurements found."
                    searchPlaceholder="Search measurements…"
                    countLabel="measurement"
                />
            )}
        </div>
    );
};

export default KPIMeasurements;
