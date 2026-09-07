import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import FormModal from '../../components/FormModal';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import GroupManagementActions from '../../store/actions/groupManagement-actions';

const COLUMNS = [
    { label: 'Group Name',   key: 'group_name' },
    { label: 'Description',  key: 'description' },
    { label: 'Members (Admins)', key: '_members' },
    { label: 'Created At',   key: 'create_time' },
    { label: 'Actions',      key: '_actions' },
];

const inputCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs text-slate-500 uppercase tracking-wide mb-1";
const errorCls = "text-xs text-red-500 mt-0.5";

const GroupManagement = () => {
    const dispatch = useDispatch();

    const [groups, setGroups] = useState([]);
    const [userList, setUserList] = useState([]);
    const [saving, setSaving] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [memberIds, setMemberIds] = useState([]);
    const [originalMemberIds, setOriginalMemberIds] = useState([]);
    const [nameError, setNameError] = useState('');
    const [formError, setFormError] = useState('');

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const loadGroups = () => {
        dispatch(GroupManagementActions.getGroups((data) => setGroups(data)));
    };

    useEffect(() => {
        loadGroups();
        dispatch(GroupManagementActions.getTicketUsersList((data) => setUserList(data)));
    }, []);

    const openAdd = () => {
        setEditing(null);
        setGroupName('');
        setDescription('');
        setMemberIds([]);
        setOriginalMemberIds([]);
        setNameError('');
        setFormError('');
        setModalOpen(true);
    };

    const openEdit = (g) => {
        setEditing(g);
        setGroupName(g.group_name);
        setDescription(g.description || '');
        setMemberIds(g.member_ids || []);
        setOriginalMemberIds(g.member_ids || []);
        setNameError('');
        setFormError('');
        setModalOpen(true);
    };

    const toggleMember = (value) => {
        setMemberIds((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    };

    const handleSave = () => {
        const name = groupName.trim();
        if (!name) {
            setNameError('Required');
            return;
        }
        setSaving(true);
        setFormError('');

        if (editing) {
            const add_member_ids = memberIds.filter((id) => !originalMemberIds.includes(id));
            const remove_member_ids = originalMemberIds.filter((id) => !memberIds.includes(id));
            const data = { group_name: name, description, add_member_ids, remove_member_ids };
            dispatch(GroupManagementActions.patchGroup(editing.id, data, () => {
                setSaving(false);
                setModalOpen(false);
                loadGroups();
            }, (msg) => { setSaving(false); setFormError(msg || 'Something went wrong.'); }));
        } else {
            const data = { group_name: name, description, member_ids: memberIds };
            dispatch(GroupManagementActions.postGroup(data, () => {
                setSaving(false);
                setModalOpen(false);
                loadGroups();
            }, (msg) => { setSaving(false); setFormError(msg || 'Something went wrong.'); }));
        }
    };

    const openDelete = (g) => {
        setDeleteTarget(g);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        dispatch(GroupManagementActions.deleteGroup(deleteTarget.id, () => {
            setDeleting(false);
            setDeleteModalOpen(false);
            setDeleteTarget(null);
            loadGroups();
        }, () => setDeleting(false)));
    };

    const renderCell = (itm, col) => {
        if (col.key === '_members') {
            return <span>{itm.member_ids?.length || 0}</span>;
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
            <span className="truncate max-w-[220px] block" title={String(val ?? '')}>
                {val}
            </span>
        );
    };

    return (
        <>
            <div className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
                style={{ background: '#ffffff' }}>

                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: '#0b1830' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">Group Management</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Manage groups used for alert visibility</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={openAdd} variant="primary" className="flex items-center gap-2">
                            + Add Group
                        </Button>
                    </div>
                </div>

                <DataTable
                    columns={COLUMNS}
                    data={groups}
                    renderCell={renderCell}
                    emptyMessage="No groups found."
                    searchPlaceholder="Search groups..."
                    countLabel="group"
                />
            </div>

            <FormModal
                title={editing ? 'Edit Group' : 'Add Group'}
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                    </svg>
                }
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add'}
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    {formError && <p className={errorCls}>{formError}</p>}

                    <div>
                        <label className={labelCls}>Group Name <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            className={inputCls}
                            placeholder="Enter group name"
                            value={groupName}
                            onChange={(e) => { setGroupName(e.target.value); if (nameError) setNameError(''); }}
                        />
                        {nameError && <p className={errorCls}>{nameError}</p>}
                    </div>

                    <div>
                        <label className={labelCls}>Description</label>
                        <textarea
                            className={inputCls + ' resize-none h-20'}
                            placeholder="What is this group used for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Members (Admins Only)</label>
                        <div className="border border-slate-200 rounded max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {userList?.length ? userList.map((u) => (
                                <label key={u.value} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={memberIds.includes(u.value)}
                                        onChange={() => toggleMember(u.value)}
                                        className="accent-orange-500"
                                    />
                                    {u.label}
                                </label>
                            )) : (
                                <p className="px-3 py-3 text-xs text-slate-400">No users found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </FormModal>

            {/* Delete confirmation */}
            <FormModal title="Delete Group" headerColor="#b91c1c" isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
                <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Are you sure you want to delete this group?</p>
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

export default GroupManagement;
