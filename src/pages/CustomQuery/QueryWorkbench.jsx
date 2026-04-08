import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import CommonActions from '../../store/actions/common-actions';
import { Urls } from '../../utils/url';
import { RUN_QUERY } from '../../store/reducers/customQuery-reducer';
import Modal from '../../components/Modal';

// ─── Save Query Popover (with query name input) ────────────────────────────────
const VISIBILITY_OPTIONS = [
    { value: 'self',  label: 'Self' },
    { value: 'admin', label: 'Admin' },
    { value: 'all',   label: 'All Users' },
];

const SaveQueryPopover = ({ onSave, disabled }) => {
    const [open, setOpen] = useState(false);
    const [queryName, setQueryName] = useState('');
    const [visibleTo, setVisibleTo] = useState('self');

    const handleSave = () => {
        if (!queryName.trim()) return;
        onSave(queryName.trim(), visibleTo);
        setQueryName('');
        setVisibleTo('self');
        setOpen(false);
    };

    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setOpen(!open)}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: '#EC7D09' }}
            >
                Save Query
            </button>
            {open && (
                <div className="absolute left-0 top-11 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[240px]">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Query Name</p>
                    <input
                        autoFocus
                        type="text"
                        value={queryName}
                        onChange={e => setQueryName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        placeholder="e.g. Monthly user report"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-300 mb-3"
                    />
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Visible To</p>
                    <div className="flex gap-2 mb-3">
                        {VISIBILITY_OPTIONS.map(opt => (
                            <label
                                key={opt.value}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                    visibleTo === opt.value
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="visibleTo"
                                    value={opt.value}
                                    checked={visibleTo === opt.value}
                                    onChange={() => setVisibleTo(opt.value)}
                                    className="hidden"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={!queryName.trim()}
                            className="flex-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
                        >
                            Save
                        </button>
                        <button
                            onClick={() => { setOpen(false); setQueryName(''); setVisibleTo('self'); }}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Export Dropdown ───────────────────────────────────────────────────────────
const ExportDropdown = ({ onExportCSV, onExportExcel, disabled }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setOpen(!open)}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg shadow-sm border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
                Export As ▾
            </button>
            {open && (
                <div className="absolute left-0 top-11 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-1 min-w-[130px]">
                    <button onClick={() => { onExportCSV(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">CSV</button>
                    <button onClick={() => { onExportExcel(); setOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md">Excel</button>
                </div>
            )}
        </div>
    );
};

// ─── Saved Query Card ──────────────────────────────────────────────────────────
const SavedQueryCard = ({ item, onDragStart, onClick, onEdit, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editQuery, setEditQuery] = useState('');

    const name     = item.name     || item.queryname  || item.queryName  || item.title;
    const dbServer = item.dbServer || item.dbserver;
    const dbName   = item.dbName   || item.dbname;
    const queryTxt = item.queries  || item.query;

    const displayName = name || (queryTxt?.split('\n')[0]?.substring(0, 48) + (queryTxt?.length > 48 ? '…' : ''));

    const openEdit = (e) => {
        e.stopPropagation();
        setEditName(name || '');
        setEditQuery(queryTxt || '');
        setEditing(true);
    };

    const handleSaveEdit = () => {
        if (!editName.trim() || !editQuery.trim()) return;
        onEdit(item.savequeryid, { queryname: editName.trim(), queries: editQuery.trim(), dbServer });
        setEditing(false);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(item.savequeryid);
    };

    if (editing) {
        return (
            <div className="p-3 bg-white border border-blue-200 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-slate-700 mb-2">Edit Query</p>
                <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Query name"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-300 mb-2"
                />
                <textarea
                    value={editQuery}
                    onChange={e => setEditQuery(e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 text-xs font-mono border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-300 mb-2 resize-none"
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || !editQuery.trim()}
                        className="flex-1 px-2 py-1.5 text-xs font-semibold text-white rounded disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        className="px-2 py-1.5 text-xs font-semibold text-slate-600 rounded border border-slate-200 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            onClick={() => onClick(item)}
            className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm cursor-grab hover:border-blue-200 transition-colors group"
        >
            <div className="flex justify-between items-start mb-1">
                <p className="text-xs font-semibold text-slate-700 line-clamp-1 flex-1 mr-2" title={displayName}>{displayName}</p>
                <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={openEdit}
                            title="Edit"
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                            onClick={handleDelete}
                            title="Delete"
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                    {dbServer && (
                        <p className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">{dbServer}</p>
                    )}
                </div>
            </div>
            <p className="text-xs font-mono text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded" title={queryTxt}>
                {queryTxt}
            </p>
            {dbName && (
                <p className="text-[10px] text-slate-400 mt-1.5">{dbName}</p>
            )}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const QueryWorkbench = () => {
    const dispatch = useDispatch();

    const [mode, setMode] = useState('sql');
    const [activeQuery, setActiveQuery] = useState('');
    const [server, setServer] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);

    // ── Redux selectors ──
    const databaseList = useSelector(s => s?.customQuery?.databaseList || []);
    const savedQueryList = useSelector(s => s?.customQuery?.savedQueryList || []);
    const runQuery = useSelector(s => s?.customQuery?.runQuery || {});

    const filteredQueries = savedQueryList.filter(q => {
        const term = searchQuery.toLowerCase();
        return (
            (q.queries  || q.query)?.toLowerCase().includes(term) ||
            (q.dbName   || q.dbname)?.toLowerCase().includes(term) ||
            (q.name     || q.queryname || q.queryName)?.toLowerCase().includes(term) ||
            (q.dbServer || q.dbserver)?.toLowerCase().includes(term)
        );
    });

    useEffect(() => {
        dispatch(RUN_QUERY({}));
        dispatch(CustomQueryActions.getDatabaseList());
        dispatch(CustomQueryActions.getSavedQuery(true));
    }, []);

    // action only calls cb() for "File" responses, not "Data" — so watch runQuery to reset loading
    useEffect(() => {
        if (isLoading) setIsLoading(false);
    }, [runQuery]);

    const hasError = runQuery?.type === 'Error' || (runQuery?.msg && runQuery?.type !== 'Data');
    useEffect(() => {
        if (hasError) setErrorModalOpen(true);
    }, [hasError]);

    // ── Drag & Drop ──
    const handleDragStart = (e, item) => {
        const serverId = item.dbServer || item.dbserver || '';
        const sql = item.queries || item.query || '';
        e.dataTransfer.setData('wq_item', JSON.stringify({ queries: sql, dbServer: serverId }));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        try {
            const data = JSON.parse(e.dataTransfer.getData('wq_item'));
            setActiveQuery(data.queries || '');
            if (data.dbServer) setServer(String(data.dbServer));
        } catch (_) {}
    };

    const handleCardClick = (item) => {
        setActiveQuery(item.queries || item.query || '');
        const serverId = item.dbServer || item.dbserver;
        if (serverId) setServer(String(serverId));
    };

    // ── Actions ──
    const getFormData = () => ({ dbServer: server, queries: activeQuery });

    const executeQuery = () => {
        if (!activeQuery.trim() || !server) return;
        setIsLoading(true);
        dispatch(CustomQueryActions.postRunQuery(true, getFormData(), () => {}, Urls.querybuilder_runQuery));
    };

    const exportCSV = () => {
        if (!activeQuery.trim() || !server) return;
        dispatch(CustomQueryActions.postRunQuery(true, getFormData(), () => {}, Urls.querybuilder_downloadQuery + '/csv'));
    };

    const exportExcel = () => {
        if (!activeQuery.trim() || !server) return;
        dispatch(CustomQueryActions.postRunQuery(true, getFormData(), () => {}, Urls.querybuilder_downloadQuery + '/excel'));
    };

    const saveQuery = (name, overrideServer, overrideQuery, visibleTo = 'self') => {
        const dbServer = overrideServer || server;
        const queries  = overrideQuery  || activeQuery;
        if (!queries.trim() || !dbServer) return;
        dispatch(CommonActions.postApiCaller(Urls.querybuilder_saveQuery, { dbServer, queries, queryname: name, visible_to: visibleTo }, () => {
            dispatch(CustomQueryActions.getSavedQuery(true));
        }));
    };

    const editQuery = (savequeryid, data) => {
        dispatch(CustomQueryActions.updateSavedQuery(savequeryid, data, () => {
            dispatch(CustomQueryActions.getSavedQuery(true));
        }));
    };

    const deleteQuery = (savequeryid) => {
        dispatch(CustomQueryActions.deleteSavedQuery(savequeryid, () => {
            dispatch(CustomQueryActions.getSavedQuery(true));
        }));
    };

    const clearWorkbench = () => {
        setActiveQuery('');
        dispatch(RUN_QUERY({}));
    };

    const hasResults = runQuery?.type === 'Data';
    const columns = runQuery?.columns || [];
    const rows = runQuery?.data || [];
    const canExecute = activeQuery.trim() && server;

    return (
        <>
        <div
            className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
            style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}
        >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 shrink-0">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">Query Workbench</h1>

                {/* Mode Switcher */}
                <div className="ml-4 flex rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                    {[{ key: 'sql', label: 'SQL Mode' }, { key: 'builder', label: 'Visual Builder' }].map(m => (
                        <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            className="px-4 py-1.5 text-xs font-semibold transition-all"
                            style={{
                                background: mode === m.key ? '#EC7D09' : 'white',
                                color: mode === m.key ? 'white' : '#64748b',
                            }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Two-Panel Layout ── */}
            <div className="flex-1 flex gap-5 overflow-hidden">

                {/* ── Left: Saved Query Library ── */}
                <div
                    className="w-80 flex flex-col gap-3 rounded-xl backdrop-blur-md border border-white/60 shadow-lg p-4 shrink-0"
                    style={{ background: 'rgba(255,255,255,0.5)' }}
                >
                    <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-1">Saved Queries</h2>
                    <input
                        type="text"
                        placeholder="Search queries..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner focus:outline-none"
                    />

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {filteredQueries.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8">
                                {savedQueryList.length === 0 ? 'No saved queries found.' : 'No matches.'}
                            </p>
                        ) : filteredQueries.map((q, i) => (
                            <SavedQueryCard key={q.savequeryid || i} item={q} onDragStart={handleDragStart} onClick={handleCardClick} onEdit={editQuery} onDelete={deleteQuery} />
                        ))}
                    </div>
                </div>

                {/* ── Right: Composer ── */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                    {/* Editor / Builder Panel */}
                    <div
                        className="p-4 rounded-xl backdrop-blur-md border border-white/60 shadow-lg shrink-0"
                        style={{ background: 'rgba(255,255,255,0.7)' }}
                    >
                        {mode === 'sql' ? (
                            <>
                                {/* Controls row */}
                                <div className="flex items-center gap-3 mb-3">
                                    <label className="text-xs font-medium text-slate-600 shrink-0">DB Server:</label>
                                    <select
                                        value={server}
                                        onChange={(e) => setServer(e.target.value)}
                                        className="w-56 px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner focus:outline-none"
                                    >
                                        <option value="">Select Server</option>
                                        {databaseList.map((db) => (
                                            <option key={db.value} value={db.value}>{db.label}</option>
                                        ))}
                                    </select>
                                    <SaveQueryPopover onSave={(name, visibleTo) => saveQuery(name, undefined, undefined, visibleTo)} disabled={!canExecute} />
                                    <ExportDropdown onExportCSV={exportCSV} onExportExcel={exportExcel} disabled={!canExecute} />
                                    {!server && activeQuery && (
                                        <p className="text-[10px] text-amber-600 font-medium">Select a server first.</p>
                                    )}
                                </div>

                                {/* Drop Zone / SQL Editor */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    className="relative border-2 rounded-lg bg-white shadow-inner p-1 group transition-colors"
                                    style={{ borderColor: isDragOver ? '#EC7D09' : '#e2e8f0', borderStyle: 'dashed' }}
                                >
                                    <textarea
                                        value={activeQuery}
                                        onChange={(e) => setActiveQuery(e.target.value)}
                                        placeholder="Drag a saved query here or start writing..."
                                        className="w-full h-40 px-3 py-2 font-mono text-xs border-0 focus:ring-0 focus:outline-none placeholder:text-slate-300 placeholder:italic resize-none"
                                    />
                                    {!activeQuery && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-slate-50/50 transition-colors">
                                            <p className="text-sm font-medium text-slate-400">Drag Saved Query Here</p>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom action buttons */}
                                <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={clearWorkbench}
                                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={executeQuery}
                                        disabled={!canExecute || isLoading}
                                        className="flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
                                    >
                                        {isLoading && (
                                            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                        )}
                                        {isLoading ? 'Running…' : 'Execute Query (Table View)'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* ── Visual Builder ── */
                            <VisualBuilder
                                onGenerateQuery={(q) => { setActiveQuery(q); setMode('sql'); }}
                                onGenerateAndRun={(q) => {
                                    setActiveQuery(q);
                                    setMode('sql');
                                    if (server) {
                                        dispatch(CustomQueryActions.postRunQuery(true, { dbServer: server, queries: q }, () => {}, Urls.querybuilder_runQuery));
                                    }
                                }}
                                onSave={(name, builderServer, q, visibleTo) => saveQuery(name, builderServer, q, visibleTo)}
                            />
                        )}
                    </div>

                    {/* ── Results Panel ── */}
                    {hasResults && (
                        <div
                            className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0"
                            style={{ background: 'rgba(255,255,255,0.6)' }}
                        >
                            <table className="min-w-full text-left text-sm">
                                <thead className="sticky top-0" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                                    <tr>
                                        {columns.map(col => (
                                            <th key={col} className="px-4 py-3 text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-white/40 transition-colors text-slate-700"
                                            style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
                                        >
                                            {columns.map(col => (
                                                <td key={col} className="px-4 py-3 text-xs whitespace-nowrap">{row[col] ?? '—'}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ── Query Error Modal ── */}
        <Modal size="form" showHeader={false} isOpen={errorModalOpen} setIsOpen={setErrorModalOpen}>
            <div className="p-5">
                <div
                    className="flex items-center justify-between px-4 py-3 rounded-lg mb-5 shadow-sm"
                    style={{ background: '#b91c1c' }}
                >
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <h2 className="text-white font-semibold text-lg">Query Error</h2>
                    </div>
                    <button type="button" onClick={() => setErrorModalOpen(false)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
                </div>

                <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="m15 9-6 6M9 9l6 6"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium whitespace-pre-wrap break-all text-left">{runQuery?.msg || 'Query failed.'}</p>
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        type="button"
                        onClick={() => setErrorModalOpen(false)}
                        className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm"
                        style={{ background: '#b91c1c' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </Modal>
        </>
    );
};

// ─── Visual Builder ────────────────────────────────────────────────────────────
const CONDITION_OPS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];

const VisualBuilder = ({ onGenerateQuery, onGenerateAndRun, onSave }) => {
    const databaseList = useSelector(s => s?.customQuery?.databaseList || []);
    const dboList      = useSelector(s => s?.customQuery?.dboList      || []);
    const tableList    = useSelector(s => s?.customQuery?.tableList    || {});
    const dispatch = useDispatch();

    const [builderServer, setBuilderServer] = useState('');
    const [builderSchema, setBuilderSchema] = useState('');
    const [selectedTable, setSelectedTable] = useState(null);
    const [conditions, setConditions] = useState([{ col: '', op: '=', val: '' }]);

    const tables = tableList?.d1 || [];
    const allCols = tableList?.d2 || [];
    const selectedTableCols = selectedTable
        ? (Array.isArray(allCols) ? allCols : []).filter(c => c.category === selectedTable).map(c => c.name)
        : [];

    const addCondition = () => setConditions(prev => [...prev, { col: '', op: '=', val: '' }]);
    const removeCondition = (i) => setConditions(prev => prev.filter((_, idx) => idx !== i));
    const updateCondition = (i, field, value) => setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

    const buildQuery = () => {
        if (!selectedTable) return '';
        const cols = selectedTableCols.length ? selectedTableCols.join(', ') : '*';
        const wheres = conditions.filter(c => c.col && c.op).map(c =>
            c.op === 'IS NULL' || c.op === 'IS NOT NULL' ? `${c.col} ${c.op}` : `${c.col} ${c.op} '${c.val}'`
        );
        return `SELECT ${cols}\nFROM ${selectedTable}${wheres.length ? '\nWHERE ' + wheres.join('\n  AND ') : ''};`;
    };

    return (
        <div className="flex gap-4" style={{ minHeight: 300, maxHeight: 380 }}>
            {/* Tables list */}
            <div className="w-52 shrink-0 flex flex-col gap-2 overflow-y-auto">
                <label className="text-xs font-medium text-slate-600">Server</label>
                <select
                    value={builderServer}
                    onChange={e => {
                        setBuilderServer(e.target.value);
                        setBuilderSchema('');
                        setSelectedTable(null);
                        if (e.target.value) dispatch(CustomQueryActions.getdboList(true, e.target.value, () => {}));
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner focus:outline-none"
                >
                    <option value="">Select Server</option>
                    {databaseList.map(db => <option key={db.value} value={db.value}>{db.label}</option>)}
                </select>

                {dboList.length > 0 && (
                    <>
                        <label className="text-xs font-medium text-slate-600 mt-1">Schema</label>
                        <select
                            value={builderSchema}
                            onChange={e => {
                                setBuilderSchema(e.target.value);
                                setSelectedTable(null);
                                if (e.target.value) dispatch(CustomQueryActions.getTablesList(true, e.target.value, () => {}));
                            }}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner focus:outline-none"
                        >
                            <option value="">Select Schema</option>
                            {dboList.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </>
                )}

                <p className="text-xs font-medium text-slate-600 mt-1">Tables</p>
                {tables.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                        {!builderServer ? 'Select a server.' : !builderSchema ? 'Select a schema.' : 'No tables found.'}
                    </p>
                ) : tables.map(t => (
                    <button
                        key={t.name}
                        onClick={() => setSelectedTable(t.name)}
                        className="text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-all"
                        style={{
                            background: selectedTable === t.name ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' : 'white',
                            borderColor: selectedTable === t.name ? 'transparent' : '#e2e8f0',
                            color: selectedTable === t.name ? 'white' : '#374151',
                        }}
                    >
                        {t.name}
                    </button>
                ))}
            </div>

            {/* Conditions + preview */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                <p className="text-xs font-medium text-slate-600">WHERE Conditions</p>

                {conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <span className="text-[9px] font-bold text-slate-400 w-6 shrink-0">{i === 0 ? 'IF' : 'AND'}</span>
                        <select value={cond.col} onChange={e => updateCondition(i, 'col', e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                            <option value="">Column</option>
                            {selectedTableCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={cond.op} onChange={e => updateCondition(i, 'op', e.target.value)} className="w-28 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white">
                            {CONDITION_OPS.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                        <input
                            value={cond.val}
                            onChange={e => updateCondition(i, 'val', e.target.value)}
                            placeholder="Value"
                            disabled={cond.op === 'IS NULL' || cond.op === 'IS NOT NULL'}
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        {conditions.length > 1 && (
                            <button onClick={() => removeCondition(i)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        )}
                    </div>
                ))}

                <button onClick={addCondition} className="self-start text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded border border-dashed border-slate-300 hover:border-slate-400 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add Condition
                </button>

                {selectedTable && (
                    <div className="mt-1 rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                        <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Preview</p>
                        <pre className="px-3 pb-2 text-xs font-mono text-green-400 whitespace-pre-wrap">{buildQuery()}</pre>
                    </div>
                )}

                <div className="flex gap-3 pt-3 border-t border-slate-100 mt-auto">
                    <button
                        onClick={() => onGenerateQuery(buildQuery())}
                        disabled={!selectedTable}
                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
                    >
                        Generate Query
                    </button>
                    <button
                        onClick={() => onGenerateAndRun(buildQuery())}
                        disabled={!selectedTable}
                        className="px-5 py-2 text-sm font-semibold rounded text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                        style={{ background: '#EC7D09' }}
                    >
                        Generate &amp; Run
                    </button>
                    <SaveQueryPopover
                        disabled={!selectedTable || !builderServer}
                        onSave={(name, visibleTo) => onSave(name, builderServer, buildQuery(), visibleTo)}
                    />
                </div>
            </div>
        </div>
    );
};

export default QueryWorkbench;
