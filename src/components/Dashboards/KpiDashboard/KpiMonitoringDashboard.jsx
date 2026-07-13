import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import TrendMiniChart from './TrendMiniChart';
import KpiEngineActions from '../../../store/actions/kpiEngine-actions';
import { objectToQueryString } from '../../../utils/commonFunnction';
import { useTheme } from '../../../context/ThemeContext';
import DashboardCanvasEditor from '../DashboardCanvasEditor';
import { KPI_DASHBOARD_LAYOUT, KPI_DASHBOARD_WIDGETS } from './kpiDashboardPreset';

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// Bump the trailing version whenever KPI_DASHBOARD_LAYOUT's default sizes change —
// otherwise a stale saved layout silently overrides every future preset tweak.
const KPI_LAYOUT_STORAGE_KEY = 'dy3-kpi-dashboard-grid-layout-v10';

// Default palette matches the reference snapshot; all overridable via the "Customize colors" panel.
// Eyedropped directly from public/Dashboard.png: darkFrom = top-left corner sample,
// darkTo = bottom-right corner sample. (5G Payload's bottom-right and all of DL
// Throughput weren't cleanly sampled yet — those are still best-effort estimates.)
// rna/payload/ul are the 3-hue cycle stat cards repeat through (6 cards ÷ 3 colors) — see
// `cycle` in mapLiveDataToKpi below. There is no 4th slot in active use; the old "dl" entry
// was dead (never referenced by any card/sparkline) and has been removed.
const DEFAULT_KPI_COLORS = {
  rna: { tint: '#72b0df', darkFrom: '#2a415b', darkTo: '#1c253a' },
  payload: { tint: '#dfd484', darkFrom: '#6a5736', darkTo: '#332a1a' },
  ul: { tint: '#95f7d0', darkFrom: '#213a41', darkTo: '#212539' },
  gauge: '#95f7d0',
  trend: '#72b0df',
  statusOk: '#34d399',
  statusWarn: '#f5c542',
  statusCrit: '#f2b155',
};

// Title text style for card titles (sparkline titles, gauge title, "Top Degraded Cells" h3).
// colorEnabled=false leaves each element's own light/dark default color untouched.
const DEFAULT_TITLE_STYLE = { colorEnabled: false, color: '#8b93a7', bold: true, size: 12 };
const DEFAULT_TABLE_TITLE_STYLE = { colorEnabled: false, color: '#8b93a7', bold: true, size: 14 };
const DEFAULT_ROW_TEXT_STYLE = { colorEnabled: false, color: '#eef1f6', bold: false, size: 14 };

const KPI_COLOR_LABELS = {
  rna: 'Availability / Data SR', payload: 'Data Volume / Voice DR', ul: 'Voice Traffic / Voice SR',
  gauge: 'Availability gauge', trend: 'Table trend line',
  statusOk: 'Status: OK', statusWarn: 'Status: Warning', statusCrit: 'Status: Critical',
};

// Fallback filter options shown only until the first unfiltered API response arrives
// (see dynamicFilterOptions below, which then takes over with real distinct values).
const FILTER_OPTIONS = {
  technology: ['2G', '3G', '4G', '5G'],
  region: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba'],
  siteName: ['TN20232_4G_BULI_TC', 'TN20455_5G_KAWALE', 'TN18820_4G_NDIRANDE'],
  cellName: ['4G_BULI_TC_L1800_2', '5G_KAWALE_N78_1', '4G_NDIRANDE_L2600_1'],
};

const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60_000, label: '1 min' },
  { value: 300_000, label: '5 min' },
  { value: 900_000, label: '15 min' },
];

function formatUpdatedAt(date) {
  if (!date) return '—';
  return date.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
}

/**
 * Maps /kpi-engine/live-monitoring rows to this dashboard's widget shapes.
 * The API's fields (network_availability, data_trafficin_mb, voice_traffic,
 * voice_drop_call_rate, voice_setup_success_rate, data_setup_success_rate)
 * don't line up 1:1 with the earlier mock metrics (RNA/5G Payload/DL-UL
 * Throughput), so labels here reflect the real fields rather than forcing
 * a mismatched mapping — first-pass, open to revision.
 */
function mapLiveDataToKpi(rawRows, colors) {
  const rows = Array.isArray(rawRows) ? rawRows.filter((r) => r && typeof r === 'object') : [];
  // No early return on empty rows — every field below already falls back to '—'/0/[]
  // via `pct`/`num`/array ops on an empty `latest`, so the dashboard's widgets/layout
  // still render (with empty values) instead of vanishing entirely when data is missing.
  const latest = rows[0] || {};
  const pct = (v) => (v === undefined || v === null || v === '' ? '—' : `${Number(v).toFixed(1)}%`);
  const num = (v, unit = '') => (v === undefined || v === null || v === '' ? '—' : `${Number(v).toFixed(1)}${unit}`);
  const series = (field) =>
    rows.slice(0, 24).slice().reverse().map((r, i) => ({
      label: r.starttime ? String(r.starttime).slice(11, 16) : String(i),
      value: Number(r[field] ?? 0),
    }));

  return {
    gaugeValue: Math.round(Number(latest.network_availability ?? 0)),
    gauge: { value: Math.round(Number(latest.network_availability ?? 0)), color: colors.gauge },
    stats: (() => {
      const cycle = [colors.rna, colors.payload, colors.ul]; // blue, yellow/gold, green — repeats cyclically
      const raw = [
        { label: 'Availability', fullName: 'Radio Network Availability', value: pct(latest.network_availability), deltaUp: true, icon: <i className="fas fa-shield-halved" /> },
        { label: 'Data Volume', fullName: 'Downlink Data Volume', value: num(latest.data_trafficin_mb, ' MB'), deltaUp: true, icon: <i className="fas fa-database" /> },
        { label: 'Voice Traffic', fullName: 'Voice Traffic (Erlangs)', value: num(latest.voice_traffic), deltaUp: true, icon: <i className="fas fa-phone-volume" /> },
        { label: 'Data SR', fullName: 'Packet Data Setup Success Rate', value: pct(latest.data_setup_success_rate), deltaUp: true, icon: <i className="fas fa-circle-check" /> },
        { label: 'Voice DR', fullName: 'Call Drop Rate', value: pct(latest.voice_drop_call_rate), deltaUp: false, icon: <i className="fas fa-phone-slash" /> },
        { label: 'Voice SR', fullName: 'Call Setup Success Rate', value: pct(latest.voice_setup_success_rate), deltaUp: true, icon: <i className="fas fa-phone" /> },
      ];
      return raw.map((s, i) => {
        const c = cycle[i % cycle.length];
        return { ...s, delta: '', color: c.tint, darkGradient: [c.darkFrom, c.darkTo] };
      });
    })(),
    // Ordered to match `stats` (minus Availability, which is the gauge): Data Volume, Voice
    // Traffic, Data SR, Voice DR, Voice SR — so each chart sits directly under its stat card.
    sparklines: [
      { title: 'Data Volume (MB)', unit: '', color: colors.payload.tint, data: series('data_trafficin_mb') },
      { title: 'Voice Traffic', unit: '', color: colors.payload.tint, data: series('voice_traffic') },
      { title: 'Data SR (%)', unit: '%', color: colors.rna.tint, data: series('data_setup_success_rate') },
      { title: 'Voice DR (%)', unit: '%', color: colors.ul.tint, data: series('voice_drop_call_rate') },
      { title: 'Voice SR (%)', unit: '%', color: colors.rna.tint, data: series('voice_setup_success_rate') },
    ],
    // `field` drives the per-row trend sparkline in the KPI table (real history, not random).
    kpiRows: [
      { name: 'Availability', fullName: 'Radio Network Availability', field: 'network_availability', value: pct(latest.network_availability), criteria: '> 99%', status: Number(latest.network_availability) >= 99 ? 'ok' : Number(latest.network_availability) >= 95 ? 'warn' : 'crit', icon: <i className="fas fa-shield-halved" /> },
      { name: 'Voice DR', fullName: 'Call Drop Rate', field: 'voice_drop_call_rate', value: pct(latest.voice_drop_call_rate), criteria: '< 2%', status: Number(latest.voice_drop_call_rate) <= 2 ? 'ok' : 'crit', icon: <i className="fas fa-phone-slash" /> },
      { name: 'Voice SR', fullName: 'Call Setup Success Rate', field: 'voice_setup_success_rate', value: pct(latest.voice_setup_success_rate), criteria: '> 98%', status: Number(latest.voice_setup_success_rate) >= 98 ? 'ok' : 'warn', icon: <i className="fas fa-phone" /> },
      { name: 'Data SR', fullName: 'Packet Data Setup Success Rate', field: 'data_setup_success_rate', value: pct(latest.data_setup_success_rate), criteria: '> 98%', status: Number(latest.data_setup_success_rate) >= 98 ? 'ok' : 'warn', icon: <i className="fas fa-circle-check" /> },
      { name: 'Data Volume', fullName: 'Downlink Data Volume (MB)', field: 'data_trafficin_mb', value: num(latest.data_trafficin_mb), criteria: '—', status: 'ok', icon: <i className="fas fa-database" /> },
      { name: 'Voice Traffic', fullName: 'Voice Traffic (Erlangs)', field: 'voice_traffic', value: num(latest.voice_traffic), criteria: '—', status: 'ok', icon: <i className="fas fa-phone-volume" /> },
    ],
    trendSeries: (field) => series(field).map((d) => d.value),
    trendPoints: (field) => series(field),
    degradedCells: rows
      .filter((r) => r.latitude != null && r.longitude != null && r.latitude !== '' && r.longitude !== '')
      .slice()
      .sort((a, b) => Number(a.network_availability ?? 100) - Number(b.network_availability ?? 100))
      .slice(0, 15)
      .map((r) => ({
        cellId: r.cell_name || String(r.did ?? '—'),
        kpi: 'Availability',
        delta: pct(r.network_availability),
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      })),
  };
}

/**
 * Standalone ECharts KPI dashboard, extracted so it can be listed and opened
 * from the Dashboard Builder rather than living inline on any one page.
 */
export default function KpiMonitoringDashboard({ embedded = false, showControls = true }) {
  const dispatch = useDispatch();
  const liveRows = useSelector((s) => s.kpiEngine.liveMonitoring);
  const loading = useSelector((s) => s.kpiEngine.liveMonitoringLoading);
  const fetchError = useSelector((s) => s.kpiEngine.liveMonitoringError);

  // themeOverride: null = follow app-wide theme; 'light'/'dark' = pin this dashboard regardless of the app toggle.
  const { theme: appTheme } = useTheme();
  const [themeOverride, setThemeOverride] = useState(null);
  const effectiveDark = themeOverride ? themeOverride === 'dark' : appTheme === 'dark';

  const [kpiColors, setKpiColors] = useState(DEFAULT_KPI_COLORS);
  const [titleStyle, setTitleStyle] = useState(DEFAULT_TITLE_STYLE);
  const [tableTitleStyle, setTableTitleStyle] = useState(DEFAULT_TABLE_TITLE_STYLE);
  const [rowTextStyle, setRowTextStyle] = useState(DEFAULT_ROW_TEXT_STYLE);
  // GaugeCard/SparklineCard render their titles with an inline color style, which beats
  // the CSS class — so the override has to be handed to them directly, not just via CSS var.
  const chartTitleColor = titleStyle.colorEnabled ? titleStyle.color : null;
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [layoutEditable, setLayoutEditable] = useState(false);
  // Widget positions/sizes persist locally per browser so a resize/drag survives reloads
  // without needing a backend — falls back to the shipped default arrangement otherwise.
  const [gridLayout, setGridLayout] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KPI_LAYOUT_STORAGE_KEY));
      return Array.isArray(saved) && saved.length ? saved : KPI_DASHBOARD_LAYOUT;
    } catch (_) {
      return KPI_DASHBOARD_LAYOUT;
    }
  });
  const saveGridLayout = (next) => {
    setGridLayout(next);
    try {
      localStorage.setItem(KPI_LAYOUT_STORAGE_KEY, JSON.stringify(next));
    } catch (_) {
      /* ignore */
    }
  };
  // Bumped on reset so the DashboardCanvasEditor key changes and it remounts with the
  // restored default layout — its own internal layout state only reads initialLayout once.
  const [layoutResetTick, setLayoutResetTick] = useState(0);
  const resetGridLayout = () => {
    setGridLayout(KPI_DASHBOARD_LAYOUT);
    try {
      localStorage.removeItem(KPI_LAYOUT_STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    setLayoutResetTick((t) => t + 1);
  };
  const [filters, setFilters] = useState({ technology: '', region: '', siteName: '', cellName: '' });
  const [refreshRate, setRefreshRate] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Snapshot of the most recent *unfiltered* fetch — used to populate the filter
  // dropdowns with real distinct values without the options shrinking as filters narrow liveRows.
  const [baseRows, setBaseRows] = useState([]);

  const noFiltersActive = !filters.technology && !filters.region && !filters.siteName && !filters.cellName;
  useEffect(() => {
    if (noFiltersActive && Array.isArray(liveRows) && liveRows.length > 0) {
      setBaseRows(liveRows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRows, noFiltersActive]);

  const dynamicFilterOptions = useMemo(() => {
    if (!baseRows.length) return FILTER_OPTIONS;
    const distinct = (field) => Array.from(new Set(baseRows.map((r) => r[field]).filter(Boolean))).sort();
    return {
      technology: distinct('technology'),
      region: distinct('region'),
      siteName: distinct('site_name'),
      cellName: distinct('cell_name'),
    };
  }, [baseRows]);

  const fetchData = () => {
    const params = objectToQueryString({
      technology: filters.technology,
      region: filters.region,
      site_name: filters.siteName,
      cell_name: filters.cellName,
    });
    dispatch(KpiEngineActions.getLiveMonitoring(params));
    setLastUpdated(new Date());
  };

  // Initial load + whenever filters change (preserves selections, only refetches).
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!refreshRate) return undefined;
    const id = setInterval(fetchData, refreshRate);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshRate, filters]);

  const kpi = useMemo(() => mapLiveDataToKpi(liveRows, kpiColors), [liveRows, kpiColors]);

  // kpiTable's trend column and status colors need live state (theme, color panel) that
  // mapLiveDataToKpi doesn't have access to — folded in here for the `kpiLive` widget path.
  const kpiLiveData = useMemo(() => {
    if (!kpi) return null;
    return {
      ...kpi,
      kpiTableProps: {
        rows: kpi.kpiRows,
        statusColors: { ok: kpiColors.statusOk, warn: kpiColors.statusWarn, crit: kpiColors.statusCrit },
        trendRenderer: (row, statusColor) => (
          <TrendMiniChart data={kpi.trendPoints(row.field)} color={statusColor} isDark={effectiveDark} height={embedded ? 47 : 57} />
        ),
      },
    };
  }, [kpi, kpiColors, effectiveDark, embedded]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const setStatColor = (key, field, value) =>
    setKpiColors((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  const setFlatColor = (key, value) =>
    setKpiColors((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <style>{`
        .kpi-dashboard-root {
          --color-background-primary: #ffffff;
          --color-background-secondary: #f5f4f0;
          --color-background-tertiary: #eeece6;
          --color-text-primary: #1a1a18;
          --color-text-secondary: #5f5e5a;
          --color-border-tertiary: rgba(0,0,0,0.12);
          --color-border-secondary: rgba(0,0,0,0.22);
          --border-radius-md: 8px;
          --border-radius-lg: 12px;
          --font-sans: Aptos, "Aptos Display", "Segoe UI", system-ui, -apple-system, sans-serif;
          font-family: var(--font-sans);
        }
        .kpi-dashboard-root[data-kpi-theme="dark"] {
          --color-background-primary: #1e1e1c;
          --color-background-secondary: #2a2a27;
          --color-background-tertiary: #141412;
          --color-text-primary: #f0ede6;
          --color-text-secondary: #a8a69e;
          --color-border-tertiary: rgba(255,255,255,0.10);
          --color-border-secondary: rgba(255,255,255,0.20);
        }
        .kpi-dashboard-root .card {
          background:var(--color-background-primary);
          border:0.5px solid var(--color-border-tertiary);
          border-radius:var(--border-radius-lg);
          padding:1rem 1.1rem;
        }
        .kpi-dashboard-root .card h3 { font-size:var(--kpi-title-size, 0.875rem); font-weight:var(--kpi-title-weight, 700); color:var(--kpi-title-color, var(--color-text-primary)); margin-bottom:0.75rem; }

        .kpi-section {
          padding: 1.5rem; border-radius: var(--border-radius-lg);
          background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary);
          --kpi-bg: var(--color-background-primary);
          --kpi-card-bg: var(--color-background-secondary);
          --kpi-border: var(--color-border-tertiary);
          --kpi-text: var(--color-text-primary);
          --kpi-text-sub: var(--color-text-secondary);
          --kpi-up: #0F6E56; --kpi-down: #b8791e;
        }
        [data-kpi-theme="dark"] .kpi-section {
          --kpi-bg: #10131a; --kpi-card-bg: #10131a; --kpi-border: rgba(255,255,255,0.06);
          --kpi-text: #eef1f6; --kpi-text-sub: #8b93a7;
          --kpi-up: #34d399; --kpi-down: #f2b155;
          background: var(--kpi-bg); border-color: var(--kpi-border);
        }
        .kpi-section-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem; }
        .kpi-section-head h2 { font-size:1rem; font-weight:500; color:var(--kpi-text); }
        .kpi-section-head p { font-size:0.75rem; color:var(--kpi-text-sub); margin-top:0.125rem; }
        .kpi-customize-btn, .kpi-reset-btn {
          font-size:0.875rem; padding:0.375rem 0.75rem; border-radius:var(--border-radius-md);
          border:0.5px solid var(--kpi-border); background:var(--kpi-card-bg); color:var(--kpi-text); cursor:pointer;
        }
        [data-kpi-theme="dark"] .kpi-customize-btn { background:#22273C; }
        /* Highlighted while its panel/mode is actually open, so it's obvious at a glance
           which controls are currently active. */
        .kpi-customize-btn.active {
          background:#EC7D09; border-color:#EC7D09; color:#fff; font-weight:600;
        }
        .kpi-color-panel {
          background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md);
          padding:0.5rem 0.625rem; margin-bottom:0.875rem;
        }
        .kpi-color-sections { display:flex; flex-wrap:wrap; align-items:flex-start; gap:0.875rem; }
        .kpi-color-section { display:flex; flex-direction:column; }
        .kpi-color-section-title { font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--kpi-text-sub); margin-bottom:0.5rem; display:block; }
        [data-kpi-theme="dark"] .kpi-color-section-title { color:rgba(255,255,255,0.7); }
        .kpi-color-grid { display:flex; flex-wrap:wrap; align-items:stretch; gap:0.625rem; }
        .kpi-color-field { display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; color:var(--kpi-text-sub); font-weight:500; white-space:nowrap; }
        .kpi-color-field input[type="color"],
        .kpi-color-subfield input[type="color"] {
          width:1.5rem; height:1.125rem; border:none; outline:none; border-radius:0.25rem; padding:0; background:none; cursor:pointer;
          -webkit-appearance:none; appearance:none;
        }
        .kpi-color-field input[type="color"]::-webkit-color-swatch-wrapper,
        .kpi-color-subfield input[type="color"]::-webkit-color-swatch-wrapper { padding:0; }
        .kpi-color-field input[type="color"]::-webkit-color-swatch,
        .kpi-color-subfield input[type="color"]::-webkit-color-swatch { border:none; border-radius:0.25rem; }
        .kpi-color-field input[type="color"]::-moz-color-swatch,
        .kpi-color-subfield input[type="color"]::-moz-color-swatch { border:none; border-radius:0.25rem; }
        [data-kpi-theme="dark"] .kpi-color-field input[type="color"],
        [data-kpi-theme="dark"] .kpi-color-subfield input[type="color"] {
          border:1px solid rgba(255,255,255,0.55); background-color:var(--kpi-card-bg) !important;
        }
        /* Disabled color inputs (e.g. unchecked "Override color") often get their own
           native washed-out/white background regardless of the base rule above. */
        [data-kpi-theme="dark"] .kpi-color-field input[type="color"]:disabled,
        [data-kpi-theme="dark"] .kpi-color-subfield input[type="color"]:disabled {
          background-color:var(--kpi-card-bg) !important; opacity:0.5;
        }
        .kpi-color-field-group {
          display:flex; flex-direction:column; flex-wrap:wrap; align-items:flex-start;
          gap:0.375rem; column-gap:1.25rem; max-height:8rem;
          border:0.5px solid var(--kpi-border); border-radius:0.375rem; padding:0.5rem 0.625rem;
        }
        .kpi-color-subfield { display:flex; align-items:center; gap:0.375rem; font-size:0.6875rem; color:var(--kpi-text-sub); white-space:nowrap; }
        .kpi-color-field-flat { font-size:0.6875rem; font-weight:400; }
        .kpi-reset-btn-wrap { display:flex; align-items:center; margin-left:auto; }
        [data-kpi-theme="dark"] .kpi-color-field,
        [data-kpi-theme="dark"] .kpi-color-subfield { color:rgba(255,255,255,0.85); }
        .kpi-reset-btn {
          margin-left:auto; font-weight:600; background:#EC7D09; color:#fff; border:none;
          padding:0.5rem 0.875rem; box-shadow:0 1px 3px rgba(0,0,0,0.25);
          width:9.375rem; text-align:center;
        }
        .kpi-reset-btn:hover { opacity:0.9; }
        .kpi-filter-bar { display:flex; flex-wrap:wrap; align-items:center; gap:0.4375rem; margin-bottom:0.875rem; }
        .kpi-filter-bar select,
        .kpi-filter-meta select {
          -webkit-appearance:none; -moz-appearance:none; appearance:none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%238b93a7' stroke-width='1.5'%3E%3Cpath d='M5 7l5 5 5-5'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 0.5rem center; background-size:0.75rem;
          padding-right:1.5rem;
        }
        .kpi-filter-bar select {
          font-size:0.875rem; padding-top:0.375rem; padding-bottom:0.375rem; padding-left:0.625rem; border-radius:var(--border-radius-md);
          border:0.5px solid var(--kpi-border); background-color:var(--kpi-card-bg); color:var(--kpi-text); cursor:pointer;
          width:7.5rem; text-overflow:ellipsis; white-space:nowrap; overflow:hidden;
          color-scheme: light;
        }
        .kpi-filter-meta { display:flex; align-items:center; gap:0.625rem; margin-left:auto; font-size:0.8125rem; color:var(--kpi-text-sub); }
        .kpi-filter-meta select {
          font-size:0.8125rem; padding-top:0.25rem; padding-bottom:0.25rem; padding-left:0.5rem; border-radius:var(--border-radius-md);
          border:0.5px solid var(--kpi-border); background-color:var(--kpi-card-bg); color:var(--kpi-text); cursor:pointer;
          color-scheme: light;
        }
        [data-kpi-theme="dark"] .kpi-filter-bar select,
        [data-kpi-theme="dark"] .kpi-filter-meta select {
          color-scheme: dark !important;
          background-color:#22273C !important;
          color:#eef1f6 !important;
          border-color: rgba(255,255,255,0.14) !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%238b93a7' stroke-width='1.5'%3E%3Cpath d='M5 7l5 5 5-5'/%3E%3C/svg%3E");
        }
        /* Fixed px height, not tied to the grid's h/rowHeight snapping — the grid cell just
           needs to be tall enough to contain this without clipping (see kpiDashboardPreset.js). */
        /* height:100% + display:flex/justify-content:center: the card now actually follows
           the grid cell when you drag-resize this widget, and the label/value row stays
           auto-centered at whatever height results — no per-size padding tuning needed. */
        .kpi-stat-card {
          position:relative; height:100%; box-sizing:border-box; border-radius:var(--border-radius-md);
          padding:1.25rem 0.9rem; display:flex; flex-direction:column; justify-content:center;
        }
        .kpi-stat-row { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; min-width:0; }
        .kpi-stat-top { display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; line-height:1; color:var(--kpi-text-sub); min-width:0; flex:1 1 auto; }
        .kpi-stat-icon { font-size:1rem; line-height:1; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .kpi-stat-icon i, .kpi-stat-icon svg { display:block; }
        /* fa-shield-halved's glyph isn't drawn centered within its own em-box (a known FA
           quirk for shield/pin/bell icons) — scoped nudge, other stat-card icons are fine. */
        .kpi-stat-icon .fa-shield-halved { transform: translateY(1px); }
        .kpi-tooltip { position:relative; cursor:help; }
        .kpi-tooltip::after {
          content: attr(data-tooltip);
          position:absolute; top:100%; left:0; margin-top:0.375rem;
          background:#1c1f2e; color:#eef1f6; font-size:0.6875rem; font-weight:400;
          padding:0.375rem 0.625rem; border-radius:0.375rem; white-space:nowrap;
          box-shadow:0 0.125rem 0.5rem rgba(0,0,0,0.4); border:0.0312rem solid rgba(255,255,255,0.1);
          opacity:0; visibility:hidden; transform:translateY(-0.25rem);
          transition:opacity .12s ease, transform .12s ease; pointer-events:none; z-index:30;
        }
        .kpi-tooltip:hover::after { opacity:1; visibility:visible; transform:translateY(0); }
        .kpi-stat-label { font-size:1.2rem; line-height:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; min-width:0; }
        [data-kpi-theme="dark"] .kpi-stat-top { color:rgba(255,255,255,0.85); }
        .kpi-stat-value { display:flex; align-items:center; gap:0.3125rem; font-size:1.25rem; font-weight:600; color:var(--kpi-text); text-align:right; white-space:nowrap; flex-shrink:0; }
        .kpi-stat-delta { position:absolute; right:0.9rem; bottom:0.7rem; font-size:0.6875rem; }
        .kpi-stat-delta.up { color:var(--kpi-up); } .kpi-stat-delta.down { color:var(--kpi-down); }
        .kpi-spark-card { height:100%; box-sizing:border-box; display:flex; flex-direction:column; background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md); padding:0.625rem 0.75rem; }
        [data-kpi-theme="dark"] .kpi-spark-card { background:#22273C; }
        .kpi-spark-head { display:flex; justify-content:space-between; font-size:0.6875rem; margin-bottom:0.25rem; }
        .kpi-spark-title { font-size:var(--kpi-title-size, 0.75rem); font-weight:var(--kpi-title-weight, 700); color:var(--kpi-title-color, var(--kpi-text-sub)); }
        [data-kpi-theme="dark"] .kpi-spark-title { color:var(--kpi-title-color, rgba(255,255,255,0.85)); }
        .kpi-gauge-card { height:100%; box-sizing:border-box; background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md); padding:0.5rem 0.75rem; text-align:center; }
        [data-kpi-theme="dark"] .kpi-gauge-card { background:#22273C; }
        .kpi-gauge-title { font-size:var(--kpi-title-size, 0.75rem); font-weight:var(--kpi-title-weight, 700); margin-bottom:0.125rem; color:var(--kpi-title-color, var(--kpi-text-sub)); }
        [data-kpi-theme="dark"] .kpi-gauge-title { color:var(--kpi-title-color, rgba(255,255,255,0.85)); }
        .kpi-status-tbl tbody, .kpi-cells-tbl tbody { display:table-row-group; }
        /* Widget grid (react-grid-layout, via DashboardCanvasEditor) replaces the old hand-laid-out
           .kpi-stats-row/.kpi-spark-row/.kpi-row-last CSS grids — theme its generic widget chrome
           to match this dashboard's card look instead of DashboardCanvasEditor's own light-only default. */
        .kpi-grid-wrap { flex:1 1 auto; min-height:0; }
        /* react-grid-layout's default resize-handle corner marks are a dark, near-invisible
           rgba(0,0,0,0.4) — barely visible against this dashboard's dark cards. */
        .kpi-grid-wrap .react-resizable-handle::after {
          border-right-color: rgba(255,255,255,0.7);
          border-bottom-color: rgba(255,255,255,0.7);
        }
        .kpi-grid-wrap .dbe-canvas-wrap { border:none; padding:0; background:transparent; overflow:visible; }
        /* StatCard/GaugeCard/SparklineCard already paint their own card chrome
           (.kpi-stat-card/.kpi-gauge-card/.kpi-spark-card) — leave their wrapper bare so they
           don't get boxed twice. Only the two table widgets need the wrapper's own card look. */
        .kpi-grid-wrap .dbe-widget { background:transparent; border:none; padding:0; overflow:hidden; }
        .kpi-grid-wrap .dbe-widget-kpiTable,
        .kpi-grid-wrap .dbe-widget-degradedCellsTable {
          background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-lg);
          padding:1rem 1.1rem; overflow:auto;
        }
        [data-kpi-theme="dark"] .kpi-grid-wrap .dbe-widget-kpiTable,
        [data-kpi-theme="dark"] .kpi-grid-wrap .dbe-widget-degradedCellsTable { background:#22273C; }
        /* Scrollbar stays invisible until hover, so the card doesn't look permanently
           "scrollable" at rest — same content, just quieter chrome. Applies to every
           scrollable table card (KPI table + Top Degraded Cells), not just one. */
        .kpi-grid-wrap .dbe-widget-degradedCellsTable,
        .kpi-grid-wrap .dbe-widget-kpiTable { scrollbar-width: none; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable::-webkit-scrollbar,
        .kpi-grid-wrap .dbe-widget-kpiTable::-webkit-scrollbar { width: 0; height: 0; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable:hover,
        .kpi-grid-wrap .dbe-widget-kpiTable:hover { scrollbar-width: thin; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable:hover::-webkit-scrollbar,
        .kpi-grid-wrap .dbe-widget-kpiTable:hover::-webkit-scrollbar { width: 6px; height: 6px; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable:hover::-webkit-scrollbar-thumb,
        .kpi-grid-wrap .dbe-widget-kpiTable:hover::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.25); border-radius: 3px;
        }
        .kpi-grid-wrap .dbe-widget-degradedCellsMap {
          background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-lg);
          padding:0; overflow:hidden;
        }
        [data-kpi-theme="dark"] .kpi-grid-wrap .dbe-widget-degradedCellsMap { background:#22273C; }
        .kpi-grid-wrap .dbe-widget .kpi-table-wrap { height:100%; display:flex; flex-direction:column; }
        .kpi-grid-wrap .dbe-widget .kpi-status-tbl { flex:1; }
        .kpi-table-wrap { position:relative; }
        .kpi-card-header {
          position:relative; display:flex; align-items:center;
          color:var(--kpi-table-title-color, var(--kpi-text)); margin:-1rem -1.1rem 0.75rem; padding:0.5rem 1.1rem;
          border-top-left-radius:var(--border-radius-lg); border-top-right-radius:var(--border-radius-lg);
          font-weight:var(--kpi-table-title-weight, 600); font-size:var(--kpi-table-title-size, 0.875rem);
        }
        [data-kpi-theme="dark"] .kpi-card-header { background:#282E41; }
        .kpi-header-col { color:var(--kpi-table-title-color, var(--kpi-text-sub)); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .kpi-header-col-1 { width:22%; padding-left:1.4rem; }
        .kpi-header-col-2 { width:18%; padding-left:1.8rem; }
        .kpi-header-col-3 { width:16%; padding-left:2.2rem; }
        .kpi-header-col-4 { width:40%; padding-left:2.2rem; }
        .kpi-table-legend {
          margin-left:auto; display:flex; gap:0.625rem;
          white-space:nowrap; font-size:0.625rem; flex-shrink:0;
        }
        .kpi-legend-item { display:flex; align-items:center; gap:0.25rem; font-size:0.625rem; font-weight:400; color:var(--kpi-text-sub); }
        .kpi-legend-dot { width:0.4375rem; height:0.4375rem; border-radius:50%; display:inline-block; margin-right:0.0625rem; flex-shrink:0; }
        .kpi-row-icon { display:inline-flex; align-items:center; margin-right:0.375rem; font-size:0.8125rem; }
        .kpi-status-tbl { border-collapse:collapse; font-size:0.875rem; width:100%; table-layout:fixed; }
        .kpi-cells-tbl { border-collapse:collapse; font-size:0.875rem; width:100%; }
        .kpi-cells-tbl th {
          text-align:left; color:var(--kpi-table-title-color, var(--kpi-text-sub));
          font-weight:var(--kpi-table-title-weight, 600); font-size:var(--kpi-table-title-size, 0.875rem);
          border-bottom:0.0312rem solid var(--kpi-border); overflow:hidden; text-overflow:ellipsis; padding:0.625rem 0.75rem;
        }
        .kpi-status-tbl td:nth-child(1) { width:22%; }
        .kpi-status-tbl td:nth-child(2) { width:16%; }
        .kpi-status-tbl td:nth-child(3) { width:14%; }
        .kpi-status-tbl td:nth-child(4) { width:48%; }
        .kpi-status-tbl td {
          padding:0.9rem 1.1rem; color:var(--kpi-row-color, var(--kpi-text));
          font-weight:var(--kpi-row-weight, 400); font-size:var(--kpi-row-size, inherit);
          border-bottom:0.0312rem solid var(--kpi-border); vertical-align:middle;
        }
        .kpi-cells-tbl td {
          padding:1rem 0.75rem; color:var(--kpi-row-color, var(--kpi-text));
          font-weight:var(--kpi-row-weight, 400); font-size:var(--kpi-row-size, inherit);
          border-bottom:0.0312rem solid var(--kpi-border); vertical-align:middle;
        }
        .kpi-status-tbl tr:last-child td, .kpi-cells-tbl tr:last-child td { border-bottom:none; }
        .kpi-cells-delta.up { color:var(--kpi-up); } .kpi-cells-delta.down { color:var(--kpi-down); }
        @media (max-width: 40rem) {
          .kpi-filter-bar select { font-size:0.6875rem; padding:0.3125rem 0.5rem; }
          .kpi-filter-meta { margin-left:0; flex-basis:100%; justify-content:space-between; }

          /* Fixed % column widths + table-layout:fixed choke at narrow widths (wrapped
             text, a squeezed sliver for the trend chart) — reflow each row into 2 stacked
             rows instead: name/value/criteria on top, trend sparkline full-width below. */
          .kpi-status-tbl,
          .kpi-embedded .kpi-status-tbl { table-layout:auto; font-size:0.75rem; }
          .kpi-status-tbl, .kpi-status-tbl tbody { display:block; width:100%; }
          .kpi-status-tbl tr {
            display:grid;
            grid-template-columns:auto auto 1fr;
            grid-template-areas:"name value criteria" "trend trend trend";
            column-gap:0.5rem; align-items:center; padding:0.5rem 0;
          }
          .kpi-status-tbl td,
          .kpi-embedded .kpi-status-tbl td { padding:0.125rem 0; border-bottom:none; }
          .kpi-status-tbl td:nth-child(1) { grid-area:name; width:auto; white-space:nowrap; }
          .kpi-status-tbl td:nth-child(2) { grid-area:value; width:auto; white-space:nowrap; }
          .kpi-status-tbl td:nth-child(3) { grid-area:criteria; width:auto; white-space:nowrap; justify-self:end; }
          .kpi-status-tbl td:nth-child(4) { grid-area:trend; width:100%; margin-top:0.25rem; }
          .kpi-status-tbl tr { border-bottom:0.0312rem solid var(--kpi-border); }
          .kpi-status-tbl tr:last-child { border-bottom:none; }

          /* Top Degraded Cells has no chart column — just needs room to breathe. */
          .kpi-cells-tbl,
          .kpi-embedded .kpi-cells-tbl { table-layout:auto; font-size:0.75rem; }
          .kpi-cells-tbl td { white-space:nowrap; }
        }

        .kpi-theme-toggle { display:flex; align-items:center; gap:0.125rem; border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md); padding:0.125rem; background:var(--kpi-card-bg); }
        [data-kpi-theme="dark"] .kpi-theme-toggle { background:#22273C; }
        .kpi-theme-toggle button {
          display:flex; align-items:center; justify-content:center; width:1.625rem; height:1.625rem;
          border:none; border-radius:0.375rem; background:transparent; color:var(--kpi-text-sub); cursor:pointer;
        }
        .kpi-theme-toggle button.active { background:var(--kpi-bg); color:var(--kpi-text); box-shadow:0 0 0 0.5px var(--kpi-border); }

        /* ─── Compact mode when rendered inside a modal (avoids page scroll) ── */
        .kpi-embedded .kpi-section { padding: 1rem; }
        .kpi-embedded .kpi-section-head { margin-bottom: 0.6rem; }
        .kpi-embedded .kpi-stat-card { padding: 1.25rem 0.9rem; }
        .kpi-embedded .kpi-stat-value { font-size: 1.0625rem; }
        .kpi-embedded .kpi-spark-card { padding: 0.375rem 0.625rem; }
        .kpi-embedded .kpi-gauge-card { padding: 0.25rem 0.5rem; }
        .kpi-embedded .kpi-status-tbl,
        .kpi-embedded .kpi-cells-tbl { font-size: 1rem; }
        .kpi-embedded .kpi-status-tbl th,
        .kpi-embedded .kpi-cells-tbl th { padding: 0.25rem 0.375rem; }
        .kpi-embedded .kpi-status-tbl td { padding: 0.75rem 1.1rem; }
        .kpi-embedded .kpi-cells-tbl td { padding: 0.2rem 0.75rem; }
      `}</style>

      <div
        className={`kpi-dashboard-root${embedded ? ' kpi-embedded' : ''}`}
        data-kpi-theme={effectiveDark ? 'dark' : 'light'}
        style={{
          '--kpi-title-weight': titleStyle.bold ? 700 : 500,
          '--kpi-title-size': `${titleStyle.size / 16}rem`,
          ...(titleStyle.colorEnabled ? { '--kpi-title-color': titleStyle.color } : {}),
          '--kpi-table-title-weight': tableTitleStyle.bold ? 700 : 500,
          '--kpi-table-title-size': `${tableTitleStyle.size / 16}rem`,
          ...(tableTitleStyle.colorEnabled ? { '--kpi-table-title-color': tableTitleStyle.color } : {}),
          '--kpi-row-weight': rowTextStyle.bold ? 700 : 400,
          '--kpi-row-size': `${rowTextStyle.size / 16}rem`,
          ...(rowTextStyle.colorEnabled ? { '--kpi-row-color': rowTextStyle.color } : {}),
        }}
      >
        <div className="kpi-section">
          {!embedded && (
            <div className="kpi-section-head">
              <div>
                <h2>5G KPI Monitoring Dashboard</h2>
                <p>Live — KPI Engine API</p>
              </div>
            </div>
          )}

          {showControls && (
            <div className="kpi-filter-bar">
              <div className="kpi-theme-toggle">
                <button
                  type="button"
                  title="Follow app theme"
                  className={themeOverride === null ? 'active' : ''}
                  onClick={() => setThemeOverride(null)}
                >
                  <MonitorSmartphone size={14} />
                </button>
                <button
                  type="button"
                  title="Light"
                  className={themeOverride === 'light' ? 'active' : ''}
                  onClick={() => setThemeOverride('light')}
                >
                  <Sun size={14} />
                </button>
                <button
                  type="button"
                  title="Dark"
                  className={themeOverride === 'dark' ? 'active' : ''}
                  onClick={() => setThemeOverride('dark')}
                >
                  <Moon size={14} />
                </button>
              </div>
              <button type="button" className={`kpi-customize-btn${showColorPanel ? ' active' : ''}`} onClick={() => setShowColorPanel((v) => !v)}>
                {showColorPanel ? 'Close colors' : 'Customize colors'}
              </button>
              <button type="button" className={`kpi-customize-btn${layoutEditable ? ' active' : ''}`} onClick={() => setLayoutEditable((v) => !v)}>
                {layoutEditable ? 'Done resizing' : 'Resize widgets'}
              </button>
              {layoutEditable && (
                <button type="button" className="kpi-customize-btn active" onClick={resetGridLayout}>
                  Reset layout
                </button>
              )}

              <select value={filters.technology} onChange={(e) => setFilter('technology', e.target.value)}>
                <option value="">All Technology</option>
                {dynamicFilterOptions.technology.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filters.region} onChange={(e) => setFilter('region', e.target.value)}>
                <option value="">All Regions</option>
                {dynamicFilterOptions.region.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={filters.siteName} onChange={(e) => setFilter('siteName', e.target.value)}>
                <option value="">All Sites</option>
                {dynamicFilterOptions.siteName.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filters.cellName} onChange={(e) => setFilter('cellName', e.target.value)}>
                <option value="">All Cells</option>
                {dynamicFilterOptions.cellName.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="kpi-filter-meta">
                <span>Refresh:</span>
                <select value={refreshRate} onChange={(e) => setRefreshRate(Number(e.target.value))}>
                  {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span>Updated: {formatUpdatedAt(lastUpdated)}</span>
              </div>
            </div>
          )}

          {showColorPanel && (
            <div className="kpi-color-panel">
              <div className="kpi-color-sections">
                <div className="kpi-color-section">
                  <div className="kpi-color-section-title">Shaded Cards</div>
                  <div className="kpi-color-grid">
                    {Object.entries(DEFAULT_KPI_COLORS)
                      .filter(([, val]) => typeof val !== 'string')
                      .map(([key]) => (
                        <div key={key} className="kpi-color-field-group">
                          <span className="kpi-color-field" style={{ fontWeight: 600 }}>{KPI_COLOR_LABELS[key] || key}</span>
                          <span className="kpi-color-subfield">
                            light <input type="color" value={kpiColors[key].tint} onChange={(e) => setStatColor(key, 'tint', e.target.value)} />
                          </span>
                          <span className="kpi-color-subfield">
                            dark from <input type="color" value={kpiColors[key].darkFrom} onChange={(e) => setStatColor(key, 'darkFrom', e.target.value)} />
                          </span>
                          <span className="kpi-color-subfield">
                            dark to <input type="color" value={kpiColors[key].darkTo} onChange={(e) => setStatColor(key, 'darkTo', e.target.value)} />
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="kpi-color-divider" />

                <div className="kpi-color-section">
                  <div className="kpi-color-section-title">Other Color Controls</div>
                  <div className="kpi-color-grid">
                    <div className="kpi-color-field-group">
                      {Object.entries(DEFAULT_KPI_COLORS)
                        .filter(([, val]) => typeof val === 'string')
                        .map(([key]) => (
                          <label key={key} className="kpi-color-field kpi-color-field-flat">
                            {KPI_COLOR_LABELS[key] || key}
                            <input type="color" value={kpiColors[key]} onChange={(e) => setFlatColor(key, e.target.value)} />
                          </label>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="kpi-color-divider" />

                <div className="kpi-color-section">
                  <div className="kpi-color-section-title">Chart Titles</div>
                  <div className="kpi-color-grid">
                    <div className="kpi-color-field-group">
                      <label className="kpi-color-field kpi-color-field-flat">
                        <input
                          type="checkbox"
                          checked={titleStyle.colorEnabled}
                          onChange={(e) => setTitleStyle((p) => ({ ...p, colorEnabled: e.target.checked }))}
                        />
                        Override color
                        <input
                          type="color"
                          value={titleStyle.color}
                          disabled={!titleStyle.colorEnabled}
                          onChange={(e) => setTitleStyle((p) => ({ ...p, color: e.target.value }))}
                        />
                      </label>
                      <label className="kpi-color-field kpi-color-field-flat">
                        <input
                          type="checkbox"
                          checked={titleStyle.bold}
                          onChange={(e) => setTitleStyle((p) => ({ ...p, bold: e.target.checked }))}
                        />
                        Bold
                      </label>
                      <label className="kpi-color-field kpi-color-field-flat">
                        Font size
                        <input
                          type="number"
                          min="9"
                          max="20"
                          value={titleStyle.size}
                          onChange={(e) => setTitleStyle((p) => ({ ...p, size: Number(e.target.value) || DEFAULT_TITLE_STYLE.size }))}
                          style={{ width: '3rem' }}
                        />
                        px
                      </label>
                    </div>
                  </div>
                </div>

                <div className="kpi-color-divider" />

                <div className="kpi-color-section">
                  <div className="kpi-color-section-title">Table Titles </div>
                  <div className="kpi-color-grid">
                    <div className="kpi-color-field-group">
                      <label className="kpi-color-field kpi-color-field-flat">
                        <input
                          type="checkbox"
                          checked={tableTitleStyle.colorEnabled}
                          onChange={(e) => setTableTitleStyle((p) => ({ ...p, colorEnabled: e.target.checked }))}
                        />
                        Override color
                        <input
                          type="color"
                          value={tableTitleStyle.color}
                          disabled={!tableTitleStyle.colorEnabled}
                          onChange={(e) => setTableTitleStyle((p) => ({ ...p, color: e.target.value }))}
                        />
                      </label>
                      <label className="kpi-color-field kpi-color-field-flat">
                        <input
                          type="checkbox"
                          checked={tableTitleStyle.bold}
                          onChange={(e) => setTableTitleStyle((p) => ({ ...p, bold: e.target.checked }))}
                        />
                        Bold
                      </label>
                      <label className="kpi-color-field kpi-color-field-flat">
                        Font size
                        <input
                          type="number"
                          min="9"
                          max="20"
                          value={tableTitleStyle.size}
                          onChange={(e) => setTableTitleStyle((p) => ({ ...p, size: Number(e.target.value) || DEFAULT_TABLE_TITLE_STYLE.size }))}
                          style={{ width: '3rem' }}
                        />
                        px
                      </label>
                    </div>
                  </div>
                </div>

                <div className="kpi-color-divider" />

                <div className="kpi-color-section">
                  <div className="kpi-color-section-title">Row Text(Table) </div>
                  <div className="kpi-color-grid">
                    <div className="kpi-color-field-group">
                      <label className="kpi-color-field kpi-color-field-flat">
                        <input
                          type="checkbox"
                          checked={rowTextStyle.colorEnabled}
                          onChange={(e) => setRowTextStyle((p) => ({ ...p, colorEnabled: e.target.checked }))}
                        />
                        Override color
                        <input
                          type="color"
                          value={rowTextStyle.color}
                          disabled={!rowTextStyle.colorEnabled}
                          onChange={(e) => setRowTextStyle((p) => ({ ...p, color: e.target.value }))}
                        />
                      </label>
                      <label className="kpi-color-field kpi-color-field-flat">
                        <input
                          type="checkbox"
                          checked={rowTextStyle.bold}
                          onChange={(e) => setRowTextStyle((p) => ({ ...p, bold: e.target.checked }))}
                        />
                        Bold
                      </label>
                      <label className="kpi-color-field kpi-color-field-flat">
                        Font size
                        <input
                          type="number"
                          min="9"
                          max="20"
                          value={rowTextStyle.size}
                          onChange={(e) => setRowTextStyle((p) => ({ ...p, size: Number(e.target.value) || DEFAULT_ROW_TEXT_STYLE.size }))}
                          style={{ width: '3rem' }}
                        />
                        px
                      </label>
                    </div>
                  </div>
                </div>

                <div className="kpi-reset-btn-wrap" style={{ flexDirection: 'column', gap: 8 }}>
                  <button type="button" className="kpi-reset-btn" onClick={() => { setKpiColors(DEFAULT_KPI_COLORS); setTitleStyle(DEFAULT_TITLE_STYLE); setTableTitleStyle(DEFAULT_TABLE_TITLE_STYLE); setRowTextStyle(DEFAULT_ROW_TEXT_STYLE); }}>Reset to default</button>
                  <button type="button" className="kpi-reset-btn" onClick={() => setShowColorPanel(false)}>Close colors</button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--kpi-text-sub)', fontSize: 13 }}>
              Loading live data…
            </div>
          )}

          {/* Error/no-data is a banner above the grid, not a replacement for it — widgets
              still render (with empty values, via mapLiveDataToKpi's '—'/0/[] fallbacks)
              so the dashboard's layout stays visible even when the server is unreachable. */}
          {!loading && (fetchError || !kpi) && (
            <div style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--kpi-text-sub)', fontSize: 13 }}>
              {fetchError ? `Error: ${fetchError}` : 'No Data Found'}
            </div>
          )}

          {!loading && (
            <div className="kpi-grid-wrap">
              <DashboardCanvasEditor
                key={`${layoutEditable}-${layoutResetTick}`}
                initialLayout={gridLayout}
                initialWidgets={KPI_DASHBOARD_WIDGETS}
                editable={layoutEditable}
                showChrome={false}
                onLayoutChange={saveGridLayout}
                kpiLiveData={kpiLiveData}
                isDark={effectiveDark}
                titleColor={chartTitleColor}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
