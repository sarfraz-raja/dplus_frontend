import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InsightsEngineActions from '../../store/actions/insightsEngine-actions.js';

import {
    BarChart2, LineChart, PieChart, Activity, TrendingUp, TrendingDown,
    Globe, Map, Layers, Database, Server, Wifi, Signal, Radio,
    Monitor, Layout, Box, Sliders, Grid, Gauge, Network, Cpu,
    BarChart, AreaChart, ScatterChart, Radar, Rss, Satellite,
    Building2, Building, Antenna, PhoneCall, AlertCircle, Bell,
    ChevronDown, ChevronRight, Plus, Pencil, X,
    ClipboardCheck, WifiHigh, SignalHigh, TriangleAlert, ChartLine,
    ChartColumn, ListChecks, ShieldCheck, MapPin, MapPinned,
    LayoutDashboard, Settings, Settings2, BellRing, CalendarCheck,
    GitBranch, HardDrive, Terminal, FileCode, SearchCheck,
    Waves, Zap, Target, Eye, RefreshCw, Download, Upload,
    ShieldAlert, Timer, GripVertical,
} from 'lucide-react';
import Button from '../../components/Button';
import { buildInsightsRootTree, sortBySequence } from '../../utils/insightsMenu';

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
    { name: 'ChartLine',      Icon: ChartLine      },
    { name: 'SignalHigh',     Icon: SignalHigh     },
    { name: 'WifiHigh',       Icon: WifiHigh       },
    { name: 'TriangleAlert',  Icon: TriangleAlert  },
    { name: 'ClipboardCheck', Icon: ClipboardCheck },
    /* Analytics / KPI */
    { name: 'ChartColumn',    Icon: ChartColumn    },
    { name: 'ListChecks',     Icon: ListChecks     },
    { name: 'Target',         Icon: Target         },
    { name: 'Timer',          Icon: Timer          },
    /* Site / Location */
    { name: 'MapPin',         Icon: MapPin         },
    { name: 'MapPinned',      Icon: MapPinned      },
    /* Telecom / RF */
    { name: 'Waves',          Icon: Waves          },
    { name: 'Zap',            Icon: Zap            },
    { name: 'Download',       Icon: Download       },
    { name: 'Upload',         Icon: Upload         },
    /* Compliance / Security */
    { name: 'ShieldCheck',    Icon: ShieldCheck    },
    { name: 'ShieldAlert',    Icon: ShieldAlert    },
    /* Dashboard / Navigation */
    { name: 'LayoutDashboard',Icon: LayoutDashboard},
    { name: 'Settings',       Icon: Settings       },
    { name: 'Settings2',      Icon: Settings2      },
    /* Operations / Monitoring */
    { name: 'Eye',            Icon: Eye            },
    { name: 'RefreshCw',      Icon: RefreshCw      },
    { name: 'HardDrive',      Icon: HardDrive      },
    { name: 'Terminal',       Icon: Terminal       },
    { name: 'FileCode',       Icon: FileCode       },
    { name: 'SearchCheck',    Icon: SearchCheck    },
    { name: 'GitBranch',      Icon: GitBranch      },
    /* Alerts / Scheduling */
    { name: 'BellRing',       Icon: BellRing       },
    { name: 'CalendarCheck',  Icon: CalendarCheck  },
];

/* Title → icon fallback (mirrors Sidebar.jsx SIDEBAR_CHILD_ICON_MAP) */
const TITLE_ICON_MAP = {
    'core dashboard':                      Layers,
    'core dashboards':                     Layers,
    'mss':                                 ChartLine,
    'mss dashboard':                       ChartLine,
    'ugw':                                 Gauge,
    'ugw dashboard':                       Gauge,
    'mgw':                                 Network,
    'mgw dashboard':                       Network,
    'ran dashboard':                       Radio,
    'ran dashboards':                      Radio,
    'worst cells':                         TriangleAlert,
    'worst cells dashboard':               TriangleAlert,
    'huawei 4g':                           SignalHigh,
    '4g dashboard':                        SignalHigh,
    'huawei 5g':                           WifiHigh,
    '5g dashboard':                        WifiHigh,
    '5g nsa to sa pre post dashboard':     WifiHigh,
    '5g nsa to sa pre post das...':        WifiHigh,
    'network dashboard':                   Activity,
    'parameter audit dashboard':           ClipboardCheck,
};

const getTitleIcon = (title) =>
    TITLE_ICON_MAP[String(title || '').toLowerCase().trim()] ?? null;

const slugify = str =>
    str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const flattenTree = (items, depth = 0) =>
    (items || []).reduce((acc, item) => {
        acc.push({ ...item, _depth: depth });
        if (item.children?.length) acc.push(...flattenTree(item.children, depth + 1));
        return acc;
    }, []);

const EMPTY_FORM = {
    title: '', route: '', routeAuto: true,
    icon: null, parent_id: null, sequence: '',
    type: 'link', is_active: true, allow_role: 'Both',
    dashboard_platform: 'superset',
    dashboard_id: '', dashboard_uuid: '',
};

/* ─── Right-panel form ─── */
const EditPanel = ({ mode, item, parentItem, insightsRoot, allFlat, onSave, onActivate, onDeactivate, onDelete, onCancel, seqLabel }) => {
    const isAdd = mode === 'add';
    const isAddingAtRoot = isAdd && (!parentItem || parentItem.id === insightsRoot?.id);
    const isInactive = !isAdd && item?.is_active === false;
    const isActive = !isAdd && !isInactive;

    const getInitial = () => {
        if (isAdd) return {
            ...EMPTY_FORM,
            parent_id: isAddingAtRoot ? (insightsRoot?.id ?? null) : (parentItem?.id ?? null),
            type: 'link',
        };
        const existingSlug = slugify(item?.title ?? '');
        const existingRoute = item?.route ?? '';
        const routeAuto = existingSlug ? existingRoute.endsWith('/' + existingSlug) : false;
        return {
            title:          item?.title          ?? '',
            route:          existingRoute,
            type:           item?.type           ?? 'link',
            icon:           item?.icon           ?? null,
            parent_id:      item?.parent_id      ?? null,
            sequence:       item?.sequence != null ? String(item.sequence) : '',
            is_active:      item?.is_active      ?? true,
            allow_role:     item?.allow_role     ?? 'Both',
            dashboard_platform: item?.dashboard_platform ?? 'superset',
            dashboard_id:   item?.dashboard_id   != null ? String(item.dashboard_id) : '',
            dashboard_uuid: item?.dashboard_uuid ?? '',
            routeAuto,
        };
    };

    const [form, setForm] = useState(getInitial);
    const [errors, setErrors] = useState({});
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);
    const [confirmDelete,     setConfirmDelete]     = useState(false);

    useEffect(() => {
        setForm(getInitial());
        setErrors({});
        setConfirmDeactivate(false);
        setConfirmDelete(false);
    }, [item?.id, mode, parentItem?.id, insightsRoot?.id]);

    useEffect(() => {
        if (!form.routeAuto) return;
        const slug = slugify(form.title);
        const parent = allFlat.find(i => i.id === form.parent_id);
        const base = parent?.route || insightsRoot?.route || '/insights-engine';
        setForm(p => ({ ...p, route: slug ? `${base}/${slug}` : base }));
    }, [form.title, form.parent_id, form.routeAuto]);

    const set = (key, val) => {
        setForm(p => ({ ...p, [key]: val }));
        setErrors(p => ({ ...p, [key]: '' }));
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Required';
        if (!form.route.trim()) e.route = 'Required';
        if (form.sequence === '' || form.sequence == null) e.sequence = 'Required';
        return e;
    };

    const handleSave = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        const { routeAuto, ...payload } = form;
        if (isAddingAtRoot) {
            payload.parent_id = insightsRoot?.id ?? null;
        } else if (!isAdd && item?.id === insightsRoot?.id) {
            payload.parent_id = null;
        }
        payload.sequence = payload.sequence !== '' ? Math.trunc(Number(payload.sequence)) : null;
        if (payload.dashboard_platform === 'grafana') {
            payload.dashboard_id = payload.dashboard_id?.trim() || null;
        } else {
            payload.dashboard_id = payload.dashboard_id !== '' ? Number(payload.dashboard_id) : null;
        }
        if (!payload.dashboard_uuid?.trim()) payload.dashboard_uuid = null;
        if (!payload.icon) payload.icon = null;
        onSave(payload, isAdd ? null : item?.id);
    };

    const inputCls = key =>
        `w-full border rounded-lg px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
            errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
        }`;

    const isLink       = form.type === 'link';
    const selectedIcon = ICON_OPTIONS.find(o => o.name === form.icon);

    if (!mode) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2 p-4">
                <Pencil size={24} className="opacity-20 sm:hidden" />
                <Pencil size={32} className="opacity-20 hidden sm:block" />
                <p className="text-xs sm:text-sm font-medium text-slate-500">Select an item to edit</p>
                <p className="text-xs">or click <span className="font-mono bg-slate-100 px-1 rounded">+</span> on a group to add a child</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">
                        {isAdd
                            ? `Add under "${parentItem?.title || 'Insights Engine'}"`
                            : `Editing: ${item?.title}`
                        }
                    </span>
                    {isInactive && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 border border-amber-200">
                            Inactive
                        </span>
                    )}
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-2">
                    <X size={14} />
                </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4 flex flex-col gap-3 sm:gap-4">

                {/* Title + Type */}
                <div className="grid grid-cols-2 gap-3">
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
                        {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</label>
                        <select
                            value={form.type}
                            onChange={e => set('type', e.target.value)}
                            className={inputCls('type')}
                        >
                            <option value="group">Group</option>
                            <option value="link" disabled={!isAdd && item?.children?.length > 0}>
                                Link{!isAdd && item?.children?.length > 0 ? ' (has children — remove them first)' : ''}
                            </option>
                        </select>
                        {!isAdd && item?.children?.length > 0 && form.type === 'group' && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                Cannot change to Link while this group has {item.children.length} child item{item.children.length > 1 ? 's' : ''}.
                            </p>
                        )}
                    </div>
                </div>

                {/* Route */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Route <span className="text-red-400">*</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer select-none">
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
                        readOnly={form.routeAuto}
                        placeholder="/insights-engine/..."
                        className={`${inputCls('route')} ${form.routeAuto ? 'bg-slate-50 text-slate-400 cursor-default' : ''}`}
                    />
                    {errors.route && <p className="text-xs text-red-500 mt-0.5">{errors.route}</p>}
                </div>

                {/* Platform + dashboard config — links only */}
                {isLink && (
                    <div className="flex flex-col gap-3">
                        {/* Platform toggle */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                Visualization Engine
                            </label>
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                                {[
                                    { value: 'superset', label: 'v1' },
                                    { value: 'grafana',  label: 'v2' },
                                ].map(({ value, label }) => (
                                    <button
                                        key={value} type="button"
                                        onClick={() => set('dashboard_platform', value)}
                                        className={`flex-1 py-1.5 sm:py-2 font-semibold transition-colors ${
                                            form.dashboard_platform === value
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-white text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* v1 (Superset): Dashboard ID + UUID */}
                        {form.dashboard_platform !== 'grafana' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                        Dashboard ID
                                        <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>
                                    </label>
                                    <input
                                        type="number" min="1" step="1"
                                        value={form.dashboard_id ?? ''}
                                        onChange={e => set('dashboard_id', e.target.value === '' ? '' : String(Math.trunc(Number(e.target.value))))}
                                        placeholder="e.g. 42"
                                        className={inputCls('dashboard_id')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                        Dashboard UUID
                                        <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>
                                    </label>
                                    <input
                                        value={form.dashboard_uuid ?? ''}
                                        onChange={e => set('dashboard_uuid', e.target.value)}
                                        placeholder="550e8400-…"
                                        className={inputCls('dashboard_uuid')}
                                    />
                                </div>
                            </div>
                        )}

                        {/* v2 (Grafana): uid & Name for auth token */}
                        {/* {form.dashboard_platform === 'grafana' && (
                          <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                        Dashboard Name
                                        <span className="text-slate-400 normal-case font-normal ml-1">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.dashboard_id ?? ''}
                                        onChange={e => set('dashboard_id', slugify(e.target.value))}
                                        placeholder="e.g. my-dashboard"
                                        className={inputCls('dashboard_id')}
                                    />
                                    {form.dashboard_id && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                                            → {form.dashboard_id}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                        dashboard_uid
                                        <span className="text-slate-400 normal-case font-normal ml-1">(from dashboard link)</span>
                                    </label>
                                    <input
                                        value={form.dashboard_uuid ?? ''}
                                        onChange={e => set('dashboard_uuid', e.target.value)}
                                        placeholder="a431809ceb21421d97c69a5a7baa5c74"
                                        className={inputCls('dashboard_uuid')}
                                    />
                                </div>
                            </div>
                        )} */}

                        {form.dashboard_platform === 'grafana' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                    Access Token 
                                    <span className="text-slate-400 normal-case font-normal ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.dashboard_id ?? ''}
                                    onChange={e => set('dashboard_id', slugify(e.target.value))}
                                    placeholder="e.g. ae91f0c3b8d2c238bfb7c8a1d2e3f45"
                                    className={inputCls('dashboard_id')}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Icon picker */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Icon
                        {selectedIcon && (
                            <span className="ml-2 normal-case font-medium text-orange-500">— {selectedIcon.name}</span>
                        )}
                    </label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-11 lg:grid-cols-10 xl:grid-cols-12 gap-1 p-2 border border-slate-200 rounded-xl bg-slate-50">
                        {ICON_OPTIONS.map(({ name, Icon }) => (
                            <button
                                key={name} type="button" title={name}
                                onClick={() => set('icon', form.icon === name ? null : name)}
                                className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg transition-all border ${
                                    form.icon === name
                                        ? 'bg-orange-100 border-orange-400 text-orange-600 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                                <Icon size={11} className="sm:hidden" />
                                <Icon size={15} className="hidden sm:block" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sequence */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Sequence <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="number" min="1" step="1"
                        value={form.sequence ?? ''}
                        onChange={e => set('sequence', e.target.value === '' ? '' : String(Math.trunc(Number(e.target.value))))}
                        placeholder="e.g. 2"
                        className={inputCls('sequence')}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        Position within parent group (1, 2, 3…). Full label shown in sidebar preview.
                    </p>
                    {errors.sequence && <p className="text-xs text-red-500 mt-0.5">{errors.sequence}</p>}
                </div>

                {/* Allow Role */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Allow Role</label>
                    <select value={form.allow_role} onChange={e => set('allow_role', e.target.value)} className={inputCls('allow_role')}>
                        <option value="Both">Both</option>
                        <option value="Admin">Admin</option>
                        <option value="User">User</option>
                    </select>
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 px-3 py-2 sm:px-5 sm:py-3 flex flex-col gap-2">
                <div className="flex gap-2">
                    <Button variant="primary" onClick={handleSave} className="flex-1">Save</Button>
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                </div>

                {!isAdd && (
                    <div className="flex flex-col gap-1.5">
                        {isInactive && (
                            <button
                                onClick={() => { onActivate(item); setConfirmDelete(false); }}
                                className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
                            >
                                Activate this item
                            </button>
                        )}

                        {isActive && (
                            confirmDeactivate ? (
                                <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                                    <span className="text-xs text-amber-700 flex-1 min-w-0 truncate">Deactivate "{item?.title}"?</span>
                                    <button
                                        onClick={() => { onDeactivate(item); setConfirmDeactivate(false); }}
                                        className="text-xs font-semibold text-white bg-amber-500 rounded px-2.5 py-1 hover:bg-amber-600 transition-colors shrink-0"
                                    >Confirm</button>
                                    <button onClick={() => setConfirmDeactivate(false)} className="text-xs text-slate-500 hover:text-slate-700 shrink-0">Cancel</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setConfirmDeactivate(true); setConfirmDelete(false); }}
                                    className="w-full text-xs text-amber-500 hover:text-amber-700 py-1 transition-colors"
                                >
                                    Deactivate this item
                                </button>
                            )
                        )}

                        {/* Delete */}
                        {confirmDelete ? (
                            <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                <span className="text-xs text-red-600 flex-1 min-w-0 truncate">Permanently delete "{item?.title}"?</span>
                                <button
                                    onClick={() => { onDelete(item); setConfirmDelete(false); }}
                                    className="text-xs font-semibold text-white bg-red-600 rounded px-2.5 py-1 hover:bg-red-700 transition-colors shrink-0"
                                >Delete</button>
                                <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 hover:text-slate-700 shrink-0">Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className="w-full text-xs text-red-400 hover:text-red-600 py-1 transition-colors">
                                Delete permanently
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Hierarchical sequence label builder ─── */
const computeSequenceLabels = (items, prefix) => {
    const labels = {};
    sortBySequence(items || []).forEach((item, idx) => {
        const label = `${prefix}.${idx + 1}`;
        labels[item.id] = label;
        if (item.children?.length)
            Object.assign(labels, computeSequenceLabels(item.children, label));
    });
    return labels;
};

/* ─── Sidebar tree node ─── */
const SidebarTreeNode = ({
    item, depth, selectedId, onSelect, onAdd, sequenceLabels = {},
    draggingId, dragOverId, dragOverPosition, onDragStart, onDragOver, onDragEnd, onDrop,
}) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isSelected  = selectedId === item.id;
    const isGroup     = item.type === 'group';
    const ItemIcon    = ICON_OPTIONS.find(o => o.name === item.icon)?.Icon ?? null;
    const sortedChildren = sortBySequence(item.children);
    const isDragging  = draggingId === item.id;
    const isOver      = dragOverId === item.id;

    const dragProps = {
        draggable: true,
        onDragStart: e => { e.stopPropagation(); onDragStart?.(item); },
        onDragOver:  e => { e.preventDefault(); e.stopPropagation(); onDragOver?.(e, item); },
        onDragLeave: e => e.stopPropagation(),
        onDrop:      e => { e.preventDefault(); e.stopPropagation(); onDrop?.(item); },
        onDragEnd:   e => { e.stopPropagation(); onDragEnd?.(); },
    };

    const sharedNodeProps = { draggingId, dragOverId, dragOverPosition, onDragStart, onDragOver, onDragEnd, onDrop };

    return (
        <div>
            {/* drop indicator — before */}
            {isOver && dragOverPosition === 'before' && (
                <div className="h-0.5 bg-orange-400 rounded mx-2 my-0.5" />
            )}

            <div
                {...dragProps}
                onClick={() => onSelect(item)}
                className={`group flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 pr-2 rounded-lg mx-1 cursor-pointer transition-all ${
                    isSelected
                        ? 'bg-orange-50 border border-orange-200 shadow-sm'
                        : 'border border-transparent hover:bg-slate-50'
                } ${!item.is_active ? 'opacity-40' : ''} ${isDragging ? 'opacity-30 scale-[0.98]' : ''}`}
                style={{ paddingLeft: `${6 + depth * 12}px` }}
            >
                {/* drag handle */}
                <GripVertical
                    size={10}
                    className="shrink-0 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing"
                />

                {/* expand / collapse — groups with children only */}
                {isGroup && hasChildren ? (
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
                        className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-600"
                    >
                        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </button>
                ) : (
                    <span className="w-3 sm:w-4 shrink-0" />
                )}

                {/* icon from DB only — nothing if null */}
                {ItemIcon
                    ? <ItemIcon size={11} className={`shrink-0 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`} />
                    : <span className="w-[11px] shrink-0" />
                }

                {sequenceLabels[item.id] && (
                    <span className="text-[9px] font-mono text-slate-400 shrink-0 tabular-nums">
                        {sequenceLabels[item.id]}
                    </span>
                )}
                <span className={`flex-1 min-w-0 text-xs sm:text-sm truncate ${
                    isSelected ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'
                }`}>
                    {item.title}
                </span>

                {!item.is_active && (
                    <span className="text-[9px] sm:text-[10px] text-slate-400 shrink-0">off</span>
                )}

                {isGroup && (
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onAdd(item); }}
                        title={`Add child under ${item.title}`}
                        className="opacity-0 group-hover:opacity-100 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all shrink-0"
                    >
                        <Plus size={9} />
                    </button>
                )}
            </div>

            {/* drop indicator — after */}
            {isOver && dragOverPosition === 'after' && (
                <div className="h-0.5 bg-orange-400 rounded mx-2 my-0.5" />
            )}

            {expanded && hasChildren && sortedChildren.map(child => (
                <SidebarTreeNode
                    key={child.id}
                    item={child}
                    depth={depth + 1}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    sequenceLabels={sequenceLabels}
                    {...sharedNodeProps}
                />
            ))}
        </div>
    );
};

/* ─── Main page ─── */
const InsightsDashboardManager = () => {
    const dispatch  = useDispatch();
    const menuList  = useSelector(state => state.insightsEngine.dashboardList);

    const [selectedId,    setSelectedId]    = useState(null);
    const [mode,          setMode]          = useState(null); // 'edit' | 'add'
    const [addingUnder,   setAddingUnder]   = useState(null);
    const [previewOpen,   setPreviewOpen]   = useState(false);

    const [draggingItem,     setDraggingItem]     = useState(null);
    const [dragOverId,       setDragOverId]       = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null); // 'before' | 'after'

    useEffect(() => {
        dispatch(InsightsEngineActions.getDashboardList({ includeInactive: true }));
    }, []);

    const refresh = () => dispatch(InsightsEngineActions.getDashboardList({ includeInactive: true }));

    const insightsRoot = useMemo(() => {
        return buildInsightsRootTree(menuList, { includeInactive: true });
    }, [menuList]);

    const allFlat = useMemo(
        () => insightsRoot ? flattenTree([insightsRoot]) : [],
        [insightsRoot]
    );

    const sequenceLabels = useMemo(() => {
        if (!insightsRoot) return {};
        const rootLabel = String(insightsRoot.sequence ?? '?');
        return {
            [insightsRoot.id]: rootLabel,
            ...computeSequenceLabels(insightsRoot.children, rootLabel),
        };
    }, [insightsRoot]);

    const selectedItem = useMemo(
        () => (selectedId ? allFlat.find(i => i.id === selectedId) : null),
        [selectedId, allFlat]
    );

    const handleSelect = (item) => {
        setSelectedId(item.id);
        setMode('edit');
        setAddingUnder(null);
        setPreviewOpen(false);
    };

    const handleAdd = (parentItem) => {
        setSelectedId(null);
        setMode('add');
        setAddingUnder(parentItem);
        setPreviewOpen(false);
    };

    const handleSave = (payload, id) => {
        dispatch(InsightsEngineActions.saveDashboard(payload, id, () => {
            refresh();
            setMode(null);
            setSelectedId(null);
            setAddingUnder(null);
        }));
    };

    const handleActivate = (item) => {
        const { children, _depth, create_time, update_time, ...rest } = item;
        dispatch(InsightsEngineActions.saveDashboard({ ...rest, allow_role: item?.allow_role ?? 'Both', is_active: true }, item.id, () => {
            refresh();
            setMode(null);
            setSelectedId(null);
        }));
    };

    const handleDeactivate = (item) => {
        const { children, _depth, create_time, update_time, ...rest } = item;
        dispatch(InsightsEngineActions.saveDashboard({ ...rest, allow_role: item?.allow_role ?? 'Both', is_active: false }, item.id, () => {
            refresh();
            setMode(null);
            setSelectedId(null);
        }));
    };

    const handleDelete = (item) => {
        dispatch(InsightsEngineActions.deleteDashboard(item.id, () => {
            refresh();
            setMode(null);
            setSelectedId(null);
        }));
    };

    const handleCancel = () => {
        setMode(null);
        setSelectedId(null);
        setAddingUnder(null);
    };

    const clearDrag = () => {
        setDraggingItem(null);
        setDragOverId(null);
        setDragOverPosition(null);
    };

    const handleDragStart = (item) => setDraggingItem(item);

    const handleDragOver = (e, item) => {
        if (!draggingItem || draggingItem.id === item.id) return;
        if (draggingItem.parent_id !== item.parent_id) return; // siblings only
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOverId(item.id);
        setDragOverPosition(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
    };

    const handleDrop = (targetItem) => {
        if (!draggingItem || draggingItem.id === targetItem.id) return;
        if (draggingItem.parent_id !== targetItem.parent_id) { clearDrag(); return; }

        const siblings = allFlat
            .filter(i => i.parent_id === draggingItem.parent_id)
            .sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));

        const dragged = siblings.find(i => i.id === draggingItem.id);
        const rest    = siblings.filter(i => i.id !== draggingItem.id);
        const targetIdx = rest.findIndex(i => i.id === targetItem.id);
        const insertAt  = dragOverPosition === 'before' ? targetIdx : targetIdx + 1;
        const newOrder  = [...rest.slice(0, insertAt), dragged, ...rest.slice(insertAt)];

        const toSave = newOrder
            .map((item, idx) => ({ item, seq: idx + 1 }))
            .filter(({ item, seq }) => item.sequence !== seq);

        toSave.forEach(({ item, seq }, i) => {
            const { children, _depth, create_time, update_time, ...payload } = item;
            dispatch(InsightsEngineActions.saveDashboard(
                { ...payload, sequence: seq },
                item.id,
                i === toSave.length - 1 ? refresh : undefined,
            ));
        });

        clearDrag();
    };

    return (
        <div className="flex flex-col p-4 gap-4 lg:p-5 lg:h-[calc(100vh-4rem)] lg:overflow-hidden" style={{ background: '#ffffff' }}>

            {/* Header */}
            <div className="flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div
                        className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                        style={{ background: '#0b1830' }}
                    >
                        <BarChart2 size={16} color="white" strokeWidth={1.8} className="sm:hidden" />
                        <BarChart2 size={20} color="white" strokeWidth={1.8} className="hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-base lg:text-xl font-bold text-slate-800 leading-tight truncate">
                            Insights Engine Dashboard Manager
                        </h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide hidden sm:block">
                            Configure the Insights Engine sidebar navigation
                        </p>
                    </div>
                </div>
                <Button onClick={() => handleAdd(null)} variant="primary" className="shrink-0 text-xs sm:text-sm px-2 sm:px-4">
                    <span className="hidden sm:inline">+ Add Item</span>
                    <span className="sm:hidden">+ Add</span>
                </Button>
            </div>

            {/* Two-panel layout */}
            <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 gap-4">

                {/* Left: sidebar preview */}
                <div className="w-full lg:w-72 lg:shrink-0 flex flex-col border border-slate-200 rounded-xl bg-white overflow-hidden lg:max-h-none">
                    <button
                        type="button"
                        onClick={() => setPreviewOpen(p => !p)}
                        className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-100 shrink-0 flex items-center justify-between w-full lg:cursor-default"
                    >
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Sidebar Preview
                        </span>
                        <ChevronDown
                            size={12}
                            className={`text-slate-400 transition-transform duration-200 lg:hidden ${previewOpen ? 'rotate-180' : ''}`}
                        />
                    </button>
                    <div className={`flex-1 overflow-y-auto py-2 ${previewOpen ? 'block' : 'hidden'} lg:block`}>
                        {!insightsRoot ? (
                            <div className="flex items-center justify-center h-20 text-xs text-slate-400">
                                Loading…
                            </div>
                        ) : (
                            <SidebarTreeNode
                                item={insightsRoot}
                                depth={0}
                                selectedId={selectedId}
                                onSelect={handleSelect}
                                onAdd={handleAdd}
                                sequenceLabels={sequenceLabels}
                                draggingId={draggingItem?.id}
                                dragOverId={dragOverId}
                                dragOverPosition={dragOverPosition}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={clearDrag}
                                onDrop={handleDrop}
                            />
                        )}
                    </div>
                </div>

                {/* Right: edit / add panel */}
                <div className="lg:flex-1 border border-slate-200 rounded-xl bg-white overflow-hidden min-h-[480px] lg:min-h-0">
                    <EditPanel
                        mode={mode}
                        item={selectedItem}
                        parentItem={addingUnder}
                        insightsRoot={insightsRoot}
                        allFlat={allFlat}
                        onSave={handleSave}
                        onActivate={handleActivate}
                        onDeactivate={handleDeactivate}
                        onDelete={handleDelete}
                        onCancel={handleCancel}
                        seqLabel={selectedItem ? (sequenceLabels[selectedItem.id] ?? null) : null}
                    />
                </div>
            </div>
        </div>
    );
};

export default InsightsDashboardManager;
