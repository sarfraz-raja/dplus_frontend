/**
 * DashboardBuilder has no shared store for datasources — ChartLibrary.jsx, WidgetCreateWizard.jsx
 * and DatasourceManager.jsx each keep their own local list fetched via listDatasources(). Without
 * this, a datasource registered in one component (e.g. DatasourceManager) never shows up in the
 * others' dropdowns until a full page reload. This is a minimal pub-sub so any component that
 * creates a datasource can notify the rest to refetch.
 */
const listeners = new Set();

export function subscribeDatasourcesChanged(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notifyDatasourcesChanged() {
  listeners.forEach((cb) => cb());
}
