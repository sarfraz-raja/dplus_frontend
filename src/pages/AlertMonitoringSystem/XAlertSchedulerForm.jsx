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

const FREQ_OPTIONS = [5,10,15,30,60];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const pad2 = (n) => String(n).padStart(2, '0');

const XAlertSchedulerForm = ({ setIsOpen, resetting, formValue = {}, submitRef }) => {
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
                    setValue(lk === 'startat' ? 'starthour' : 'endhour', d.isValid() ? d.hour() : 0);
                } else {
                    setValue(lk, formValue[key]);
                }
            });
        }
    }, [formValue, resetting]);

    const onSubmit = (data) => {
        const minute = Number(data.frequency) % 60;
        if (data.startat) {
            data.startat = `${moment(data.startat).format('DD-MM-YYYY')} ${pad2(data.starthour)}:${pad2(minute)}:00`;
        }
        if (data.endat) {
            data.endat = `${moment(data.endat).format('DD-MM-YYYY')} ${pad2(data.endhour)}:${pad2(minute)}:00`;
        }
        delete data.starthour;
        delete data.endhour;
        if (data.mailrecipients) {
            data.mailrecipients = data.mailrecipients.split(/[,;:]/).map(e => e.trim()).filter(Boolean).join(',');
        }
        const id = data.id || data.uniqueid;
        if (id) {
            dispatch(AlertConfigurationActions.pAlertScheduler(true, data, () => {
                setIsOpen(false);
                dispatch(AlertConfigurationActions.alertSchedulerList());
            }, id));
        } else {
            dispatch(AlertConfigurationActions.pAlertScheduler(true, data, () => {
                setIsOpen(false);
                dispatch(AlertConfigurationActions.alertSchedulerList());
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
                    <label className={labelCls}>Frequency (in mins) <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('frequency', { required: 'Required' })}>
                        <option value="">Select</option>
                        {FREQ_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
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

                {/* Mail Body */}
                <div>
                    <label className={labelCls}>Mail Body <span className="text-red-400">*</span></label>
                    <textarea className={textareaCls} placeholder="Email body text..." {...register('mailbody', { required: 'Required' })} />
                    {errors.mailbody && <p className={errorCls}>{errors.mailbody.message}</p>}
                </div>

                {/* Mail Query Body */}
                <div>
                    <label className={labelCls}>Mail Query Body <span className="text-red-400">*</span></label>
                    <textarea className={textareaCls} placeholder="Query body for inline mail content..." {...register('mailquerybody', { required: 'Required' })} />
                    {errors.mailquerybody && <p className={errorCls}>{errors.mailquerybody.message}</p>}
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

                {/* Start Date */}
                <div>
                    <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                        <input type="date" className={`${inputCls} flex-[2]`} {...register('startat', { required: 'Required' })} />
                        <select className={`${inputCls} flex-1 text-sm`} {...register('starthour', { required: 'Required' })}>
                            <option value="">HH</option>
                            {HOUR_OPTIONS.map(h => <option key={h} value={h}>{pad2(h)}</option>)}
                        </select>
                    </div>
                    {errors.startat && <p className={errorCls}>{errors.startat.message}</p>}
                    {errors.starthour && <p className={errorCls}>{errors.starthour.message}</p>}
                </div>

                {/* End Date */}
                <div>
                    <label className={labelCls}>End Date <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                        <input type="date" className={`${inputCls} flex-[2]`} {...register('endat', { required: 'Required' })} />
                        <select className={`${inputCls} flex-1 text-sm`} {...register('endhour', { required: 'Required' })}>
                            <option value="">HH</option>
                            {HOUR_OPTIONS.map(h => <option key={h} value={h}>{pad2(h)}</option>)}
                        </select>
                    </div>
                    {errors.endat && <p className={errorCls}>{errors.endat.message}</p>}
                    {errors.endhour && <p className={errorCls}>{errors.endhour.message}</p>}
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

                {/* Mail Output */}
                <div>
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

export default XAlertSchedulerForm;
