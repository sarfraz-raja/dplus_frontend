import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../../../utils/common';
import { Copy, ExternalLink, RotateCcw, ClipboardPaste, Filter, Pencil, MoreHorizontal } from 'lucide-react';
import CHART_TYPE_META from '../charts/chartTypeMeta';
import WIDGET_TYPE_REGISTRY from '../widgetConfig/widgetTypeRegistry';
import Select from '../../Select'; // shared dropdown — replaces native <select> (CLAUDE.md §4)

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
  // Size (grid units): editable W × H, plus Copy size → Paste size onto another widget.
  onSizeChange = null, copiedSize = null, onCopySize = null, maxW = 144,
  // 'loaded' | 'loading' | 'error' | null (no data, e.g. Text Box) — the dot after the subtitle.
  dataStatus = null,
  // Opens this widget's own filter editor (the "…" on the Filters pill).
  onEditFilters = null,
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
    if (await copyToClipboard(widgetId)) toast.success('Chart ID copied');
    else toast.error('Could not copy the ID');
  };

  // Title: shown as text; click (or Enter/Space when focused) to edit — Enter / blur saves, Esc cancels.
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const startEdit = () => { setTitleDraft(widget.title || ''); setEditingTitle(true); };
  const saveTitle = () => { setEditingTitle(false); if (titleDraft !== (widget.title || '')) onTitleChange(titleDraft); };
  // `!` beats the side panel's global input rules (.dbe-side-panel input — border/padding/margin).
  const numInput = '!m-0 !border-0 !p-0 !shadow-none !bg-transparent w-full min-w-0 text-dbe-body text-slate-700 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
  // OLD: flex-1 min-w-0 — shrank to nothing in the narrow left panel. Fixed width that fits 3 digits.
  // `!flex !mb-0`: these are <label>s, and the side panel's `.dbe-side-panel label { display:block;
  // margin-bottom:10px }` would otherwise turn them into stacked blocks.
  const boxCls = '!mb-0 !flex h-7 min-w-[50px] flex-1 items-center gap-1 rounded-md border border-slate-200 bg-[var(--dbe-surface-element)] px-1.5 focus-within:border-[#EC7D09] focus-within:bg-white';

  // Layout follows the "Widget Inspector" mockup: a header (icon, title, type · datasource) over a
  // divider, then aligned label/value rows and two equal action buttons. OLD layout (title input at
  // the top, loose rows, unequal buttons) replaced in place — behaviour unchanged.
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2.5 border-b border-slate-100 p-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ color, background: `${color}1a` }}
          aria-hidden="true"
        >
          {Icon && <Icon size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              id="dbe-selected-title"
              type="text"
              autoFocus
              value={titleDraft}
              placeholder="Untitled"
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); else if (e.key === 'Escape') setEditingTitle(false); }}
              aria-label="Widget title"
              className="!m-0 w-full !rounded !border !border-[#EC7D09] !bg-white !px-1 !py-0.5 -ml-1 !text-dbe-body font-semibold text-slate-800 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              // full title in the tooltip when it's truncated
              title={`${widget.title || 'Untitled'}\n${isChart ? 'Click to rename on this dashboard — the chart keeps its own name' : 'Click to rename'}`}
              className="group -ml-1 flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-dbe-body font-semibold text-slate-800 hover:bg-slate-100"
            >
              <span className="min-w-0 flex-1 truncate">{widget.title || <span className="text-slate-400">Untitled</span>}</span>
              {/* faint pencil on hover/focus — shows the title is renamable */}
              <Pencil size={11} aria-hidden="true" className="shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          )}
          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-dbe-meta text-slate-500">
            <span className="shrink-0">{typeLabel}</span>
            {isChart && datasourceName && <><span aria-hidden="true" className="text-slate-300">·</span><span className="truncate font-mono text-slate-400">{datasourceName}</span></>}
            {dataStatus && (
              <span
                role="img"
                aria-label={`Data ${dataStatus}`}
                title={dataStatus === 'loaded' ? 'Data loaded' : dataStatus === 'loading' ? 'Loading data…' : 'Data failed to load'}
                className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${dataStatus === 'loaded' ? 'bg-emerald-500' : dataStatus === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`}
              />
            )}
          </div>
          {renamed && (
            <div className="mt-1 flex items-center justify-between gap-2 text-dbe-meta text-slate-400">
              <span className="min-w-0 truncate">Chart name: {chartName}</span>
              <button
                type="button"
                onClick={() => onTitleChange(chartName)}
                title={`Reset to the chart's name: ${chartName}`}
                className="flex shrink-0 items-center gap-1 font-semibold text-slate-500 hover:text-slate-800"
              >
                <RotateCcw size={11} aria-hidden="true" /> Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-2.5">
        {/* OLD: grid-cols-[52px_1fr] — with the size boxes + Copy the row was wider than the narrow panel and
            the card cut Copy off. Label column now sized to its text; the size row wraps if still too tight. */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-2 text-dbe-body">
          {tabs.length > 0 && layoutEntry && (
            <>
              <label htmlFor="dbe-selected-tab" className="!mb-0 !font-normal !text-slate-500">Tab</label>
              <Select
                id="dbe-selected-tab"
                value={layoutEntry.tabId || ''}
                onChange={(e) => onMoveToTab(e.target.value || null)}
                className="!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700"
              >
                <option value="">All tabs</option>
                {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </>
          )}
          {layoutEntry && (
            <>
              <span className="text-slate-500">Size</span>
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {onSizeChange ? (
                  <>
                    <label className={boxCls}>
                      <span className="text-dbe-meta font-semibold text-slate-400">W</span>
                      <input type="number" min={1} max={maxW} value={layoutEntry.w} aria-label="Width"
                        onChange={(e) => onSizeChange(Math.max(1, Math.min(maxW, Number(e.target.value) || 1)), layoutEntry.h)}
                        className={numInput} />
                    </label>
                    <span className="text-slate-400">×</span>
                    <label className={boxCls}>
                      <span className="text-dbe-meta font-semibold text-slate-400">H</span>
                      <input type="number" min={1} value={layoutEntry.h} aria-label="Height"
                        onChange={(e) => onSizeChange(layoutEntry.w, Math.max(1, Number(e.target.value) || 1))}
                        className={numInput} />
                    </label>
                  </>
                ) : <span className="text-slate-700">{layoutEntry.w} × {layoutEntry.h}</span>}
                {onCopySize && (
                  <button
                    type="button"
                    onClick={() => onCopySize({ w: layoutEntry.w, h: layoutEntry.h })}
                    title="Copy size — then select another widget and paste it"
                    aria-label="Copy size"
                    // Label back now that the panel is 15% wide; still wraps below the boxes if tight.
                    className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-600 hover:border-[#EC7D09] hover:text-[#EC7D09]"
                  >
                    <Copy size={12} aria-hidden="true" /> Copy
                  </button>
                )}
              </span>
              {onSizeChange && copiedSize && (copiedSize.w !== layoutEntry.w || copiedSize.h !== layoutEntry.h) && (
                <>
                  <span />
                  <button
                    type="button"
                    onClick={() => onSizeChange(Math.min(maxW, copiedSize.w), copiedSize.h)}
                    className="dbe-action-btn is-sm w-fit gap-1 px-2"
                  >
                    <ClipboardPaste size={11} aria-hidden="true" /> Paste size {copiedSize.w} × {copiedSize.h}
                  </button>
                </>
              )}
            </>
          )}
          {isChart && (
            <>
              <span className="text-slate-500">Filters</span>
              <span className="flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-slate-600">
                <Filter size={12} aria-hidden="true" className="shrink-0 text-slate-400" />
                {/* OLD text: 'Dashboard filters only' / 'N on this widget' — cut off in the narrow panel. */}
                <span className="min-w-0 flex-1 truncate">{ownFilterCount > 0 ? `${ownFilterCount} own filter${ownFilterCount === 1 ? '' : 's'}` : 'Dashboard filters only'}</span>
                {onEditFilters && (
                  <button
                    type="button"
                    onClick={onEditFilters}
                    title="Edit this widget's own filters"
                    aria-label="Edit this widget's own filters"
                    className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <MoreHorizontal size={13} aria-hidden="true" />
                  </button>
                )}
              </span>
            </>
          )}
        </div>

        {isChart && widgetId && (
          <div className="grid grid-cols-2 gap-2">
            {onEditChart && (
              <button
                type="button"
                onClick={onEditChart}
                className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white text-dbe-body font-semibold text-slate-700 hover:border-[#EC7D09] hover:text-[#EC7D09]"
              >
                <ExternalLink size={12} aria-hidden="true" /> Edit chart
              </button>
            )}
            <button
              type="button"
              onClick={copyId}
              title={String(widgetId)}
              className={`flex h-7 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white text-dbe-body font-semibold text-slate-700 hover:border-[#EC7D09] hover:text-[#EC7D09]${onEditChart ? '' : ' col-span-2'}`}
            >
              <Copy size={12} aria-hidden="true" /> Copy ID
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
