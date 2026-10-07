import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, LayoutGrid, ChevronLeft, ChevronRight, Trash2, Copy, Download, Database, FlaskConical, UploadCloud, Palette, PanelsTopLeft, Grid2x2, Search, Maximize2, X } from 'lucide-react';
import Button from '../components/Button';
import FormModal from '../components/FormModal';
import ConfirmModal from '../components/ConfirmModal';
import KpiMonitoringDashboard from '../components/DashboardBuilder/legacy/KpiDashboard/KpiMonitoringDashboard';
import DashboardCanvasEditor from '../components/DashboardBuilder/dashboard/DashboardCanvasEditor';
import EmbeddedDashboard from '../components/DashboardBuilder/dashboard/EmbeddedDashboard';
import DatasourceManager from '../components/DashboardBuilder/datasource/DatasourceManager';
import ThemeManager from '../components/DashboardBuilder/themes/ThemeManager';
import ChartLibrary from '../components/DashboardBuilder/charts/ChartLibrary';
import FilterPanel from '../components/DashboardBuilder/filters/FilterPanel';
import FiltersToggleButton from '../components/DashboardBuilder/filters/FiltersToggleButton';
import CustomTooltip from '../components/CustomTooltip';
import { notifyWidgetsChanged } from '../store/actions/widgetEvents';
import { buildLocalLayoutAndWidgets, LOCAL_PERSISTABLE_TYPES, TABS_SENTINEL_ID } from '../components/DashboardBuilder/dashboard/buildLocalLayoutAndWidgets';
import {
  createDashboard, updateDashboard, deleteDashboardBackend, cloneDashboardBackend,
  publishDashboard, attachWidget, detachWidget, listDashboards, getDashboardDetail, updateWidget,
  listWidgets, deleteWidget,
} from '../store/actions/dashboardBuilder-actions';

// Only read once, for the one-time migration of dashboards created before the backend
// became the source of truth for the browse list (see the migration effect below) — no
// longer written to going forward.
const LEGACY_STORAGE_KEY = 'dy3-dashboard-builder-layouts';

// Confirmed via a live POST /dashboards/{id}/data response — the field is `is_published`
// (a plain boolean), not `status`.
function isPublished(dashboard) {
  return dashboard?.is_published === true;
}

// Strips a trailing " (Copy)" (the old fixed suffix) or " (N)" (the new progressive one) so
// cloning an already-cloned dashboard suggests "A (2)" next, not "A (Copy) (Copy)" or "A (1)
// (1)" piling up — cloning "A (3)" again suggests "A (4)", not "A (3) (1)".
// Collapsed dashboards rail: up to 3 initials, one per word ("Telecom KPI Dashboard Main" -> "TKD");
// a single-word name falls back to its first two letters ("Overview" -> "OV").
function dashboardInitials(name) {
  const words = String(name || '').trim().split(/[\s_\-/]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

function baseDashboardName(name) {
  return (name || '').replace(/\s*\(Copy\)$/i, '').replace(/\s*\(\d+\)$/, '').trim();
}

// Lowest N such that "<baseName> (N)" isn't already taken among existingNames — avoids the
// confusing "two dashboards both named 'A (Copy)'" case the fixed suffix always produced past
// the first clone (per the conversation this was reported in).
function nextCopyName(baseName, existingNames) {
  let n = 1;
  while (existingNames.has(`${baseName} (${n})`)) n += 1;
  return `${baseName} (${n})`;
}

// Pairs each NEW widget (from a duplicate_widgets:true clone response) back to the ORIGINAL
// widget it was cloned from, matched on name/chart_type/datasource_id — the only signal
// available, since new widgets still carry these unchanged at the moment this runs (before any
// renaming). Computed once and shared by both remapClonedLayoutForNewWidgets and the rename
// step in cloneDashboard, so the two can never disagree about which original a given new widget
// maps to (a real risk if each ran its own independent same-key matching pass, especially when
// several widgets share an identical name+type+datasource).
function pairClonedWidgetsWithOriginal(originalDashboard, newWidgets) {
  const keyFor = (title, chartType, datasourceId) => `${title}|${chartType || ''}|${datasourceId || ''}`;
  // Grouped into arrays (not a single entry per key) so two ORIGINALLY-identical widgets
  // (same name/type/datasource) each still get their own distinct pairing instead of both
  // collapsing onto one — paired off in encounter order against their same-key new copies.
  const originalByKey = new Map();
  (originalDashboard.layout || []).forEach((l) => {
    const w = originalDashboard.widgets?.[l.i];
    if (!w || w.dataSource?.type !== 'chartLibrary') return;
    const key = keyFor(w.title, w.dataSource.chartType, w.dataSource.datasourceId);
    if (!originalByKey.has(key)) originalByKey.set(key, []);
    originalByKey.get(key).push(l);
  });
  const pairs = [];
  (newWidgets || []).forEach((w) => {
    const key = keyFor(w.name, w.chart_type, w.datasource_id);
    const original = originalByKey.get(key)?.shift();
    // No match found (name/type/datasource drifted somehow, or more new widgets than
    // originals) — that one widget just keeps today's degraded layout behavior (position via
    // w.position, no tabId) and its auto-generated rename, rather than this whole pass
    // silently failing for everything.
    if (original) pairs.push({ original, widget: w });
  });
  return pairs;
}

// Fixes a real backend gap: with duplicate_widgets:true, the clone endpoint copies
// `dashboard.layout` wholesale (position/tabId/style all correct) AND creates brand-new
// widget copies with new ids — but doesn't rewrite the layout's `i: "w_<oldId>"` keys onto
// those new ids. Confirmed live: a cloned dashboard's `layout` entries still reference the
// ORIGINAL widget ids, which don't exist on the new dashboard at all, so
// buildLocalLayoutAndWidgets' own `w_${w.id}` lookup misses for every widget — position still
// mostly survives via its own `w.position` fallback, but tabId has no such fallback, so every
// duplicated widget silently lands on the default tab instead of its original one (see the
// conversation this was diagnosed in, with a live network capture proving the id mismatch).
// Fixed here rather than waiting on a backend fix — rewrites `i` to the new widget's id and
// keeps everything else (position/tabId/style) exactly as the backend already cloned it.
function remapClonedLayoutForNewWidgets(originalDashboard, clonedLayout, pairs) {
  const remapped = pairs.map(({ original, widget }) => ({ ...original, i: `w_${widget.id}` }));
  // Text Box/Shape/Slicer/the tabs-sentinel entries were never part of the id-mismatch (they
  // aren't in `attachedWidgets` at all — their own `i` is self-contained, not a widget
  // reference) — carried through from the backend's response unchanged.
  const passthrough = (clonedLayout || []).filter((l) => {
    const isRealWidgetEntry = /^w_/.test(l.i) && originalDashboard.widgets?.[l.i]?.dataSource?.type === 'chartLibrary';
    return !isRealWidgetEntry;
  });
  return [...remapped, ...passthrough];
}

const STATIC_DASHBOARDS = [
  {
    id: 'kpi-monitoring',
    name: '5G KPI Monitoring Dashboard',
    description: 'RNA, throughput, payload, and top degraded cells — ECharts prototype.',
    static: true,
    render: () => <KpiMonitoringDashboard embedded />,
  },
];

function loadLegacyLocalDashboards() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function clearLegacyLocalDashboards() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}

// Builds a full local dashboard record from a backend response — shared by the initial
// detail hydration, handleSave's create/update, and cloneDashboard, so there's one place
// that knows how a backend dashboard+attached-widgets response maps to our local shape.
function buildRecordFromBackend(dashboard, attachedWidgets = [], prevRecord = null) {
  const { widgets, layout, tabs } = buildLocalLayoutAndWidgets(attachedWidgets, dashboard.layout);
  return {
    id: String(dashboard.id),
    backendId: dashboard.id,
    name: dashboard.name,
    layout,
    widgets,
    tabs,
    globalFilters: dashboard.global_filters || [],
    // DashboardCanvasEditor.jsx re-fetches these directly via getDashboardData(backendId) on
    // its own mount, so this local copy currently isn't read anywhere for the editor view —
    // but this function's whole purpose is being the one place a backend response maps to
    // our local shape, so leaving them out here would be a real gap the moment anything else
    // (e.g. a dashboard-list thumbnail) ever reads theme straight off the local record.
    theme: dashboard.theme && typeof dashboard.theme === 'object' ? dashboard.theme : null,
    themeId: dashboard.theme_id || null,
    published: isPublished(dashboard),
    createdAt: dashboard.created_at || prevRecord?.createdAt || new Date().toISOString(),
    attachedChartIds: attachedWidgets.map((w) => w.id).filter((id) => id != null),
    detailLoaded: true,
    detailLoading: false,
  };
}

// Lightweight record from GET /dashboards' summary rows — no layout/widgets yet, hydrated
// lazily via ensureDashboardDetail once the dashboard is actually opened (edit or preview).
function buildSummaryRecord(row) {
  return {
    id: String(row.id),
    backendId: row.id,
    name: row.name,
    published: isPublished(row),
    createdAt: row.created_at,
    layout: undefined,
    widgets: undefined,
    globalFilters: undefined,
    attachedChartIds: [],
    detailLoaded: false,
    detailLoading: false,
  };
}

// Real Chart widgets store their binding as dataSource: {type:'chartLibrary', widgetId}
// (see DashboardCanvasEditor.jsx's addWidget/addRealChart) — shared by handleSave and the
// legacy-dashboard migration below, both of which need to attach whichever of a dashboard's
// widgets are real Chart Library charts.
const realChartWidgetEntries = (widgets) => Object.entries(widgets || {})
  .filter(([, w]) => w.dataSource?.type === 'chartLibrary' && w.dataSource.widgetId);

// Only attaches widgets that aren't already attached — confirmed via a live 409 CONFLICT
// that POST /dashboards/{id}/widgets is create-only, not an upsert: re-POSTing an
// already-attached widget_id to update its position is rejected outright, it doesn't update
// the existing join row. So there is currently NO way to persist a position change for a
// widget that's already attached to a dashboard — only its position at the moment it's first
// placed is ever saved. This is a real backend gap (needs something like
// PATCH /dashboards/{id}/widgets/{widget_id} accepting {position}) — flagged, not solved
// here. Each attach is try/caught individually so one widget's failure (e.g. a stale
// alreadyAttachedIds entry) never blocks the rest of the loop.
async function attachRealCharts(backendId, widgets, layout, alreadyAttachedIds = []) {
  const realCharts = realChartWidgetEntries(widgets);
  const attached = new Set(alreadyAttachedIds);
  const newlyAttached = [];
  for (const [layoutId, w] of realCharts) {
    const widgetId = w.dataSource.widgetId;
    if (attached.has(widgetId)) continue;
    const layoutEntry = (layout || []).find((l) => l.i === layoutId);
    const position = layoutEntry ? { x: layoutEntry.x, y: layoutEntry.y, w: layoutEntry.w, h: layoutEntry.h } : undefined;
    try {
      await attachWidget(backendId, widgetId, position);
      newlyAttached.push(widgetId);
    } catch (e) {
      console.error('[DashboardBuilder] attachWidget failed for', widgetId, e);
    }
  }
  return newlyAttached;
}

// Counterpart to attachRealCharts above — detaches whichever previously-attached widgets
// (`alreadyAttachedIds`, from the dashboard's own state as of the last load) are no longer
// present in the current local `widgets` set, i.e. were removed via removeWidget
// (DashboardCanvasEditor.jsx) and the removal is now being saved. Before detachWidget existed
// (see dashboardBuilder-actions.js's own doc comment on it), there was no way to do this at
// all — a removed widget's coordinates dropped out of dashboard.layout on save, but the
// backend's join row survived, so the widget silently reappeared on the next load. Same
// per-item try/catch pattern as attachRealCharts, so one failure doesn't block the rest.
async function detachRemovedCharts(backendId, widgets, alreadyAttachedIds = []) {
  const stillAttached = new Set(realChartWidgetEntries(widgets).map(([, w]) => w.dataSource.widgetId));
  const removed = alreadyAttachedIds.filter((id) => !stillAttached.has(id));
  for (const widgetId of removed) {
    try {
      await detachWidget(backendId, widgetId);
    } catch (e) {
      console.error('[DashboardBuilder] detachWidget failed for', widgetId, e);
    }
  }
  return removed;
}

const DashboardBuilder = () => {
  const [customDashboards, setCustomDashboards] = useState([]);
  const [dashboardsLoading, setDashboardsLoading] = useState(true);
  const [dashboardsError, setDashboardsError] = useState(null);
  const [view, setView] = useState('browse'); // 'browse' | 'charts' | 'datasources' | 'settings'
  const [previewId, setPreviewId] = useState(null);
  // null = not editing (read-only preview shows); 'new' = blank new dashboard; an existing
  // dashboard's id otherwise. Stored as an id (not a snapshot object) so editingExisting
  // below always re-derives from the latest customDashboards state — needed since a
  // dashboard's layout/widgets are hydrated lazily (see ensureDashboardDetail) and may
  // still be loading at the moment "Edit" is clicked. Controls ONLY what renders inside the
  // central preview panel below — the Dashboards/Charts/Datasources tab bar and dashboard
  // list never change/disappear for this, unlike the old separate full-page 'editor' view.
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Per-widget selection (widgetId set), not a single all-or-nothing toggle — the "used
  // elsewhere?" risk the checkbox itself warns about only applies to SOME of a dashboard's
  // widgets in practice, so picking exactly which ones is safer than an all-or-nothing choice.
  const [deleteWidgetIds, setDeleteWidgetIds] = useState(() => new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  // DashboardCanvasEditor exposes exportCSV/exportPNG/exportPDF via useImperativeHandle —
  // this preview panel has its own header (outside DashboardCanvasEditor's own render
  // tree), so the export trigger lives here rather than duplicating one inside it.
  const previewEditorRef = useRef(null);
  // Mirrored out of the read-only preview's DashboardCanvasEditor instance via its
  // onFiltersState callback, so this header (which sits outside that component's own render
  // tree) can render the Filters gear/controls inline next to the dashboard name instead of
  // the horizontal strip DashboardCanvasEditor renders internally in its own editable view.
  const [previewFilters, setPreviewFilters] = useState([]);
  const [previewFilterDatasourceOptions, setPreviewFilterDatasourceOptions] = useState([]);
  // Phase 19c — mirrored out of the *editable* DashboardCanvasEditor instance via its
  // onDashboardStyleState callback, so a brand-new (not-yet-saved) dashboard's style/theme
  // choice can be included in the very first createDashboard call in handleSave below,
  // instead of being silently lost once the editor closes on save.
  const [pendingDashboardStyle, setPendingDashboardStyle] = useState({});
  const [pendingThemeId, setPendingThemeId] = useState(null);
  // Same pattern as pendingDashboardStyle/pendingThemeId above — a brand-new dashboard's
  // Filters button is now available before the first save too, so whatever's staged there
  // needs to be carried into the first createDashboard call the same way.
  const [pendingGlobalFilters, setPendingGlobalFilters] = useState([]);
  // For the header-level "New Chart"/"New Datasource" buttons to trigger the same reset
  // each tab's own internal "New..." link does (both expose resetForm via useImperativeHandle).
  const chartLibraryRef = useRef(null);
  const datasourceManagerRef = useRef(null);
  const themeManagerRef = useRef(null);
  // For the "add widget via real chart type" flow: the editable DashboardCanvasEditor
  // instance currently being edited (so a chart saved in the Charts tab can be added back
  // to it on return — see handleChartSavedForDashboard), and the {chartType, datasourceId,
  // name} handed off when that flow starts (see handleCreateViaChartsTab).
  const editingEditorRef = useRef(null);
  const [chartsPrefill, setChartsPrefill] = useState(null);
  // True only while editing a chart via the "Edit chart" flow from a dashboard placement —
  // drives ChartLibrary's Save button to also return here afterward, instead of a plain
  // Save. Cleared on any manual tab click so it doesn't linger onto an unrelated chart.
  const [chartsEditReturn, setChartsEditReturn] = useState(false);
  // Best-effort backend-sync failure surfaced non-blockingly — local save/delete/clone
  // always succeeds regardless (see handleSave/confirmDelete/cloneDashboard).
  const [syncError, setSyncError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  // Lets an admin see exactly how a dashboard will read once embedded elsewhere (e.g.
  // EmbeddedDashboard.jsx inside Insights Engine) without leaving the builder or publishing
  // first — same read-only DashboardCanvasEditor, just filling the viewport instead of the
  // preview panel.
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  useEffect(() => { setPreviewFullscreen(false); }, [previewId]);

  // Backend is now the single source of truth for the dashboard list (previously
  // localStorage-only, which is why dashboards created on one device/browser never showed
  // up on another logged in as the same user). Fetches the summary list on mount, then
  // best-effort pushes up any dashboard still only sitting in localStorage from before this
  // change (a one-time migration) so existing work isn't silently dropped — after that,
  // localStorage is never read or written again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDashboardsLoading(true);
      setDashboardsError(null);
      try {
        const list = await listDashboards();
        if (cancelled) return;
        let records = list.map(buildSummaryRecord);

        const legacyLocalOnly = loadLegacyLocalDashboards().filter((d) => !d.backendId);
        if (legacyLocalOnly.length > 0) {
          const migrated = [];
          for (const d of legacyLocalOnly) {
            try {
              const { dashboard } = await createDashboard({ name: d.name, layout: d.layout });
              const realCharts = realChartWidgetEntries(d.widgets);
              if (realCharts.length > 0) {
                await attachRealCharts(dashboard.id, d.widgets, d.layout, []);
              }
              // Re-fetch so the migrated record reflects exactly what actually made it to
              // the backend (real Chart Library widgets only) — mock-only local dashboards
              // migrate as empty-canvas dashboards, matching "only what's saved in backend".
              const { dashboard: freshDashboard, widgets: attachedWidgets } = await getDashboardDetail(dashboard.id);
              migrated.push(buildRecordFromBackend(freshDashboard, attachedWidgets, d));
            } catch (e) {
              console.error('[DashboardBuilder] migration failed for local dashboard', d.name, e);
            }
          }
          records = [...records, ...migrated];
        }
        clearLegacyLocalDashboards();
        if (!cancelled) setCustomDashboards(records);
      } catch (e) {
        if (!cancelled) setDashboardsError(e.message);
      } finally {
        if (!cancelled) setDashboardsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetches a dashboard's full layout/widgets on first use (edit or preview) — the initial
  // list only carries summary fields (name/published/id), not the full editor state.
  const ensureDashboardDetail = async (id) => {
    const rec = customDashboards.find((d) => d.id === id);
    if (!rec || rec.detailLoaded || rec.detailLoading) return;
    setCustomDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, detailLoading: true } : d)));
    try {
      const { dashboard, widgets: attachedWidgets } = await getDashboardDetail(rec.backendId);
      const updated = buildRecordFromBackend(dashboard, attachedWidgets, rec);
      setCustomDashboards((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (e) {
      setCustomDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, detailLoading: false, detailError: e.message } : d)));
    }
  };

  // Newest first — customDashboards itself is in whatever order the backend list/create/clone
  // calls happened to return/append in (oldest-created first, since a new one is always
  // appended to the end via `[...prev, record]`), which read as "backwards" in the sidebar —
  // see the conversation this was reported in. Sorted here, at render, rather than keeping
  // customDashboards itself sorted, so every setCustomDashboards call site (create, clone,
  // rename, delete, migration) doesn't also need to know about ordering. STATIC_DASHBOARDS
  // stay pinned first, unchanged — they're fixed built-in entries with no real createdAt.
  const sortedCustomDashboards = [...customDashboards].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
  const allDashboards = [...STATIC_DASHBOARDS, ...sortedCustomDashboards];
  // Dashboard list search — name only (no "type" concept here, unlike ChartLibrary.jsx's own
  // chart-type filter, since every entry in this list is just "a dashboard", nothing to
  // narrow by beyond its name).
  const visibleDashboards = dashboardSearch.trim()
    ? allDashboards.filter((d) => d.name?.toLowerCase().includes(dashboardSearch.trim().toLowerCase()))
    : allDashboards;
  const previewDashboard = allDashboards.find((d) => d.id === previewId) || null;
  // The actual dashboard record being edited, or null when creating a brand new one — always
  // re-derived from customDashboards (not a snapshot) so hydration updates (ensureDashboardDetail
  // resolving) are picked up even if "Edit" was clicked before the detail fetch finished.
  const editingExisting = editingDashboard && editingDashboard !== 'new'
    ? customDashboards.find((d) => d.id === editingDashboard) || null
    : null;

  const openEditor = (dashboard) => {
    setEditingDashboard(dashboard.id);
    ensureDashboardDetail(dashboard.id);
  };

  // Bumped on every "New dashboard" click so DashboardCanvasEditor's `key` below changes
  // each time too — without this, repeated "New dashboard" clicks reuse the same mounted
  // instance (same literal 'new' key) and its one-time chart-list fetch goes stale for the
  // rest of the session, unlike editing a real dashboard (which always gets a fresh key/id).
  const [newDashboardToken, setNewDashboardToken] = useState(0);
  // Pending confirm for "New dashboard" clicked while there's unsaved work — { message } |
  // null, confirmed via <ConfirmModal/> below rather than a plain window.confirm.
  const [pendingNewDashboardConfirm, setPendingNewDashboardConfirm] = useState(null);
  const startNewDashboard = () => {
    setNewDashboardToken((t) => t + 1);
    setEditingDashboard('new');
    // The page-level Dashboards list (this component's own right rail) isn't needed while
    // actively building a dashboard — DashboardCanvasEditor.jsx's own "Add Widget"/"Your
    // Widgets" panels are what matter now, so collapse this one down to its icon-only rail
    // to free up width for them, rather than leaving three panels competing for space.
    setSidebarCollapsed(true);
  };
  const openNewDashboard = () => {
    // Nothing currently open to lose — just start fresh, no confirm/remount noise.
    if (!editingDashboard) { startNewDashboard(); return; }
    // Already on a blank, untouched "new" dashboard — clicking "New dashboard" again would
    // otherwise force a full remount (fresh chart-list fetch etc.) for a state that's
    // already exactly what's being asked for.
    if (editingDashboard === 'new' && !editingEditorRef.current?.isDirty()) return;
    if (editingEditorRef.current?.isDirty()) {
      setPendingNewDashboardConfirm({
        message: 'Discard unsaved changes and start a new dashboard? This can\'t be undone.',
      });
      return;
    }
    startNewDashboard();
  };

  const backToBrowse = () => {
    setEditingDashboard(null);
  };

  // Starts the "real chart via Charts tab" flow — a widget-type icon was clicked and a
  // dataset chosen in WidgetCreateWizard, but the actual field mapping needs the full
  // Charts tab UI, so we hand off there instead of guessing a mapping.
  const handleCreateViaChartsTab = (prefill) => {
    setChartsPrefill(prefill);
    setView('charts');
  };

  // Called by ChartLibrary once the handed-off chart is saved — places it on the canvas of
  // whichever dashboard was being edited when the flow started (still mounted/preserved,
  // see the always-rendered browse panel below) and returns to it.
  const handleChartSavedForDashboard = (widgetId) => {
    editingEditorRef.current?.addRealChart(widgetId);
    setChartsPrefill(null);
    setView('browse');
  };

  // "Edit chart" from a placed Real Chart widget's side panel — loads that exact chart in
  // the Charts tab (its own edit flow, ChartLibrary.jsx's editWidget) rather than editing
  // its shared definition from inside one dashboard placement.
  const handleEditInChartsTab = (chartId) => {
    setChartsEditReturn(true);
    chartLibraryRef.current?.loadChart(chartId);
    setView('charts');
  };

  // Called by ChartLibrary once an edit-from-dashboard save completes — the chart is
  // already attached (unlike the create flow), so this just returns to the dashboard.
  // `widget` is the freshly saved chart definition (name/chart_type/mapping, incl.
  // mapping.style) — without syncing it in, the dashboard's own local copy of this chart
  // (captured once when the dashboard was loaded) stays stale until a full reload, which is
  // exactly the "edited in Charts tab, but the dashboard doesn't show it" bug this closes.
  const handleChartEditedReturn = (widget) => {
    setChartsEditReturn(false);
    setView('browse');
    editingEditorRef.current?.refreshChartDefinition(widget);
  };

  // "Cancel" from either the create-for-dashboard or edit-from-dashboard flow — abandons
  // whatever's unsaved in the Charts tab and returns without touching the dashboard.
  const handleCancelChartsFlow = () => {
    setChartsPrefill(null);
    setChartsEditReturn(false);
    setView('browse');
  };

  // Cancel button for the Charts tab, always available (not just when arrived via a
  // dashboard-linked flow) — branches to the dashboard-return behavior above when relevant,
  // otherwise just resets ChartLibrary's own form back to blank/list via its exposed ref.
  const handleChartsCancel = () => {
    if (chartsPrefill || chartsEditReturn) {
      handleCancelChartsFlow();
    } else {
      chartLibraryRef.current?.resetForm();
    }
  };

  const askDelete = (dashboard) => {
    setDeleteTarget(dashboard);
    setDeleteModalOpen(true);
    setDeleteWidgetIds(new Set());
  };

  // Backend-primary: every dashboard has a backendId by construction now, so delete/clone
  // always go through the backend first and mirror local state off the result — rather than
  // updating local state optimistically and syncing best-effort, which was the old
  // localStorage-primary behavior.
  // `deleteWidgetIds` — mirrors clone's own duplicate_widgets checkbox in spirit (an explicit
  // opt-in, default off/none-selected, to also delete this dashboard's OWN attached widgets in
  // the same action rather than deleting the dashboard then separately hunting down and
  // deleting each of its now-orphaned widgets from the Charts tab by hand) — but per-widget,
  // not all-or-nothing, since "used elsewhere?" risk (see each checkbox's own label) usually
  // only applies to SOME of a dashboard's widgets, not all of them uniformly. Deliberately NOT
  // safety-checked against actual usage elsewhere — same as clone's own checkbox, this trusts
  // an explicit, clearly-labeled per-widget choice rather than attempting a cheap-but-incomplete
  // usage check (there's no existing endpoint for "which dashboards use widget X" to check
  // against, unlike DatasourceManager's own datasource-delete blast-radius check, which can
  // filter the one existing listWidgets() call by datasource_id).
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteModalOpen(false);
    const widgetIdsToDelete = [...deleteWidgetIds];
    setDeleteTarget(null);
    setDeleteWidgetIds(new Set());
    deleteDashboardBackend(deleteTarget.backendId)
      .then(async () => {
        setCustomDashboards((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        setPreviewId((prev) => (prev === deleteTarget.id ? null : prev));
        if (widgetIdsToDelete.length) {
          // Best-effort, per-widget — one widget already gone/failing to delete (e.g. a stale
          // id, or a race with something else) shouldn't block cleaning up the rest.
          await Promise.all(widgetIdsToDelete.map((id) => deleteWidget(id).catch((e) => (
            console.error('[DashboardBuilder] Failed to delete widget', id, 'while deleting dashboard:', e)
          ))));
          // Keeps any already-mounted Charts list (ChartLibrary.jsx's own tab, another open
          // dashboard's "Your Widgets" panel) in sync — same call cloneDashboard's own
          // duplicateWidgets path already makes for the mirror-image "widgets appeared" case.
          notifyWidgetsChanged();
        }
      })
      .catch((e) => setSyncError(e.message));
  };

  // Clones on the backend (which duplicates the dashboard's layout — including the
  // composite {grid, widgets} blob — and its attached real Chart Library widgets) and
  // builds the local record straight from that response, rather than a client-side deep
  // clone of possibly-not-yet-hydrated local state.
  // `duplicateWidgets` — see cloneDashboardBackend's own doc comment: false (default) has the
  // clone share the same widget records as the original (editing one edits both); true gives
  // it its own independent copy of every widget. Dashboard-level, not per-widget.
  // `name` is chosen up front in the Clone dialog itself (defaulted via nextCopyName, but
  // freely editable there) rather than always hardcoded to "<name> (Copy)". `widgetNames` —
  // same idea, per-widget: an optional { [originalLayoutId]: name } override map, also editable
  // in that same dialog when "duplicate widgets" is checked (originalLayoutId is the ORIGINAL
  // dashboard's own `l.i`, e.g. "w_<oldWidgetId>" — see the ConfirmModal below, which builds
  // this keyed exactly that way). Any widget with no override (or an override that fails to
  // resolve to a pair — see pairClonedWidgetsWithOriginal) falls back to an auto-generated
  // progressive name, same as before this override existed.
  const cloneDashboard = (dashboard, duplicateWidgets = false, name, widgetNames = {}) => {
    cloneDashboardBackend(dashboard.backendId, { name: name || `${dashboard.name} (Copy)`, duplicateWidgets })
      .then(async ({ dashboard: backendDashboard, widgets: attachedWidgets }) => {
        console.log('[DashboardBuilder] cloneDashboardBackend response.dashboard:', backendDashboard);
        // Computed once, while attachedWidgets still carry the same name/chart_type/
        // datasource_id they were cloned from — shared by the layout fix AND the rename step
        // below so the two can't disagree about which original a given new widget maps to
        // (see pairClonedWidgetsWithOriginal's own doc comment).
        if (duplicateWidgets) {
          const pairs = pairClonedWidgetsWithOriginal(dashboard, attachedWidgets);

          const fixedLayout = remapClonedLayoutForNewWidgets(dashboard, backendDashboard.layout, pairs);
          backendDashboard = { ...backendDashboard, layout: fixedLayout };
          // Persisted immediately, not just applied to this in-memory record — otherwise the
          // backend's own still-stale layout (old widget ids) would silently come back the
          // next time this cloned dashboard is loaded, reintroducing the exact bug this fixes.
          try {
            await updateDashboard(backendDashboard.id, { layout: fixedLayout });
          } catch (e) {
            console.error('[DashboardBuilder] Failed to persist remapped clone layout:', e);
          }

          // duplicateWidgets:true's own new widget copies come back with the SAME name as the
          // original (the backend doesn't currently suffix them) — same confusion the
          // dashboard clone itself avoids via nextCopyName above, and for the same reason:
          // widgets are a single shared Chart Library across every dashboard (not scoped to
          // just this one), so cloning from several dashboards over time previously left
          // multiple *different* widgets all literally named "Availability (Copy)" with
          // nothing to tell them apart — see the conversation this was reported in.
          // `widgetNames[original.i]` (typed in the Clone dialog) wins when present; otherwise
          // falls back to progressive numbering, checked against every OTHER widget's name in
          // the whole library (not just this dashboard's own) via `takenNames`, updated as each
          // one is assigned so two widgets renamed in the SAME clone batch can't collide with
          // each other either — including a custom-typed name, so a later auto-generated one
          // can't accidentally collide with a name the user just typed by hand. Sequential (not
          // Promise.all) for that same reason. Best-effort per widget; a rename failing here
          // still leaves a perfectly usable (just unrenamed) widget, so it's not worth
          // blocking/erroring the whole clone over.
          let takenNames;
          try {
            takenNames = new Set((await listWidgets()).map((w) => w.name));
          } catch {
            takenNames = new Set(); // best-effort — falls back to un-deduplicated "(1)" for every widget rather than blocking the clone
          }
          const newNameByWidgetId = new Map();
          for (const { original, widget } of pairs) {
            const custom = widgetNames?.[original.i]?.trim();
            const newName = custom || nextCopyName(baseDashboardName(widget.name), takenNames);
            takenNames.add(newName);
            newNameByWidgetId.set(widget.id, newName);
          }
          const renamed = [];
          for (const w of attachedWidgets) {
            const newName = newNameByWidgetId.get(w.id);
            if (!newName) { renamed.push(w); continue; } // no pairing found — leave unrenamed rather than guessing
            try {
              await updateWidget(w.id, { name: newName });
              renamed.push({ ...w, name: newName });
            } catch {
              renamed.push(w);
            }
          }
          attachedWidgets = renamed;
        }
        const record = buildRecordFromBackend(backendDashboard, attachedWidgets);
        setCustomDashboards((prev) => [...prev, record]);
        setPreviewId(record.id);
        // duplicateWidgets:true creates brand-new widget records server-side — without this,
        // any already-mounted Charts list (ChartLibrary.jsx's own "Charts" tab, or another
        // open dashboard's "Your Widgets" panel) keeps showing whatever it fetched at ITS OWN
        // mount time, not these newly-created widgets, since nothing told it to refresh — see
        // the conversation this was reported in ("these lists shall always be in sync"). Every
        // other place in the app that creates/deletes a widget already calls this same
        // notifyWidgetsChanged()/subscribeWidgetsChanged() pair; cloning just hadn't been
        // wired into it yet. Harmless to call even when duplicateWidgets is false — no widgets
        // changed in that case, so every subscriber's refetch is just a no-op extra request.
        if (duplicateWidgets) notifyWidgetsChanged();
      })
      .catch((e) => setSyncError(e.message));
  };
  // Pending confirm for the Clone button — { dashboard } | null — asks whether the clone's
  // widgets should be independent copies (duplicate_widgets) before actually cloning, rather
  // than always defaulting to the shared-reference behavior silently.
  const [cloneTarget, setCloneTarget] = useState(null);
  const [cloneDuplicateWidgets, setCloneDuplicateWidgets] = useState(false);
  const [cloneName, setCloneName] = useState('');
  // Per-widget name overrides for a duplicate_widgets:true clone — keyed by the ORIGINAL
  // dashboard's own layout id (`l.i`, e.g. "w_<oldWidgetId>"), same key cloneDashboard's
  // `widgetNames` param expects (matched there via pairClonedWidgetsWithOriginal). Populated
  // with auto-suggested progressive names (loadCloneWidgetNameSuggestions below) the moment
  // "duplicate widgets" gets checked, then freely editable in the dialog.
  const [cloneWidgetNames, setCloneWidgetNames] = useState({});
  const [cloneWidgetNamesLoading, setCloneWidgetNamesLoading] = useState(false);

  // Suggests a progressive name (same scheme as nextCopyName) for every real widget on
  // `dashboard`, checked against every OTHER widget's name in the whole Chart Library (not just
  // this dashboard's own — widgets are a shared, cross-dashboard resource) so the suggestions
  // shown are already collision-free, not just a starting guess the user has to fix by hand.
  const loadCloneWidgetNameSuggestions = async (dashboard) => {
    const realEntries = (dashboard.layout || [])
      .map((l) => ({ l, w: dashboard.widgets?.[l.i] }))
      .filter(({ w }) => w?.dataSource?.type === 'chartLibrary');
    setCloneWidgetNamesLoading(true);
    let taken;
    try {
      taken = new Set((await listWidgets()).map((w) => w.name));
    } catch {
      taken = new Set();
    }
    const names = {};
    realEntries.forEach(({ l, w }) => {
      const suggestion = nextCopyName(baseDashboardName(w.title), taken);
      taken.add(suggestion);
      names[l.i] = suggestion;
    });
    setCloneWidgetNames(names);
    setCloneWidgetNamesLoading(false);
  };

  const handlePublish = () => {
    if (!previewDashboard?.backendId) return;
    setPublishing(true);
    publishDashboard(previewDashboard.backendId)
      .then((backendDashboard) => {
        console.log('[DashboardBuilder] publishDashboard response:', backendDashboard);
        // A 200 here means the backend accepted the publish call regardless of whether
        // isPublished's field-name guess matches this response shape, so default true either way.
        setCustomDashboards((prev) => prev.map((d) => (
          d.id === previewDashboard.id ? { ...d, published: true } : d
        )));
      })
      .catch((e) => setSyncError(e.message))
      .finally(() => setPublishing(false));
  };

  const [savingDashboard, setSavingDashboard] = useState(false);

  // Backend-primary, and only what's actually persisted server-side is ever shown — every
  // save now creates/updates a real backend dashboard (not just ones containing a Real
  // Chart widget), attaches whichever of the editor's widgets are real Chart Library
  // charts, then re-fetches the dashboard fresh so local state reflects exactly what the
  // backend now holds (mock/local-only widgets are never round-tripped — see
  // buildLocalLayoutAndWidgets above).
  const handleSave = async ({ name, layout, widgets, tabs }) => {
    if (savingDashboard) return;
    setSavingDashboard(true);
    try {
      // Each real (chartLibrary) widget's per-placement style has no dedicated backend
      // field — it rides along inside its own layout entry, since dashboard.layout is a
      // plain JSON array that already round-trips reliably via PATCH /dashboards/{id}
      // (unlike per-widget position, which is create-only — see attachRealCharts above).
      // buildLocalLayoutAndWidgets reads it back out on the next load — but it always
      // recomputes each widget's local id as the canonical `w_<backendWidgetId>` form, not
      // whatever local id the editor currently has it under. A widget placed/duplicated THIS
      // session still carries whatever transient id nextId() gave it (see
      // DashboardCanvasEditor.jsx's addWidget/duplicateWidget) — saving the layout entry
      // under THAT id, as this used to, means the next load's `w_<id>` lookup misses and
      // silently drops style back to {} (this was a real, reproduced bug: a freshly
      // duplicated widget's style showed correctly in the live editor but reverted after
      // Save+reload, while an already-previously-saved widget's style survived fine, because
      // its local id already happened to be in the canonical form from the prior load).
      // Rekeying every entry to the canonical form here, at save time, means it's stable
      // across the save+reload round-trip regardless of when the placement was created.
      const layoutWithStyle = (layout || []).map((item) => {
        const w = widgets[item.i];
        const canonicalId = w?.dataSource?.type === 'chartLibrary' && w.dataSource.widgetId
          ? `w_${w.dataSource.widgetId}`
          : item.i;
        return {
          ...item,
          i: canonicalId,
          style: w?.style || {},
          // Text Box/Shape's whole definition rides along here too (type/title), not just
          // their style — see LOCAL_PERSISTABLE_TYPES' own doc comment and
          // buildLocalLayoutAndWidgets' matching reconstruction step, which reads these same
          // keys back out. A real chartLibrary widget doesn't need this (its type is always
          // implied by simply being in `attachedWidgets` at all).
          ...(w && LOCAL_PERSISTABLE_TYPES.has(w.type) ? { type: w.type, title: w.title } : {}),
          // Slicer — just enough to relink this tile to its real backend slicer record on the
          // next load (type/title/slicerId), same reasoning as Text Box/Shape above. The
          // slicer's own data (available_values/selected_values) stays backend-owned via
          // createSlicer/updateSlicer, not duplicated here.
          ...(w?.type === 'slicer' && w.dataSource?.slicerId ? { type: 'slicer', title: w.title, slicerId: w.dataSource.slicerId } : {}),
        };
      });
      // Tabs list rides along as one extra reserved-id entry in the same layout array (see
      // TABS_SENTINEL_ID's own doc comment above) — appended here, at save time, rather than
      // being part of `layoutWithStyle` itself, since it isn't a per-widget entry.
      const layoutToSave = tabs && tabs.length > 0
        ? [...layoutWithStyle, { i: TABS_SENTINEL_ID, tabs }]
        : layoutWithStyle;
      let dashboard;
      let backendId = editingExisting?.backendId;
      if (backendId) {
        ({ dashboard } = await updateDashboard(backendId, { name, layout: layoutToSave }));
      } else {
        // Phase 19c — carries along whatever style/theme/filters were staged in the
        // editor's popovers before this first save (only reaches here via
        // onDashboardStyleState/onFiltersState, since the editor itself has no backendId
        // yet to persist against on its own).
        ({ dashboard } = await createDashboard({
          name, layout: layoutToSave, theme: pendingDashboardStyle, theme_id: pendingThemeId,
          global_filters: pendingGlobalFilters,
        }));
        backendId = dashboard.id;
      }
      console.log('[DashboardBuilder] handleSave dashboard response:', dashboard);

      const realCharts = realChartWidgetEntries(widgets);
      if (realCharts.length > 0) {
        await attachRealCharts(backendId, widgets, layout, editingExisting?.attachedChartIds || []);
      }
      // Only relevant on the update path — a brand-new dashboard (editingExisting null, or
      // one with no prior attachedChartIds) has nothing to detach yet.
      if (editingExisting?.attachedChartIds?.length > 0) {
        await detachRemovedCharts(backendId, widgets, editingExisting.attachedChartIds);
      }

      // Re-fetch so the local record reflects exactly what the backend now holds, rather
      // than a hand-assembled guess.
      const { dashboard: freshDashboard, widgets: attachedWidgets } = await getDashboardDetail(backendId);
      const record = buildRecordFromBackend(freshDashboard, attachedWidgets, editingExisting);

      setCustomDashboards((prev) => {
        const existingIndex = prev.findIndex((d) => d.id === record.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = record;
          return next;
        }
        return [...prev, record];
      });
      setPreviewId(record.id);
      setEditingDashboard(null);
    } catch (e) {
      // Re-thrown (not setSyncError — that banner only renders in the read-only preview
      // view, which isn't where this is called from; setting it here just meant the error
      // silently surfaced later, out of context, on whatever dashboard got previewed next).
      // The editor's own Save button catches this and shows it right at the Name field.
      throw e;
    } finally {
      setSavingDashboard(false);
    }
  };

  return (
    // h-full (not a hardcoded 100vh-4rem guess at the header height) — fills exactly what
    // Layout.jsx's own flex-1 wrapper actually gives it, so this page's height can never
    // slightly exceed that wrapper's available space. Layout.jsx's div is overflow-y-auto
    // (shared by every page in the app, not editable just for this one) — any mismatch
    // there made the whole page scroll in addition to this page's own internal scroll
    // regions (the preview panel/canvas above). Exactly filling the parent means there's
    // nothing left to overflow, so that outer scroll never activates for this page.
    <div className="flex flex-col h-full overflow-hidden p-5 gap-4">
      {/* Overrides the global index.css scrollbar rule (an always-visible, 4px orange thumb,
          applied to every scrollable element in the app) for just this preview region — hidden
          entirely, still fully scrollable by wheel/drag/keyboard. A bare class selector like
          .dbe-preview-scroll::-webkit-scrollbar loses to that global rule on specificity (its
          `html[data-theme]` ancestor selector out-scores this rule's plain class), which is why
          this was stuck always-on despite the code already trying to hide it — same bug, same
          fix, as DashboardCanvasEditor.jsx's own .dbe-left-panel/.dbe-chart-list/.dbe-canvas-wrap
          (see that file for the fuller writeup). Scoped to this one class only — doesn't touch
          the global rule or any other page's own scrollbar. */}
      <style>{`
        .dbe-preview-scroll { scrollbar-width: none; }
        html .dbe-preview-scroll::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md" style={{ background: '#0b1830' }}>
            <PanelsTopLeft size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Dashboard Builder</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">Browse existing dashboards or build a new one.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => { setChartsEditReturn(false); setView('browse'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === 'browse' ? 'bg-[#0b1830] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Grid2x2 size={13} />
              Dashboards
            </button>
            <button
              type="button"
              onClick={() => { setChartsEditReturn(false); setView('charts'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === 'charts' ? 'bg-[#0b1830] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FlaskConical size={13} />
              Charts
            </button>
            <button
              type="button"
              onClick={() => { setChartsEditReturn(false); setView('datasources'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === 'datasources' ? 'bg-[#0b1830] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Database size={13} />
              Datasources
            </button>
            <button
              type="button"
              onClick={() => { setChartsEditReturn(false); setView('settings'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === 'settings' ? 'bg-[#0b1830] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Palette size={13} />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Always mounted (visibility toggled via `hidden`) — not conditionally rendered —
          so chartLibraryRef stays valid even before the Charts tab is visible. Without
          this, handleEditInChartsTab's ref call (which fires before setView('charts')
          mounts anything) would silently no-op against a null ref. */}
      {/* Plain layout container, no card styling of its own — matches the Dashboards view's
          own two-card row below (each child owns its own rounded/border/shadow/bg card
          instead of one shared card wrapping both — see ChartLibrary.jsx's own left-column
          and side-panel divs for where that styling now lives). */}
      <div className={`flex-1 min-h-0 min-w-0 ${view === 'charts' ? 'flex' : 'hidden'}`}>
        <ChartLibrary
          ref={chartLibraryRef}
          prefill={chartsPrefill}
          onSavedForDashboard={chartsPrefill ? handleChartSavedForDashboard : undefined}
          returnToDashboard={chartsEditReturn}
          onReturnToDashboard={chartsEditReturn ? handleChartEditedReturn : undefined}
          onCancel={handleChartsCancel}
        />
      </div>

      {view === 'datasources' && (
        <div
          className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0 p-3"
          style={{ background: 'rgba(255,255,255,0.55)' }}
        >
          <DatasourceManager embedded ref={datasourceManagerRef} />
        </div>
      )}

      {view === 'settings' && (
        <div
          className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0 p-3"
          style={{ background: 'rgba(255,255,255,0.55)' }}
        >
          <ThemeManager embedded ref={themeManagerRef} />
        </div>
      )}

      {/* Always mounted (visibility toggled via `hidden`, not conditional rendering) so an
          in-progress editable DashboardCanvasEditor survives navigating to the Charts tab
          mid-edit (see handleCreateViaChartsTab/handleChartSavedForDashboard) instead of
          losing unsaved layout/widgets when that panel would otherwise unmount. */}
      <div className={`flex-1 gap-4 min-h-0 ${view === 'browse' ? 'flex' : 'hidden'}`}>
          {/* Left: preview — flex-column with a pinned (shrink-0) header and an
              independently-scrolling content region below it, instead of one overflow-auto
              region wrapping both (which used to scroll the header out of view along with
              the widgets). */}
          <div
            className="flex-1 flex flex-col overflow-hidden rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0"
            style={{ background: 'rgba(255,255,255,0.55)' }}
          >
            {editingDashboard ? (
              // Editable canvas rendered in the exact same panel the read-only preview
              // uses below — no page-level navigation. DashboardCanvasEditor supplies its
              // own toolbar (name input + Cancel/Save) since editable+showChrome are on.
              <div className="flex-1 min-h-0 p-3">
                {editingDashboard !== 'new' && !editingExisting?.detailLoaded ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {editingExisting?.detailError ? `Couldn't load dashboard: ${editingExisting.detailError}` : 'Loading dashboard…'}
                  </div>
                ) : (
                  <DashboardCanvasEditor
                    ref={editingEditorRef}
                    key={editingExisting?.id || `new-${newDashboardToken}`}
                    dashboardId={editingExisting?.id || 'new'}
                    backendId={editingExisting?.backendId}
                    initialGlobalFilters={editingExisting?.globalFilters || []}
                    initialName={editingExisting?.name}
                    initialLayout={editingExisting?.layout}
                    initialWidgets={editingExisting?.widgets}
                    initialTabs={editingExisting?.tabs || []}
                    editable
                    onSave={handleSave}
                    onCancel={backToBrowse}
                    onCreateViaChartsTab={handleCreateViaChartsTab}
                    onEditInChartsTab={handleEditInChartsTab}
                    onDashboardStyleState={({ style, themeId }) => {
                      setPendingDashboardStyle(style);
                      setPendingThemeId(themeId);
                    }}
                    onFiltersState={({ filters }) => setPendingGlobalFilters(filters)}
                  />
                )}
              </div>
            ) : previewDashboard ? (
              <>
                <div className="shrink-0 flex items-center gap-3 flex-wrap px-4 py-2.5 border-b border-white/40">
                  <div className="shrink-0 flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-800">{previewDashboard.name}</div>
                        {previewDashboard.backendId && (
                          <span className={`px-1.5 py-0.5 rounded text-[0.625rem] font-semibold uppercase tracking-wide ${
                            previewDashboard.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {previewDashboard.published ? 'Published' : 'Draft'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {previewDashboard.static
                          ? previewDashboard.description
                          : `${Object.keys(previewDashboard.widgets || {}).length} widget(s)`}
                      </div>
                    </div>
                    {/* Pinned to the extreme left, right next to the dashboard name — not
                        grouped with the Edit/Export/Clone/Publish/Delete cluster on the
                        right, so Filters reads as a distinct dashboard-level control. */}
                    {!previewDashboard.static && previewDashboard.backendId && (
                      <div className="flex items-center gap-2 pl-4 ml-1 border-l border-slate-200">
                        <FiltersToggleButton
                          filters={previewFilters}
                          datasourceOptions={previewFilterDatasourceOptions}
                          onSave={(rows) => previewEditorRef.current?.applyFilters(rows)}
                        />
                      </div>
                    )}
                  </div>
                  {/* The filter-VALUE strip itself fills the header's own unused middle space —
                      same treatment as DashboardCanvasEditor.jsx's own toolbar (see its doc
                      comment) — instead of always reserving its own full-width strap below,
                      even collapsed to its compact chip. previewFilters.length check: FilterPanel
                      renders nothing with none configured, so skip the space for it entirely. */}
                  {!previewDashboard.static && previewDashboard.backendId && previewFilters.length > 0 && (
                    <div className="min-w-[200px]" style={{ flex: 1 }}>
                      <FilterPanel
                        filters={previewFilters}
                        onApply={(rows) => previewEditorRef.current?.applyFilters(rows)}
                        onClear={() => previewEditorRef.current?.clearFilterValues()}
                        datasourceOptions={previewFilterDatasourceOptions}
                      />
                    </div>
                  )}
                  {!previewDashboard.static && (
                    <div className="shrink-0 flex items-center gap-2 ml-auto">
                      <div className="flex items-center gap-2">
                      <CustomTooltip text={previewDashboard.published ? 'Preview fullscreen (read-only, as it\'ll look embedded elsewhere)' : 'Publish this dashboard first to preview it fullscreen'}>
                        <button
                          type="button"
                          aria-label="Preview fullscreen"
                          disabled={!previewDashboard.published}
                          onClick={() => setPreviewFullscreen(true)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                            previewDashboard.published
                              ? 'text-slate-500 border-slate-200 bg-white hover:bg-slate-50'
                              : 'text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed'
                          }`}
                        >
                          <Maximize2 size={14} />
                        </button>
                      </CustomTooltip>
                      <Button variant="secondary" size="sm" className="h-8" icon={<Pencil size={14} />} onClick={() => openEditor(previewDashboard)}>
                        Edit
                      </Button>
                      <div className="relative">
                        <button
                          type="button"
                          title="Export dashboard"
                          aria-label="Export dashboard"
                          onClick={() => setExportMenuOpen((o) => !o)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                        {exportMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                            <div className="absolute top-9 right-0 z-20 min-w-[110px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
                              <button type="button" className="px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => { previewEditorRef.current?.exportCSV(); setExportMenuOpen(false); }}>Export CSV</button>
                              <button type="button" className="px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => { previewEditorRef.current?.exportPNG(); setExportMenuOpen(false); }}>Export PNG</button>
                              <button type="button" className="px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => { previewEditorRef.current?.exportPDF(); setExportMenuOpen(false); }}>Export PDF</button>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        title="Clone dashboard"
                        aria-label="Clone dashboard"
                        onClick={() => {
                          setCloneDuplicateWidgets(false);
                          setCloneTarget(previewDashboard);
                          setCloneWidgetNames({});
                          const existingNames = new Set(allDashboards.map((d) => d.name));
                          setCloneName(nextCopyName(baseDashboardName(previewDashboard.name), existingNames));
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                      {previewDashboard.backendId && !previewDashboard.published && (
                        <button
                          type="button"
                          title="Publish dashboard"
                          aria-label="Publish dashboard"
                          disabled={publishing}
                          onClick={handlePublish}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          <UploadCloud size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Delete dashboard"
                        aria-label="Delete dashboard"
                        onClick={() => askDelete(previewDashboard)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      </div>
                    </div>
                  )}
                </div>
                {syncError && !previewDashboard.static && (
                  <div className="shrink-0 px-4 py-1.5 text-[0.6875rem] text-amber-700 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
                    <span>Backend sync: {syncError}</span>
                    <button type="button" className="text-amber-500 hover:text-amber-700" onClick={() => setSyncError(null)}>Dismiss</button>
                  </div>
                )}
                {/* flex flex-col + overflow-hidden here, NOT overflow-y-auto — this wrapper
                    used to be a plain block with its own overflow-y-auto around BOTH the filter
                    strap and DashboardCanvasEditor. DashboardCanvasEditor's own root assumes
                    height:100% of its immediate parent, but a plain (non-flex) block ancestor
                    can't account for a preceding sibling's height (the filter strap) — so it
                    was always measured a bit taller than the space actually left for it,
                    tripping this OUTER overflow at the same time DashboardCanvasEditor's own
                    INNER .dbe-canvas-wrap correctly scrolled its content — two scrollbars for
                    the same overflow. Matches the working editable-mode wrapper just above
                    (flex-1 flex flex-col overflow-hidden), which has never had this problem —
                    same shrink-0-header + flex-1-min-h-0-content split, just with an extra
                    shrink-0 filter strap this mode alone has. */}
                {/* The filter strip moved up into the header row above (see its own doc
                    comment there) — no longer reserved as its own strap here. */}
                <div className="dbe-preview-scroll flex-1 min-h-0 overflow-hidden p-3 flex flex-col">
                  <div className="flex-1 min-h-0">
                  {previewDashboard.static ? (
                    previewDashboard.render()
                  ) : !previewDashboard.detailLoaded ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      {previewDashboard.detailError ? `Couldn't load dashboard: ${previewDashboard.detailError}` : 'Loading dashboard…'}
                    </div>
                  ) : (
                    <DashboardCanvasEditor
                      ref={previewEditorRef}
                      key={previewDashboard.id}
                      backendId={previewDashboard.backendId}
                      initialGlobalFilters={previewDashboard.globalFilters || []}
                      initialName={previewDashboard.name}
                      initialLayout={previewDashboard.layout}
                      initialWidgets={previewDashboard.widgets}
                      initialTabs={previewDashboard.tabs || []}
                      editable={false}
                      showFiltersInline={false}
                      onSave={handleSave}
                      onCancel={backToBrowse}
                      onFiltersState={({ filters, datasourceOptions }) => {
                        setPreviewFilters(filters);
                        setPreviewFilterDatasourceOptions(datasourceOptions);
                      }}
                    />
                  )}
                  </div>
                </div>
                {previewFullscreen && previewDashboard.backendId && (
                  <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
                    {/* Reuses EmbeddedDashboard as-is — same component Insights Engine's
                        DynamicInsightsDashboard.jsx embeds a published dashboard with — so this
                        is a byte-for-byte preview of what shows up there (inline filter bar,
                        publish gate, deep-link filter parsing) instead of a hand-approximated
                        copy that could drift from the real embed. */}
                    <button
                      type="button"
                      title="Exit fullscreen preview"
                      aria-label="Exit fullscreen preview"
                      onClick={() => setPreviewFullscreen(false)}
                      className="fixed top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 bg-white shadow-md hover:bg-slate-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <div className="p-3">
                      <EmbeddedDashboard key={`fullscreen-${previewDashboard.id}`} dashboardId={previewDashboard.backendId} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
                <Pencil size={28} className="text-slate-300" />
                <div className="text-sm font-medium text-slate-500">Select a dashboard to preview</div>
                <div className="text-xs text-slate-400">or click + New Dashboard to build one</div>
              </div>
            )}
          </div>

          {/* Right: dashboard list — collapses to an icon-only rail instead of disappearing
              entirely, so a dashboard is still one click away without the list eating
              horizontal space the preview could use. */}
          <div
            className={`relative shrink-0 flex flex-col overflow-hidden rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0 transition-[width] duration-200 ${
              sidebarCollapsed ? 'w-12' : 'w-72'
            }`}
            style={{ background: 'rgba(255,255,255,0.55)' }}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
              className="absolute top-2 left-1.5 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors z-10"
            >
              {sidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1.5 px-4 pt-8 pb-2.5 border-b border-white/40">
                <button
                  type="button"
                  onClick={openNewDashboard}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#EC7D09] hover:opacity-80 shrink-0"
                >
                  <Plus size={14} /> New dashboard
                </button>
                <div className="relative flex-1 min-w-0">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dashboardSearch}
                    onChange={(e) => setDashboardSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>
            )}
            {sidebarCollapsed && <div className="h-9" />}
            {/* Only this region scrolls now — the "New dashboard"/Search row above (and the
                collapse toggle, position:absolute) stay fixed in place instead of scrolling
                away with the list, per the app's own "only the specific inner region that has
                more content than fits should scroll" convention (CLAUDE.md §8) — see the
                conversation this was reported in. */}
            <div className="flex-1 min-h-0 overflow-y-auto">
            {!sidebarCollapsed && dashboardsLoading && (
              <div className="p-4 text-xs text-slate-400 text-center">Loading dashboards…</div>
            )}
            {!sidebarCollapsed && dashboardsError && (
              <div className="p-4 text-xs text-red-500 text-center">Couldn't load dashboards: {dashboardsError}</div>
            )}
            {visibleDashboards.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { setPreviewId(d.id); setEditingDashboard(null); if (!d.static) ensureDashboardDetail(d.id); }}
                title={sidebarCollapsed ? d.name : undefined}
                className={`w-full flex items-center gap-2 border-b border-white/30 transition-colors ${
                  sidebarCollapsed ? 'justify-center py-2.5' : 'text-left px-4 py-2.5'
                } ${previewId === d.id ? 'bg-white/80 border-l-2 border-l-[#EC7D09]' : 'hover:bg-white/50'}`}
              >
                {sidebarCollapsed ? (
                  <span
                    aria-label={d.name}
                    className={`text-[0.625rem] font-semibold leading-none tracking-wide ${previewId === d.id ? 'text-[#EC7D09]' : 'text-slate-500'}`}
                  >
                    {dashboardInitials(d.name)}
                  </span>
                ) : (
                  <LayoutGrid size={14} className={previewId === d.id ? 'text-[#EC7D09]' : 'text-slate-400'} />
                )}
                {!sidebarCollapsed && (
                  <span className={`flex-1 flex items-center gap-1.5 min-w-0 text-sm truncate ${previewId === d.id ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    <span className="truncate">{d.name}</span>
                    {d.backendId && (
                      <span className={`shrink-0 px-1 py-px rounded text-[0.5625rem] font-semibold uppercase tracking-wide ${
                        d.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {d.published ? 'Pub' : 'Draft'}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
            {!sidebarCollapsed && allDashboards.length === 0 && (
              <div className="p-4 text-xs text-slate-400 text-center">No dashboards yet.</div>
            )}
            {!sidebarCollapsed && allDashboards.length > 0 && visibleDashboards.length === 0 && (
              <div className="p-4 text-xs text-slate-400 text-center">No dashboards match "{dashboardSearch.trim()}".</div>
            )}
            </div>
          </div>
        </div>
      <FormModal
        title="Delete Dashboard"
        headerColor="#b91c1c"
        isOpen={deleteModalOpen}
        setIsOpen={setDeleteModalOpen}
        icon={<Trash2 size={16} className="text-white" />}
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-slate-700 text-sm font-medium">
            Delete <strong>{deleteTarget?.name}</strong>?
          </p>
          <p className="text-xs text-red-400">This cannot be undone.</p>
          {(() => {
            const deletableWidgets = realChartWidgetEntries(deleteTarget?.widgets)
              .map(([, w]) => ({ id: w.dataSource.widgetId, title: w.title }))
              .filter((w) => w.id);
            if (!deletableWidgets.length) return null;
            const allIds = deletableWidgets.map((w) => w.id);
            const allSelected = allIds.every((id) => deleteWidgetIds.has(id));
            return (
              <div className="w-full text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700">Also delete these widgets:</span>
                  <button
                    type="button"
                    onClick={() => setDeleteWidgetIds(allSelected ? new Set() : new Set(allIds))}
                    className="text-xs font-semibold text-[#EC7D09] hover:opacity-80"
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                {/* Off default reasoning per-widget, not blanket — a widget might be shared
                    with another dashboard (e.g. a duplicate_widgets:false clone, or reused
                    manually), and there's no existing endpoint to check that automatically —
                    see confirmDelete's own doc comment. Picking exactly which ones is safer
                    than an all-or-nothing toggle. */}
                <div className="mt-1.5 flex flex-col gap-1 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2">
                  {deletableWidgets.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={deleteWidgetIds.has(w.id)}
                        onChange={(e) => setDeleteWidgetIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(w.id); else next.delete(w.id);
                          return next;
                        })}
                      />
                      <span className="truncate">{w.title}</span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Unchecked widgets stay in the Chart Library, reusable elsewhere. Checked ones are permanently deleted too — only safe if they aren't used on any OTHER dashboard.
                </div>
              </div>
            );
          })()}
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={() => setDeleteModalOpen(false)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: '#b91c1c' }}
          >
            Delete
          </button>
        </div>
      </FormModal>

      <ConfirmModal
        isOpen={!!pendingNewDashboardConfirm}
        title="Unsaved Changes"
        message={pendingNewDashboardConfirm?.message}
        onCancel={() => setPendingNewDashboardConfirm(null)}
        onConfirm={() => { setPendingNewDashboardConfirm(null); startNewDashboard(); }}
      />

      {/* Per the backend team's own note on the `duplicate_widgets` clone param (dashboard-
          level, not per-widget) — asks up front rather than always defaulting to the
          shared-reference behavior silently. */}
      <ConfirmModal
        isOpen={!!cloneTarget}
        title="Clone Dashboard"
        confirmLabel="Clone"
        message={(
          <>
            <p>Clone "{cloneTarget?.name}"?</p>
            {/* Defaults to the next free "<base name> (N)" (see nextCopyName) rather than
                always "(Copy)" — cloning the same dashboard repeatedly used to suggest the
                identical name every time, so a second/third clone needed a manual rename
                anyway just to tell them apart in the list. Still freely editable here — this
                is just a smarter starting point, not a forced scheme. */}
            <label className="mt-3 flex flex-col gap-1 text-sm text-slate-700">
              New dashboard name
              <input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={cloneDuplicateWidgets}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCloneDuplicateWidgets(checked);
                  // Only fetched once actually needed (unchecked = shared references, no new
                  // widgets ever get created, so there's nothing to suggest names for).
                  if (checked && cloneTarget) loadCloneWidgetNameSuggestions(cloneTarget);
                }}
              />
              <span>
                Also duplicate all widgets (make them independent)
                <span className="block text-xs text-slate-400">
                  Off: the clone shares this dashboard's widgets — editing one edits both. On: the clone gets its own copy of every widget.
                </span>
              </span>
            </label>
            {/* Per-widget name overrides — same "smarter default, freely editable" pattern as
                the dashboard name above, just one row per widget instead of one field. Only
                shown once duplicate_widgets is on, since that's the only case where NEW widget
                records (needing their own name) actually get created at all. */}
            {cloneDuplicateWidgets && (
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="text-sm text-slate-700">Widget names</span>
                {cloneWidgetNamesLoading ? (
                  <div className="text-xs text-slate-400 px-1 py-2">Loading suggested names…</div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto border border-slate-100 rounded-lg p-2">
                    {(cloneTarget?.layout || [])
                      .filter((l) => cloneTarget.widgets?.[l.i]?.dataSource?.type === 'chartLibrary')
                      .map((l) => (
                        <label key={l.i} className="flex items-center gap-2 text-xs text-slate-500">
                          {/* 40/60 split via flex-grow ratios (basis-0 so the ratio applies to
                              the row's full width, not just space left after each element's
                              own content width) rather than a fixed w-28 label — matches the
                              requested proportion instead of an arbitrary fixed pixel width. */}
                          <span className="basis-0 grow-[2] min-w-0 truncate" title={cloneTarget.widgets[l.i].title}>
                            {cloneTarget.widgets[l.i].title}
                          </span>
                          <input
                            type="text"
                            value={cloneWidgetNames[l.i] ?? ''}
                            onChange={(e) => setCloneWidgetNames((prev) => ({ ...prev, [l.i]: e.target.value }))}
                            className="basis-0 grow-[3] min-w-0 px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-700"
                          />
                        </label>
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        onCancel={() => setCloneTarget(null)}
        onConfirm={() => { cloneDashboard(cloneTarget, cloneDuplicateWidgets, cloneName.trim(), cloneWidgetNames); setCloneTarget(null); }}
      />
    </div>
  );
};

export default DashboardBuilder;
