import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Palette, Trash2, Plus } from 'lucide-react';
import FormModal from '../../FormModal';
import { createTheme, listThemes, getThemeDetail, updateTheme, deleteTheme } from '../../../store/actions/dashboardBuilder-actions';
import { CHART_PALETTE } from '../../../theme/tokens';
import WidgetStyleFields from '../widgetConfig/WidgetStyleFields';
import PaletteEditor from './PaletteEditor';
import DASHBOARD_STYLE_FIELDS from './dashboardStyleFields';

/**
 * Manages reusable Themes (Phase 19b) — a named style object any number of dashboards can
 * bind to via `dashboard.theme_id`; editing one here updates every dashboard bound to it.
 *
 * `embedded`: renders as a plain in-page panel for use as the Dashboard Builder's "Settings"
 * tab, same convention DatasourceManager.jsx/ChartLibrary.jsx already use for their own tabs.
 */
const ThemeManager = React.forwardRef(function ThemeManager({ isOpen, setIsOpen, embedded = false }, ref) {
  const [themes, setThemes] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [name, setName] = useState('');
  const [style, setStyle] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const setField = (key, val) => setStyle((prev) => ({ ...prev, [key]: val }));
  const palette = style.palette || [];

  const refreshList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      setThemes(await listThemes());
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (embedded || isOpen) refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    // Seed a fresh theme's chart palette from the app's own default, so "Create theme"
    // starts from something usable instead of an empty swatch row every time.
    setStyle({ palette: [...CHART_PALETTE] });
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
  };

  useImperativeHandle(ref, () => ({ resetForm }));

  // Seed on first mount too (resetForm isn't called until the "New theme" button is clicked).
  useEffect(() => { resetForm(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editTheme = async (summary) => {
    setEditingId(summary.id);
    setName(summary.name);
    setSaveError(null);
    setConfirmingDelete(false);
    setDeleteError(null);
    setDetailLoading(true);
    try {
      const theme = await getThemeDetail(summary.id);
      setStyle(theme.style || {});
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        await updateTheme(editingId, { name: name.trim(), style });
      } else {
        const theme = await createTheme({ name: name.trim(), style });
        setEditingId(theme.id);
      }
      await refreshList();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTheme(editingId);
      await refreshList();
      resetForm();
      setDeleting(false);
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  const content = (
    <div className={`flex gap-5 ${embedded ? 'h-full' : 'h-[62vh]'}`}>
      {/* Left: name + live preview + style fields */}
      <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-y-auto pr-1">
        <div className="flex gap-4 items-start">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Corporate Brand"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </label>
          {/* Live preview — reflects the fields below as they're edited, so a change is
              immediately visible without needing to bind a dashboard first. */}
          <div
            className="w-40 h-20 shrink-0 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between p-2.5 overflow-hidden"
            style={{ background: style.bgColor || '#0f172a' }}
          >
            <div
              className="text-xs truncate"
              style={{
                color: style.titleColor || '#e2e8f0',
                fontWeight: style.titleWeight === 'bold' ? 700 : 500,
                fontSize: style.titleSize ? `${style.titleSize}px` : 12,
              }}
            >
              {name.trim() || 'Theme preview'}
            </div>
            <div className="flex gap-1">
              {(palette.length ? palette : CHART_PALETTE).slice(0, 8).map((c, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        {detailLoading && <div className="text-xs text-slate-400">Loading theme…</div>}

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Style</div>
          {/* Every field a dashboard/widget can actually cascade from — the same
              DASHBOARD_STYLE_FIELDS list the "Dashboard Level Theme" popover edits local
              overrides against, so a theme can only ever set fields that are genuinely
              readable somewhere else, and anything configurable there is guaranteed to
              exist here too. Previously this only exposed a hand-picked 5-field subset
              (Background/Accent/Title color/weight/size), silently hiding every field added
              since (dashboard background, dashboard title, fonts, axis styling, background
              gradient) from ever being set at the theme level at all. */}
          <WidgetStyleFields fields={DASHBOARD_STYLE_FIELDS} value={style} onChange={setField} columns={3} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chart Palette</div>
            <span className="text-[0.6875rem] text-slate-400">Series colors dashboards bound to this theme use by default</span>
          </div>
          <PaletteEditor value={palette} onChange={(next) => setField('palette', next)} />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={save}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#EC7D09] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create theme'}
          </button>
          {editingId && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          {editingId && confirmingDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Delete this theme? Dashboards bound to it lose the binding.</span>
              <button type="button" onClick={remove} disabled={deleting} className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200">
                Cancel
              </button>
            </div>
          )}
        </div>

        {saveError && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>}
        {deleteError && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</div>}
      </div>

      {/* Right: saved themes list */}
      <div className="w-60 shrink-0 border-l border-slate-100 pl-4 flex flex-col gap-2 overflow-y-auto">
        <button type="button" onClick={resetForm} className="flex items-center gap-1.5 text-xs font-semibold text-[#EC7D09] hover:opacity-80 mb-1">
          <Plus size={14} /> New theme
        </button>
        {listLoading && <div className="text-xs text-slate-400 text-center mt-4">Loading…</div>}
        {listError && <div className="text-xs text-red-500 px-1">{listError}</div>}
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => editTheme(t)}
            className={`flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg text-xs border transition-colors ${
              editingId === t.id ? 'border-[#EC7D09] bg-orange-50 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div
              className="w-6 h-6 rounded-md shrink-0 border border-black/10"
              style={{ background: t.style?.bgColor || t.style?.accentColor || '#94a3b8' }}
            />
            <div className="font-semibold truncate">{t.name}</div>
          </button>
        ))}
        {!listLoading && themes.length === 0 && (
          <div className="text-xs text-slate-400 text-center mt-4">No themes yet.</div>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <FormModal
      title="Themes"
      subtitle="Reusable style presets any dashboard can bind to — editing one updates every dashboard using it."
      icon={<Palette size={16} className="text-white" />}
      size="lg"
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      {content}
    </FormModal>
  );
});

export default ThemeManager;
