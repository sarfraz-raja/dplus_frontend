import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Plus, Play, Trash2, ChevronLeft, ChevronRight, LayoutGrid, Settings2, Palette } from 'lucide-react';
import MappingFields from './MappingFields';
import WidgetStyleFields from '../widgetConfig/WidgetStyleFields';
import Button from '../../Button';
import ConfirmModal from '../../ConfirmModal';
import ChartListItem from './ChartListItem';
import { chartLibraryStyleFieldsFor } from '../widgetConfig/widgetTypeRegistry';
import { exportRowsCSV } from '../utils/exportUtils';
import renderChartWidget from './renderChartWidget';
import CHART_TYPE_META, { CHART_TYPES } from './chartTypeMeta';
import { useTheme } from '../../../context/ThemeContext';
import { chartTokens } from '../../../theme/tokens';
import {
  listDatasources,
  getDatasourceDetail,
  createWidget,
  listWidgets,
  getWidgetDetail,
  updateWidget,
  deleteWidget,
  getStandaloneWidgetData,
} from '../../../store/actions/dashboardBuilder-actions';
import { subscribeDatasourcesChanged } from '../../../store/actions/datasourceEvents';
import { sortWidgetsByRecency, withDatasourceOnly } from './sortWidgets';

const AGGREGATIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];

// mapping is a free-form key/value bag (no fixed schema server-side) — the field keys used
// here are just the conventions this codebase picks per chart_type, matching whatever the
// backend's SQL-generation logic reads for that type. Each entry is a field-descriptor
// array consumed by MappingFields.jsx (same generic-renderer pattern WidgetStyleFields.jsx
// already established for per-widget-type style controls).
const AGG_FIELD = { key: 'aggregation', label: 'Aggregation', type: 'select', options: AGGREGATIONS, default: 'SUM' };
const CHART_TYPE_FIELDS = {
  LINE: [{ key: 'x_axis', label: 'X Axis (dimension)', type: 'column' }, { key: 'y_axis', label: 'Y Axis (measure)', type: 'column' }, AGG_FIELD],
  BAR: [{ key: 'x_axis', label: 'X Axis (dimension)', type: 'column' }, { key: 'y_axis', label: 'Y Axis (measure)', type: 'column' }, AGG_FIELD],
  AREA: [{ key: 'x_axis', label: 'X Axis (dimension)', type: 'column' }, { key: 'y_axis', label: 'Y Axis (measure)', type: 'column' }, AGG_FIELD],
  PIE: [{ key: 'x_axis', label: 'Category', type: 'column' }, { key: 'y_axis', label: 'Value (measure)', type: 'column' }, AGG_FIELD],
  KPI_CARD: [{ key: 'y_axis', label: 'Measure', type: 'column' }, AGG_FIELD],
  GAUGE: [{ key: 'y_axis', label: 'Measure', type: 'column' }, AGG_FIELD],
  SCATTER: [{ key: 'x_axis', label: 'X (measure)', type: 'column' }, { key: 'y_axis', label: 'Y (measure)', type: 'column' }],
  TABLE: [{ key: 'columns', label: 'Columns to display', type: 'multiColumn' }],
  HEAT_MAP: [{ key: 'x_axis', label: 'X Axis (dimension)', type: 'column' }, { key: 'y_axis', label: 'Y Axis (measure)', type: 'column' }, AGG_FIELD],
  HORIZONTAL_BAR: [{ key: 'x_axis', label: 'Category (dimension)', type: 'column' }, { key: 'y_axis', label: 'Y Axis (measure)', type: 'column' }, AGG_FIELD],
  FUNNEL: [{ key: 'x_axis', label: 'Stage (dimension)', type: 'column' }, { key: 'y_axis', label: 'Value (measure)', type: 'column' }, AGG_FIELD],
  WATERFALL: [{ key: 'x_axis', label: 'Step (dimension)', type: 'column' }, { key: 'y_axis', label: 'Delta (measure)', type: 'column' }, AGG_FIELD],
  TREEMAP: [{ key: 'x_axis', label: 'Category (dimension)', type: 'column' }, { key: 'y_axis', label: 'Value (measure)', type: 'column' }, AGG_FIELD],
  STACKED_BAR: [
    { key: 'x_axis', label: 'Category (dimension)', type: 'column' },
    { key: 'series', label: 'Series (grouping dimension)', type: 'column' },
    { key: 'y_axis', label: 'Y Axis (measure)', type: 'column' },
    AGG_FIELD,
  ],
};

// Chart types whose dimension picker benefits from a low-cardinality warning — anything
// with a raw x_axis/series dimension can render unreadably with a high-cardinality column
// (e.g. a timestamp), so the hint only shows for types that actually use one.
const DIMENSION_HINT_TYPES = new Set(['LINE', 'BAR', 'AREA', 'PIE', 'HEAT_MAP', 'HORIZONTAL_BAR', 'FUNNEL', 'WATERFALL', 'TREEMAP', 'STACKED_BAR']);

/**
 * The reusable chart library — widgets created here (POST /widgets) have no dashboard
 * attached; they're standalone chart definitions that can later be attached to one or more
 * dashboards (see createAndAttachWidget in dashboardBuilder-actions.js for that separate
 * join-row concern). Three-column layout (list / config / large preview), mirroring
 * DashboardCanvasEditor.jsx's select-then-configure interaction and Superset's own chart
 * editor layout.
 *
 * Exposes `resetForm` via ref so DashboardBuilder.jsx's header-level "New Chart" button can
 * trigger the same reset this component's own internal "New chart" link does.
 */
const ChartLibrary = React.forwardRef(function ChartLibrary({ prefill, onSavedForDashboard, returnToDashboard, onReturnToDashboard, onCancel }, ref) {
  // Pending destructive action awaiting user confirmation via <ConfirmModal/> below — see
  // ConfirmModal.jsx (replaces window.confirm/redux ALERTS with the app's current
  // FormModal-based modal styling).
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  // Data/Style/Charts now live as three tabs inside one collapsible panel (matches the
  // reference "Style Editor" mockup) instead of three separate side-by-side boxes.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('data');

  // Same theme-token derivation DashboardCanvasEditor.jsx uses for its own Style panel's
  // resolvedDefaults — without this, every unset color field showed a plain black swatch
  // regardless of what the preview is actually rendering with.
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { text: resolvedTextColor, sub: resolvedSubColor } = chartTokens(isDark);
  const resolvedBgColor = isDark ? '#22273C' : '#ffffff';

  const [datasources, setDatasources] = useState([]);
  // "Charts" tab list items only carry datasource_id, not a name — resolved against this
  // same list (already fetched for the Data tab's Datasource picker), no extra call needed.
  const datasourceNamesById = Object.fromEntries(datasources.map((d) => [d.id, d.name]));

  const [editingId, setEditingId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [name, setName] = useState('');
  const [datasourceId, setDatasourceId] = useState('');
  const [columns, setColumns] = useState([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [chartType, setChartType] = useState('BAR');
  const [mapping, setMapping] = useState({});
  const [dirty, setDirty] = useState(false); // unsaved changes since last successful save

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [running, setRunning] = useState(false); // combined save-then-fetch in flight
  const [runStatus, setRunStatus] = useState(''); // small status line, e.g. "Saving…" / "Running query…"
  const [previewError, setPreviewError] = useState(null);
  const [previewData, setPreviewData] = useState(null); // { columns, rows }

  const refreshList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      setWidgets(await listWidgets());
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
    listDatasources().then(setDatasources).catch(() => {});
  }, []);

  // Datasources may be registered/deleted from elsewhere (e.g. DatasourceManager.jsx's
  // Datasources tab) while this component stays mounted (it's always kept alive — see
  // DashboardBuilder.jsx) — without this, its dataset dropdown would stay stale until a
  // full page reload since the effect above only runs once.
  useEffect(() => subscribeDatasourcesChanged(() => {
    listDatasources().then(setDatasources).catch(() => {});
  }), []);

  // "Add a widget" from a dashboard editor hands off here with a chart_type + datasource
  // already chosen (see DashboardBuilder.jsx's handleCreateViaChartsTab) — pre-fill the
  // form and jump straight to configuring the field mapping, instead of starting blank.
  useEffect(() => {
    if (!prefill) return;
    setEditingId(null);
    setName(prefill.name || '');
    setChartType(prefill.chartType);
    setDatasourceId(prefill.datasourceId);
    setMapping({});
    setDirty(false);
    setPreviewData(null);
    setPreviewError(null);
    setSaveError(null);
    loadColumnsFor(prefill.datasourceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const loadColumnsFor = async (id) => {
    if (!id) {
      setColumns([]);
      return;
    }
    setColumnsLoading(true);
    try {
      const { columns: cols } = await getDatasourceDetail(id);
      setColumns(cols);
    } catch (err) {
      setColumns([]);
    } finally {
      setColumnsLoading(false);
    }
  };

  const markDirty = () => setDirty(true);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDatasourceId('');
    setColumns([]);
    setChartType('BAR');
    setMapping({});
    setDirty(false);
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
    setPreviewError(null);
    setPreviewData(null);
    setRunStatus('');
    // Every "New widget"/"New chart" entry point (both buttons in this file, plus
    // DashboardBuilder.jsx's header button via the exposed ref) funnels through here — the
    // Charts tab (a list to pick an *existing* chart) makes no sense to land on right after
    // clearing the form specifically to configure a brand new one.
    setActiveTab('data');
  };

  const editWidget = async (summary) => {
    setEditingId(summary.id);
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
    setPreviewError(null);
    setPreviewData(null);
    setRunStatus('');
    setDirty(false);
    setDetailLoading(true);
    try {
      const widget = await getWidgetDetail(summary.id);
      setName(widget.name);
      setDatasourceId(widget.datasource_id);
      setChartType(widget.chart_type);
      setMapping(widget.mapping || {});
      await loadColumnsFor(widget.datasource_id);
      setDetailLoading(false);

      // Already-saved chart — run it immediately so selecting one from the list shows its
      // data right away, no separate Preview click needed. Uses `summary.id` directly
      // rather than the `editingId` state (which may not have re-rendered yet) to avoid a
      // race. Best-effort: a failure here shows as a normal preview error, not a save error.
      setRunning(true);
      setRunStatus('Running query…');
      try {
        setPreviewData(await getStandaloneWidgetData(summary.id));
        setRunStatus('');
      } catch (err) {
        setRunStatus('');
        setPreviewError(err.message);
      } finally {
        setRunning(false);
      }
    } catch (err) {
      setSaveError(err.message);
      setDetailLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    resetForm,
    // Called by DashboardBuilder.jsx's "Edit chart" flow (a placed Real Chart widget's
    // side panel) — loads that exact chart the same way clicking it in the list does.
    loadChart: (id) => editWidget({ id }),
  }));

  // Guards both "New widget" buttons below — resetForm() discards whatever's unsaved in the
  // form outright, same silent-data-loss risk DashboardBuilder.jsx's "New dashboard" button
  // had (see that fix) — reuses the same `dirty` tracking this component already had for its
  // "Saved"/"Unsaved changes" indicator, just not previously consulted before a reset.
  const handleNewWidgetClick = () => {
    if (dirty) {
      setPendingConfirm({
        title: 'Unsaved Changes',
        message: 'Discard unsaved changes and start a new widget? This can\'t be undone.',
        run: resetForm,
      });
      return;
    }
    resetForm();
  };

  const onDatasourceChange = (id) => {
    setDatasourceId(id);
    setMapping({});
    markDirty();
    loadColumnsFor(id);
  };

  const onChartTypeChange = (type) => {
    setChartType(type);
    setMapping({});
    markDirty();
  };

  const onMappingChange = (key, val) => {
    setMapping((prev) => ({ ...prev, [key]: val }));
    markDirty();
  };

  const fields = CHART_TYPE_FIELDS[chartType] || [];
  const canSave = name.trim() && datasourceId
    && fields.every((f) => (f.type === 'multiColumn' ? (mapping[f.key] || []).length > 0 : f.type === 'select' || mapping[f.key]));

  // Shared create-or-update save, used by both runPreview (save-then-run) and
  // saveForDashboard (save-then-attach-to-dashboard) below, so the two flows can't drift.
  // Returns the full saved widget (not just its id) — DashboardCanvasEditor's
  // refreshChartDefinition needs the fresh name/chart_type/mapping (incl. mapping.style) to
  // sync into any dashboard placement of this same chart, since a placement's own local
  // copy of this data is otherwise never told a shared chart definition changed.
  const saveWidget = async () => {
    let widget;
    if (editingId) {
      widget = await updateWidget(editingId, { name: name.trim(), datasource_id: datasourceId, chart_type: chartType, mapping });
    } else {
      widget = await createWidget({ name: name.trim(), datasourceId, chartType, mapping });
      setEditingId(widget.id);
    }
    setDirty(false);
    await refreshList();
    return widget;
  };

  // Explicit Save — separate from Preview, so saving doesn't force a query run every time
  // (and vice versa).
  const saveOnly = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const widget = await saveWidget();
      // "Edit chart" from a dashboard placement (see DashboardBuilder.jsx's
      // handleEditInChartsTab) — the chart's already attached there, so saving just
      // returns to it instead of leaving the user on this now-done edit. Passes the fresh
      // widget back so the dashboard can sync its (otherwise stale) local copy of this
      // chart's definition — see DashboardCanvasEditor.jsx's refreshChartDefinition.
      if (returnToDashboard) onReturnToDashboard?.(widget);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Preview is available as soon as the form is configured (canSave), not only after an
  // explicit Save — there's no ad-hoc "run this unsaved chart_type/mapping" backend endpoint
  // (getStandaloneWidgetData only takes a persisted widget id), so this saves first,
  // transparently, when there's no id yet. From the user's side it just runs; the implicit
  // save is what saveWidget() already does for a first Save click, so nothing new is
  // persisted that Save wouldn't have anyway.
  const runPreview = async () => {
    if (!canSave) return;
    setRunning(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      setRunStatus(editingId ? 'Running query…' : 'Saving…');
      const widget = editingId ? { id: editingId } : await saveWidget();
      setRunStatus('Running query…');
      setPreviewData(await getStandaloneWidgetData(widget.id));
      setRunStatus('');
    } catch (err) {
      setRunStatus('');
      setPreviewError(err.message);
    } finally {
      setRunning(false);
    }
  };

  // Saves and hands the widget id back to the dashboard that requested it (see the
  // `prefill` effect above) instead of previewing — the chart gets placed on that
  // dashboard's canvas and the user is routed back to it (DashboardBuilder.jsx).
  const saveForDashboard = async () => {
    if (!canSave) return;
    setRunning(true);
    setSaveError(null);
    try {
      setRunStatus('Saving…');
      const widget = await saveWidget();
      setRunStatus('');
      onSavedForDashboard(widget.id);
    } catch (err) {
      setRunStatus('');
      setSaveError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWidget(editingId);
      await refreshList();
      resetForm();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Delete straight from the list row — doesn't require opening the widget in the Data tab
  // first (unlike `remove` above, which only acts on whatever's currently loaded there).
  const deleteFromList = (widget) => setPendingConfirm({
    title: 'Delete Chart',
    message: `Delete "${widget.name}"? This removes it from the Chart Library and from any dashboard it's placed on.`,
    run: async () => {
      try {
        await deleteWidget(widget.id);
        await refreshList();
        if (editingId === widget.id) resetForm();
      } catch (err) {
        setSaveError(err.message);
      }
    },
  });

  // Fetches the full definition (list rows are summaries only) and re-creates it under a new
  // name/id — mapping/style included, since createWidget takes the same shape getWidgetDetail
  // returns. Doesn't touch the currently-open editor form.
  const duplicateFromList = async (widget) => {
    try {
      const detail = await getWidgetDetail(widget.id);
      await createWidget({
        name: `${detail.name} (Copy)`,
        datasourceId: detail.datasource_id,
        chartType: detail.chart_type,
        mapping: detail.mapping || {},
      });
      await refreshList();
    } catch (err) {
      setSaveError(err.message);
    }
  };

  // Same CSV export a placed dashboard widget's own download icon offers, just without a
  // `resolved` widget-props object to draw from (this chart isn't placed anywhere yet) — so
  // it fetches the standalone data fresh and exports it via the generic row-object path.
  const exportFromList = async (widget) => {
    try {
      const { rows } = await getStandaloneWidgetData(widget.id);
      exportRowsCSV(rows, widget.name);
    } catch (err) {
      setSaveError(err.message);
    }
  };

  const renderPreview = () => {
    if (!previewData) return null;
    return renderChartWidget({ chartType, name, mapping, rows: previewData.rows, height: 440, style: mapping.style || {} });
  };

  const showDimensionHint = DIMENSION_HINT_TYPES.has(chartType) && mapping.x_axis
    && columns.find((c) => c.column_name === mapping.x_axis)?.data_type?.match(/date|time|timestamp/i);

  // Latest-first, only fully-configured (datasource-attached) charts — shared with
  // DashboardCanvasEditor.jsx's "Your Charts" panel so both lists always match.
  const sortedWidgets = sortWidgetsByRecency(withDatasourceOnly(widgets));

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top toolbar — same "actions live at the top" convention DashboardCanvasEditor.jsx
          uses for its own Save/Cancel/Export row, instead of buried below the form. */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {editingId && <span className="text-[0.6875rem] text-slate-400">ID: {editingId}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {prefill && (
            <button
              type="button"
              onClick={saveForDashboard}
              disabled={!canSave || running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 disabled:opacity-50"
            >
              {running ? (runStatus || 'Saving…') : 'Save & add to dashboard'}
            </button>
          )}
          {editingId && !dirty && !saving && (
            <span className="text-xs text-emerald-600">Saved</span>
          )}
          {editingId && dirty && !saving && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={saveOnly}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#EC7D09] disabled:opacity-50"
          >
            {saving ? 'Saving…' : returnToDashboard ? 'Save & return to dashboard' : 'Save'}
          </button>
          <button
            type="button"
            onClick={runPreview}
            disabled={!canSave || running}
            title={!canSave ? 'Finish configuring the chart first' : undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            <Play size={12} /> {running ? (runStatus || 'Running…') : 'Preview'}
          </button>
          {editingId && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          {editingId && confirmingDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Delete this widget?</span>
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
          )}
          <button
            type="button"
            onClick={handleNewWidgetClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#EC7D09] border border-[#EC7D09]/30 bg-white hover:bg-orange-50"
          >
            <Plus size={12} /> New widget
          </button>
        </div>
      </div>
      {(saveError || deleteError || previewError) && (
        <div className="flex flex-col gap-1.5 shrink-0">
          {saveError && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>}
          {deleteError && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</div>}
          {previewError && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{previewError}</div>}
        </div>
      )}

    <div className="flex gap-4 flex-1 min-h-0">
      {/* Left: large preview canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        {previewData ? (
          <div className="flex-1 min-h-0">{renderPreview()}</div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400 text-center px-6">
            Configure a chart on the right and click Preview to run it against real data.
          </div>
        )}
      </div>

      {/* Chart Editor — one collapsible box (matches the reference "Style Editor" mockup:
          single panel, internal tab row) instead of three separate side-by-side boxes.
          Tabs: Data (name/datasource/chart type/field mapping), Style (this chart's own
          default style), Charts (the reusable chart list + New chart). */}
      <div
        className={`relative shrink-0 border-l border-slate-100 flex flex-col overflow-y-auto transition-[width] duration-200 ${
          panelCollapsed ? 'w-10 pl-1' : 'w-96 pl-3'
        }`}
      >
        <button
          type="button"
          onClick={() => setPanelCollapsed((c) => !c)}
          title={panelCollapsed ? 'Expand' : 'Collapse'}
          className="absolute top-0 left-0.5 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors z-10"
        >
          {panelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {panelCollapsed ? (
          <div className="flex flex-col items-center gap-3 mt-6">
            {[
              { id: 'data', label: 'Data', Icon: Settings2 },
              { id: 'style', label: 'Style', Icon: Palette },
              { id: 'charts', label: 'Charts', Icon: LayoutGrid },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => { setActiveTab(id); setPanelCollapsed(false); }}
                className="text-slate-400 hover:text-[#EC7D09] transition-colors"
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 min-h-0 flex-1">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
              {[
                { id: 'data', label: 'Data', Icon: Settings2 },
                { id: 'style', label: 'Style', Icon: Palette },
                { id: 'charts', label: 'Charts', Icon: LayoutGrid },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeTab === id ? 'bg-[#0b1830] text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {activeTab === 'data' && (
              <div className="flex flex-col gap-3 overflow-y-auto">
                {detailLoading && <div className="text-xs text-slate-400">Loading widget…</div>}

                <label className="text-xs font-medium text-slate-600">
                  Name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); markDirty(); }}
                    placeholder="e.g. Traffic by Cell"
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Datasource
                  <select
                    value={datasourceId}
                    onChange={(e) => onDatasourceChange(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                  >
                    <option value="">Select a datasource</option>
                    {datasources.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>

                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1.5">Widget type</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CHART_TYPES.map((t) => {
                      const meta = CHART_TYPE_META[t];
                      const Icon = meta.icon;
                      const active = chartType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          title={meta.label}
                          onClick={() => onChartTypeChange(t)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[0.625rem] leading-tight transition-colors ${
                            active ? 'border-[#EC7D09] bg-orange-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={16} color={meta.color} />
                          <span className="text-slate-600 text-center">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <MappingFields fields={fields} value={mapping} onChange={onMappingChange} columns={columns} columnsLoading={columnsLoading} />

                {showDimensionHint && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    This dimension looks like a raw timestamp — charts with many unique labels can render unreadably. Consider a lower-cardinality column (a category/name field) for a cleaner chart.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'style' && (
              // This chart's own default style — stored in mapping.style (mapping is already
              // a free-form JSON bag server-side, no schema change needed to add this key).
              // Seeds every new placement of this chart on any dashboard
              // (DashboardCanvasEditor.jsx's addWidget reads it), taking priority over the
              // dashboard's own style defaults since it's more specific to this one chart — a
              // per-placement Style edit in the editor still wins over both, same override
              // order used everywhere else in this cascade.
              <div className="overflow-y-auto">
                {Object.keys(mapping.style || {}).length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    className="mb-2.5"
                    onClick={() => setPendingConfirm({
                      title: 'Reset Chart Style',
                      message: "Reset this chart's default style? This clears all style overrides saved with it.",
                      run: () => setMapping((prev) => ({ ...prev, style: {} })),
                    })}
                  >
                    Reset to Default
                  </Button>
                )}
                <WidgetStyleFields
                  fields={chartLibraryStyleFieldsFor(chartType)}
                  value={mapping.style || {}}
                  onChange={(key, val) => setMapping((prev) => ({ ...prev, style: { ...(prev.style || {}), [key]: val } }))}
                  resolvedDefaults={{
                    bgColor: resolvedBgColor,
                    titleColor: resolvedSubColor,
                    valueTextColor: resolvedTextColor,
                    axisTextColor: resolvedSubColor,
                  }}
                  columns={2}
                />
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="flex flex-col gap-2 overflow-y-auto">
                <button
                  type="button"
                  onClick={handleNewWidgetClick}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#EC7D09] hover:opacity-80 mb-1"
                >
                  <Plus size={14} /> New widget
                </button>
                {listLoading && <div className="text-xs text-slate-400 text-center mt-4">Loading…</div>}
                {listError && <div className="text-xs text-red-500 px-1">{listError}</div>}
                {sortedWidgets.map((w) => (
                  <ChartListItem
                    key={w.id}
                    widget={w}
                    selected={editingId === w.id}
                    onClick={() => editWidget(w)}
                    onDelete={() => deleteFromList(w)}
                    onDuplicate={() => duplicateFromList(w)}
                    onExport={() => exportFromList(w)}
                    datasourceNamesById={datasourceNamesById}
                  />
                ))}
                {!listLoading && sortedWidgets.length === 0 && (
                  <div className="text-xs text-slate-400 text-center mt-4">No widgets yet.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    <ConfirmModal
      isOpen={!!pendingConfirm}
      title={pendingConfirm?.title}
      message={pendingConfirm?.message}
      onCancel={() => setPendingConfirm(null)}
      onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null); }}
    />
    </div>
  );
});

export default ChartLibrary;
