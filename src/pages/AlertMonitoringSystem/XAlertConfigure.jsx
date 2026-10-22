import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import AlertConfigurationActions from '../../store/actions/alertConfiguration-actions';
import CommonActions from '../../store/actions/common-actions';
import { Urls } from '../../utils/url';
import XAlertConfigureForm from './XAlertConfigureForm';
import XReportSchedulerForm from './XReportSchedulerForm';
import { PageTitle } from '../../components/FormPage';
import ActionButton from '../../components/ActionButton';

const COLUMNS = [
    { label: 'Frequency',       key: 'frequency' },
    { label: 'DB Name',         key: 'dbname' },
    { label: 'Mail Attachement',      key: 'mailquery' },
    { label: 'Graph Query',     key: 'graphquery' },
    { label: 'Mail Subject',    key: 'mailsubject' },
    { label: 'Mail Recipients', key: 'mailrecipients' },
    { label: 'Mail Body',       key: 'mailbody' },
    { label: 'Start At',        key: 'startat' },
    { label: 'End At',          key: 'endat' },
    { label: 'Time',            key: 'timeall' },
    { label: 'Status',          key: '_status' },
    { label: 'Actions',         key: '_actions' },
];

// Inline toggle
const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-9 h-5 bg-slate-200 peer-checked:bg-[#EC7D09] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
    </label>
);

const XAlertConfigure = () => {
    const dispatch = useDispatch();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalBody, setModalBody] = useState(null);
    const [modalTitle, setModalTitle] = useState('');
    const [modalResetting, setModalResetting] = useState(true);
    const formSubmitRef = useRef(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const rawList = useSelector((state) => state?.alertConfiguration?.configureAlertList ?? []);

    useEffect(() => {
        dispatch(AlertConfigurationActions.alertConfigurationList());
    }, []);

    const openReportScheduler = () => {
        formSubmitRef.current = null;
        setModalResetting(true);
        setModalTitle('Report Scheduler');
        setModalBody(<XReportSchedulerForm setIsOpen={setModalOpen} submitRef={formSubmitRef} />);
        setModalOpen(true);
    };

    const openAdd = () => {
        formSubmitRef.current = null;
        setModalResetting(true);
        setModalTitle('Add Alert Configuration');
        setModalBody(<XAlertConfigureForm setIsOpen={setModalOpen} resetting={true} formValue={{}} submitRef={formSubmitRef} />);
        setModalOpen(true);
    };

    const openEdit = (itm) => {
        formSubmitRef.current = null;
        setModalResetting(false);
        setModalTitle('Edit Alert Configuration');
        setModalBody(<XAlertConfigureForm setIsOpen={setModalOpen} resetting={false} formValue={itm} submitRef={formSubmitRef} />);
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
            `${Urls.alertConfiguration_configureAlert}/${id}`,
            () => {
                dispatch(AlertConfigurationActions.alertConfigurationList());
                setDeleting(false);
                setDeleteModalOpen(false);
                setDeleteTarget(null);
            }
        ));
    };

    const handleToggle = (itm, checked) => {
        dispatch(AlertConfigurationActions.patchAlertConfig(true, { enabled: checked ? 1 : 0 }, () => {
            dispatch(AlertConfigurationActions.alertConfigurationList());
        }, itm.id || itm.uniqueid));
    };

    // Normalise row — handles both camelCase and lowercase keys from API
    const norm = (itm) => ({
        ...itm,
        dbname: itm.dbname || itm.dbName,
        mailquery: itm.mailquery || itm.mailQuery,
        graphquery: itm.graphquery || itm.graphQuery,
        mailsubject: itm.mailsubject || itm.mailSubject,
        mailrecipients: itm.mailrecipients || itm.mailRecipients,
        mailbody: itm.mailbody || itm.mailBody,
        startat: itm.startat || itm.startAt,
        endat: itm.endat || itm.endAt,
    });

    const tableData = rawList.map(norm);

    const renderCell = (itm, col) => {
        if (col.key === '_status') return (
            <Toggle checked={itm.enabled === 1 || itm.enabled === true} onChange={(e) => handleToggle(itm, e.target.checked)} />
        );
        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
                <ActionButton kind="edit" onClick={() => openEdit(itm)} />
                <ActionButton kind="delete" onClick={() => openDelete(itm)} />
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
                    <PageTitle
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"> <path d="M18 8h1a4 4 0 0 1 0 8h-1"/> <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/> <line x1="6" y1="1" x2="6" y2="4"/> <line x1="10" y1="1" x2="10" y2="4"/> <line x1="14" y1="1" x2="14" y2="4"/> </svg>}
                        title="Configure Scheduler"
                        subtitle="Manage alert configurations"
                    />

                    <div className="flex items-center gap-2">
                        <Button onClick={openReportScheduler} variant="secondary" className="flex items-center gap-2">
                            + Report Scheduler
                        </Button>
                        <Button onClick={openAdd} variant="primary" className="flex items-center gap-2">
                            + Add Alert
                        </Button>
                    </div>
                </div>

                <DataTable
                    columns={COLUMNS}
                    data={tableData}
                    renderCell={renderCell}
                    emptyMessage="No alerts configured."
                    searchPlaceholder="Search alerts..."
                    countLabel="alert"
                />
            </div>

            <FormModal
                title={modalTitle}
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
            <ConfirmModal
                isOpen={deleteModalOpen}
                tone="danger"
                title="Delete Alert"
                message="Are you sure you want to delete this alert configuration?"
                detail="This action cannot be undone."
                confirmLabel="Delete"
                busy={deleting}
                busyLabel="Deleting…"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
            />
        </>
    );
};

export default XAlertConfigure;
