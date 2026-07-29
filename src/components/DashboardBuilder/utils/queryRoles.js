/**
 * Declares which query roles (dimension/measure/legend columns) each widget `dataShape`
 * needs — same declarative-metadata-plus-one-generic-renderer pattern `styleFields`
 * (widgetTypeRegistry.js) already uses for style controls, applied here to data mapping
 * instead. Keyed by `dataShape` (not `type`) since which *columns* a chart needs is a
 * function of its rendering shape, not per-type internal differences — unlike styleFields/
 * component rendering, which must key off `type` per the file's own documented caveat.
 *
 * `role`: 'dimension' → only columns with `is_dimension: true` are offered.
 *         'measure' → only columns with `is_measure: true` are offered (pre-filled with
 *                      that column's own `default_aggregation`).
 *         'multi' → every column, multi-select (table widgets — no aggregation).
 */
export const QUERY_ROLES_BY_DATA_SHAPE = {
  series: [
    { key: 'dimension', label: 'Dimension (X-axis)', role: 'dimension' },
    { key: 'measure', label: 'Measure (Value)', role: 'measure' },
  ],
  multiSeries: [
    { key: 'dimension', label: 'Dimension (X-axis)', role: 'dimension' },
    { key: 'series', label: 'Series (Legend)', role: 'dimension' },
    { key: 'measure', label: 'Measure (Value)', role: 'measure' },
  ],
  xy: [
    { key: 'xMeasure', label: 'X Measure', role: 'measure' },
    { key: 'yMeasure', label: 'Y Measure', role: 'measure' },
    { key: 'nameDimension', label: 'Point Name', role: 'dimension', optional: true },
  ],
  'single-value': [
    { key: 'measure', label: 'Measure', role: 'measure' },
  ],
  gauge: [
    { key: 'measure', label: 'Measure', role: 'measure' },
  ],
  heatmap: [
    { key: 'rowDimension', label: 'Row (e.g. Day)', role: 'dimension' },
    { key: 'colDimension', label: 'Column (e.g. Hour)', role: 'dimension' },
    { key: 'measure', label: 'Measure', role: 'measure' },
  ],
  table: [
    { key: 'columns', label: 'Columns', role: 'multi' },
  ],
};
