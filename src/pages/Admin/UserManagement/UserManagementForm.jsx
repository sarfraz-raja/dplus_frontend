import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';

const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400';
const labelCls = 'block text-xs text-slate-500 uppercase tracking-wide mb-1';
const errorCls = 'text-xs text-red-500 mt-0.5';

const UserManagementForm = ({ setIsOpen, resetting, formValue = {}, submitRef }) => {
    const dispatch = useDispatch();
    const [showPassword, setShowPassword] = useState(false);
    const roleList = useSelector((s) => s?.adminManagement?.roleList ?? []);

    const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm();

    useEffect(() => {
        dispatch(AdminManagementActions.getRoleList());
        reset({});
        setValue('sendEmail', resetting);
        if (resetting) return;
        // logintype / login_type are backend variants — normalised below, skip here to avoid duplicate keys
        const skipKeys = new Set(['logintype', 'login_type', 'sendemail', 'send_email', 'password']);
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
                    <option value="OAuth">OAuth</option>
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
                <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} className={inputCls}
                        autoComplete="new-password"
                        placeholder={resetting ? 'Password' : 'Leave blank to keep unchanged'}
                        {...register('password', { required: resetting ? 'Password is required' : false })} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>
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
