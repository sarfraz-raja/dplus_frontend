import React from 'react';
import { RefreshCw } from 'lucide-react';
import MultiSelectFilterInput from './MultiSelectFilterInput';

/**
 * The on-canvas rendering of a `slicer`-type widget — a real grid widget (draggable/
 * resizable like KPI Card/Line/etc., see widgetTypeRegistry.js), not a toolbar control.
 * This is the Power BI/Superset "slicer" pattern: a standalone interactive filter widget
 * that lives on the dashboard surface itself and whose selection auto-filters every other
 * widget (via the slicer's own backend resource — selected_values applies server-side on
 * every /dashboards/{id}/data call, no client-side cross-filter wiring needed).
 *
 * `slicer` is resolved by DashboardCanvasEditor's WidgetContent from its own `slicers` state
 * (matched on `widget.dataSource.slicerId`) — not fetched here, so this stays a dumb view.
 */
export default function SlicerWidgetCard({ slicer, onChange, onRefresh, busy = false }) {
  if (!slicer) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 px-3 text-center">
        Slicer unavailable — it may have been removed from the dashboard elsewhere.
      </div>
    );
  }
  return (
    <div className="h-full w-full flex flex-col justify-center gap-2 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-600 truncate">
          {slicer.label || slicer.column_name}
        </label>
        <button
          type="button"
          title="Refresh available values"
          aria-label="Refresh available values"
          onClick={(e) => { e.stopPropagation(); onRefresh?.(slicer.id); }}
          disabled={busy}
          className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      <MultiSelectFilterInput
        fullWidth
        options={(slicer.available_values || []).map(String)}
        loading={busy}
        value={Array.isArray(slicer.selected_values) ? slicer.selected_values.map(String) : []}
        onChange={(next) => onChange?.(slicer.id, next)}
      />
    </div>
  );
}
