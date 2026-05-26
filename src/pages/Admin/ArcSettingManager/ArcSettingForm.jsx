import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';

const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400 cursor-not-allowed';
const inputActiveCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400';
const labelCls = 'block text-xs text-slate-500 uppercase tracking-wide mb-1';
const errorCls = 'text-xs text-red-500 mt-0.5';

const ArcSettingForm = ({ isEdit, formValue = {}, submitRef, onSuccess }) => {
    const dispatch = useDispatch();
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

    useEffect(() => {
        reset({});
        if (!isEdit) return;
        setValue('band',       formValue.band       ?? '');
        setValue('technology', formValue.technology ?? '');
        setValue('length',     formValue.length     ?? '');
    }, [formValue, isEdit]);

    const onSubmit = (data) => {
        if (isEdit) {
            const payload = {
                existing_band:       formValue.band,
                existing_technology: formValue.technology,
                length:              data.length,
            };
            dispatch(AdminManagementActions.updateArcSetting(
                payload,
                () => {
                    toast.success('Arc setting updated');
                    dispatch(AdminManagementActions.getArcSettingList());
                    onSuccess?.();
                },
                (err) => toast.error(err?.msg || 'Failed to update arc setting'),
            ));
        } else {
            dispatch(AdminManagementActions.postArcSetting(
                { band: data.band, technology: data.technology, length: data.length },
                () => {
                    toast.success('Arc setting created');
                    dispatch(AdminManagementActions.getArcSettingList());
                    onSuccess?.();
                },
                (err) => toast.error(err?.msg || 'Failed to create arc setting'),
            ));
        }
    };

    useEffect(() => {
        if (submitRef) submitRef.current = handleSubmit(onSubmit);
    });

    return (
        <div className="flex flex-col gap-4 py-1">

            <div>
                <label className={labelCls}>Band <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    placeholder="e.g. LTE1800"
                    disabled={isEdit}
                    className={isEdit ? inputCls : inputActiveCls}
                    {...register('band', { required: 'Band is required' })}
                />
                {errors.band && <p className={errorCls}>{errors.band.message}</p>}
                {isEdit && <p className="text-xs text-slate-400 mt-0.5">Band cannot be changed — used as identifier</p>}
            </div>

            <div>
                <label className={labelCls}>Technology <span className="text-red-400">*</span></label>
                <select
                    disabled={isEdit}
                    className={isEdit ? inputCls : inputActiveCls}
                    {...register('technology', { required: 'Technology is required' })}
                >
                    <option value="">Select technology</option>
                    <option value="2G">2G</option>
                    <option value="3G">3G</option>
                    <option value="4G">4G</option>
                    <option value="5G">5G</option>
                </select>
                {errors.technology && <p className={errorCls}>{errors.technology.message}</p>}
                {isEdit && <p className="text-xs text-slate-400 mt-0.5">Technology cannot be changed — used as identifier</p>}
            </div>

            <div>
                <label className={labelCls}>Length (m) <span className="text-red-400">*</span></label>
                <input
                    type="number"
                    min="1"
                    placeholder="e.g. 120"
                    className={inputActiveCls}
                    {...register('length', {
                        required: 'Length is required',
                        min: { value: 1, message: 'Length must be greater than 0' },
                        valueAsNumber: true,
                    })}
                />
                {errors.length && <p className={errorCls}>{errors.length.message}</p>}
            </div>

        </div>
    );
};

export default ArcSettingForm;
