import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import DataTable from '../../../components/DataTable';
import Button from '../../../components/Button';
import FormModal from '../../../components/FormModal';
import AssuranceActions from '../../../store/actions/assurance-actions';
import SlaProfileForm from './SlaProfileForm';

const COLUMNS = [
    { label: 'Name',                  key: 'name' },
    { label: 'Priority',              key: 'priority' },
    { label: 'Ack (mins)',            key: 'ack_minutes' },
    { label: 'Response (mins)',       key: 'response_minutes' },
    { label: 'Resolution (mins)',     key: 'resolution_minutes' },
    { label: 'Warning %',             key: 'warning_threshold_pct' },
    { label: 'Status',                key: '_status' },
    { label: 'Actions',               key: '_actions' },
];

const SlaProfileManager = () => {
    const dispatch = useDispatch();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalHead, setModalHead] = useState('');
    const [modalResetting, setModalResetting] = useState(true);
    const [formValue, setFormValue] = useState({});
    const submitRef = useRef(null);

    const list = useSelector((state) => state?.assurance?.slaProfileList ?? []);

    const load = () => dispatch(AssuranceActions.listSlaProfiles());

    useEffect(() => { load(); }, []);

    const openAdd = () => {
        submitRef.current = null;
        setModalHead('New SLA Profile');
        setModalResetting(true);
        setFormValue({});
        setModalOpen(true);
    };

    // API doc §11: opening the edit form re-fetches the one profile (GET /sla-profiles/<id>)
    // so the form never starts from a stale list row. A failure (e.g. 404 — deleted
    // elsewhere) refreshes the list instead of opening a form for a profile that's gone.
    const openEdit = (itm) => {
        dispatch(AssuranceActions.getSlaProfile(itm.id, (full) => {
            submitRef.current = null;
            setModalHead('Edit SLA Profile');
            setModalResetting(false);
            setFormValue(full || itm);
            setModalOpen(true);
        }, (msg) => {
            toast.error(msg);
            load();
        }));
    };

    const renderCell = (itm, col) => {
        if (col.key === '_status') {
            const isEnabled = itm.enabled === true;
            return <span className={`font-medium ${isEnabled ? 'text-green-700' : 'text-slate-400'}`}>{isEnabled ? 'Enabled' : 'Disabled'}</span>;
        }
        if (col.key === '_actions') return (
            <button onClick={() => openEdit(itm)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
            </button>
        );
        const val = itm[col.key];
        return <span className="truncate max-w-[160px] block" title={String(val ?? '')}>{val ?? '—'}</span>;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden p-5 gap-4" style={{ background: '#ffffff' }}>
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0" style={{ background: '#0b1830' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">SLA Profiles</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Intelligent Telecom Assurance — ack/response/resolution targets</p>
                    </div>
                </div>
                <Button onClick={openAdd} variant="primary" className="flex items-center gap-2">+ New Profile</Button>
            </div>

            <DataTable
                columns={COLUMNS}
                data={list}
                renderCell={renderCell}
                emptyMessage="No SLA profiles found."
                searchPlaceholder="Search profiles..."
                countLabel="profile"
            />

            <FormModal
                title={modalHead}
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                size="lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" size="md" onClick={() => submitRef.current?.()}>
                            {modalResetting ? 'Create' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <SlaProfileForm
                    setIsOpen={setModalOpen}
                    resetting={modalResetting}
                    formValue={formValue}
                    submitRef={submitRef}
                    onSaved={load}
                />
            </FormModal>
        </div>
    );
};

export default SlaProfileManager;
