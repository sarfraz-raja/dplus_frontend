import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import FormModal from '../../components/FormModal';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import AlertConfigurationActions from '../../store/actions/alertConfiguration-actions';
import CommonActions from '../../store/actions/common-actions';
import { Urls } from '../../utils/url';
import XAlertSchedulerForm from './XAlertSchedulerForm';

const COLUMNS = [
    { label: 'Alert Name',       key: 'alertname' },
    { label: 'Frequency (mins)', key: 'frequency' },
    { label: 'DB Name',          key: 'dbname' },
    { label: 'Mail Attachement', key: 'mailquery' },
    { label: 'Graph Query',      key: 'graphquery' },
    { label: 'Mail Subject',     key: 'mailsubject' },
    { label: 'Mail Recipients',  key: 'mailrecipients' },
    { label: 'Mail Body',        key: 'mailbody' },
    { label: 'Mail Query Body',  key: 'mailquerybody' },
    { label: 'Start At',         key: 'startat' },
    { label: 'End At',           key: 'endat' },
    { label: 'Last Check At',    key: 'lastsendat' },
    { label: 'Next Check At',    key: 'nextsendat' },
    { label: 'Visible To',       key: '_visibleto' },
    { label: 'Generate Ticket',  key: '_generateticket' },
    { label: 'Status',           key: '_status' },
    { label: 'Block Status',     key: '_blockstatus' },
    { label: 'Actions',          key: '_actions' },
];

const VISIBILITY_BADGE = {
    SELF:  { label: 'Self',      className: 'text-slate-600' },
    ALL:   { label: 'All Users', className: 'text-emerald-700' },
    GROUP: { label: 'Group',     className: 'text-blue-700' },
    USER:  { label: 'User',      className: 'text-purple-700' },
};

const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-9 h-5 bg-slate-200 peer-checked:bg-[#EC7D09] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
    </label>
);

const XAlertScheduler = () => {
    const dispatch = useDispatch();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalBody, setModalBody] = useState(null);
    const [modalTitle, setModalTitle] = useState('');
    const [modalResetting, setModalResetting] = useState(true);
    const formSubmitRef = useRef(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const rawList = useSelector((state) => state?.alertConfiguration?.schedulerAlertList ?? []);

    useEffect(() => {
        dispatch(AlertConfigurationActions.alertSchedulerList());
    }, []);

    const openAdd = () => {
        formSubmitRef.current = null;
        setModalResetting(true);
        setModalTitle('Add Alert Scheduler');
        setModalBody(<XAlertSchedulerForm setIsOpen={setModalOpen} resetting={true} formValue={{}} submitRef={formSubmitRef} />);
        setModalOpen(true);
    };

    const openEdit = (itm) => {
        formSubmitRef.current = null;
        setModalResetting(false);
        setModalTitle('Edit Alert Scheduler');
        setModalBody(<XAlertSchedulerForm setIsOpen={setModalOpen} resetting={false} formValue={itm} submitRef={formSubmitRef} />);
        setModalOpen(true);
    };

    const openDelete = (itm) => {
        setDeleteTarget(itm);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const id = deleteTarget.id || deleteTarget.uniqueid || deleteTarget.uniqueId;
        dispatch(CommonActions.deleteApiCaller(
            `${Urls.alertConfiguration_schedulerAlert}/${id}`,
            () => {
                dispatch(AlertConfigurationActions.alertSchedulerList());
                setDeleting(false);
                setDeleteModalOpen(false);
                setDeleteTarget(null);
            }
        ));
    };

    const handleToggle = (itm, checked) => {
        dispatch(AlertConfigurationActions.patchAlertScheduler(true, { enabled: checked ? 1 : 0 }, () => {
            dispatch(AlertConfigurationActions.alertSchedulerList());
        }, itm.id || itm.uniqueid));
    };

    const handleBlockToggle = (itm, currentText, el) => {
        const blocked = currentText === 'Blocked';
        const newBlockage = blocked ? 0 : 1;
        dispatch(AlertConfigurationActions.patchAlertScheduler(true, { blockage: newBlockage }, () => {
            if (el) {
                el.innerText = blocked ? 'Unblocked' : 'Blocked';
                el.className = blocked ? 'text-green-700 font-medium cursor-pointer' : 'text-red-700 font-medium cursor-pointer';
            }
        }, itm.id || itm.uniqueid));
    };

    const norm = (itm) => ({
        ...itm,
        alertname: itm.alertname || itm.alertName,
        generateticket: (() => {
            const raw = itm.generate_ticket ?? itm.generateticket ?? itm.generateTicket;
            return (raw === true || String(raw).toLowerCase() === 'yes' || String(raw).toLowerCase() === 'true') ? 'yes' : 'no';
        })(),
        dbname: itm.dbname || itm.dbName,
        mailquery: itm.mailquery || itm.mailQuery,
        graphquery: itm.graphquery || itm.graphQuery,
        mailsubject: itm.mailsubject || itm.mailSubject,
        mailrecipients: itm.mailrecipients || itm.mailRecipients,
        mailbody: itm.mailbody || itm.mailBody,
        mailquerybody: itm.mailquerybody || itm.mailQueryBody,
        startat: itm.startat || itm.startAt,
        endat: itm.endat || itm.endAt,
        lastsendat: itm.lastsendat || itm.lastSendAt,
        nextsendat: itm.nextsendat || itm.nextSendAt,
        assignment_type: (itm.assignment_type || itm.assignmentType || 'SELF').toUpperCase(),
        group_id: itm.group_id ?? itm.groupId ?? null,
        assigned_user_id: itm.assigned_user_id ?? itm.assignedUserId ?? null,
    });

    const tableData = rawList.map(norm);

    const renderCell = (itm, col) => {
        if (col.key === '_visibleto') {
            const badge = VISIBILITY_BADGE[itm.assignment_type] || VISIBILITY_BADGE.SELF;
            return <span className={`font-medium ${badge.className}`}>{badge.label}</span>;
        }
        if (col.key === '_generateticket') {
            const isYes = itm.generateticket === 'yes';
            return <span className={`font-medium ${isYes ? 'text-orange-600' : 'text-slate-500'}`}>{isYes ? 'Yes' : 'No'}</span>;
        }
        if (col.key === '_status') return (
            <Toggle checked={itm.enabled === 1 || itm.enabled === true} onChange={(e) => handleToggle(itm, e.target.checked)} />
        );
        if (col.key === '_blockstatus') {
            const isBlocked = itm.blockage === 1;
            return (
                <span
                    className={`${isBlocked ? 'text-red-700' : 'text-green-700'} font-medium cursor-pointer`}
                    onClick={(e) => handleBlockToggle(itm, e.currentTarget.innerText, e.currentTarget)}
                >
                    {isBlocked ? 'Blocked' : 'Unblocked'}
                </span>
            );
        }
        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
                <button onClick={() => openEdit(itm)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
                <button onClick={() => openDelete(itm)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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
            <div className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
                style={{ background: '#ffffff' }}>

                {/* Top header */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: '#0b1830' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">Alert Scheduler</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Manage scheduled alert jobs</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={openAdd} variant="primary" className="flex items-center gap-2">
                            + Add Scheduler
                        </Button>
                    </div>
                </div>

                <DataTable
                    columns={COLUMNS}
                    data={tableData}
                    renderCell={renderCell}
                    emptyMessage="No schedulers found."
                    searchPlaceholder="Search schedulers..."
                    countLabel="scheduler"
                />
            </div>

            <FormModal
                title={modalTitle}
                size="xl"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                }
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" size="md" onClick={() => formSubmitRef.current?.()}>
                            {modalResetting ? 'Add' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                {modalBody}
            </FormModal>

            {/* Delete confirmation */}
            <FormModal title="Delete Scheduler" headerColor="#b91c1c" isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
                <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Are you sure you want to delete this scheduler?</p>
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

export default XAlertScheduler;
