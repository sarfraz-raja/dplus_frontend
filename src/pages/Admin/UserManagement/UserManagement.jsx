import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';
import { REMOVE_USER } from '../../../store/reducers/adminManagement-reducer';
import CommonActions from '../../../store/actions/common-actions';
import { Urls } from '../../../utils/url';
import Button from '../../../components/Button';
import FormModal from '../../../components/FormModal';
import ConfirmModal from '../../../components/ConfirmModal';
import DataTable from '../../../components/DataTable';
import UserManagementForm from './UserManagementForm';
import { PageTitle } from '../../../components/FormPage';
import ActionButton from '../../../components/ActionButton';

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
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"> <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/> <circle cx="9" cy="7" r="4"/> <path d="M23 21v-2a4 4 0 0 0-3-3.87"/> <path d="M16 3.13a4 4 0 0 1 0 7.75"/> </svg>}
                        title="User Management"
                        subtitle="Manage system users and their roles"
                    />
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
            <ConfirmModal
                isOpen={deleteModalOpen}
                tone="danger"
                title="Delete User"
                message={<>Delete user <strong>{deleteTarget?.username}</strong>?</>}
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

export default UserManagement;
