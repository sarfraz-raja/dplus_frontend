import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import AssuranceActions from '../../../store/actions/assurance-actions';
import { wholeNumber } from '../../../utils/common';
import { TELECOM_CONSTANTS } from '../../Tickets/ticketConstants';

const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400';
const labelCls = 'block text-xs text-slate-500 uppercase tracking-wide mb-1';
const errorCls = 'text-xs text-red-500 mt-0.5';

// enabled has no DB default — must always be sent explicitly (Section 11).
const SlaProfileForm = ({ setIsOpen, resetting, formValue, submitRef, onSaved }) => {
    const dispatch = useDispatch();
    const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm();

    useEffect(() => {
        reset({});
        if (!resetting && formValue) {
            setValue('name', formValue.name ?? '');
            setValue('priority', formValue.priority ?? '');
            setValue('ack_minutes', formValue.ack_minutes ?? '');
            setValue('response_minutes', formValue.response_minutes ?? '');
            setValue('resolution_minutes', formValue.resolution_minutes ?? '');
            setValue('warning_threshold_pct', formValue.warning_threshold_pct ?? '');
            setValue('enabled', formValue.enabled ?? true);
        } else {
            setValue('enabled', true);
        }
    }, [formValue, resetting]);

    const toNumOrNull = (v) => (v === '' || v === undefined || v === null ? null : Number(v));

    const onSubmit = (data) => {
        const payload = {
            name: data.name,
            priority: data.priority || null,
            ack_minutes: toNumOrNull(data.ack_minutes),
            response_minutes: toNumOrNull(data.response_minutes),
            resolution_minutes: toNumOrNull(data.resolution_minutes),
            warning_threshold_pct: toNumOrNull(data.warning_threshold_pct),
            enabled: !!data.enabled,
        };
        const onSuccess = () => {
            toast.success(resetting ? 'SLA profile created' : 'SLA profile updated');
            setIsOpen(false);
            onSaved && onSaved();
        };
        const onError = (msg) => {
            setError('root.server', { message: msg });
            toast.error(msg);
        };
        if (resetting) {
            dispatch(AssuranceActions.createSlaProfile(payload, onSuccess, onError));
        } else {
            dispatch(AssuranceActions.updateSlaProfile(formValue.id, payload, onSuccess, onError));
        }
    };

    useEffect(() => {
        submitRef.current = handleSubmit(onSubmit);
    });

    return (
        <form className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                <input className={inputCls} placeholder="e.g. Critical - 24x7" {...register('name', { required: 'Required' })} />
                {errors.name && <p className={errorCls}>{errors.name.message}</p>}
            </div>

            <div>
                <label className={labelCls}>Priority</label>
                {/* Same priority list as tickets. A saved value outside it (older free-text
                    profiles) stays as an extra option so it isn't blanked on edit. */}
                <select className={inputCls} {...register('priority')}>
                    <option value="">Not set</option>
                    {TELECOM_CONSTANTS.PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    {!resetting && formValue?.priority && !TELECOM_CONSTANTS.PRIORITIES.includes(formValue.priority) && (
                        <option value={formValue.priority}>{formValue.priority}</option>
                    )}
                </select>
            </div>
            <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                    <input type="checkbox" className="w-4 h-4 accent-orange-500" {...register('enabled')} />
                    Enabled
                </label>
            </div>

            <div>
                <label className={labelCls}>Ack Minutes</label>
                <input type="number" min="0" className={inputCls} placeholder="No SLA if blank" {...register('ack_minutes', { min: { value: 0, message: 'Cannot be negative' }, validate: wholeNumber })} />
                {errors.ack_minutes && <p className={errorCls}>{errors.ack_minutes.message}</p>}
            </div>
            <div>
                <label className={labelCls}>Response Minutes</label>
                <input type="number" min="0" className={inputCls} placeholder="No SLA if blank" {...register('response_minutes', { min: { value: 0, message: 'Cannot be negative' }, validate: wholeNumber })} />
                {errors.response_minutes && <p className={errorCls}>{errors.response_minutes.message}</p>}
            </div>
            <div>
                <label className={labelCls}>Resolution Minutes</label>
                <input type="number" min="0" className={inputCls} placeholder="No SLA if blank" {...register('resolution_minutes', { min: { value: 0, message: 'Cannot be negative' }, validate: wholeNumber })} />
                {errors.resolution_minutes && <p className={errorCls}>{errors.resolution_minutes.message}</p>}
            </div>
            <div>
                <label className={labelCls}>Warning Threshold %</label>
                <input type="number" min="0" max="100" step="any" className={inputCls} placeholder="e.g. 80"
                    {...register('warning_threshold_pct', { min: { value: 0, message: 'Must be 0–100' }, max: { value: 100, message: 'Must be 0–100' } })} />
                {errors.warning_threshold_pct && <p className={errorCls}>{errors.warning_threshold_pct.message}</p>}
            </div>

            <p className="col-span-2 text-xs text-slate-400 -mt-1">
                Leaving a minutes field blank means that SLA dimension isn't tracked at all. Editing this profile only affects tickets created/reopened after saving — existing tickets keep their original snapshot.
            </p>

            {errors.root?.server && <p className={`col-span-2 ${errorCls}`}>{errors.root.server.message}</p>}
        </form>
    );
};

export default SlaProfileForm;
