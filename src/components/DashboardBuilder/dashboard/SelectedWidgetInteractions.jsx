import React, { useEffect, useState } from 'react';
// OLD: import { MousePointerClick, ChevronDown, ArrowRight, ExternalLink, Filter, RotateCcw, AlertTriangle } from 'lucide-react';
import { MousePointerClick, ChevronDown, ArrowRight, ExternalLink, Filter, RotateCcw, AlertTriangle, MapPin, X } from 'lucide-react';
import Select from '../../Select'; // shared dropdown — replaces native <select> (CLAUDE.md §4)
import EditedBadge from '../widgetConfig/EditedBadge';
import { LINK_POINT_CHART_TYPES } from '../utils/widgetLink';
// OLD: import { getDashboardDetail } from '../../../store/actions/dashboardBuilder-actions';
import { getDashboardDetail, getDatasourceDetail } from '../../../store/actions/dashboardBuilder-actions';
import { MAP_FIELDS, resolveMapField, autoMapField, mapChartFieldDefaults } from '../utils/mapLink';
import { TABS_SENTINEL_ID } from './buildLocalLayoutAndWidgets';

// Selected Widget → Interactions (DashboardCanvasEditor.jsx's left panel): everything a click on this
// widget does, in one sub-section between Details and Style — the double-click link (moved here from
// SelectedWidgetDetails.jsx) and the cross-filter source/target toggles (moved here from Style →
// Cross-Filtering; still the same `crossFilterSource`/`crossFilterTarget` style keys, so the chart's own
// value from the Charts tab is inherited exactly as before). A tinted summary on top says in words what
// happens; the header badge counts what's on, so it reads even when collapsed.

// Style keys shown here instead of in the Style sub-section (DashboardCanvasEditor filters them out there).
export const INTERACTION_STYLE_KEYS = new Set(['crossFilterSource', 'crossFilterTarget']);

const CROSS_FILTER_ROWS = [
  { key: 'crossFilterSource', label: 'Cross-filter', hint: 'Clicking a point filters the widgets set to be filtered (same datasource and column)' },
  { key: 'crossFilterTarget', label: 'Filtered by', hint: "Narrowed by a click on another widget that cross-filters" },
];

const CARRY_SUMMARY = { value: 'passes the clicked value', filters: 'passes the current filters', 'value+filters': 'passes the clicked value + filters' };


// Closed-control text for the dashboard link's "Pass on" (the list shows the full labels).
const CARRY_SHORT_LABELS = { none: 'Nothing', value: 'Clicked value', filters: 'Filters', 'value+filters': 'Value + filters' };

// Tabs of the dashboard a widget link points at — read from its saved layout (tabs sentinel).
// null while loading / none picked.
function useLinkedDashboardTabs(dashboardId) {
  const [tabs, setTabs] = useState(null);
  useEffect(() => {
    if (!dashboardId) { setTabs(null); return undefined; }
    let cancelled = false;
    setTabs(null);
    getDashboardDetail(dashboardId, { quiet: true })
      .then(({ dashboard }) => {
        if (cancelled) return;
        const entry = (dashboard?.layout || []).find((l) => l.i === TABS_SENTINEL_ID);
        setTabs(Array.isArray(entry?.tabs) ? entry.tabs : []);
      })
      .catch(() => { if (!cancelled) setTabs([]); });
    return () => { cancelled = true; };
  }, [dashboardId]);
  return tabs;
}

// OLD: // Off | On pair for one cross-filter key. `inherited`: the value comes from the chart (Charts tab), not
// OLD: // this placement — shown so turning it off here is a deliberate override, with ↺ to follow the chart again.
// OLD: function OnOffToggle({ id, value, onChange }) {
// OLD:   return (
// OLD:     <span id={id} role="group" className="inline-flex w-fit rounded-md border border-slate-200 bg-white p-0.5">
// OLD:       {['off', 'on'].map((v) => (
// OLD:         <button
// OLD:           key={v}
// OLD:           type="button"
// OLD:           aria-pressed={value === v}
// OLD:           onClick={() => onChange(v)}
// OLD:           className={`h-6 rounded px-2.5 text-dbe-body font-semibold transition-colors ${value === v ? 'bg-[#EC7D09] text-white' : 'text-slate-500 hover:text-slate-800'}`}
// OLD:         >
// OLD:           {v === 'on' ? 'On' : 'Off'}
// OLD:         </button>
// OLD:       ))}
// OLD:     </span>
// OLD:   );
// OLD: }

// On/off switch for one cross-filter key — same look as every yes/no in the Style panels
// (WidgetStyleFields' .dbe-style-switch: 34×19 track, orange when on), drawn with utilities so it
// doesn't depend on that component's <style> block being mounted. Replaced the Off | On pair below.
function OnOffToggle({ id, value, onChange, label }) {
  const on = value === 'on';
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(on ? 'off' : 'on')}
      className={`relative h-[19px] w-[34px] shrink-0 rounded-full border-0 transition-colors ${on ? 'bg-[#EC7D09]' : 'bg-slate-300'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-[15px] w-[15px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[15px]' : ''}`} />
    </button>
  );
}

// Dimension columns of the widget's datasource (all columns when none is flagged) — the columns
// "Open on map" can pass. [] while loading / on error.
function useDatasourceColumns(datasourceId) {
  const [columns, setColumns] = useState([]);
  useEffect(() => {
    if (!datasourceId) { setColumns([]); return undefined; }
    let cancelled = false;
    getDatasourceDetail(datasourceId)
      .then(({ columns: cols }) => {
        if (cancelled) return;
        const dims = cols.filter((c) => c.is_dimension);
        setColumns((dims.length ? dims : cols).map((c) => c.column_name).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setColumns([]); });
    return () => { cancelled = true; };
  }, [datasourceId]);
  return columns;
}

const MAP_CARRY_SUMMARY = { value: 'passes the clicked value', filters: 'passes the current filters', 'value+filters': 'passes the clicked value + filters' };
const MAP_FIELD_LABEL = Object.fromEntries(MAP_FIELDS.map((f) => [f.key, f.label]));
// Any field whose name matches — a starting pick for a column the user adds by hand.
const guessMapField = (column) => {
  const n = String(column).toLowerCase().replace(/[^a-z0-9]/g, '');
  return MAP_FIELDS.find((f) => f.aliases.some((a) => a.replace(/[^a-z0-9]/g, '') === n))?.key || '';
};
const MAP_SELECT_CLASS = '!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700';

// Column → map field rows for "Open on map": the columns passed now (a default or a pick) plus any the
// user set to "Don't pass", each with its field; ↺ goes back to the default; "+ Pass another column".
function MapFieldRows({ mapLink, columns, defaults, onChange }) {
  const fieldMap = mapLink.fieldMap || {};
  const setField = (column, field) => onChange({ ...mapLink, fieldMap: { ...fieldMap, [column]: field } });
  const reset = (column) => {
    const { [column]: _old, ...rest } = fieldMap;
    onChange({ ...mapLink, fieldMap: rest });
  };
  const all = [...new Set([...Object.keys(defaults), ...columns, ...Object.keys(fieldMap)])];
  const shown = all.filter((c) => Object.prototype.hasOwnProperty.call(fieldMap, c) || resolveMapField(c, fieldMap, defaults));
  const rest = all.filter((c) => !shown.includes(c));
  return (
    <div className="col-span-2 ml-1 flex flex-col gap-1.5 border-l-2 border-[#EC7D09]/25 pl-2.5">
      <span className="text-dbe-meta text-slate-500">
        Columns passed to the map {shown.length ? '' : '— none yet'}
      </span>
      {shown.map((column) => {
        const own = Object.prototype.hasOwnProperty.call(fieldMap, column);
        const auto = autoMapField(column, defaults);
        const value = resolveMapField(column, fieldMap, defaults) || '';
        return (
          <div key={column} className="grid grid-cols-[minmax(0,1fr)_6.5rem_1.25rem] items-center gap-1.5">
            <span className="truncate text-slate-700" title={column}>{column}</span>
            <Select
              value={value}
              aria-label={`${column} is passed as`}
              panelMinWidth={150}
              displayValue={value ? MAP_FIELD_LABEL[value] : "Don't pass"}
              onChange={(e) => {
                const v = e.target.value;
                // Picking what it would get anyway drops the override instead of pinning a copy.
                if ((v || null) === auto) reset(column); else setField(column, v);
              }}
              className={MAP_SELECT_CLASS}
            >
              <option value="">Don't pass</option>
              {MAP_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
            {own ? (
              <button
                type="button"
                onClick={() => reset(column)}
                title={auto ? `Back to the default (${MAP_FIELD_LABEL[auto]})` : 'Remove — not passed'}
                aria-label={auto ? 'Back to the default' : `Stop passing ${column}`}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                {auto ? <RotateCcw size={11} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
              </button>
            ) : <span title="Picked by default" className="text-center text-dbe-meta text-slate-400">auto</span>}
          </div>
        );
      })}
      {rest.length > 0 && (
        <Select
          value=""
          aria-label="Pass another column"
          panelMinWidth={220}
          displayValue="+ Pass another column"
          onChange={(e) => { if (e.target.value) setField(e.target.value, guessMapField(e.target.value)); }}
          className={`${MAP_SELECT_CLASS} !text-[#EC7D09]`}
        >
          <option value="">+ Pass another column</option>
          {rest.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      )}
      <span className="text-dbe-meta text-slate-400">
        Only these columns reach the map. Filters on other columns (dates, KPIs) are left out.
      </span>
    </div>
  );
}

export default function SelectedWidgetInteractions({
  widget, layoutEntry, tabs = [],
  // Double-click "Link to" (utils/widgetLink.js): called with the new link object, or null to clear.
  onLinkChange = null,
  // "Open on map" (utils/mapLink.js): called with the new mapLink object, or null to turn it off.
  onMapLinkChange = null,
  // [{ id, name, published }] — dashboards an "Open another dashboard" link can target.
  linkDashboardOptions = [],
  // Cross-filter keys this chart type supports (from its style fields), the chart's own saved style
  // (inherited values) and the placement setter — `value` undefined drops the placement's own key.
  crossFilterKeys = [], chartStyle = {}, onStyleKeyChange = null,
  open = true, onToggle, edited = false,
}) {
  const isChart = widget.type === 'chartLibrary';
  const chartType = widget.dataSource?.chartType;
  // Link targets: every tab except the one this widget already sits on, or another dashboard.
  // OLD: const link = widget.link?.kind === 'tab' ? widget.link : null;
  const link = widget.link?.kind === 'tab' ? widget.link : null;
  const dashLink = widget.link?.kind === 'dashboard' ? widget.link : null;
  const linkTabs = tabs.filter((t) => t.id !== layoutEntry?.tabId);
  const linkMissing = !!link && !tabs.some((t) => t.id === link.tabId);
  // OLD: const showLink = isChart && !!onLinkChange && (linkTabs.length > 0 || !!link);
  const showLink = isChart && !!onLinkChange;
  // OLD: const canCarryValue = LINK_POINT_CHART_TYPES.has(chartType);
  // A Map chart reports its clicked cell / site like a clicked bar.
  const isMapChart = chartType === 'TABLE' && widget.dataSource?.mapping?.chart_variant === 'map';
  const canCarryValue = LINK_POINT_CHART_TYPES.has(chartType) || isMapChart;
  const mapLink = widget.mapLink || null;
  const showMap = isChart && !!onMapLinkChange;
  const mapColumns = useDatasourceColumns(showMap && mapLink ? widget.dataSource?.datasourceId : null);
  const mapDefaults = mapChartFieldDefaults(widget.dataSource?.mapping);
  const mapCarry = !canCarryValue && mapLink?.carry !== 'filters' ? 'filters' : (mapLink?.carry || 'filters');
  const dashTarget = dashLink?.dashboardId ? linkDashboardOptions.find((d) => d.id === String(dashLink.dashboardId)) : null;
  const dashMissing = !!dashLink?.dashboardId && !dashTarget;
  const dashTabs = useLinkedDashboardTabs(dashTarget ? dashTarget.id : null);
  const dashTabMissing = !!dashLink?.tabId && Array.isArray(dashTabs) && !dashTabs.some((t) => t.id === dashLink.tabId);
  const linkSelectValue = dashLink ? '__dashboard__' : linkMissing ? '__missing__' : (link?.tabId || '');
  // A non-point chart can't pass a clicked value — shown as the nearest choice it can make.
  const dashCarry = !canCarryValue && dashLink?.carry === 'value' ? 'none'
    : !canCarryValue && dashLink?.carry === 'value+filters' ? 'filters'
    : (dashLink?.carry || 'none');

  const crossRows = CROSS_FILTER_ROWS.filter((r) => crossFilterKeys.includes(r.key)).map((r) => {
    const own = widget.style?.[r.key];
    const fromChart = chartStyle?.[r.key];
    const hasOwn = own !== undefined && own !== null && own !== '';
    return { ...r, value: hasOwn ? own : (fromChart || 'off'), hasOwn, inherited: !hasOwn && !!fromChart };
  });

  // What a click does, in words — the summary card and the header count.
  const summary = [];
  if (link && !linkMissing) {
    summary.push({ key: 'link', icon: ArrowRight, text: `Double-click → ${tabs.find((t) => t.id === link.tabId)?.name}${link.carry === 'value' && canCarryValue ? ' · passes the clicked value' : ''}` });
  }
  if (dashLink?.dashboardId && !dashMissing) {
    const newTab = dashLink.newWindow !== false;
    summary.push({
      key: 'link',
      icon: newTab ? ExternalLink : ArrowRight,
      text: `Double-click → ${dashTarget?.name || dashLink.dashboardName}${newTab ? ' (new tab)' : ''}${CARRY_SUMMARY[dashCarry] ? ` · ${CARRY_SUMMARY[dashCarry]}` : ''}`,
    });
  }
  if (linkMissing || dashMissing) summary.push({ key: 'missing', icon: AlertTriangle, text: 'Double-click link target is missing', danger: true });
  if (mapLink) {
    summary.push({
      key: 'map',
      icon: MapPin,
      text: `Map button / right-click → GIS Engine${mapLink.newWindow !== false ? ' (new tab)' : ''} · ${MAP_CARRY_SUMMARY[mapCarry]}`,
    });
  }
  crossRows.filter((r) => r.value === 'on').forEach((r) => summary.push({
    key: r.key,
    icon: Filter,
    text: r.key === 'crossFilterSource' ? 'Click a point → filters other widgets' : "Narrowed by other widgets' clicks",
  }));
  const activeCount = summary.filter((s) => !s.danger).length;

  // OLD: if (!isChart || (!onLinkChange && crossRows.length === 0)) return null;
  if (!isChart || (!onLinkChange && !onMapLinkChange && crossRows.length === 0)) return null;
  return (
    <>
      <div className="dbe-selected-sub-head mt-3">
        <button type="button" className="dbe-selected-sub-toggle flex-1" aria-expanded={open} onClick={onToggle}>
          <MousePointerClick size={13} aria-hidden="true" className="!text-[#EC7D09]" />
          Interactions
          {edited && <EditedBadge className="ml-1.5" />}
          <span
            className={`ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-px text-dbe-meta font-semibold normal-case tracking-normal ${activeCount ? 'bg-[#EC7D09]/15 text-[#EC7D09]' : 'bg-slate-100 text-slate-400'}`}
            title={activeCount ? summary.map((s) => s.text).join('\n') : 'Clicking this widget does nothing special'}
          >
            {activeCount ? <><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#EC7D09]" />{activeCount} on</> : 'Off'}
          </span>
          <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" className={`ml-auto ${open ? '' : '-rotate-90'}`} />
        </button>
      </div>
      <div className={`dbe-selected-card${open ? '' : ' hidden'}`}>
        {/* In words: what clicking this widget does (preview / published views). */}
        <div className={`m-2.5 mb-0 flex flex-col gap-1 rounded-md border px-2.5 py-2 text-dbe-body ${summary.length ? 'border-[#EC7D09]/30 bg-[#EC7D09]/[0.06] text-slate-700' : 'border-dashed border-slate-200 text-slate-400'}`}>
          {summary.length ? summary.map(({ key, icon: Icon, text, danger }) => (
            <span key={key + text} className={`flex min-w-0 items-start gap-1.5 ${danger ? 'text-red-600' : ''}`}>
              <Icon size={12} aria-hidden="true" className={`mt-0.5 shrink-0 ${danger ? '' : 'text-[#EC7D09]'}`} />
              <span className="min-w-0">{text}</span>
            </span>
          )) : 'Nothing happens on click — set cross-filtering or a double-click link below.'}
        </div>
        <div className="flex flex-col gap-2.5 p-2.5">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-2 text-dbe-body">
            {/* OLD (Style → Cross-Filtering): "Cross-filter source" / "Cross-filter target" Off | On selects. */}
            {onStyleKeyChange && crossRows.map((r) => (
              <React.Fragment key={r.key}>
                <span className="text-slate-500" title={r.hint}>{r.label}</span>
                {/* OLD: <span className="flex min-w-0 items-center gap-1.5"> — switch now at the row's right edge, like the Style panels. */}
                <span className="flex min-w-0 items-center justify-end gap-1.5">
                  {/* Same rule as WidgetStyleFields: picking what it inherits (the chart's value, else Off)
                      clears the override instead of pinning a copy. OLD: onChange={(v) => onStyleKeyChange(r.key, v)} */}
                  {r.inherited && <span className="truncate text-dbe-meta text-slate-500" title="Set on the chart (Charts tab)">from chart</span>}
                  {r.hasOwn && chartStyle?.[r.key] !== undefined && (
                    <button
                      type="button"
                      onClick={() => onStyleKeyChange(r.key, undefined)}
                      title={`Follow the chart's own setting (${chartStyle[r.key] === 'on' ? 'On' : 'Off'})`}
                      aria-label="Follow the chart's own setting"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <RotateCcw size={11} aria-hidden="true" />
                    </button>
                  )}
                  {/* Last, so the switch sits at the right edge (hint / ↺ before it). */}
                  <OnOffToggle id={`dbe-selected-${r.key}`} label={r.label} value={r.value} onChange={(v) => onStyleKeyChange(r.key, v === (chartStyle?.[r.key] || 'off') ? undefined : v)} />
                </span>
              </React.Fragment>
            ))}
          {/* Double-click → open another tab of this dashboard, or another dashboard (read-only views only). */}
          {showLink && (
            <>
              <label htmlFor="dbe-selected-link" className="!mb-0 !font-normal !text-slate-500" title="What double-clicking this widget does in the published / preview view">Double-click</label>
              <Select
                id="dbe-selected-link"
                value={linkSelectValue}
                // The side panel is narrow — open the lists wider than their control so names aren't cut.
                panelMinWidth={240}
                displayValue={dashLink ? 'Other dashboard' : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__missing__' || v === linkSelectValue) return;
                  if (v === '__dashboard__') onLinkChange({ kind: 'dashboard', dashboardId: null, carry: 'none', newWindow: true });
                  // OLD: onLinkChange(tabId ? { kind: 'tab', tabId, carry: link?.carry || 'none' } : null);
                  else onLinkChange(v ? { kind: 'tab', tabId: v, carry: link?.carry === 'value' ? 'value' : 'none' } : null);
                }}
                className="!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700"
              >
                <option value="">Does nothing</option>
                {linkMissing && <option value="__missing__">Missing tab (deleted)</option>}
                {linkTabs.map((t) => <option key={t.id} value={t.id}>Go to {t.name}</option>)}
                <option value="__dashboard__">Open another dashboard</option>
              </Select>
              {linkMissing && (
                <>
                  <span />
                  <span className="text-dbe-meta text-red-600">Link target missing — pick another tab or clear it.</span>
                </>
              )}
              {link && !linkMissing && canCarryValue && (
                <>
                  <label htmlFor="dbe-selected-link-carry" className="!mb-0 !font-normal !text-slate-500">Pass on</label>
                  <Select
                    id="dbe-selected-link-carry"
                    value={link.carry || 'none'}
                    panelMinWidth={220}
                    onChange={(e) => onLinkChange({ ...link, carry: e.target.value })}
                    className="!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700"
                  >
                    <option value="none">Nothing</option>
                    <option value="value">Clicked value as filter</option>
                  </Select>
                </>
              )}
              {dashLink && (
                <>
                  <label htmlFor="dbe-selected-link-dash" className="!mb-0 !font-normal !text-slate-500">Dashboard</label>
                  <Select
                    id="dbe-selected-link-dash"
                    value={dashMissing ? '__missing__' : (dashLink.dashboardId ? String(dashLink.dashboardId) : '')}
                    panelMinWidth={300}
                    title={dashTarget ? `${dashTarget.name}${dashTarget.published ? '' : ' (draft)'}` : undefined}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id === '__missing__') return;
                      const d = linkDashboardOptions.find((o) => o.id === id);
                      // A new dashboard drops the old one's tab.
                      onLinkChange({ ...dashLink, dashboardId: id || null, dashboardName: d?.name || '', tabId: null });
                    }}
                    className="!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700"
                  >
                    <option value="">Pick a dashboard…</option>
                    {dashMissing && <option value="__missing__">Missing dashboard (deleted)</option>}
                    {linkDashboardOptions.map((d) => <option key={d.id} value={d.id}>{d.name}{d.published ? '' : ' (draft)'}</option>)}
                  </Select>
                  {(dashMissing || (dashTarget && !dashTarget.published)) && (
                    <>
                      <span />
                      <span className={`text-dbe-meta ${dashMissing ? 'text-red-600' : 'text-amber-600'}`}>
                        {dashMissing ? 'Link target missing — pick another dashboard or clear it.' : "Draft — viewers see \"not published yet\" until it's published."}
                      </span>
                    </>
                  )}
                  {dashTarget && Array.isArray(dashTabs) && (dashTabs.length > 0 || dashTabMissing) && (
                    <>
                      <label htmlFor="dbe-selected-link-dash-tab" className="!mb-0 !font-normal !text-slate-500">Its tab</label>
                      <Select
                        id="dbe-selected-link-dash-tab"
                        value={dashTabMissing ? '__missing__' : (dashLink.tabId || '')}
                        panelMinWidth={240}
                        onChange={(e) => { if (e.target.value !== '__missing__') onLinkChange({ ...dashLink, tabId: e.target.value || null }); }}
                        className="!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700"
                      >
                        <option value="">First tab</option>
                        {dashTabMissing && <option value="__missing__">Missing tab (opens the first)</option>}
                        {dashTabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </>
                  )}
                  {dashLink.dashboardId && (
                    <>
                      <label htmlFor="dbe-selected-link-dash-carry" className="!mb-0 !font-normal !text-slate-500">Pass on</label>
                      <Select
                        id="dbe-selected-link-dash-carry"
                        value={dashCarry}
                        panelMinWidth={240}
                        // Short text in the closed control; the list keeps the full wording.
                        displayValue={CARRY_SHORT_LABELS[dashCarry]}
                        onChange={(e) => onLinkChange({ ...dashLink, carry: e.target.value })}
                        className="!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700"
                      >
                        <option value="none">Nothing</option>
                        {canCarryValue && <option value="value">Clicked value</option>}
                        <option value="filters">Current filters</option>
                        {canCarryValue && <option value="value+filters">Clicked value + current filters</option>}
                      </Select>
                      <label htmlFor="dbe-selected-link-dash-open" className="!mb-0 !font-normal !text-slate-500">Open in</label>
                      <Select
                        id="dbe-selected-link-dash-open"
                        value={dashLink.newWindow === false ? 'same' : 'new'}
                        onChange={(e) => onLinkChange({ ...dashLink, newWindow: e.target.value !== 'same' })}
                        className="!mt-0 h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-dbe-body text-slate-700"
                      >
                        <option value="new">New browser tab</option>
                        <option value="same">This window</option>
                      </Select>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {/* Open on map → the GIS Engine filtered to this widget (read-only views: header 📍 button + right-click). */}
          {showMap && (
            <>
              <span className="text-slate-500" title="Opens the GIS Engine filtered to what this widget shows (preview / published views)">Open on map</span>
              <span className="flex min-w-0 items-center justify-end">
                <OnOffToggle
                  id="dbe-selected-map"
                  label="Open on map"
                  value={mapLink ? 'on' : 'off'}
                  onChange={(v) => onMapLinkChange(v === 'on' ? { carry: canCarryValue ? 'value+filters' : 'filters', newWindow: true, fieldMap: {} } : null)}
                />
              </span>
              {mapLink && (
                <>
                  <label htmlFor="dbe-selected-map-carry" className="!mb-0 !font-normal !text-slate-500">Pass on</label>
                  <Select
                    id="dbe-selected-map-carry"
                    value={mapCarry}
                    panelMinWidth={240}
                    displayValue={CARRY_SHORT_LABELS[mapCarry]}
                    title="Current filters = the dashboard's, the chart's own, this widget's, and a cross-filter on it"
                    onChange={(e) => onMapLinkChange({ ...mapLink, carry: e.target.value })}
                    className={MAP_SELECT_CLASS}
                  >
                    {canCarryValue && <option value="value">Clicked value</option>}
                    <option value="filters">Current filters</option>
                    {canCarryValue && <option value="value+filters">Clicked value + current filters</option>}
                  </Select>
                  <label htmlFor="dbe-selected-map-open" className="!mb-0 !font-normal !text-slate-500">Open in</label>
                  <Select
                    id="dbe-selected-map-open"
                    value={mapLink.newWindow === false ? 'same' : 'new'}
                    onChange={(e) => onMapLinkChange({ ...mapLink, newWindow: e.target.value !== 'same' })}
                    className={MAP_SELECT_CLASS}
                  >
                    <option value="new">New browser tab</option>
                    <option value="same">This window</option>
                  </Select>
                  <MapFieldRows mapLink={mapLink} columns={mapColumns} defaults={mapDefaults} onChange={onMapLinkChange} />
                </>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
