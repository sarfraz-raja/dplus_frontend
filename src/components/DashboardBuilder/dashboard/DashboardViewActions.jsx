import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import FloatingPanel from '../../FloatingPanel';
import FilterPanel from '../filters/FilterPanel';
import FiltersToggleButton from '../filters/FiltersToggleButton';
import AutoRefreshControl from './AutoRefreshControl';

// The viewer controls on a dashboard's title row (DashboardCanvasEditor `titleBarActions`):
// filter values (compact icon, only when filters are configured) · ↻ Refresh · Auto-refresh ·
// Export. One component for every read-only view — published/embedded (EmbeddedDashboard),
// fullscreen and the Dashboard Builder preview — so they look and behave the same.
// Builder/admin actions (Filters setup, Edit, Clone, Publish, Delete) stay in the page header;
// `showFilterSetup` adds the Filters setup button here (fullscreen has no page header).
// `editorRef`: the DashboardCanvasEditor ref (applyFilters / saveFilters / clearFilterValues /
// refresh / exportCSV|PNG|PDF). `filterState`: { filters, datasourceOptions } from onFiltersState.
export default function DashboardViewActions({
  editorRef, filterState = { filters: [], datasourceOptions: [] },
  seconds = 0, onSecondsChange, refreshState = { refreshing: false, lastRefreshedAt: null },
  showFilterSetup = false, className = '',
}) {
  const exportAnchorRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>
      {/* Filter SETUP needs datasource access — only where there's no page header (fullscreen). */}
      {showFilterSetup && (
        <FiltersToggleButton
          filters={filterState.filters}
          datasourceOptions={filterState.datasourceOptions}
          onSave={(rows) => editorRef.current?.saveFilters(rows)}
        />
      )}
      {filterState.filters.length > 0 && (
        <div className="shrink-0">
          <FilterPanel
            compact
            filters={filterState.filters}
            onApply={(rows) => editorRef.current?.applyFilters(rows)}
            onClear={() => editorRef.current?.clearFilterValues()}
            datasourceOptions={filterState.datasourceOptions}
          />
        </div>
      )}
      <AutoRefreshControl
        seconds={seconds}
        onSecondsChange={onSecondsChange}
        onRefresh={() => editorRef.current?.refresh()}
        refreshing={refreshState.refreshing}
        lastRefreshedAt={refreshState.lastRefreshedAt}
      />
      <button
        ref={exportAnchorRef}
        type="button"
        title="Export dashboard"
        aria-label="Export dashboard"
        aria-haspopup="menu"
        aria-expanded={exportOpen}
        onClick={() => setExportOpen((o) => !o)}
        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
      >
        <Download size={14} aria-hidden="true" />
      </button>
      <FloatingPanel anchorRef={exportAnchorRef} open={exportOpen} onClose={() => setExportOpen(false)} minWidth={120} align="end">
        <div role="menu" className="flex flex-col py-1">
          {[['CSV', 'exportCSV'], ['PNG', 'exportPNG'], ['PDF', 'exportPDF']].map(([label, fn]) => (
            <button
              key={fn}
              type="button"
              role="menuitem"
              className="px-3 py-1.5 text-left text-ui-small text-slate-700 hover:bg-[#EC7D09]/[0.08]"
              onClick={() => { setExportOpen(false); editorRef.current?.[fn]?.(); }}
            >
              Export {label}
            </button>
          ))}
        </div>
      </FloatingPanel>
    </div>
  );
}
