function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function genHourlySeries(base, spread) {
  return Array.from({ length: 24 }, (_, h) => ({
    label: String(h).padStart(2, '0'),
    value: Math.round((base + rand(-spread, spread)) * 10) / 10,
  }));
}

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));

// [hourIndex, dayIndex, value] triples, ECharts' native heatmap data shape — congestion
// tends to spike around 08-10 and 18-21 on weekdays, so bias the mock toward that pattern
// rather than pure noise (more useful for eyeballing whether the widget "looks right").
function genHeatmapGrid(base, spread) {
  const data = [];
  for (let d = 0; d < HEATMAP_DAYS.length; d++) {
    const isWeekend = d >= 5;
    for (let h = 0; h < HEATMAP_HOURS.length; h++) {
      const peak = !isWeekend && ((h >= 8 && h <= 10) || (h >= 18 && h <= 21)) ? spread : 0;
      data.push([h, d, Math.round((base + peak + rand(-spread / 2, spread / 2)) * 10) / 10]);
    }
  }
  return data;
}

/**
 * Mock metric catalog — a stand-in for a real "saved query" data source.
 * Each entry's shape mirrors what a future `savedQuery` binding (via
 * CustomQueryActions.postRunQuery) would resolve to, so swapping the
 * `type: 'mock'` resolver for a `type: 'savedQuery'` one later doesn't
 * require reshaping widgets/layout — only a new resolver branch.
 */
const MOCK_DATA_SOURCES = {
  rna: {
    label: 'RNA (%)',
    dataShape: 'single-value',
    generate: () => ({ value: '100%', delta: '0% vs last hour', deltaUp: true, color: '#34d399' }),
  },
  dlThroughput: {
    label: 'DL Throughput (Mbps)',
    dataShape: 'series',
    generate: () => ({ data: genHourlySeries(28, 6), color: '#4f9eff', unit: '' }),
  },
  ulThroughput: {
    label: 'UL Throughput (Mbps)',
    dataShape: 'series',
    generate: () => ({ data: genHourlySeries(2.6, 0.8), color: '#34d399', unit: '' }),
  },
  payload5g: {
    label: '5G Payload (GB)',
    dataShape: 'series',
    generate: () => ({ data: genHourlySeries(52, 8), color: '#f5a623', unit: '' }),
  },
  radioAvailability: {
    label: 'Radio Network Availability (%)',
    dataShape: 'gauge',
    generate: () => ({ value: rand(96, 100), color: '#34d399' }),
  },
  congestionPattern: {
    label: 'Congestion Pattern (Heatmap)',
    dataShape: 'heatmap',
    generate: () => ({ days: HEATMAP_DAYS, hours: HEATMAP_HOURS, data: genHeatmapGrid(45, 40), color: '#EC4899', unit: '%' }),
  },
  // Naturally decreasing stage values (not genHourlySeries, which is a random trend) —
  // a funnel needs a monotonic-ish shape to read correctly.
  callSetupFunnel: {
    label: 'Call Setup Funnel',
    dataShape: 'series',
    generate: () => ({
      data: [
        { label: 'Attempts', value: 10000 },
        { label: 'Setup', value: 9820 },
        { label: 'Connected', value: 9540 },
        { label: 'Completed', value: 9210 },
      ],
      unit: '',
    }),
  },
  // Signed deltas (some negative) — genHourlySeries is always positive, doesn't fit a
  // waterfall's "what went up, what went down" framing. No trailing "This week": 0 entry —
  // WaterfallChart.jsx has no concept of a "total" bar (every entry is a delta, stacked
  // cumulatively), so a zero-value entry renders as an invisible sliver instead of a
  // meaningful ending total; the running total after the last real delta already reads
  // correctly without it.
  kpiWaterfallDeltas: {
    label: 'Availability Change Breakdown',
    dataShape: 'series',
    generate: () => ({
      data: [
        { label: 'Last week', value: 98.4 },
        { label: 'Site A fix', value: 0.6 },
        { label: 'Site B outage', value: -1.2 },
        { label: 'Vendor patch', value: 0.9 },
      ],
      unit: '%',
    }),
  },
  trafficByRegion: {
    label: 'Traffic by Region',
    dataShape: 'series',
    generate: () => ({
      data: [
        { label: 'Libreville', value: 4200 },
        { label: 'Port-Gentil', value: 2100 },
        { label: 'Franceville', value: 1300 },
        { label: 'Lambaréné', value: 800 },
        { label: 'Oyem', value: 650 },
      ],
      unit: ' GB',
    }),
  },
  // Genuinely new shape — {x, y, name}[] paired points, not {label, value}[].
  throughputVsRsrp: {
    label: 'Throughput vs RSRP',
    dataShape: 'xy',
    generate: () => ({
      data: Array.from({ length: 30 }, (_, i) => ({
        x: rand(-115, -75),
        y: Math.round((rand(5, 60) + rand(-10, 10)) * 10) / 10,
        name: `Cell_${String(i + 1).padStart(3, '0')}`,
      })),
      xLabel: 'RSRP (dBm)', yLabel: 'Throughput (Mbps)', unit: '',
    }),
  },
  // Genuinely new shape — {categories, series: [{name, data}]}, not {label, value}[].
  trafficByTechnology: {
    label: 'Traffic by Technology (per Site)',
    dataShape: 'multiSeries',
    generate: () => {
      const categories = ['Site A', 'Site B', 'Site C', 'Site D', 'Site E'];
      const mk = (base, spread) => categories.map(() => Math.round((base + rand(-spread, spread)) * 10) / 10);
      return {
        categories,
        series: [
          { name: '2G', data: mk(120, 30) },
          { name: '3G', data: mk(340, 60) },
          { name: '4G', data: mk(1800, 300) },
          { name: '5G', data: mk(2600, 400) },
        ],
        unit: ' GB',
      };
    },
  },
  kpiStatusTable: {
    label: 'KPI Status Table',
    dataShape: 'table',
    generate: () => ({
      rows: [
        { name: 'RNA', value: '100', criteria: '100', status: 'ok' },
        { name: '5G Payload', value: '52.5 GB', criteria: '> 25 GB', status: 'warn' },
        { name: 'DL Throughput', value: '28.6 Mbps', criteria: '> 25 Mbps', status: 'ok' },
        { name: 'DL Packet Loss (%)', value: '1.1 ms', criteria: '<-1%', status: 'crit' },
      ],
    }),
  },
};

export default MOCK_DATA_SOURCES;
