import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Database, Play, Trash2, Plus, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import FormModal from '../../FormModal';
import { previewDatasource, registerDatasource, listDatasources, getDatasourceDetail, deleteDatasource, updateDatasource, refreshDatasourceSchema, updateDatasourceColumn, sampleDatasource, listWidgets } from '../../../store/actions/dashboardBuilder-actions';
import { notifyDatasourcesChanged } from '../../../store/actions/datasourceEvents';

// The API doc's example column JSON doesn't show an explicit id field (only column_name,
// display_name, data_type, etc.) even though PATCH .../columns/{column_id} clearly needs
// one — presumably just omitted from the abbreviated doc example. Checking both `id` and
// `column_id` defensively rather than assuming one; if neither is present for a given
// column, editing is disabled for it instead of guessing wrong and sending a broken PATCH.
const columnId = (c) => c.id ?? c.column_id;

/**
 * Registers reusable "real" datasources: a name plus either a SQL query or an existing
 * schema+table (the sourceMode toggle — see the API doc's two mutually-exclusive
 * registration modes), previewed via /dashboard-builder/datasources/preview (dry run —
 * nothing saved), then registered for real via POST /dashboard-builder/datasources. Backed
 * entirely by the real API now — no localStorage involved (see dashboardBuilder-actions.js
 * for each call's own notes). The database itself is fixed for now, so there's deliberately
 * no connection/server picker here — just a name and a query or table.
 *
 * `embedded`: renders as a plain in-page panel (fills its parent, no FormModal chrome) for
 * use as a tab in DashboardBuilder.jsx, instead of the original popup-modal presentation.
 * `isOpen`/`setIsOpen` are ignored when embedded — the list is fetched on mount instead of
 * on open, since there's no "closed" state for an always-visible tab. Exposes `resetForm`
 * via ref so DashboardBuilder.jsx's header-level "New Datasource" button can trigger the
 * same reset this component's own internal "New datasource" link does.
 */
const DatasourceManager = React.forwardRef(function DatasourceManager({ isOpen, setIsOpen, embedded = false }, ref) {
  const [datasources, setDatasources] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [name, setName] = useState('');
  // 'query' | 'table' — the two mutually-exclusive ways the API doc describes registering a
  // datasource. Mirrors QueryWorkbench's own SQL Mode/Visual Builder toggle pattern.
  const [sourceMode, setSourceMode] = useState('query');
  const [sqlQuery, setSqlQuery] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const [tableName, setTableName] = useState('');
  const [previewResult, setPreviewResult] = useState(null); // { columns, sampleRows }
  const [previewError, setPreviewError] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // Unsaved-changes tracking for an EXISTING datasource being edited (updateDatasource) —
  // separate from the create-flow's own `saving`/`saveError`, which `save()` below still
  // owns for a brand-new datasource. Only meaningful while editingId is set; a `!!editingId`
  // guard on the Save button below keeps it irrelevant otherwise.
  const [editDirty, setEditDirty] = useState(false);
  // Fields start locked (read-only) whenever an existing datasource is loaded — an explicit
  // "Edit" click is required before Name/Schema/Table/Query become editable, so viewing a
  // datasource's config never risks accidentally typing into a live field. `editSnapshot`
  // captures the values at the moment editing starts, so "Cancel edit" can revert exactly to
  // what was actually saved rather than whatever's left half-typed.
  const [editingFields, setEditingFields] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // Blast-radius check for the delete confirm below — which charts (by name) are built on
  // this datasource, fetched fresh each time the confirm step opens (no backend field for
  // this, so it's computed client-side from the one existing listWidgets() summary call,
  // filtered by datasource_id — cheap, unlike an equivalent "used in N dashboards" check for
  // a widget would be, which has no such single cheap summary call to filter). Best-effort:
  // a failure here just shows nothing extra, never blocks the delete itself.
  const [usageWidgets, setUsageWidgets] = useState(null); // null = not checked yet; [] = checked, none found
  const [usageLoading, setUsageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [refreshMsg, setRefreshMsg] = useState(null);
  const [columnSavingId, setColumnSavingId] = useState(null); // which column's PATCH is in flight
  const [columnError, setColumnError] = useState(null);
  const [sample, setSample] = useState(null); // { columnNames, rows }
  const [sampleVisible, setSampleVisible] = useState(false);
  const [sampling, setSampling] = useState(false);
  const [sampleError, setSampleError] = useState(null);

  const refreshList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      setDatasources(await listDatasources());
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  // Embedded (tab): fetch once on mount, always visible. Modal: fetch whenever it opens —
  // not on every render, and not before it's ever been opened (no point hitting the API
  // for a panel the user hasn't looked at yet).
  useEffect(() => {
    if (embedded || isOpen) refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSourceMode('query');
    setSqlQuery('');
    setSchemaName('');
    setTableName('');
    setPreviewResult(null);
    setPreviewError(null);
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
    setRefreshError(null);
    setRefreshMsg(null);
    setColumnError(null);
    setSample(null);
    setSampleError(null);
  };

  useImperativeHandle(ref, () => ({ resetForm }));

  const editDatasource = async (summary) => {
    setEditingId(summary.id);
    setName(summary.name);
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
    setRefreshError(null);
    setRefreshMsg(null);
    setColumnError(null);
    setSample(null);
    setSampleError(null);
    setEditingFields(false);
    setEditSnapshot(null);
    setDetailLoading(true);
    try {
      // listDatasources() only returns {id, name, source_type} — the full column metadata
      // (and, if the backend includes it, the original sql_query/schema_name/table_name)
      // only comes from the detail endpoint, fetched here specifically for the datasource
      // just clicked. source_type ('QUERY'|'TABLE'|'VIEW' per the doc) tells us which mode
      // to show the toggle in — TABLE/VIEW both mean "table-backed" for this UI's purposes.
      const { datasource, columns } = await getDatasourceDetail(summary.id);
      setSourceMode(datasource.source_type === 'QUERY' ? 'query' : 'table');
      setSqlQuery(datasource.sql_query || '');
      setSchemaName(datasource.schema_name || '');
      setTableName(datasource.table_name || '');
      setPreviewResult({ columns, sampleRows: [] });
      setPreviewError(null);
      setEditDirty(false);
    } catch (err) {
      setPreviewResult(null);
      setPreviewError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // Builds the {sqlQuery} or {schemaName, tableName} source object dashboardBuilder-actions.js
  // expects, from whichever mode the toggle is currently in — one place so runPreview/save
  // can't drift into sending mismatched shapes.
  const currentSource = () => (sourceMode === 'query' ? { sqlQuery } : { schemaName, tableName });
  const canPreview = sourceMode === 'query' ? !!sqlQuery.trim() : !!(schemaName.trim() && tableName.trim());

  const runPreview = async () => {
    if (!canPreview) return;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const result = await previewDatasource(currentSource());
      setPreviewResult(result);
    } catch (err) {
      setPreviewResult(null);
      setPreviewError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (!name.trim() || !previewResult) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { datasource, columns } = await registerDatasource({ name: name.trim(), ...currentSource() });
      await refreshList();
      notifyDatasourcesChanged();
      setEditingId(datasource.id);
      // Without this, the table kept showing the *pre-registration* preview's columns —
      // which have no real column_id yet (nothing was persisted when /preview ran) — so
      // Role/Default agg. stayed non-editable even though editingId was already set. The
      // register response's own columns are the real, persisted ones (with ids), same as
      // what editDatasource populates from getDatasourceDetail after a click.
      setPreviewResult({ columns, sampleRows: [] });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Edits an EXISTING datasource — name/description always, plus the underlying source
  // (sql_query, or schema_name+table_name) if it changed, via updateDatasource. Unlike
  // `save()` above (create-only), this never touches editingId (already set) and refreshes
  // the columns table from the response, since a changed source re-syncs columns server-side
  // (same diff logic as refresh-schema — see updateDatasource's own doc comment).
  const saveEdits = async () => {
    if (!editingId || !name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { columns } = await updateDatasource(editingId, { name: name.trim(), ...currentSource() });
      setPreviewResult({ columns, sampleRows: [] });
      setEditDirty(false);
      // Locks the fields back up on success — same "read-only until deliberately unlocked"
      // state editDatasource itself starts in, so a save doesn't leave live-editable fields
      // sitting open for a further accidental edit.
      setEditingFields(false);
      setEditSnapshot(null);
      await refreshList();
      notifyDatasourcesChanged();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Unlocks Name/Schema/Table/Query for editing — snapshots the current (saved) values first,
  // including previewResult (the Columns table), so "Cancel edit" below can revert exactly to
  // them. Needed for previewResult specifically because the new Preview button (see the
  // edit-mode toolbar) overwrites it with the dry-run's columns — which have no real
  // column_id yet — so without reverting it too, cancelling after a Preview would leave the
  // Columns table stuck showing those non-editable dry-run columns instead of the real saved
  // ones.
  const startEditingFields = () => {
    setEditSnapshot({ name, sourceMode, sqlQuery, schemaName, tableName, previewResult });
    setEditingFields(true);
  };
  const cancelEditingFields = () => {
    if (editSnapshot) {
      setName(editSnapshot.name);
      setSourceMode(editSnapshot.sourceMode);
      setSqlQuery(editSnapshot.sqlQuery);
      setSchemaName(editSnapshot.schemaName);
      setTableName(editSnapshot.tableName);
      setPreviewResult(editSnapshot.previewResult);
    }
    setEditingFields(false);
    setEditSnapshot(null);
    setEditDirty(false);
  };

  const remove = async () => {
    if (!editingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDatasource(editingId);
      await refreshList();
      notifyDatasourcesChanged();
      // resetForm() clears editingId/confirmingDelete/etc. but not `deleting` itself (it
      // doesn't know about that state) — reset it explicitly here on the success path.
      resetForm();
      setDeleting(false);
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
      // Deliberately not resetting confirmingDelete here — if the delete failed, the user
      // should still see the confirm buttons (with the error above them) to retry, not have
      // it silently collapse back to the plain Delete button as if nothing happened.
    }
  };

  const refreshSchema = async () => {
    if (!editingId) return;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshMsg(null);
    try {
      const { columns } = await refreshDatasourceSchema(editingId);
      // Same shape editDatasource already populates from getDatasourceDetail — the columns
      // table just re-renders with whatever changed (new/removed/retyped columns).
      setPreviewResult({ columns, sampleRows: [] });
      setRefreshMsg('Schema refreshed.');
    } catch (err) {
      setRefreshError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const updateColumn = async (col, patch) => {
    const id = columnId(col);
    if (!editingId || !id) return;
    setColumnSavingId(id);
    setColumnError(null);
    try {
      // Response is the WHOLE updated columns list (per the API doc), not just the one
      // column — replace previewResult.columns wholesale with it rather than merging the
      // patch in locally, so the table always reflects exactly what the backend now has.
      const columns = await updateDatasourceColumn(editingId, id, patch);
      setPreviewResult((prev) => ({ ...prev, columns }));
    } catch (err) {
      setColumnError(err.message);
    } finally {
      setColumnSavingId(null);
    }
  };

  const loadSample = async () => {
    if (!editingId) return;
    setSampling(true);
    setSampleError(null);
    try {
      setSample(await sampleDatasource(editingId));
      setSampleVisible(true);
    } catch (err) {
      setSample(null);
      setSampleError(err.message);
    } finally {
      setSampling(false);
    }
  };

  // These tables' scrollbar is hidden (dsm-no-scrollbar) but must still actually scroll for
  // mouse users — a trackpad's horizontal swipe works without this, but a plain vertical
  // mouse wheel does nothing on an overflow-x element by default with no visible bar to
  // drag. Redirects vertical wheel delta into horizontal scroll, only when the table is
  // actually wider than its box (otherwise leave normal page-scroll alone).
  const scrollHorizontally = (e) => {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  };

  const content = (
      <div className={`flex gap-4 ${embedded ? 'h-full' : 'h-[65vh]'}`}>
        {/* Left: name + source (query or table) + preview */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto pr-1 dsm-no-scrollbar">
          {/* Box 1: query/table definition — kept separate from the results box below it so
              editing the source and reviewing what it returned read as two distinct steps. */}
          <div className="bg-white rounded-xl shadow border border-slate-100 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-8">
            <label className="text-xs font-medium text-slate-600 w-48 shrink-0">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (editingId) setEditDirty(true); }}
                placeholder="e.g. Active Users"
                disabled={!!editingId && !editingFields}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            {/* Query-backed vs table-backed — mutually exclusive per the API doc, same
                two-segment pill toggle QueryWorkbench uses for its own SQL Mode/Visual
                Builder switch. Always disabled once a datasource exists — updateDatasource
                can repoint a table-backed datasource at a different table (or a query-backed
                one at a different query), but can't convert between the two kinds; the
                fields below it (name, query/schema/table) ARE editable, per-kind. */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0 mt-4">
              <button
                type="button"
                disabled={!!editingId}
                onClick={() => setSourceMode('query')}
                className={`w-24 py-1.5 text-xs font-semibold transition-colors ${
                  sourceMode === 'query' ? 'bg-[#EC7D09] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                } disabled:cursor-not-allowed`}
              >
                Query
              </button>
              <button
                type="button"
                disabled={!!editingId}
                onClick={() => setSourceMode('table')}
                className={`w-24 py-1.5 text-xs font-semibold transition-colors border-l border-slate-200 ${
                  sourceMode === 'table' ? 'bg-[#EC7D09] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                } disabled:cursor-not-allowed`}
              >
                Table
              </button>
            </div>
          </div>
          {sourceMode === 'query' ? (
            <label className="text-xs font-medium text-slate-600">
              SQL Query
              <textarea
                value={sqlQuery}
                onChange={(e) => { setSqlQuery(e.target.value); if (editingId) setEditDirty(true); }}
                placeholder="select * from telecom.users"
                rows={4}
                disabled={!!editingId && !editingFields}
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-mono disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
          ) : (
            <div className="flex gap-3">
              <label className="text-xs font-medium text-slate-600 flex-1">
                Schema name
                <input
                  type="text"
                  value={schemaName}
                  onChange={(e) => { setSchemaName(e.target.value); if (editingId) setEditDirty(true); }}
                  placeholder="e.g. telecom"
                  disabled={!!editingId && !editingFields}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
              <label className="text-xs font-medium text-slate-600 flex-1">
                Table name
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => { setTableName(e.target.value); if (editingId) setEditDirty(true); }}
                  placeholder="e.g. users"
                  disabled={!!editingId && !editingFields}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
            </div>
          )}
          {detailLoading && <div className="text-xs text-slate-400">Loading datasource…</div>}
          <div className="flex items-center gap-2">
            {editingId && !confirmingDelete && (
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(true);
                  setUsageLoading(true);
                  setUsageWidgets(null);
                  listWidgets()
                    .then((all) => setUsageWidgets(all.filter((w) => w.datasource_id === editingId)))
                    .catch(() => setUsageWidgets([]))
                    .finally(() => setUsageLoading(false));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100"
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
            {editingId && confirmingDelete && (
              <div className="flex flex-col gap-1.5">
                {usageLoading && <span className="text-xs text-slate-400">Checking which charts use this datasource…</span>}
                {!usageLoading && usageWidgets?.length > 0 && (() => {
                  // `w.dashboard_count` — a real field on listWidgets()' own summary rows now
                  // (no extra per-widget fetch needed). Summed across the affected charts —
                  // an upper bound on distinct dashboards, not a deduped count (a dashboard
                  // with two charts from this datasource would count twice here), since
                  // getting the true distinct number would mean fetching each chart's own
                  // `dashboards` list (getWidgetDetail, one call per chart) just for this
                  // warning — worded as "dashboard placement(s)" below to stay honest about
                  // that rather than implying it's deduplicated.
                  const dashboardPlacements = usageWidgets.reduce((sum, w) => sum + (w.dashboard_count || 0), 0);
                  return (
                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 max-w-md">
                      <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="text-xs font-semibold text-amber-800">
                          Used by {usageWidgets.length} chart{usageWidgets.length === 1 ? '' : 's'}
                          {dashboardPlacements > 0 && <> across {dashboardPlacements} dashboard placement{dashboardPlacements === 1 ? '' : 's'}</>}
                          {' '}— deleting this datasource will break {usageWidgets.length === 1 ? 'it' : 'them'} everywhere {usageWidgets.length === 1 ? "it's" : "they're"} placed.
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {usageWidgets.slice(0, 8).map((w) => (
                            <span key={w.id} className="text-[11px] font-medium bg-white border border-amber-200 rounded-full px-2 py-0.5 text-amber-700">
                              {w.name}{w.dashboard_count ? ` (${w.dashboard_count})` : ''}
                            </span>
                          ))}
                          {usageWidgets.length > 8 && (
                            <span className="text-[11px] text-amber-600 px-1 py-0.5">+{usageWidgets.length - 8} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Delete this datasource?</span>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!editingId && (
              <button
                type="button"
                onClick={runPreview}
                disabled={previewing || !canPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0b1830] disabled:opacity-50"
              >
                <Play size={12} /> {previewing ? 'Previewing…' : 'Preview'}
              </button>
            )}
            {!editingId && (
              <button
                type="button"
                onClick={save}
                disabled={!name.trim() || !previewResult || saving}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#EC7D09] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save datasource'}
              </button>
            )}
            {editingId && !confirmingDelete && !editingFields && (
              <button
                type="button"
                onClick={startEditingFields}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50"
              >
                Edit
              </button>
            )}
            {editingId && !confirmingDelete && editingFields && (
              <>
                {/* Same dry-run runPreview()/canPreview the create-flow's own Preview button
                    uses — previewDatasource() never persists anything, so it's exactly as
                    safe to run here against the currently-typed (not-yet-saved) query/table
                    as it is before a datasource exists at all. Lets you confirm a schema/
                    table/query change actually resolves before committing to Save changes. */}
                <button
                  type="button"
                  onClick={runPreview}
                  disabled={previewing || !canPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0b1830] disabled:opacity-50"
                >
                  <Play size={12} /> {previewing ? 'Previewing…' : 'Preview'}
                </button>
                {editDirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
                <button
                  type="button"
                  onClick={cancelEditingFields}
                  disabled={saving}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 bg-white disabled:opacity-50"
                >
                  Cancel edit
                </button>
                <button
                  type="button"
                  onClick={saveEdits}
                  disabled={!name.trim() || !editDirty || saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#EC7D09] disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            )}
          </div>

          {previewError && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{previewError}</div>
          )}
          {saveError && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
          )}
          {deleteError && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</div>
          )}
          </div>

          {/* Results — columns, then sample data. Each is its own top-level shadow box,
              a sibling of the query/table form box above, not nested inside a shared one. */}
          {previewResult && (
            <>
              {(columnError || sampleError) && (
                <div className="flex flex-col gap-2">
                  {columnError && (
                    <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{columnError}</div>
                  )}
                  {sampleError && (
                    <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{sampleError}</div>
                  )}
                </div>
              )}
              <div className="bg-white rounded-xl shadow border border-slate-100 p-4 flex flex-col min-w-0 gap-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Columns ({previewResult.columns.length})
                  {/* Editable only for a saved datasource — a fresh /preview's columns have no
                      real column_id to PATCH against yet (nothing's been registered). */}
                  {editingId ? ' — click Role/Default agg. to edit' : ''}
                </div>
                {editingId && !confirmingDelete && (
                  <div className="flex items-center gap-2">
                    {/* Sits right next to the button that triggers it, rather than as a
                        separate full-width banner far above — reads as "this button's own
                        status," not a page-level notice. */}
                    {refreshError && <span className="text-xs text-red-500">{refreshError}</span>}
                    {refreshMsg && <span className="text-xs text-emerald-600">{refreshMsg}</span>}
                    <button
                      type="button"
                      onClick={refreshSchema}
                      disabled={refreshing}
                      title="Re-discover columns from the underlying query/table — doesn't change the query itself"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh schema'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Once loaded, the eye toggles visibility instead of only ever fetching
                        // — hiding it doesn't discard `sample`, so toggling back on is instant
                        // and doesn't re-hit the backend; only the first click (or an explicit
                        // re-fetch while already visible) actually calls sampleDatasource.
                        if (sample && sampleVisible) { setSampleVisible(false); return; }
                        if (sample && !sampleVisible) { setSampleVisible(true); return; }
                        loadSample();
                      }}
                      disabled={sampling}
                      title={sample && sampleVisible ? 'Hide live sample' : 'Re-run a fresh LIMIT-10 sample against current live data'}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      {sample && sampleVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                      {sampling ? 'Sampling…' : sample && sampleVisible ? 'Hide sample rows' : 'Sample rows'}
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto border border-slate-100 rounded-lg min-w-0" onWheel={scrollHorizontally}>
                <table className="text-xs w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-slate-500">Column</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-slate-500">Type</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-slate-500">Role</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-slate-500">Default agg.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.columns.map((c) => {
                      const id = columnId(c);
                      const editable = !!editingId && !!id;
                      const savingThis = columnSavingId === id;
                      return (
                        <tr key={c.column_name} className="border-t border-slate-100">
                          <td className="px-2 py-1 text-slate-700">{c.display_name || c.column_name}</td>
                          <td className="px-2 py-1 text-slate-400">{c.data_type}</td>
                          <td className="px-2 py-1 text-slate-400">
                            {editable ? (
                              <select
                                value={c.is_measure ? 'measure' : c.is_dimension ? 'dimension' : 'none'}
                                disabled={savingThis}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateColumn(c, { is_measure: v === 'measure', is_dimension: v === 'dimension' });
                                }}
                                className="text-xs border border-slate-200 rounded px-1 py-0.5"
                              >
                                <option value="none">—</option>
                                <option value="dimension">Dimension</option>
                                <option value="measure">Measure</option>
                              </select>
                            ) : (
                              c.is_measure ? 'Measure' : c.is_dimension ? 'Dimension' : '—'
                            )}
                          </td>
                          <td className="px-2 py-1 text-slate-400">
                            {editable && c.is_measure ? (
                              <select
                                value={c.default_aggregation || 'SUM'}
                                disabled={savingThis}
                                onChange={(e) => updateColumn(c, { default_aggregation: e.target.value })}
                                className="text-xs border border-slate-200 rounded px-1 py-0.5"
                              >
                                {['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].map((agg) => <option key={agg} value={agg}>{agg}</option>)}
                              </select>
                            ) : (
                              c.default_aggregation || '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
              {previewResult.sampleRows.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-slate-100 p-4 flex flex-col min-w-0 gap-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Sample rows ({previewResult.sampleRows.length})
                  </div>
                  <div className="overflow-x-auto border border-slate-100 rounded-lg min-w-0" onWheel={scrollHorizontally}>
                    <table className="text-[0.6875rem] min-w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {previewResult.columns.map((c) => (
                            <th key={c.column_name} className="text-left px-2 py-1 font-semibold text-slate-500 whitespace-nowrap">{c.column_name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.sampleRows.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            {previewResult.columns.map((c) => (
                              <td key={c.column_name} className="px-2 py-1 text-slate-600 whitespace-nowrap">{String(row[c.column_name] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Separate from previewResult.sampleRows above — this is the "Sample rows"
                  button's own result (GET .../sample), a different shape (columnNames is a
                  plain string array, not full column metadata objects) and independently
                  triggered, since getDatasourceDetail doesn't include any rows at all.
                  Gated on sampleVisible (not just `sample`) so the eye button can hide this
                  card again without discarding the already-fetched rows. */}
              {sample && sampleVisible && (
                <div className="bg-white rounded-xl shadow border border-slate-100 p-4 flex flex-col min-w-0 gap-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Live sample ({sample.rows.length})
                  </div>
                  <div className="overflow-x-auto border border-slate-100 rounded-lg min-w-0" onWheel={scrollHorizontally}>
                    <table className="text-[0.6875rem] min-w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {sample.columnNames.map((name) => (
                            <th key={name} className="text-left px-2 py-1 font-semibold text-slate-500 whitespace-nowrap">{name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sample.rows.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            {sample.columnNames.map((name) => (
                              <td key={name} className="px-2 py-1 text-slate-600 whitespace-nowrap">{String(row[name] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: saved datasources list */}
        <div className="w-56 shrink-0 border-l border-slate-100 pl-3 flex flex-col gap-2 overflow-y-auto dsm-no-scrollbar">
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#EC7D09] hover:opacity-80 mb-1"
          >
            <Plus size={14} /> New datasource
          </button>
          {listLoading && <div className="text-xs text-slate-400 text-center mt-4">Loading…</div>}
          {listError && <div className="text-xs text-red-500 px-1">{listError}</div>}
          {datasources.map((ds) => (
            <button
              key={ds.id}
              type="button"
              onClick={() => editDatasource(ds)}
              className={`text-left px-2.5 py-2 rounded-lg text-xs border transition-colors ${
                editingId === ds.id ? 'border-[#EC7D09] bg-orange-50 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold truncate">{ds.name}</div>
              <div className="text-[0.6875rem] text-slate-400">{ds.source_type}</div>
            </button>
          ))}
          {!listLoading && datasources.length === 0 && (
            <div className="text-xs text-slate-400 text-center mt-4">No datasources yet.</div>
          )}
        </div>
      </div>
  );

  // Scrolls without ever showing a scrollbar track/thumb (not even on hover) — the app's
  // global scrollbar is always visible, which reads as clutter on these two tall side panels.
  const noScrollbarStyle = (
    <style>{`
      .dsm-no-scrollbar { scrollbar-width: none; }
      html[data-theme="light"] .dsm-no-scrollbar::-webkit-scrollbar,
      html[data-theme="dark"] .dsm-no-scrollbar::-webkit-scrollbar,
      .dsm-no-scrollbar::-webkit-scrollbar { width: 0; height: 0; }
    `}</style>
  );

  if (embedded) return <>{noScrollbarStyle}{content}</>;

  return (
    <>
      {noScrollbarStyle}
      <FormModal
        title="Datasources"
        subtitle="Register a SQL query or an existing table as a reusable datasource for widgets to bind to."
        icon={<Database size={16} className="text-white" />}
        size="xl"
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      >
        {content}
      </FormModal>
    </>
  );
});

export default DatasourceManager;
