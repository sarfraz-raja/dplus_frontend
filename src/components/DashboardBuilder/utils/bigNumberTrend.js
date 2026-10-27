import { previewWidgetQuery } from '../../../store/actions/dashboardBuilder-actions';
import { measureKey } from '../charts/renderChartWidget';

// Big Number's trend line (BigNumberCard's sparkline): the card's own measure + aggregation
// re-run as a LINE over its date column, through POST /widgets/preview — no widget row and no
// backend change. Shared by the Charts-tab preview (ChartLibrary.jsx) and the dashboard
// canvas (DashboardCanvasEditor.jsx) so both draw the same line.

// Only for a Big Number with the trend on (the default — unset counts as On, only 'Off' turns
// it off) and a date column to draw over. Period 'Latest' gets a trend too — see
// bigNumberTrendRange.
export const isBigNumberTrendOn = (mapping) => mapping?.show_trend !== 'Off';
// OLD: excluded Period 'Latest' (a single instant — nothing to draw over) before the trend had its own window
// export const wantsBigNumberTrend = (mapping) => (
//   mapping?.kpi_variant === 'big_number'
//   && isBigNumberTrendOn(mapping)
//   && !!mapping.date_filter_column
//   && mapping.date_filter_range !== 'Latest'
// );
export const wantsBigNumberTrend = (mapping) => (
  mapping?.kpi_variant === 'big_number'
  && isBigNumberTrendOn(mapping)
  && !!mapping.date_filter_column
);

// "Trend window" (mapping.trend_window, Big Number step 4) labels → the backend's
// date_filter_range presets, which anchor the window's end at the datasource's newest
// date_filter_column value (MAX), not wall-clock now — so the line stays aligned with a
// 'Latest' number even when the data has gone stale.
export const TREND_WINDOW_SAME = 'Same as Period';
const TREND_WINDOW_RANGES = {
  'Last hour': 'last_hour',
  'Last 24 hours': 'last_24_hours',
  'Last 7 days': 'last_7_days',
  'Last 30 days': 'last_30_days',
  'This month': 'this_month',
  'This quarter': 'this_quarter',
  'This year': 'this_year',
};
export const TREND_WINDOW_OPTIONS = [TREND_WINDOW_SAME, ...Object.keys(TREND_WINDOW_RANGES)];
// Period 'Latest' has no window of its own to follow — "Same as Period" then means the last 24
// hours of data.
const LATEST_DEFAULT_TREND_WINDOW = 'Last 24 hours';

// The backend date_filter_range the trend query sends, or null when the trend simply follows
// the number's own Period (its already-resolved filters, exactly as before trend_window existed).
export function bigNumberTrendRange(mapping) {
  const picked = mapping?.trend_window;
  if (picked && picked !== TREND_WINDOW_SAME) return TREND_WINDOW_RANGES[picked] || null;
  if (mapping?.date_filter_range === 'Latest') return TREND_WINDOW_RANGES[LATEST_DEFAULT_TREND_WINDOW];
  return null;
}

// Resolves to [{ x, y }] in time order. `filters` are the same already-resolved query filters
// the card's own number used (its Period, plus any dashboard filters on the canvas).
// `otherFilters` are those filters WITHOUT the card's own Period — used instead when the trend
// has its own window (bigNumberTrendRange), so the number's now-anchored Period doesn't also
// clip the trend's data-anchored one.
export async function fetchBigNumberTrend({ datasourceId, mapping, filters, otherFilters, quiet = false }) {
  const xKey = mapping.date_filter_column;
  const trendRange = bigNumberTrendRange(mapping);
  const trendMapping = {
    x_axis: xKey,
    y_axis: mapping.y_axis,
    ...(mapping.aggregation ? { aggregation: mapping.aggregation } : {}),
    ...(trendRange ? { date_filter_column: xKey, date_filter_range: trendRange } : {}),
    // The backend caps a LINE at 1000 rows and, with no sorting, adds no ORDER BY — a long
    // period on fine-grained data (e.g. "This year" of 15-min rows) then returned an arbitrary
    // 1000 timestamps. Newest-first makes the cap keep the most recent 1000 points; they're put
    // back in time order below.
    sorting: [{ column: xKey, direction: 'DESC' }],
  };
  const queryFilters = trendRange ? (otherFilters?.length ? otherFilters : undefined) : filters;
  const { rows } = await previewWidgetQuery({ datasourceId, chartType: 'LINE', mapping: trendMapping, filters: queryFilters, quiet });
  const yKey = measureKey(mapping.y_axis);
  return rows
    .map((r) => ({ x: r[xKey], y: Number(r[yKey]) }))
    .filter((p) => p.x != null && Number.isFinite(p.y))
    .sort((a, b) => (String(a.x) < String(b.x) ? -1 : String(a.x) > String(b.x) ? 1 : 0));
}
