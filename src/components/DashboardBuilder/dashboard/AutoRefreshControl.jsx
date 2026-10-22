import React from 'react';
// OLD: import { RefreshCw, Timer } from 'lucide-react'; — the Timer icon beside the dropdown was dropped (two controls, not three).
import { RefreshCw } from 'lucide-react';
import Select from '../../Select';
import { cn } from '../../../utils/common';
import { REFRESH_INTERVAL_OPTIONS, refreshIntervalShort } from './buildLocalLayoutAndWidgets';

// Dashboard "Refresh now" + "Auto-refresh" interval — the Superset-style pair. Used in three places:
//  - preview header (DashboardBuilder.jsx) and fullscreen bar (EmbeddedDashboard `showRefreshControls`):
//    the interval is the viewer's own session choice, starting from the dashboard's saved default;
//  - editor toolbar (DashboardCanvasEditor): the interval is the dashboard's saved default
//    (`savedDefault`) — it doesn't run while editing, only the manual refresh does.
// `onRefresh` omitted → no refresh button (e.g. an unsaved dashboard has no data to re-fetch).
export default function AutoRefreshControl({
  seconds = 0, onSecondsChange, onRefresh = null, refreshing = false, lastRefreshedAt = null,
  savedDefault = false, className = '',
}) {
  const last = lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleTimeString() : null;
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {onRefresh && (
        <button
          type="button"
          aria-label="Refresh dashboard data"
          title={refreshing ? 'Refreshing…' : last ? `Refresh now — last refreshed ${last}` : 'Refresh now'}
          disabled={refreshing}
          onClick={onRefresh}
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      )}
      {/* OLD: a Timer icon + Select with "Auto: 30 seconds" / "Auto-refresh off" labels (truncated in the
          closed control). Now: closed reads "Auto-refresh" (off) or "Auto · 1m"; the list has an
          "Auto-refresh" heading and plain intervals. */}
      <Select
        value={String(seconds || 0)}
        onChange={(e) => onSecondsChange?.(Number(e.target.value) || 0)}
        displayValue={seconds > 0 ? `Auto · ${refreshIntervalShort(seconds)}` : 'Auto-refresh'}
        // OLD: w-[104px] — cut "Auto · 30s" to "Auto · 3…"
        // OLD: app-theme dark: classes — went faint on a light canvas in dark mode. Colors now follow the
        // canvas background instead (DashboardCanvasEditor's .dbe-title-actions[data-surface]).
        className={cn('h-8 w-[124px] text-ui-small', seconds > 0 && 'text-[#EC7D09] font-semibold')}
        panelMinWidth={140}
        aria-label={savedDefault ? 'Default auto-refresh interval' : 'Auto-refresh interval'}
        // OLD: long tooltips ("…this session only. Pauses while the browser tab is hidden.") — those
        // details live in comments/docs (API_AND_DATA.md); the tooltip just names the control.
        title={savedDefault ? "Auto-refresh default for viewers (doesn't run while editing)" : 'Auto-refresh'}
      >
        <optgroup label="Auto-refresh">
          {REFRESH_INTERVAL_OPTIONS.map((o) => (
            <option key={o.value} value={String(o.value)}>{o.label}</option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}
