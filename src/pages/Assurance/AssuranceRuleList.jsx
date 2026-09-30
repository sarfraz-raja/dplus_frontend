import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import AssuranceActions from '../../store/actions/assurance-actions';

const COLUMNS = [
    { label: 'Rule Name',   key: 'rule_name' },
    { label: 'KPI',         key: 'kpi' },
    { label: 'Severity',    key: 'severity' },
    { label: 'Frequency (mins)', key: 'frequency' },
    { label: 'Generate Ticket',  key: '_generateticket' },
    { label: 'Status',      key: '_status' },
    { label: 'Actions',     key: '_actions' },
];

// Mirrors the filters the API doc lists for the rule list (kpi / severity / enabled). Applied
// client-side by DataTable — the whole list is already loaded, so no extra requests are needed.
const FILTERS = [
    { label: 'Severity', key: 'severity', type: 'select', options: ['Critical', 'Major', 'Minor', 'Warning'].map((s) => ({ label: s, value: s })) },
    { label: 'Status',   key: 'enabled',  type: 'select', options: [{ label: 'Enabled', value: 'true' }, { label: 'Disabled', value: 'false' }] },
    { label: 'KPI',      key: 'kpi',      type: 'text' },
];

const SEVERITY_BADGE = {
    Critical: 'text-red-700',
    Major:    'text-orange-600',
    Minor:    'text-amber-600',
    Warning:  'text-slate-500',
};

const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-9 h-5 bg-slate-200 peer-checked:bg-[#EC7D09] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
    </label>
);

const AssuranceRuleList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const ruleList = useSelector((state) => state?.assurance?.ruleList ?? []);

    const [disableModalOpen, setDisableModalOpen] = useState(false);
    const [disableTarget, setDisableTarget] = useState(null);
    const [toggling, setToggling] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const loadRules = () => dispatch(AssuranceActions.listRules());

    useEffect(() => {
        loadRules();
    }, []);

    // Enabling needs no confirmation — only disabling does, since disabling
    // also suppresses every currently non-CLEARED alarm on this rule
    // server-side, with no reverse API (per the API doc).
    const handleToggle = (itm, checked) => {
        if (!checked) {
            setDisableTarget(itm);
            setDisableModalOpen(true);
            return;
        }
        dispatch(AssuranceActions.toggleRuleStatus(itm.id, true, () => {
            toast.success('Rule enabled');
            loadRules();
        }, (msg) => toast.error(msg)));
    };

    const confirmDisable = () => {
        if (!disableTarget) return;
        setToggling(true);
        dispatch(AssuranceActions.toggleRuleStatus(disableTarget.id, false, () => {
            setToggling(false);
            setDisableModalOpen(false);
            setDisableTarget(null);
            toast.success('Rule disabled');
            loadRules();
        }, (msg) => {
            setToggling(false);
            toast.error(msg);
        }));
    };

    // Soft delete (DELETE /assurance-rules/<id>). A 404 means it was already deleted elsewhere —
    // either way the row is gone, so the list is reloaded.
    const confirmDelete = () => {
        if (!deleteTarget || deleting) return;
        setDeleting(true);
        const done = () => { setDeleting(false); setDeleteTarget(null); loadRules(); };
        dispatch(AssuranceActions.deleteRule(deleteTarget.id, () => {
            toast.success('Rule deleted');
            done();
        }, (msg, status) => {
            toast.error(status === 404 ? 'This rule no longer exists — it may already have been deleted.' : msg);
            if (status === 404) done(); else setDeleting(false);
        }));
    };

    const renderCell = (itm, col) => {
        if (col.key === '_generateticket') {
            const isYes = itm.generate_ticket === true;
            return <span className={`font-medium ${isYes ? 'text-orange-600' : 'text-slate-500'}`}>{isYes ? 'Yes' : 'No'}</span>;
        }
        if (col.key === 'severity') {
            return <span className={`font-medium ${SEVERITY_BADGE[itm.severity] || 'text-slate-600'}`}>{itm.severity}</span>;
        }
        if (col.key === '_status') {
            const isEnabled = itm.enabled === true;
            return (
                <span className="flex items-center gap-2">
                    <Toggle checked={isEnabled} onChange={(e) => handleToggle(itm, e.target.checked)} />
                    <span className={`text-xs font-medium ${isEnabled ? 'text-green-700' : 'text-slate-400'}`}>
                        {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                </span>
            );
        }
        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
                <button onClick={() => navigate(`/assurance/rules/view/${itm.id}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                </button>
                <button onClick={() => navigate(`/assurance/rules/edit/${itm.id}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
                <button onClick={() => setDeleteTarget(itm)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Delete
                </button>
            </span>
        );
        const val = itm[col.key];
        return (
            <span className="truncate max-w-[160px] block" title={String(val ?? '')}>
                {val}
            </span>
        );
    };

    return (
        <>
            <div className="flex flex-col h-full overflow-hidden p-5 gap-4"
                style={{ background: '#ffffff' }}>

                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: '#0b1830' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">Assurance Rules</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Intelligent Telecom Assurance — Rule Builder</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Incidents belong to Assurance (they group a rule's alarms per site). Until the
                            backend sidebar menu lists /assurance/incidents, this is the way in. */}
                        <Button onClick={() => navigate('/assurance/incidents')} variant="secondary">
                            Incidents
                        </Button>
                        <Button onClick={() => navigate('/assurance/rules/new')} variant="primary" className="flex items-center gap-2">
                            + New Alert
                        </Button>
                    </div>
                </div>

                <DataTable
                    columns={COLUMNS}
                    data={ruleList}
                    renderCell={renderCell}
                    emptyMessage="No assurance rules found."
                    searchPlaceholder="Search rules..."
                    countLabel="rule"
                    filters={FILTERS}
                />
            </div>

            <FormModal title="Disable Rule" headerColor="#b91c1c" isOpen={disableModalOpen} setIsOpen={setDisableModalOpen}>
                <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">
                        Disable "{disableTarget?.rule_name}"?
                    </p>
                    <p className="text-xs text-red-500">
                        This also suppresses every currently non-CLEARED alarm on this rule. Re-enabling it does not reverse that — there is no API to un-suppress them.
                    </p>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <button type="button" onClick={() => setDisableModalOpen(false)}
                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={confirmDisable} disabled={toggling}
                        className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
                        style={{ background: '#b91c1c' }}>
                        {toggling ? 'Disabling...' : 'Disable'}
                    </button>
                </div>
            </FormModal>

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete Rule"
                message={`Delete "${deleteTarget?.rule_name ?? ''}"? It stops being evaluated and disappears from this list. Its still-active alarms are suppressed. Past alarms and tickets are kept. This can't be undone from the UI.`}
                confirmLabel={deleting ? 'Deleting…' : 'Delete'}
                onConfirm={confirmDelete}
                onCancel={() => { if (!deleting) setDeleteTarget(null); }}
            />
        </>
    );
};

export default AssuranceRuleList;
