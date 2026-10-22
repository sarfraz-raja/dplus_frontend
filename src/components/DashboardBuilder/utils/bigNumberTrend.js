import { previewWidgetQuery } from '../../../store/actions/dashboardBuilder-actions';
import { measureKey } from '../charts/renderChartWidget';

// Big Number's trend line (BigNumberCard's sparkline): the card's own measure + aggregation
// re-run as a LINE over its date column, through POST /widgets/preview — no widget row and no
// backend change. Shared by the Charts-tab preview (ChartLibrary.jsx) and the dashboard
// canvas (DashboardCanvasEditor.jsx) so both draw the same line.

// Only for a Big Number with the trend on (the default — unset counts as On, only 'Off' turns
// it off) and a real period ('Latest' is a single instant — nothing to draw over).
export const isBigNumberTrendOn = (mapping) => mapping?.show_trend !== 'Off';
export const wantsBigNumberTrend = (mapping) => (
  mapping?.kpi_variant === 'big_number'
  && isBigNumberTrendOn(mapping)
  && !!mapping.date_filter_column
  && mapping.date_filter_range !== 'Latest'
);

// Resolves to [{ x, y }] in time order. `filters` are the same already-resolved query filters
// the card's own number used (its Period, plus any dashboard filters on the canvas).
export async function fetchBigNumberTrend({ datasourceId, mapping, filters, quiet = false }) {
  const xKey = mapping.date_filter_column;
  const trendMapping = {
    x_axis: xKey,
    y_axis: mapping.y_axis,
    ...(mapping.aggregation ? { aggregation: mapping.aggregation } : {}),
    // The backend caps a LINE at 1000 rows and, with no sorting, adds no ORDER BY — a long
    // period on fine-grained data (e.g. "This year" of 15-min rows) then returned an arbitrary
    // 1000 timestamps. Newest-first makes the cap keep the most recent 1000 points; they're put
    // back in time order below.
    sorting: [{ column: xKey, direction: 'DESC' }],
  };
  const { rows } = await previewWidgetQuery({ datasourceId, chartType: 'LINE', mapping: trendMapping, filters, quiet });
  const yKey = measureKey(mapping.y_axis);
  return rows
    .map((r) => ({ x: r[xKey], y: Number(r[yKey]) }))
    .filter((p) => p.x != null && Number.isFinite(p.y))
    .sort((a, b) => (String(a.x) < String(b.x) ? -1 : String(a.x) > String(b.x) ? 1 : 0));
}
