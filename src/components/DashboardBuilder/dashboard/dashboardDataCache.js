/**
 * In-memory cache of a saved dashboard's already-fetched widget data, shared between every
 * DashboardCanvasEditor instance showing the same dashboard (the read-only preview and the
 * editor are separate instances). Lets "Edit" open with the charts the preview already loaded
 * instead of a blank canvas + full-screen loader, while the editor refreshes quietly in the
 * background (stale-while-revalidate).
 *
 * Keyed by the backend dashboard id. Lives for the browser session only (module scope), so a
 * page reload always starts fresh. Only holds data the instance would otherwise refetch:
 *   chartLibraryData — rows per chart (widgetId), as fetched by the batched dashboard load
 *   comparisonRawData + comparisonKeys — KPI "Compare to" past-window rows and the filter key
 *     they were fetched for, so an unchanged comparison isn't refetched
 */
const cache = new Map();

export function getCachedDashboardData(backendId) {
  return backendId ? cache.get(String(backendId)) : undefined;
}

export function updateCachedDashboardData(backendId, patch) {
  if (!backendId) return;
  const key = String(backendId);
  cache.set(key, { ...cache.get(key), ...patch });
}

/**
 * Rows to start a new instance with. Leaves out a chart the other instance had drilled into
 * (its rows are for a deeper level this instance isn't showing) or was mid-drill on — those
 * just load normally.
 */
export function seedChartLibraryData(backendId) {
  const data = getCachedDashboardData(backendId)?.chartLibraryData;
  if (!data) return {};
  return Object.fromEntries(Object.entries(data).filter(([, entry]) => (
    entry && !entry.drilling && !(entry.drillDown?.path?.length > 0)
  )));
}
