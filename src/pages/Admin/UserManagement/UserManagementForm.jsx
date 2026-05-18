import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';

const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400';
const labelCls = 'block text-xs text-slate-500 uppercase tracking-wide mb-1';
const errorCls = 'text-xs text-red-500 mt-0.5';

const UserManagementForm = ({ setIsOpen, resetting, formValue = {}, submitRef }) => {
    const dispatch = useDispatch();
    const roleList = useSelector((s) => s?.adminManagement?.roleList ?? []);

    const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm();

    useEffect(() => {
        dispatch(AdminManagementActions.getRoleList());
        reset({});
        setValue('sendEmail', resetting);
        if (resetting) return;
        // logintype / login_type are backend variants — normalised below, skip here to avoid duplicate keys
        const skipKeys = new Set(['logintype', 'login_type', 'sendemail', 'send_email']);
        Object.keys(formValue).forEach((key) => {
            if (skipKeys.has(key)) return;
            if (['endAt', 'startAt'].includes(key)) {
                setValue(key, moment(formValue[key]).toDate());
            } else {
                setValue(key, formValue[key]);
            }
        });
        // Normalise loginType regardless of what casing the backend returned
        const loginType = formValue.loginType || formValue.logintype || formValue.login_type;
        if (loginType) setValue('loginType', loginType);
    }, [formValue, resetting]);

    const handleServerError = (errData) => {
        const msg = errData?.msg || errData?.message || 'Something went wrong. Please try again.';
        setError('root.server', { type: 'server', message: msg });
    };

    const onSubmit = (data) => {
        if (!resetting && !data.password) delete data.password; // Don't send empty password when not resetting
        if (data.id) {
            dispatch(AdminManagementActions.postUser(true, data, () => {
                setIsOpen(false);
                dispatch(AdminManagementActions.getUsersList());
            }, data.id, handleServerError));
        } else {
            dispatch(AdminManagementActions.postUser(true, data, () => {
                setIsOpen(false);
                dispatch(AdminManagementActions.getUsersList());
            }, null, handleServerError));
        }
    };

    useEffect(() => {
        if (submitRef) submitRef.current = handleSubmit(onSubmit);
    });

    return (
        <div className="flex flex-col gap-0">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">

            <div>
                <label className={labelCls}>Login Type <span className="text-red-400">*</span></label>
                <select className={inputCls} {...register('loginType', { required: 'Required' })}>
                    <option value="">Select</option>
                    <option value="PasswordBased">Password Based</option>
                    <option value="TwoWayAuth">Two Way Auth</option>
                </select>
                {errors.loginType && <p className={errorCls}>{errors.loginType.message}</p>}
            </div>

            <div>
                <label className={labelCls}>Role <span className="text-red-400">*</span></label>
                <select className={inputCls} {...register('roleid', { required: 'Required' })}>
                    <option value="">Select role</option>
                    {roleList.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                {errors.roleid && <p className={errorCls}>{errors.roleid.message}</p>}
            </div>

            <div>
                <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
                <input type="text" className={inputCls} placeholder="First name"
                    {...register('firstname', { required: 'Required' })} />
                {errors.firstname && <p className={errorCls}>{errors.firstname.message}</p>}
            </div>

            <div>
                <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
                <input type="text" className={inputCls} placeholder="Last name"
                    {...register('lastname', { required: 'Required' })} />
                {errors.lastname && <p className={errorCls}>{errors.lastname.message}</p>}
            </div>

            <div>
                <label className={labelCls}>Username <span className="text-red-400">*</span></label>
                <input type="text" className={inputCls} placeholder="Username"
                    {...register('username', { required: 'Username is required' })} />
                {errors.username && <p className={errorCls}>{errors.username.message}</p>}
            </div>

            <div>
                <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                <input type="email" className={inputCls} placeholder="Email address"
                    {...register('email', {
                        required: 'Email is required',
                        pattern: {
                            value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                            message: 'Enter a valid email address (e.g. user@example.com)',
                        },
                    })} />
                {errors.email && <p className={errorCls}>{errors.email.message}</p>}
            </div>

            <div>
                <label className={labelCls}>Password {resetting && <span className="text-red-400">*</span>}</label>
                <input type="password" className={inputCls}
                    placeholder={resetting ? 'Password' : 'Leave blank to keep unchanged'}
                    {...register('password', { required: resetting ? 'Password is required' : false })} />
                {errors.password && <p className={errorCls}>{errors.password.message}</p>}
            </div>

        </div>

        <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-orange-500 cursor-pointer" {...register('sendEmail')} />
            <span className="text-sm text-slate-600">Send email to user</span>
        </label>

        {errors.root?.server && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">
                {errors.root.server.message}
            </p>
        )}
        </div>
    );
};

export default UserManagementForm;
