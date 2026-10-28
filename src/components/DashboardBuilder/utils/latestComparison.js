import { previewWidgetQuery } from '../../../store/actions/dashboardBuilder-actions';
import { COMPARISON_PRESET_SHIFT_MS, COMPARISON_PRESET_SHIFT_MONTHS, shiftMsByMonths } from './resolveTimeRange';

// Period 'Latest' + a shifted "Compare to" (1 hour / 1 day / 7 days / 30 days ago). The number is
// the reading at the newest date_filter_column value, so its comparison is the latest reading at
// or before (that newest value − the shift) — the same `<=` cutoff Latest's Custom comparison
// sends (buildCustomComparisonFilters), with the cutoff derived instead of picked. Shared by the
// Charts-tab preview (ChartLibrary.jsx) and the dashboard canvas (DashboardCanvasEditor.jsx).

export const isLatestShiftComparison = (mapping) => (
  mapping?.date_filter_range === 'Latest'
  && !!mapping.date_filter_column
  && !!(COMPARISON_PRESET_SHIFT_MS[mapping.compare_to] || COMPARISON_PRESET_SHIFT_MONTHS[mapping.compare_to])
);

// A row's date value → epoch ms, reading a zone-less value as UTC wall time so the cutoff below
// keeps the database's own wall time. Flask sends dates as RFC 1123 ('Tue, 27 Oct 2026 10:00:00
// GMT' — a naive timestamp written as GMT); ISO strings are handled too.
function parseDateValue(value) {
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00Z`);
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(s)) {
    const iso = s.replace(' ', 'T');
    return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
  }
  return Date.parse(s);
}

// Resolves to the comparison query's filters, or null when there's no data to anchor on.
// `filters` are the number's own already-resolved filters (dashboard filters on the canvas; none
// in the Charts tab) — the newest value is found under them, and they're kept on the comparison.
export async function buildLatestShiftComparisonFilters({ datasourceId, mapping, filters, quiet = true }) {
  const dateCol = mapping.date_filter_column;
  const shiftMs = COMPARISON_PRESET_SHIFT_MS[mapping.compare_to];
  const shiftMonths = COMPARISON_PRESET_SHIFT_MONTHS[mapping.compare_to];
  if (!datasourceId || !dateCol || !(shiftMs || shiftMonths)) return null;
  // One row: the measure grouped by the date column, narrowed to its newest value.
  const { rows } = await previewWidgetQuery({
    datasourceId,
    chartType: 'LINE',
    mapping: {
      x_axis: dateCol,
      y_axis: mapping.y_axis,
      ...(mapping.aggregation ? { aggregation: mapping.aggregation } : {}),
      date_filter_column: dateCol,
      date_filter_range: 'latest',
    },
    filters: filters?.length ? filters : undefined,
    quiet,
  });
  const anchorMs = rows?.[0]?.[dateCol] != null ? parseDateValue(rows[0][dateCol]) : NaN;
  if (!Number.isFinite(anchorMs)) return null;
  const cutoffMs = shiftMonths ? shiftMsByMonths(anchorMs, shiftMonths) : anchorMs - shiftMs;
  const cutoff = new Date(cutoffMs).toISOString().slice(0, 19).replace('T', ' ');
  return [...(filters || []), { column: dateCol, operator: '<=', value: cutoff }];
}
