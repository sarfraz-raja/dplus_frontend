import React from 'react';
import { Search } from 'lucide-react';
import CHART_TYPE_META from './chartTypeMeta';

/**
 * The search-by-name + filter-by-type row shown above a chart list — paired with
 * useChartListFilter.js's own state/filtering logic, reused verbatim by both
 * ChartLibrary.jsx's "Charts" tab and DashboardCanvasEditor.jsx's "Your Widgets" panel so a
 * styling/behavior tweak to one automatically reaches the other. One continuous bordered pill
 * (type segment | divider | text input | search icon) rather than two separate boxes sitting
 * next to each other with a gap — reads as a single combined control, not two unrelated ones.
 */
export default function ChartListSearchBar({ search, onSearchChange, typeFilter, onTypeFilterChange, typeOptions }) {
  return (
    <div className="flex items-center flex-1 min-w-0 rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:border-slate-300">
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        className="shrink-0 w-[92px] pl-2.5 pr-1 py-1.5 border-0 border-r border-slate-200 bg-transparent text-xs text-slate-600 focus:outline-none"
      >
        <option value="">All types</option>
        {typeOptions.map((t) => (
          <option key={t} value={t}>{CHART_TYPE_META[t]?.label || t}</option>
        ))}
      </select>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by name"
        className="flex-1 min-w-0 px-2.5 py-1.5 border-0 bg-transparent text-xs focus:outline-none"
      />
      <div className="shrink-0 flex items-center justify-center w-7 h-7 mr-0.5 text-slate-400">
        <Search size={12} />
      </div>
    </div>
  );
}
