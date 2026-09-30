import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { validateDatasourceExpression } from '../../../store/actions/dashboardBuilder-actions';

// Shared by this file's own WHERE/HAVING boxes and MappingFields.jsx's per-measure "Custom
// SQL" toggle — same POST /datasources/<id>/validate-expression preview check (safety +
// dry-run + resulting data type), same inline pass/fail UI, so a person gets the identical
// signal whether they're validating a measure's expression or a WHERE/HAVING condition.
export function ValidateExpressionButton({ datasourceId, expression }) {
  const [result, setResult] = useState(null); // null | 'loading' | {ok:true,dataType} | {ok:false,error}

  // Stale result would otherwise silently keep showing "Valid" after the text underneath it
  // changed — an edited expression must be re-validated before it's trusted again.
  useEffect(() => { setResult(null); }, [expression]);

  const run = async () => {
    if (!expression?.trim() || !datasourceId) return;
    setResult('loading');
    try {
      const { dataType } = await validateDatasourceExpression(datasourceId, expression);
      setResult({ ok: true, dataType });
    } catch (err) {
      setResult({ ok: false, error: err.message });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={run}
        disabled={!expression?.trim() || result === 'loading'}
        className="px-2.5 py-1 rounded-md text-[0.7rem] font-semibold text-[#EC7D09] border border-[#EC7D09]/30 bg-white hover:bg-orange-50 disabled:opacity-40"
      >
        {result === 'loading' ? 'Validating…' : 'Validate'}
      </button>
      {result && result !== 'loading' && (
        result.ok
          ? <span className="text-[0.7rem] font-medium text-emerald-600">Valid{result.dataType ? ` — ${result.dataType}` : ''}</span>
          : <span className="text-[0.7rem] font-medium text-red-500">{result.error}</span>
      )}
    </div>
  );
}

/**
 * Phase B mapping-level fields — `custom_where`/`custom_having`, a free-form condition applied
 * on top of whatever x_axis/y_axis/filters already produce (WHERE must not contain an
 * aggregate, HAVING must). Collapsed by default: this is an advanced/opt-in escape hatch, not
 * something most widgets need — matches "coexist, not replace" (every existing column/filter
 * picker keeps working exactly as before whether or not this section is ever opened).
 */
export default function AdvancedSqlFields({ whereValue, havingValue, onWhereChange, onHavingChange, datasourceId }) {
  const [open, setOpen] = useState(!!whereValue || !!havingValue);
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between text-xs font-semibold text-[#EC7D09] uppercase tracking-wide"
      >
        Advanced SQL (optional)
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-slate-600 w-full">
            Custom WHERE condition
            <textarea
              value={whereValue}
              onChange={(e) => onWhereChange(e.target.value)}
              placeholder="e.g. region != 'test' AND attempts > 0"
              rows={2}
              className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
            />
            <div className="mt-1"><ValidateExpressionButton datasourceId={datasourceId} expression={whereValue} /></div>
          </label>
          <label className="text-xs font-medium text-slate-600 w-full">
            Custom HAVING condition
            <textarea
              value={havingValue}
              onChange={(e) => onHavingChange(e.target.value)}
              placeholder="e.g. SUM(drops) > 100"
              rows={2}
              className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
            />
            <div className="mt-1"><ValidateExpressionButton datasourceId={datasourceId} expression={havingValue} /></div>
          </label>
          <div className="text-[0.7rem] text-slate-400">
            WHERE filters rows before aggregation (no SUM/AVG/COUNT allowed) — HAVING filters after aggregation (must contain one).
          </div>
        </div>
      )}
    </div>
  );
}
