import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import AutoSuggestion from '../../components/FormElements/AutoSuggestion';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';

const FILTERS = ['All', 'Issues only', 'Warnings', 'OK only', 'Accessibility', 'Capacity', 'Mobility', 'Integrity', 'Quality'];

const COLUMNS = [
    { label: 'Tech',             key: '_tech'     },
    { label: 'Rule Name',        key: 'rule_name' },
    { label: 'Category',         key: '_category' },
    { label: 'Details',          key: 'details'   },
    { label: 'Status',           key: '_status'   },
    { label: 'Issues / Remarks', key: '_issues'   },
];

const statusColor = (s = '') => {
    const v = s.toLowerCase();
    if (v.includes('issue'))   return '#dc2626';
    if (v.includes('warning')) return '#d97706';
    if (v === 'ok')            return '#16a34a';
    return '#374151';
};

const categoryColor = (c = '') => {
    switch (c.toLowerCase()) {
        case 'capacity':      return '#7c3aed';
        case 'integrity':     return '#0891b2';
        case 'mobility':      return '#0d9488';
        case 'accessibility': return '#2563eb';
        case 'quality':       return '#be185d';
        default:              return '#374151';
    }
};

const renderCell = (row, col) => {
    if (col.key === '_tech')     return <span className="font-medium text-slate-700">{row.tech || row.technology || '-'}</span>;
    if (col.key === '_category') return <span className="font-semibold" style={{ color: categoryColor(row.category) }}>{row.category || '-'}</span>;
    if (col.key === '_status')   return <span className="font-semibold" style={{ color: statusColor(row.status) }}>{row.status || '-'}</span>;
    if (col.key === '_issues')   return <span className="text-slate-600">{row.issues || row.remarks || '-'}</span>;
    const val = row[col.key];
    return <span className="text-slate-700">{val ?? '-'}</span>;
};

const CellProRulesPage = () => {
    const dispatch = useDispatch();

    const url         = new URL(window.location.href);
    const params      = new URLSearchParams(url.search);
    const urlCellName = params.get('cellName') || params.get('uniqueId') || '';

    const uniquePhysicalIdList = useSelector((s) => s?.nokiaPrePost?.uniqueCellId);

    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm({
        defaultValues: { cell_name: urlCellName },
    });

    const [cellName,     setCellName]     = useState(urlCellName);
    const [date,         setDate]         = useState(new Date().toISOString().slice(0, 10));
    const [cellData,     setCellData]     = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);
    const [filter,       setFilter]       = useState('All');

    useEffect(() => {
        if (urlCellName) fetchCellProRules(urlCellName, date);
    }, []);

    useEffect(() => { applyFilter(); }, [cellData, filter]);

    const fetchCellProRules = async (name, useDate) => {
        if (!name) { setError('Please enter a Cell Name.'); return; }
        setLoading(true); setError(null);
        try {
            const response = await Api.get({
                url: `${Urls.cell_pro_rules}?cell_name=${encodeURIComponent(name)}&date=${encodeURIComponent(useDate)}`,
                inst: 0,
            });
            if (response?.status === 200 && response.data?.data) {
                setCellData(response.data.data);
            } else {
                setCellData([]); setError('No data returned from API.');
            }
        } catch (err) {
            setCellData([]); setError('Error fetching data.');
            if (import.meta.env.DEV) console.warn('[cell-pro-rules]', err?.message);
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = () => {
        if (!cellData?.length) { setFilteredData([]); return; }
        if (filter === 'All')  { setFilteredData(cellData); return; }
        const n = filter.toLowerCase();
        setFilteredData(cellData.filter((row) => {
            if (n === 'issues only') return row.status?.toLowerCase().includes('issue');
            if (n === 'warnings')    return row.status?.toLowerCase().includes('warning');
            if (n === 'ok only')     return row.status?.toLowerCase() === 'ok';
            return row.category?.toLowerCase() === n;
        }));
    };

    const onSubmit = (formData) => {
        const name = formData.cell_name || cellName;
        setCellName(name);
        fetchCellProRules(name, date);
    };

    const ok       = cellData.filter((r) => r.status?.toLowerCase() === 'ok').length;
    const issues   = cellData.filter((r) => r.status?.toLowerCase().includes('issue')).length;
    const warnings = cellData.filter((r) => r.status?.toLowerCase().includes('warning')).length;
    const total    = cellData.length;
    const health   = total ? Math.round((ok / total) * 100) : 0;

    const cellIdSelector = {
        label: 'Cell Name',
        name: 'cell_name',
        value: 'Select',
        type: 'text',
        datalist: 'listData',
        defaultValue: urlCellName,
        option: uniquePhysicalIdList,
        props: {
            onChange: (e) => {
                setCellName(e.target.value);
                if (e.target.value.length >= 2) {
                    dispatch(nokiaPrePostActions.getuniquecellid(true, 'getData=' + e.target.value));
                }
            },
        },
        required: true,
    };

    const emptyMessage = loading
        ? 'Loading…'
        : error || (total === 0 && cellData.length === 0 ? 'Enter a Cell Name and click Submit to load data.' : 'No records match this filter.');

    return (
        <div
            className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-5 gap-4"
            style={{ background: '#ffffff' }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                        style={{ background: '#0b1830' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 15l5-5 5 5" />
                            <path d="M12 20V4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">Cell Pro Rules</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Manage cell rule status and health in the same style as DB Configuration</p>
                    </div>
                </div>

                {/* ── Form controls ── */}
                <div className="flex items-end gap-3">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Cell Name</label>
                        <AutoSuggestion itm={cellIdSelector} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </div>
                    <Button onClick={handleSubmit(onSubmit)} name="Submit" variant="primary" className="h-9" />
                </div>
            </div>

            {/* ── Filter pills ── */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Filter:</span>
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`py-1 px-3 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* ── Stats strip ── */}
            {total > 0 && (
                <div className="grid grid-cols-5 gap-3 shrink-0">
                    {[
                        { label: 'Rules OK',    value: ok,           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                        { label: 'Issues',      value: issues,       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                        { label: 'Warnings',    value: warnings,     color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                        { label: 'Total Rules', value: total,        color: '#1e293b', bg: '#f8fafc', border: '#e2e8f0' },
                        { label: 'Health',      value: `${health}%`, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
                    ].map(({ label, value, color, bg, border }) => (
                        <div
                            key={label}
                            className="rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1"
                            style={{ background: bg, border: `1.5px solid ${border}` }}
                        >
                            <span style={{ color }} className="text-2xl font-bold leading-none">{value}</span>
                            <span className="text-[10px] uppercase leading-none font-semibold mt-0.5" style={{ color }}>{label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── DataTable ── */}
            <DataTable
                columns={COLUMNS}
                data={loading ? [] : filteredData}
                renderCell={renderCell}
                emptyMessage={emptyMessage}
                searchPlaceholder="Search rules…"
                countLabel="rule"
            />
        </div>
    );
};

export default CellProRulesPage;
