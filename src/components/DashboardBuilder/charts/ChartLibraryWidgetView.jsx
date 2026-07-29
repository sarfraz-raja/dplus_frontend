import React from 'react';
import renderChartWidget from './renderChartWidget';

/**
 * Renders one Chart Library widget bound into the Dashboard Builder canvas (see the
 * 'chartLibrary' entry in widgetTypeRegistry.js) — a thin wrapper around renderChartWidget
 * that also handles the "not picked yet" / loading / error states DashboardCanvasEditor's
 * resolveWidgetProps can't represent as a chart itself.
 */
export default function ChartLibraryWidgetView({ chartType, name, mapping, rows, loading, error, picked, height, style }) {
  if (!picked) {
    return <div className="text-xs text-slate-400 p-2">Pick a widget from the library in the side panel.</div>;
  }
  if (loading) {
    return <div className="text-xs text-slate-400 p-2">Loading…</div>;
  }
  if (error) {
    return <div className="text-xs text-red-500 p-2">{error}</div>;
  }
  return renderChartWidget({ chartType, name, mapping, rows: rows || [], height, style });
}
