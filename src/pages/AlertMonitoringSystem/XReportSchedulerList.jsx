import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import FormModal from '../../components/FormModal';
import Button from '../../components/Button';
import AlertConfigurationActions from '../../store/actions/alertConfiguration-actions';

const COLUMNS = [
    { label: 'Report Name', key: 'report_name' },
    { label: 'Frequency',   key: 'frequency' },
    { label: 'Start',       key: 'start_datetime' },
    { label: 'End',         key: 'end_datetime' },
    { label: 'Status',      key: '_status' },
    { label: 'Actions',     key: '_actions' },
];

const STATUS_STYLES = {
    draft:     'bg-slate-100 text-slate-600',
    active:    'bg-green-100 text-green-700',
    paused:    'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    failed:    'bg-red-100 text-red-700',
    deleted:   'bg-slate-200 text-slate-400',
};

const ALLOWED_TRANSITIONS = {
    draft:     ['active', 'deleted'],
    active:    ['paused', 'completed', 'failed', 'deleted'],
    paused:    ['active', 'deleted'],
    completed: ['deleted'],
    failed:    ['deleted'],
    deleted:   [],
};

const STATUS_DOT = {
    draft:     'bg-slate-400',
    active:    'bg-green-500',
    paused:    'bg-yellow-400',
    completed: 'bg-blue-500',
    failed:    'bg-red-500',
    deleted:   'bg-slate-300',
};

const TRANSITION_HOVER = {
    active:    'hover:bg-green-50 hover:text-green-700',
    paused:    'hover:bg-yellow-50 hover:text-yellow-700',
    completed: 'hover:bg-blue-50 hover:text-blue-700',
    failed:    'hover:bg-red-50 hover:text-red-700',
    deleted:   'hover:bg-red-50 hover:text-red-500',
};

const DetailRow = ({ label, value, children }) => (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0 pt-px">{label}</span>
        <span className="text-xs text-slate-700 font-medium text-right">{children ?? value ?? '—'}</span>
    </div>
);

const POPOVER_W_MOBILE = 200;
const POPOVER_W_SM     = 380;
const POPOVER_W_LG     = 480;

const DetailsPopover = ({ item }) => {
    const [open, setOpen]     = useState(false);
    const [pos,  setPos]      = useState({ top: 0, left: 0, width: POPOVER_W_LG });
    const btnRef              = useRef(null);
    const panelRef            = useRef(null);

    const calcPos = useCallback(() => {
        if (!btnRef.current) return;
        const vw       = window.innerWidth;
        const pw       = vw < 640 ? POPOVER_W_MOBILE : vw < 1024 ? POPOVER_W_SM : POPOVER_W_LG;
        const rect     = btnRef.current.getBoundingClientRect();
        const gap      = 6;

        // boundary: constrain within the nearest [data-table-boundary] ancestor
        const boundary = btnRef.current.closest('[data-table-boundary]');
        const bRect    = boundary ? boundary.getBoundingClientRect() : { left: 8, right: vw - 8 };

        // cap width to boundary width
        const width = Math.min(pw, bRect.right - bRect.left);

        // horizontal: align right edge to button right, clamp within boundary
        let left = rect.right - width;
        if (left < bRect.left) left = bRect.left;
        if (left + width > bRect.right) left = bRect.right - width;

        // always open below, cap height to remaining viewport space
        const top  = rect.bottom + gap;
        const maxH = Math.min(window.innerHeight - top - 8, 440);

        setPos({ top, left, width, maxH });
    }, []);

    const toggle = () => {
        if (!open) calcPos();
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const close  = (e) => { if (!btnRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) setOpen(false); };
        const reflow = () => { calcPos(); };
        document.addEventListener('mousedown', close);
        window.addEventListener('resize', reflow);
        window.addEventListener('scroll', reflow, true);
        return () => {
            document.removeEventListener('mousedown', close);
            window.removeEventListener('resize', reflow);
            window.removeEventListener('scroll', reflow, true);
        };
    }, [open, calcPos]);

    const gridCols = pos.width >= POPOVER_W_LG ? 3 : pos.width >= POPOVER_W_SM ? 2 : 1;

    const panel = open && (
        <div
            ref={panelRef}
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, position: 'fixed', zIndex: 9999 }}
            className="bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
        >
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
                <p className="text-xs font-semibold text-slate-600 truncate">{item.report_name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Additional details</p>
            </div>

            <div className="px-4 py-2 overflow-y-auto flex flex-col gap-3">
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gap: '8px 16px' }}>
                    {[
                        { label: 'Source Type',     value: item.source_type },
                        { label: 'Source ID',       value: item.source_id },
                        { label: 'Output Format',   value: item.output_format?.toUpperCase() },
                        { label: 'Theme',           value: item.theme },
                        { label: 'Day of Week',     value: item.day_of_week },
                        { label: 'Run Count',       value: item.run_count ?? 0 },
                        { label: 'Failures',        value: item.failure_count ?? 0 },
                        { label: 'Last Run',        value: item.last_run_at },
                        { label: 'Next Run',        value: item.next_run_at },
                        { label: 'Last Run Status', value: null, custom:
                            item.last_run_status
                                ? <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${RUN_STATUS_STYLES[item.last_run_status] || 'bg-slate-100 text-slate-500'}`}>
                                    {item.last_run_status}
                                  </span>
                                : <span className="text-slate-400">—</span>
                        },
                        { label: 'Created At',  value: item.create_time },
                        { label: 'Updated At',  value: item.update_time },
                    ].map(({ label, value, custom }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                            {custom ?? <span className="text-[11px] text-slate-700 font-medium break-all">{value ?? '—'}</span>}
                        </div>
                    ))}
                </div>

                {item.last_error && (
                    <div className="flex flex-col gap-0.5 pt-2 border-t border-slate-100">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Last Error</span>
                        <span className="text-[11px] text-red-500 break-all">{item.last_error}</span>
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Mail Subject</span>
                        <span className="text-[11px] text-slate-700 font-medium">{item.mail_subject || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Mail Body</span>
                        <span className="text-[11px] text-slate-600 whitespace-pre-wrap break-words">{item.mail_body || '—'}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Recipients</span>
                    {item.mail_recipients
                        ? <div className="flex flex-wrap gap-1">
                            {String(item.mail_recipients).split(/[,;]+/).map(e => e.trim()).filter(Boolean).map((email) => (
                                <span key={email} className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                                    {email}
                                </span>
                            ))}
                          </div>
                        : <span className="text-[11px] text-slate-400">—</span>
                    }
                </div>
            </div>
        </div>
    );

    return (
        <div className="inline-flex">
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                title="View details"
                className={`flex items-center justify-center w-7 h-7 rounded-md border transition-colors
                    ${open ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
            </button>
            {createPortal(panel, document.body)}
        </div>
    );
};

const StatusDropdown = ({ item, isUpdating, onSelect }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const current = item.status;
    const transitions = ALLOWED_TRANSITIONS[current] ?? [];

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative inline-flex">
            <button
                type="button"
                disabled={isUpdating || transitions.length === 0}
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all
                    ${STATUS_STYLES[current] || 'bg-slate-100 text-slate-500 border-slate-200'}
                    ${transitions.length > 0 && !isUpdating ? 'cursor-pointer hover:shadow-sm hover:brightness-95 border-transparent' : 'border-transparent cursor-default'}
                `}
            >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[current] || 'bg-slate-400'}`} />
                <span className="capitalize">{current || '—'}</span>
                {isUpdating
                    ? <svg className="animate-spin h-3 w-3 ml-0.5 opacity-60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : transitions.length > 0 && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 ml-0.5"><polyline points="6 9 12 15 18 9"/></svg>
                }
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[148px] bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 overflow-hidden">
                    <p className="px-3 pt-0.5 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        Change status
                    </p>
                    {transitions.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => { setOpen(false); onSelect(s); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors ${TRANSITION_HOVER[s] || 'hover:bg-slate-50'}`}
                        >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s] || 'bg-slate-400'}`} />
                            <span className="capitalize">{s}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const RUN_STATUS_STYLES = {
    success: 'bg-green-100 text-green-700',
    failed:  'bg-red-100 text-red-700',
    running: 'bg-orange-100 text-orange-700',
    pending: 'bg-slate-100 text-slate-600',
};

const Badge = ({ value, styleMap }) => {
    if (!value) return <span className="text-slate-400 text-xs">—</span>;
    const cls = styleMap[value] || 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>
            {value === 'running' && (
                <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
            )}
            {value}
        </span>
    );
};

const XReportSchedulerList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(null); // id of row being updated

    const fetchList = () => {
        dispatch(AlertConfigurationActions.getReportSchedulerList((data) => setList(data)));
    };

    useEffect(() => { fetchList(); }, []);

    const openDelete = (itm) => {
        setDeleteTarget(itm);
        setDeleteModalOpen(true);
    };

    const handleStatusChange = (itm, newStatus) => {
        setStatusUpdating(itm.id);
        dispatch(AlertConfigurationActions.putReportScheduler(
            itm.id,
            { status: newStatus },
            () => { fetchList(); setStatusUpdating(null); },
            () => { setStatusUpdating(null); }
        ));
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        dispatch(AlertConfigurationActions.deleteReportScheduler(deleteTarget.id, () => {
            fetchList();
            setDeleting(false);
            setDeleteModalOpen(false);
            setDeleteTarget(null);
        }));
    };

    const renderCell = (itm, col) => {
        if (col.key === '_status') {
            return (
                <StatusDropdown
                    item={itm}
                    isUpdating={statusUpdating === itm.id}
                    onSelect={(newStatus) => handleStatusChange(itm, newStatus)}
                />
            );
        }
        if (col.key === '_actions') {
            return (
                <span className="flex items-center gap-1.5">
                    <DetailsPopover item={itm} />
                    <button onClick={() => navigate(`/xalerts/report-scheduler/edit/${itm.id}`)}
                        title="Edit"
                        className="flex items-center justify-center w-7 h-7 rounded-md border border-blue-200 text-blue-500 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button onClick={() => openDelete(itm)}
                        title="Delete"
                        className="flex items-center justify-center w-7 h-7 rounded-md border border-red-200 text-red-400 bg-white hover:bg-red-50 hover:border-red-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </button>
                </span>
            );
        }
        if (col.key === 'start_datetime' || col.key === 'end_datetime') {
            const raw = itm[col.key];
            if (!raw) return <span className="text-slate-400 text-xs">—</span>;
            const clean = raw.replace('T', ' ').slice(0, 16);
            return <span className="text-xs text-slate-600 whitespace-nowrap">{clean}</span>;
        }
        const val = itm[col.key];
        return (
            <span className="truncate max-w-[160px] block" title={String(val ?? '')}>
                {val ?? '—'}
            </span>
        );
    };

    return (
        <>
            <div data-table-boundary className="flex flex-col h-full overflow-hidden p-5 gap-4" style={{ background: '#ffffff' }}>

                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: '#0b1830' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">Report Scheduler</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Manage scheduled report deliveries</p>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/xalerts/report-scheduler/new')} variant="primary">
                        + New Report
                    </Button>
                </div>

                <DataTable
                    columns={COLUMNS}
                    data={list}
                    renderCell={renderCell}
                    emptyMessage="No report schedulers configured."
                    searchPlaceholder="Search reports..."
                    countLabel="report"
                />
            </div>

            {/* Delete confirmation modal */}
            <FormModal title="Delete Report Scheduler" headerColor="#b91c1c" isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
                <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">
                        Delete <strong>{deleteTarget?.report_name}</strong>?
                    </p>
                    <p className="text-xs text-red-400">This action cannot be undone.</p>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <button type="button" onClick={() => setDeleteModalOpen(false)}
                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={confirmDelete} disabled={deleting}
                        className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
                        style={{ background: '#b91c1c' }}>
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </FormModal>
        </>
    );
};

export default XReportSchedulerList;
