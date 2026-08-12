import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import renderChartWidget from './renderChartWidget';
import DrillContextMenu from './DrillContextMenu';

/**
 * Renders one Chart Library widget bound into the Dashboard Builder canvas (see the
 * 'chartLibrary' entry in widgetTypeRegistry.js) — a thin wrapper around renderChartWidget
 * that also handles the "not picked yet" / loading / error states DashboardCanvasEditor's
 * resolveWidgetProps can't represent as a chart itself, the busy overlay shown while a drill
 * click's refetch is in flight, and the right-click "Drill down into X / Drill up /
 * Cross-filter by X" menu on an individual point (DrillContextMenu) — its open/closed state
 * lives here since renderChartWidget is a plain function, not a component. The chart-wide
 * up/down icons live separately, in DashboardCanvasEditor.jsx's own widget action row
 * (top-right, alongside export/edit/duplicate/delete) — this menu is specifically the
 * PER-POINT interaction (right-click a bar → drill into/cross-filter by exactly that bar), not
 * a duplicate of those. Left-click still does the widget's single default action (drilling
 * wins when both drill-down and cross-filter are configured — see DashboardCanvasEditor.jsx's
 * handleWidgetPointClickRef); this menu is what makes the non-default action reachable.
 */
export default function ChartLibraryWidgetView({
  chartType, name, mapping, rows, loading, error, picked, height, style, onPointClick, onDrillUp,
  drillDown, drilling, comparison, crossFilterEnabled, onPointCrossFilter,
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
  // Same xAxis fallback renderChartWidget.jsx uses (drill dimension once a hierarchy is
  // configured, else the chart's own mapped column) — the column a cross-filter fired from
  // this menu should filter sibling widgets on.
  const crossFilterColumn = (drillDown?.enabled && drillDown.dimension) || mapping?.x_axis;
  const canCrossFilter = !!crossFilterEnabled && !!onPointCrossFilter;
  // Whether drill-down is configured on this widget AT ALL (vs. merely "not clickable right
  // now because we're already at the deepest level") — gates whether the menu's Drill
  // down/up section renders, so a cross-filter-only widget's menu doesn't show two greyed-out
  // drill buttons it can never use.
  const showDrillSection = !!drillDown?.enabled || canDrillUp;

  return (
    <div className="relative h-full flex flex-col">
      {drilling && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
          <Loader2 size={18} className="animate-spin text-sky-500" />
        </div>
      )}
      {renderChartWidget({
        chartType, name, mapping, rows: rows || [], height, style, onPointClick, comparison, drillDown,
        // Menu is offered whenever EITHER feature is reachable from this point, not just
        // drilling — a widget with both drill-down and cross-filter configured needs the menu
        // to expose cross-filter too, since left-click there is claimed by drilling (see
        // handleWidgetPointClickRef's priority in DashboardCanvasEditor.jsx).
        onPointContextMenu: (canDrillDown || canCrossFilter) ? (label, x, y) => setMenu({ label, x, y }) : undefined,
      })}
      {menu && (
        <DrillContextMenu
          x={menu.x}
          y={menu.y}
          label={menu.label}
          showDrillSection={showDrillSection}
          canDrillDown={canDrillDown}
          canDrillUp={canDrillUp}
          canCrossFilter={canCrossFilter}
          onDrillDown={() => {
            onPointClick?.({ column: (drillDown.dimension || mapping?.x_axis), value: menu.label });
            setMenu(null);
          }}
          onDrillUp={() => {
            onDrillUp?.((drillDown.path?.length || 0) - 1);
            setMenu(null);
          }}
          onCrossFilter={() => {
            onPointCrossFilter?.({ column: crossFilterColumn, value: menu.label });
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
