import { useState } from 'react';
import CHART_TYPE_META, { CHART_TYPES } from './chartTypeMeta';

// Search/type-filter state + logic shared by every "list of saved charts" UI in this app —
// ChartLibrary.jsx's own "Charts" tab and DashboardCanvasEditor.jsx's "Your Widgets" panel
// both show the exact same underlying widget list (sortWidgetsByRecency(withDatasourceOnly(...)))
// and had started duplicating this filtering by hand; extracted here so both stay in sync
// instead of one picking up a fix/tweak the other doesn't. Takes the already-sorted widget
// list as input (sort order itself is a separate, list-specific concern - see each call
// site's own sortWidgetsByRecency call) and only ever filters it, never re-sorts.
export default function useChartListFilter(sortedWidgets) {
  const [search, setSearch] = useState('');
  // '' means "any type" — combined (AND) with the text search above, not a replacement for it.
  const [typeFilter, setTypeFilter] = useState('');

  const searchLower = search.trim().toLowerCase();
  const visibleWidgets = sortedWidgets.filter((w) => {
    const typeLabel = CHART_TYPE_META[w.chart_type]?.label || w.chart_type || '';
    const matchesText = !searchLower || w.name?.toLowerCase().includes(searchLower) || typeLabel.toLowerCase().includes(searchLower);
    const matchesType = !typeFilter || w.chart_type === typeFilter;
    return matchesText && matchesType;
  });

  // Every real chart_type (all of CHART_TYPES), not just ones this particular widget list
  // happens to already contain — a type with zero current matches just shows the list's own
  // "no results" empty state, same as any other filter that happens to match nothing.
  const typeOptions = [...CHART_TYPES].sort((a, b) => (CHART_TYPE_META[a]?.label || a).localeCompare(CHART_TYPE_META[b]?.label || b));

  return { search, setSearch, typeFilter, setTypeFilter, searchLower, visibleWidgets, typeOptions };
}
