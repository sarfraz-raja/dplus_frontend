import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import AssuranceActions from '../../../store/actions/assurance-actions';
import GroupManagementActions from '../../../store/actions/groupManagement-actions';
import CustomQueryActions from '../../../store/actions/customQuery-actions';
import { wholeNumber } from '../../../utils/common';
import { TELECOM_CONSTANTS } from '../../Tickets/ticketConstants';

const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400';
const labelCls = 'block text-xs text-slate-500 uppercase tracking-wide mb-1';
const errorCls = 'text-xs text-red-500 mt-0.5';

// levels[].target_type is free text on the backend (not confirmed to share
// the rule-level SELF/ALL/GROUP/USER enum, per Section 12) — GROUP/USER are
// offered as the practical choices since those are what a level actually notifies.
const TARGET_TYPES = ['GROUP', 'USER'];
const CHANNELS = ['EMAIL', 'SMS', 'WEBHOOK'];

const withSaved = (list, saved) => (saved && !list.includes(saved) ? [...list, saved] : list);

const emptyLevel = (n) => ({ level_number: n, trigger_condition: 'SLA_WARNING', escalation_delay_minutes: '', target_type: 'GROUP', target_id: '', notification_channel: '' });

const EscalationPolicyForm = ({ setIsOpen, resetting, formValue, submitRef, onSaved }) => {
    const dispatch = useDispatch();
    const [groupList, setGroupList] = useState([]);
    const userList = useSelector((state) => state?.customQuery?.usersList ?? []);
    const { register, control, watch, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm({
        defaultValues: { levels: [emptyLevel(1)], enabled: false },
    });
    const { fields: levelFields, append: appendLevel, remove: removeLevel } = useFieldArray({ control, name: 'levels' });

    // Same sources the Rule Builder's assignment step uses: GET /groups and the platform user list.
    useEffect(() => {
        dispatch(CustomQueryActions.getUserList());
        dispatch(GroupManagementActions.getGroups((data) => {
            setGroupList((data ?? []).map((g) => ({ value: g.id, label: g.group_name })));
        }));
    }, []);

    useEffect(() => {
        reset({
            name: !resetting ? (formValue?.name ?? '') : '',
            applicable_severity: !resetting ? (formValue?.applicable_severity ?? '') : '',
            applicable_priority: !resetting ? (formValue?.applicable_priority ?? '') : '',
            enabled: !resetting ? (formValue?.enabled ?? false) : false,
            levels: !resetting && formValue?.levels?.length ? formValue.levels : [emptyLevel(1)],
        });
    }, [formValue, resetting]);

    // Options for a level's target picker. A saved target that isn't in the loaded list (deleted,
    // or the list hasn't arrived yet) is kept as an explicit option under the SAME key, so the
    // stored id is never silently blanked and the option resolves in place once the list loads.
    const targetOptions = (targetType, current) => {
        const list = targetType === 'USER' ? userList : groupList;
        if (current && !list.some((o) => o.value === current)) {
            return [...list, { value: current, label: `Unknown (${String(current).slice(0, 8)}…)` }];
        }
        return list;
    };

    const onSubmit = (data) => {
        const payload = {
            name: data.name,
            applicable_severity: data.applicable_severity || null,
            applicable_priority: data.applicable_priority || null,
            enabled: !!data.enabled,
            levels: (data.levels || []).map((l) => ({
                level_number: Number(l.level_number),
                trigger_condition: l.trigger_condition,
                escalation_delay_minutes: Number(l.escalation_delay_minutes),
                target_type: l.target_type,
                target_id: l.target_id,
                notification_channel: l.notification_channel || undefined,
            })),
        };
        const onSuccess = () => {
            toast.success(resetting ? 'Escalation policy created' : 'Escalation policy updated');
            setIsOpen(false);
            onSaved && onSaved();
        };
        const onError = (msg) => {
            setError('root.server', { message: msg });
            toast.error(msg);
        };
        if (resetting) {
            dispatch(AssuranceActions.createEscalationPolicy(payload, onSuccess, onError));
        } else {
            dispatch(AssuranceActions.updateEscalationPolicy(formValue.id, payload, onSuccess, onError));
        }
    };

    useEffect(() => {
        submitRef.current = handleSubmit(onSubmit);
    });

    const levelError = (idx, field) => errors.levels?.[idx]?.[field]?.message;

    return (
        <form className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                    <input className={inputCls} placeholder="e.g. Critical Escalation Chain" {...register('name', { required: 'Required' })} />
                    {errors.name && <p className={errorCls}>{errors.name.message}</p>}
                </div>
                {/* Same severity/priority lists as rules and tickets. A saved value outside them
                    (older free-text policies) stays as an extra option so it isn't blanked on edit. */}
                <div>
                    <label className={labelCls}>Applicable Severity</label>
                    <select className={inputCls} {...register('applicable_severity')}>
                        <option value="">Any</option>
                        {withSaved(TELECOM_CONSTANTS.SEVERITIES, !resetting && formValue?.applicable_severity).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Applicable Priority</label>
                    <select className={inputCls} {...register('applicable_priority')}>
                        <option value="">Any</option>
                        {withSaved(TELECOM_CONSTANTS.PRIORITIES, !resetting && formValue?.applicable_priority).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                        <input type="checkbox" className="w-4 h-4 accent-orange-500" {...register('enabled')} />
                        Enabled
                    </label>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Levels <span className="text-red-400">*</span> (at least one)</label>
                    <button type="button" onClick={() => appendLevel(emptyLevel(levelFields.length + 1))}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                        + Add level
                    </button>
                </div>
                <div className="flex flex-col gap-3">
                    {levelFields.map((field, idx) => {
                        const targetType = watch(`levels.${idx}.target_type`);
                        const currentTarget = watch(`levels.${idx}.target_id`);
                        return (
                            <div key={field.id} className="border border-slate-200 rounded-md p-3 bg-slate-50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-500">Level {idx + 1}</span>
                                    <button type="button" onClick={() => removeLevel(idx)} disabled={levelFields.length === 1}
                                        className="text-xs text-slate-400 hover:text-red-500 disabled:opacity-30">Remove</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <div>
                                        <label className={labelCls}>Level Number</label>
                                        <input type="number" min="1" className={inputCls}
                                            {...register(`levels.${idx}.level_number`, { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be at least 1' }, validate: wholeNumber })} />
                                        {levelError(idx, 'level_number') && <p className={errorCls}>{levelError(idx, 'level_number')}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Delay (mins)</label>
                                        <input type="number" min="0" className={inputCls} placeholder="After SLA warning"
                                            {...register(`levels.${idx}.escalation_delay_minutes`, { required: 'Required', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' }, validate: wholeNumber })} />
                                        {levelError(idx, 'escalation_delay_minutes') && <p className={errorCls}>{levelError(idx, 'escalation_delay_minutes')}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Trigger Condition</label>
                                        <input className={inputCls} placeholder="e.g. SLA_WARNING"
                                            {...register(`levels.${idx}.trigger_condition`, { required: 'Required' })} />
                                        {levelError(idx, 'trigger_condition') && <p className={errorCls}>{levelError(idx, 'trigger_condition')}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Target Type</label>
                                        <select className={inputCls}
                                            {...register(`levels.${idx}.target_type`, {
                                                required: 'Required',
                                                // A group id is meaningless as a user id and vice versa — clear it on switch.
                                                onChange: () => setValue(`levels.${idx}.target_id`, ''),
                                            })}>
                                            {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>{targetType === 'USER' ? 'User' : 'Group'}</label>
                                        <select className={inputCls} {...register(`levels.${idx}.target_id`, { required: 'Required' })}>
                                            <option value="">{targetType === 'USER' ? 'Select user' : 'Select group'}</option>
                                            {targetOptions(targetType, currentTarget).map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        {levelError(idx, 'target_id') && <p className={errorCls}>{levelError(idx, 'target_id')}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Notification Channel</label>
                                        <select className={inputCls} {...register(`levels.${idx}.notification_channel`)}>
                                            <option value="">None</option>
                                            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    Pick the group (from Group Management) or user this level notifies once its delay has passed.
                </p>
            </div>

            <p className="text-xs text-slate-400">
                Editing this policy only affects tickets created/reopened after saving — existing tickets keep their original escalation_snapshot.
            </p>

            {errors.root?.server && <p className={errorCls}>{errors.root.server.message}</p>}
        </form>
    );
};

export default EscalationPolicyForm;
