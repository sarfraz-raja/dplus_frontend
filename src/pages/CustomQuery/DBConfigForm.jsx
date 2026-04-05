import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';

const ORANGE = '#EC7D09';

const inputCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs text-slate-500 uppercase tracking-wide mb-1";
const errorCls = "text-xs text-red-500 mt-0.5";

const DBConfigForm = ({ setIsOpen, resetting, formValue = {} }) => {

    const dispatch = useDispatch()
    const userList = useSelector((state) => state?.customQuery?.usersList)

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm()

    useEffect(() => {
        reset({})
        if (resetting) {
            // new form — clear all
        } else {
            Object.keys(formValue).forEach((key) => {
                setValue(key, formValue[key])
            })
        }
    }, [formValue, resetting])

    const onTableViewTest = (data) => {
        dispatch(CustomQueryActions.testDBConfig(true, data, () => {}))
    }

    const onTableViewSubmit = (data) => {
        if (data.uniqueid) {
            delete data.name
            dispatch(CustomQueryActions.postDBConfig(true, data, () => {
                setIsOpen(false)
                dispatch(CustomQueryActions.getDBConfig())
            }, data.uniqueid))
        } else {
            dispatch(CustomQueryActions.postDBConfig(true, data, () => {
                setIsOpen(false)
                dispatch(CustomQueryActions.getDBConfig())
            }))
        }
    }

    return (
        <div className="p-5">

            {/* Form header */}
            <div
                style={{ background: ORANGE }}
                className="flex items-center justify-between px-4 py-3 rounded-lg mb-5 shadow-sm"
            >
                <h2 className="text-white font-semibold text-lg">
                    {resetting ? 'Add DB Configuration' : 'Edit DB Configuration'}
                </h2>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-white/80 hover:text-white text-xl leading-none"
                >
                    ✕
                </button>
            </div>

            {/* 2-column field grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                {/* DB Type */}
                <div>
                    <label className={labelCls}>DB Type <span className="text-red-400">*</span></label>
                    <select
                        className={inputCls}
                        {...register('dbtype', { required: 'Required' })}
                    >
                        <option value="">Select</option>
                        <option value="MSSQL">MSSQL</option>
                        <option value="MySQL">MySQL</option>
                        <option value="PostgreSQL">PostgreSQL</option>
                    </select>
                    {errors.dbtype && <p className={errorCls}>{errors.dbtype.message}</p>}
                </div>

                {/* DB Server */}
                <div>
                    <label className={labelCls}>DB Server <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="e.g. 192.168.1.10"
                        {...register('dbserver', { required: 'Required' })}
                    />
                    {errors.dbserver && <p className={errorCls}>{errors.dbserver.message}</p>}
                </div>

                {/* DB Name */}
                <div>
                    <label className={labelCls}>DB Name <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="e.g. my_database"
                        {...register('dbname', { required: 'Required' })}
                    />
                    {errors.dbname && <p className={errorCls}>{errors.dbname.message}</p>}
                </div>

                {/* Port */}
                <div>
                    <label className={labelCls}>Port <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="e.g. 5432"
                        {...register('port', { required: 'Required' })}
                    />
                    {errors.port && <p className={errorCls}>{errors.port.message}</p>}
                </div>

                {/* Username */}
                <div>
                    <label className={labelCls}>Username <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="DB username"
                        {...register('username', { required: 'Required' })}
                    />
                    {errors.username && <p className={errorCls}>{errors.username.message}</p>}
                </div>

                {/* Password */}
                <div>
                    <label className={labelCls}>Password <span className="text-red-400">*</span></label>
                    <input
                        type="password"
                        className={inputCls}
                        placeholder="DB password"
                        {...register('password', { required: 'Required' })}
                    />
                    {errors.password && <p className={errorCls}>{errors.password.message}</p>}
                </div>

                {/* User — full width */}
                <div className="col-span-2">
                    <label className={labelCls}>Assign User <span className="text-red-400">*</span></label>
                    <select
                        className={inputCls}
                        {...register('userId', { required: 'Required' })}
                    >
                        <option value="">Select user</option>
                        {userList?.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                    </select>
                    {errors.userId && <p className={errorCls}>{errors.userId.message}</p>}
                </div>

            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    onClick={handleSubmit(onTableViewTest)}
                    className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    Test Connection
                </button>
                <button
                    type="button"
                    onClick={handleSubmit(onTableViewSubmit)}
                    style={{ background: ORANGE }}
                    className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm"
                >
                    {resetting ? 'Add' : 'Save Changes'}
                </button>
            </div>

        </div>
    )
}

export default DBConfigForm;
