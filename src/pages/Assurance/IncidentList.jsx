import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';
import { getApiErrorMessage } from '../../utils/common';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import IncidentModal from '../Tickets/IncidentModal';

// Incident List — GET /incidents (API doc Section 8). Read-only: incidents are created, cleared
// and reopened entirely by the correlation/verification engines, so there is no New/Close action.
// Loaded once and on Refresh (no background polling — same approach as the Tickets board); the
// detail view (IncidentModal) polls on its own while an incident is CLEARING.

const COLUMNS = [
    { label: 'Node',           key: '_node' },
    { label: 'Status',         key: 'status' },
    { label: 'Severity',       key: 'severity' },
    { label: 'Alarms',         key: '_alarms' },
    { label: 'First Occurred', key: 'first_occurred_at' },
    { label: 'Last Occurred',  key: 'last_occurred_at' },
    { label: 'Actions',        key: '_actions' },
];

// The API also accepts ?status= / ?node_id= — applied client-side here since the whole list is
// already loaded (same as the rule list's filters).
const FILTERS = [
    { label: 'Status',  key: 'status',  type: 'select', options: ['ACTIVE', 'CLEARING', 'CLEARED'].map((s) => ({ label: s, value: s })) },
    { label: 'Node ID', key: 'node_id', type: 'text' },
];

const STATUS_STYLE = {
    ACTIVE:   'bg-red-50 text-red-600 border-red-200',
    CLEARING: 'bg-amber-50 text-amber-600 border-amber-200',
    CLEARED:  'bg-green-50 text-green-600 border-green-200',
};

const formatDateTime = (ts) =>
    ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const IncidentList = () => {
    const navigate = useNavigate();
    const [incidents, setIncidents] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [openIncidentId, setOpenIncidentId] = useState(null);

    const load = async (silent = false) => {
        if (silent) setRefreshing(true);
        try {
            const res = await Api.get({ url: Urls.assurance_incidents, inst: silent ? 0 : 1 });
            if (res?.status === 200) {
                setIncidents(res.data?.data ?? []);
            } else {
                toast.error(getApiErrorMessage(res));
            }
        } catch (err) {
            if (import.meta.env.DEV) console.warn('[incidents] list fetch failed', err);
            toast.error('Failed to load incidents');
        } finally {
            if (silent) setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    // A ticket picked inside the incident view opens on the Tickets page (lifecycle actions + chat
    // live there). The row is passed along so it opens even if ticket_list doesn't include it.
    const openTicket = (ticket) => {
        setOpenIncidentId(null);
        navigate('/tickets', { state: { openTicket: ticket } });
    };

    const renderCell = (itm, col) => {
        if (col.key === '_node') {
            return <span className="font-medium text-slate-700">{itm.node_type} {itm.node_id}</span>;
        }
        if (col.key === 'status') {
            return (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[itm.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {itm.status}
                </span>
            );
        }
        if (col.key === '_alarms') {
            return <span className="text-slate-700">{itm.active_alarm_count ?? 0} active / {itm.affected_alarm_count ?? 0} total</span>;
        }
        if (col.key === 'first_occurred_at' || col.key === 'last_occurred_at') {
            return <span className="text-slate-600">{formatDateTime(itm[col.key])}</span>;
        }
        if (col.key === '_actions') {
            return (
                <button onClick={() => setOpenIncidentId(itm.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                </button>
            );
        }
        const val = itm[col.key];
        return <span className="truncate max-w-[160px] block" title={String(val ?? '')}>{val ?? '—'}</span>;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden p-5 gap-4" style={{ background: '#ffffff' }}>
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0" style={{ background: '#0b1830' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="3" />
                            <circle cx="4" cy="6" r="2" />
                            <circle cx="20" cy="6" r="2" />
                            <circle cx="12" cy="21" r="2" />
                            <path d="M6 7l4 3M18 7l-4 3M12 15v4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">Incidents</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Intelligent Telecom Assurance — correlated alarms (read-only, fully automatic)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => load(true)} disabled={refreshing} title="Refresh" aria-label="Refresh incidents"
                        className="p-2 text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50">
                        <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    {/* Way back to the rule list — the entry point to this page until the backend
                        sidebar menu lists /assurance/incidents. */}
                    <Button onClick={() => navigate('/assurance/rules')} variant="secondary">
                        &larr; Assurance Rules
                    </Button>
                </div>
            </div>

            <DataTable
                columns={COLUMNS}
                data={incidents}
                renderCell={renderCell}
                emptyMessage="No incidents. Incidents appear here automatically when a rule with incident correlation sees enough cells breach at one site."
                searchPlaceholder="Search incidents..."
                countLabel="incident"
                filters={FILTERS}
            />

            <IncidentModal
                isOpen={!!openIncidentId}
                onClose={() => { setOpenIncidentId(null); load(true); }}
                incidentId={openIncidentId}
                onOpenTicket={openTicket}
            />
        </div>
    );
};

export default IncidentList;
