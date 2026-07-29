// Registered "real" datasources (SQL + cached column metadata + cached sample_rows) —
// same localStorage-backed persistence pattern DashboardBuilder.jsx already uses for
// customDashboards, kept separate since a datasource is reusable across many dashboards.
// No backend save/list/delete endpoint is confirmed yet (see the plan's Phase 10 notes) —
// this is the stand-in until one exists, isolated behind this module so swapping to a real
// API later only means rewriting these functions, not every call site.

const STORAGE_KEY = 'dy3-dashboard-builder-datasources';

export function loadDatasources() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveDatasources(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    /* ignore */
  }
}

/** `datasource` is `{ name, sqlQuery, columns, sampleRows }` — columns/sampleRows are the
 * last successful /preview result, cached so the mapping form and client-side aggregation
 * (see resolveWidgetProps' 'db' case) don't need another round-trip just to list columns. */
export function upsertDatasource(datasource) {
  const list = loadDatasources();
  const id = datasource.id || `ds_${Date.now()}`;
  const record = { ...datasource, id, updatedAt: new Date().toISOString() };
  const idx = list.findIndex((d) => d.id === id);
  const next = idx >= 0 ? [...list.slice(0, idx), record, ...list.slice(idx + 1)] : [...list, record];
  saveDatasources(next);
  return record;
}

export function deleteDatasource(id) {
  saveDatasources(loadDatasources().filter((d) => d.id !== id));
}
