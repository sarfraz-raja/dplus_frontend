// Widget click-to-navigate ("Link to"). A placement's own `link` (widgets[id].link) rides along
// in its dashboard.layout entry like `title` (see buildLocalLayoutAndWidgets + handleSave in
// pages/DashboardBuilder.jsx) — per placement, not on the chart, since a tab only exists inside
// one dashboard. Followed on double-click in read-only views only (never while editing).
//
// Shapes:
//   { kind: 'tab', tabId, carry: 'none' | 'value' }
//     carry 'value' → the double-clicked point's {column, value} becomes the active cross-filter
//     on the target tab's matching widgets (same datasource + column, like cross-filter itself).
//   { kind: 'dashboard', dashboardId, dashboardName, tabId?, carry, newWindow }
//     carry 'none' | 'value' | 'filters' | 'value+filters' — opens the deep link
//     /dashboard-builder?d=…&tab=…&filters=…&merge=1 (see dashboardLinkUrl). `dashboardName` is
//     a snapshot for the hover hint (read-only views don't have the dashboard list).
//     `newWindow` defaults to true (a new browser tab).

// A second click on the same widget within this window counts as a double-click. Single-click
// actions (drill / cross-filter) on a LINKED widget wait this long; unlinked widgets don't.
export const DOUBLE_CLICK_MS = 250;

// Chart types whose render emits per-point clicks (renderChartWidget's handlePointClick) — only
// these can pass the clicked value on. Everything else (KPI, Gauge, Table, …) links tile-wide.
export const LINK_POINT_CHART_TYPES = new Set([
  'BAR', 'AREA', 'LINE', 'PIE', 'HORIZONTAL_BAR', 'STACKED_BAR', 'FUNNEL', 'WATERFALL', 'TREEMAP', 'HEAT_MAP',
]);

// The widget's link when its target can be followed, else null (a deleted target tab disables the
// click instead of failing — the editor shows "Link target missing"). A deleted target DASHBOARD
// can't be known here (no list in read-only views) — the deep link itself reports it on arrival.
// `targetName` is what the hover hint names.
export function resolveWidgetLink(widget, tabs = []) {
  const link = widget?.link;
  if (link?.kind === 'dashboard') {
    return link.dashboardId ? { ...link, targetName: link.dashboardName || 'the linked dashboard' } : null;
  }
  if (link?.kind !== 'tab' || !link.tabId) return null;
  const tab = tabs.find((t) => t.id === link.tabId);
  // OLD: return tab ? { ...link, tabName: tab.name } : null;
  return tab ? { ...link, tabName: tab.name, targetName: tab.name } : null;
}

const hasFilterValue = (f) => !(f.value === undefined || f.value === null || f.value === ''
  || (Array.isArray(f.value) && f.value.length === 0));

// Deep link for a 'dashboard' link. `dashboardFilters`: the source dashboard's current filter rows
// (unresolved — a "Last 7 days" stays relative); `point`: the double-clicked {column, value}, if any.
// Filters are sent with merge=1: they override the target's saved filters column by column and the
// rest of the target's saved filters stay (EmbeddedDashboard's deep-link merge).
// `fromDashboardId` (same-window links only): the source dashboard, sent as `from` — the target's
// fullscreen view shows "← Back to <source>" for it (pages/DashboardBuilder.jsx).
// OLD: export function dashboardLinkUrl(link, { dashboardFilters = [], point = null } = {}) {
export function dashboardLinkUrl(link, { dashboardFilters = [], point = null, fromDashboardId = null } = {}) {
  const params = new URLSearchParams({ d: String(link.dashboardId) });
  if (link.tabId) params.set('tab', link.tabId);
  if (fromDashboardId) params.set('from', String(fromDashboardId));
  let rows = [];
  if (link.carry === 'filters' || link.carry === 'value+filters') rows = dashboardFilters.filter(hasFilterValue);
  if ((link.carry === 'value' || link.carry === 'value+filters') && point?.column) {
    rows = [...rows.filter((f) => f.column !== point.column), { column: point.column, operator: '=', value: point.value }];
  }
  if (rows.length) {
    params.set('filters', JSON.stringify(rows));
    params.set('merge', '1');
  }
  return `/dashboard-builder?${params.toString()}`;
}
