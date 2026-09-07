import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../store/actions/customQuery-actions';
import Button from './Button';

// Extracted from the Query Workbench's Visual Builder (src/pages/CustomQuery/QueryWorkbench.jsx)
// so it can be reused wherever a SQL WHERE-condition needs to be authored without hand-typing SQL.
const CONDITION_OPS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];

const VisualQueryBuilder = ({ onGenerate }) => {
    const [builderServer, setBuilderServer] = useState('');
    const [builderSchema, setBuilderSchema] = useState('');
    const [selectedTable, setSelectedTable] = useState(null);
    const [conditions, setConditions] = useState([{ col: '', op: '=', val: '' }]);

    const dispatch = useDispatch();
    const databaseList = useSelector(s => s?.customQuery?.databaseList || []);
    const dboList      = useSelector(s => s?.customQuery?.dboList      || []);
    const tableList    = useSelector(s => s?.customQuery?.tableList    || {});

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
        const schemaName = dboList.find(d => d.value === builderSchema)?.label || '';
        const qualifiedTable = schemaName ? `${schemaName}.${selectedTable}` : selectedTable;
        const wheres = conditions.filter(c => c.col && c.op).map(c =>
            c.op === 'IS NULL' || c.op === 'IS NOT NULL' ? `${c.col} ${c.op}` : `${c.col} ${c.op} '${c.val}'`
        );
        return `SELECT ${cols}\nFROM ${qualifiedTable}${wheres.length ? '\nWHERE ' + wheres.join('\n  AND ') : ''};`;
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 h-full p-3 bg-slate-50">
            {/* Server / Schema / Table */}
            <div className="w-full sm:w-40 shrink-0 flex flex-col gap-2">
                <label className="text-xs font-medium text-slate-600">Server</label>
                <select
                    value={builderServer}
                    onChange={e => {
                        setBuilderServer(e.target.value);
                        setBuilderSchema('');
                        setSelectedTable(null);
                        if (e.target.value) dispatch(CustomQueryActions.getdboList(true, e.target.value, () => {}));
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none"
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
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none"
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
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                    <option value="">
                        {!builderServer ? 'Select a server first' : !builderSchema ? 'Select a schema first' : tables.length === 0 ? 'No tables found' : 'Select Table'}
                    </option>
                    {tables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            </div>

            {/* Conditions + preview */}
            <div className="flex-1 w-full flex flex-col min-w-0 min-h-0">
                <p className="text-xs font-medium text-slate-600 pb-1 border-b border-slate-200">WHERE Conditions</p>
                <div className="flex flex-col gap-2 pt-2 flex-1 min-h-0 overflow-y-auto pr-1">
                    {conditions.map((cond, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded px-2 py-1.5">
                            <span className="text-[9px] font-bold text-slate-400 w-6 shrink-0">{i === 0 ? 'IF' : 'AND'}</span>
                            <select value={cond.col} onChange={e => updateCondition(i, 'col', e.target.value)} className="flex-1 min-w-[5rem] px-1.5 py-1 text-xs border border-slate-200 rounded bg-white">
                                <option value="">Column</option>
                                {selectedTableCols.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={cond.op} onChange={e => updateCondition(i, 'op', e.target.value)} className="w-20 shrink-0 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white">
                                {CONDITION_OPS.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                            <input
                                value={cond.val}
                                onChange={e => updateCondition(i, 'val', e.target.value)}
                                placeholder="Value"
                                disabled={cond.op === 'IS NULL' || cond.op === 'IS NOT NULL'}
                                className="flex-1 min-w-[5rem] px-1.5 py-1 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            {conditions.length > 1 && (
                                <button type="button" onClick={() => removeCondition(i)} className="text-slate-400 hover:text-red-500 p-0.5 transition-colors shrink-0">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addCondition} className="self-start text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded border border-dashed border-slate-300 hover:border-slate-400 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        Add Condition
                    </button>
                </div>

                {selectedTable && (
                    <pre className="mt-2 rounded bg-slate-900 text-green-400 text-[11px] font-mono px-2 py-1.5 whitespace-pre-wrap max-h-20 overflow-auto">{buildQuery()}</pre>
                )}

                <div className="pt-2 mt-auto">
                    <Button
                        type="button"
                        onClick={() => onGenerate(buildQuery())}
                        disabled={!selectedTable}
                        variant="primary"
                        className="px-4 py-1.5 text-xs font-semibold"
                    >
                        Use This Query
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VisualQueryBuilder;
