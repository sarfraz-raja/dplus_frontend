import { useEffect, useRef, useState } from 'react';
import Api from '../../utils/api';
import toast from 'react-hot-toast';
import FormModal from '../../components/FormModal';
import { getApiErrorMessage } from '../../utils/common';

// Read-only — per ASSURANCE_FRONTEND_API_DOCUMENTATION.md Section 8, there is
// no manual create/close API for incidents; every transition is automatic,
// driven by the correlation/verification engines. GET /incidents/<id> already
// nests both `alarms` and `tickets` in one response, so one call is enough.
const INCIDENT_STATUS_BADGE = {
    ACTIVE:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    CLEARING:  { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    CLEARED:   { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const ALARM_STATUS_BADGE = {
    NORMAL:   { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
    FIRING:   { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    ACTIVE:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    CLEARING: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    CLEARED:  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const Badge = ({ status, map }) => (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
        style={map[status] ? { background: map[status].bg, color: map[status].text, borderColor: map[status].border }
            : { background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}>
        {status || 'Unknown'}
    </span>
);

export default function IncidentModal({ isOpen, onClose, incidentId, onOpenTicket }) {
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    // The incident this modal is currently showing — a response for a previously opened
    // incident that lands late is ignored rather than overwriting the current one.
    const currentIdRef = useRef(null);
    currentIdRef.current = isOpen ? incidentId : null;

    const load = async (silent) => {
        const requestedId = incidentId;
        if (!requestedId) return;
        if (!silent) setLoading(true);
        try {
            // Background/manual refreshes use the no-loader instance so they don't flash the app-wide loader.
            const res = await Api.get({ url: `/incidents/${requestedId}`, inst: silent ? 0 : 1 });
            if (currentIdRef.current !== requestedId) return;
            if (res?.status === 200) {
                setIncident(res.data?.data);
            } else if (!silent) {
                toast.error(getApiErrorMessage(res));
            }
        } catch (err) {
            if (import.meta.env.DEV) console.warn('[incident] fetch failed', err);
            if (!silent && currentIdRef.current === requestedId) toast.error('Failed to load incident');
        } finally {
            if (!silent && currentIdRef.current === requestedId) setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !incidentId) return;
        setIncident(null);
        load(false);
    }, [isOpen, incidentId]);

    // API doc Section 16 / checklist: an incident in CLEARING closes (or reopens) on the backend's
    // 60s verification tick with no frontend action — so only then is the open view polled, and
    // only while the browser tab is visible. Every other state changes only via a new breach, which
    // the Refresh button picks up on demand.
    const pollIncident = isOpen && incident?.status === 'CLEARING';
    useEffect(() => {
        if (!pollIncident) return;
        const tick = () => { if (document.visibilityState === 'visible') load(true); };
        const pollId = setInterval(tick, 30000);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(pollId);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [pollIncident, incidentId]);

    const refreshIncident = async () => {
        setRefreshing(true);
        try { await load(true); } finally { setRefreshing(false); }
    };

    const alarms = incident?.alarms || [];
    const tickets = incident?.tickets || [];
    const masterTicket = tickets.find((t) => t.ticket_type === 'MASTER');
    const childTickets = tickets.filter((t) => t.ticket_type === 'CHILD');

    return (
        <FormModal
            isOpen={isOpen}
            setIsOpen={onClose}
            title="Incident"
            subtitle={incident ? `Node ${incident.node_type || ''} ${incident.node_id || ''}`.trim() : undefined}
            size="lg"
        >
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-orange-500"></div>
                </div>
            ) : !incident ? (
                <p className="text-sm text-slate-400 py-8 text-center">Incident not found.</p>
            ) : (
                <div className="flex flex-col gap-5 text-sm">
                    <div className="flex items-center flex-wrap gap-2">
                        <Badge status={incident.status} map={INCIDENT_STATUS_BADGE} />
                        {incident.correlation_config?.kpi_matching && (
                            <span className="text-xs text-slate-400">{incident.correlation_config.kpi_matching} KPI matching</span>
                        )}
                        {incident.correlation_config?.closure_mode && (
                            <span className="text-xs text-slate-400">· {incident.correlation_config.closure_mode} closure</span>
                        )}
                        <button
                            onClick={refreshIncident}
                            disabled={refreshing}
                            title="Refresh this incident"
                            aria-label="Refresh this incident"
                            className="ml-auto p-1 text-slate-400 hover:text-orange-500 rounded transition-colors disabled:opacity-50"
                        >
                            <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 -mt-3">
                        Incidents are fully automatic — no manual create/close exists. This view is read-only; status/alarms/tickets update as the correlation and verification engines run server-side (refreshed automatically while CLEARING, otherwise use Refresh).
                    </p>

                    {/* Alarms */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-2 pl-2 border-l-2 border-orange-500">
                            Alarms ({alarms.length})
                        </p>
                        {alarms.length === 0 ? (
                            <p className="text-xs text-slate-400">No alarms returned for this incident.</p>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {alarms.map((alarm) => (
                                    <div key={alarm.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-700 truncate">{alarm.node_type} {alarm.node_id}</p>
                                            <p className="text-xs text-slate-400">{alarm.kpi} · last read: {alarm.last_data_status || '—'}</p>
                                        </div>
                                        <Badge status={alarm.status} map={ALARM_STATUS_BADGE} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tickets */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-2 pl-2 border-l-2 border-orange-500">
                            Tickets ({tickets.length})
                        </p>
                        {tickets.length === 0 ? (
                            <p className="text-xs text-slate-400">No tickets linked to this incident yet.</p>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {masterTicket && (
                                    <button
                                        onClick={() => onOpenTicket && onOpenTicket(masterTicket)}
                                        className="flex items-center justify-between gap-2 bg-orange-50 border border-orange-200 rounded-md px-3 py-2 text-left hover:bg-orange-100 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-700 truncate">
                                                <span className="text-[10px] font-bold text-orange-700 mr-1.5">MASTER</span>
                                                {masterTicket.ticket_id} — {masterTicket.title}
                                            </p>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 shrink-0">{masterTicket.status}</span>
                                    </button>
                                )}
                                {childTickets.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => onOpenTicket && onOpenTicket(t)}
                                        className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-left hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-700 truncate">
                                                <span className="text-[10px] font-bold text-slate-500 mr-1.5">CHILD</span>
                                                {t.ticket_id} — {t.title}
                                            </p>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 shrink-0">{t.status}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </FormModal>
    );
}
