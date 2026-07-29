import Api from "../../utils/api";
import { Urls } from "../../utils/url";

/**
 * Dashboard Builder's own datasource namespace (/dashboard-builder/*) — separate from
 * /querybuilder/*, and the database itself is fixed for now (no per-datasource connection
 * selection). Plain async functions (not redux actions, unlike kpiEngine-actions.js) since
 * the Dashboard Builder feature is entirely component-local state, not redux — matches how
 * DashboardBuilder.jsx/DashboardCanvasEditor.jsx are already built.
 *
 * Only /preview is confirmed against a real backend response so far. Its response shape
 * (verified against a real sample):
 *   { data: { columns: [{ column_name, data_type, is_dimension, is_measure,
 *              default_aggregation, display_name, filterable, sortable, searchable,
 *              visible, nullable, ordinal_position }], sample_rows: [...] },
 *     msg, status }
 */

/**
 * Datasources are registered one of two mutually-exclusive ways (per the API doc):
 * query-backed (`sql_query`) or table-backed (`schema_name`+`table_name`). Both
 * previewDatasource and registerDatasource accept the same `{sqlQuery} | {schemaName,
 * tableName}` shape and build the right request body here, in one place, so the two ways
 * of specifying a source can't silently drift apart between the two call sites. `sqlQuery`
 * wins if somehow both are populated (matches the backend's own stated priority).
 */
function sourceBody({ sqlQuery, schemaName, tableName }) {
  if (sqlQuery && sqlQuery.trim()) return { sql_query: sqlQuery };
  return { schema_name: schemaName, table_name: tableName };
}

/** Throws on failure (network error, non-200, unexpected shape) — callers should catch and
 * surface the message, not silently swallow it, since a broken preview means the user can't
 * tell if their SQL/table choice is valid. `source` is `{sqlQuery}` or `{schemaName,
 * tableName}` — see sourceBody. */
export async function previewDatasource(source) {
  const res = await Api.post({
    url: Urls.dashboardBuilder_previewDatasource,
    data: sourceBody(source),
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Preview failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!body || !Array.isArray(body.columns)) {
    throw new Error("Unexpected response shape from /dashboard-builder/datasources/preview (see console).");
  }
  return { columns: body.columns, sampleRows: body.sample_rows || [] };
}

/**
 * Persists a datasource for real (unlike /preview, which is a dry run — nothing saved).
 * Same source shape as previewDatasource (`{sqlQuery}` or `{schemaName, tableName}`), plus
 * a required unique `name` and optional `description`. Always call previewDatasource first
 * in the UI so the user has already seen the columns/sample before this call — this
 * function doesn't re-validate that for you.
 *
 * Two specific error statuses the backend defines (call sites should show these, not a
 * generic "failed" message): 409 = name already taken, 422 = the query/table produced no
 * discoverable columns (e.g. an empty result set).
 */
export async function registerDatasource({ name, description, ...source }) {
  const res = await Api.post({
    url: Urls.dashboardBuilder_datasources,
    data: { name, description, ...sourceBody(source) },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status === 409) {
    throw new Error(`A datasource named "${name}" already exists — pick a different name.`);
  }
  if (res.status === 422) {
    throw new Error("No columns could be discovered from this query/table — check it returns at least one row.");
  }
  if (res.status !== 201) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Register failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!body?.datasource) {
    throw new Error("Unexpected response shape from POST /dashboard-builder/datasources (see console).");
  }
  return { datasource: body.datasource, columns: body.columns || [] };
}

/**
 * Lists every registered (non-deleted) datasource — summary rows only (`id`, `name`,
 * `source_type`), not their columns. This is deliberately lightweight: it's what powers the
 * "pick a datasource" dropdown/list, which shouldn't need to fetch every datasource's full
 * column metadata just to show a name. Use getDatasourceDetail (next piece) when you need a
 * specific datasource's columns — e.g. right before rendering its mapping form.
 */
export async function listDatasources() {
  const res = await Api.get({ url: Urls.dashboardBuilder_datasources });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `List failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!Array.isArray(body)) {
    throw new Error("Unexpected response shape from GET /dashboard-builder/datasources (see console).");
  }
  return body;
}

/**
 * Fetches one datasource's full detail — the record itself plus its complete column
 * metadata (the `is_dimension`/`is_measure`/`default_aggregation`/etc. per column). This is
 * what actually populates a chart's mapping form once a datasource has been picked from the
 * list — `listDatasources()` alone isn't enough for that, it deliberately omits columns.
 *
 * No separate Urls entry for this — the id is appended to the same base URL
 * (dashboardBuilder_datasources) used for list/register, matching how this codebase already
 * builds other id-parameterized URLs inline (e.g. kpiEngine-actions.js's getLiveMonitoring).
 */
export async function getDatasourceDetail(id) {
  const res = await Api.get({ url: `${Urls.dashboardBuilder_datasources}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Fetching datasource ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!body?.datasource || !Array.isArray(body.columns)) {
    throw new Error(`Unexpected response shape from GET /dashboard-builder/datasources/${id} (see console).`);
  }
  return { datasource: body.datasource, columns: body.columns };
}

/**
 * Soft-deletes a datasource (the backend sets `deleted = TRUE`, doesn't drop the underlying
 * table/view — per the API doc). No response body to parse beyond the status/msg, unlike
 * the other calls here — this one only needs to succeed or throw.
 */
export async function deleteDatasource(id) {
  const res = await Api.delete({ url: `${Urls.dashboardBuilder_datasources}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Deleting datasource ${id} failed with status ${res.status}.`);
  }
}

/**
 * Re-discovers columns from the datasource's underlying table/query and syncs the stored
 * column list — per the API doc: updates data_type/ordinal_position for columns that still
 * exist (keeps manual overrides like display_name), adds newly-found columns, removes ones
 * no longer present. This does NOT change the datasource's own name/sql_query — there is no
 * endpoint for that (see the "how is editing working" discussion — a datasource's query is
 * fixed once registered; only its *discovered schema* can be re-synced, via this call, or
 * individual columns' metadata edited via updateDatasourceColumn, not yet implemented).
 *
 * Same response shape as getDatasourceDetail ({datasource, columns}), so a caller can just
 * feed the result straight back into the same state that fetch already populates.
 */
export async function refreshDatasourceSchema(id) {
  const res = await Api.post({ url: `${Urls.dashboardBuilder_datasources}/${id}/refresh-schema` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Refreshing schema for datasource ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!body?.datasource || !Array.isArray(body.columns)) {
    throw new Error(`Unexpected response shape from POST /dashboard-builder/datasources/${id}/refresh-schema (see console).`);
  }
  return { datasource: body.datasource, columns: body.columns };
}

/**
 * Overrides one column's metadata — the actual "editing" available for a datasource, since
 * the datasource's own name/query can't be changed (see refreshDatasourceSchema's comment).
 * `patch` should only contain the fields being changed (all optional per the API doc):
 * display_name, is_dimension, is_measure, default_aggregation, filterable, sortable,
 * searchable, visible. Response is the *whole updated columns list* for the datasource, not
 * just the one column — so a caller can replace its entire columns state with the result
 * directly, same as refreshDatasourceSchema's response is used.
 */
export async function updateDatasourceColumn(datasourceId, columnId, patch) {
  const res = await Api.patch({
    url: `${Urls.dashboardBuilder_datasources}/${datasourceId}/columns/${columnId}`,
    data: patch,
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Updating column ${columnId} failed with status ${res.status}.`);
  }
  const columns = res.data?.data;
  if (!Array.isArray(columns)) {
    throw new Error(`Unexpected response shape from PATCH .../columns/${columnId} (see console).`);
  }
  return columns;
}

/**
 * Re-runs a small LIMIT-10 sample query against a datasource's *live* current data. This is
 * the piece getDatasourceDetail is missing — detail gives full column metadata but no rows,
 * so this is how a saved datasource's data gets previewed again after the fact (e.g. to
 * check it still looks right after refreshDatasourceSchema, or just to eyeball current
 * values without re-typing the SQL).
 *
 * Response shape differs slightly from preview/register's: `columns` here is a plain array
 * of column-name strings (not full metadata objects), and rows is the key (not sample_rows)
 * — per the API doc's example: { columns: ["id","rolename"], rows: [...] }. Kept as its own
 * distinct return shape rather than force-fitting it into previewDatasource's {columns,
 * sampleRows} shape, since the columns array genuinely means something different here.
 */
export async function sampleDatasource(id) {
  const res = await Api.get({ url: `${Urls.dashboardBuilder_datasources}/${id}/sample` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Sampling datasource ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!Array.isArray(body?.columns) || !Array.isArray(body?.rows)) {
    throw new Error(`Unexpected response shape from GET /dashboard-builder/datasources/${id}/sample (see console).`);
  }
  return { columnNames: body.columns, rows: body.rows };
}

// ── Dashboards ──────────────────────────────────────────────────────────────────────
// A dashboard is just a container (name/description/layout/theme) — widgets are attached
// to it separately (see the "Widgets" / "Attachment" sections below), not created here.

/**
 * Creates a new, empty dashboard shell — no widgets yet, those get attached separately.
 * `layout` is a frontend-defined JSON array describing widget positions/sizes; safe to
 * omit/send [] at creation time since there are no widgets to position yet.
 */
export async function createDashboard({ name, description, layout, theme, global_filters, theme_id }) {
  const res = await Api.post({
    url: Urls.dashboardBuilder_dashboards,
    data: { name, description, layout, theme, global_filters, theme_id },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 201) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Creating dashboard failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!body?.dashboard) {
    throw new Error("Unexpected response shape from POST /dashboard-builder/dashboards (see console).");
  }
  return { dashboard: body.dashboard, widgets: body.widgets || [] };
}

/** Lists every backend-persisted dashboard (summary rows). */
export async function listDashboards() {
  const res = await Api.get({ url: Urls.dashboardBuilder_dashboards });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Listing dashboards failed with status ${res.status}.`);
  }
  const list = res.data?.data;
  if (!Array.isArray(list)) {
    throw new Error("Unexpected response shape from GET /dashboard-builder/dashboards (see console).");
  }
  return list;
}

/** Full detail for one dashboard, including its currently-attached widgets. */
export async function getDashboardDetail(id) {
  const res = await Api.get({ url: `${Urls.dashboardBuilder_dashboards}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Fetching dashboard ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  const dashboard = body?.dashboard || (body?.id ? body : null);
  if (!dashboard) {
    console.error(`[dashboardBuilder-actions] Unexpected GET /dashboards/${id} response:`, res.data);
    throw new Error(`Unexpected response shape from GET /dashboard-builder/dashboards/${id} (see console).`);
  }
  return { dashboard, widgets: body.widgets || [] };
}

/** Partial update — currently used for `name`/`layout`/`theme`/`global_filters` (Dashboard Builder's Save + Filters flows). */
export async function updateDashboard(id, { name, layout, theme, global_filters, theme_id } = {}) {
  const res = await Api.patch({
    url: `${Urls.dashboardBuilder_dashboards}/${id}`,
    data: { name, layout, theme, global_filters, theme_id },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Updating dashboard ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  // Some Dashboard Builder endpoints wrap as {dashboard: {...}}, others (like widget
  // creation) return the resource's fields flat on `data` with no wrapper key — PATCH's
  // actual shape wasn't confirmed live, so accept either instead of assuming the wrapper.
  const dashboard = body?.dashboard || (body?.id ? body : null);
  if (!dashboard) {
    console.error(`[dashboardBuilder-actions] Unexpected PATCH /dashboards/${id} response:`, res.data);
    throw new Error(`Unexpected response shape from PATCH /dashboard-builder/dashboards/${id} (see console).`);
  }
  return { dashboard, widgets: body.widgets || [] };
}

/** Named distinctly from DashboardBuilder.jsx's local-only `confirmDelete` — this is the backend call it invokes alongside the local removal. */
export async function deleteDashboardBackend(id) {
  const res = await Api.delete({ url: `${Urls.dashboardBuilder_dashboards}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200 && res.status !== 204) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Deleting dashboard ${id} failed with status ${res.status}.`);
  }
  return true;
}

/** Named distinctly from DashboardBuilder.jsx's local-only `cloneDashboard` — this is the backend call it invokes to get a fresh, distinct backend id for the clone. */
export async function cloneDashboardBackend(id, { name } = {}) {
  const res = await Api.post({
    url: `${Urls.dashboardBuilder_dashboards}/${id}/clone`,
    data: { name },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 201 && res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Cloning dashboard ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  const dashboard = body?.dashboard || (body?.id ? body : null);
  if (!dashboard) {
    console.error(`[dashboardBuilder-actions] Unexpected POST /dashboards/${id}/clone response:`, res.data);
    throw new Error(`Unexpected response shape from POST /dashboard-builder/dashboards/${id}/clone (see console).`);
  }
  return { dashboard, widgets: body.widgets || [] };
}

export async function publishDashboard(id) {
  const res = await Api.post({ url: `${Urls.dashboardBuilder_dashboards}/${id}/publish` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Publishing dashboard ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  return body?.dashboard || body;
}

// ── Widgets ─────────────────────────────────────────────────────────────────────────
// Widgets are their own standalone, globally-reusable resource (Superset-style) — creating
// one and attaching it to a dashboard is a single convenience call here, but the widget
// definition itself has no dashboard reference; attachment is a separate join-table concern.

/**
 * Creates a new widget definition AND attaches it to `dashboardId` with a layout `position`
 * in one call. `mapping` is validated server-side against the datasource's real discovered
 * columns — an invalid column name comes back as a 422.
 */
export async function createAndAttachWidget(dashboardId, { name, datasourceId, chartType, mapping, position }) {
  const res = await Api.post({
    url: `${Urls.dashboardBuilder_dashboards}/${dashboardId}/widgets`,
    data: {
      name,
      datasource_id: datasourceId,
      chart_type: chartType,
      mapping,
      position,
    },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 201) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Creating widget failed with status ${res.status}.`);
  }
  // Confirmed against a live response: unlike createDashboard's {dashboard: {...}} wrapper,
  // this endpoint returns the widget fields directly on `data` — no `widget` key.
  const widget = res.data?.data;
  if (!widget?.id) {
    throw new Error("Unexpected response shape from POST /dashboard-builder/dashboards/{id}/widgets (see console).");
  }
  return widget;
}

/** Attaches an EXISTING chart-library widget (by id) to a dashboard with a layout
 * `position` — the join-row concern only, doesn't touch the widget's own definition. */
export async function attachWidget(dashboardId, widgetId, position) {
  const res = await Api.post({
    url: `${Urls.dashboardBuilder_dashboards}/${dashboardId}/widgets`,
    data: { widget_id: widgetId, position },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 201) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Attaching widget failed with status ${res.status}.`);
  }
  const widget = res.data?.data;
  if (!widget?.id) {
    throw new Error("Unexpected response shape from POST /dashboard-builder/dashboards/{id}/widgets (see console).");
  }
  return widget;
}

// ── Runtime (chart data) ────────────────────────────────────────────────────────────
// Scoped through the dashboard (not the standalone /widgets/{id}/data variant) since it
// 404s if the widget isn't actually attached to that dashboard — a useful sanity check.

/** Fetches one widget's rendered data. `filters`/`drillPath` are optional runtime overrides
 * on top of the widget's own saved mapping (see mapping.drill_down for the column hierarchy). */
export async function getWidgetData(dashboardId, widgetId, { filters, drillPath } = {}) {
  const res = await Api.post({
    url: `${Urls.dashboardBuilder_dashboards}/${dashboardId}/widgets/${widgetId}/data`,
    data: { filters, drill_path: drillPath },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Fetching widget data failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!Array.isArray(body?.columns) || !Array.isArray(body?.rows)) {
    throw new Error(`Unexpected response shape from POST /dashboard-builder/dashboards/{id}/widgets/{id}/data (see console).`);
  }
  return { widget: body.widget, columns: body.columns, rows: body.rows };
}

/**
 * Loads data for every widget attached to a dashboard in one call — each widget's status is
 * isolated, so one bad query never blocks the rest (see `widgets` shape below).
 *
 * `filters` is an explicit one-off override for this call only — it never touches what's
 * saved on the dashboard. Omit it entirely (don't pass an empty object's `filters` key) to
 * have the backend auto-apply the dashboard's own saved `global_filters` instead; pass `[]`
 * explicitly to force no filters for this one call regardless of what's saved.
 */
export async function getDashboardData(dashboardId, { filters } = {}) {
  const res = await Api.post({
    url: `${Urls.dashboardBuilder_dashboards}/${dashboardId}/data`,
    data: filters !== undefined ? { filters } : {},
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Fetching dashboard data failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!body?.dashboard || !body?.widgets) {
    console.error(`[dashboardBuilder-actions] Unexpected POST /dashboards/${dashboardId}/data response:`, res.data);
    throw new Error(`Unexpected response shape from POST /dashboard-builder/dashboards/${dashboardId}/data (see console).`);
  }
  // `widgets` is keyed by widget id: { [widgetId]: {status, data:{widget,columns,rows}} | {status, msg} }
  return { dashboard: body.dashboard, widgets: body.widgets };
}

// ── Standalone widgets (the reusable chart library) ─────────────────────────────────
// These hit /widgets directly (not /dashboards/{id}/widgets) — a widget created here has
// no dashboard attached yet; it's a chart definition that can later be attached to one or
// more dashboards via createAndAttachWidget-style join rows.

/** Creates a widget with no dashboard attachment — pure chart-library entry. */
export async function createWidget({ name, datasourceId, chartType, mapping }) {
  const res = await Api.post({
    url: Urls.dashboardBuilder_widgets,
    data: { name, datasource_id: datasourceId, chart_type: chartType, mapping },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 201) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Creating widget failed with status ${res.status}.`);
  }
  const widget = res.data?.data;
  if (!widget?.id) {
    throw new Error("Unexpected response shape from POST /dashboard-builder/widgets (see console).");
  }
  return widget;
}

/** Lists every widget in the reusable chart library. */
export async function listWidgets() {
  const res = await Api.get({ url: Urls.dashboardBuilder_widgets });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Listing widgets failed with status ${res.status}.`);
  }
  const list = res.data?.data;
  if (!Array.isArray(list)) {
    throw new Error("Unexpected response shape from GET /dashboard-builder/widgets (see console).");
  }
  return list;
}

/** Full detail for one widget (name/datasource/chart_type/mapping). */
export async function getWidgetDetail(id) {
  const res = await Api.get({ url: `${Urls.dashboardBuilder_widgets}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Fetching widget ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  const widget = body?.widget || (body?.id ? body : null);
  if (!widget) {
    // eslint-disable-next-line no-console
    console.error(`GET /dashboard-builder/widgets/${id} — unexpected response body:`, res.data);
    throw new Error(`Unexpected response shape from GET /dashboard-builder/widgets/${id} (see console).`);
  }
  return widget;
}

/** Edits a widget's shared definition — reflected on every dashboard it's attached to. */
export async function updateWidget(id, patch) {
  const res = await Api.patch({ url: `${Urls.dashboardBuilder_widgets}/${id}`, data: patch });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Updating widget ${id} failed with status ${res.status}.`);
  }
  const widget = res.data?.data;
  if (!widget?.id) {
    throw new Error(`Unexpected response shape from PATCH /dashboard-builder/widgets/${id} (see console).`);
  }
  return widget;
}

/** Deletes a widget everywhere — every dashboard it was attached to loses it too. */
export async function deleteWidget(id) {
  const res = await Api.delete({ url: `${Urls.dashboardBuilder_widgets}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Deleting widget ${id} failed with status ${res.status}.`);
  }
}

// ── Themes (Phase 19b — reusable dashboard-level styling) ───────────────────────────
// Confirmed live against the backend dev's own API doc — response shapes below match
// exactly. Mirrors the Widgets pattern above 1:1: a Theme is its own standalone, globally
// reusable resource with its own id; binding one to a dashboard is a plain `theme_id` field
// on the dashboard (not a join table like widgets — a dashboard binds at most one Theme at a
// time). Deleting a Theme that's bound to dashboards auto-nulls their `theme_id` server-side
// (no dangling reference, no frontend cascade handling needed) — same behavior as detaching
// a widget. Sending an invalid/non-existent theme_id to createDashboard/updateDashboard
// returns a clean 404 rather than silently saving garbage.

/** Creates a new reusable Theme (`{name, style}` — `style` is the same shape as
 * dashboard.theme's local-override object, see DashboardCanvasEditor.jsx's DASHBOARD_STYLE_FIELDS). */
export async function createTheme({ name, style }) {
  const res = await Api.post({
    url: Urls.dashboardBuilder_themes,
    data: { name, style },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 201) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Creating theme failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  const theme = body?.theme || (body?.id ? body : null);
  if (!theme) {
    console.error('[dashboardBuilder-actions] Unexpected POST /themes response:', res.data);
    throw new Error("Unexpected response shape from POST /dashboard-builder/themes (see console).");
  }
  return theme;
}

/** Lists every reusable Theme (summary rows). */
export async function listThemes() {
  const res = await Api.get({ url: Urls.dashboardBuilder_themes });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Listing themes failed with status ${res.status}.`);
  }
  const list = res.data?.data;
  if (!Array.isArray(list)) {
    throw new Error("Unexpected response shape from GET /dashboard-builder/themes (see console).");
  }
  return list;
}

/** Full detail for one Theme (name/style). */
export async function getThemeDetail(id) {
  const res = await Api.get({ url: `${Urls.dashboardBuilder_themes}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Fetching theme ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  const theme = body?.theme || (body?.id ? body : null);
  if (!theme) {
    console.error(`[dashboardBuilder-actions] Unexpected GET /themes/${id} response:`, res.data);
    throw new Error(`Unexpected response shape from GET /dashboard-builder/themes/${id} (see console).`);
  }
  return theme;
}

/** Edits a Theme's shared definition — reflected on every dashboard bound to it via theme_id. */
export async function updateTheme(id, patch) {
  const res = await Api.patch({ url: `${Urls.dashboardBuilder_themes}/${id}`, data: patch });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Updating theme ${id} failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  const theme = body?.theme || (body?.id ? body : null);
  if (!theme) {
    throw new Error(`Unexpected response shape from PATCH /dashboard-builder/themes/${id} (see console).`);
  }
  return theme;
}

/** Deletes a Theme everywhere — every dashboard bound to it (theme_id) loses the binding too. */
export async function deleteTheme(id) {
  const res = await Api.delete({ url: `${Urls.dashboardBuilder_themes}/${id}` });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Deleting theme ${id} failed with status ${res.status}.`);
  }
}

/** Runs a widget's query independent of any dashboard — used for previewing in the library. */
export async function getStandaloneWidgetData(id, { filters, drillPath } = {}) {
  const res = await Api.post({
    url: `${Urls.dashboardBuilder_widgets}/${id}/data`,
    data: { filters, drill_path: drillPath },
  });
  if (!res) {
    throw new Error("Network error — could not reach the Dashboard Builder API (check connectivity/CORS).");
  }
  if (res.status !== 200) {
    const serverMsg = res.data?.msg || res.data?.message;
    throw new Error(serverMsg || `Fetching widget data failed with status ${res.status}.`);
  }
  const body = res.data?.data;
  if (!Array.isArray(body?.columns) || !Array.isArray(body?.rows)) {
    throw new Error(`Unexpected response shape from POST /dashboard-builder/widgets/${id}/data (see console).`);
  }
  return { widget: body.widget, columns: body.columns, rows: body.rows };
}
