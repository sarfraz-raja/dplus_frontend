import React from 'react';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, RotateCcw } from 'lucide-react';
import CHART_TYPE_META from '../charts/chartTypeMeta';
import WIDGET_TYPE_REGISTRY from '../widgetConfig/widgetTypeRegistry';

// Left panel "Selected Widget" section (DashboardCanvasEditor.jsx): what the widget is (type
// icon + name + chart type · datasource), its title for this dashboard, where it sits (tab,
// size, own filters) and the chart-level actions. Read-mostly — style lives in the Selected
// Widget Style section below it. The `!` utilities beat the side panel's own global
// `.dbe-side-panel label/input/select` rules (block labels with a bottom margin, inputs with a
// top margin), which would otherwise break this layout.

function DetailRow({ label, children }) {
  return (
    <>
      <span className="text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-slate-700">{children}</span>
    </>
  );
}

export default function SelectedWidgetDetails({
  widget, layoutEntry, tabs = [], datasourceName,
  onTitleChange, onMoveToTab, onEditChart, children,
}) {
  const isChart = widget.type === 'chartLibrary';
  const chartType = widget.dataSource?.chartType;
  const chartMeta = isChart ? CHART_TYPE_META[chartType] : null;
  const registryDef = WIDGET_TYPE_REGISTRY[widget.type];
  const Icon = chartMeta?.icon || registryDef?.icon;
  const color = chartMeta?.color || registryDef?.iconColor || '#64748b';
  const typeLabel = chartMeta ? `${chartMeta.label} chart` : (registryDef?.label || widget.type);
  // The chart's own name (Charts tab) — the title here only renames this placement.
  const chartName = widget.dataSource?.chartName;
  const renamed = isChart && chartName && widget.title !== chartName;
  const widgetId = widget.dataSource?.widgetId;
  const ownFilterCount = widget.filters?.length || 0;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(widgetId));
      toast.success('Chart ID copied');
    } catch {
      toast.error('Could not copy the ID');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ color, background: `${color}1a` }}
          aria-hidden="true"
        >
          {Icon && <Icon size={18} />}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-slate-800" title={widget.title}>{widget.title || 'Untitled'}</div>
          <div className="truncate text-[11px] text-slate-500">
            {typeLabel}{isChart && datasourceName ? ` · ${datasourceName}` : ''}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="dbe-selected-title" className="!mb-0 text-[11px] !font-semibold !text-slate-600">Title on this dashboard</label>
          {renamed && (
            <button
              type="button"
              onClick={() => onTitleChange(chartName)}
              title={`Reset to the chart's name: ${chartName}`}
              className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-800"
            >
              <RotateCcw size={11} aria-hidden="true" /> Reset
            </button>
          )}
        </div>
        <input
          id="dbe-selected-title"
          type="text"
          value={widget.title || ''}
          onChange={(e) => onTitleChange(e.target.value)}
          className="!mt-0 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 focus:border-slate-400 focus:outline-none"
        />
        {renamed && <span className="text-[10.5px] text-slate-400">Chart name: {chartName}</span>}
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-[12px]">
        {tabs.length > 0 && layoutEntry && (
          <>
            <label htmlFor="dbe-selected-tab" className="!mb-0 !font-normal !text-slate-400">Tab</label>
            <select
              id="dbe-selected-tab"
              value={layoutEntry.tabId || ''}
              onChange={(e) => onMoveToTab(e.target.value || null)}
              className="!mt-0 min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              <option value="">All tabs</option>
              {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>
        )}
        {layoutEntry && <DetailRow label="Size">{layoutEntry.w} × {layoutEntry.h}</DetailRow>}
        {isChart && <DetailRow label="Filters">{ownFilterCount > 0 ? `${ownFilterCount} on this widget` : 'Dashboard filters only'}</DetailRow>}
      </div>

      {isChart && widgetId && (
        <div className="flex gap-2">
          {onEditChart && (
            <button
              type="button"
              onClick={onEditChart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-1.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink size={12} aria-hidden="true" /> Edit chart
            </button>
          )}
          <button
            type="button"
            onClick={copyId}
            title={String(widgetId)}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <Copy size={12} aria-hidden="true" /> Copy ID
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
