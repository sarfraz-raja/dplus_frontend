import { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';

const COLUMNS = [
    { label: 'ID',             key: 'id'            },
    { label: 'Vendor',         key: 'vendor'        },
    { label: 'Measurement ID', key: 'measurement_id'},
    { label: 'Raw Schema',     key: 'raw_schema'    },
    { label: 'Status',         key: 'status'        },
    { label: 'Queued At',      key: 'queued_at'     },
    { label: 'Started At',     key: 'started_at'    },
    { label: 'Completed At',   key: 'completed_at'  },
    { label: 'Inserted Rows',  key: 'inserted_rows' },
    { label: 'Deleted Rows',   key: 'deleted_rows'  },
    { label: 'Duration (s)',   key: 'duration_secs' },
    { label: 'Retry',          key: 'retry_count'   },
    { label: 'Max Retries',    key: 'max_retries'   },
    { label: 'Error',          key: 'error_msg'     },
];

const STATUS_STYLES = {
    DONE:    'bg-emerald-100 text-emerald-700',
    FAILED:  'bg-red-100 text-red-600',
    PENDING: 'bg-yellow-100 text-yellow-700',
    RUNNING: 'bg-blue-100 text-blue-700',
};

const DATE_STYLES = {
    queued_at:    'bg-amber-50 text-amber-700 border border-amber-200',
    started_at:   'bg-blue-50 text-blue-700 border border-blue-200',
    completed_at: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const KPIProcess = () => {
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        setLoading(true);
        Api.get({ url: `${Urls.kpi_process}?page=1&page_size=50` })
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

    const renderCell = (row, col) => {
        if (col.key === 'status') {
            const cls = STATUS_STYLES[row.status] ?? 'bg-slate-100 text-slate-600';
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{row.status ?? '—'}</span>;
        }

        if (col.key in DATE_STYLES) {
            const val = row[col.key];
            if (!val || val === '—') return <span className="text-slate-300 text-xs">—</span>;
            return (
                <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono whitespace-nowrap ${DATE_STYLES[col.key]}`}>
                    {val}
                </span>
            );
        }

        if (col.key === 'error_msg') {
            return row.error_msg
                ? <span className="truncate max-w-[200px] block text-red-500 text-xs" title={row.error_msg}>{row.error_msg}</span>
                : <span className="text-slate-300 text-xs">—</span>;
        }

        if (col.key === 'duration_secs') {
            const val = row.duration_secs != null ? parseFloat(row.duration_secs).toFixed(3) : '—';
            return <span className="text-slate-700 text-xs font-mono">{val}</span>;
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
            <div className="flex items-center gap-3 shrink-0">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 leading-tight">KPI Process</h1>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">Monitor KPI processing job history and status</p>
                </div>
            </div>

            {/* ── Body ── */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Loading process jobs…
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
                    Failed to load process jobs: {error}
                </div>
            ) : (
                <DataTable
                    columns={COLUMNS}
                    data={data}
                    renderCell={renderCell}
                    emptyMessage="No process jobs found."
                    searchPlaceholder="Search jobs…"
                    countLabel="job"
                />
            )}
        </div>
    );
};

export default KPIProcess;
