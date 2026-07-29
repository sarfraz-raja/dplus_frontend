import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InsightsEngineActions from '../../store/actions/insightsEngine-actions';
import {
    BarChart2, LineChart, PieChart, Activity, TrendingUp, TrendingDown,
    Globe, Map, Layers, Database, Server, Wifi, Signal, Radio,
    Monitor, Layout, Box, Sliders, Grid, Gauge, Network, Cpu,
    BarChart, AreaChart, ScatterChart, Radar, Rss, Satellite,
    Building2, Building, Antenna, PhoneCall, AlertCircle, Bell,
} from 'lucide-react';
import Button from '../../components/Button';
import FormModal from '../../components/FormModal';
import DataTable from '../../components/DataTable';
import { listDashboards } from '../../store/actions/dashboardBuilder-actions';

// Confirmed via a live POST /dashboards/{id}/data response — the field is `is_published`
// (a plain boolean), not `status`. Same helper as DashboardBuilder.jsx/EmbeddedDashboard.jsx's isPublished.
const isDashboardPublished = (d) => d?.is_published === true;

/* ─── Icon options ─── */
const ICON_OPTIONS = [
    { name: 'BarChart2',    Icon: BarChart2    },
    { name: 'LineChart',    Icon: LineChart    },
    { name: 'PieChart',     Icon: PieChart     },
    { name: 'Activity',     Icon: Activity     },
    { name: 'TrendingUp',   Icon: TrendingUp   },
    { name: 'TrendingDown', Icon: TrendingDown },
    { name: 'AreaChart',    Icon: AreaChart    },
    { name: 'BarChart',     Icon: BarChart     },
    { name: 'ScatterChart', Icon: ScatterChart },
    { name: 'Gauge',        Icon: Gauge        },
    { name: 'Globe',        Icon: Globe        },
    { name: 'Map',          Icon: Map          },
    { name: 'Layers',       Icon: Layers       },
    { name: 'Network',      Icon: Network      },
    { name: 'Database',     Icon: Database     },
    { name: 'Server',       Icon: Server       },
    { name: 'Cpu',          Icon: Cpu          },
    { name: 'Wifi',         Icon: Wifi         },
    { name: 'Signal',       Icon: Signal       },
    { name: 'Radio',        Icon: Radio        },
    { name: 'Rss',          Icon: Rss          },
    { name: 'Satellite',    Icon: Satellite    },
    { name: 'Antenna',      Icon: Antenna      },
    { name: 'Monitor',      Icon: Monitor      },
    { name: 'Layout',       Icon: Layout       },
    { name: 'Box',          Icon: Box          },
    { name: 'Sliders',      Icon: Sliders      },
    { name: 'Grid',         Icon: Grid         },
    { name: 'Radar',        Icon: Radar        },
    { name: 'Building2',    Icon: Building2    },
    { name: 'Building',     Icon: Building     },
    { name: 'PhoneCall',    Icon: PhoneCall    },
    { name: 'AlertCircle',  Icon: AlertCircle  },
    { name: 'Bell',         Icon: Bell         },
];

const slugify = (str) =>
    str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const EMPTY_FORM = {
    type:              'link',
    title:             '',
    parent_id:         null,
    route:             '',
    routeAuto:         true,
    dashboard_platform: 'superset',
    superset_id:       '',
    superset_uuid:     '',
    icon:              null,
    is_active:         true,
    sequence:          '',
};

const PLATFORM_OPTIONS = [
    { value: 'superset', label: 'Superset' },
    { value: 'grafana', label: 'Grafana' },
    { value: 'dashboard_builder', label: 'Dashboard Builder' },
];

const COLUMNS = [
    { label: 'Title',   key: 'title'         },
    { label: 'Parent',  key: 'parent_id'     },
    { label: 'Route',   key: 'route'         },
    { label: 'ID',      key: 'superset_id'   },
    { label: 'UUID',    key: 'superset_uuid' },
    { label: 'Icon',    key: 'icon'          },
    { label: 'Seq',     key: 'sequence'      },
    { label: 'Active',  key: 'is_active'     },
    { label: 'Actions', key: '_actions'      },
];

/* ─── Form ─── */
const DashboardForm = ({ initial = EMPTY_FORM, onSave, onCancel, allGroups = [] }) => {
    const [form,   setForm]   = useState({ ...EMPTY_FORM, ...initial });
    const [errors, setErrors] = useState({});
    // Only fetched when the Dashboard Builder platform is picked — list of published
    // (not draft) Dashboard Builder dashboards to choose from, instead of a raw numeric id.
    const [builderDashboards, setBuilderDashboards] = useState([]);
    const [builderLoading, setBuilderLoading] = useState(false);
    const [builderError, setBuilderError] = useState(null);

    useEffect(() => {
        if (form.dashboard_platform !== 'dashboard_builder') return;
        setBuilderLoading(true);
        setBuilderError(null);
        listDashboards()
            .then((list) => setBuilderDashboards(list.filter(isDashboardPublished)))
            .catch((e) => setBuilderError(e.message))
            .finally(() => setBuilderLoading(false));
    }, [form.dashboard_platform]);

    const set = (key, val) => {
        setForm(p => ({ ...p, [key]: val }));
        setErrors(p => ({ ...p, [key]: '' }));
    };

    /* Auto-generate route when title or parent changes */
    useEffect(() => {
        if (!form.routeAuto) return;
        const slug   = slugify(form.title);
        const parent = allGroups.find(g => g.id === form.parent_id);
        const base   = parent ? parent.route : '/insights-engine';
        setForm(p => ({ ...p, route: slug ? `${base}/${slug}` : base }));
    }, [form.title, form.parent_id, form.routeAuto]);

    const handleTypeChange = (val) => {
        setForm(p => ({ ...p, type: val, superset_id: val === 'group' ? '' : p.superset_id }));
        setErrors(p => ({ ...p, type: '' }));
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Title is required';
        if (!form.route.trim()) e.route = 'Route is required';
        if (isLink) {
            if (form.superset_id === '')
                e.superset_id = form.dashboard_platform === 'dashboard_builder' ? 'Dashboard is required' : 'ID is required';
            // Dashboard Builder's id comes from a <select> of real dashboards (string values,
            // not necessarily numeric) — only Superset/Grafana ids need the positive-int check.
            else if (
                form.dashboard_platform !== 'dashboard_builder' && (
                    isNaN(Number(form.superset_id)) ||
                    !Number.isInteger(Number(form.superset_id)) ||
                    Number(form.superset_id) < 1
                )
            ) e.superset_id = 'ID must be a positive whole number';
        }
        return e;
    };

    const handleSave = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        const { routeAuto, ...payload } = form;
        if (!isLink) { delete payload.superset_id; delete payload.superset_uuid; delete payload.dashboard_platform; }
        else if (payload.superset_id && payload.dashboard_platform !== 'dashboard_builder') payload.superset_id = Number(payload.superset_id);
        if (payload.sequence !== '' && payload.sequence !== null)
            payload.sequence = Math.trunc(Number(payload.sequence));
        else
            payload.sequence = null;
        onSave(payload);
    };

    const inputCls = (key) =>
        `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
            errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
        }`;

    const selectedIcon = ICON_OPTIONS.find(o => o.name === form.icon);
    const isLink       = form.type === 'link';

    return (
        <div className="flex flex-col gap-5">

            {/* Row 1: Type + Title */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Type <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={form.type}
                        onChange={e => handleTypeChange(e.target.value)}
                        className={inputCls('type')}
                    >
                        <option value="group">Group</option>
                        <option value="link">Link</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Title <span className="text-red-400">*</span>
                    </label>
                    <input
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        placeholder="e.g. MSS Dashboard"
                        className={inputCls('title')}
                    />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>
            </div>

            {/* Row 2: Parent Group + Route */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Parent Group
                        <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>
                    </label>
                    <select
                        value={form.parent_id ?? ''}
                        onChange={e => set('parent_id', e.target.value === '' ? null : e.target.value)}
                        className={inputCls('parent_id')}
                    >
                        <option value="">— Insights Engine (root) —</option>
                        {allGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </select>
                    {errors.parent_id && <p className="text-xs text-red-500 mt-1">{errors.parent_id}</p>}
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Route <span className="text-red-400">*</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.routeAuto}
                                onChange={e => setForm(p => ({ ...p, routeAuto: e.target.checked }))}
                            />
                            Auto-generate
                        </label>
                    </div>
                    <input
                        value={form.route}
                        onChange={e => { set('route', e.target.value); setForm(p => ({ ...p, routeAuto: false })); }}
                        placeholder="/insights-engine/ran-dashboard/huawei4g"
                        readOnly={form.routeAuto}
                        className={`${inputCls('route')} ${form.routeAuto ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`}
                    />
                    {errors.route && <p className="text-xs text-red-500 mt-1">{errors.route}</p>}
                </div>
            </div>

            {/* Row 3: Platform — link only */}
            {isLink && (
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Platform
                    </label>
                    <select
                        value={form.dashboard_platform}
                        onChange={e => set('dashboard_platform', e.target.value)}
                        className={inputCls('dashboard_platform')}
                    >
                        {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            )}

            {/* Row 4: ID + UUID (Superset/Grafana) OR a published-dashboard picker (Dashboard Builder) */}
            {isLink && form.dashboard_platform === 'dashboard_builder' ? (
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Dashboard <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={form.superset_id}
                        onChange={e => set('superset_id', e.target.value)}
                        className={inputCls('superset_id')}
                        disabled={builderLoading}
                    >
                        <option value="">{builderLoading ? 'Loading…' : '— Select a published dashboard —'}</option>
                        {builderDashboards.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    {errors.superset_id && <p className="text-xs text-red-500 mt-1">{errors.superset_id}</p>}
                    {builderError && <p className="text-xs text-red-500 mt-1">{builderError}</p>}
                    {!builderLoading && !builderError && builderDashboards.length === 0 && (
                        <p className="text-xs text-slate-400 mt-1">No published dashboards yet — publish one from the Dashboard Builder first.</p>
                    )}
                </div>
            ) : isLink && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            ID <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={form.superset_id}
                            onChange={e => set('superset_id', e.target.value === '' ? '' : String(Math.trunc(Number(e.target.value))))}
                            placeholder="e.g. 42"
                            className={inputCls('superset_id')}
                        />
                        {errors.superset_id && <p className="text-xs text-red-500 mt-1">{errors.superset_id}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            UUID
                            <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>
                        </label>
                        <input
                            value={form.superset_uuid ?? ''}
                            onChange={e => set('superset_uuid', e.target.value)}
                            placeholder="e.g. 550e8400-e29b-41d4-a716-…"
                            className={inputCls('superset_uuid')}
                        />
                    </div>
                </div>
            )}

            {/* Icon picker */}
            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Icon
                    {selectedIcon && (
                        <span className="ml-2 normal-case font-medium text-orange-600">— {selectedIcon.name}</span>
                    )}
                </label>
                <div className="grid grid-cols-9 gap-1.5 p-3 border border-slate-200 rounded-xl bg-slate-50 max-h-44 overflow-y-auto">
                    {ICON_OPTIONS.map(({ name, Icon }) => (
                        <button
                            key={name}
                            type="button"
                            title={name}
                            onClick={() => set('icon', form.icon === name ? null : name)}
                            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all border ${
                                form.icon === name
                                    ? 'bg-orange-100 border-orange-400 text-orange-600 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                        >
                            <Icon size={17} />
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">Click to select · Click again to deselect</p>
            </div>

            {/* Row: Sequence + Is Active */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Sequence
                        <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.sequence ?? ''}
                        onChange={e => set('sequence', e.target.value === '' ? '' : String(Math.trunc(Number(e.target.value))))}
                        placeholder="e.g. 1"
                        className={inputCls('sequence')}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Is Active
                    </label>
                    <div className="flex items-center h-[38px] gap-3">
                        <button
                            type="button"
                            onClick={() => set('is_active', !form.is_active)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                form.is_active ? 'bg-orange-500' : 'bg-slate-300'
                            }`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                                form.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                        <span className="text-sm text-slate-600">{form.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save</Button>
            </div>
        </div>
    );
};

/* ─── Main Page ─── */
const InsightsEngineDashboardManager = () => {
    const dispatch = useDispatch();
    const rows = useSelector(state => state.insightsEngine.dashboardList);

    const [modalOpen,       setModalOpen]       = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget,    setDeleteTarget]    = useState(null);
    const [editTarget,      setEditTarget]      = useState(null);
    const [modalTitle,      setModalTitle]      = useState('');

    useEffect(() => {
        dispatch(InsightsEngineActions.getDashboardList());
    }, []);

    /* Groups available as parents — derived from loaded rows */
    const allGroups = rows.filter(r => r.type === 'group');

    const openAdd = () => {
        setEditTarget(null);
        setModalTitle('Add Dashboard');
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditTarget(row);
        setModalTitle('Edit Dashboard');
        setModalOpen(true);
    };

    const handleSave = (form) => {
        dispatch(InsightsEngineActions.saveDashboard(form, editTarget?.id ?? null, () => {
            dispatch(InsightsEngineActions.getDashboardList());
            setModalOpen(false);
            setEditTarget(null);
        }));
    };

    const confirmDelete = () => {
        dispatch(InsightsEngineActions.deleteDashboard(deleteTarget?.id, () => {
            dispatch(InsightsEngineActions.getDashboardList());
        }));
        setDeleteModalOpen(false);
        setDeleteTarget(null);
    };

    const renderCell = (row, col) => {
        if (col.key === 'type') {
            const isGroup = row.type === 'group';
            return (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    isGroup ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                }`}>
                    {row.type}
                </span>
            );
        }

        if (col.key === 'parent_id') {
            const parent = rows.find(r => r.id === row.parent_id);
            return <span className="text-xs text-slate-500">{parent?.title ?? (row.parent_id ? row.parent_id : '—')}</span>;
        }

        if (col.key === 'route') {
            return (
                <span className="font-mono text-xs text-slate-500 truncate max-w-[200px] block" title={row.route}>
                    {row.route || '—'}
                </span>
            );
        }

        if (col.key === 'superset_id') {
            if (row.type === 'group') return <span className="text-slate-300 text-xs">—</span>;
            return <span className="text-xs text-slate-600">{row.superset_id || '—'}</span>;
        }

        if (col.key === 'superset_uuid') {
            if (row.type === 'group') return <span className="text-slate-300 text-xs">—</span>;
            return (
                <span className="font-mono text-xs text-slate-500 truncate max-w-[140px] block" title={row.superset_uuid}>
                    {row.superset_uuid || '—'}
                </span>
            );
        }

        if (col.key === 'icon') {
            const opt = ICON_OPTIONS.find(o => o.name === row.icon);
            if (!opt) return <span className="text-slate-300 text-xs italic">—</span>;
            const { Icon } = opt;
            return (
                <span className="flex items-center gap-1.5">
                    <Icon size={14} className="text-orange-500 shrink-0" />
                    <span className="text-xs text-slate-500">{opt.name}</span>
                </span>
            );
        }

        if (col.key === 'sequence') {
            return <span className="text-xs text-slate-600">{row.sequence ?? '—'}</span>;
        }

        if (col.key === 'is_active') {
            return (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    row.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                    {row.is_active ? 'Active' : 'Inactive'}
                </span>
            );
        }

        if (col.key === '_actions') return (
            <span className="flex items-center gap-2">
                <button
                    onClick={() => openEdit(row)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
                <button
                    onClick={() => { setDeleteTarget(row); setDeleteModalOpen(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                    Delete
                </button>
            </span>
        );

        const val = row[col.key];
        return (
            <span className="truncate max-w-[180px] block text-slate-700" title={String(val ?? '')}>
                {val ?? '—'}
            </span>
        );
    };

    return (
        <>
            <div className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4" style={{ background: '#ffffff' }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: 'linear-gradient(135deg, #EC7D09 0%, #f59e0b 100%)' }}
                        >
                            <BarChart2 size={20} color="white" strokeWidth={1.8} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">
                                Insights Engine Dashboard Manager
                            </h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">
                                Manage and configure all Insights Engine dashboard entries
                            </p>
                        </div>
                    </div>
                    <Button onClick={openAdd} variant="primary">
                        + Add Dashboard
                    </Button>
                </div>

                {/* ── DataTable ── */}
                <DataTable
                    columns={COLUMNS}
                    data={rows}
                    renderCell={renderCell}
                    emptyMessage="No entries yet. Click '+ Add Dashboard' to get started."
                    searchPlaceholder="Search dashboards…"
                    countLabel="dashboard"
                />
            </div>

            {/* ── Add / Edit Modal ── */}
            <FormModal title={modalTitle} isOpen={modalOpen} setIsOpen={setModalOpen} size="lg">
                <DashboardForm
                    key={editTarget?.id ?? 'new'}
                    initial={editTarget ? { ...EMPTY_FORM, ...editTarget, routeAuto: false } : EMPTY_FORM}
                    onSave={handleSave}
                    onCancel={() => setModalOpen(false)}
                    allGroups={allGroups}
                />
            </FormModal>

            {/* ── Delete Confirmation ── */}
            <FormModal title="Delete Entry" headerColor="#b91c1c" isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">
                        Delete <strong>{deleteTarget?.title}</strong>?
                    </p>
                    <p className="text-xs text-red-400">This action cannot be undone.</p>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <button
                        onClick={() => setDeleteModalOpen(false)}
                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDelete}
                        className="px-6 py-2 text-sm font-semibold rounded text-white"
                        style={{ background: '#b91c1c' }}
                    >
                        Delete
                    </button>
                </div>
            </FormModal>
        </>
    );
};

export default InsightsEngineDashboardManager;
