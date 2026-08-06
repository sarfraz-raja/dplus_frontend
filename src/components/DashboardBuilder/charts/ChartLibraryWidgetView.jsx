import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import renderChartWidget from './renderChartWidget';
import DrillContextMenu from './DrillContextMenu';

/**
 * Renders one Chart Library widget bound into the Dashboard Builder canvas (see the
 * 'chartLibrary' entry in widgetTypeRegistry.js) — a thin wrapper around renderChartWidget
 * that also handles the "not picked yet" / loading / error states DashboardCanvasEditor's
 * resolveWidgetProps can't represent as a chart itself, the busy overlay shown while a drill
 * click's refetch is in flight, and the right-click "Drill down into X / Drill up" menu on an
 * individual point (DrillContextMenu) — its open/closed state lives here since
 * renderChartWidget is a plain function, not a component. The chart-wide up/down icons live
 * separately, in DashboardCanvasEditor.jsx's own widget action row (top-right, alongside
 * export/edit/duplicate/delete) — this menu is specifically the PER-POINT interaction
 * (right-click a bar → drill into exactly that bar), not a duplicate of those.
 */
export default function ChartLibraryWidgetView({
  chartType, name, mapping, rows, loading, error, picked, height, style, onPointClick, onDrillUp,
  drillDown, drilling, comparison,
}) {
  const [menu, setMenu] = useState(null); // { label, x, y } | null

  if (!picked) {
    return <div className="text-xs text-slate-400 p-2">Pick a widget from the library in the side panel.</div>;
  }
  if (loading) {
    return <div className="text-xs text-slate-400 p-2">Loading…</div>;
  }
  if (error) {
    return <div className="text-xs text-red-500 p-2">{error}</div>;
  }

  const canDrillUp = (drillDown?.path?.length || 0) > 0;
  const canDrillDown = !!drillDown?.enabled && !!drillDown?.has_next_level;

  return (
    <div className="relative h-full flex flex-col">
      {drilling && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
          <Loader2 size={18} className="animate-spin text-sky-500" />
        </div>
      )}
      {renderChartWidget({
        chartType, name, mapping, rows: rows || [], height, style, onPointClick, comparison, drillDown,
        onPointContextMenu: (drillDown?.enabled && onPointClick) ? (label, x, y) => setMenu({ label, x, y }) : undefined,
      })}
      {menu && (
        <DrillContextMenu
          x={menu.x}
          y={menu.y}
          label={menu.label}
          canDrillDown={canDrillDown}
          canDrillUp={canDrillUp}
          onDrillDown={() => {
            onPointClick?.({ column: (drillDown.dimension || mapping?.x_axis), value: menu.label });
            setMenu(null);
          }}
          onDrillUp={() => {
            onDrillUp?.((drillDown.path?.length || 0) - 1);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
