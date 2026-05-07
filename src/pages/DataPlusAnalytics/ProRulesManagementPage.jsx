import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import CommonActions from '../../store/actions/common-actions';
import AdminManagementActions from '../../store/actions/adminManagement-actions';
import { Urls } from '../../utils/url';
import Button from '../../components/Button';
import FormModal from '../../components/FormModal';
import DataTable from '../../components/DataTable';
import ProRulesForm from '../ProRules/ProRulesForm';

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
                <button
                    onClick={() => openEdit(row)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
                <button
                    onClick={() => { setDeleteTarget(row); setDeleteModalOpen(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                >
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
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: '#0b1830' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">Pro Rules Management</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Define and manage KPI rules per technology and report</p>
                        </div>
                    </div>

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
            <FormModal title="Delete Pro Rule" headerColor="#b91c1c" isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Delete <strong>{deleteTarget?.rule_name}</strong>?</p>
                    <p className="text-xs text-red-400">This cannot be undone.</p>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <button onClick={() => setDeleteModalOpen(false)} className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={confirmDelete} disabled={deleting} className="px-6 py-2 text-sm font-semibold rounded text-white disabled:opacity-60 transition-opacity" style={{ background: '#b91c1c' }}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </FormModal>
        </>
    );
};

export default ProRulesManagementPage;
