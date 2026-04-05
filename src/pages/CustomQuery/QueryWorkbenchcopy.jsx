// import { useState } from 'react';
// import { useDispatch, useSelector } from 'react-redux';

// // --- MOCK DATA (You would replace this with Redux selectors) ---
// const mockSavedQueries = [
//     { id: 1, dbname: 'postgres', dbserver: '192.168.0.100', query: 'SELECT * FROM web_users;' },
//     { id: 2, dbname: 'postgres', dbserver: '192.168.0.100', query: 'SELECT * FROM order_history WHERE date > \'2023-01-01\';' },
// ];

// const mockResultData = [
//     { id: 1, username: 'testing_testing', email: 'user@test.com', status: 'active' },
//     { id: 2, username: 'AD1 Test', email: 'ad1@test.com', status: 'pending' },
// ];

// const mockColumns = ['id', 'username', 'email', 'status'];
// // -----------------------------------------------------------------

// // --- REUSABLE DROPDOWN COMPONENT ---
// // This handles the "Export As" and "Save Query" functionality
// const CustomActionsDropdown = ({ onExportCSV, onExportExcel, onSave }) => {
//     const [open, setOpen] = useState(false);

//     return (
//         <div className="relative inline-block text-left">
//             <button
//                 type="button"
//                 onClick={() => setOpen(!open)}
//                 className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
//                 style={{ background: '#EC7D09' }} // Matching orange theme
//             >
//                 Actions ▾
//             </button>
//             {open && (
//                 <div className="absolute right-0 top-11 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-1 min-w-[160px]">
//                     <button onClick={() => { onSave(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">Save Query</button>
//                     <div className="border-t border-slate-100 my-1"></div>
//                     <p className="px-3 py-1 text-xs text-slate-400 font-medium tracking-wide uppercase">Export As</p>
//                     <button onClick={() => { onExportCSV(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">CSV</button>
//                     <button onClick={() => { onExportExcel(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">Excel</button>
//                 </div>
//             )}
//         </div>
//     );
// };
// // -----------------------------------

// const QueryWorkbench = () => {
//     const [activeQuery, setActiveQuery] = useState('');
//     const [results, setResults] = useState([]);
//     const [server, setServer] = useState('');

//     // --- DRAG AND DROP HANDLERS ---
//     const handleDragStart = (e, query) => {
//         e.dataTransfer.setData('sql_query', query);
//     };

//     const handleDrop = (e) => {
//         e.preventDefault();
//         const droppedQuery = e.dataTransfer.getData('sql_query');
//         setActiveQuery(droppedQuery);
//     };

//     const handleDragOver = (e) => {
//         e.preventDefault();
//     };

//     // --- MAIN ACTION HANDLERS ---
//     const executeQuery = () => {
//         if (!activeQuery.trim()) {
//             console.warn("Cannot execute an empty query.");
//             return;
//         }
//         // Mock API call to fetch results
//         console.log(`Executing on ${server}: ${activeQuery}`);
//         setResults(mockResultData); // Populate the table
//     };

//     const clearWorkbenchcopy = () => {
//         setActiveQuery('');
//         setResults([]);
//     };

//     const saveQuery = () => { console.log('Saving:', activeQuery); };
//     const exportCSV = () => { console.log('Exporting CSV'); };
//     const exportExcel = () => { console.log('Exporting Excel'); };

//     return (
//         <div className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
//             style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}
//         >
//             {/* Header */}
//             <div className="flex items-center gap-3 shrink-0">
//                 <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
//                     style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
//                     <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//                         <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
//                     </svg>
//                 </div>
//                 <h1 className="text-xl font-bold text-slate-800 leading-tight">Query Workbench</h1>
//             </div>

//             {/* Main Workbench Layout (Unified Two-Panel Structure) */}
//             <div className="flex-1 flex gap-5 overflow-hidden">

//                 {/* Left Panel: Saved Query Library */}
//                 <div className="w-80 flex flex-col gap-3 rounded-xl backdrop-blur-md border border-white/60 shadow-lg p-4 shrink-0"
//                     style={{ background: 'rgba(255,255,255,0.5)' }}>
//                     <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-1">Saved Queries</h2>
//                     <input type="text" placeholder="Search queries..." className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner"/>

//                     {/* Query List - Replaced the Table structure with draggable Cards */}
//                     <div className="flex-1 overflow-y-auto space-y-3 pr-2">
//                         {mockSavedQueries.map((q) => (
//                             <div
//                                 key={q.id}
//                                 draggable
//                                 onDragStart={(e) => handleDragStart(e, q.query)}
//                                 className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm cursor-grab hover:border-blue-200 transition-colors"
//                             >
//                                 <div className="flex justify-between items-center mb-1">
//                                     <p className="text-xs font-semibold text-slate-700">{q.dbname}</p>
//                                     <p className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1 rounded">{q.dbserver}</p>
//                                 </div>
//                                 <p className="text-xs font-mono text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded" title={q.query}>
//                                     {q.query}
//                                 </p>
//                             </div>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Right Panel: The Composer (SQL Editor & Results) */}
//                 <div className="flex-1 flex flex-col gap-4 overflow-hidden">
//                     {/* Top Controls & Editor */}
//                     <div className="p-4 rounded-xl backdrop-blur-md border border-white/60 shadow-lg shrink-0"
//                         style={{ background: 'rgba(255,255,255,0.7)' }}>
//                         <div className="flex items-center gap-3 mb-3">
//                             <label className="text-xs font-medium text-slate-600">DB Server:</label>
//                             <select value={server} onChange={(e) => setServer(e.target.value)} className="w-56 px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner">
//                                 <option value="">Select Server</option>
//                                 <option value="postgres">postgres (192.168.0.100)</option>
//                             </select>
//                             <CustomActionsDropdown onExportCSV={exportCSV} onExportExcel={exportExcel} onSave={saveQuery} />
//                         </div>

//                         {/* Drop Zone / SQL Editor area */}
//                         <div
//                             onDrop={handleDrop}
//                             onDragOver={handleDragOver}
//                             className="relative border-2 border-dashed border-slate-200 rounded-lg bg-white shadow-inner p-1 group"
//                         >
//                             <textarea
//                                 value={activeQuery}
//                                 onChange={(e) => setActiveQuery(e.target.value)}
//                                 placeholder="Drag a saved query here or start writing..."
//                                 className="w-full h-40 px-3 py-2 font-mono text-xs border-0 focus:ring-0 focus:outline-none placeholder:text-slate-300 placeholder:italic"
//                             />
//                             {/* Drag & Drop prompt overlay */}
//                             {!activeQuery && (
//                                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-slate-50/50 transition-colors">
//                                     <p className="text-sm font-medium text-slate-400">Drag Saved Query Here</p>
//                                 </div>
//                             )}
//                         </div>

//                         {/* Workbench Main Actions */}
//                         <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-slate-100">
//                             <button onClick={clearWorkbenchcopy} className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">Clear</button>
//                             <button onClick={executeQuery} style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }} className="px-6 py-2 text-sm font-semibold rounded text-white shadow-sm hover:opacity-90 transition-opacity">Execute Query (Table View)</button>
//                         </div>
//                     </div>

//                     {/* Bottom: Results Table (Rendered only on execution) */}
//                     {results.length > 0 && (
//                         <div className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0"
//                             style={{ background: 'rgba(255,255,255,0.6)' }}>
//                             <table className="min-w-full text-left text-sm">
//                                 <thead className="sticky top-0" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
//                                     <tr>
//                                         {mockColumns.map(col => (
//                                             <th key={col} className="px-4 py-3 text-xs font-semibold text-blue-100 uppercase tracking-widest">{col}</th>
//                                         ))}
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {results.map((row, idx) => (
//                                         <tr key={idx} className="border-b border-white/40 transition-colors text-slate-700"
//                                             style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }}
//                                             onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
//                                             onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
//                                         >
//                                             {mockColumns.map(col => <td key={col} className="px-4 py-3">{row[col]}</td>)}
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default QueryWorkbench;

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// --- MOCK DATA (You would replace this with Redux selectors) ---
const mockSavedQueries = [
    { id: 1, dbname: 'postgres', dbserver: '192.168.0.100', query: 'SELECT * FROM web_users;' },
    { id: 2, dbname: 'postgres', dbserver: '192.168.0.100', query: 'SELECT * FROM order_history WHERE date > \'2023-01-01\';' },
];

const mockResultData = [
    { id: 1, username: 'testing_testing', email: 'user@test.com', status: 'active' },
    { id: 2, username: 'AD1 Test', email: 'ad1@test.com', status: 'pending' },
];

const mockColumns = ['id', 'username', 'email', 'status'];
// -----------------------------------------------------------------

// --- REUSABLE DROPDOWN COMPONENT ---
// This handles the "Export As" and "Save Query" functionality
const CustomActionsDropdown = ({ onExportCSV, onExportExcel, onSave }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                style={{ background: '#EC7D09' }} // Matching orange theme
            >
                Actions ▾
            </button>
            {open && (
                <div className="absolute right-0 top-11 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-1 min-w-[160px]">
                    <button onClick={() => { onSave(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">Save Query</button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <p className="px-3 py-1 text-xs text-slate-400 font-medium tracking-wide uppercase">Export As</p>
                    <button onClick={() => { onExportCSV(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">CSV</button>
                    <button onClick={() => { onExportExcel(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">Excel</button>
                </div>
            )}
        </div>
    );
};
// -----------------------------------

const QueryWorkbenchcopy = () => {
    const [activeQuery, setActiveQuery] = useState('');
    const [results, setResults] = useState([]);
    const [server, setServer] = useState('');

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e, query) => {
        e.dataTransfer.setData('sql_query', query);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedQuery = e.dataTransfer.getData('sql_query');
        setActiveQuery(droppedQuery);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // --- MAIN ACTION HANDLERS ---
    const executeQuery = () => {
        if (!activeQuery.trim()) {
            console.warn("Cannot execute an empty query.");
            return;
        }
        // Mock API call to fetch results
        console.log(`Executing on ${server}: ${activeQuery}`);
        setResults(mockResultData); // Populate the table
    };

    const clearWorkbenchcopy = () => {
        setActiveQuery('');
        setResults([]);
    };

    const saveQuery = () => { console.log('Saving:', activeQuery); };
    const exportCSV = () => { console.log('Exporting CSV'); };
    const exportExcel = () => { console.log('Exporting Excel'); };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
            style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">Query Workbench</h1>
            </div>

            {/* Main Workbench Layout (Unified Two-Panel Structure) */}
            <div className="flex-1 flex gap-5 overflow-hidden">

                {/* Left Panel: Saved Query Library */}
                <div className="w-80 flex flex-col gap-3 rounded-xl backdrop-blur-md border border-white/60 shadow-lg p-4 shrink-0"
                    style={{ background: 'rgba(255,255,255,0.5)' }}>
                    <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-1">Saved Queries</h2>
                    <input type="text" placeholder="Search queries..." className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner"/>

                    {/* Query List - Replaced the Table structure with draggable Cards */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {mockSavedQueries.map((q) => (
                            <div
                                key={q.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, q.query)}
                                className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm cursor-grab hover:border-blue-200 transition-colors"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs font-semibold text-slate-700">{q.dbname}</p>
                                    <p className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1 rounded">{q.dbserver}</p>
                                </div>
                                <p className="text-xs font-mono text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded" title={q.query}>
                                    {q.query}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: The Composer (SQL Editor & Results) */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {/* Top Controls & Editor */}
                    <div className="p-4 rounded-xl backdrop-blur-md border border-white/60 shadow-lg shrink-0"
                        style={{ background: 'rgba(255,255,255,0.7)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <label className="text-xs font-medium text-slate-600">DB Server:</label>
                            <select value={server} onChange={(e) => setServer(e.target.value)} className="w-56 px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner">
                                <option value="">Select Server</option>
                                <option value="postgres">postgres (192.168.0.100)</option>
                            </select>
                            <CustomActionsDropdown onExportCSV={exportCSV} onExportExcel={exportExcel} onSave={saveQuery} />
                        </div>

                        {/* Drop Zone / SQL Editor area */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="relative border-2 border-dashed border-slate-200 rounded-lg bg-white shadow-inner p-1 group"
                        >
                            <textarea
                                value={activeQuery}
                                onChange={(e) => setActiveQuery(e.target.value)}
                                placeholder="Drag a saved query here or start writing..."
                                className="w-full h-40 px-3 py-2 font-mono text-xs border-0 focus:ring-0 focus:outline-none placeholder:text-slate-300 placeholder:italic"
                            />
                            {/* Drag & Drop prompt overlay */}
                            {!activeQuery && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-slate-50/50 transition-colors">
                                    <p className="text-sm font-medium text-slate-400">Drag Saved Query Here</p>
                                </div>
                            )}
                        </div>

                        {/* Workbench Main Actions */}
                        <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-slate-100">
                            <button onClick={clearWorkbenchcopy} className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">Clear</button>
                            <button onClick={executeQuery} style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }} className="px-6 py-2 text-sm font-semibold rounded text-white shadow-sm hover:opacity-90 transition-opacity">Execute Query (Table View)</button>
                        </div>
                    </div>

                    {/* Bottom: Results Table (Rendered only on execution) */}
                    {results.length > 0 && (
                        <div className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0"
                            style={{ background: 'rgba(255,255,255,0.6)' }}>
                            <table className="min-w-full text-left text-sm">
                                <thead className="sticky top-0" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                                    <tr>
                                        {mockColumns.map(col => (
                                            <th key={col} className="px-4 py-3 text-xs font-semibold text-blue-100 uppercase tracking-widest">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((row, idx) => (
                                        <tr key={idx} className="border-b border-white/40 transition-colors text-slate-700"
                                            style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
                                        >
                                            {mockColumns.map(col => <td key={col} className="px-4 py-3">{row[col]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QueryWorkbenchcopy;