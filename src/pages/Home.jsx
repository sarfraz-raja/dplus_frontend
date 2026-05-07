import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-white px-6 py-6 dark:bg-gradient-to-br dark:from-[#0f1419] dark:to-[#1a1f2e]">
      <div className="mx-auto h-full max-w-[1600px] flex flex-col">
        <section className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#090728] dark:text-blue-400">Dashboard</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">DataPlus Network Intelligence</h1>
        </section>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-6 pb-6">
            {/* Hero Card - GIS Intelligence */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-orange-500/30 dark:bg-gradient-to-br dark:from-amber-900/30 dark:to-slate-900 dark:shadow-2xl">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#090728] dark:text-blue-400">Spatial Intelligence</p>
                  <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">GIS Engine</h2>
                  <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-white">Visualize network layers on live maps - cells, sites, offices & drive tests with full spatial context.</p>
                  <div className="mt-6 flex gap-4">
                    <div className="rounded-lg bg-slate-50 px-4 py-2 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:backdrop-blur">
                      <p className="text-xs text-slate-500 dark:text-white">GIS LAYERS</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">5</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-4 py-2 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:backdrop-blur">
                      <p className="text-xs text-slate-500 dark:text-white">ACTIVE NODES</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">42.8K</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleNavigation('/gis-engine')}
                  className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <span>Launch GIS</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-gradient-to-br dark:from-amber-900/30 dark:to-slate-900 dark:shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-[#090728] dark:text-blue-400">Analytics</p>
                <h3 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Insights Engine</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-white">Drill into network KPIs with predictive analytics & degradation trends.</p>
                <button
                  onClick={() => handleNavigation('/insights-engine/network-dashboard')}
                  className="mt-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 transition-all"
                >
                  Enter Engine
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-gradient-to-br dark:from-amber-900/30 dark:to-slate-900 dark:shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#090728] dark:text-blue-400">Query</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">Workbench</h3>
                  </div>
                  <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded dark:bg-orange-500/20 dark:text-orange-300">Open</span>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 overflow-hidden mb-4 dark:bg-black">
                  <code className="text-xs text-cyan-400 font-mono leading-5">
                    <div>SELECT station_id, latency</div>
                    <div>FROM network_stress</div>
                    <div>WHERE latency &gt; 150ms</div>
                  </code>
                </div>
                <p className="text-xs text-slate-500 mb-4 dark:text-white">Execute complex SQL queries against real-time data sources</p>
                <button
                  onClick={() => handleNavigation('/custom-query/workbench')}
                  className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 transition-all"
                >
                  Open Workbench
                </button>
              </div>
            </div>

            {/* Feature Cards Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-lg dark:border-yellow-600/30 dark:bg-gradient-to-br dark:from-amber-900/30 dark:to-slate-900 dark:shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-[#090728] dark:text-blue-400">Intelligence</p>
                <h3 className="mt-3 text-xl font-black text-slate-900 dark:text-white">xAlerts</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-white">Threshold-based alerts on network KPIs with intelligent escalation.</p>
                <p className="mt-4 text-xs text-slate-500 dark:text-white">Get notified when critical thresholds are breached</p>
                <button
                  onClick={() => handleNavigation('/xalerts')}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-orange-500 font-bold hover:text-orange-400 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>View Alerts</span>
                </button>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-white p-8 shadow-lg dark:border-blue-500/30 dark:bg-gradient-to-br dark:from-amber-900/30 dark:to-slate-900 dark:shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#090728] dark:text-blue-400">Collaboration</p>
                    <h3 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Ticketing System</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-white">Track, assign and escalate network tickets across teams with full audit trail and escalation management.</p>
                    <button
                      onClick={() => handleNavigation('/tickets')}
                      className="mt-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 transition-all"
                    >
                      Open Ticketing
                    </button>
                  </div>
                  <div className="ml-8 flex-shrink-0">
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 dark:bg-white/5 dark:backdrop-blur dark:border-white/10">
                      <p className="text-xs text-slate-500 mb-3 dark:text-white">ACTIVE TICKETS</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white">2</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
