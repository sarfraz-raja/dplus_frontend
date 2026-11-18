import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import FormModal from '../../FormModal';
import Button from '../../Button';
import Select from '../../Select';
import { readBundle, layoutReferences } from '../utils/dashboardBundle';
import CHART_TYPE_META, { displayChartType } from '../charts/chartTypeMeta';
import { previewDashboardImport, importDashboard } from '../../../store/actions/dashboardBuilder-actions';

// Import a dashboard file (.dashboard.json, docs/DASHBOARD_IMPORT_EXPORT.md), one dialog, three steps:
//   1. Read the file: readBundle checks / upgrades it; shows what's in it plus file-level errors
//      (block) and warnings (dropped or cleared on import).
//   2. Check it against THIS deployment (POST /dashboards/import/preview — writes nothing, runs on
//      its own once the file is valid) and let the user choose: the dashboard's name, for each
//      datasource use an existing one or create it, and the theme. Charts are always imported as
//      new copies (decision D2). Defaults match the backend's own (first candidate, else create).
//   3. Import (POST /dashboards/import, one transaction) → result: what was created / reused,
//      links cleared, tiles dropped. `onImported({ dashboard, widgets })` lets the page add and
//      open the new dashboard.
// `file`: the File picked on the dashboards list (null = closed). `existingNames`: Set of the
// dashboard names already here.

// A dashboard file is a few hundred KB at most; anything far bigger isn't one.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const failed = (message) => ({ bundle: null, errors: [{ code: 'read', message, path: '' }], warnings: [], migrations: [] });

const CANDIDATE_REASON = { same_id: 'same datasource', same_name: 'same name', same_table: 'same table' };

function IssueList({ items, tone, title }) {
  if (!items.length) return null;
  const Icon = tone === 'error' ? AlertCircle : AlertTriangle;
  const box = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div className={`rounded-lg border px-3 py-2 ${box}`}>
      <div className="flex items-center gap-1.5 text-ui-small font-semibold mb-1">
        <Icon size={14} aria-hidden="true" />
        {title || (tone === 'error'
          ? `${items.length} problem${items.length === 1 ? '' : 's'} — this file can't be imported`
          : `${items.length} thing${items.length === 1 ? '' : 's'} the import will drop or clear`)}
      </div>
      <ul className="list-disc pl-5 space-y-0.5 text-ui-small">
        {items.map((it, idx) => <li key={`${it.code || 'msg'}-${idx}`}>{it.message || String(it)}</li>)}
      </ul>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-ui-small font-semibold text-slate-600 mb-1">{children}</div>;
}

export default function ImportDashboardModal({ file, onClose, existingNames = new Set(), onImported }) {
  const [result, setResult] = useState(null);
  // Step 2: the backend's dry-run report, and the user's choices.
  const [preview, setPreview] = useState(null); // { status: 'loading' | 'ready' | 'failed', report?, message? }
  const [dashboardName, setDashboardName] = useState('');
  const [datasourceChoice, setDatasourceChoice] = useState({}); // ref → 'create' | candidate id
  const [themeChoice, setThemeChoice] = useState('none'); // 'none' | 'create' | candidate id
  // Step 3.
  const [importing, setImporting] = useState(false);
  const [commitErrors, setCommitErrors] = useState([]);
  const [done, setDone] = useState(null); // { dashboard, report }

  useEffect(() => {
    if (!file) { setResult(null); return undefined; }
    let cancelled = false;
    setResult(null);
    setPreview(null);
    setCommitErrors([]);
    setDone(null);
    if (file.size > MAX_FILE_BYTES) {
      setResult(failed('The file is too large to be a dashboard export.'));
      return undefined;
    }
    file.text()
      .then((text) => { if (!cancelled) setResult(readBundle(text)); })
      .catch(() => { if (!cancelled) setResult(failed("The file couldn't be read.")); });
    return () => { cancelled = true; };
  }, [file]);

  const bundle = result?.bundle;
  const fileErrors = result?.errors || [];
  const fileWarnings = result?.warnings || [];

  // Step 2 starts on its own once the file itself is valid.
  useEffect(() => {
    if (!bundle || fileErrors.length) return undefined;
    let cancelled = false;
    setPreview({ status: 'loading' });
    previewDashboardImport(bundle)
      .then((report) => {
        if (cancelled) return;
        setPreview({ status: 'ready', report });
        const d = report.dashboard || {};
        setDashboardName(d.name_taken ? (d.suggested_name || '') : (d.name || bundle.dashboard?.name || ''));
        setDatasourceChoice(Object.fromEntries((report.datasources || []).map((ds) => [ds.ref, ds.candidates?.[0]?.id ? String(ds.candidates[0].id) : 'create'])));
        const t = report.theme;
        setThemeChoice(t ? (t.candidates?.[0]?.id ? String(t.candidates[0].id) : 'create') : 'none');
      })
      .catch((e) => { if (!cancelled) setPreview({ status: 'failed', message: e.message }); });
    return () => { cancelled = true; };
  }, [bundle, fileErrors.length]);

  const summary = useMemo(() => {
    if (!bundle) return null;
    const d = bundle.dashboard || {};
    const refs = layoutReferences(d.layout);
    let exportedAt = '';
    try { exportedAt = bundle.exported_at ? new Date(bundle.exported_at).toLocaleString() : ''; } catch { /* leave blank */ }
    return {
      name: d.name || '',
      description: d.description || '',
      tabs: refs.tabIds.length,
      exportedAt,
      origin: bundle.source?.origin || '',
      widgets: bundle.widgets || [],
      datasources: bundle.datasources || [],
      slicers: (bundle.slicers || []).length,
      theme: (bundle.themes || []).find((t) => String(t.ref) === String(d.theme_ref)) || null,
    };
  }, [bundle]);

  const report = preview?.status === 'ready' ? preview.report : null;
  const reportErrors = report?.errors || [];
  const reportWarnings = report?.warnings || [];
  const bundleDatasourceByRef = useMemo(() => Object.fromEntries((bundle?.datasources || []).map((ds) => [String(ds.ref), ds])), [bundle]);

  // Charts whose settings don't fit the datasource the user picked for them (mapping_errors is keyed
  // by "new" or a candidate id) — shown under that datasource, and they block the import.
  const mappingProblemsByDatasource = useMemo(() => {
    const out = {};
    (report?.widgets || []).forEach((wr) => {
      const w = (bundle?.widgets || []).find((x) => String(x.ref) === String(wr.ref));
      const dsRef = w ? String(w.datasource_ref) : null;
      if (!dsRef) return;
      const choice = datasourceChoice[dsRef] || 'create';
      const msg = wr.mapping_errors?.[choice === 'create' ? 'new' : choice];
      if (msg) (out[dsRef] ||= []).push({ message: `${wr.name}: ${msg}` });
    });
    return out;
  }, [report, bundle, datasourceChoice]);
  const mappingProblemCount = Object.values(mappingProblemsByDatasource).reduce((n, list) => n + list.length, 0);

  const trimmedName = dashboardName.trim();
  const nameClash = !!trimmedName && existingNames.has(trimmedName);
  const canImport = !!report && !reportErrors.length && !mappingProblemCount && !!trimmedName && !nameClash && !importing && !done;

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setCommitErrors([]);
    const resolutions = {
      dashboard: { name: trimmedName, mode: 'create' },
      datasources: Object.fromEntries(Object.entries(datasourceChoice).map(([ref, choice]) => [
        ref, choice === 'create' ? { action: 'create' } : { action: 'map', id: choice },
      ])),
      // Decision D2: charts always come in as new copies.
      widgets: Object.fromEntries((bundle.widgets || []).map((w) => [w.ref, { action: 'create' }])),
      theme: themeChoice === 'none' || themeChoice === 'create' ? { action: themeChoice } : { action: 'map', id: themeChoice },
    };
    try {
      const imported = await importDashboard(bundle, resolutions);
      setDone({ dashboard: imported.dashboard, report: imported.report || {} });
      onImported?.(imported);
      toast.success(`Imported "${imported.dashboard.name}".`);
    } catch (e) {
      setCommitErrors(e.report?.errors?.length ? e.report.errors : [{ message: e.message }]);
    } finally {
      setImporting(false);
    }
  };

  const footer = done ? (
    <div className="flex justify-end">
      <Button variant="primary" onClick={onClose}>Done</Button>
    </div>
  ) : (
    <div className="flex items-center justify-end gap-3">
      {report && mappingProblemCount > 0 && (
        <span className="mr-auto text-ui-small text-red-600">Fix the chart problems above by choosing another datasource.</span>
      )}
      <Button variant="secondary" onClick={onClose} disabled={importing}>Cancel</Button>
      <Button
        variant="primary"
        disabled={!canImport}
        onClick={handleImport}
        title={!report ? 'Waiting for the check against this deployment' : undefined}
      >
        {importing ? 'Importing…' : 'Import'}
      </Button>
    </div>
  );

  const doneReport = done?.report || {};
  const countOf = (list) => (Array.isArray(list) ? list.length : 0);

  return (
    <FormModal
      title="Import dashboard file"
      subtitle={file?.name}
      icon={<Upload size={16} className="text-white" />}
      isOpen={!!file}
      setIsOpen={(open) => { if (!open && !importing) onClose(); }}
      size="form"
      footer={footer}
    >
      {!result ? (
        <div className="py-6 text-center text-ui-small text-slate-400">Reading file…</div>
      ) : done ? (
        // ── Step 3: result ──
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-px" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-ui-body font-semibold text-emerald-800 break-words">Imported as "{done.dashboard.name}"</div>
              <div className="text-ui-small text-emerald-700">It's a draft — open it from the list to check it, then publish.</div>
            </div>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Charts created', countOf(doneReport.created?.widgets)],
              ['Datasources created', countOf(doneReport.created?.datasources)],
              ['Datasources reused', countOf(doneReport.mapped?.datasources)],
              ['Theme', doneReport.created?.theme ? 'Created' : doneReport.mapped?.theme ? 'Reused' : 'None'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-ui-micro text-slate-500">{label}</dt>
                <dd className="text-ui-body font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <IssueList
            tone="warning"
            title="Notes from the import"
            items={[
              ...(doneReport.cleared_links || []).map((l) => ({ message: `A "Link to" another dashboard was cleared${typeof l === 'string' ? ` (${l})` : ''}.` })),
              ...(doneReport.dropped_tiles || []).map((t) => ({ message: `A tile was left out because what it showed isn't in the file${typeof t === 'string' ? ` (${t})` : ''}.` })),
              ...(doneReport.warnings || []),
            ]}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <IssueList items={fileErrors} tone="error" />

          {summary && (
            <>
              {/* ── Step 1: what's in the file ── */}
              <div>
                <div className="text-ui-heading font-semibold text-slate-800 break-words">{summary.name || 'Untitled dashboard'}</div>
                {summary.description && <p className="text-ui-small text-slate-500 mt-0.5">{summary.description}</p>}
                <p className="text-ui-small text-slate-400 mt-1">
                  {[summary.exportedAt && `Exported ${summary.exportedAt}`, summary.origin && `from ${summary.origin}`].filter(Boolean).join(' ')}
                </p>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Charts', summary.widgets.length],
                  ['Datasources', summary.datasources.length],
                  ['Slicers', summary.slicers],
                  ['Tabs', summary.tabs],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <dt className="text-ui-micro text-slate-500">{label}</dt>
                    <dd className="text-ui-body font-semibold text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>

              {summary.widgets.length > 0 && (
                <div>
                  <SectionTitle>Charts (imported as new copies)</SectionTitle>
                  <ul className="max-h-32 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {summary.widgets.map((w) => (
                      <li key={w.ref} className="px-3 py-1.5 text-ui-small flex items-baseline justify-between gap-2">
                        <span className="text-slate-700 truncate">{w.name}</span>
                        {/* Display name only — the file always holds the backend type (Map = TABLE + chart_variant). */}
                        <span className="text-slate-400 shrink-0">{CHART_TYPE_META[displayChartType(w.chart_type, w.mapping)]?.label || w.chart_type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <IssueList items={fileWarnings} tone="warning" />
            </>
          )}

          {/* ── Step 2: checked against this deployment, and the user's choices ── */}
          {summary && !fileErrors.length && (
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
              {preview?.status === 'loading' && (
                <div className="py-3 text-center text-ui-small text-slate-400">Checking against this deployment…</div>
              )}
              {preview?.status === 'failed' && (
                <IssueList tone="error" title="Couldn't check the file against this deployment" items={[{ message: preview.message }]} />
              )}
              {report && (
                <>
                  <IssueList items={reportErrors} tone="error" title={`${reportErrors.length} problem${reportErrors.length === 1 ? '' : 's'} on this deployment — can't import`} />

                  <div>
                    <label htmlFor="import-dashboard-name" className="block"><SectionTitle>Name here</SectionTitle></label>
                    <input
                      id="import-dashboard-name"
                      type="text"
                      value={dashboardName}
                      onChange={(e) => setDashboardName(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-ui-body"
                    />
                    {nameClash && <p className="text-ui-small text-red-600 mt-1">A dashboard with this name already exists here.</p>}
                    {!trimmedName && <p className="text-ui-small text-red-600 mt-1">Give the dashboard a name.</p>}
                  </div>

                  {(report.datasources || []).length > 0 && (
                    <div>
                      <SectionTitle>Datasources</SectionTitle>
                      <ul className="flex flex-col gap-2">
                        {report.datasources.map((ds) => {
                          const ref = String(ds.ref);
                          const choice = datasourceChoice[ref] || 'create';
                          const isSql = !!bundleDatasourceByRef[ref]?.sql_query;
                          const problems = mappingProblemsByDatasource[ref] || [];
                          return (
                            <li key={ref} className="rounded-lg border border-slate-200 px-3 py-2">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-2 mb-1.5">
                                <span className="text-ui-body font-medium text-slate-700 break-words">{ds.name}</span>
                                <span className="text-ui-small text-slate-400 truncate max-w-full">{isSql ? 'SQL query' : ds.source}</span>
                              </div>
                              <Select
                                value={choice}
                                onChange={(e) => setDatasourceChoice((prev) => ({ ...prev, [ref]: e.target.value }))}
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-ui-body"
                                aria-label={`What to use for datasource ${ds.name}`}
                              >
                                {(ds.candidates || []).map((c) => (
                                  <option key={c.id} value={String(c.id)}>
                                    Use existing: {c.name}{CANDIDATE_REASON[c.reason] ? ` (${CANDIDATE_REASON[c.reason]})` : ''}
                                  </option>
                                ))}
                                <option value="create">Create from the file</option>
                              </Select>
                              {choice === 'create' && ds.table_exists === false && (
                                <p className="text-ui-small text-red-600 mt-1">The table {ds.source} doesn't exist here.</p>
                              )}
                              {choice === 'create' && (ds.missing_columns || []).length > 0 && ds.table_exists !== false && (
                                <p className="text-ui-small text-amber-700 mt-1">Missing columns here: {ds.missing_columns.join(', ')}</p>
                              )}
                              {choice === 'create' && isSql && (
                                <p className="text-ui-small text-slate-500 mt-1">Creating a SQL datasource needs an Admin role.</p>
                              )}
                              {problems.length > 0 && (
                                <div className="mt-1.5">
                                  <IssueList tone="error" title={`${problems.length} chart${problems.length === 1 ? '' : 's'} won't work with this choice`} items={problems} />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {report.theme && (
                    <div>
                      <SectionTitle>Theme "{report.theme.name}"</SectionTitle>
                      <Select
                        value={themeChoice}
                        onChange={(e) => setThemeChoice(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-ui-body"
                        aria-label="What to use for the theme"
                      >
                        {(report.theme.candidates || []).map((c) => (
                          <option key={c.id} value={String(c.id)}>Use existing: {c.name}</option>
                        ))}
                        <option value="create">Create from the file</option>
                        <option value="none">Don't link a theme (keep its own style)</option>
                      </Select>
                    </div>
                  )}

                  <IssueList items={reportWarnings} tone="warning" title="Notes" />
                  <IssueList items={commitErrors} tone="error" title="The import failed — nothing was created" />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </FormModal>
  );
}
