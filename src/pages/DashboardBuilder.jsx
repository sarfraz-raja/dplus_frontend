import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Plus, ArrowLeft, Pencil, LayoutGrid } from 'lucide-react';
import Button from '../components/Button';
import KpiMonitoringDashboard from '../components/Dashboards/KpiDashboard/KpiMonitoringDashboard';
import DashboardCanvasEditor from '../components/Dashboards/DashboardCanvasEditor';

const STORAGE_KEY = 'dy3-dashboard-builder-layouts';

const STATIC_DASHBOARDS = [
  {
    id: 'kpi-monitoring',
    name: '5G KPI Monitoring Dashboard',
    description: 'RNA, throughput, payload, and top degraded cells — ECharts prototype.',
    static: true,
    render: () => <KpiMonitoringDashboard embedded />,
  },
];

function loadCustomDashboards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveCustomDashboards(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    /* ignore */
  }
}

const DashboardBuilder = () => {
  const [customDashboards, setCustomDashboards] = useState(loadCustomDashboards);
  const [view, setView] = useState('browse'); // 'browse' | 'editor'
  const [previewId, setPreviewId] = useState(null);
  const [selectedDashboard, setSelectedDashboard] = useState(null);

  useEffect(() => {
    saveCustomDashboards(customDashboards);
  }, [customDashboards]);

  const allDashboards = [...STATIC_DASHBOARDS, ...customDashboards];
  const previewDashboard = allDashboards.find((d) => d.id === previewId) || null;

  const openEditor = (dashboard) => {
    setSelectedDashboard(dashboard);
    setView('editor');
  };

  const openNewDashboard = () => {
    setSelectedDashboard(null);
    setView('editor');
  };

  const backToBrowse = () => {
    setSelectedDashboard(null);
    setView('browse');
  };

  const handleSave = ({ name, layout, widgets }) => {
    setCustomDashboards((prev) => {
      const existingIndex = selectedDashboard ? prev.findIndex((d) => d.id === selectedDashboard.id) : -1;
      const record = {
        id: selectedDashboard?.id || `custom_${Date.now()}`,
        name,
        layout,
        widgets,
        createdAt: selectedDashboard?.createdAt || new Date().toISOString(),
      };
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = record;
        return next;
      }
      return [...prev, record];
    });
    setPreviewId(selectedDashboard?.id);
    setView('browse');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {view === 'editor' ? (
            <button
              type="button"
              onClick={backToBrowse}
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md text-white hover:opacity-90 transition-opacity"
              style={{ background: '#0b1830' }}
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md" style={{ background: '#0b1830' }}>
              <LayoutDashboard size={20} className="text-white" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {view === 'editor' ? (selectedDashboard?.name || 'New Dashboard') : 'Dashboard Builder'}
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              {view === 'editor' ? 'Drag widgets, bind data sources, and save.' : 'Browse existing dashboards or build a new one.'}
            </p>
          </div>
        </div>
        {view === 'browse' && (
          <Button variant="primary" onClick={openNewDashboard} icon={<Plus size={16} />}>
            New Dashboard
          </Button>
        )}
      </div>

      {view === 'browse' && (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: dashboard list */}
          <div
            className="w-72 shrink-0 overflow-y-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0"
            style={{ background: 'rgba(255,255,255,0.55)' }}
          >
            <div className="px-4 py-2.5 border-b border-white/40 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Dashboards
            </div>
            {allDashboards.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setPreviewId(d.id)}
                className={`w-full flex items-center gap-2 text-left px-4 py-2.5 border-b border-white/30 transition-colors ${
                  previewId === d.id ? 'bg-white/80 border-l-2 border-l-[#EC7D09]' : 'hover:bg-white/50'
                }`}
              >
                <LayoutGrid size={14} className={previewId === d.id ? 'text-[#EC7D09]' : 'text-slate-400'} />
                <span className={`text-sm truncate ${previewId === d.id ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                  {d.name}
                </span>
              </button>
            ))}
            {allDashboards.length === 0 && (
              <div className="p-4 text-xs text-slate-400 text-center">No dashboards yet.</div>
            )}
          </div>

          {/* Right: preview */}
          <div
            className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0"
            style={{ background: 'rgba(255,255,255,0.55)' }}
          >
            {previewDashboard ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{previewDashboard.name}</div>
                    <div className="text-xs text-slate-400">
                      {previewDashboard.static
                        ? previewDashboard.description
                        : `${Object.keys(previewDashboard.widgets || {}).length} widget(s) · custom`}
                    </div>
                  </div>
                  {!previewDashboard.static && (
                    <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => openEditor(previewDashboard)}>
                      Edit
                    </Button>
                  )}
                </div>
                <div className="p-3">
                  {previewDashboard.static ? (
                    previewDashboard.render()
                  ) : (
                    <DashboardCanvasEditor
                      key={previewDashboard.id}
                      initialName={previewDashboard.name}
                      initialLayout={previewDashboard.layout}
                      initialWidgets={previewDashboard.widgets}
                      editable={false}
                      onSave={handleSave}
                      onCancel={backToBrowse}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
                <Pencil size={28} className="text-slate-300" />
                <div className="text-sm font-medium text-slate-500">Select a dashboard to preview</div>
                <div className="text-xs text-slate-400">or click + New Dashboard to build one</div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'editor' && (
        <div
          className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0 p-3"
          style={{ background: 'rgba(255,255,255,0.55)' }}
        >
          <DashboardCanvasEditor
            initialName={selectedDashboard?.name}
            initialLayout={selectedDashboard?.layout}
            initialWidgets={selectedDashboard?.widgets}
            editable
            onSave={handleSave}
            onCancel={backToBrowse}
          />
        </div>
      )}
    </div>
  );
};

export default DashboardBuilder;
