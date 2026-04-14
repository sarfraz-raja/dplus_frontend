import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import AdminManagementActions from '../../store/actions/adminManagement-actions';
import { Urls } from '../../utils/url';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import FileUploader from '../../components/FIleUploader';
import DataTable from '../../components/DataTable';

const getVal = (row, key) => {
    if (row == null) return undefined;
    if (key in row) return row[key];
    const lower = key.toLowerCase();
    const match = Object.keys(row).find(k => k.toLowerCase() === lower);
    return match ? row[match] : undefined;
};
import NokiaToolManagementQueryForm from '../NokiaToolManagement/NokiaToolManagementQueryForm';

const COLUMNS = [
    { label: 'Code',        key: 'Code'       },
    { label: 'KPI Name',    key: 'KPI_Name'   },
    { label: 'Technology',  key: 'Technology' },
    { label: 'Query',       key: 'Query'      },
    { label: 'Aggregation', key: 'Agrregation'},
    { label: 'Type',        key: 'Type'       },
    { label: 'Group By',    key: 'groupBy'    },
    { label: 'Report',      key: 'fromReport' },
    { label: 'Actions',     key: '_actions'   },
];

const KPICheckRulesPage = () => {
    const dispatch = useDispatch();

    const [modalOpen, setModalOpen] = useState(false);
    const [fileOpen,  setFileOpen]  = useState(false);
    const [modalBody, setModalBody] = useState(null);
    const [modalHead, setModalHead] = useState('');

    const rawList = useSelector((state) => state?.nokiaPrePost?.PrePostData ?? []);

    useEffect(() => {
        dispatch(nokiaPrePostActions.getnokiaprepost());
    }, []);

    const openAdd = () => {
        setModalHead('New KPI Rule');
        setModalBody(
            <NokiaToolManagementQueryForm isOpen={true} setIsOpen={setModalOpen} resetting={true} formValue={{}} />
        );
        setModalOpen(true);
    };

    const openEdit = (itm) => {
        setModalHead('Edit KPI Rule');
        setModalBody(
            <NokiaToolManagementQueryForm isOpen={true} setIsOpen={setModalOpen} resetting={false} formValue={itm} />
        );
        dispatch(AdminManagementActions.getUsersList());
        setModalOpen(true);
    };

    const onFileSubmit = (data) => {
        dispatch(nokiaPrePostActions.postSubmit(Urls.PrePostBulkUpload, data, () => setFileOpen(false)));
    };

    const renderCell = (row, col) => {
        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
                <button
                    onClick={() => openEdit(row)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
            </span>
        );
        if (col.key === 'fromReport') {
            const val = getVal(row, col.key);
            const cls = val === 'Site Analytics'
                ? 'bg-indigo-100 text-indigo-700'
                : val === 'Cell Analytics'
                ? 'bg-teal-100 text-teal-700'
                : 'bg-slate-100 text-slate-600';
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{val || '—'}</span>;
        }
        const val = getVal(row, col.key);
        return (
            <span className="truncate max-w-[200px] block" title={String(val ?? '')}>
                {val}
            </span>
        );
    };

    return (
        <>
            <div
                className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
                style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}
            >
                {/* ── Page header ── */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">KPI Check Rules</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Manage KPI rule definitions across technologies and reports</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={openAdd} variant="primary" className="flex items-center gap-2">
                            + Add New
                        </Button>
                        <Button onClick={() => setFileOpen(true)} className="flex items-center gap-2">
                            ↑ Upload File
                        </Button>
                    </div>
                </div>

                {/* ── DataTable ── */}
                <DataTable
                    columns={COLUMNS}
                    data={rawList}
                    renderCell={renderCell}
                    emptyMessage="No KPI rules found."
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

            <FileUploader
                fileUploadUrl={Urls.PrePostBulkUpload}
                isOpen={fileOpen}
                onTableViewSubmit={onFileSubmit}
                setIsOpen={setFileOpen}
            />
            <Modal size="form" modalHead={modalHead} isOpen={modalOpen} setIsOpen={setModalOpen}>
                {modalBody}
            </Modal>
        </>
    );
};

export default KPICheckRulesPage;
