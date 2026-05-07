import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';
import Button from '../../../components/Button';
import FormModal from '../../../components/FormModal';
import DataTable from '../../../components/DataTable';
import RoleManagementForm from './RoleManagementForm';

const COLUMNS = [
    { label: 'Role Name',     key: 'label'      },
    { label: 'Module Access', key: 'permission' },
    { label: 'Actions',       key: '_actions'   },
];

const RoleManagement = () => {
    const dispatch = useDispatch();
    const submitRef = useRef(null);

    const [modalOpen,      setModalOpen]      = useState(false);
    const [modalResetting, setModalResetting] = useState(false);
    const [modalHead,      setModalHead]      = useState('');
    const [formValue,      setFormValue]      = useState({});

    const roles = useSelector((s) => s?.adminManagement?.roleList ?? []);
    const [menuCounts, setMenuCounts] = useState({});

    const countActive = (items) => (items || []).reduce((sum, item) => {
        return sum + (item.is_active ? 1 : 0) + countActive(item.children);
    }, 0);

    useEffect(() => {
        dispatch(AdminManagementActions.getRoleList());
    }, []);

    useEffect(() => {
        if (!roles.length) return;
        Promise.all(
            roles.map(async (role) => {
                const menu = await dispatch(AdminManagementActions.getRoleMenu(role.value));
                return { id: role.value, count: Array.isArray(menu) ? countActive(menu) : 0 };
            })
        ).then(results => {
            const counts = {};
            results.forEach(r => { counts[r.id] = r.count; });
            setMenuCounts(counts);
        });
    }, [roles]);

    const openEdit = async (itm) => {
        submitRef.current = null;
        setModalHead('Edit Role');
        setModalResetting(false);
        const menu = await dispatch(AdminManagementActions.getRoleMenu(itm.value));
        setFormValue({ ...itm, menuPermission: menu });
        setModalOpen(true);
    };

    const renderCell = (row, col) => {
        if (col.key === '_actions') return (
            <button
                onClick={() => openEdit(row)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[#0b1830]/20 text-[#0b1830] bg-[#0b1830]/5 hover:bg-[#0b1830]/10 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
            </button>
        );

        if (col.key === 'permission') {
            const count = menuCounts[row.value] ?? '—';
            return (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#0b1830]/8 text-[#0b1830]">
                    {count}{typeof count === 'number' ? ` permission${count !== 1 ? 's' : ''}` : ''}
                </span>
            );
        }

        const val = row[col.key];
        return <span className="truncate max-w-[200px] block text-slate-700" title={String(val ?? '')}>{val}</span>;
    };

    return (
        <>
            <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-5 gap-4" style={{ background: '#ffffff' }}>

                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: '#0b1830' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">Role Management</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Configure roles and module access permissions</p>
                        </div>
                    </div>
                </div>

                {/* DataTable */}
                <DataTable
                    columns={COLUMNS}
                    data={roles}
                    renderCell={renderCell}
                    emptyMessage="No roles found."
                    searchPlaceholder="Search roles…"
                    countLabel="role"
                />
            </div>

            {/* Edit modal */}
            <FormModal
                title={modalHead}
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={() => submitRef.current?.()}>Save Changes</Button>
                    </div>
                }
            >
                <RoleManagementForm
                    setIsOpen={setModalOpen}
                    resetting={modalResetting}
                    formValue={formValue}
                    submitRef={submitRef}
                />
            </FormModal>
        </>
    );
};

export default RoleManagement;
