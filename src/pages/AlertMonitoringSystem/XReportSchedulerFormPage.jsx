import { useState, useEffect, useRef } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import EmailChipInput from '../../components/EmailChipInput';
import AlertConfigurationActions from '../../store/actions/alertConfiguration-actions';

const inputCls = "w-full border border-slate-200 rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 lg:px-2 lg:py-1 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-[9px] lg:text-[10px] text-slate-500 uppercase tracking-wide mb-0.5 font-medium";
const errorCls = "text-[9px] text-red-500 mt-0.5";

const SOURCE_TYPES = [
    { value: 'v1_dashboard', label: 'V1 Dashboard' },
    { value: 'v1_chart',     label: 'V1 Chart' },
    // { value: 'v2_dashboard', label: 'V2 Dashboard' },
    // { value: 'v2_chart',     label: 'V2 Chart' },
    // { value: 'v3_dashboard', label: 'V3 Dashboard' },
    // { value: 'v3_chart',     label: 'V3 Chart' },
    // { value: 'v4_dashboard', label: 'V4 Dashboard' },
    // { value: 'v4_chart',     label: 'V4 Chart' },
    // { value: 'v5_dashboard', label: 'V5 Dashboard' },
    // { value: 'v5_chart',     label: 'V5 Chart' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const STATUS_OPTIONS = ['draft', 'active', 'paused', 'completed', 'failed', 'deleted'];

const STATUS_STYLES = {
    draft:     'bg-slate-100 text-slate-600',
    active:    'bg-green-100 text-green-700',
    paused:    'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    failed:    'bg-red-100 text-red-700',
    deleted:   'bg-slate-200 text-slate-400',
};

const STATUS_DOT = {
    draft:     'bg-slate-400',
    active:    'bg-green-500',
    paused:    'bg-yellow-400',
    completed: 'bg-blue-500',
    failed:    'bg-red-500',
    deleted:   'bg-slate-300',
};

const TRANSITION_HOVER = {
    draft:     'hover:bg-slate-50 hover:text-slate-700',
    active:    'hover:bg-green-50 hover:text-green-700',
    paused:    'hover:bg-yellow-50 hover:text-yellow-700',
    completed: 'hover:bg-blue-50 hover:text-blue-700',
    failed:    'hover:bg-red-50 hover:text-red-700',
    deleted:   'hover:bg-red-50 hover:text-red-500',
};

const StatusPicker = ({ value, originalStatus, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const options = STATUS_OPTIONS.filter((s) => s !== value);

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-1.5 border rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 lg:px-2 lg:py-1 text-xs font-semibold transition-colors cursor-pointer hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-orange-400
                    ${STATUS_STYLES[value] || 'bg-slate-100 text-slate-500'} border-transparent
                    ${value && value !== originalStatus ? 'ring-1 ring-amber-400' : ''}
                `}
            >
                <span className="inline-flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[value] || 'bg-slate-400'}`} />
                    <span className="capitalize">{value || '—'}</span>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[148px] w-full bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 overflow-hidden">
                    <p className="px-3 pt-0.5 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        Change status
                    </p>
                    {options.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => { setOpen(false); onChange(s); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors ${TRANSITION_HOVER[s] || 'hover:bg-slate-50'}`}
                        >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s] || 'bg-slate-400'}`} />
                            <span className="capitalize">{s}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const isVersioned = () => true; // all source types need source_id + theme

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon, title, subtitle }) => (
    <div className="flex items-center gap-2 px-3 py-2 lg:px-3 lg:py-1.5 border-b border-slate-100 shrink-0">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: '#0b1830' }}>
            {icon}
        </div>
        <div>
            <p className="text-xs font-semibold text-slate-700 leading-none">{title}</p>
            {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

const SummaryRow = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
            <span className="text-xs text-slate-400 uppercase tracking-wide shrink-0">{label}</span>
            <span className="text-sm text-slate-700 font-medium text-right break-all">{value}</span>
        </div>
    );
};

const XReportSchedulerFormPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [sourceType, setSourceType] = useState('v1_dashboard');
    const [theme, setTheme] = useState('light');
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [apiError, setApiError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(isEdit);
    const [originalStatus, setOriginalStatus] = useState(null);

    const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm({
        defaultValues: { source_type: 'v1_dashboard', theme: 'light' },
    });

    const watched = useWatch({ control });
    const frequency = watched.frequency;

    // Fetch and pre-fill on edit
    useEffect(() => {
        if (!isEdit) return;
        dispatch(AlertConfigurationActions.getReportSchedulerById(id, (data) => {
            if (data.status === 'deleted') {
                navigate('/xalerts/report-scheduler');
                return;
            }
            setOriginalStatus(data.status);
            setSourceType(data.source_type || 'v1_dashboard');
            setTheme(data.theme || 'light');
            // Convert datetime fields for datetime-local input (replace space with T)
            const toInputValue = (dt) => dt?.replace(/\//g, '-').replace(' ', 'T').slice(0, 16) || '';
            // Fall back to deriving HH:MM from start_datetime if the API didn't send send_time
            // (e.g. legacy records created before the field existed)
            const timeFromStart = (dt) => toInputValue(dt).slice(11, 16);
            const normalized = {
                ...data,
                start_datetime: toInputValue(data.start_datetime).slice(0, 10),
                end_datetime:   toInputValue(data.end_datetime),
                send_time:      data.send_time || timeFromStart(data.start_datetime),
            };
            reset(normalized);
            setLoading(false);
        }));
    }, [id]);

    const handleSourceChange = (val) => {
        setSourceType(val);
        setValue('source_type', val);
        setValue('output_format', '');
    };

    const handleThemeChange = (val) => {
        setTheme(val);
        setValue('theme', val);
    };

    // Fields the form actually owns — never resend server-managed fields
    // (id, run_count, last_run_at, next_run_at, failure_count, last_run_status,
    // create_time, update_time) so an edit stays a true partial update and can't
    // clobber run history. `status` is included on edit — the user can change it
    // directly in the form now; if left untouched it's just resent as-is (a no-op).
    const FORM_FIELDS = [
        'report_name', 'source_type', 'source_id', 'theme', 'frequency', 'day_of_week',
        'output_format', 'start_datetime', 'end_datetime', 'send_time',
        'mail_subject', 'mail_recipients', 'mail_body',
    ];

    const onSubmit = (data) => {
        setApiError('');
        setSubmitting(true);
        const payload = {};
        FORM_FIELDS.forEach((key) => { if (data[key] !== undefined) payload[key] = data[key]; });
        if (isEdit) payload.status = data.status || originalStatus;
        const action = isEdit
            ? AlertConfigurationActions.putReportScheduler(id, payload,
                () => { setSubmitting(false); navigate('/xalerts/report-scheduler'); },
                (msg) => { setSubmitting(false); setApiError(msg || 'Something went wrong.'); })
            : AlertConfigurationActions.postReportScheduler(payload,
                () => { setSubmitting(false); navigate('/xalerts/report-scheduler'); },
                (msg) => { setSubmitting(false); setApiError(msg || 'Something went wrong.'); });
        dispatch(action);
    };

    const sourceLabel = SOURCE_TYPES.find(s => s.value === sourceType)?.label;

    if (loading) return (
        <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading...</div>
    );

    return (
        <div className="flex flex-col bg-white h-full overflow-hidden">

            {/* Body */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 lg:gap-2 p-3 sm:p-4 lg:p-4 xl:px-[10%]">

                {/* Page title row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 shrink-0">
                    <div>
                        <h1 className="text-base lg:text-lg font-bold text-slate-800">{isEdit ? 'Edit Report Scheduler' : 'New Report Scheduler'}</h1>
                        <p className="text-xs text-slate-500 mt-0.5">{isEdit ? 'Update your scheduled report configuration' : 'Create and schedule automated report delivery'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button type="button" onClick={() => navigate('/xalerts/report-scheduler')}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="button" onClick={() => setSummaryOpen(true)}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors">
                            Preview Summary
                        </button>
                        <button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                            style={{ background: '#EC7D09' }}>
                            {submitting ? 'Scheduling...' : 'Schedule Report'}
                        </button>
                    </div>
                </div>

                {/* API error */}
                {apiError && (
                    <div className="shrink-0 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                        {apiError}
                    </div>
                )}

                {/* Top row: Report Source + Schedule */}
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">

                    {/* Report Source */}
                    <Card className="flex-1">
                        <CardHeader
                            title="Report Source"
                            subtitle="Where the report data comes from"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
                        />
                        <div className="p-2.5 flex flex-col gap-2">

                            <div>
                                <label className={labelCls}>Report Name <span className="text-red-400">*</span></label>
                                <input type="text" className={inputCls} placeholder="e.g. Daily KPI Summary"
                                    {...register('report_name', { required: 'Required' })} />
                                {errors.report_name && <p className={errorCls}>{errors.report_name.message}</p>}
                            </div>

                            <div>
                                <label className={labelCls}>Source Type <span className="text-red-400">*</span></label>
                                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                                    {SOURCE_TYPES.map((s) => (
                                        <button key={s.value} type="button" onClick={() => handleSourceChange(s.value)}
                                            className={`flex-1 py-1 text-xs font-medium transition-colors ${
                                                sourceType === s.value
                                                    ? 'bg-[#0b1830] text-white'
                                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                            }`}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                                <input type="hidden" {...register('source_type')} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 items-end">
                                <div>
                                    <label className={labelCls}>
                                        {sourceType.includes('dashboard') ? 'Dashboard ID' : 'Chart ID'}
                                        <span className="text-red-400"> *</span>
                                    </label>
                                    <input type="text" className={inputCls}
                                        placeholder={sourceType.includes('dashboard') ? 'e.g. 12' : 'e.g. 45'}
                                        {...register('source_id', { required: 'Required' })} />
                                    {errors.source_id && <p className={errorCls}>{errors.source_id.message}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Theme</label>
                                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                                        {[{ val: 'light', icon: '☀', label: 'Light' }, { val: 'dark', icon: '☾', label: 'Dark' }].map((t) => (
                                            <button key={t.val} type="button" onClick={() => handleThemeChange(t.val)}
                                                className={`flex-1 px-1 py-1 text-xs font-medium transition-colors ${
                                                    theme === t.val
                                                        ? t.val === 'dark' ? 'bg-slate-800 text-white' : 'bg-amber-50 text-amber-700'
                                                        : 'bg-white text-slate-500 hover:bg-slate-50'
                                                }`}>
                                                <span className="sm:hidden">{t.icon}</span>
                                                <span className="hidden sm:inline">{t.icon} {t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <input type="hidden" {...register('theme')} />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Schedule */}
                    <Card className="flex-1">
                        <CardHeader
                            title="Schedule"
                            subtitle="When and how often to run"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        />
                        <div className="p-2.5 grid grid-cols-2 gap-x-2.5 gap-y-2">
                            <div>
                                <label className={labelCls}>Frequency <span className="text-red-400">*</span></label>
                                <select className={inputCls} {...register('frequency', { required: 'Required' })}>
                                    <option value="">Select</option>
                                    <option value="hourly">Hourly</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                                {errors.frequency && <p className={errorCls}>{errors.frequency.message}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Output Format <span className="text-red-400">*</span></label>
                                <select className={inputCls} {...register('output_format', { required: 'Required' })}>
                                    <option value="">Select</option>
                                    <option value="pdf">PDF</option>
                                    <option value="png">PNG</option>
                                </select>
                                {errors.output_format && <p className={errorCls}>{errors.output_format.message}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
                                <input type="date" className={inputCls}
                                    {...register('start_datetime', { required: 'Required' })} />
                                {errors.start_datetime && <p className={errorCls}>{errors.start_datetime.message}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>End Date & Time</label>
                                <input type="datetime-local" className={inputCls}
                                    {...register('end_datetime', {
                                        validate: v => !v || !watch('start_datetime') || v > watch('start_datetime') || 'Must be after start date'
                                    })} />
                                {errors.end_datetime && <p className={errorCls}>{errors.end_datetime.message}</p>}
                            </div>
                            {frequency === 'weekly' && (
                                <div>
                                    <label className={labelCls}>Day of Week <span className="text-red-400">*</span></label>
                                    <select className={inputCls} {...register('day_of_week', { required: 'Required' })}>
                                        <option value="">Select day</option>
                                        {DAYS_OF_WEEK.map((d) => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                                    </select>
                                    {errors.day_of_week && <p className={errorCls}>{errors.day_of_week.message}</p>}
                                </div>
                            )}
                            <div>
                                <label className={labelCls}>Send Time <span className="text-red-400">*</span></label>
                                <input type="time" className={inputCls} {...register('send_time', { required: 'Required' })} />
                                {errors.send_time && <p className={errorCls}>{errors.send_time.message}</p>}
                            </div>
                            {isEdit && (
                                <div>
                                    <label className={labelCls}>
                                        Status <span className="text-red-400">*</span>
                                        {originalStatus && (
                                            <span className={`ml-1 normal-case font-semibold ${watched.status !== originalStatus ? 'text-amber-600' : 'text-slate-400'}`}>
                                                (current: {originalStatus})
                                            </span>
                                        )}
                                    </label>
                                    <input type="hidden" {...register('status', { required: 'Required' })} />
                                    <StatusPicker
                                        value={watched.status}
                                        originalStatus={originalStatus}
                                        onChange={(s) => setValue('status', s, { shouldValidate: true })}
                                    />
                                    {errors.status && <p className={errorCls}>{errors.status.message}</p>}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Bottom row: Delivery */}
                <Card className="shrink-0">
                    <CardHeader
                        title="Delivery"
                        subtitle="Email recipients and message content"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                    />
                    <div className="p-2.5 flex flex-col gap-2">
                        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 shrink-0 items-start">
                            <div>
                                <label className={labelCls}>Mail Subject</label>
                                <input type="text" className={inputCls} placeholder="Email subject line"
                                    {...register('mail_subject')} />
                            </div>
                            <div>
                                <label className={labelCls}>Mail Recipients <span className="text-red-400">*</span></label>
                                <Controller
                                    name="mail_recipients"
                                    control={control}
                                    rules={{ required: 'Required' }}
                                    render={({ field }) => (
                                        <EmailChipInput value={field.value || ''} onChange={field.onChange}
                                            placeholder="Add emails — press comma, semicolon or Enter" />
                                    )}
                                />
                                {errors.mail_recipients && <p className={errorCls}>{errors.mail_recipients.message}</p>}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className={labelCls}>Mail Body</label>
                            <textarea className="min-h-[60px] w-full border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                                placeholder="Email body text..." {...register('mail_body')} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Summary slide-in panel */}
            {summaryOpen && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSummaryOpen(false)} />
                    <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Summary</p>
                                <p className="text-xs text-slate-400">Your current configuration</p>
                            </div>
                            <button onClick={() => setSummaryOpen(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col">
                            {isEdit && <SummaryRow label="Status" value={watched.status} />}
                            <SummaryRow label="Report Name"   value={watched.report_name} />
                            <SummaryRow label="Source"        value={sourceLabel} />
                            <SummaryRow label="Source ID"     value={watched.source_id} />
                            <SummaryRow label="Theme"         value={theme === 'dark' ? 'Dark' : 'Light'} />
                            <SummaryRow label="Frequency"     value={watched.frequency} />
                            <SummaryRow label="Output Format" value={watched.output_format?.toUpperCase()} />
                            <SummaryRow label="Start"         value={watched.start_datetime} />
                            <SummaryRow label="End"           value={watched.end_datetime} />
                            <SummaryRow label="Day of Week"   value={watched.day_of_week} />
                            <SummaryRow label="Send Time"     value={watched.send_time} />
                            <SummaryRow label="Subject"       value={watched.mail_subject} />
                            <SummaryRow label="Recipients"    value={watched.mail_recipients} />
                            <SummaryRow label="Mail Body"     value={watched.mail_body} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default XReportSchedulerFormPage;
