import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import { cn } from '../../utils/common';
import GroupManagementActions from '../../store/actions/groupManagement-actions';
import { PageTitle } from '../../components/FormPage';
import ActionButton from '../../components/ActionButton';

const COLUMNS = [
    { label: 'Group Name',   key: 'group_name' },
    { label: 'Description',  key: 'description' },
    { label: 'Members', key: '_members' },
    { label: 'Created At',   key: 'create_time' },
    { label: 'Actions',      key: '_actions' },
];

const ROLE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admins' },
    { key: 'user', label: 'Users' },
];

const isAdminRole = (role) => String(role || '').toLowerCase() === 'admin';

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
    const [roleFilter, setRoleFilter] = useState('all');
    const [memberSearch, setMemberSearch] = useState('');
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
        setRoleFilter('all');
        setMemberSearch('');
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
        setRoleFilter('all');
        setMemberSearch('');
        setModalOpen(true);
    };

    const toggleMember = (value) => {
        setMemberIds((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    };

    const visibleUsers = useMemo(() => {
        const q = memberSearch.trim().toLowerCase();
        return (userList || []).filter((u) => {
            if (roleFilter === 'admin' && !isAdminRole(u.role)) return false;
            if (roleFilter === 'user' && isAdminRole(u.role)) return false;
            return !q || u.label.toLowerCase().includes(q);
        });
    }, [userList, roleFilter, memberSearch]);

    const allVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((u) => memberIds.includes(u.value));

    const toggleAllVisible = () => {
        const visibleIds = visibleUsers.map((u) => u.value);
        setMemberIds((prev) => allVisibleSelected
            ? prev.filter((id) => !visibleIds.includes(id))
            : [...prev, ...visibleIds.filter((id) => !prev.includes(id))]);
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
                <ActionButton kind="edit" onClick={() => openEdit(itm)} />
                <ActionButton kind="delete" onClick={() => openDelete(itm)} />
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
                    <PageTitle
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"> <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/> <circle cx="9" cy="7" r="4"/> <path d="M23 21v-2a4 4 0 0 0-3-3.87"/> <path d="M16 3.13a4 4 0 0 1 0 7.75"/> </svg>}
                        title="Group Management"
                        subtitle="Manage groups used for alert visibility"
                    />

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
                        <div className="flex items-center justify-between mb-1">
                            <label className={cn(labelCls, 'mb-0')}>Members ({memberIds.length} selected)</label>
                            <button
                                type="button"
                                onClick={toggleAllVisible}
                                disabled={!visibleUsers.length}
                                className="text-xs text-orange-600 hover:underline disabled:text-slate-300 disabled:no-underline"
                            >
                                {allVisibleSelected ? 'Clear shown' : 'Select shown'}
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <div className="inline-flex rounded border border-slate-300 overflow-hidden" role="group" aria-label="Filter members by role">
                                {ROLE_FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setRoleFilter(f.key)}
                                        aria-pressed={roleFilter === f.key}
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium',
                                            roleFilter === f.key ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                placeholder="Search members"
                                aria-label="Search members"
                                className={cn(inputCls, 'flex-1 min-w-[8rem] !py-1 text-xs')}
                            />
                        </div>
                        <div className="border border-slate-200 rounded max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {visibleUsers.length ? visibleUsers.map((u) => (
                                <label key={u.value} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={memberIds.includes(u.value)}
                                        onChange={() => toggleMember(u.value)}
                                        className="accent-orange-500"
                                    />
                                    <span className="flex-1">{u.label}</span>
                                    {u.role && <span className="text-[10px] text-slate-400">{u.role}</span>}
                                </label>
                            )) : (
                                <p className="px-3 py-3 text-xs text-slate-400">{userList?.length ? 'No members match the filter.' : 'No users found.'}</p>
                            )}
                        </div>
                    </div>
                </div>
            </FormModal>

            {/* Delete confirmation */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                tone="danger"
                title="Delete Group"
                message="Are you sure you want to delete this group?"
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

export default GroupManagement;
