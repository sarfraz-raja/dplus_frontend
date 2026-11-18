import { TABS_SENTINEL_ID, SETTINGS_SENTINEL_ID, LOCAL_PERSISTABLE_TYPES } from '../dashboard/buildLocalLayoutAndWidgets';

// Dashboard export/import file ("bundle"): one dashboard as a self-contained JSON file that can
// be imported into any deployment of the Dashboard Builder. Full spec, and the rules for changing
// it: docs/DASHBOARD_IMPORT_EXPORT.md. The saved dashboard format it carries (layout entries,
// which ids point where): docs/DASHBOARD_LAYOUT_FORMAT.md.
//
// Records are carried almost as the backend stores them (snake_case, same field names), so the
// import endpoint can insert them directly. Every object's `ref` is its id on the instance it was
// exported from; `dashboard.layout`, filters and slicers keep pointing at those ids unchanged —
// they are only remapped to new ids at import time.
//
// {
//   format: 'dataplus-dashboard', version: 1, exported_at, source: { app, origin },
//   dashboard:   { ref, name, description, layout, theme, global_filters, theme_ref },
//   widgets:     [{ ref, name, chart_type, datasource_ref, mapping }],
//   datasources: [{ ref, name, description, source_type, schema_name, table_name, sql_query,
//                   columns: [{ column_name, display_name, data_type, … }],
//                   metrics: [{ name, expression, kind, is_measure, is_dimension, number_format }] }],
//   slicers:     [{ ref, datasource_ref, column_name, label, selected_values, tab_id }],
//   themes:      [{ ref, name, style }],
// }

export const BUNDLE_FORMAT = 'dataplus-dashboard';
// Bump when the bundle shape OR the saved layout/style shape inside it changes in a way an older
// file needs converting for, and add the step to MIGRATIONS below.
export const BUNDLE_VERSION = 1;
export const BUNDLE_FILE_SUFFIX = '.dashboard.json';

// MIGRATIONS[n] turns a version-n bundle into version n+1. Run in order by migrateBundle, so
// a file from any older version is brought up to BUNDLE_VERSION one step at a time. Each step
// only converts — it never drops data it doesn't understand.
const MIGRATIONS = {
  // 1: (bundle) => ({ ...bundle, version: 2, … }),
};

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

// Every id a saved layout points at (see "IDs a copy must remap" in DASHBOARD_LAYOUT_FORMAT.md).
// Used to check a bundle is complete, and by export / import to know what to carry and remap.
export function layoutReferences(layout) {
  const refs = { widgetRefs: [], slicerRefs: [], datasourceRefs: [], dashboardLinks: [], tabIds: [], usedTabIds: [] };
  (Array.isArray(layout) ? layout : []).forEach((l) => {
    if (!isObject(l)) return;
    if (l.i === TABS_SENTINEL_ID) {
      (Array.isArray(l.tabs) ? l.tabs : []).forEach((t) => { if (t?.id) refs.tabIds.push(t.id); });
      return;
    }
    if (l.i === SETTINGS_SENTINEL_ID) return;
    if (l.tabId) refs.usedTabIds.push(l.tabId);
    if (l.type === 'slicer') {
      if (l.slicerId) refs.slicerRefs.push(String(l.slicerId));
      return;
    }
    if (LOCAL_PERSISTABLE_TYPES.has(l.type)) return;
    if (typeof l.i === 'string' && l.i.startsWith('w_')) refs.widgetRefs.push(l.i.slice(2));
    (Array.isArray(l.filters) ? l.filters : []).forEach((f) => { if (f?.datasource_id) refs.datasourceRefs.push(String(f.datasource_id)); });
    if (l.link?.kind === 'dashboard' && l.link.dashboardId) refs.dashboardLinks.push({ entry: l.i, dashboardId: String(l.link.dashboardId), dashboardName: l.link.dashboardName || '' });
    if (l.link?.kind === 'tab' && l.link.tabId) refs.usedTabIds.push(l.link.tabId);
  });
  return refs;
}

// Every datasource id a saved dashboard needs carried: its charts', its slicers', and the ones its
// dashboard and per-chart filters point at. Export fetches exactly these.
export function bundleDatasourceIds({ dashboard, widgets = [], slicers = [] }) {
  const ids = new Set();
  widgets.forEach((w) => { if (w?.datasource_id) ids.add(String(w.datasource_id)); });
  slicers.forEach((s) => { if (s?.datasource_id) ids.add(String(s.datasource_id)); });
  (dashboard?.global_filters || []).forEach((f) => { if (f?.datasource_id) ids.add(String(f.datasource_id)); });
  layoutReferences(dashboard?.layout).datasourceRefs.forEach((id) => ids.add(id));
  return [...ids];
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));
const DATASOURCE_KEYS = ['name', 'description', 'source_type', 'schema_name', 'table_name', 'sql_query'];
const COLUMN_KEYS = ['column_name', 'display_name', 'data_type', 'nullable', 'ordinal_position', 'is_dimension', 'is_measure', 'default_aggregation', 'filterable', 'sortable', 'searchable', 'visible'];
const METRIC_KEYS = ['name', 'expression', 'kind', 'is_measure', 'is_dimension', 'number_format'];
// No `position`: slicer tiles are placed by dashboard.layout, slicer.position is never read.
const SLICER_KEYS = ['column_name', 'label', 'selected_values', 'tab_id'];

// Backend records → a bundle (shape at the top of this file). Pure: export fetches, this assembles.
// `dashboard` / `widgets`: GET /dashboards/{id}; `datasources`: [{ datasource, columns, metrics }]
// (GET /datasources/{id}); `slicers`: GET /dashboards/{id}/slicers; `theme`: GET /themes/{id} or null.
// Only fields in the spec are kept — no row ids (other than as `ref`), owners, timestamps, cached values.
export function buildBundle({ dashboard, widgets = [], datasources = [], slicers = [], theme = null, origin = '' }) {
  return {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    exported_at: new Date().toISOString(),
    source: { app: 'dataplus', origin },
    dashboard: {
      ref: String(dashboard.id),
      name: dashboard.name,
      description: dashboard.description || '',
      layout: Array.isArray(dashboard.layout) ? dashboard.layout : [],
      theme: dashboard.theme ?? null,
      global_filters: Array.isArray(dashboard.global_filters) ? dashboard.global_filters : [],
      theme_ref: dashboard.theme_id ? String(dashboard.theme_id) : null,
    },
    widgets: widgets.map((w) => ({
      ref: String(w.id),
      name: w.name,
      chart_type: w.chart_type,
      datasource_ref: String(w.datasource_id),
      mapping: w.mapping || {},
    })),
    datasources: datasources.map(({ datasource, columns = [], metrics = [] }) => ({
      ref: String(datasource.id),
      ...pick(datasource, DATASOURCE_KEYS),
      columns: columns.map((c) => pick(c, COLUMN_KEYS)),
      metrics: metrics.map((m) => pick(m, METRIC_KEYS)),
    })),
    slicers: slicers.map((s) => ({ ref: String(s.id), datasource_ref: String(s.datasource_id), ...pick(s, SLICER_KEYS) })),
    themes: theme ? [{ ref: String(theme.id), name: theme.name, style: theme.style || {} }] : [],
  };
}

// Brings an older bundle up to BUNDLE_VERSION. Throws for a file made by a newer version of the
// app (it may hold settings this version can't show, so importing it would silently lose them).
export function migrateBundle(bundle) {
  let current = bundle;
  const applied = [];
  if (!Number.isInteger(current.version) || current.version < 1) {
    throw new Error('This file has no valid format version.');
  }
  if (current.version > BUNDLE_VERSION) {
    throw new Error(`This file was exported by a newer version of the Dashboard Builder (format v${current.version}; this one reads up to v${BUNDLE_VERSION}). Update this deployment first.`);
  }
  while (current.version < BUNDLE_VERSION) {
    const step = MIGRATIONS[current.version];
    if (!step) throw new Error(`No converter from format v${current.version} to v${current.version + 1}.`);
    const from = current.version;
    current = step(current);
    applied.push(`v${from} → v${current.version}`);
  }
  return { bundle: current, applied };
}

// Shape and completeness checks. `errors` block an import; `warnings` are things the import will
// fix up or drop (and should list in its summary). Each item: { code, message, path }.
export function validateBundle(bundle) {
  const errors = [];
  const warnings = [];
  const err = (code, message, path) => errors.push({ code, message, path });
  const warn = (code, message, path) => warnings.push({ code, message, path });

  if (!isObject(bundle)) {
    err('not_object', 'The file is not a dashboard export.', '');
    return { errors, warnings };
  }
  if (bundle.format !== BUNDLE_FORMAT) err('format', 'The file is not a Dashboard Builder export.', 'format');

  const d = bundle.dashboard;
  if (!isObject(d)) {
    err('dashboard_missing', 'The file has no dashboard in it.', 'dashboard');
    return { errors, warnings };
  }
  if (!nonEmptyString(d.name)) err('dashboard_name', 'The dashboard has no name.', 'dashboard.name');
  if (!Array.isArray(d.layout)) err('layout', 'The dashboard layout is missing or damaged.', 'dashboard.layout');
  if (d.global_filters !== undefined && !Array.isArray(d.global_filters)) err('global_filters', 'The dashboard filters are damaged.', 'dashboard.global_filters');

  const listOf = (key) => {
    const v = bundle[key];
    if (v === undefined) return [];
    if (!Array.isArray(v)) { err(`${key}_list`, `The ${key} list is damaged.`, key); return []; }
    return v;
  };
  const widgets = listOf('widgets');
  const datasources = listOf('datasources');
  const slicers = listOf('slicers');
  const themes = listOf('themes');

  // Refs must be present and unique within their list.
  const refSet = (list, key) => {
    const seen = new Set();
    list.forEach((item, idx) => {
      const ref = item?.ref == null ? '' : String(item.ref);
      if (!ref) err('ref_missing', `An item in ${key} has no reference id.`, `${key}[${idx}].ref`);
      else if (seen.has(ref)) err('ref_duplicate', `Two items in ${key} share the reference id "${ref}".`, `${key}[${idx}].ref`);
      seen.add(ref);
    });
    return seen;
  };
  const widgetRefs = refSet(widgets, 'widgets');
  const datasourceRefs = refSet(datasources, 'datasources');
  const slicerRefs = refSet(slicers, 'slicers');
  const themeRefs = refSet(themes, 'themes');

  datasources.forEach((ds, idx) => {
    const path = `datasources[${idx}]`;
    if (!nonEmptyString(ds?.name)) err('datasource_name', 'A datasource has no name.', `${path}.name`);
    if (!nonEmptyString(ds?.sql_query) && !(nonEmptyString(ds?.schema_name) && nonEmptyString(ds?.table_name))) {
      err('datasource_source', `Datasource "${ds?.name || '?'}" has neither a table nor a SQL query.`, path);
    }
    if (ds?.columns !== undefined && !Array.isArray(ds.columns)) err('datasource_columns', `Datasource "${ds?.name || '?'}" has a damaged column list.`, `${path}.columns`);
    if (ds?.metrics !== undefined && !Array.isArray(ds.metrics)) err('datasource_metrics', `Datasource "${ds?.name || '?'}" has a damaged metric list.`, `${path}.metrics`);
  });

  widgets.forEach((w, idx) => {
    const path = `widgets[${idx}]`;
    if (!nonEmptyString(w?.name)) err('widget_name', 'A chart has no name.', `${path}.name`);
    if (!nonEmptyString(w?.chart_type)) err('widget_type', `Chart "${w?.name || '?'}" has no chart type.`, `${path}.chart_type`);
    if (!datasourceRefs.has(String(w?.datasource_ref ?? ''))) err('widget_datasource', `Chart "${w?.name || '?'}" uses a datasource that isn't in the file.`, `${path}.datasource_ref`);
    if (w?.mapping !== undefined && !isObject(w.mapping)) err('widget_mapping', `Chart "${w?.name || '?'}" has damaged settings.`, `${path}.mapping`);
  });

  slicers.forEach((s, idx) => {
    const path = `slicers[${idx}]`;
    if (!nonEmptyString(s?.column_name)) err('slicer_column', 'A slicer has no column.', `${path}.column_name`);
    if (!datasourceRefs.has(String(s?.datasource_ref ?? ''))) err('slicer_datasource', `Slicer "${s?.label || s?.column_name || '?'}" uses a datasource that isn't in the file.`, `${path}.datasource_ref`);
  });

  themes.forEach((t, idx) => {
    if (!isObject(t?.style)) err('theme_style', `Theme "${t?.name || '?'}" has no style.`, `themes[${idx}].style`);
  });
  if (d.theme_ref != null && d.theme_ref !== '' && !themeRefs.has(String(d.theme_ref))) {
    warn('theme_missing', "The dashboard's linked theme isn't in the file; it will use its own style only.", 'dashboard.theme_ref');
  }

  // Layout → bundle: everything the layout points at should be carried. Missing pieces are
  // warnings, not errors — the import drops that tile or clears that link, like a load does.
  if (Array.isArray(d.layout)) {
    const refs = layoutReferences(d.layout);
    refs.widgetRefs.filter((r) => !widgetRefs.has(r)).forEach((r) => warn('layout_widget', `A chart tile (${r}) has no chart in the file and will be left out.`, 'dashboard.layout'));
    refs.slicerRefs.filter((r) => !slicerRefs.has(r)).forEach((r) => warn('layout_slicer', `A slicer tile (${r}) has no slicer in the file and will be left out.`, 'dashboard.layout'));
    refs.datasourceRefs.filter((r) => !datasourceRefs.has(r)).forEach((r) => warn('layout_filter_datasource', 'A widget filter points at a datasource that isn\'t in the file; its value list may not load.', 'dashboard.layout'));
    const tabs = new Set(refs.tabIds);
    if (tabs.size > 0) {
      [...new Set(refs.usedTabIds)].filter((t) => !tabs.has(t)).forEach((t) => warn('layout_tab', `Something points at a tab (${t}) that doesn't exist; it will show on the first tab.`, 'dashboard.layout'));
    }
    // A link to another dashboard only survives if that dashboard is imported too (not yet
    // supported: one dashboard per file), so every one is flagged.
    refs.dashboardLinks.forEach((l) => warn('layout_dashboard_link', `A "Link to" another dashboard${l.dashboardName ? ` (${l.dashboardName})` : ''} will be cleared.`, 'dashboard.layout'));
  }
  (Array.isArray(d.global_filters) ? d.global_filters : []).forEach((f, idx) => {
    if (f?.datasource_id && !datasourceRefs.has(String(f.datasource_id))) {
      warn('filter_datasource', `Dashboard filter "${f.name || f.column || '?'}" points at a datasource that isn't in the file; its value list may not load.`, `dashboard.global_filters[${idx}]`);
    }
  });

  return { errors, warnings };
}

// File text → a bundle ready for import: parse, check it's ours, bring it up to date, validate.
// Never throws: returns { bundle, errors, warnings, migrations }; `bundle` is null when it can't be read.
export function readBundle(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { bundle: null, errors: [{ code: 'json', message: 'The file is not valid JSON.', path: '' }], warnings: [], migrations: [] };
  }
  if (!isObject(raw) || raw.format !== BUNDLE_FORMAT) {
    return { bundle: null, errors: [{ code: 'format', message: 'The file is not a Dashboard Builder export.', path: 'format' }], warnings: [], migrations: [] };
  }
  let migrated;
  try {
    migrated = migrateBundle(raw);
  } catch (e) {
    return { bundle: null, errors: [{ code: 'version', message: e.message, path: 'version' }], warnings: [], migrations: [] };
  }
  const { errors, warnings } = validateBundle(migrated.bundle);
  return { bundle: migrated.bundle, errors, warnings, migrations: migrated.applied };
}
