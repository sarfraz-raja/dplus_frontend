function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function genHourlySeries(base, spread) {
  return Array.from({ length: 24 }, (_, h) => ({
    label: String(h).padStart(2, '0'),
    value: Math.round((base + rand(-spread, spread)) * 10) / 10,
  }));
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
