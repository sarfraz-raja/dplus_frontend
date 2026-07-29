// One fixed, shared example dataset per dataShape — used ONLY for the widget-create wizard's
// chart-type preview thumbnails (WidgetCreateWizard.jsx), so every tile shows a live mini
// render regardless of which real mock data source the user ends up picking. Not used for
// actual placed widgets — those still read from mockDataSources.js/dataSource.key as before.
const GENERIC_SAMPLE_DATA = {
  'single-value': { label: 'Sample', fullName: 'Sample Metric', value: '72%', delta: '4.2%', deltaUp: true, color: '#378ADD' },
  gauge: { value: 72, color: '#378ADD' },
  series: { data: [{ label: 'A', value: 40 }, { label: 'B', value: 65 }, { label: 'C', value: 30 }, { label: 'D', value: 80 }, { label: 'E', value: 55 }], unit: '' },
  multiSeries: {
    categories: ['A', 'B', 'C'],
    series: [{ name: 'S1', data: [10, 20, 15] }, { name: 'S2', data: [5, 15, 25] }],
  },
  heatmap: {
    days: ['Mon', 'Tue', 'Wed'],
    hours: ['00', '06', '12', '18'],
    data: [[0, 0, 5], [1, 0, 8], [2, 0, 3], [3, 0, 6], [0, 1, 7], [1, 1, 2], [2, 1, 9], [3, 1, 4], [0, 2, 1], [1, 2, 6], [2, 2, 5], [3, 2, 8]],
  },
  xy: { data: [{ x: 1, y: 2, name: 'P1' }, { x: 3, y: 5, name: 'P2' }, { x: 2, y: 1, name: 'P3' }, { x: 4, y: 3, name: 'P4' }] },
  table: { rows: [{ name: 'Sample', value: '42', criteria: '>40', status: 'ok' }, { name: 'Other', value: '18', criteria: '<20', status: 'warn' }] },
};

export default GENERIC_SAMPLE_DATA;
