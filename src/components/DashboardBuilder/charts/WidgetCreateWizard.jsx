import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import WIDGET_TYPE_REGISTRY from '../widgetConfig/widgetTypeRegistry';
import { listDatasources } from '../../../store/actions/dashboardBuilder-actions';
import { subscribeDatasourcesChanged } from '../../../store/actions/datasourceEvents';

/**
 * "Add a widget" flow: the chart type is already known (whichever palette icon was
 * clicked — passed in as `initialType`), so this only asks for a dataset. Confirming
 * doesn't create the widget here — a real chart needs its column mapping (dimension/
 * measure/aggregation) properly configured, which this wizard has no UI for, so instead
 * it hands {chartType, datasourceId} up to the caller, which sends the user to the real
 * Charts tab (ChartLibrary.jsx) pre-filled with both, to finish configuring and save —
 * see DashboardBuilder.jsx's onCreateViaChartsTab/handleChartSavedForDashboard.
 */
export default function WidgetCreateWizard({ open, initialType, onClose, onConfirm }) {
  const [datasources, setDatasources] = useState([]);
  const [datasourcesLoading, setDatasourcesLoading] = useState(false);
  const [selectedDatasourceId, setSelectedDatasourceId] = useState('');

  useEffect(() => {
    if (!open) return;
    setDatasourcesLoading(true);
    listDatasources()
      .then((list) => {
        setDatasources(list);
        setSelectedDatasourceId((prev) => prev || list[0]?.id || '');
      })
      .catch(() => {})
      .finally(() => setDatasourcesLoading(false));
  }, [open]);

  useEffect(() => subscribeDatasourcesChanged(() => {
    listDatasources().then(setDatasources).catch(() => {});
  }), []);

  if (!open) return null;

  const confirm = () => {
    if (!selectedDatasourceId) return;
    onConfirm(selectedDatasourceId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-[480px] p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">
            Choose a dataset for {WIDGET_TYPE_REGISTRY[initialType]?.label}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <label className="text-xs font-medium text-slate-600">
          Dataset
          <select
            value={selectedDatasourceId}
            onChange={(e) => setSelectedDatasourceId(e.target.value)}
            className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
          >
            <option value="">{datasourcesLoading ? 'Loading…' : 'Select a dataset'}</option>
            {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
          </select>
        </label>
        {!datasourcesLoading && datasources.length === 0 && (
          <div className="text-xs text-slate-400">No datasets registered yet — add one in the Datasources tab first.</div>
        )}
        <div className="text-xs text-slate-400">
          Next, you'll set up the chart's fields (dimension/measure/aggregation) in the Charts tab, then it'll be added back to this dashboard automatically.
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={!selectedDatasourceId}
          className="self-end px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#EC7D09] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
