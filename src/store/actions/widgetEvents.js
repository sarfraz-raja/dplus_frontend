/**
 * DashboardBuilder keeps two independent chart-library list caches — ChartLibrary.jsx's own
 * `widgets` (Charts tab) and DashboardCanvasEditor.jsx's `chartLibraryList` ("Your Charts"
 * panel) — both fetched via listWidgets(). Both components are always mounted simultaneously
 * (ChartLibrary stays alive, just hidden via CSS, while a dashboard is being edited — see
 * DashboardBuilder.jsx), so a create/update/delete/duplicate in one left the other's cache
 * silently stale until its owning component happened to remount or manually refetch. Same
 * minimal pub-sub as datasourceEvents.js, applied to the same class of problem: any component
 * that mutates a widget notifies, every component holding a widget list cache refetches.
 */
//
// Payload `{ source, list }` (both optional): `source` is the notifying component's own token,
// so it can skip its own notification (it has just refreshed itself — reacting again fetched the
// same list twice); `list` is the freshly fetched GET /widgets result, so other listeners can use
// it instead of each fetching the identical ~180 kB list again. No list → listeners refetch.
const listeners = new Set();

export function subscribeWidgetsChanged(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notifyWidgetsChanged({ source, list } = {}) {
  listeners.forEach((cb) => cb({ source, list }));
}
