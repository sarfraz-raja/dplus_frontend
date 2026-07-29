import React, { useEffect, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import Button from '../../Button';
import BarChart from '../../Widgets/BarChart';
import {
  listDatasources,
  getDatasourceDetail,
  createDashboard,
  createAndAttachWidget,
  getWidgetData,
} from '../../../store/actions/dashboardBuilder-actions';

// Minimal, self-contained sandbox for proving the real backend chain end-to-end:
// pick a datasource -> map x/y/aggregation -> createDashboard -> createAndAttachWidget
// -> getWidgetData -> render with the real BarChart component. Chart type is fixed to
// BAR for this first pass. Nothing here touches the mock/local dashboard code paths.
const AGGREGATIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];

export default function RealWidgetTester() {
  const [datasources, setDatasources] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [columns, setColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [columnsError, setColumnsError] = useState('');

  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [aggregation, setAggregation] = useState('SUM');
  const [widgetName, setWidgetName] = useState('Test Widget');

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [runLog, setRunLog] = useState([]);
  const [result, setResult] = useState(null); // { columns, rows }

  useEffect(() => {
    setLoadingList(true);
    listDatasources()
      .then((list) => setDatasources(list))
      .catch((err) => setListError(err.message))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setColumns([]);
      return;
    }
    setLoadingColumns(true);
    setColumnsError('');
    setXAxis('');
    setYAxis('');
    getDatasourceDetail(selectedId)
      .then(({ columns: cols }) => setColumns(cols))
      .catch((err) => setColumnsError(err.message))
      .finally(() => setLoadingColumns(false));
  }, [selectedId]);

  const columnName = (c) => c.column_name;

  const runTest = async () => {
    setRunning(true);
    setRunError('');
    setRunLog([]);
    setResult(null);
    try {
      setRunLog((l) => [...l, 'Creating dashboard...']);
      const { dashboard } = await createDashboard({
        name: `Real Widget Test ${new Date().toLocaleString()}`,
        description: 'Created by the Real Data Test tab',
        layout: [],
      });

      setRunLog((l) => [...l, `Dashboard created (id: ${dashboard.id}). Creating & attaching widget...`]);
      const widget = await createAndAttachWidget(dashboard.id, {
        name: widgetName,
        datasourceId: selectedId,
        chartType: 'BAR',
        mapping: { x_axis: xAxis, y_axis: yAxis, aggregation },
        position: { x: 0, y: 0, w: 6, h: 4 },
      });

      setRunLog((l) => [...l, `Widget created (id: ${widget.id}). Fetching data...`]);
      const data = await getWidgetData(dashboard.id, widget.id);

      setRunLog((l) => [...l, `Data received: ${data.rows.length} row(s).`]);
      setResult(data);
    } catch (err) {
      setRunError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const chartData = result
    ? result.rows.map((r) => ({ label: String(r[xAxis]), value: Number(r[yAxis]) || 0 }))
    : [];

  const canRun = selectedId && xAxis && yAxis && !running;

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="text-sm text-slate-500">
        Pick a registered datasource, map a dimension/measure, then run the real create-dashboard
        → create-widget → fetch-data chain against the backend.
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Datasource</label>
          <select
            className="w-56 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">{loadingList ? 'Loading...' : 'Select a datasource'}</option>
            {datasources.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {listError && <div className="text-xs text-red-500">{listError}</div>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">X Axis (dimension)</label>
          <select
            className="w-48 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
            disabled={!columns.length}
          >
            <option value="">{loadingColumns ? 'Loading...' : 'Select column'}</option>
            {columns.map((c) => (
              <option key={columnName(c)} value={columnName(c)}>{c.display_name || columnName(c)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Y Axis (measure)</label>
          <select
            className="w-48 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value)}
            disabled={!columns.length}
          >
            <option value="">{loadingColumns ? 'Loading...' : 'Select column'}</option>
            {columns.map((c) => (
              <option key={columnName(c)} value={columnName(c)}>{c.display_name || columnName(c)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Aggregation</label>
          <select
            className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
          >
            {AGGREGATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Widget name</label>
          <input
            className="w-48 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={widgetName}
            onChange={(e) => setWidgetName(e.target.value)}
          />
        </div>

        <Button variant="primary" icon={<PlayCircle size={16} />} onClick={runTest} disabled={!canRun}>
          {running ? 'Running...' : 'Create & Run'}
        </Button>
      </div>

      {columnsError && <div className="text-xs text-red-500">{columnsError}</div>}

      {runLog.length > 0 && (
        <div className="text-xs text-slate-500 flex flex-col gap-0.5 font-mono">
          {runLog.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      {runError && <div className="text-sm text-red-500 font-medium">{runError}</div>}

      {result && (
        <div className="max-w-xl">
          <BarChart title={widgetName} data={chartData} />
        </div>
      )}
    </div>
  );
}
