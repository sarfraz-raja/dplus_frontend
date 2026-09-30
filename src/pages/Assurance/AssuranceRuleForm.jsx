import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import GroupManagementActions from '../../store/actions/groupManagement-actions';
import AssuranceActions from '../../store/actions/assurance-actions';
import EmailChipInput from '../../components/EmailChipInput';
import { wholeNumber, getDefaultDb, dbOptionLabel } from '../../utils/common';
import { TELECOM_CONSTANTS } from '../Tickets/ticketConstants';

const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400";
const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";
const errorCls = "text-red-500 text-xs mt-1";
const codeTextareaCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400";

// Leaf shape confirmed in validate_condition_config/evaluate_leaf_condition —
// exactly {kpi, operator, threshold}, NOT {field, value}.
const OPERATORS = ['>', '<', '>=', '<=', '==', '!='];
const SEVERITIES = TELECOM_CONSTANTS.SEVERITIES;
const ASSIGNMENT_TYPES = ['SELF', 'ALL', 'GROUP', 'USER'];
const NOTIFICATION_CHANNELS = ['Email', 'SMS', 'Webhook'];
const KPI_MATCHING = ['ANY', 'SAME_KPI'];
const CLOSURE_MODES = ['ALL_CLEAR', 'PERCENT_CLEAR'];
const TECHNOLOGY_MATCHING = ['ANY', 'SAME_TECHNOLOGY'];

// correlation_config's required fields have no backend defaults ("no defaults ever
// assumed" — API doc §8), so nothing is pre-selected: the enum pickers start blank
// and must be chosen explicitly.
const EMPTY_CORRELATION = {
    min_cell_count: '', time_window_minutes: '', kpi_matching: '', closure_mode: '',
    closure_threshold_pct: '', verification_period_minutes: '', technology_matching: '', severity_floor: '',
};

// Which wizard step each form field lives on — lets a failed Create jump to the
// step with the problem instead of failing silently from step 8.
const FIELD_STEP = {
    rule_name: 1, data_source_id: 1,
    kpi: 2, conditions: 2, severity: 2, consecutive_breach_threshold: 2, clear_stability_period_minutes: 2,
    frequency: 3, enabled: 3,
    group_id: 4, assigned_user_id: 4, verification_period_minutes: 4, correlation: 4,
};

const toNumOrNull = (v) => (v === '' || v === undefined || v === null || Number.isNaN(Number(v)) ? null : Number(v));

// Renders a condition_config node (leaf or nested group) as text, e.g. "(CDR > 3 AND (A > 1 OR B < 2))".
const formatConditionNode = (node) => {
    if (!node) return '';
    if (Array.isArray(node.conditions)) {
        const op = String(node.operator || 'AND').toUpperCase();
        const parts = node.conditions.map(formatConditionNode).filter(Boolean);
        return parts.length > 1 ? `(${parts.join(` ${op} `)})` : parts.join('');
    }
    return node.kpi ? `${node.kpi} ${node.operator} ${node.threshold}` : '';
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Heuristic, not a real SQL parser — just a whole-word token search over the
// raw kpi_query text. Two failure modes confirmed against evaluate_rule():
// (1) a result row missing `node_id` is skipped every tick, so the rule never
// produces an alarm at all; (2) a condition's `kpi` must exactly match the
// column name evaluate_leaf_condition looks up, or that leaf never matches.
// Can't catch every real query shape (CTEs, dynamic SQL, `SELECT *`), so this
// only ever warns — it never blocks Create/Save.
const getQueryWarnings = (formValues) => {
    const query = (formValues.kpi_query || '').trim();
    if (!query) return [];
    const warnings = [];
    if (!/\bnode_id\b/i.test(query)) {
        warnings.push('kpi_query result has no column named node_id — this rule will be skipped on every evaluation tick and never produce an alarm.');
    }
    const kpiNames = [
        formValues.kpi,
        ...(formValues.conditions || []).map((c) => c.kpi),
    ].filter(Boolean);
    const uniqueKpis = [...new Set(kpiNames)];
    uniqueKpis.forEach((kpi) => {
        const re = new RegExp(`\\b${escapeRegExp(kpi)}\\b`, 'i');
        if (!re.test(query)) {
            warnings.push(`KPI "${kpi}" doesn't appear in kpi_query's result columns — that condition will never be evaluated.`);
        }
    });
    return warnings;
};

// Step order/labels follow the backend's documented 8-step Rule Builder flow
// (ASSURANCE_FRONTEND_API_DOCUMENTATION.md, Section 3) exactly — only Step 1
// is wired so far; the rest are placeholders, added one at a time.
const STEPS = [
    { id: 1, label: 'Data Source' },
    { id: 2, label: 'Alert Conditions' },
    { id: 3, label: 'Schedule' },
    { id: 4, label: 'Ticket Generation' },
    { id: 5, label: 'Alert Content & Queries' },
    { id: 6, label: 'Notification Settings' },
    { id: 7, label: 'Access & Visibility' },
    { id: 8, label: 'Review & Create' },
];

const AssuranceRuleForm = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { id } = useParams();
    const location = useLocation();
    // /assurance/rules/edit/:id and /assurance/rules/view/:id share this
    // component (same pattern as XReportSchedulerFormPage) — mode is read
    // from the path rather than a prop.
    const mode = location.pathname.includes('/edit/') ? 'edit' : location.pathname.includes('/view/') ? 'view' : 'create';

    const [currentStep, setCurrentStep] = useState(1);
    const [groupList, setGroupList] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingRule, setLoadingRule] = useState(mode !== 'create');
    // Rules created outside this wizard (e.g. straight against the API) can have nested
    // AND/OR groups or an OR at the root. This builder only models a flat AND list, so
    // editing those would silently rewrite their logic — detected on load and blocked.
    const [conditionsUnsupported, setConditionsUnsupported] = useState(false);
    const [loadedConditionConfig, setLoadedConditionConfig] = useState(null);
    // PUT /assurance-rules/<id> is a full replace — fields this wizard has no UI for would be
    // written back as null on save. Kept from the loaded rule and re-sent as-is in edit mode.
    const [preservedConfig, setPreservedConfig] = useState({});
    const { register, control, watch, reset, setValue, getValues, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            conditions: [{ kpi: '', operator: '>', threshold: '' }],
            consecutive_breach_threshold: 1,
            clear_stability_period_minutes: 0,
            enabled: true,
            generate_ticket: false,
            assignment_type: 'SELF',
            verification_period_minutes: '',
            correlation_enabled: false,
            correlation: EMPTY_CORRELATION,
        },
    });
    const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({ control, name: 'conditions' });

    const databaseList = useSelector((state) => state?.customQuery?.databaseList ?? []);
    const userList = useSelector((state) => state?.customQuery?.usersList ?? []);
    const slaProfileList = useSelector((state) => state?.assurance?.slaProfileList ?? []);
    const escalationPolicyList = useSelector((state) => state?.assurance?.escalationPolicyList ?? []);

    const generateTicket = watch('generate_ticket');
    const assignmentType = watch('assignment_type');
    const correlationEnabled = watch('correlation_enabled');
    const closureMode = watch('correlation.closure_mode');

    useEffect(() => {
        dispatch(CustomQueryActions.getDatabaseList());
        dispatch(CustomQueryActions.getUserList());
        dispatch(AssuranceActions.listSlaProfiles());
        dispatch(AssuranceActions.listEscalationPolicies());
        dispatch(GroupManagementActions.getGroups((data) => {
            setGroupList((data ?? []).map((g) => ({ value: g.id, label: g.group_name })));
        }));
    }, []);

    // Data Source once the database list has loaded:
    //  - create: pre-select the Admin-set global default database (the user can still change it);
    //  - edit/view: re-apply the rule's own saved data source — if the rule arrived before the
    //    list, the <select> had no matching <option> yet and would keep showing "Select data source"
    //    even though the right id is stored.
    useEffect(() => {
        if (databaseList.length === 0) return;
        const current = getValues('data_source_id');
        if (current) {
            setValue('data_source_id', current);
        } else if (mode === 'create') {
            const defaultDb = getDefaultDb(databaseList);
            if (defaultDb) setValue('data_source_id', defaultDb.value);
        }
    }, [databaseList, loadingRule]);

    // View/Edit prefill — GET /assurance-rules/<id>, reshaped back into the
    // wizard's form field names (the inverse of buildPayload below).
    useEffect(() => {
        if (mode === 'create' || !id) return;
        dispatch(AssuranceActions.getRule(id, (rule) => {
            reset({
                rule_name: rule.rule_name ?? '',
                data_source_id: rule.data_source_id ?? '',
                kpi: rule.kpi ?? '',
                conditions: rule.condition_config?.conditions?.length ? rule.condition_config.conditions : [{ kpi: '', operator: '>', threshold: '' }],
                severity: rule.severity ?? '',
                consecutive_breach_threshold: rule.consecutive_breach_threshold ?? 1,
                clear_stability_period_minutes: rule.clear_stability_period_minutes ?? 0,
                frequency: rule.frequency ?? '',
                enabled: rule.enabled ?? true,
                generate_ticket: rule.generate_ticket ?? false,
                assignment_type: rule.assignment_type ?? 'SELF',
                group_id: rule.group_id ?? '',
                assigned_user_id: rule.assigned_user_id ?? '',
                sla_profile_id: rule.sla_profile_id ?? '',
                escalation_policy_id: rule.escalation_policy_id ?? '',
                verification_period_minutes: rule.verification_period_minutes ?? '',
                correlation_enabled: !!rule.correlation_config,
                correlation: {
                    ...EMPTY_CORRELATION,
                    ...Object.fromEntries(Object.entries(rule.correlation_config || {}).map(([k, v]) => [k, v ?? ''])),
                },
                kpi_query: rule.kpi_query ?? '',
                scope: rule.scope ?? '',
                notification_config: {
                    channels: rule.notification_config?.channels ?? [],
                    recipients: rule.notification_config?.recipients ?? '',
                },
            });
            const cfg = rule.condition_config || {};
            const unsupported = (cfg.conditions || []).some((c) => Array.isArray(c?.conditions))
                || (!!cfg.operator && String(cfg.operator).toUpperCase() !== 'AND');
            setConditionsUnsupported(unsupported);
            setLoadedConditionConfig(cfg);
            setPreservedConfig({
                clear_condition_config: rule.clear_condition_config ?? null,
                suppression_config: rule.suppression_config ?? null,
                noise_control_config: rule.noise_control_config ?? null,
            });
            setLoadingRule(false);
        }, (msg) => {
            toast.error(msg);
            navigate('/assurance/rules');
        }));
    }, [mode, id]);

    // Soft delete from the view screen (DELETE /assurance-rules/<id>). After it — or a 404, meaning
    // it was already deleted — this rule's GET/PUT/status all 404, so go back to the list.
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const confirmDelete = () => {
        if (deleting) return;
        setDeleting(true);
        dispatch(AssuranceActions.deleteRule(id, () => {
            toast.success('Rule deleted');
            navigate('/assurance/rules');
        }, (msg, status) => {
            setDeleting(false);
            if (status === 404) {
                toast.error('This rule no longer exists — it may already have been deleted.');
                navigate('/assurance/rules');
                return;
            }
            toast.error(msg);
        }));
    };

    const goPrevious = () => setCurrentStep((s) => Math.max(1, s - 1));
    const goNext = () => setCurrentStep((s) => Math.min(STEPS.length, s + 1));
    const handleCancel = () => navigate('/assurance/rules');

    const activeStep = STEPS.find((s) => s.id === currentStep);
    const formValues = watch();
    const queryWarnings = getQueryWarnings(formValues);

    // Section 5 field reference — only fields that column actually exists on
    // assurance_rule get sent; assignment/SLA/escalation fields are nulled
    // out when generate_ticket is off rather than sending stale values.
    // correlation_config is opt-in and only meaningful alongside ticket generation (it
    // promotes each cell's own ticket to CHILD under a MASTER). Every required key is
    // sent explicitly; closure_threshold_pct only when closure_mode is PERCENT_CLEAR.
    const buildCorrelationConfig = (data) => {
        if (!data.generate_ticket || !data.correlation_enabled) return null;
        const c = data.correlation || {};
        const out = {
            min_cell_count: Number(c.min_cell_count),
            time_window_minutes: Number(c.time_window_minutes),
            kpi_matching: c.kpi_matching,
            closure_mode: c.closure_mode,
            verification_period_minutes: Number(c.verification_period_minutes),
        };
        if (c.closure_mode === 'PERCENT_CLEAR') out.closure_threshold_pct = Number(c.closure_threshold_pct);
        if (c.technology_matching) out.technology_matching = c.technology_matching;
        if (c.severity_floor) out.severity_floor = c.severity_floor;
        return out;
    };

    const buildPayload = (data) => {
        const hasNotificationConfig = (data.notification_config?.channels?.length ?? 0) > 0 || !!data.notification_config?.recipients;
        const leaves = (data.conditions || []).map((c) => ({ kpi: c.kpi, operator: c.operator, threshold: Number(c.threshold) }));
        return {
            rule_name: data.rule_name,
            kpi: data.kpi,
            data_source_id: data.data_source_id,
            frequency: data.frequency,
            enabled: !!data.enabled,
            severity: data.severity,
            // Optional numbers: an emptied field (valueAsNumber → NaN) falls back to the
            // backend's documented default instead of going out as null.
            consecutive_breach_threshold: toNumOrNull(data.consecutive_breach_threshold) ?? 1,
            clear_stability_period_minutes: toNumOrNull(data.clear_stability_period_minutes) ?? 0,
            // The UI promises "all conditions must be true", but the API doc doesn't say what a
            // flat list without an operator defaults to — so with 2+ leaves the AND is sent
            // explicitly (the root-group shape from the doc's nested example).
            condition_config: leaves.length > 1 ? { operator: 'AND', conditions: leaves } : { conditions: leaves },
            kpi_query: data.kpi_query || null,
            scope: data.scope || null,
            generate_ticket: !!data.generate_ticket,
            assignment_type: data.generate_ticket ? data.assignment_type : 'SELF',
            group_id: data.generate_ticket && data.assignment_type === 'GROUP' ? data.group_id : null,
            assigned_user_id: data.generate_ticket && data.assignment_type === 'USER' ? data.assigned_user_id : null,
            sla_profile_id: data.generate_ticket ? (data.sla_profile_id || null) : null,
            escalation_policy_id: data.generate_ticket ? (data.escalation_policy_id || null) : null,
            verification_period_minutes: data.generate_ticket ? toNumOrNull(data.verification_period_minutes) : null,
            correlation_config: buildCorrelationConfig(data),
            notification_config: hasNotificationConfig ? {
                channels: data.notification_config.channels || [],
                recipients: data.notification_config.recipients || '',
            } : null,
            ...(mode === 'edit' ? preservedConfig : {}),
        };
    };

    const onSubmit = (data) => {
        setSubmitting(true);
        const onSuccess = () => {
            setSubmitting(false);
            toast.success(mode === 'edit' ? 'Assurance rule updated' : 'Assurance rule created');
            navigate('/assurance/rules');
        };
        const onError = (msg, status) => {
            setSubmitting(false);
            // Edit of a rule deleted elsewhere in the meantime — nothing left to save into.
            if (mode === 'edit' && status === 404) {
                toast.error('This rule no longer exists — it may have been deleted.');
                navigate('/assurance/rules');
                return;
            }
            toast.error(msg);
        };
        if (mode === 'edit') {
            dispatch(AssuranceActions.updateRule(id, buildPayload(data), onSuccess, onError));
        } else {
            dispatch(AssuranceActions.createRule(buildPayload(data), onSuccess, onError));
        }
    };

    // handleSubmit only runs from step 8, but most required fields live on earlier
    // steps — without this a failed validation does nothing visible. Jump to the
    // earliest step that has a problem so its inline errors are on screen.
    const onInvalid = (errs) => {
        const step = Math.min(...Object.keys(errs).map((k) => FIELD_STEP[k] || 1));
        setCurrentStep(step);
        toast.error(`Please fix the highlighted fields on step ${step} (${STEPS[step - 1].label}).`);
    };

    // View mode is a single-page read-only summary, not the wizard — no step
    // rail, no Next/Previous, just everything at once (this is the same
    // markup Step 8's review card uses, rendered standalone).
    const summaryCard = (
        <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 bg-slate-50 border border-slate-200 rounded-lg p-6">
                <div><span className="text-slate-400">Rule Name</span><p className="font-medium text-slate-700 mt-0.5">{formValues.rule_name || '—'}</p></div>
                <div><span className="text-slate-400">Data Source</span><p className="font-medium text-slate-700 mt-0.5">{databaseList.find((d) => d.value === formValues.data_source_id)?.label || formValues.data_source_id || '—'}</p></div>
                <div><span className="text-slate-400">KPI</span><p className="font-medium text-slate-700 mt-0.5">{formValues.kpi || '—'}</p></div>
                <div><span className="text-slate-400">Severity</span><p className="font-medium text-slate-700 mt-0.5">{formValues.severity || '—'}</p></div>
                <div><span className="text-slate-400">Frequency</span><p className="font-medium text-slate-700 mt-0.5">{formValues.frequency ? `${formValues.frequency} mins` : '—'}</p></div>
                <div><span className="text-slate-400">Enabled</span><p className="font-medium text-slate-700 mt-0.5">{formValues.enabled ? 'Yes' : 'No'}</p></div>
                <div><span className="text-slate-400">Generate Ticket</span><p className="font-medium text-slate-700 mt-0.5">{formValues.generate_ticket ? 'Yes' : 'No'}</p></div>
                {formValues.generate_ticket && (
                    <>
                        <div><span className="text-slate-400">Assignment</span><p className="font-medium text-slate-700 mt-0.5">{formValues.assignment_type}</p></div>
                        <div><span className="text-slate-400">SLA Profile</span><p className="font-medium text-slate-700 mt-0.5">{slaProfileList.find((p) => p.id === formValues.sla_profile_id)?.name || 'None'}</p></div>
                        <div><span className="text-slate-400">Escalation Policy</span><p className="font-medium text-slate-700 mt-0.5">{escalationPolicyList.find((p) => p.id === formValues.escalation_policy_id)?.name || 'None'}</p></div>
                        <div><span className="text-slate-400">Verification Period</span><p className="font-medium text-slate-700 mt-0.5">{formValues.verification_period_minutes ? `${formValues.verification_period_minutes} mins` : 'Not set — tickets never auto-close'}</p></div>
                        <div className="sm:col-span-2">
                            <span className="text-slate-400">Incident Correlation</span>
                            <p className="font-medium text-slate-700 mt-0.5">
                                {formValues.correlation_enabled
                                    ? `${formValues.correlation?.min_cell_count || '?'} cells within ${formValues.correlation?.time_window_minutes || '?'} mins · ${formValues.correlation?.kpi_matching || '?'} · ${formValues.correlation?.closure_mode || '?'}${formValues.correlation?.closure_mode === 'PERCENT_CLEAR' ? ` (${formValues.correlation?.closure_threshold_pct || '?'}%)` : ''} · verified ${formValues.correlation?.verification_period_minutes || '?'} mins`
                                    : 'Off'}
                            </p>
                        </div>
                    </>
                )}
                <div className="col-span-full">
                    <span className="text-slate-400">Conditions</span>
                    <p className="font-medium text-slate-700 mt-0.5">
                        {conditionsUnsupported
                            ? formatConditionNode(loadedConditionConfig) || '—'
                            : (formValues.conditions || []).filter((c) => c.kpi).map((c) => `${c.kpi} ${c.operator} ${c.threshold}`).join('  AND  ') || '—'}
                    </p>
                </div>
                <div className="col-span-full"><span className="text-slate-400">KPI Query</span><p className="font-mono text-xs text-slate-700 whitespace-pre-wrap mt-1 bg-white border border-slate-200 rounded-md p-3">{formValues.kpi_query || '—'}</p></div>
                <div className="col-span-full"><span className="text-slate-400">Scope</span><p className="font-medium text-slate-700 mt-0.5">{formValues.scope || '—'}</p></div>
            </div>
        </div>
    );

    if (mode === 'view') {
        return (
            <div className="flex flex-col h-full overflow-hidden" style={{ background: '#ffffff' }}>
                <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-200">
                    <h1 className="text-xl font-bold text-slate-800 leading-tight">View Assurance Rule</h1>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">Intelligent Telecom Assurance — read-only summary</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                    {loadingRule ? (
                        <div className="max-w-xl text-sm text-slate-400">Loading rule…</div>
                    ) : (
                        <div className="max-w-4xl">{summaryCard}</div>
                    )}
                </div>
                <div className="shrink-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
                    <Button variant="secondary" onClick={handleCancel} className="!px-3 sm:!px-4">Close</Button>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setDeleteOpen(true)} disabled={loadingRule}
                            className="px-3 sm:px-4 py-2 text-sm font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                            Delete
                        </button>
                        <Button variant="primary" onClick={() => navigate(`/assurance/rules/edit/${id}`)} disabled={loadingRule} className="!px-3 sm:!px-4">
                            Edit this rule
                        </Button>
                    </div>
                </div>
                <ConfirmModal
                    isOpen={deleteOpen}
                    title="Delete Rule"
                    message={`Delete "${formValues.rule_name ?? ''}"? It stops being evaluated and disappears from the rule list. Its still-active alarms are suppressed. Past alarms and tickets are kept. This can't be undone from the UI.`}
                    confirmLabel={deleting ? 'Deleting…' : 'Delete'}
                    onConfirm={confirmDelete}
                    onCancel={() => { if (!deleting) setDeleteOpen(false); }}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#ffffff' }}>

            {/* Header */}
            <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-200">
                <h1 className="text-xl font-bold text-slate-800 leading-tight">
                    {mode === 'edit' ? 'Edit Assurance Rule' : 'New Assurance Rule'}
                </h1>
                <p className="text-xs text-slate-400 font-medium tracking-wide">Intelligent Telecom Assurance — 8-step Rule Builder</p>
            </div>

            {/* Step indicator — full rail on larger screens */}
            <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-100">
                <div className="hidden sm:flex items-center">
                    {STEPS.map((step, idx) => (
                        <div key={step.id} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                                        ${step.id === currentStep
                                            ? 'text-white'
                                            : step.id < currentStep
                                                ? 'bg-[#0b1830] text-white'
                                                : 'bg-slate-200 text-slate-500'}`}
                                    style={step.id === currentStep ? { background: '#EC7D09' } : undefined}
                                >
                                    {step.id}
                                </div>
                                <span className={`text-[11px] whitespace-nowrap ${step.id === currentStep ? 'text-[#EC7D09] font-semibold' : 'text-slate-500'}`}>
                                    {step.label}
                                </span>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`flex-1 min-w-[1.5rem] h-px mx-2 mb-4 ${step.id < currentStep ? 'bg-[#0b1830]' : 'bg-slate-200'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step indicator — compact, always-centered active step on mobile */}
                <div className="flex sm:hidden flex-col items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ background: '#EC7D09' }}
                    >
                        {currentStep}
                    </div>
                    <span className="text-xs font-semibold text-[#EC7D09] text-center">{activeStep?.label}</span>
                    <div className="w-full h-1 rounded-full bg-slate-200 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(currentStep / STEPS.length) * 100}%`, background: '#EC7D09' }}
                        />
                    </div>
                </div>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
              {loadingRule ? (
                <div className="max-w-xl text-sm text-slate-400">Loading rule…</div>
              ) : (
                <>
                {currentStep === 1 ? (
                    <div className="max-w-xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Data Source</p>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelCls}>Rule Name <span className="text-red-400">*</span></label>
                                <input type="text" className={inputCls} placeholder="Enter rule name"
                                    {...register('rule_name', { required: 'Required' })} />
                                {errors.rule_name && <p className={errorCls}>{errors.rule_name.message}</p>}
                            </div>

                            <div>
                                <label className={labelCls}>Data Source <span className="text-red-400">*</span></label>
                                <select className={inputCls} {...register('data_source_id', { required: 'Required' })}>
                                    <option value="">Select data source</option>
                                    {databaseList?.map((db) => (
                                        <option key={db.value} value={db.value}>{dbOptionLabel(db)}</option>
                                    ))}
                                </select>
                                {errors.data_source_id && <p className={errorCls}>{errors.data_source_id.message}</p>}
                                <p className="text-xs text-slate-400 mt-1.5">
                                    Populated from <code>GET /querybuilder/getDatabase</code> — the same data-source list used by the Query Builder module.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : currentStep === 2 ? (
                    <div className="max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Alert Conditions</p>

                        <div className="max-w-xs mb-6">
                            <label className={labelCls}>KPI <span className="text-red-400">*</span></label>
                            <input type="text" className={inputCls} placeholder="e.g. CDR"
                                {...register('kpi', { required: 'Required' })} />
                            {errors.kpi && <p className={errorCls}>{errors.kpi.message}</p>}
                            <p className="text-xs text-slate-400 mt-1.5">
                                The rule's primary KPI — part of the alarm's identity key (<code>rule_id|node_type|node_id|technology|kpi</code>). Usually the same name as your main condition's KPI below.
                            </p>
                        </div>

                        {conditionsUnsupported ? (
                            <div className="mb-6 text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 flex flex-col gap-1.5">
                                <p className="font-semibold">These conditions can't be edited in this builder.</p>
                                <p>This rule uses nested AND/OR groups (or an OR at the top level). The builder only models a flat list joined by AND, so saving would silently rewrite the rule's logic — Save is disabled for this rule.</p>
                                <p className="font-mono text-amber-900 break-words">{formatConditionNode(loadedConditionConfig) || '—'}</p>
                            </div>
                        ) : (
                        <div className="flex flex-col gap-3 mb-6">
                            <label className={labelCls}>
                                Breach Condition{conditionFields.length > 1 ? 's (all must be true — AND)' : ''} <span className="text-red-400">*</span>
                            </label>
                            {conditionFields.length > 0 && (
                                <div className="grid gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide"
                                    style={{ gridTemplateColumns: 'minmax(0,1fr) 6rem 8rem 2.25rem' }}>
                                    <span>KPI</span>
                                    <span>Operator</span>
                                    <span>Threshold</span>
                                    <span></span>
                                </div>
                            )}
                            {conditionFields.map((field, idx) => (
                                <div key={field.id} className="grid gap-2 items-start"
                                    style={{ gridTemplateColumns: 'minmax(0,1fr) 6rem 8rem 2.25rem' }}>
                                    <input type="text" className={inputCls} placeholder="KPI name (e.g. CDR)"
                                        {...register(`conditions.${idx}.kpi`, { required: 'Required' })} />
                                    <select className={inputCls}
                                        {...register(`conditions.${idx}.operator`, { required: true })}>
                                        {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                    <input type="number" step="any" className={inputCls} placeholder="Threshold"
                                        {...register(`conditions.${idx}.threshold`, { required: 'Required' })} />
                                    <button type="button" onClick={() => removeCondition(idx)} disabled={conditionFields.length === 1}
                                        className="w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200">
                                        ✕
                                    </button>
                                </div>
                            ))}
                            {(errors.conditions ?? []).some(Boolean) && <p className={errorCls}>Every condition needs a KPI and a threshold.</p>}
                            <button type="button" onClick={() => appendCondition({ kpi: '', operator: '>', threshold: '' })}
                                className="self-start text-xs font-semibold text-orange-600 hover:text-orange-700">
                                + Add condition
                            </button>
                            <p className="text-xs text-slate-400">
                                Sent as <code>condition_config.conditions[]</code>, each leaf exactly <code>{'{ kpi, operator, threshold }'}</code>. With two or more conditions the <code>AND</code> is sent explicitly. Nested AND/OR groups aren't built yet.
                            </p>
                        </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Severity <span className="text-red-400">*</span></label>
                                <select className={inputCls} {...register('severity', { required: 'Required' })}>
                                    <option value="">Select</option>
                                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {errors.severity && <p className={errorCls}>{errors.severity.message}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Consecutive Breach Threshold</label>
                                <input type="number" min="1" className={inputCls}
                                    {...register('consecutive_breach_threshold', { valueAsNumber: true, min: { value: 1, message: 'Must be at least 1' }, validate: wholeNumber })} />
                                {errors.consecutive_breach_threshold && <p className={errorCls}>{errors.consecutive_breach_threshold.message}</p>}
                                <p className="text-xs text-slate-400 mt-1.5">Breaches in a row before the alarm goes ACTIVE. Default 1.</p>
                            </div>
                            <div>
                                <label className={labelCls}>Clear Stability Period (mins)</label>
                                <input type="number" min="0" className={inputCls}
                                    {...register('clear_stability_period_minutes', { valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' }, validate: wholeNumber })} />
                                {errors.clear_stability_period_minutes && <p className={errorCls}>{errors.clear_stability_period_minutes.message}</p>}
                                <p className="text-xs text-slate-400 mt-1.5">Minutes of sustained health before CLEARED. Default 0.</p>
                            </div>
                        </div>
                    </div>
                ) : currentStep === 3 ? (
                    <div className="max-w-xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Schedule</p>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelCls}>Frequency (mins) <span className="text-red-400">*</span></label>
                                <input type="number" min="1" className={inputCls} placeholder="e.g. 15"
                                    {...register('frequency', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be greater than 0' }, validate: wholeNumber })} />
                                {errors.frequency && <p className={errorCls}>{errors.frequency.message}</p>}
                                <p className="text-xs text-slate-400 mt-1.5">
                                    How often the Assurance Scheduler evaluates this rule — one dedicated interval job per rule, at this exact minute interval.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="enabled" className="w-4 h-4 accent-orange-500" {...register('enabled')} />
                                <label htmlFor="enabled" className="text-sm text-slate-700 select-none">Enabled — start evaluating this rule immediately on create</label>
                            </div>
                        </div>
                    </div>
                ) : currentStep === 4 ? (
                    <div className="max-w-xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Ticket Generation</p>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="generate_ticket" className="w-4 h-4 accent-orange-500" {...register('generate_ticket')} />
                                <label htmlFor="generate_ticket" className="text-sm text-slate-700 select-none">Generate a ticket when this rule breaches</label>
                            </div>
                            <p className="text-xs text-slate-400 -mt-2">
                                Only fires on a breach-driven RAISE/REOPEN/UPDATE (<code>data_status == "BREACHED"</code>) — a rule that never crosses its threshold never creates a ticket, even with this on.
                            </p>

                            {generateTicket && (
                                <>
                                    <div>
                                        <label className={labelCls}>Assignment Type</label>
                                        <select className={inputCls} {...register('assignment_type')}>
                                            {ASSIGNMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {assignmentType === 'GROUP' && (
                                        <div>
                                            <label className={labelCls}>Group <span className="text-red-400">*</span></label>
                                            <select className={inputCls} {...register('group_id', { required: assignmentType === 'GROUP' ? 'Required' : false })}>
                                                <option value="">Select group</option>
                                                {groupList.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                                            </select>
                                            {errors.group_id && <p className={errorCls}>{errors.group_id.message}</p>}
                                        </div>
                                    )}

                                    {assignmentType === 'USER' && (
                                        <div>
                                            <label className={labelCls}>User <span className="text-red-400">*</span></label>
                                            <select className={inputCls} {...register('assigned_user_id', { required: assignmentType === 'USER' ? 'Required' : false })}>
                                                <option value="">Select user</option>
                                                {userList.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                                            </select>
                                            {errors.assigned_user_id && <p className={errorCls}>{errors.assigned_user_id.message}</p>}
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelCls}>SLA Profile</label>
                                        <select className={inputCls} {...register('sla_profile_id')}>
                                            <option value="">None</option>
                                            {/* A rule may still point at a profile that was disabled later — keep it listed so the dropdown doesn't read "None" while the id is still saved. */}
                                            {slaProfileList.filter((p) => p.enabled || p.id === formValues.sla_profile_id).map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}{p.enabled ? '' : ' (disabled)'}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-400 mt-1.5">From <code>GET /sla-profiles</code>, filtered to enabled profiles — computes the ticket's ack/response/resolution due dates.</p>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Escalation Policy</label>
                                        <select className={inputCls} {...register('escalation_policy_id')}>
                                            <option value="">None</option>
                                            {escalationPolicyList.filter((p) => p.enabled || p.id === formValues.escalation_policy_id).map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}{p.enabled ? '' : ' (disabled)'}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-400 mt-1.5">From <code>GET /escalation-policies</code>, filtered to enabled policies — the level chain that fires notifications as SLA deadlines approach.</p>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Verification Period (mins)</label>
                                        <input type="number" min="1" className={inputCls} placeholder="e.g. 30"
                                            {...register('verification_period_minutes', { min: { value: 1, message: 'Must be at least 1' }, validate: wholeNumber })} />
                                        {errors.verification_period_minutes && <p className={errorCls}>{errors.verification_period_minutes.message}</p>}
                                        <p className="text-xs text-slate-400 mt-1.5">
                                            After a ticket is resolved it closes automatically once the KPI has stayed healthy for this long (and reopens if it breaches again).
                                        </p>
                                        {!formValues.verification_period_minutes && (
                                            <p className="text-xs text-amber-700 mt-1.5">
                                                Left blank, tickets from this rule never auto-close — after Resolve they stay in Verification until someone force-closes them.
                                            </p>
                                        )}
                                    </div>

                                    <div className="border border-slate-200 rounded-md p-3 bg-slate-50 flex flex-col gap-3">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                                            <input type="checkbox" className="w-4 h-4 accent-orange-500" {...register('correlation_enabled')} />
                                            Group breaching cells at the same site into one incident
                                        </label>
                                        <p className="text-xs text-slate-400 -mt-1">
                                            Opt-in per rule. When enough cells at one site breach within the time window, an incident is created with a MASTER ticket, and each cell's own ticket becomes a CHILD. Only <code>CELL → SITE</code> is configured today.
                                        </p>

                                        {correlationEnabled && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={labelCls}>Min Cell Count <span className="text-red-400">*</span></label>
                                                    <input type="number" min="1" className={inputCls} placeholder="e.g. 3"
                                                        {...register('correlation.min_cell_count', { required: correlationEnabled ? 'Required' : false, min: { value: 1, message: 'Must be at least 1' }, validate: wholeNumber })} />
                                                    {errors.correlation?.min_cell_count && <p className={errorCls}>{errors.correlation.min_cell_count.message}</p>}
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Time Window (mins) <span className="text-red-400">*</span></label>
                                                    <input type="number" min="1" className={inputCls} placeholder="e.g. 30"
                                                        {...register('correlation.time_window_minutes', { required: correlationEnabled ? 'Required' : false, min: { value: 1, message: 'Must be at least 1' }, validate: wholeNumber })} />
                                                    {errors.correlation?.time_window_minutes && <p className={errorCls}>{errors.correlation.time_window_minutes.message}</p>}
                                                </div>
                                                <div>
                                                    <label className={labelCls}>KPI Matching <span className="text-red-400">*</span></label>
                                                    <select className={inputCls} {...register('correlation.kpi_matching', { required: correlationEnabled ? 'Required' : false })}>
                                                        <option value="">Select</option>
                                                        {KPI_MATCHING.map((v) => <option key={v} value={v}>{v}</option>)}
                                                    </select>
                                                    {errors.correlation?.kpi_matching && <p className={errorCls}>{errors.correlation.kpi_matching.message}</p>}
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Closure Mode <span className="text-red-400">*</span></label>
                                                    <select className={inputCls} {...register('correlation.closure_mode', { required: correlationEnabled ? 'Required' : false })}>
                                                        <option value="">Select</option>
                                                        {CLOSURE_MODES.map((v) => <option key={v} value={v}>{v}</option>)}
                                                    </select>
                                                    {errors.correlation?.closure_mode && <p className={errorCls}>{errors.correlation.closure_mode.message}</p>}
                                                </div>
                                                {closureMode === 'PERCENT_CLEAR' && (
                                                    <div>
                                                        <label className={labelCls}>Closure Threshold % <span className="text-red-400">*</span></label>
                                                        <input type="number" min="1" max="100" className={inputCls} placeholder="e.g. 80"
                                                            {...register('correlation.closure_threshold_pct', { required: closureMode === 'PERCENT_CLEAR' ? 'Required' : false, min: { value: 1, message: 'Must be 1–100' }, max: { value: 100, message: 'Must be 1–100' } })} />
                                                        {errors.correlation?.closure_threshold_pct && <p className={errorCls}>{errors.correlation.closure_threshold_pct.message}</p>}
                                                    </div>
                                                )}
                                                <div>
                                                    <label className={labelCls}>Incident Verification Period (mins) <span className="text-red-400">*</span></label>
                                                    <input type="number" min="1" className={inputCls} placeholder="e.g. 30"
                                                        {...register('correlation.verification_period_minutes', { required: correlationEnabled ? 'Required' : false, min: { value: 1, message: 'Must be at least 1' }, validate: wholeNumber })} />
                                                    {errors.correlation?.verification_period_minutes && <p className={errorCls}>{errors.correlation.verification_period_minutes.message}</p>}
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Technology Matching</label>
                                                    <select className={inputCls} {...register('correlation.technology_matching')}>
                                                        <option value="">Not set</option>
                                                        {TECHNOLOGY_MATCHING.map((v) => <option key={v} value={v}>{v}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Severity Floor</label>
                                                    <select className={inputCls} {...register('correlation.severity_floor')}>
                                                        <option value="">Not set</option>
                                                        {SEVERITIES.map((v) => <option key={v} value={v}>{v}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : currentStep === 5 ? (
                    <div className="max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Alert Content &amp; Queries</p>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelCls}>KPI Query (SQL)</label>
                                <textarea rows={7} className={codeTextareaCls} placeholder="SELECT cell_id AS node_id, 'CELL' AS node_type, technology, cdr_value AS CDR FROM kpi_cdr_view"
                                    {...register('kpi_query')} />
                                <p className="text-xs text-slate-400 mt-1.5">
                                    Run against the Step 1 data source via the platform's existing query runner. Not hard-required by the backend, but a rule without it is skipped on every evaluation tick (logged as a warning) — it never produces an alarm.
                                </p>
                                <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-500">
                                    Expected result columns (case-insensitive): <code className="text-slate-700">node_id</code> <span className="text-red-400">required</span>, <code className="text-slate-700">node_type</code> (optional, defaults to <code>CELL</code>), <code className="text-slate-700">technology</code> (optional), plus one column matching each <code>kpi</code> name used in Step 2's conditions.
                                </div>
                                {queryWarnings.length > 0 && (
                                    <div className="mt-2 text-xs bg-red-50 border border-red-200 rounded-md p-3 text-red-700 flex flex-col gap-1">
                                        <p className="font-semibold">This rule will not evaluate correctly:</p>
                                        {queryWarnings.map((w, i) => <p key={i}>· {w}</p>)}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className={labelCls}>Scope</label>
                                <input type="text" className={inputCls} placeholder="Free text — e.g. region, vendor, or a short note on intended use"
                                    {...register('scope')} />
                                <p className="text-xs text-slate-400 mt-1.5">No structured/enforced meaning on the backend today — plain free text.</p>
                            </div>
                        </div>
                    </div>
                ) : currentStep === 6 ? (
                    <div className="max-w-xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Notification Settings</p>
                        <div className="mb-4 text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
                            <strong>Not currently acted on by the backend.</strong> <code>notification_config</code> is stored on the rule but no code path reads or dispatches it today — nothing gets sent because of what's entered here.
                        </div>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelCls}>Channels</label>
                                <div className="flex items-center gap-4">
                                    {NOTIFICATION_CHANNELS.map((ch) => (
                                        <label key={ch} className="flex items-center gap-1.5 text-sm text-slate-700 select-none">
                                            <input type="checkbox" className="w-4 h-4 accent-orange-500" value={ch} {...register('notification_config.channels')} />
                                            {ch}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Recipients</label>
                                <Controller
                                    name="notification_config.recipients"
                                    control={control}
                                    render={({ field }) => (
                                        <EmailChipInput
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            placeholder="Add emails — press comma, semicolon, colon or Enter"
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                ) : currentStep === 7 ? (
                    <div className="max-w-xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Access &amp; Visibility</p>
                        <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
                            <strong>Not currently implemented.</strong> There is no field on <code>assurance_rule</code>, no API, and no enforcement anywhere that restricts which users can see or use a rule — every <code>assurance-rules</code> endpoint is reachable by any authenticated user today. No form is built here since there's nothing on the backend for it to save into; a real control (e.g. reusing Step 4's assignment/group scoping for visibility, not just ticket assignment) would need a backend change first.
                        </div>
                    </div>
                ) : currentStep === 8 ? (
                    <div className="max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">Review &amp; Create</p>
                        {summaryCard}
                        {queryWarnings.length > 0 && (
                            <div className="mt-4 text-xs bg-red-50 border border-red-200 rounded-md p-3 text-red-700 flex flex-col gap-1">
                                <p className="font-semibold">This rule will not evaluate correctly — the backend will accept it (no 422), but it will never produce an alarm as configured:</p>
                                {queryWarnings.map((w, i) => <p key={i}>· {w}</p>)}
                                <p className="mt-1">Go back to Step 2 or Step 5 to fix before creating, or continue anyway if this is intentional.</p>
                            </div>
                        )}
                        <p className="text-xs text-slate-400 mt-4">
                            Submits <code>{mode === 'edit' ? `PUT /assurance-rules/${id}` : 'POST /assurance-rules'}</code>. On success you'll be taken to the rule list; on <code>422</code> the exact backend validation message shows as a toast — only the first failing field is reported per request, so fix and resubmit if there's more than one issue.
                        </p>
                    </div>
                ) : (
                    <div className="max-w-xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4 pl-2 border-l-2 border-orange-500">{activeStep.label}</p>
                        <p className="text-slate-400 text-sm">Coming soon — wired one step at a time.</p>
                    </div>
                )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
                <Button variant="secondary" onClick={handleCancel} className="!px-3 sm:!px-4">Cancel</Button>
                <div className="flex items-center gap-2 sm:gap-3">
                    <span className="hidden sm:inline text-xs text-slate-400">Step {currentStep} of {STEPS.length}</span>
                    <Button variant="secondary" onClick={goPrevious} disabled={currentStep === 1 || loadingRule} className="!px-3 sm:!px-4">
                        &larr; Previous
                    </Button>
                    {currentStep === STEPS.length ? (
                        <Button variant="primary" onClick={handleSubmit(onSubmit, onInvalid)}
                            disabled={submitting || loadingRule || (mode === 'edit' && conditionsUnsupported)}
                            title={mode === 'edit' && conditionsUnsupported ? "This rule's conditions can't be edited in this builder — saving would rewrite them" : undefined}
                            className="!px-3 sm:!px-4">
                            {submitting ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save Changes' : 'Create')}
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={goNext} disabled={loadingRule} className="!px-3 sm:!px-4">
                            Next &rarr;
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssuranceRuleForm;
