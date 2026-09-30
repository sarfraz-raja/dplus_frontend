import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import DashboardCanvasEditor from './DashboardCanvasEditor';
import { getDashboardDetail } from '../../../store/actions/dashboardBuilder-actions';
import { buildLocalLayoutAndWidgets } from './buildLocalLayoutAndWidgets';

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
export default function EmbeddedDashboard({ dashboardId, height }) {
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

  const { widgets: localWidgets, layout, tabs } = buildLocalLayoutAndWidgets(state.widgets, state.dashboard.layout);

  return (
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
        editable={false}
      />
    </div>
  );
}
