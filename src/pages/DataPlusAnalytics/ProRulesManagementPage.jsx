import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import CommonActions from '../../store/actions/common-actions';
import AdminManagementActions from '../../store/actions/adminManagement-actions';
import { Urls } from '../../utils/url';
import Button from '../../components/Button';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import DataTable from '../../components/DataTable';
import ProRulesForm from '../ProRules/ProRulesForm';
import { PageTitle } from '../../components/FormPage';
import ActionButton from '../../components/ActionButton';

const COLUMNS = [
    { label: 'Report',      key: 'fromReport' },
    { label: 'Technology',  key: 'technology' },
    { label: 'Rule Name',   key: 'rule_name'  },
    { label: 'Query',       key: 'query'      },
    { label: 'Actions',     key: '_actions'   },
];

const ProRulesManagementPage = () => {
    const dispatch = useDispatch();

    const [modalOpen,        setModalOpen]        = useState(false);
    const [deleteModalOpen,  setDeleteModalOpen]  = useState(false);
    const [deleteTarget,     setDeleteTarget]     = useState(null);
    const [deleting,         setDeleting]         = useState(false);
    const [modalBody,        setModalBody]        = useState(null);
    const [modalHead,        setModalHead]        = useState('');

    const rawRules = useSelector((s) => s?.nokiaPrePost?.proRules ?? []);

    useEffect(() => {
        dispatch(nokiaPrePostActions.getProRules());
    }, []);

    const openAdd = () => {
        dispatch(AdminManagementActions.getUsersList());
        setModalHead('New Pro Rule');
        setModalBody(<ProRulesForm isOpen={true} setIsOpen={setModalOpen} resetting={true} formValue={{}} />);
        setModalOpen(true);
    };

    const openEdit = (itm) => {
        dispatch(AdminManagementActions.getUsersList());
        setModalHead('Edit Pro Rule');
        setModalBody(<ProRulesForm isOpen={true} setIsOpen={setModalOpen} resetting={false} formValue={itm} />);
        setModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        dispatch(CommonActions.deleteApiCaller(
            `${Urls.proRules}/${deleteTarget.id}`,
            () => {
                dispatch(nokiaPrePostActions.getProRules(true));
                setDeleting(false);
                setDeleteModalOpen(false);
                setDeleteTarget(null);
            }
        ));
    };

    const renderCell = (row, col) => {
        if (col.key === 'fromReport') {
            const val = row.fromReport || row.fromreport;
            const cls = val === 'Site Analytics'
                ? 'bg-indigo-100 text-indigo-700'
                : val === 'Cell Analytics'
                ? 'bg-teal-100 text-teal-700'
                : 'bg-slate-100 text-slate-600';
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{val || '—'}</span>;
        }

        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
                <ActionButton kind="edit" onClick={() => openEdit(row)} />
                <ActionButton kind="delete" onClick={() => { setDeleteTarget(row); setDeleteModalOpen(true); }} />
            </span>
        );

        if (col.key === 'query') {
            const val = row.query || row.Query;
            return <span className="truncate max-w-[300px] block font-mono text-xs text-slate-600" title={val}>{val}</span>;
        }

        const val = row[col.key] ?? row[col.key.toLowerCase()];
        return <span className="truncate max-w-[180px] block text-slate-700" title={String(val ?? '')}>{val}</span>;
    };

    return (
        <>
            <div
                className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
                style={{ background: '#ffffff' }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between shrink-0">
                    <PageTitle
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"> <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/> <polyline points="14 2 14 8 20 8"/> <line x1="16" y1="13" x2="8" y2="13"/> <line x1="16" y1="17" x2="8" y2="17"/> <polyline points="10 9 9 9 8 9"/> </svg>}
                        title="Pro Rules Management"
                        subtitle="Define and manage KPI rules per technology and report"
                    />

                    <Button onClick={openAdd} variant="primary" className="flex items-center gap-2">
                        + Add Pro Rule
                    </Button>
                </div>

                {/* ── DataTable ── */}
                <DataTable
                    columns={COLUMNS}
                    data={rawRules}
                    renderCell={renderCell}
                    emptyMessage="No pro rules defined yet."
                    searchPlaceholder="Search rules…"
                    countLabel="rule"
                    filters={[
                        {
                            label: 'Report',
                            key: 'fromReport',
                            type: 'select',
                            options: [
                                { label: 'Site Analytics', value: 'Site Analytics' },
                                { label: 'Cell Analytics', value: 'Cell Analytics' },
                            ],
                        },
                    ]}
                />
            </div>

            {/* Edit / Add modal */}
            <FormModal title={modalHead} isOpen={modalOpen} setIsOpen={setModalOpen}>
                {modalBody}
            </FormModal>

            {/* Delete confirmation */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                tone="danger"
                title="Delete Pro Rule"
                message={<>Delete <strong>{deleteTarget?.rule_name}</strong>?</>}
                detail="This cannot be undone."
                confirmLabel="Delete"
                busy={deleting}
                busyLabel="Deleting…"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
            />
        </>
    );
};

export default ProRulesManagementPage;
