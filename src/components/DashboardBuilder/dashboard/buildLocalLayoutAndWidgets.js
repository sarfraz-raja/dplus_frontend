// Turns a backend {dashboard, attachedWidgets} response into DashboardCanvasEditor's own local
// {widgets, layout, tabs} shape — the single source of truth for that mapping, shared by every
// caller that needs it (pages/DashboardBuilder.jsx's own preview/edit hydration, and
// EmbeddedDashboard.jsx's read-only embed/fullscreen-preview path).
//
// This used to be two separately hand-written, drifted-apart copies — EmbeddedDashboard's own
// copy was missing datasourceId (breaks cross-filter's "same datasource" match), the entire
// Text Box/Shape reconstruction, the entire Slicer reconstruction, tabId propagation, AND
// (most visibly) silently hardcoded every widget's style to `{}`, dropping every per-widget
// style override — gradient backgrounds, custom colors, everything — the moment a dashboard was
// viewed through EmbeddedDashboard (the Dashboard Builder's own "fullscreen preview" button, and
// any real external embed, e.g. Insights Engine's DynamicInsightsDashboard). See the
// conversation this was extracted in. One shared function now, so the two paths can't drift
// apart again.

// Text Box/Shape have no datasource to speak of (dataShape: null in widgetTypeRegistry.js), so
// their *entire* definition is just their style object — small enough to piggyback directly on
// dashboard.layout, the same free-form JSON array that already reliably round-trips per-chart
// style through PATCH /dashboards/{id}, with no new backend endpoint needed.
export const LOCAL_PERSISTABLE_TYPES = new Set(['textBox', 'shape']);

// Dashboard tabs are a purely frontend concept (no dedicated backend field) — the tabs list
// piggybacks on dashboard.layout the same way Text Box/Shape/Slicer tiles already do, as one
// extra entry keyed by this reserved id. None of buildLocalLayoutAndWidgets' own per-type loops
// below match it (it has no `type` any of them check for), so it's automatically skipped when
// reconstructing widgets/layout — only read here, explicitly, for its `tabs` array.
export const TABS_SENTINEL_ID = '__dbe_tabs__';

export function buildLocalLayoutAndWidgets(attachedWidgets, dashboardLayout) {
  const layoutByLocalId = Object.fromEntries((dashboardLayout || []).map((l) => [l.i, l]));
  const widgets = {};
  const layout = [];
  (attachedWidgets || []).forEach((w, idx) => {
    const localId = `w_${w.id}`;
    const fromDashboardLayout = layoutByLocalId[localId];
    widgets[localId] = {
      type: 'chartLibrary',
      title: w.name || 'Widget',
      // `datasource_id` is needed for cross-filtering's "same datasourceId" match strictness
      // (DashboardCanvasEditor.jsx's handleWidgetPointClickRef) — without it, every widget
      // loaded from a saved dashboard silently had no datasourceId at all (only widgets
      // freshly added in the current editing session got one, via addWidget's later async
      // updateWidget call), making that safety check permanently inert for real dashboards.
      dataSource: { type: 'chartLibrary', widgetId: w.id, chartType: w.chart_type, mapping: w.mapping, datasourceId: w.datasource_id },
      // Per-placement style has no dedicated backend field — it rides along inside each
      // dashboard.layout entry (see handleSave below), the same JSON array that already
      // reliably round-trips position via PATCH /dashboards/{id}. Without this, every
      // save-then-refetch silently reset every real widget's style back to {}.
      style: fromDashboardLayout?.style || {},
    };
    const pos = fromDashboardLayout || w.position || {};
    layout.push({
      i: localId,
      x: pos.x ?? (idx % 3) * 12,
      y: pos.y ?? Math.floor(idx / 3) * 8,
      w: pos.w ?? 12,
      h: pos.h ?? 8,
    });
  });
  // Text Box/Shape entries — reconstructed straight from dashboard.layout itself, since
  // they're not in `attachedWidgets` (they're not real Chart Library widgets at all — see
  // LOCAL_PERSISTABLE_TYPES' own doc comment above). Each was saved with its own `type` and
  // `title` riding along in the same layout entry (see handleSave's layoutWithStyle), so this
  // is the exact inverse of that save step.
  (dashboardLayout || []).forEach((l) => {
    if (widgets[l.i] || !LOCAL_PERSISTABLE_TYPES.has(l.type)) return;
    widgets[l.i] = { type: l.type, title: l.title || l.type, dataSource: null, style: l.style || {} };
    layout.push({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h });
  });
  // Slicer entries — unlike Text Box/Shape, a slicer IS a real backend resource of its own
  // (createSlicer/listSlicers in dashboardBuilder-actions.js), but the grid *tile* placing it
  // on this dashboard was only ever local editor state, with nothing writing it into
  // dashboard.layout — so a freshly added slicer would vanish after Save + reload even though
  // its backend record (and selected values) survived fine. Same piggyback fix as Text Box/
  // Shape: `slicerId` rides along in the layout entry (see handleSave's layoutWithStyle),
  // reconstructed here into a `dataSource: {type:'slicer', slicerId}` tile — DashboardCanvasEditor's
  // own `listSlicers(backendId)` effect fetches the slicer's live data separately and matches
  // it back up by this same id.
  (dashboardLayout || []).forEach((l) => {
    if (widgets[l.i] || l.type !== 'slicer' || !l.slicerId) return;
    widgets[l.i] = { type: 'slicer', title: l.title || 'Slicer', dataSource: { type: 'slicer', slicerId: l.slicerId }, style: {} };
    layout.push({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h });
  });
  // Every entry (real widget/textBox/shape/slicer) also carries a `tabId` when it was placed
  // on a specific tab (see handleSave's layoutWithStyle, which writes it) — copy it through
  // here in one pass rather than repeating the same lookup in each push above.
  for (let i = 0; i < layout.length; i += 1) {
    const original = layoutByLocalId[layout[i].i];
    if (original?.tabId) layout[i] = { ...layout[i], tabId: original.tabId };
  }
  const tabsEntry = layoutByLocalId[TABS_SENTINEL_ID];
  const tabs = Array.isArray(tabsEntry?.tabs) ? tabsEntry.tabs : [];
  return { widgets, layout, tabs };
}
