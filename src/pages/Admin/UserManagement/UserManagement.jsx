import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';
import { REMOVE_USER } from '../../../store/reducers/adminManagement-reducer';
import CommonActions from '../../../store/actions/common-actions';
import { Urls } from '../../../utils/url';
import Button from '../../../components/Button';
import FormModal from '../../../components/FormModal';
import DataTable from '../../../components/DataTable';
import UserManagementForm from './UserManagementForm';

const COLUMNS = [
    { label: 'First Name', key: 'firstname' },
    { label: 'Last Name',  key: 'lastname'  },
    { label: 'Username',   key: 'username'  },
    { label: 'Email',      key: 'email'     },
    { label: 'Role',       key: 'rolename'  },
    { label: 'Actions',    key: '_actions'  },
];

const UserManagement = () => {
    const dispatch = useDispatch();
    const submitRef = useRef(null);

    const [modalOpen,       setModalOpen]       = useState(false);
    const [modalResetting,  setModalResetting]  = useState(true);
    const [modalHead,       setModalHead]       = useState('');
    const [formValue,       setFormValue]       = useState({});
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget,    setDeleteTarget]    = useState(null);
    const [deleting,        setDeleting]        = useState(false);

    const users = useSelector((s) => s?.adminManagement?.usersList ?? []);

    useEffect(() => {
        dispatch(AdminManagementActions.getUsersList());
        dispatch(AdminManagementActions.getRoleList());
    }, []);

    const openAdd = () => {
        submitRef.current = null;
        setModalHead('New User');
        setFormValue({});
        setModalResetting(true);
        setModalOpen(true);
    };

    const openEdit = async (itm) => {
        submitRef.current = null;
        setModalHead('Edit User');
        setModalResetting(false);
        const full = await dispatch(AdminManagementActions.getUserById(itm.id));
        setFormValue(full || itm);
        setModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        const deletedId = deleteTarget.id;
        setDeleting(true);
        dispatch(CommonActions.deleteApiCaller(
            `${Urls.admin_userList}/${deletedId}`,
            () => {
                dispatch(REMOVE_USER(deletedId));
                dispatch(AdminManagementActions.getUsersList(true, "", [deletedId]));
                setDeleting(false);
                setDeleteModalOpen(false);
                setDeleteTarget(null);
            }
        ));
    };

    const renderCell = (row, col) => {
        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
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
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">User Management</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Manage system users and their roles</p>
                        </div>
                    </div>
                    <Button onClick={openAdd} variant="primary">+ Add User</Button>
                </div>

                {/* DataTable */}
                <DataTable
                    columns={COLUMNS}
                    data={users}
                    renderCell={renderCell}
                    emptyMessage="No users found."
                    searchPlaceholder="Search users…"
                    countLabel="user"
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
                            {modalResetting ? 'Add User' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <UserManagementForm
                    setIsOpen={setModalOpen}
                    resetting={modalResetting}
                    formValue={formValue}
                    submitRef={submitRef}
                />
            </FormModal>

            {/* Delete confirmation */}
            <FormModal title="Delete User" headerColor="#b91c1c" isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Delete user <strong>{deleteTarget?.username}</strong>?</p>
                    <p className="text-xs text-red-400">This cannot be undone.</p>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <button onClick={() => setDeleteModalOpen(false)}
                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={confirmDelete} disabled={deleting}
                        className="px-6 py-2 text-sm font-semibold rounded text-white disabled:opacity-60"
                        style={{ background: '#b91c1c' }}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </FormModal>
        </>
    );
};

export default UserManagement;
