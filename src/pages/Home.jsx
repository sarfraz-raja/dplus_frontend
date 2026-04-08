import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Zap, TrendingUp, AlertCircle, Ticket } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] px-6 py-6">
      <div className="mx-auto h-full max-w-[1600px] flex flex-col">
        {/* Header */}
        <section className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Dashboard</p>
          <h1 className="mt-2 text-3xl font-black text-white">DataPlus Network Intelligence</h1>
        </section>

        {/* Main Content - scrollable */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-6 pb-6">
            {/* Hero Card - GIS Intelligence */}
            <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
              </div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Spatial Intelligence</p>
                  <h2 className="mt-3 text-2xl font-black text-white">GIS Engine</h2>
                  <p className="mt-2 max-w-md text-sm text-gray-400">Visualize network layers on live maps - cells, sites, offices & drive tests with full spatial context.</p>
                  <div className="mt-6 flex gap-4">
                    <div className="rounded-lg bg-white/5 backdrop-blur px-4 py-2 border border-white/10">
                      <p className="text-xs text-gray-400">GIS LAYERS</p>
                      <p className="text-2xl font-black text-white">5</p>
                    </div>
                    <div className="rounded-lg bg-white/5 backdrop-blur px-4 py-2 border border-white/10">
                      <p className="text-xs text-gray-400">ACTIVE NODES</p>
                      <p className="text-2xl font-black text-white">42.8K</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleNavigation('/telecom-maps')}
                  className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <span>Launch GIS</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Insights Engine Card */}
              <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Analytics</p>
                <h3 className="mt-3 text-xl font-black text-white">Insights Engine</h3>
                <p className="mt-2 text-sm text-gray-400">Drill into network KPIs with predictive analytics & degradation trends.</p>
                <button 
                  onClick={() => handleNavigation('/insights-engine/network-dashboard')}
                  className="mt-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 transition-all"
                >
                  Enter Engine
                </button>
              </div>

              {/* Query Workbench */}
              <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Query</p>
                    <h3 className="mt-2 text-xl font-black text-white">Workbench</h3>
                  </div>
                  <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">Open</span>
                </div>
                <div className="rounded-lg bg-black p-3 overflow-hidden mb-4">
                  <code className="text-xs text-cyan-400 font-mono leading-5">
                    <div>SELECT station_id, latency</div>
                    <div>FROM network_stress</div>
                    <div>WHERE latency &gt; 150ms</div>
                  </code>
                </div>
                <p className="text-xs text-gray-400 mb-4">Execute complex SQL queries against real-time data sources</p>
                <button 
                  onClick={() => handleNavigation('/custom-query/advanced-query-builder')}
                  className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 transition-all"
                >
                  Open Workbench
                </button>
              </div>
            </div>

            {/* Feature Cards Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* xAlerts Card */}
              <div className="rounded-3xl border border-yellow-600/30 bg-gradient-to-br from-amber-900/30 to-slate-900 p-8 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Intelligence</p>
                <h3 className="mt-3 text-xl font-black text-white">xAlerts</h3>
                <p className="mt-2 text-sm text-gray-400">Threshold-based alerts on network KPIs with intelligent escalation.</p>
                <p className="mt-4 text-xs text-gray-400">Get notified when critical thresholds are breached</p>
                <button 
                  onClick={() => handleNavigation('/report-scheduler')}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-orange-500 font-bold hover:text-orange-400 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>View Alerts</span>
                </button>
              </div>

              {/* Ticketing System Card - MOVED HERE */}
              <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Collaboration</p>
                    <h3 className="mt-3 text-xl font-black text-white">Ticketing System</h3>
                    <p className="mt-2 text-sm text-gray-400">Track, assign and escalate network tickets across teams with full audit trail and escalation management.</p>
                    <button 
                      onClick={() => handleNavigation('/discussions')}
                      className="mt-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 transition-all"
                    >
                      Open Ticketing
                    </button>
                  </div>
                  <div className="ml-8 flex-shrink-0">
                    <div className="rounded-lg bg-white/5 backdrop-blur p-4 border border-white/10">
                      <p className="text-xs text-gray-400 mb-3">ACTIVE TICKETS</p>
                      <p className="text-3xl font-black text-white">2</p>
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
