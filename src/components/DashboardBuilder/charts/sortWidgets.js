// One source of truth for "latest-first" chart-list ordering — used by both
// ChartLibrary.jsx's "Charts" tab and DashboardCanvasEditor.jsx's "Your Charts" panel, so
// the two never drift into showing a different order for the exact same listWidgets() data.
// Sorts by whichever timestamp field is present; if the endpoint doesn't return one at all,
// falls back to reversing listWidgets()'s own order (assumed oldest-first) rather than
// leaving the list unsorted.
export function sortWidgetsByRecency(list) {
  const hasTimestamps = list.some((w) => w.updated_at || w.modified_at || w.created_at);
  if (!hasTimestamps) return [...list].reverse();
  return [...list].sort((a, b) => {
    const at = a.updated_at || a.modified_at || a.created_at || 0;
    const bt = b.updated_at || b.modified_at || b.created_at || 0;
    return new Date(bt) - new Date(at);
  });
}

// Only widgets with a datasource actually attached are usable/complete — filters out any
// incomplete draft with no datasource_id set yet, so "Your Charts" lists (in both places
// above) only ever show fully configured charts.
export function withDatasourceOnly(list) {
  return list.filter((w) => w.datasource_id != null);
}
