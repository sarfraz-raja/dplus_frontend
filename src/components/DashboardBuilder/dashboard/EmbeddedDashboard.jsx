import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import DashboardCanvasEditor from './DashboardCanvasEditor';
import { getDashboardDetail } from '../../../store/actions/dashboardBuilder-actions';
import { buildLocalLayoutAndWidgets } from './buildLocalLayoutAndWidgets';
import DashboardViewActions from './DashboardViewActions';

// Phase 18 B6 — lets another page link into a published dashboard pre-filtered, mirroring
// the existing TelecomMap.jsx -> Filtered-cell-dashboard pattern (?cell=X&filterId=Y) but
// simpler, since our backend takes filters directly as {column,operator,value} with no
// vendor-specific filter-id/state encoding to build. Two conventions, checked in this order:
//   ?filters=<URI-encoded JSON array>   — escape hatch for a non-'=' operator (range, IN, ...)
//   ?filter.<column>=<value>            — common single-value case, operator implicitly '='
// This is a one-off override for this view only — see getDashboardData's own doc comment —
// never persisted back to the dashboard's saved global_filters.
function parseDeepLinkFilters(search) {
  const params = new URLSearchParams(search);
  const rawFilters = params.get('filters');
  if (rawFilters) {
    try {
      const parsed = JSON.parse(rawFilters);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // fall through to the per-column convention below
    }
  }
  const filters = [];
  params.forEach((value, key) => {
    if (key.startsWith('filter.')) {
      filters.push({ column: key.slice('filter.'.length), operator: '=', value });
    }
  });
  return filters;
}

// Confirmed via a live POST /dashboards/{id}/data response — the field is `is_published`
// (a plain boolean), not `status`. Same helper as DashboardBuilder.jsx's own isPublished
// (kept local here to avoid a cross-page import).
function isPublished(dashboard) {
  return dashboard?.is_published === true;
}


/**
 * Read-only viewer for a single backend-persisted Dashboard Builder dashboard, given only
 * its id — for embedding into other pages (e.g. Insights Engine's DynamicInsightsDashboard).
 * Reuses DashboardCanvasEditor exactly the way DashboardBuilder.jsx's own preview panel does
 * (editable=false, initialName/initialLayout/initialWidgets) — no separate rendering path.
 *
 * UI-level gate only: refuses to render an unpublished dashboard's canvas, but this is not a
 * security boundary — any client holding a valid Bearer token can still call
 * getDashboardDetail directly. Real access control is a backend concern, out of scope here.
 */
// Auto-refresh: runs at the dashboard's saved default (layout settings sentinel) unless
// `autoRefreshSeconds` is passed (the fullscreen preview passes the viewer's session choice).
// `showRefreshControls` draws Refresh now + the interval picker above the canvas (fullscreen);
// a change goes to `onAutoRefreshChange`, or — with no such handler — stays local to this view.
// Toolbar (always, unless `toolbar={false}`): filter values (only when the dashboard has filters),
// then ↻ Refresh · Auto-refresh · Export — viewer features that need no setup. `fullscreen` (the
// builder's fullscreen preview) also gets the Filters setup button and leaves room for its fixed ✕.
// OLD: export default function EmbeddedDashboard({ dashboardId, height }) {
// OLD: export default function EmbeddedDashboard({ dashboardId, height, autoRefreshSeconds, showRefreshControls = false, onAutoRefreshChange }) {
export default function EmbeddedDashboard({ dashboardId, height, autoRefreshSeconds, toolbar = true, fullscreen = false, onAutoRefreshChange }) {
  const editorRef = useRef(null);
  const [refreshState, setRefreshState] = useState({ refreshing: false, lastRefreshedAt: null });
  const [localSeconds, setLocalSeconds] = useState(null);
  // With the top bar (`showRefreshControls`, fullscreen), filters move into it — same pair as the
  // preview header in DashboardBuilder.jsx (Filters button + value strip, via the editor's ref) —
  // instead of the editor's own strap, so fullscreen shows exactly what the preview shows.
  const [filterState, setFilterState] = useState({ filters: [], datasourceOptions: [] });
  const [state, setState] = useState({ loading: true, error: null, dashboard: null, widgets: null });
  const location = useLocation();
  const deepLinkFilters = useMemo(() => parseDeepLinkFilters(location.search), [location.search]);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, dashboard: null, widgets: null });
    getDashboardDetail(dashboardId)
      .then(({ dashboard, widgets }) => {
        if (cancelled) return;
        setState({ loading: false, error: null, dashboard, widgets });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ loading: false, error: e.message, dashboard: null, widgets: null });
      });
    return () => { cancelled = true; };
  }, [dashboardId]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-10">
        <Loader2 size={16} className="animate-spin" /> Loading dashboard…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-10 px-6">
        <AlertTriangle size={22} className="text-red-400" />
        <div className="text-sm font-medium text-red-500">Couldn't load this dashboard</div>
        <div className="text-xs text-slate-400">{state.error}</div>
      </div>
    );
  }

  if (!isPublished(state.dashboard)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-10 px-6">
        <AlertTriangle size={22} className="text-amber-400" />
        <div className="text-sm font-medium text-slate-600">This dashboard hasn't been published yet</div>
        <div className="text-xs text-slate-400">Publish it from the Dashboard Builder to make it visible here.</div>
      </div>
    );
  }

  // OLD: const { widgets: localWidgets, layout, tabs } = buildLocalLayoutAndWidgets(…);
  const { widgets: localWidgets, layout, tabs, settings } = buildLocalLayoutAndWidgets(state.widgets, state.dashboard.layout, state.dashboard.theme && typeof state.dashboard.theme === 'object' ? state.dashboard.theme : null);
  const seconds = autoRefreshSeconds !== undefined ? autoRefreshSeconds : (localSeconds ?? settings?.refreshInterval ?? 0);

  // Viewer toolbar — handed to the canvas as `titleBarActions`, so it sits on the dashboard title
  // line instead of its own row. OLD: a separate <div className="flex … pb-2"> row above the canvas.
  // OLD: the filter / refresh / auto-refresh / export markup was inline here — now the shared
  // DashboardViewActions (also used by the Dashboard Builder preview's title row).
  const titleBarActions = toolbar ? (
    <DashboardViewActions
      editorRef={editorRef}
      filterState={filterState}
      seconds={seconds}
      onSecondsChange={(sec) => (onAutoRefreshChange ? onAutoRefreshChange(sec) : setLocalSeconds(sec))}
      refreshState={refreshState}
      showFilterSetup={fullscreen}
      className={fullscreen ? 'pr-10' : ''}
    />
  ) : null;

  return (
    <>
    <div style={{ height: height || '100%' }}>
      <DashboardCanvasEditor
        key={dashboardId}
        backendId={dashboardId}
        initialGlobalFilters={state.dashboard.global_filters || []}
        deepLinkFilters={deepLinkFilters}
        initialName={state.dashboard.name}
        initialLayout={layout}
        initialWidgets={localWidgets}
        initialTabs={tabs}
        // Same reason as the builder preview: style/theme from the detail call, not after /data.
        initialDashboardStyle={state.dashboard.theme && typeof state.dashboard.theme === 'object' ? state.dashboard.theme : {}}
        initialThemeId={state.dashboard.theme_id || null}
        editable={false}
        ref={editorRef}
        // Filters live in the toolbar above when it's shown (same as the builder's preview header).
        showFiltersInline={!toolbar}
        onFiltersState={toolbar ? setFilterState : undefined}
        autoRefreshSeconds={seconds}
        onRefreshState={setRefreshState}
        titleBarActions={titleBarActions}
      />
    </div>
    </>
  );
}
