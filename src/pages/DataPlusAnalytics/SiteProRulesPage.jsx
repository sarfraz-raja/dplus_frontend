import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import AutoSuggestion from '../../components/FormElements/AutoSuggestion';
import Table from '../../components/Table';
import Button from '../../components/Button';

const FILTERS = ['All', 'Issues only', 'Warnings', 'OK only', 'Accessibility', 'Capacity', 'Mobility', 'Integrity', 'Quality'];

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

const SiteProRulesPage = () => {
    const dispatch = useDispatch();

    const url         = new URL(window.location.href);
    const params      = new URLSearchParams(url.search);
    const urlSiteName = params.get('siteName') || params.get('uniqueId') || '';

    const uniquePhysicalIdList = useSelector((s) => s?.nokiaPrePost?.uniquePhysicalId);

    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm({
        defaultValues: { site_name: urlSiteName },
    });

    const [siteName,     setSiteName]     = useState(urlSiteName);
    const [date,         setDate]         = useState(new Date().toISOString().slice(0, 10));
    const [siteData,     setSiteData]     = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);
    const [filter,       setFilter]       = useState('All');

    useEffect(() => {
        if (urlSiteName) fetchSiteProRules(urlSiteName, date);
        dispatch(nokiaPrePostActions.getuniquephysicalid());
    }, []);

    useEffect(() => { applyFilter(); }, [siteData, filter]);

    const fetchSiteProRules = async (name, useDate) => {
        if (!name) { setError('Please enter a Site Name.'); return; }
        setLoading(true); setError(null);
        try {
            const response = await Api.get({
                url: `${Urls.site_pro_rules}?site_name=${encodeURIComponent(name)}&date=${encodeURIComponent(useDate)}`,
                inst: 0,
            });
            if (response?.status === 200 && response.data?.data) {
                setSiteData(response.data.data);
            } else {
                setSiteData([]); setError('No data returned from API.');
            }
        } catch (err) {
            setSiteData([]); setError('Error fetching data.');
            if (import.meta.env.DEV) console.warn('[site-pro-rules]', err?.message);
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = () => {
        if (!siteData?.length) { setFilteredData([]); return; }
        if (filter === 'All')  { setFilteredData(siteData); return; }
        const n = filter.toLowerCase();
        setFilteredData(siteData.filter((row) => {
            if (n === 'issues only') return row.status?.toLowerCase().includes('issue');
            if (n === 'warnings')    return row.status?.toLowerCase().includes('warning');
            if (n === 'ok only')     return row.status?.toLowerCase() === 'ok';
            return row.category?.toLowerCase() === n;
        }));
    };

    const onSubmit = (formData) => {
        const name = formData.site_name || siteName;
        setSiteName(name);
        fetchSiteProRules(name, date);
    };

    const ok       = siteData.filter((r) => r.status?.toLowerCase() === 'ok').length;
    const issues   = siteData.filter((r) => r.status?.toLowerCase().includes('issue')).length;
    const warnings = siteData.filter((r) => r.status?.toLowerCase().includes('warning')).length;
    const total    = siteData.length;
    const health   = total ? Math.round((ok / total) * 100) : 0;

    const siteIdSelector = {
        label: 'Site Name',
        name: 'site_name',
        value: 'Select',
        type: 'text',
        datalist: 'listData',
        defaultValue: urlSiteName,
        option: uniquePhysicalIdList,
        props: {
            onChange: (e) => {
                setSiteName(e.target.value);
                if (e.target.value.length >= 2) {
                    dispatch(nokiaPrePostActions.getuniquephysicalid(true, 'getData=' + e.target.value));
                }
            },
        },
        required: true,
    };

    return (
        <div className="w-full min-h-full bg-slate-50">
            <div className="flex flex-col min-h-full" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}>

                {/* ── Page header ── */}
                <div className="px-6 py-6">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">Site Pro Rules</h1>
                                    <p className="text-sm text-slate-500">Manage site rule status and health checks.</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Form card ── */}
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
                            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(220px,1fr)_auto] gap-4 items-end">
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Site Name</label>
                                    <AutoSuggestion
                                        itm={siteIdSelector}
                                        errors={errors}
                                        handleSubmit={handleSubmit}
                                        setValue={setValue}
                                        getValues={getValues}
                                        register={register}
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="border border-slate-300 rounded-lg px-3 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <label className="text-[10px] text-transparent uppercase tracking-wide mb-1">-</label>
                                    <Button
                                        onClick={handleSubmit(onSubmit)}
                                        name="Submit"
                                        variant="primary"
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            {/* ── Filter pills ── */}
                            <div className="mt-5 flex flex-wrap items-center gap-2">
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
                        </div>
                    </div>
                </div>

                {/* ── Health summary ── */}
                {total > 0 && (
                    <div className="px-6">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 max-w-5xl">
                            {[
                                { label: 'Rules OK',    value: ok,           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                                { label: 'Issues',      value: issues,       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                                { label: 'Warnings',    value: warnings,     color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                                { label: 'Total Rules', value: total,        color: '#1e293b', bg: '#f8fafc', border: '#e2e8f0' },
                                { label: 'Health',      value: `${health}%`, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
                            ].map(({ label, value, color, bg, border }) => (
                                <div
                                    key={label}
                                    className="rounded-3xl p-4 text-center flex flex-col items-center justify-center gap-1"
                                    style={{ background: bg, border: `1.5px solid ${border}` }}
                                >
                                    <span style={{ color }} className="text-2xl font-bold leading-none">{value}</span>
                                    <span className="text-[10px] uppercase leading-none font-semibold mt-0.5" style={{ color }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Table ── */}
                <div className="min-h-0 overflow-auto px-6 pb-6">
                    <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 shadow-lg overflow-hidden backdrop-blur-md bg-white/90 p-6">
                        <Table headers={[
                            'Tech',
                            'Rule Name',
                            'Category',
                            'Details',
                            'Status',
                            'Issues / Remarks',
                        ]} className="min-w-full text-left text-sm">
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center text-slate-400 py-16 text-sm">Loading...</td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center text-slate-400 py-16 text-sm">
                                            {error || (total === 0 && siteData.length === 0
                                                ? 'Enter a Site Name and click Submit to load data.'
                                                : 'No records match this filter.')}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-4 py-3 border-b border-slate-100 font-medium text-slate-700">
                                                {item.tech || item.technology || '-'}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 text-slate-700">
                                                {item.rule_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 font-semibold"
                                                style={{ color: categoryColor(item.category) }}>
                                                {item.category || '-'}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 text-slate-600">
                                                {item.details || '-'}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 font-semibold"
                                                style={{ color: statusColor(item.status) }}>
                                                {item.status || '-'}
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 text-slate-600">
                                                {item.issues || item.remarks || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SiteProRulesPage;
