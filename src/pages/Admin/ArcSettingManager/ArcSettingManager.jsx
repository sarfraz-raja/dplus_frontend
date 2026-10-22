import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';
import DataTable from '../../../components/DataTable';
import Button from '../../../components/Button';
import FormModal from '../../../components/FormModal';
import ConfirmModal from '../../../components/ConfirmModal';
import ArcSettingForm from './ArcSettingForm';
import { PageTitle } from '../../../components/FormPage';
import ActionButton from '../../../components/ActionButton';

const COLUMNS = [
    { label: 'Band',       key: 'band'       },
    { label: 'Technology', key: 'technology' },
    { label: 'Length (m)', key: 'length'     },
    { label: 'Actions',    key: '_actions'   },
];

const ArcSettingManager = () => {
    const dispatch = useDispatch();
    const submitRef = useRef(null);
    const arcSettingList = useSelector((s) => s?.adminManagement?.arcSettingList ?? []);

    const [modalOpen,       setModalOpen]       = useState(false);
    const [modalHead,       setModalHead]       = useState('');
    const [isEdit,          setIsEdit]          = useState(false);
    const [formValue,       setFormValue]       = useState({});
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget,    setDeleteTarget]    = useState(null);
    const [deleting,        setDeleting]        = useState(false);

    useEffect(() => {
        dispatch(AdminManagementActions.getArcSettingList());
    }, []);

    const openAdd = () => {
        submitRef.current = null;
        setIsEdit(false);
        setModalHead('Add Arc Setting');
        setFormValue({});
        setModalOpen(true);
    };

    const openEdit = (row) => {
        submitRef.current = null;
        setIsEdit(true);
        setModalHead('Edit Arc Setting');
        setFormValue(row);
        setModalOpen(true);
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        dispatch(AdminManagementActions.deleteArcSetting(
            deleteTarget.band,
            deleteTarget.technology,
            () => {
                toast.success('Arc setting deleted');
                dispatch(AdminManagementActions.getArcSettingList());
                setDeleting(false);
                setDeleteModalOpen(false);
                setDeleteTarget(null);
            },
            (err) => {
                toast.error(err?.msg || 'Failed to delete arc setting');
                setDeleting(false);
            },
        ));
    };

    const renderCell = (row, col) => {
        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
                <ActionButton kind="edit" onClick={() => openEdit(row)} />
                <ActionButton kind="delete" onClick={() => { setDeleteTarget(row); setDeleteModalOpen(true); }} />
            </span>
        );
        const val = row[col.key];
        return <span className="truncate max-w-[200px] block text-slate-700" title={String(val ?? '')}>{val}</span>;
    };

    return (
        <>
            <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-5 gap-4" style={{ background: '#ffffff' }}>

                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                    <PageTitle
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"> <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/> <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/> <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/> <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/> <line x1="17" y1="16" x2="23" y2="16"/> </svg>}
                        title="Arc Settings"
                        subtitle="Manage arc settings by band and technology"
                    />
                    <Button onClick={openAdd} variant="primary">+ Add Arc Setting</Button>
                </div>

                {/* Table */}
                <DataTable
                    columns={COLUMNS}
                    data={arcSettingList}
                    renderCell={renderCell}
                    emptyMessage="No arc settings found."
                    searchPlaceholder="Search arc settings…"
                    countLabel="arc setting"
                    filters={[
                        { label: 'Technology', key: 'technology', type: 'text' },
                        { label: 'Band',       key: 'band',       type: 'text' },
                    ]}
                />
            </div>

            {/* Add / Edit modal */}
            <FormModal
                title={modalHead}
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={() => submitRef.current?.()}>
                            {isEdit ? 'Save Changes' : 'Add Arc Setting'}
                        </Button>
                    </div>
                }
            >
                <ArcSettingForm
                    isEdit={isEdit}
                    formValue={formValue}
                    submitRef={submitRef}
                    onSuccess={() => setModalOpen(false)}
                />
            </FormModal>

            {/* Delete confirmation */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                tone="danger"
                title="Delete Arc Setting"
                message={<>Delete <strong>{deleteTarget?.band}</strong> / <strong>{deleteTarget?.technology}</strong>?</>}
                detail="This cannot be undone."
                confirmLabel="Delete"
                busy={deleting}
                busyLabel="Deleting…"
                onConfirm={handleDelete}
                onCancel={() => setDeleteModalOpen(false)}
            />
        </>
    );
};

export default ArcSettingManager;
