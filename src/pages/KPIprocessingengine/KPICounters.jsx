import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import Api from '../../utils/api';

const COLUMNS = [
    { label: 'Vendor',               key: 'vendor'               },
    { label: 'Measurement ID',        key: 'measurement_id'       },
    { label: 'Counter ID',            key: 'counter_id'           },
    { label: 'Col Order',             key: 'column_order'         },
    { label: 'Inner Agg',             key: 'inner_agg'            },
    { label: 'Outer Agg',             key: 'outer_agg'            },
    { label: 'Type',                  key: 'type'                 },
    { label: 'Unit',                  key: 'unit'                 },
    { label: 'Active',                key: 'is_active'            },
    { label: 'Counter Full Name',     key: 'counter_full_name'    },
    { label: 'Counter Limited Name',  key: 'counter_limited_name' },
    { label: 'Description',           key: 'description'          },
];

const KPICounters = () => {
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        setLoading(true);
        Api.get({ url: '/kpi-engine/counters?page=1&page_size=50' })
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
        a.download = 'kpi_counters.csv';
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
            const cls = row.type === 'id'
                ? 'bg-slate-100 text-slate-600'
                : 'bg-blue-100 text-blue-700';
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{row.type}</span>;
        }

        if (col.key === 'counter_full_name' || col.key === 'description') {
            const val = row[col.key] ?? '';
            return <span className="truncate max-w-[200px] block text-slate-700 text-xs font-mono" title={val}>{val}</span>;
        }

        const val = row[col.key] ?? '';
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
                        style={{ background: '#0b1830' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">KPI Counters</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Browse and manage KPI counter definitions</p>
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
                    Loading counters…
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
                    Failed to load counters: {error}
                </div>
            ) : (
                <DataTable
                    columns={COLUMNS}
                    data={data}
                    renderCell={renderCell}
                    emptyMessage="No counters found."
                    searchPlaceholder="Search counters…"
                    countLabel="counter"
                />
            )}
        </div>
    );
};

export default KPICounters;
