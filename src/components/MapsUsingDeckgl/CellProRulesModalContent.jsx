import { useEffect, useState } from 'react';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';

const FILTERS = ['All', 'Issues only', 'Warnings', 'OK only', 'Accessibility', 'Capacity', 'Mobility', 'Integrity', 'Quality'];

const statusColor = (s = '') => {
  const v = s.toLowerCase();
  if (v.includes('issue'))   return '#dc2626';
  if (v.includes('warning')) return '#d97706';
  if (v === 'ok')            return '#16a34a';
  return '#374151';
};

const categoryColor = (c = '') => {
  switch (c.toLowerCase()) {
    case 'capacity':      return '#7c3aed';
    case 'integrity':     return '#0891b2';
    case 'mobility':      return '#0d9488';
    case 'accessibility': return '#2563eb';
    case 'quality':       return '#be185d';
    default:              return '#374151';
  }
};

const CellProRulesModalContent = ({ cellId, cellName }) => {
  const [cellData, setCellData]         = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [date, setDate]                 = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter]             = useState('All');

  // tech is derived from response data, not selected
  const techFromData = cellData.length > 0 ? [...new Set(cellData.map(r => r.tech).filter(Boolean))].join(', ') : '-';

  useEffect(() => { if (cellName || cellId) fetchCellProRules(); }, [cellName, cellId]);
  useEffect(() => { applyFilter(); }, [cellData, filter]);

  const fetchCellProRules = async (overrideDate) => {
    const useDate = overrideDate ?? date;
    setLoading(true); setError(null);
    try {
      const response = await Api.get({
        url: `${Urls.cell_pro_rules}?cell_name=${encodeURIComponent(cellName || cellId)}&date=${encodeURIComponent(useDate)}`,
        inst: 0,
      });
      if (response?.status === 200 && response.data?.data) {
        setCellData(response.data.data);
      } else {
        setCellData([]); setError('No data returned from API');
      }
    } catch (err) {
      setError('Error fetching data');
      if (import.meta.env.DEV) console.warn('[cell-pro-rules]', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (!cellData?.length) { setFilteredData([]); return; }
    if (filter === 'All')  { setFilteredData(cellData); return; }
    const n = filter.toLowerCase();
    setFilteredData(cellData.filter((row) => {
      if (n === 'issues only') return row.status?.toLowerCase().includes('issue');
      if (n === 'warnings')    return row.status?.toLowerCase().includes('warning');
      if (n === 'ok only')     return row.status?.toLowerCase() === 'ok';
      return row.category?.toLowerCase() === n;
    }));
  };

  const ok       = cellData.filter((r) => r.status?.toLowerCase() === 'ok').length;
  const issues   = cellData.filter((r) => r.status?.toLowerCase().includes('issue')).length;
  const warnings = cellData.filter((r) => r.status?.toLowerCase().includes('warning')).length;
  const total    = cellData.length;
  const health   = total ? Math.round((ok / total) * 100) : 0;

  const displayName = cellName || cellId || 'N/A';

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* Row 1: Cell Name | Date | Submit */}
      <div className="flex gap-2 items-stretch">
        <div className="flex-[3] flex flex-col">
          <label className="block text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Cell Name</label>
          <input
            value={displayName}
            readOnly
            className="flex-1 w-full border border-slate-300 rounded px-2 py-0 text-xs bg-slate-50 font-medium text-slate-800 h-7"
          />
        </div>
        <div className="flex-[2] flex flex-col">
          <label className="block text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 w-full border border-slate-300 rounded px-2 py-0 text-xs h-7"
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-[9px] text-transparent uppercase tracking-wide mb-0.5">-</label>
          <button
            onClick={() => fetchCellProRules(date)}
            className="px-3 text-white text-xs rounded font-semibold h-7"
            style={{ background: '#1f2937' }}
          >
            Submit
          </button>
        </div>
      </div>

      {/* Row 2: Stat cards */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Rules OK',     value: ok,           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Issues',       value: issues,        color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          { label: 'Warnings',     value: warnings,      color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Total Rules',  value: total,         color: '#1e293b', bg: '#f8fafc', border: '#e2e8f0' },
          { label: 'Health',       value: `${health}%`,  color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className="rounded-lg p-2 text-center flex flex-col items-center justify-center gap-0.5"
            style={{ background: bg, border: `1.5px solid ${border}` }}>
            <span style={{ color }} className="text-lg font-bold leading-none">{value}</span>
            <span className="text-[10px] uppercase leading-none font-medium" style={{ color }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Row 3: Filters */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-slate-400 font-semibold uppercase mr-1 shrink-0">Filter:</span>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="py-0.5 px-1.5 text-[10px] rounded border transition-colors whitespace-nowrap"
            style={filter === f
              ? { background: '#1f2937', color: '#fff', borderColor: '#1f2937' }
              : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded flex-1" style={{ minHeight: '120px' }}>
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0" style={{ background: '#1f2937', color: '#fff' }}>
            <tr>
              <th className="px-3 py-2.5 font-semibold">Tech</th>
              <th className="px-3 py-2.5 font-semibold">Rule name</th>
              <th className="px-3 py-2.5 font-semibold">Category</th>
              <th className="px-3 py-2.5 font-semibold">Details</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Issues / remarks</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-slate-400 py-8 text-sm">Loading...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-slate-400 py-8 text-sm">{error || 'No records found.'}</td></tr>
            ) : (
              filteredData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 border-b border-slate-100 font-medium">{item.tech || item.technology || '-'}</td>
                  <td className="px-3 py-2 border-b border-slate-100">{item.rule_name || '-'}</td>
                  <td className="px-3 py-2 border-b border-slate-100 font-semibold" style={{ color: categoryColor(item.category) }}>{item.category || '-'}</td>
                  <td className="px-3 py-2 border-b border-slate-100">{item.details || '-'}</td>
                  <td className="px-3 py-2 border-b border-slate-100 font-semibold" style={{ color: statusColor(item.status) }}>{item.status || '-'}</td>
                  <td className="px-3 py-2 border-b border-slate-100 text-slate-600">{item.issues || item.remarks || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default CellProRulesModalContent;
