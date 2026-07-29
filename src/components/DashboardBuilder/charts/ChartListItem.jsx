import React from 'react';
import { Copy, Trash2, Download } from 'lucide-react';
import CHART_TYPE_META from './chartTypeMeta';

/**
 * One row in a Chart Library list — shared between DashboardCanvasEditor.jsx's "Your Charts"
 * palette section and ChartLibrary.jsx's own "Charts" tab list. Both render the exact same
 * underlying data (listWidgets()) and had drifted into two separately hand-coded, visually
 * different renderers before this — this is the single source of truth for what one chart
 * entry looks like, so a future style change only needs to happen once.
 *
 * `badge`: optional short label shown top-right (e.g. "Added" for a chart already placed on
 * the dashboard being edited) — ChartLibrary.jsx's own list doesn't need one.
 * `disabled`: greys the row out and blocks interaction (DashboardCanvasEditor uses this for
 * charts already on the current dashboard; ChartLibrary has no equivalent, always false there).
 * `datasourceNamesById`: optional `{ [datasourceId]: name }` lookup — listWidgets()'s summary
 * rows only carry `datasource_id`, not a human-readable name, so callers resolve it from
 * whatever datasource list they already have (both consumers already fetch one for their own
 * datasource pickers) rather than this component making its own extra network call per row.
 *
 * `onDelete`/`onDuplicate`/`onExport`: optional — when passed, renders small icon buttons on
 * the row (hidden until hover, hidden entirely in `collapsed` mode where there's no room) so
 * a chart can be removed/copied/exported straight from the list instead of requiring select-
 * then-scroll-to-the-form-button, or (for export) placing it on a dashboard first — mirrors
 * the download/duplicate/remove icon set a placed dashboard widget already has (see
 * DashboardCanvasEditor.jsx's dbe-widget-actions). All three receive no args — callers
 * already have `widget` in scope via closure. `onExport` is async — the row shows a small
 * inline "…" while it awaits (fetching the chart's data takes a network round-trip, unlike
 * duplicate/delete's own fire-and-forget confirmation flow).
 */
export default function ChartListItem({
  widget, selected = false, disabled = false, badge, collapsed = false,
  onClick, draggable = false, onDragStart, onDragEnd, title, datasourceNamesById = {},
  onDelete, onDuplicate, onExport,
}) {
  const [exporting, setExporting] = React.useState(false);
  const meta = CHART_TYPE_META[widget.chart_type];
  const Icon = meta?.icon;
  // Rendered defensively — these fields' exact presence/naming isn't confirmed on every
  // endpoint's response shape, so each only shows up if actually resolvable, never assumed.
  const datasourceLabel = widget.datasource_name || widget.datasource?.name || datasourceNamesById[widget.datasource_id];
  const modifiedLabel = widget.updated_at || widget.modified_at || widget.created_at;
  const shortId = widget.id ? String(widget.id).slice(0, 8) : null;
  // One labeled line per field (matches the per-widget side panel's own "Details" block —
  // Datasource/Chart ID/Type — instead of cramming everything into one truncated line).
  const metaRows = [
    datasourceLabel ? { label: 'Datasource', value: datasourceLabel } : null,
    { label: 'Type', value: meta?.label || widget.chart_type },
    shortId ? { label: 'ID', value: `#${shortId}` } : null,
    modifiedLabel ? { label: 'Modified', value: modifiedLabel } : null,
  ].filter(Boolean);

  const hasActions = !collapsed && !disabled && (onDelete || onDuplicate || onExport);

  return (
    <>
    {/* A plain <div role="button"> instead of a real <button> — the delete/duplicate icons
        below need to be real, independently-clickable <button>s of their own, and a <button>
        can't contain nested interactive elements. */}
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={title ?? `${widget.name}${disabled ? ' — already on this dashboard' : ''}`}
      aria-disabled={disabled}
      className={`chart-list-item${collapsed ? ' collapsed' : ''}${disabled ? ' used' : ''}${selected ? ' selected' : ''}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(e); } }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {Icon && <Icon size={14} color={meta.color} />}
      {!collapsed && (
        <span className="chart-list-item-body">
          <span className="chart-list-item-name">{widget.name}</span>
          {metaRows.map((row) => (
            <span key={row.label} className="chart-list-item-meta-row">
              <span className="chart-list-item-meta-label">{row.label}</span>
              <span className="chart-list-item-meta-value">{row.value}</span>
            </span>
          ))}
        </span>
      )}
      {!collapsed && badge && <span className="chart-list-item-badge">{badge}</span>}
      {hasActions && (
        <span className="chart-list-item-actions">
          {onExport && (
            <button
              type="button"
              title="Export CSV"
              aria-label="Export CSV"
              disabled={exporting}
              className="chart-list-item-action"
              onClick={async (e) => {
                e.stopPropagation();
                setExporting(true);
                try { await onExport(); } finally { setExporting(false); }
              }}
            >
              <Download size={12} />
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              title="Duplicate chart"
              aria-label="Duplicate chart"
              className="chart-list-item-action"
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            >
              <Copy size={12} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="Delete chart"
              aria-label="Delete chart"
              className="chart-list-item-action chart-list-item-action-danger"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </span>
      )}
    </div>
    {/* Scoped CSS co-located with the component so it renders correctly wherever this item
        is used, regardless of which parent mounted it (same lesson as WidgetStyleFields.jsx).
        Repeated once per list row, but it's identical/idempotent — no practical cost for a
        list of this size, and it guarantees the styling can never silently go missing. */}
    <style>{`
        .chart-list-item {
          display:flex; align-items:flex-start; gap:6px; padding:8px; border-radius:8px;
          border:1px solid rgb(226 232 240); background:#fff; cursor:pointer; text-align:left;
          font-size:12px; color:#334155; transition:border-color .15s,background .15s; width:100%;
        }
        .chart-list-item.collapsed { align-items:center; justify-content:center; padding:8px; }
        .chart-list-item span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .chart-list-item:hover { border-color:#EC7D09; background:rgba(236,125,9,0.06); }
        .chart-list-item-body { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
        .chart-list-item-name { font-weight:600; margin-bottom:2px; }
        .chart-list-item-meta-row { display:flex; gap:5px; font-size:10px; line-height:1.5; }
        .chart-list-item-meta-label { color:#94a3b8; font-weight:500; flex-shrink:0; }
        .chart-list-item-meta-value { color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .chart-list-item-badge {
          flex-shrink:0; font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.02em;
          color:#16a34a; background:#dcfce7; border-radius:4px; padding:2px 5px;
        }
        .chart-list-item.used { opacity:0.5; cursor:not-allowed; background:#f8fafc; }
        .chart-list-item.used:hover { border-color:rgb(226 232 240); background:#f8fafc; }
        .chart-list-item.selected { border-color:#EC7D09; background:rgba(236,125,9,0.08); box-shadow:0 0 0 1px #EC7D09; }
        .chart-list-item.selected.used { opacity:0.85; }
        .chart-list-item-actions {
          overflow:visible !important; flex-shrink:0; display:flex; gap:3px; opacity:0;
          transition:opacity .1s; margin-left:auto;
        }
        .chart-list-item:hover .chart-list-item-actions,
        .chart-list-item:focus-visible .chart-list-item-actions,
        .chart-list-item.selected .chart-list-item-actions { opacity:1; }
        .chart-list-item-action {
          width:20px; height:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
          border:1px solid rgb(226 232 240); border-radius:5px; background:#fff; color:#64748b; cursor:pointer;
        }
        .chart-list-item-action:hover { background:#f1f5f9; }
        .chart-list-item-action-danger:hover { background:#fef2f2; border-color:#fecaca; color:#dc2626; }
      `}</style>
    </>
  );
}
