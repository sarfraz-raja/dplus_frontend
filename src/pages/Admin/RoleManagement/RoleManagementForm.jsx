import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';
import AuthActions from '../../../store/actions/auth-actions';

const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400';
const labelCls = 'block text-xs text-slate-500 uppercase tracking-wide mb-1';
const errorCls = 'text-xs text-red-500 mt-0.5';

const sortBySequence = (items) =>
    [...(items || [])].sort((a, b) => (a?.sequence ?? 999) - (b?.sequence ?? 999));

const sortMenuDeep = (items) =>
    sortBySequence(items).map(item => ({
        ...item,
        children: sortMenuDeep(item.children || []),
    }));

// Recursively set is_active on an item and all its descendants
const setActiveDeep = (item, active) => ({
    ...item,
    is_active: active,
    children: item.children?.map(child => setActiveDeep(child, active)) || [],
});

const updateSequenceById = (items, id, sequence) =>
    items.map(item => {
        if (item.id === id) return { ...item, sequence };
        if (item.children?.length) return { ...item, children: updateSequenceById(item.children, id, sequence) };
        return item;
    });

// Update an item by id anywhere in the tree; recalculate parent active state bottom-up
const updateById = (items, id, active) =>
    items.map(item => {
        if (item.id === id) return setActiveDeep(item, active);
        if (item.children?.length) {
            const updatedChildren = updateById(item.children, id, active);
            const anyChildActive = updatedChildren.some(c => c.is_active);
            return { ...item, children: updatedChildren, is_active: anyChildActive };
        }
        return item;
    });

const MenuRow = ({ item, depth, onChange, onSequenceChange }) => {
    const hasChildren = item.children?.length > 0;
    const [open, setOpen] = useState(false);

    return (
        <div>
            <div
                className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-slate-50 select-none"
                style={{ paddingLeft: `${(depth * 20) + 8}px` }}
            >
                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                        type="checkbox"
                        checked={!!item.is_active}
                        onChange={e => onChange(item.id, e.target.checked)}
                        className="w-4 h-4 rounded accent-orange-500 cursor-pointer shrink-0"
                    />
                    <span className={`text-sm truncate ${depth === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {item.title}
                    </span>
                </label>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    {item.sequence != null && (
                        <input
                            type="number"
                            min="1"
                            value={item.sequence}
                            onChange={e => onSequenceChange(item.id, parseInt(e.target.value, 10) || 1)}
                            onClick={e => e.stopPropagation()}
                            className={`font-mono text-center bg-white border rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 ${
                                depth === 0
                                    ? 'w-14 text-[11px] text-slate-600 border-slate-300 px-1 py-0.5'
                                    : depth === 1
                                        ? 'w-10 text-[10px] text-slate-400 border-slate-200 px-1 py-0.5'
                                        : 'w-8 text-[9px] text-slate-300 border-slate-100 px-0.5 py-0'
                            }`}
                            title="Sidebar order (lower = higher in menu)"
                        />
                    )}
                    {hasChildren && (
                        <button
                            type="button"
                            onClick={() => setOpen(o => !o)}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg" width="11" height="11"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
                            >
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            {hasChildren && open && item.children.map(child => (
                <MenuRow key={child.id} item={child} depth={depth + 1} onChange={onChange} onSequenceChange={onSequenceChange} />
            ))}
        </div>
    );
};

const RoleManagementForm = ({ setIsOpen, resetting, formValue = {}, submitRef }) => {
    const dispatch = useDispatch();
    const [menuItems, setMenuItems] = useState([]);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

    useEffect(() => {
        reset({});
        if (resetting) {
            setMenuItems([]);
        } else {
            const menu = formValue.menuPermission;
            setMenuItems(Array.isArray(menu) ? sortMenuDeep(JSON.parse(JSON.stringify(menu))) : []);
            Object.keys(formValue).forEach(key => {
                if (!['permission', 'menuPermission'].includes(key)) setValue(key, formValue[key]);
            });
        }
    }, [formValue, resetting]);

    const handleChange = (id, active) => {
        setMenuItems(prev => updateById(prev, id, active));
    };

    const handleSequenceChange = (id, sequence) => {
        setMenuItems(prev => updateSequenceById(prev, id, sequence));
    };

    const onSubmit = (data) => {
        const done = () => {
            setIsOpen(false);
            dispatch(AdminManagementActions.getRoleList());
            dispatch(AuthActions.fetchMe());
        };
        if (data.value) {
            dispatch(AdminManagementActions.saveRoleMenu(data.value, menuItems, done));
        } else {
            done();
        }
    };

    useEffect(() => { if (submitRef) submitRef.current = handleSubmit(onSubmit); });

    return (
        <div className="flex flex-col gap-5">

            <div>
                <label className={labelCls}>Role Name <span className="text-red-400">*</span></label>
                <input type="text" className={inputCls} placeholder="Role name" disabled
                    {...register('label', { required: 'Required' })} />
                {errors.label && <p className={errorCls}>{errors.label.message}</p>}
            </div>

            <div>
                <p className={labelCls}>Module Permissions</p>
                {menuItems.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No menu items available.</p>
                ) : (
                    <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                        {menuItems.map(item => (
                            <MenuRow key={item.id} item={item} depth={0} onChange={handleChange} onSequenceChange={handleSequenceChange} />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default RoleManagementForm;
