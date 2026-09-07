import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import EmailChipInput from '../../components/EmailChipInput';
import EmailBodyBuilder from '../../components/EmailBodyBuilder';
import VisualQueryBuilder from '../../components/VisualQueryBuilder';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import AlertConfigurationActions from '../../store/actions/alertConfiguration-actions';
import GroupManagementActions from '../../store/actions/groupManagement-actions';
import Button from '../../components/Button';
import moment from 'moment';

const inputCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs text-slate-500 uppercase tracking-wide mb-1";
const errorCls = "text-xs text-red-500 mt-0.5";

const FREQ_OPTIONS = [5,10,15,30,60];

const CONTENT_TABS = [
    { key: 'mailquery', label: 'Mail Attachment (SQL)', editorLabel: 'SQL Editor', mode: 'sql', required: true },
    { key: 'graphquery', label: 'Graph Query (SQL)', editorLabel: 'SQL Editor', mode: 'sql', required: false },
    { key: 'mailbody', label: 'Mail Body (HTML)', editorLabel: 'HTML Editor', mode: 'html', required: true },
    { key: 'mailquerybody', label: 'Mail Query Body', editorLabel: 'Query Editor', mode: 'plain', required: true },
];

const codeTextareaCls = "w-full flex-1 min-h-[10rem] resize-none bg-slate-900 text-emerald-300 font-mono text-sm px-4 py-3 focus:outline-none placeholder:text-slate-500";

const ASSIGNMENT_TYPES = [
    { value: 'SELF', label: 'Self' },
    { value: 'ALL', label: 'All' },
    { value: 'GROUP', label: 'Group' },
    { value: 'USER', label: 'User' },
];

const Section = ({ title, full = false, children }) => (
    <div className={full ? 'lg:col-span-2' : ''}>
        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-3 pl-2 border-l-2 border-orange-500">{title}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </div>
    </div>
);

const XAlertSchedulerForm = ({ setIsOpen, resetting, formValue = {}, submitRef }) => {
    const dispatch = useDispatch();
    const userList = useSelector((state) => state?.customQuery?.usersList ?? []);
    const databaseList = useSelector((state) => state?.customQuery?.databaseList ?? []);

    const authUser = useSelector((state) => state?.auth?.user);

    const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm();
    const [mailQueryVisual, setMailQueryVisual] = useState(false);
    const [graphQueryVisual, setGraphQueryVisual] = useState(false);
    const [mailBodyVisual, setMailBodyVisual] = useState(false);
    const [assignType, setAssignType] = useState('SELF'); // SELF | ALL | GROUP | USER
    const [groupId, setGroupId] = useState('');
    const [userId, setUserId] = useState('');
    const [contentTab, setContentTab] = useState('mailquery');
    const [groupList, setGroupList] = useState([]);
    const [generateTicket, setGenerateTicket] = useState('no');

    const currentUserName = [
        authUser?.name,
        authUser?.fullName,
        authUser?.firstName && authUser?.lastName ? `${authUser.firstName} ${authUser.lastName}` : null,
        authUser?.firstName,
        authUser?.firstname,
        authUser?.username,
    ].filter(Boolean)[0] || 'DataPlus User';

    useEffect(() => {
        dispatch(CustomQueryActions.getDatabaseList());
        dispatch(CustomQueryActions.getUserList());
        dispatch(GroupManagementActions.getGroups((data) => {
            setGroupList((data ?? []).map((g) => ({ value: g.id, label: g.group_name })));
        }));

        reset({});
        setAssignType('SELF');
        setGroupId('');
        setUserId('');
        setGenerateTicket('no');
        if (!resetting) {
            Object.keys(formValue).forEach((key) => {
                const lk = key.toLowerCase();
                if (lk === 'startat' || lk === 'endat') {
                    const d = moment(formValue[key], 'DD-MM-YYYY HH:mm:ss');
                    setValue(lk, d.isValid() ? d.format('YYYY-MM-DDTHH:mm') : formValue[key]);
                } else {
                    setValue(lk, formValue[key]);
                }
            });
            // Backend contract: assignment_type is SELF/ALL/GROUP/USER, defaulting to SELF
            // when absent. Fall back to inferring from legacy group_id/assigned_user_id records.
            const incomingType = (formValue.assignment_type || '').toUpperCase();
            if (incomingType === 'USER' && formValue.assigned_user_id) {
                setAssignType('USER');
                setUserId(formValue.assigned_user_id);
            } else if (incomingType === 'GROUP' && formValue.group_id) {
                setAssignType('GROUP');
                setGroupId(formValue.group_id);
            } else if (incomingType === 'ALL') {
                setAssignType('ALL');
            } else if (incomingType === 'SELF') {
                setAssignType('SELF');
            } else if (formValue.group_id) {
                setAssignType('GROUP');
                setGroupId(formValue.group_id);
            } else if (formValue.assigned_user_id) {
                setAssignType('USER');
                setUserId(formValue.assigned_user_id);
            }

            // Canonical field is the boolean generate_ticket; fall back to the legacy
            // "yes"/"no" generateticket string for records saved before the rename.
            const rawTicketFlag = formValue.generate_ticket ?? formValue.generateticket;
            const isTicketOn = rawTicketFlag === true || String(rawTicketFlag).toLowerCase() === 'yes' || String(rawTicketFlag).toLowerCase() === 'true';
            setGenerateTicket(isTicketOn ? 'yes' : 'no');
            setValue('ticket_query', formValue.ticket_query ?? formValue.ticketquery ?? '');
        }
    }, [formValue, resetting]);

    const onSubmit = (data) => {
        if (data.startat) {
            data.startat = moment(data.startat).format('DD-MM-YYYY HH:mm:00');
        }
        if (data.endat) {
            data.endat = moment(data.endat).format('DD-MM-YYYY HH:mm:00');
        }
        if (data.mailrecipients) {
            data.mailrecipients = data.mailrecipients.split(/[,;:]/).map(e => e.trim()).filter(Boolean).join(',');
        }
        data.lastsavedby = currentUserName;
        data.generate_ticket = generateTicket === 'yes';
        data.ticket_query = generateTicket === 'yes' ? data.ticket_query : '';
        data.assignment_type = assignType;
        data.group_id = assignType === 'GROUP' ? groupId : null;
        data.assigned_user_id = assignType === 'USER' ? userId : null;
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
        <div className="-m-5 p-5 bg-slate-50 min-h-full">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5 items-start">

              <div className="flex flex-col gap-5">

              <Section title="1. Data Source">
                {/* Alert Name — full width */}
                <div className="col-span-2">
                    <label className={labelCls}>Alert Name <span className="text-red-400">*</span></label>
                    <input type="text" className={inputCls} placeholder="Enter alert name" {...register('alertname', { required: 'Required' })} />
                    {errors.alertname && <p className={errorCls}>{errors.alertname.message}</p>}
                </div>

                {/* Frequency */}
                <div className="col-span-2">
                    <label className={labelCls}>Frequency (in mins) <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('frequency', { required: 'Required' })}>
                        <option value="">Select</option>
                        {FREQ_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    {errors.frequency && <p className={errorCls}>{errors.frequency.message}</p>}
                </div>

                {/* DB Server */}
                <div className="col-span-2">
                    <label className={labelCls}>DB Server <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('dbserver', { required: 'Required' })}>
                        <option value="">Select server</option>
                        {/* If this alert's saved server isn't in the current user's visible list
                            (e.g. it belongs to another user under the old single-owner DB Config
                            scheme), keep it selectable/shown rather than silently blanking out. */}
                        {formValue.dbserver && !databaseList?.some((db) => db.value === formValue.dbserver) && (
                            <option value={formValue.dbserver}>{formValue.dbservername || formValue.dbserver}</option>
                        )}
                        {databaseList?.map((db) => (
                            <option key={db.value} value={db.value}>{db.label}</option>
                        ))}
                    </select>
                    {errors.dbserver && <p className={errorCls}>{errors.dbserver.message}</p>}
                </div>
              </Section>

              <Section title="2. Generate Ticket">
                {/* Generate Ticket toggle */}
                <div className="col-span-2">
                    <label className={labelCls}>Generate Ticket <span className="text-red-400">*</span></label>
                    <div className="flex rounded overflow-hidden border border-slate-300 text-[11px] w-full">
                        <button
                            type="button"
                            onClick={() => setGenerateTicket('yes')}
                            className={`flex-1 px-4 py-2 font-semibold ${generateTicket === 'yes' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'}`}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => setGenerateTicket('no')}
                            className={`flex-1 px-4 py-2 font-semibold ${generateTicket === 'no' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'}`}
                        >
                            No
                        </button>
                    </div>
                </div>

                {/* Ticket Query — only shown when Generate Ticket is Yes */}
                {generateTicket === 'yes' && (
                    <div className="col-span-2">
                        <label className={labelCls}>Ticket Query <span className="text-red-400">*</span></label>
                        <textarea
                            className={inputCls + ' resize-none h-24 font-mono text-xs'}
                            placeholder="SQL used to raise the ticket..."
                            {...register('ticket_query', { required: generateTicket === 'yes' ? 'Required' : false })}
                        />
                        {errors.ticket_query && <p className={errorCls}>{errors.ticket_query.message}</p>}
                    </div>
                )}
              </Section>

              </div>

              <Section title="3. Notification Settings">
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
                    <input type="datetime-local" className={inputCls} {...register('startat', { required: 'Required' })} />
                    {errors.startat && <p className={errorCls}>{errors.startat.message}</p>}
                </div>

                {/* End Date */}
                <div>
                    <label className={labelCls}>End Date <span className="text-red-400">*</span></label>
                    <input type="datetime-local" className={inputCls} {...register('endat', { required: 'Required' })} />
                    {errors.endat && <p className={errorCls}>{errors.endat.message}</p>}
                </div>

                {/* Visible To — SELF/ALL/GROUP/USER radio buttons, list shown only when needed */}
                <div className="col-span-2">
                    <label className={labelCls}>Visible To <span className="text-red-400">*</span></label>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                        {ASSIGNMENT_TYPES.map((t) => (
                            <label key={t.value} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="assignType"
                                    value={t.value}
                                    checked={assignType === t.value}
                                    onChange={() => setAssignType(t.value)}
                                    className="accent-orange-500"
                                />
                                {t.label}
                            </label>
                        ))}
                    </div>

                    {assignType === 'GROUP' && (
                        <select className={inputCls} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                            <option value="">Select group</option>
                            {groupList.map((g) => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                        </select>
                    )}
                    {assignType === 'USER' && (
                        <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
                            <option value="">Select user</option>
                            {userList?.map((u) => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Mail Output */}
                <div className="col-span-2">
                    <label className={labelCls}>Mail Output <span className="text-red-400">*</span></label>
                    <select className={inputCls} {...register('mailoutput', { required: 'Required' })}>
                        <option value="">Select format</option>
                        <option value="excel">Excel</option>
                        <option value="csv">CSV</option>
                    </select>
                    {errors.mailoutput && <p className={errorCls}>{errors.mailoutput.message}</p>}
                </div>

                {/* Last Saved By — read-only, shown only for existing alerts */}
                {!resetting && (formValue.lastsavedby || formValue.id || formValue.uniqueid) && (
                    <div>
                        <label className={labelCls}>Last Saved By</label>
                        <input type="text" disabled className={inputCls + ' bg-slate-100 text-slate-500 cursor-not-allowed'} value={formValue.lastsavedby || '—'} />
                    </div>
                )}
              </Section>

              <div className="lg:col-span-2">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-3 pl-2 border-l-2 border-orange-500">4. Alert Content & Queries</p>

                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">

                <div className="flex flex-col md:flex-row">
                    {/* Vertical tab nav */}
                    <div className="md:w-52 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-visible border-b md:border-b-0 md:border-r border-slate-200 bg-slate-100/40">
                        {CONTENT_TABS.map((tab, idx) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setContentTab(tab.key)}
                                className={`text-left px-4 py-3 text-xs font-semibold whitespace-nowrap border-l-2 md:border-l-2 border-b-2 md:border-b-0 transition-colors ${contentTab === tab.key ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}
                            >
                                {idx + 1}. {tab.label} {tab.required && <span className="text-red-400">*</span>}
                            </button>
                        ))}
                    </div>

                    {/* Editor panel */}
                    <div className="flex-1 min-w-0">
                        {CONTENT_TABS.map((tab) => {
                            if (tab.key !== contentTab) return null;
                            const isVisual = tab.key === 'mailquery' ? mailQueryVisual : tab.key === 'graphquery' ? graphQueryVisual : tab.key === 'mailbody' ? mailBodyVisual : false;
                            const setVisual = tab.key === 'mailquery' ? setMailQueryVisual : tab.key === 'graphquery' ? setGraphQueryVisual : tab.key === 'mailbody' ? setMailBodyVisual : null;
                            return (
                                <div key={tab.key} className="flex flex-col h-full">
                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{tab.editorLabel}</span>
                                        {setVisual && (
                                            <div className="flex rounded overflow-hidden border border-slate-600 text-[11px]">
                                                <button type="button" onClick={() => setVisual(false)} className={`px-2.5 py-1 font-semibold ${!isVisual ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{tab.mode === 'html' ? 'HTML Mode' : 'SQL Mode'}</button>
                                                <button type="button" onClick={() => setVisual(true)} className={`px-2.5 py-1 font-semibold ${isVisual ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'}`}>Visual Builder</button>
                                            </div>
                                        )}
                                    </div>

                                    {tab.key === 'mailquery' && (
                                        isVisual ? (
                                            <VisualQueryBuilder onGenerate={(sql) => setValue('mailquery', sql, { shouldValidate: true })} />
                                        ) : (
                                            <textarea className={codeTextareaCls} placeholder="SELECT * FROM table_name WHERE condition..." {...register('mailquery', { required: 'Required' })} />
                                        )
                                    )}
                                    {tab.key === 'graphquery' && (
                                        isVisual ? (
                                            <VisualQueryBuilder onGenerate={(sql) => setValue('graphquery', sql, { shouldValidate: true })} />
                                        ) : (
                                            <textarea className={codeTextareaCls} placeholder="SQL for graph..." {...register('graphquery')} />
                                        )
                                    )}
                                    {tab.key === 'mailbody' && (
                                        isVisual ? (
                                            <div className="p-4">
                                                <input type="hidden" {...register('mailbody', { required: 'Required' })} />
                                                <EmailBodyBuilder onChange={(html) => setValue('mailbody', html, { shouldValidate: true })} />
                                            </div>
                                        ) : (
                                            <textarea className={codeTextareaCls} placeholder="Email body HTML..." {...register('mailbody', { required: 'Required' })} />
                                        )
                                    )}
                                    {tab.key === 'mailquerybody' && (
                                        <textarea className={codeTextareaCls} placeholder="Query body for inline mail content..." {...register('mailquerybody', { required: 'Required' })} />
                                    )}

                                    <div className={`px-4 pb-2 ${isVisual ? 'bg-white' : 'bg-slate-900'}`}>
                                        {errors[tab.key] && <p className={`text-xs mt-1 ${isVisual ? 'text-red-500' : 'text-red-400'}`}>{errors[tab.key].message}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                </div>
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
        </div>
    );
};

export default XAlertSchedulerForm;
