// Client-side aggregation of a registered datasource's cached `sample_rows` (from its last
// /preview call — see dashboardDatasources.js) into whatever shape each widget `dataShape`
// expects, matching mockDataSources.js's generate() output shapes exactly so widget
// components don't need to know or care whether their data came from mock or 'db'.
//
// This is a stand-in for real server-side query execution — no /dashboard-builder endpoint
// for that is confirmed yet (see the plan's Phase 10 notes). It only ever sees the cached
// sample rows (a small preview, not the full dataset), so it's for visual/testing purposes,
// not a substitute for a real aggregated backend query — genuinely useful now, and isolated
// here so swapping to a real API call later only means rewriting this one function.

function aggregate(values, agg) {
  const nums = values.map(Number).filter((n) => !Number.isNaN(n));
  if (!nums.length) return 0;
  switch ((agg || 'SUM').toUpperCase()) {
    case 'AVG': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'COUNT': return nums.length;
    case 'MIN': return Math.min(...nums);
    case 'MAX': return Math.max(...nums);
    case 'SUM':
    default: return nums.reduce((a, b) => a + b, 0);
  }
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

/** `mapping` is the widget's `dataSource.mapping` object from DataMappingFields — role keys
 * per QUERY_ROLES_BY_DATA_SHAPE, plus `${roleKey}Aggregation` for measure roles. Returns
 * `{}` (empty, matching mock sources' own "no data yet" shape) if the mapping is incomplete. */
export function aggregateDatasourceRows(dataShape, mapping, rows) {
  if (!rows?.length) return {};

  if (dataShape === 'series') {
    const { dimension, measure, measureAggregation } = mapping;
    if (!dimension || !measure) return {};
    const groups = groupBy(rows, (r) => r[dimension]);
    const data = [...groups.entries()].map(([label, groupRows]) => ({
      label: String(label),
      value: aggregate(groupRows.map((r) => r[measure]), measureAggregation),
    }));
    return { data, unit: '' };
  }

  if (dataShape === 'multiSeries') {
    const { dimension, series: seriesCol, measure, measureAggregation } = mapping;
    if (!dimension || !seriesCol || !measure) return {};
    const categories = [...new Set(rows.map((r) => String(r[dimension])))];
    const seriesNames = [...new Set(rows.map((r) => String(r[seriesCol])))];
    const series = seriesNames.map((name) => ({
      name,
      data: categories.map((cat) => {
        const cellRows = rows.filter((r) => String(r[dimension]) === cat && String(r[seriesCol]) === name);
        return cellRows.length ? aggregate(cellRows.map((r) => r[measure]), measureAggregation) : 0;
      }),
    }));
    return { categories, series, unit: '' };
  }

  if (dataShape === 'xy') {
    const { xMeasure, yMeasure, nameDimension } = mapping;
    if (!xMeasure || !yMeasure) return {};
    const data = rows.map((r, i) => ({ x: Number(r[xMeasure]) || 0, y: Number(r[yMeasure]) || 0, name: nameDimension ? String(r[nameDimension]) : `Row ${i + 1}` }));
    return { data, xLabel: xMeasure, yLabel: yMeasure, unit: '' };
  }

  if (dataShape === 'single-value' || dataShape === 'gauge') {
    const { measure, measureAggregation } = mapping;
    if (!measure) return {};
    return { value: Math.round(aggregate(rows.map((r) => r[measure]), measureAggregation) * 100) / 100 };
  }

  if (dataShape === 'heatmap') {
    const { rowDimension, colDimension, measure, measureAggregation } = mapping;
    if (!rowDimension || !colDimension || !measure) return {};
    const days = [...new Set(rows.map((r) => String(r[rowDimension])))];
    const hours = [...new Set(rows.map((r) => String(r[colDimension])))];
    const data = [];
    hours.forEach((h, hi) => {
      days.forEach((d, di) => {
        const cellRows = rows.filter((r) => String(r[rowDimension]) === d && String(r[colDimension]) === h);
        if (cellRows.length) data.push([hi, di, aggregate(cellRows.map((r) => r[measure]), measureAggregation)]);
      });
    });
    return { days, hours, data, unit: '' };
  }

  if (dataShape === 'table') {
    const cols = mapping.columns || [];
    if (!cols.length) return {};
    return { rows: rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))) };
  }

  return {};
}
