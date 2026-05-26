import { useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import EmailChipInput from '../../components/EmailChipInput';

const inputCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs text-slate-500 uppercase tracking-wide mb-1";
const errorCls = "text-xs text-red-500 mt-0.5";
const textareaCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none h-20";

const SOURCE_TYPES = [
    { value: 'superset_dashboard', label: 'Superset Dashboard' },
    { value: 'superset_chart',     label: 'Superset Chart' },
    { value: 'sql_query',          label: 'SQL Query' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const isSuperset = (t) => t === 'superset_dashboard' || t === 'superset_chart';

const SectionHeader = ({ icon, title, subtitle }) => (
    <div className="col-span-2 flex items-center gap-2 pt-1">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: '#0b1830' }}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-semibold text-slate-700 leading-none">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

const XReportSchedulerForm = ({ setIsOpen, submitRef }) => {
    const [sourceType, setSourceType] = useState('superset_dashboard');

    const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
        defaultValues: { sourcetype: 'superset_dashboard' },
    });

    const frequency = useWatch({ control, name: 'frequency' });

    const onSubmit = (data) => {
        console.log('Report Scheduler submit:', data);
        setIsOpen(false);
    };

    useEffect(() => {
        if (submitRef) submitRef.current = handleSubmit(onSubmit);
    });

    const handleSourceChange = (val) => {
        setSourceType(val);
        setValue('sourcetype', val);
    };

    return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">

            {/* ── Section 1: Report Source ── */}
            <SectionHeader
                title="Report Source"
                subtitle="Where the report data comes from"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    </svg>
                }
            />

            {/* Report Name */}
            <div className="col-span-2">
                <label className={labelCls}>Report Name <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Daily KPI Summary"
                    {...register('reportname', { required: 'Required' })}
                />
                {errors.reportname && <p className={errorCls}>{errors.reportname.message}</p>}
            </div>

            {/* Source Type tabs */}
            <div className="col-span-2">
                <label className={labelCls}>Source Type <span className="text-red-400">*</span></label>
                <div className="flex rounded border border-slate-300 overflow-hidden">
                    {SOURCE_TYPES.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            onClick={() => handleSourceChange(s.value)}
                            className={`flex-1 py-2 text-xs font-medium transition-colors ${
                                sourceType === s.value
                                    ? 'bg-[#0b1830] text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <input type="hidden" {...register('sourcetype')} />
            </div>

            {isSuperset(sourceType) && (
                <div className="col-span-2">
                    <label className={labelCls}>
                        {sourceType === 'superset_dashboard' ? 'Dashboard ID / Name' : 'Chart ID / Name'}
                        <span className="text-red-400"> *</span>
                    </label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder={sourceType === 'superset_dashboard' ? 'e.g. KPI Overview (ID: 12)' : 'e.g. RF Performance Chart (ID: 45)'}
                        {...register('sourceid', { required: 'Required' })}
                    />
                    {errors.sourceid && <p className={errorCls}>{errors.sourceid.message}</p>}
                </div>
            )}

            {sourceType === 'sql_query' && (
                <div className="col-span-2">
                    <label className={labelCls}>SQL Query <span className="text-red-400">*</span></label>
                    <textarea
                        className={textareaCls}
                        placeholder="SELECT ..."
                        {...register('sqlquery', { required: 'Required' })}
                    />
                    {errors.sqlquery && <p className={errorCls}>{errors.sqlquery.message}</p>}
                </div>
            )}

            {/* ── Section 2: Schedule ── */}
            <SectionHeader
                title="Schedule"
                subtitle="When and how often to run"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                }
            />

            {/* Row 1: Frequency | Output Format */}
            <div>
                <label className={labelCls}>Frequency <span className="text-red-400">*</span></label>
                <select className={inputCls} {...register('frequency', { required: 'Required' })}>
                    <option value="">Select</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                </select>
                {errors.frequency && <p className={errorCls}>{errors.frequency.message}</p>}
            </div>

            <div>
                <label className={labelCls}>Output Format <span className="text-red-400">*</span></label>
                <select className={inputCls} {...register('outputformat', { required: 'Required' })}>
                    <option value="">Select</option>
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                </select>
                {errors.outputformat && <p className={errorCls}>{errors.outputformat.message}</p>}
            </div>

            {/* Row 2: Start Date | End Date */}
            <div>
                <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
                <input type="date" className={inputCls} {...register('startat', { required: 'Required' })} />
                {errors.startat && <p className={errorCls}>{errors.startat.message}</p>}
            </div>

            <div>
                <label className={labelCls}>End Date <span className="text-red-400">*</span></label>
                <input type="date" className={inputCls} {...register('endat', { required: 'Required' })} />
                {errors.endat && <p className={errorCls}>{errors.endat.message}</p>}
            </div>

            {/* Row 3: Time | Day of Week (Weekly only) */}
            <div>
                <label className={labelCls}>Time <span className="text-red-400">*</span></label>
                <input type="time" className={inputCls} {...register('timeall', { required: 'Required' })} />
                {errors.timeall && <p className={errorCls}>{errors.timeall.message}</p>}
            </div>

            {frequency === 'Weekly' && (
                <div>
                    <label className={labelCls}>Day of Week <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('dayofweek', { required: 'Required' })}>
                        <option value="">Select day</option>
                        {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    {errors.dayofweek && <p className={errorCls}>{errors.dayofweek.message}</p>}
                </div>
            )}

            {/* ── Section 3: Delivery ── */}
            <SectionHeader
                title="Delivery"
                subtitle="Email recipients and message"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                }
            />

            {/* Mail Subject */}
            <div className="col-span-2">
                <label className={labelCls}>Mail Subject <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    className={inputCls}
                    placeholder="Email subject line"
                    {...register('mailsubject', { required: 'Required' })}
                />
                {errors.mailsubject && <p className={errorCls}>{errors.mailsubject.message}</p>}
            </div>

            {/* Mail Recipients */}
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

            {/* Mail Body */}
            <div className="col-span-2">
                <label className={labelCls}>Mail Body <span className="text-red-400">*</span></label>
                <textarea
                    className={textareaCls}
                    placeholder="Email body text..."
                    {...register('mailbody', { required: 'Required' })}
                />
                {errors.mailbody && <p className={errorCls}>{errors.mailbody.message}</p>}
            </div>

        </div>
    );
};

export default XReportSchedulerForm;
