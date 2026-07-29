import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import CommonActions from '../../store/actions/common-actions';
import { Urls } from '../../utils/url';
import { RUN_QUERY } from '../../store/reducers/customQuery-reducer';
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import Button from '../../components/Button';

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
            <Button
                onClick={() => setOpen(!open)}
                disabled={disabled}
                variant="primary"
                className="flex items-center gap-2"
            >
                Save Query
            </Button>
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
                        <Button
                            onClick={handleSave}
                            disabled={!queryName.trim()}
                            variant="primary"
                            className="flex-1 px-3 py-1.5 text-xs font-semibold"
                        >
                            Save
                        </Button>
                        <Button
                            onClick={() => { setOpen(false); setQueryName(''); setVisibleTo('self'); }}
                            variant="secondary"
                            className="px-3 py-1.5 text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Export Dropdown ───────────────────────────────────────────────────────────
const ExportDropdown = ({ onExportCSV, onExportExcel, disabled, highlight }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative inline-block text-left">
            {highlight && (
                <style>{`
                    @keyframes exportPop {
                        0%   { transform: scale(1); }
                        30%  { transform: scale(1.18); }
                        60%  { transform: scale(0.95); }
                        100% { transform: scale(1); }
                    }
                    .export-pop {
                        animation: exportPop 0.9s ease-in-out 3;
                    }
                `}</style>
            )}
            <button
                onClick={() => setOpen(!open)}
                disabled={disabled}
                className={`export-pop flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm border transition-colors disabled:opacity-50 ${
                    highlight
                        ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
            >
                ⬇ Export As ▾
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

// ─── PostgreSQL identifier quoting ────────────────────────────────────────────
// PostgreSQL folds unquoted identifiers to lowercase. Any table/column name
// that was created with mixed/upper case must be double-quoted to match exactly.
// This function walks the SQL, skips string literals and already-quoted
// identifiers, and wraps any mixed-case word that isn't a SQL keyword.
const PG_KEYWORDS = new Set([
    'SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','JOIN','LEFT',
    'RIGHT','INNER','OUTER','FULL','CROSS','ON','GROUP','BY','ORDER','HAVING',
    'LIMIT','OFFSET','DISTINCT','AS','CASE','WHEN','THEN','ELSE','END',
    'INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','DROP',
    'ALTER','INDEX','VIEW','WITH','UNION','ALL','EXISTS','BETWEEN','LIKE',
    'ILIKE','ASC','DESC','NULLS','FIRST','LAST','TRUE','FALSE','COUNT','SUM',
    'AVG','MIN','MAX','COALESCE','CAST','PRIMARY','KEY','FOREIGN','REFERENCES',
    'UNIQUE','DEFAULT','RETURNING','BEGIN','COMMIT','ROLLBACK','TRANSACTION',
    'OVER','PARTITION','WINDOW','FILTER','LATERAL','NATURAL','USING',
    'TABLESAMPLE','RECURSIVE','EXCEPT','INTERSECT','DO','TRIGGER','FUNCTION',
    'PROCEDURE','LANGUAGE','INTEGER','VARCHAR','TEXT','BOOLEAN','FLOAT',
    'DOUBLE','NUMERIC','DATE','TIME','TIMESTAMP','INTERVAL','ARRAY','JSON',
    'JSONB','SERIAL','BIGSERIAL','SMALLINT','BIGINT','REAL','CHAR','EXTRACT',
    'NOW','NULLIF','GREATEST','LEAST','ROW','ROWS','FOLLOWING','PRECEDING',
    'UNBOUNDED','CURRENT','TIES','ONLY','RANGE','IF','RETURN',
]);

const quotePostgresIdentifiers = (sql) => {
    // Split into preserved segments (single-quoted strings, already double-quoted
    // identifiers) and plain SQL. Odd-index parts are preserved as-is.
    const parts = sql.split(/(\'(?:[^\'\\]|\\.)*\'|"[^"]*")/);
    return parts.map((part, i) => {
        if (i % 2 === 1) return part;
        return part.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(\s*\()?/g, (match, name, followedByParen) => {
            if (followedByParen) return match; // function call — never quote
            if (PG_KEYWORDS.has(name.toUpperCase())) return match;
            if (/[A-Z]/.test(name)) return `"${name}"`;
            return match;
        });
    }).join('');
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
    const [showExportHint, setShowExportHint] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);

    // ── DateTime params (@starttime / @endtime) ──
    const [startTime,     setStartTime]     = useState('');
    const [endTime,       setEndTime]       = useState('');
    const [timePrecision, setTimePrecision] = useState('minute'); // 'date' | 'hour' | 'minute' | 'second'

    // Normalize time to match the selected precision level
    const normalizeTimeForPrecision = (timeStr, precision) => {
        if (!timeStr) return '';
        // For date precision: input is "YYYY-MM-DD", output is "YYYY-MM-DD"
        if (precision === 'date') {
            return timeStr.slice(0, 10); // just the date part
        }
        // For time precisions: input is "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS"
        const date = timeStr.slice(0, 10);
        const hh = timeStr.slice(11, 13);
        const mm = timeStr.slice(14, 16);
        const ss = timeStr.slice(17, 19) || '00';

        if (precision === 'hour')   return `${date}T${hh}:00`;
        if (precision === 'second') return `${date}T${hh}:${mm}:${ss}`;
        return `${date}T${hh}:${mm}`; // minute
    };

    // When precision changes, re-normalize existing times
    const handlePrecisionChange = (newPrecision) => {
        setTimePrecision(newPrecision);
        if (startTime) setStartTime(normalizeTimeForPrecision(startTime, newPrecision));
        if (endTime) setEndTime(normalizeTimeForPrecision(endTime, newPrecision));
    };

    // Returns current local datetime in the format inputs expect
    const nowForInput = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        // For date input: YYYY-MM-DD, for datetime-local: YYYY-MM-DDTHH:MM
        return timePrecision === 'date'
            ? d.toISOString().slice(0, 10)
            : d.toISOString().slice(0, 16);
    };

    // step attribute for datetime-local input based on chosen precision
    const dtStep = timePrecision === 'hour' ? 3600 : timePrecision === 'second' ? 1 : 60;

    const dtError = startTime && endTime && startTime > endTime
        ? 'Start time must be before or equal to end time'
        : null;

    // ── Resizable splits ──
    const [editorHeight, setEditorHeight] = useState(260);
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const dragRef = useRef({ dragging: false, startY: 0, startH: 0 });
    const hDragRef = useRef({ dragging: false, startX: 0, startW: 0 });

    const getClientY = (e) => e.touches ? e.touches[0].clientY : e.clientY;
    const getClientX = (e) => e.touches ? e.touches[0].clientX : e.clientX;

    const onDividerMouseDown = (e) => {
        e.preventDefault();
        dragRef.current = { dragging: true, startY: getClientY(e), startH: editorHeight };
        const onMove = (ev) => {
            if (!dragRef.current.dragging) return;
            const delta = getClientY(ev) - dragRef.current.startY;
            const next = Math.max(140, Math.min(dragRef.current.startH + delta, window.innerHeight * 0.75));
            setEditorHeight(next);
        };
        const onUp = () => {
            dragRef.current.dragging = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    };

    const onSidebarDividerMouseDown = (e) => {
        e.preventDefault();
        hDragRef.current = { dragging: true, startX: getClientX(e), startW: sidebarWidth };
        const onMove = (ev) => {
            if (!hDragRef.current.dragging) return;
            const delta = getClientX(ev) - hDragRef.current.startX;
            const next = Math.max(180, Math.min(hDragRef.current.startW + delta, window.innerWidth * 0.45));
            setSidebarWidth(next);
        };
        const onUp = () => {
            hDragRef.current.dragging = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    };

    // Mobile sidebar toggle
    const [showSidebar, setShowSidebar] = useState(false);

    // Visual Builder state — lifted here so it survives mode switches
    const [builderServer, setBuilderServer] = useState('');
    const [builderSchema, setBuilderSchema] = useState('');
    const [selectedTable, setSelectedTable] = useState(null);
    const [builderConditions, setBuilderConditions] = useState([{ col: '', op: '=', val: '' }]);

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

    // ── Auto-select DB server ──
    // Once the list loads, pick: (1) last-used from localStorage, (2) first in list
    // Only runs when server is still empty (don't override a server set by a saved-query click)
    useEffect(() => {
        if (databaseList.length === 0 || server) return;
        const saved = localStorage.getItem('qw_last_server');
        const valid = saved && databaseList.some(db => String(db.value) === saved);
        setServer(valid ? saved : String(databaseList[0].value));
    }, [databaseList]);

    // Persist the chosen server so it survives page reloads
    useEffect(() => {
        if (server) localStorage.setItem('qw_last_server', server);
    }, [server]);

    // action only calls cb() for "File" responses, not "Data" — so watch runQuery to reset loading
    // only reset loading when actual data/error arrives, not on the empty {} reset dispatch
    useEffect(() => {
        if (isLoading && runQuery?.type) setIsLoading(false);
    }, [runQuery]);

    const hasError = runQuery?.type === 'Error';
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
    // Replace @starttime / @endtime placeholders with the picked datetime values.
    // Format: PostgreSQL-compatible timestamp string, e.g. '2024-01-15 14:30:00'
    // Normalise datetime-local value to a PostgreSQL timestamp string.
    // Precision controls how much of the time component is included.
    // Format for both display and SQL — format depends on precision
    const fmtPgTs = (dtLocal) => {
        if (timePrecision === 'date') {
            // Date input format: "YYYY-MM-DD"
            return dtLocal;
        }
        // DateTime input format: "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS"
        const hh = dtLocal.slice(11, 13);
        const mm = dtLocal.slice(14, 16);
        const ss = dtLocal.length >= 19 ? dtLocal.slice(17, 19) : '00';
        const date = dtLocal.slice(0, 10);
        return `${date} ${hh}:${mm}:${ss}`;
    };

    const applyDatetimeParams = (sql) => {
        let result = sql;
        // Replace @starttime and @endtime with formatted values (same param names, different formats)
        if (startTime) result = result.replace(/@starttime/gi, `'${fmtPgTs(startTime)}'`);
        if (endTime)   result = result.replace(/@endtime/gi,   `'${fmtPgTs(endTime)}'`);
        return result;
    };

    // Helper to safely append LIMIT to SQL query (removes existing LIMIT if present)
    const appendLimit = (query, limit) => {
        if (!query || !limit) return query;
        // Remove any existing LIMIT clause (case-insensitive, including semicolons and line breaks)
        let noLimit = query.replace(/\bLIMIT\s+\d+\s*(?:OFFSET\s+\d+)?\s*;?\s*$/im, '').trim();
        const hasSemicolon = noLimit.endsWith(';');
        if (hasSemicolon) noLimit = noLimit.slice(0, -1).trim();
        return `${noLimit} LIMIT ${limit}${hasSemicolon ? ';' : ''}`;
    };

    
    const getFormData = (limit) => {
        const finalQuery = appendLimit(
            quotePostgresIdentifiers(applyDatetimeParams(activeQuery)),
            limit
        );
        console.log('📊 Query being sent to backend:', { dbServer: server, queries: finalQuery, limit });
        return { dbServer: server, queries: finalQuery };
    };

    const executeQuery = () => {
        if (!activeQuery.trim() || !server) return;
        setIsLoading(true);
        setShowExportHint(false);
        // Request 1001 rows so we can detect when there are more than 1000 (show the clipping warning)
        dispatch(CustomQueryActions.postRunQuery(true, getFormData(1001), () => { setIsLoading(false); setShowExportHint(true); }, Urls.querybuilder_runQuery));
    };

    const exportCSV = () => {
        if (!activeQuery.trim() || !server) return;
        dispatch(CustomQueryActions.postRunQuery(false, getFormData(500000), () => {}, Urls.querybuilder_downloadQuery + '/csv'));
    };

    const exportExcel = () => {
        if (!activeQuery.trim() || !server) return;
        dispatch(CustomQueryActions.postRunQuery(false, getFormData(500000), () => {}, Urls.querybuilder_downloadQuery + '/excel'));
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

    const TABLE_ROW_LIMIT = 1000;

    const hasResults = runQuery?.type === 'Data';
    const columns = runQuery?.columns || [];
    const allRows = runQuery?.data || [];
    const rows = allRows.slice(0, TABLE_ROW_LIMIT);
    const rowsClipped = allRows.length > TABLE_ROW_LIMIT;
    const canExecute = activeQuery.trim() && server;

    return (
        <>
        <div
            className="flex flex-col p-5 gap-4 overflow-hidden"
            style={{ height: 'calc(100vh - 4rem)', background: '#ffffff' }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {/* Mobile sidebar toggle */}
                    <button
                        className="sm:hidden p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm shrink-0"
                        onClick={() => setShowSidebar(s => !s)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                        style={{ background: '#0b1830' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">Query Workbench</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Write and execute custom SQL queries</p>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="flex rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
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
            <div className="flex-1 flex overflow-hidden">

                {/* Mobile overlay backdrop */}
                {showSidebar && (
                    <div className="sm:hidden fixed inset-0 bg-black/30 z-10" onClick={() => setShowSidebar(false)} />
                )}

                {/* ── Left: Saved Query Library ── */}
                <div
                    className={`flex-col gap-3 rounded-xl backdrop-blur-md border border-white/60 shadow-lg p-3 shrink-0
                        ${showSidebar
                            ? 'flex fixed left-2 top-16 w-[min(288px,90vw)] max-h-[70vh] z-20 overflow-y-auto sm:relative sm:inset-auto sm:w-auto sm:max-h-none sm:overflow-visible sm:flex'
                            : 'hidden sm:flex'
                        }`}
                    style={{ ...(typeof window !== 'undefined' && window.innerWidth >= 640 ? { width: sidebarWidth } : {}), background: 'rgba(255,255,255,0.97)' }}
                >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-1">
                        <h2 className="text-sm font-semibold text-slate-800">Saved Queries</h2>
                        <button
                            className="sm:hidden p-1 rounded hover:bg-slate-100 text-slate-500"
                            onClick={() => setShowSidebar(false)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
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

                {/* ── Horizontal Resize Handle (desktop only) ── */}
                <div
                    onMouseDown={onSidebarDividerMouseDown}
                    onTouchStart={onSidebarDividerMouseDown}
                    className="hidden sm:flex items-center justify-center w-3 cursor-col-resize group shrink-0 select-none touch-none"
                    title="Drag to resize"
                >
                    <div className="w-1 h-16 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors" />
                </div>

                {/* ── Right: Composer ── */}
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">

                    {/* Editor / Builder Panel */}
                    <div
                        className="flex flex-col p-4 rounded-xl backdrop-blur-md border border-white/60 shadow-lg overflow-hidden"
                        style={{ height: editorHeight, background: 'rgba(255,255,255,0.7)' }}
                    >
                        {mode === 'sql' ? (
                            <>
                                {/* Controls row */}
                                <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-3 flex-wrap shrink-0">
                                    <label className="text-xs font-semibold text-slate-700 shrink-0">
                                        DB Server <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={server}
                                        onChange={(e) => setServer(String(e.target.value))}
                                        className="w-full sm:w-56 px-3 py-1.5 text-xs rounded outline-none border border-slate-200 bg-white focus:border-blue-400 transition-colors"
                                    >
                                        {databaseList.length === 0 && (
                                            <option value="">— No DB configured —</option>
                                        )}
                                        {databaseList.map((db) => (
                                            <option key={db.value} value={String(db.value)}>{db.label}</option>
                                        ))}
                                    </select>
                                    <SaveQueryPopover onSave={(name, visibleTo) => saveQuery(name, undefined, undefined, visibleTo)} disabled={!canExecute} />
                                    <ExportDropdown onExportCSV={exportCSV} onExportExcel={exportExcel} disabled={!canExecute} highlight={rowsClipped} />
                                </div>

                                {/* DateTime params row — only shown when query has content */}
                                {activeQuery.trim() && (
                                    <div className="flex flex-wrap items-center gap-3 mb-2 px-1 shrink-0">
                                        {/* Precision toggle */}
                                        <div className="flex items-center overflow-hidden rounded border border-slate-200 shrink-0">
                                            {[
                                                { key: 'date',   label: 'DATE' },
                                                { key: 'hour',   label: 'HH' },
                                                { key: 'minute', label: 'HH:MM' },
                                                { key: 'second', label: 'HH:MM:SS' },
                                            ].map(p => (
                                                <button
                                                    key={p.key}
                                                    onClick={() => handlePrecisionChange(p.key)}
                                                    className="px-2 py-1 text-[10px] font-mono transition-colors"
                                                    style={{
                                                        background: timePrecision === p.key ? '#2563eb' : 'white',
                                                        color:      timePrecision === p.key ? 'white'   : '#64748b',
                                                    }}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Start time */}
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] font-semibold text-slate-500 shrink-0">@starttime</label>
                                            <input
                                                type={timePrecision === 'date' ? 'date' : 'datetime-local'}
                                                step={timePrecision === 'date' ? undefined : dtStep}
                                                value={startTime}
                                                max={endTime || nowForInput()}
                                                onChange={e => setStartTime(e.target.value)}
                                                className="px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400"
                                            />
                                        </div>
                                        {/* End time */}
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] font-semibold text-slate-500 shrink-0">@endtime</label>
                                            <input
                                                type={timePrecision === 'date' ? 'date' : 'datetime-local'}
                                                step={timePrecision === 'date' ? undefined : dtStep}
                                                value={endTime}
                                                min={startTime || undefined}
                                                max={nowForInput()}
                                                onChange={e => setEndTime(e.target.value)}
                                                className="px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400"
                                            />
                                        </div>
                                        {/* Clear both */}
                                        {(startTime || endTime) && (
                                            <button
                                                onClick={() => { setStartTime(''); setEndTime(''); }}
                                                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                ✕ clear
                                            </button>
                                        )}
                                        {dtError && (
                                            <p className="text-[10px] text-red-500 font-medium">{dtError}</p>
                                        )}
                                        {!dtError && (startTime || endTime) && (
                                            <p className="text-[10px] text-slate-400 font-mono">
                                                {startTime && <span>→ <span className="text-green-700">'{fmtPgTs(startTime)}'</span></span>}
                                                {startTime && endTime && <span className="mx-1 text-slate-300">|</span>}
                                                {endTime   && <span>→ <span className="text-green-700">'{fmtPgTs(endTime)}'</span></span>}
                                            </p>
                                        )}
                                        {!startTime && !endTime && (
                                            <p className="text-[10px] text-slate-400 italic">
                                                Type <span className="font-mono font-semibold text-slate-500">@starttime</span> or <span className="font-mono font-semibold text-slate-500">@endtime</span> in your query. Format depends on the selected precision (DATE, HH, HH:MM, or HH:MM:SS)
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Drop Zone / SQL Editor */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    className="relative flex-1 min-h-0 border-2 rounded-lg bg-white shadow-inner p-1 group transition-colors"
                                    style={{ borderColor: isDragOver ? '#EC7D09' : '#e2e8f0', borderStyle: 'dashed' }}
                                >
                                    <textarea
                                        value={activeQuery}
                                        onChange={(e) => setActiveQuery(e.target.value)}
                                        placeholder="Drag a saved query here or start writing..."
                                        className="w-full h-full px-3 py-2 font-mono text-xs border-0 focus:ring-0 focus:outline-none placeholder:text-slate-300 placeholder:italic resize-none bg-white text-slate-800"
                                    />
                                    {!activeQuery && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-slate-50/50 transition-colors">
                                            <p className="text-sm font-medium text-slate-400">Drag Saved Query Here</p>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom action buttons */}
                                <div className="flex justify-end items-center gap-3 mt-2 pt-1 border-t border-slate-100 shrink-0">
                                    <Button
                                        onClick={clearWorkbench}
                                        variant="secondary"
                                        className="px-5 py-2 text-sm font-semibold"
                                    >
                                        Clear
                                    </Button>
                                    <Button
                                        onClick={executeQuery}
                                        disabled={!canExecute || isLoading}
                                        title={!activeQuery.trim() ? 'Enter a query first' : ''}
                                        variant="primary"
                                        className="flex items-center gap-2 px-6 py-2 text-sm font-semibold"
                                    >
                                        {isLoading && (
                                            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                        )}
                                        {isLoading ? 'Running…' : 'Execute Query (Table View)'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            /* ── Visual Builder ── */
                            <VisualBuilder
                                builderServer={builderServer}
                                setBuilderServer={setBuilderServer}
                                builderSchema={builderSchema}
                                setBuilderSchema={setBuilderSchema}
                                selectedTable={selectedTable}
                                setSelectedTable={setSelectedTable}
                                conditions={builderConditions}
                                setConditions={setBuilderConditions}
                                isLoading={isLoading}
                                onGenerateQuery={(q, srv) => {
                                    setActiveQuery(q);
                                    if (srv) setServer(String(srv));
                                    setMode('sql');
                                }}
                                onGenerateAndRun={(q, srv) => {
                                    setActiveQuery(q);
                                    const effectiveServer = srv || server;
                                    if (effectiveServer) setServer(String(effectiveServer));
                                    if (effectiveServer && q.trim()) {
                                        setIsLoading(true);
                                        const queryWithLimit = appendLimit(quotePostgresIdentifiers(q), 1000);
                                        console.log('📊 Visual Builder query being sent to backend:', { dbServer: effectiveServer, queries: queryWithLimit, limit: 1000 });
                                        dispatch(CustomQueryActions.postRunQuery(true, { dbServer: effectiveServer, queries: queryWithLimit }, () => {}, Urls.querybuilder_runQuery));
                                    }
                                }}
                                onSave={(name, srv, q, visibleTo) => saveQuery(name, srv, q, visibleTo)}
                            />
                        )}
                    </div>

                    {/* ── Resize Divider + Row Count ── */}
                    <div
                        onMouseDown={onDividerMouseDown}
                        onTouchStart={onDividerMouseDown}
                        className="flex items-center h-4 cursor-row-resize group shrink-0 select-none px-1 touch-none"
                        title="Drag to resize"
                    >
                        <div className="flex-1" />
                        <div className="w-16 h-1 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors" />
                        <div className="flex-1 flex justify-end">
                            {hasResults && (rowsClipped
                                ? <span className="text-[11px] text-amber-700 font-medium">Showing first 1,000 rows — use ⬇ Export As for full data</span>
                                : <span className="text-[11px] text-slate-500">{rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''} returned</span>
                            )}
                        </div>
                    </div>

                    {/* ── Results Panel (or empty placeholder to hold layout) ── */}
                    <div
                        className="flex-1 overflow-auto rounded-xl backdrop-blur-md border border-white/60 shadow-lg min-h-0"
                        style={{ background: 'rgba(255,255,255,0.6)' }}
                    >
                    {!hasResults && !showExportHint && (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm select-none">
                            Run a query to see results
                        </div>
                    )}
                    {!hasResults && showExportHint && (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 max-w-md shadow-sm">
                                <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800 mb-1">Too many rows for table view</p>
                                    <p className="text-xs text-amber-700 leading-relaxed">Your query returned more than 1,000 rows, so the results were downloaded automatically. Use the <span className="font-semibold">Export</span> button to download large result sets.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {hasResults && (
                        <>
                            {allRows.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm select-none">
                                    No data found — query returned 0 rows
                                </div>
                            ) : (
                                <Table headers={columns} className="min-w-full text-left text-sm">
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
                                                    <td key={col} className="px-4 py-1.5 text-xs whitespace-nowrap">{row[col] ?? '—'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}
                     </div>
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

const VisualBuilder = ({
    builderServer, setBuilderServer,
    builderSchema, setBuilderSchema,
    selectedTable, setSelectedTable,
    conditions, setConditions,
    isLoading,
    onGenerateQuery, onGenerateAndRun, onSave,
}) => {
    const databaseList = useSelector(s => s?.customQuery?.databaseList || []);
    const dboList      = useSelector(s => s?.customQuery?.dboList      || []);
    const tableList    = useSelector(s => s?.customQuery?.tableList    || {});
    const dispatch = useDispatch();

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
        // builderSchema holds the API identifier (may include server path/UUID).
        // Use the display label for the actual SQL schema name.
        const schemaName = dboList.find(d => d.value === builderSchema)?.label || '';
        const qualifiedTable = schemaName ? `${schemaName}.${selectedTable}` : selectedTable;
        const wheres = conditions.filter(c => c.col && c.op).map(c =>
            c.op === 'IS NULL' || c.op === 'IS NOT NULL' ? `${c.col} ${c.op}` : `${c.col} ${c.op} '${c.val}'`
        );
        return `SELECT ${cols}\nFROM ${qualifiedTable}${wheres.length ? '\nWHERE ' + wheres.join('\n  AND ') : ''};`;
    };

    return (
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Tables list */}
            <div className="w-48 shrink-0 flex flex-col gap-2">
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
                    {databaseList.map(db => <option key={db.value} value={String(db.value)}>{db.label}</option>)}
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

                <label className="text-xs font-medium text-slate-600 mt-1">Tables</label>
                <select
                    value={selectedTable || ''}
                    onChange={e => setSelectedTable(e.target.value || null)}
                    disabled={tables.length === 0}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white shadow-inner focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                    <option value="">
                        {!builderServer ? 'Select a server first' : !builderSchema ? 'Select a schema first' : tables.length === 0 ? 'No tables found' : 'Select Table'}
                    </option>
                    {tables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            </div>

            {/* Conditions + preview */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <p className="text-xs font-medium text-slate-600 shrink-0 pb-1 border-b border-slate-100">WHERE Conditions</p>
                {/* scrollable area */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-1 pt-2">

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
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-900 flex flex-col max-h-40 shrink-0">
                        <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 shrink-0 border-b border-slate-700">Preview</p>
                        <pre className="px-3 py-2 text-xs font-mono text-green-400 whitespace-pre-wrap overflow-auto">{buildQuery()}</pre>
                    </div>
                )}
                </div>{/* end scrollable area */}

                {/* pinned buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100 shrink-0">
                    <Button
                        onClick={() => onGenerateQuery(buildQuery(), builderServer)}
                        disabled={!selectedTable}
                        variant="secondary"
                        className="px-5 py-2 text-sm font-semibold"
                    >
                        Generate Query
                    </Button>
                    <Button
                        onClick={() => onGenerateAndRun(buildQuery(), builderServer)}
                        disabled={!selectedTable || isLoading}
                        variant="primary"
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold"
                    >
                        {isLoading && (
                            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        )}
                        {isLoading ? 'Running…' : 'Generate & Run'}
                    </Button>
                    <SaveQueryPopover
                        disabled={!selectedTable || !builderServer}
                        onSave={(name, visibleTo) => onSave(name, builderServer, buildQuery(), visibleTo)}
                    />
                </div>
            </div>{/* end conditions panel */}
        </div>
    );
};

export default QueryWorkbench;
