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

const MenuRow = ({ item, depth, onChange }) => (
    <div>
        <label
            className={`flex items-center gap-2.5 py-1.5 px-2 cursor-pointer rounded hover:bg-slate-50 select-none`}
            style={{ paddingLeft: `${(depth * 20) + 8}px` }}
        >
            <input
                type="checkbox"
                checked={!!item.is_active}
                onChange={e => onChange(item.id, e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
            />
            <span className={`text-sm ${depth === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                {item.title}
            </span>
        </label>
        {item.children?.map(child => (
            <MenuRow key={child.id} item={child} depth={depth + 1} onChange={onChange} />
        ))}
    </div>
);

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
                            <MenuRow key={item.id} item={item} depth={0} onChange={handleChange} />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default RoleManagementForm;
