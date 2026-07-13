import React, { useEffect, useRef, useState } from 'react';
import { GridLayout } from 'react-grid-layout';
import { X } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import Button from '../Button';
import WIDGET_TYPE_REGISTRY, { resolveWidgetStyle } from './widgetTypeRegistry';
import MOCK_DATA_SOURCES from './mockDataSources';
import WidgetStyleFields from './WidgetStyleFields';

let uid = 0;
const nextId = () => `w${Date.now()}_${uid++}`;

// Must match the gridConfig passed to <GridLayout> below — kept as one constant so
// per-widget pixel heights (for chart components that need an explicit height prop)
// stay in sync with the actual grid math.
// rowHeight/margin[1] set the vertical resize step: 24px (20 + 4) — fine enough that a
// widget's grid cell can land close to its actual content height instead of being stuck
// between two coarse 48px increments.
// rowHeight/margin[1] set the vertical resize step: 6px (5 + 1) — halved again from the
// previous 12px so widgets can be resized in even smaller, more precise increments.
// cols:144 (12x the visual 12-column layout) gives a much finer horizontal resize step —
// colWidth = containerWidth / cols, so more columns means each x/w unit is fewer pixels.
// margin[0] stays 8 (unchanged) so same-row card-to-card gaps don't shift.
const GRID_CONFIG = { cols: 144, rowHeight: 5, margin: [8, 1] };

// Below this container width, GridLayout just shrinks colWidth instead of reflowing —
// every widget keeps its desktop column-span and squeezes into unreadable slivers. Bypass
// the grid entirely below this breakpoint and stack widgets full-width instead.
const STACK_BREAKPOINT = 900;

const dataSourceKeysFor = (dataShape) =>
  Object.entries(MOCK_DATA_SOURCES)
    .filter(([, ds]) => ds.dataShape === dataShape)
    .map(([key, ds]) => ({ key, label: ds.label }));

/** Reads a dot-path (e.g. "stats.0", "kpiTableProps") off a live-data object. */
function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/**
 * Maps a widget's { type, dataSource, title, style } to the props its component expects.
 * `dataSource.type === 'kpiLive'` reads from the dashboard's already-fetched live data
 * (via `dataSource.field`) instead of the mock generators. `style` values come from
 * resolveWidgetStyle (widgetTypeRegistry.js), already merged with the type's styleFields
 * defaults — see WidgetStyleFields.jsx for where a widget's `style` object is edited.
 */
function resolveWidgetProps(widget, ctx) {
  const { type, dataSource, title } = widget;
  const { kpiLiveData, pixelHeight, isDark, titleColor: dashboardTitleColor } = ctx || {};
  const style = resolveWidgetStyle(type, widget.style);

  let resolved = {};
  if (dataSource?.type === 'kpiLive') {
    const raw = getByPath(kpiLiveData, dataSource.field);
    resolved = type === 'degradedCellsTable' || type === 'degradedCellsMap' ? { rows: raw || [] } : (raw || {});
  } else {
    const ds = MOCK_DATA_SOURCES[dataSource?.key];
    resolved = ds ? ds.generate() : {};
  }

  const finalColor = style.color || resolved.color;
  // A dashboard-level titleColor (e.g. the KPI dashboard's own "Customize colors" panel,
  // passed in via the `titleColor` prop on DashboardCanvasEditor) is the fallback when a
  // widget hasn't set its own style.titleColor override.
  const finalTitleColor = style.titleColor || dashboardTitleColor;
  // Chart widgets need an explicit pixel height (ECharts doesn't fill a resizable
  // container on its own) — leave room for the widget's own title row + chrome.
  const chartHeight = pixelHeight ? Math.max(60, pixelHeight - 40) : undefined;

  switch (type) {
    case 'statCard':
      return {
        label: resolved.label ?? title, fullName: resolved.fullName, value: resolved.value,
        delta: resolved.delta, deltaUp: resolved.deltaUp, icon: resolved.icon,
        color: finalColor, darkGradient: resolved.darkGradient, isDark,
      };
    case 'gaugeCard':
      return { title, value: resolved.value, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor };
    case 'sparklineCard':
      return { title: resolved.title ?? title, unit: resolved.unit, data: resolved.data, color: finalColor, height: chartHeight, isDark, titleColor: finalTitleColor };
    case 'kpiTable':
      return {
        rows: resolved.rows || [], statusColors: resolved.statusColors, trendRenderer: resolved.trendRenderer,
        rowTextColor: style.rowTextColor, rowFontWeight: style.rowFontWeight, rowFontSize: style.rowFontSize,
      };
    case 'degradedCellsTable':
      return { rows: resolved.rows || [], rowTextColor: style.rowTextColor, rowFontWeight: style.rowFontWeight, rowFontSize: style.rowFontSize };
    case 'degradedCellsMap':
      return { rows: resolved.rows || [] };
    default:
      return {};
  }
}

function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width || 800);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Canvas editor: palette of widget types (click to add) + a react-grid-layout
 * canvas where placed widgets can be dragged/resized, plus a side panel to
 * pick each widget's data source. Renders read-only (no palette/side panel,
 * static grid) when `editable` is false.
 */
export default function DashboardCanvasEditor({
  initialLayout = [], initialWidgets = {}, initialName = '', editable = true, onSave, onCancel,
  kpiLiveData = null, isDark = null, titleColor = null,
  showChrome = true, onLayoutChange,
}) {
  const [name, setName] = useState(initialName);
  const [layout, setLayout] = useState(initialLayout);
  const [widgets, setWidgets] = useState(initialWidgets);
  const [selectedId, setSelectedId] = useState(null);
  const [containerRef, containerWidth] = useContainerWidth();

  const addWidget = (type) => {
    const def = WIDGET_TYPE_REGISTRY[type];
    const id = nextId();
    const y = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    setLayout((prev) => [...prev, { i: id, x: 0, y, w: def.defaultSize.w, h: def.defaultSize.h }]);
    const defaultSourceKey = dataSourceKeysFor(def.dataShape)[0]?.key || '';
    const defaultColor = MOCK_DATA_SOURCES[defaultSourceKey]?.generate()?.color || '#4f9eff';
    setWidgets((prev) => ({
      ...prev,
      [id]: { type, title: def.label, dataSource: { type: 'mock', key: defaultSourceKey }, style: { color: defaultColor } },
    }));
    setSelectedId(id);
  };

  const removeWidget = (id) => {
    setLayout((prev) => prev.filter((l) => l.i !== id));
    setWidgets((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedId((s) => (s === id ? null : s));
  };

  const updateWidget = (id, patch) => {
    setWidgets((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const selected = selectedId ? widgets[selectedId] : null;

  const isStacked = containerWidth > 0 && containerWidth < STACK_BREAKPOINT;
  // Natural top-to-bottom/left-to-right reading order, ignoring x/w grid spans.
  const stackedLayout = isStacked ? [...layout].sort((a, b) => a.y - b.y || a.x - b.x) : layout;

  // Shared per-widget rendering for both the grid and stacked layouts — only the outer
  // positioning mechanism differs (react-grid-layout's absolute grid vs. a flex column).
  const renderWidget = (l, sizeOverride) => {
    const w = widgets[l.i];
    if (!w) return <div key={l.i} />;
    const Comp = WIDGET_TYPE_REGISTRY[w.type]?.component;
    const pixelHeight = l.h * GRID_CONFIG.rowHeight + (l.h - 1) * GRID_CONFIG.margin[1];
    const props = resolveWidgetProps(w, { kpiLiveData, pixelHeight, isDark, titleColor });
    // Style values (color/titleColor/rowTextColor/etc.) now flow directly into each
    // widget's own props via resolveWidgetProps — this wrapper only needs an explicit
    // height. Without it, this div defaults to height:auto — any child relying on
    // height:100% (e.g. a map) can't resolve a percentage against an ancestor with no
    // definite size, and collapses to 0 even though .dbe-widget (two levels up) does
    // have a real pixel height from react-grid-layout.
    const textStyle = { height: '100%' };
    return (
      <div
        key={l.i}
        className={`dbe-widget dbe-widget-${w.type}${selectedId === l.i ? ' selected' : ''}`}
        style={sizeOverride ? { height: sizeOverride.height, width: sizeOverride.width, flexShrink: 0 } : undefined}
        // Clicking anywhere on a widget selects it and swaps the side panel to its
        // fields — not just its title bar, which was too small a target to notice.
        onClick={editable && showChrome && !sizeOverride ? () => setSelectedId(l.i) : undefined}
      >
        {editable && showChrome && !sizeOverride && (
          <div className="dbe-widget-head">
            <span className="dbe-widget-title">{w.title}</span>
            <button type="button" className="dbe-widget-remove" onClick={(e) => { e.stopPropagation(); removeWidget(l.i); }}><X size={13} /></button>
          </div>
        )}
        <div style={textStyle}>
          {Comp && <Comp {...props} />}
        </div>
      </div>
    );
  };

  return (
    <div className="dbe-root">
      <style>{`
        .dbe-root { display:flex; flex-direction:column; gap:10px; height:100%; }
        .dbe-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .dbe-name-input { font-size:14px; padding:6px 10px; border-radius:8px; border:1px solid rgb(203 213 225); min-width:220px; }
        .dbe-name-input:focus { outline:none; border-color:#EC7D09; box-shadow:0 0 0 2px rgba(236,125,9,0.25); }
        .dbe-body { display:flex; gap:12px; flex:1; min-height:0; }
        .dbe-left-panel { width:220px; flex-shrink:0; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }
        .dbe-palette-row { display:flex; flex-wrap:wrap; gap:8px; }
        .dbe-palette-icon {
          width:52px; height:52px; display:flex; align-items:center; justify-content:center;
          border-radius:10px; border:1px solid rgb(203 213 225); background:#fff; color:#475569;
          cursor:pointer; transition:border-color .15s,color .15s;
        }
        .dbe-palette-icon:hover { border-color:#EC7D09; color:#EC7D09; }
        .dbe-canvas-wrap { flex:1; min-width:0; border:1px dashed rgb(203 213 225); border-radius:10px; padding:8px; overflow:auto; background:rgba(255,255,255,0.4); }
        .dbe-stack { display:flex; flex-direction:column; gap:10px; width:100%; }
        .dbe-widget { height:100%; width:100%; background:#fff; border:1px solid rgb(226 232 240); border-radius:10px; padding:6px; overflow:hidden; position:relative; cursor:pointer; }
        .dbe-widget.selected { outline:2px solid #EC7D09; }
        .dbe-widget-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
        .dbe-widget-title { font-size:11px; font-weight:500; color:#475569; }
        .dbe-widget-remove { color:#ef4444; cursor:pointer; background:none; border:none; display:flex; align-items:center; }
        .dbe-side-panel { flex-shrink:0; border-top:1px solid rgb(226 232 240); padding-top:10px; font-size:12px; }
        .dbe-side-panel-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:#94a3b8; margin-bottom:8px; }
        .dbe-side-panel label { display:block; margin-bottom:10px; color:#334155; font-weight:500; }
        .dbe-side-panel select, .dbe-side-panel input[type="text"] { width:100%; margin-top:4px; padding:5px 6px; border-radius:6px; border:1px solid rgb(203 213 225); font-weight:400; }
        .dbe-side-panel select:focus, .dbe-side-panel input[type="text"]:focus { outline:none; border-color:#EC7D09; box-shadow:0 0 0 2px rgba(236,125,9,0.25); }
        .dbe-color-row { display:flex; gap:8px; }
        .dbe-color-row > label { flex:1; }
      `}</style>

      {editable && showChrome && (
        <div className="dbe-toolbar">
          <input
            className="dbe-name-input"
            type="text"
            placeholder="Dashboard name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSave?.({ name: name || 'Untitled dashboard', layout, widgets })}
            >
              Save dashboard
            </Button>
          </div>
        </div>
      )}

      <div className="dbe-body">
        {editable && showChrome && (
          <div className="dbe-left-panel">
            <div className="dbe-palette-row">
              {Object.entries(WIDGET_TYPE_REGISTRY).filter(([, def]) => def.builderVisible !== false).map(([type, def]) => {
                const Icon = def.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    title={def.label}
                    aria-label={def.label}
                    className="dbe-palette-icon"
                    onClick={() => addWidget(type)}
                  >
                    {Icon && <Icon size={20} />}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="dbe-side-panel">
                <div className="dbe-side-panel-title">{selected.title || 'Widget'}</div>
                <label>
                  Title
                  <input
                    type="text"
                    value={selected.title}
                    onChange={(e) => updateWidget(selectedId, { title: e.target.value })}
                  />
                </label>
                {selected.dataSource?.type === 'kpiLive' ? (
                  <label>
                    Data source
                    <input type="text" value={`Live KPI data (${selected.dataSource.field})`} disabled />
                  </label>
                ) : (
                  <label>
                    Data source
                    <select
                      value={selected.dataSource?.key || ''}
                      onChange={(e) => updateWidget(selectedId, { dataSource: { type: 'mock', key: e.target.value } })}
                    >
                      {dataSourceKeysFor(WIDGET_TYPE_REGISTRY[selected.type]?.dataShape).map((ds) => (
                        <option key={ds.key} value={ds.key}>{ds.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                <WidgetStyleFields
                  fields={WIDGET_TYPE_REGISTRY[selected.type]?.styleFields}
                  value={selected.style}
                  onChange={(key, val) => updateWidget(selectedId, { style: { ...selected.style, [key]: val } })}
                />
              </div>
            )}
          </div>
        )}

        <div className="dbe-canvas-wrap" ref={containerRef}>
          {isStacked ? (
            <div className="dbe-stack">
              {stackedLayout.map((l) => {
                const pixelHeight = l.h * GRID_CONFIG.rowHeight + (l.h - 1) * GRID_CONFIG.margin[1];
                return renderWidget(l, { height: pixelHeight, width: '100%' });
              })}
            </div>
          ) : (
            <GridLayout
              layout={layout}
              width={containerWidth}
              gridConfig={GRID_CONFIG}
              dragConfig={{ enabled: editable }}
              resizeConfig={{ enabled: editable, handles: ['s', 'e', 'w', 'se'] }}
              autoSize
              onLayoutChange={editable ? (next) => { setLayout(next); onLayoutChange?.(next); } : undefined}
            >
              {layout.map((l) => renderWidget(l))}
            </GridLayout>
          )}
        </div>
      </div>
    </div>
  );
}
