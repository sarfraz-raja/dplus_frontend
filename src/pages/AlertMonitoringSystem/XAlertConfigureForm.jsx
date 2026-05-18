import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import EmailChipInput from '../../components/EmailChipInput';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import AlertConfigurationActions from '../../store/actions/alertConfiguration-actions';
import Button from '../../components/Button';
import moment from 'moment';

const inputCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs text-slate-500 uppercase tracking-wide mb-1";
const errorCls = "text-xs text-red-500 mt-0.5";
const textareaCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none h-20";

const XAlertConfigureForm = ({ setIsOpen, resetting, formValue = {}, submitRef }) => {
    const dispatch = useDispatch();
    const userList = useSelector((state) => state?.customQuery?.usersList ?? []);
    const databaseList = useSelector((state) => state?.customQuery?.databaseList ?? []);

    const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm();

    useEffect(() => {
        dispatch(CustomQueryActions.getDatabaseList());
        dispatch(CustomQueryActions.getUserList());

        reset({});
        if (!resetting) {
            Object.keys(formValue).forEach((key) => {
                const lk = key.toLowerCase();
                if (lk === 'startat' || lk === 'endat') {
                    const d = moment(formValue[key], 'DD-MM-YYYY HH:mm:ss');
                    setValue(lk, d.isValid() ? d.format('YYYY-MM-DD') : formValue[key]);
                } else if (lk === 'timeall') {
                    setValue('timeall', formValue[key]);
                } else {
                    setValue(lk, formValue[key]);
                }
            });
        }
    }, [formValue, resetting]);

    const onSubmit = (data) => {
        if (data.mailrecipients) {
            data.mailrecipients = data.mailrecipients.split(/[,;:]/).map(e => e.trim()).filter(Boolean).join(',');
        }
        const id = data.id || data.uniqueid;
        if (id) {
            dispatch(AlertConfigurationActions.pAlertConfig(true, data, () => {
                setIsOpen(false);
                dispatch(AlertConfigurationActions.alertConfigurationList());
            }, id));
        } else {
            dispatch(AlertConfigurationActions.pAlertConfig(true, data, () => {
                setIsOpen(false);
                dispatch(AlertConfigurationActions.alertConfigurationList());
            }));
        }
    };

    // Wire submit handler to ref so parent can trigger it from footer buttons
    useEffect(() => {
        if (submitRef) submitRef.current = handleSubmit(onSubmit);
    });

    return (
        <>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                {/* Frequency */}
                <div>
                    <label className={labelCls}>Frequency <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('frequency', { required: 'Required' })}>
                        <option value="">Select</option>
                        <option value="Hourly">Hourly</option>
                        <option value="Daily">Daily</option>
                    </select>
                    {errors.frequency && <p className={errorCls}>{errors.frequency.message}</p>}
                </div>

                {/* DB Server */}
                <div>
                    <label className={labelCls}>DB Server <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('dbserver', { required: 'Required' })}>
                        <option value="">Select server</option>
                        {databaseList?.map((db) => (
                            <option key={db.value} value={db.value}>{db.label}</option>
                        ))}
                    </select>
                    {errors.dbserver && <p className={errorCls}>{errors.dbserver.message}</p>}
                </div>

                {/* Mail Attachement */}
                <div>
                    <label className={labelCls}>Mail Attachement <span className="text-red-400">*</span></label>
                    <textarea className={textareaCls} placeholder="SQL for mail attachment..." {...register('mailquery', { required: 'Required' })} />
                    {errors.mailquery && <p className={errorCls}>{errors.mailquery.message}</p>}
                </div>

                {/* Graph Query */}
                <div>
                    <label className={labelCls}>Graph Query <span className="text-red-400">*</span></label>
                    <textarea className={textareaCls} placeholder="SQL for graph..." {...register('graphquery', { required: 'Required' })} />
                    {errors.graphquery && <p className={errorCls}>{errors.graphquery.message}</p>}
                </div>

                {/* Mail Subject — full width */}
                <div className="col-span-2">
                    <label className={labelCls}>Mail Subject <span className="text-red-400">*</span></label>
                    <input type="text" className={inputCls} placeholder="Email subject line" {...register('mailsubject', { required: 'Required' })} />
                    {errors.mailsubject && <p className={errorCls}>{errors.mailsubject.message}</p>}
                </div>

                {/* Mail Recipients — full width */}
                <div className="col-span-2">
                    <label className={labelCls}>Mail Recipients <span className="text-red-400">*</span></label>
                    <Controller
                        name="mailrecipients"
                        control={control}
                        rules={{ required: 'Required' }}
                        render={({ field }) => (
                            <EmailChipInput
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="Add emails — press comma, semicolon, colon or Enter"
                            />
                        )}
                    />
                    {errors.mailrecipients && <p className={errorCls}>{errors.mailrecipients.message}</p>}
                </div>

                {/* Mail Body — full width */}
                <div className="col-span-2">
                    <label className={labelCls}>Mail Body <span className="text-red-400">*</span></label>
                    <textarea className={textareaCls} placeholder="Email body text..." {...register('mailbody', { required: 'Required' })} />
                    {errors.mailbody && <p className={errorCls}>{errors.mailbody.message}</p>}
                </div>

                {/* Start Date */}
                <div>
                    <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
                    <input type="date" className={inputCls} {...register('startat', { required: 'Required' })} />
                    {errors.startat && <p className={errorCls}>{errors.startat.message}</p>}
                </div>

                {/* End Date */}
                <div>
                    <label className={labelCls}>End Date <span className="text-red-400">*</span></label>
                    <input type="date" className={inputCls} {...register('endat', { required: 'Required' })} />
                    {errors.endat && <p className={errorCls}>{errors.endat.message}</p>}
                </div>

                {/* Time */}
                <div>
                    <label className={labelCls}>Time <span className="text-red-400">*</span></label>
                    <input type="time" className={inputCls} {...register('timeall', { required: 'Required' })} />
                    {errors.timeall && <p className={errorCls}>{errors.timeall.message}</p>}
                </div>

                {/* Assign User */}
                <div>
                    <label className={labelCls}>Assign User <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('userid', { required: 'Required' })}>
                        <option value="">Select user</option>
                        {userList?.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                    </select>
                    {errors.userid && <p className={errorCls}>{errors.userid.message}</p>}
                </div>

                {/* Mail Output — full width */}
                <div className="col-span-2">
                    <label className={labelCls}>Mail Output <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('mailoutput', { required: 'Required' })}>
                        <option value="">Select format</option>
                        <option value="excel">Excel</option>
                        <option value="csv">CSV</option>
                    </select>
                    {errors.mailoutput && <p className={errorCls}>{errors.mailoutput.message}</p>}
                </div>

            </div>

            {/* Buttons — only shown when footer is not managed by the parent via submitRef */}
            {!submitRef && (
                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" onClick={() => setIsOpen(false)} variant="secondary" className="px-5 py-2 text-sm font-semibold">
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit(onSubmit)} variant="primary" className="px-6 py-2 text-sm font-semibold">
                        {resetting ? 'Add' : 'Save Changes'}
                    </Button>
                </div>
            )}
        </>
    );
};

export default XAlertConfigureForm;
