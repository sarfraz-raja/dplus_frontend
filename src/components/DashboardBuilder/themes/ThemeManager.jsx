import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Palette, Trash2, Plus } from 'lucide-react';
import FormModal from '../../FormModal';
import { createTheme, listThemes, getThemeDetail, updateTheme, deleteTheme } from '../../../store/actions/dashboardBuilder-actions';
import { CHART_PALETTE } from '../../../theme/tokens';
import WidgetStyleFields from '../widgetConfig/WidgetStyleFields';
import EditedBadge, { sameStyleValue } from '../widgetConfig/EditedBadge';
import PaletteEditor from './PaletteEditor';
import DASHBOARD_STYLE_FIELDS from './dashboardStyleFields';
import StyleModeSwitch from '../widgetConfig/StyleModeSwitch';
import { resolveStyleForMode, setModeColor, cardBorderDefaults } from '../utils/themedStyle';
import { dashboardColorDefaults } from '../widgetConfig/widgetTypeRegistry';
import { useTheme } from '../../../context/ThemeContext';

// Color fields a theme stores per mode (light/dark).
const THEME_COLOR_KEYS = new Set([...DASHBOARD_STYLE_FIELDS.filter((f) => f.type === 'color').map((f) => f.key), 'palette']);

/**
 * Manages reusable Themes (Phase 19b) — a named style object any number of dashboards can
 * bind to via `dashboard.theme_id`; editing one here updates every dashboard bound to it.
 *
 * `embedded`: renders as a plain in-page panel for use as the Dashboard Builder's "Settings"
 * tab, same convention DatasourceManager.jsx/ChartLibrary.jsx already use for their own tabs.
 */
// True when the theme sets a palette in either mode (flat or colors.{light,dark}).
const MODES_HAVE_PALETTE = (st) => ['light', 'dark'].some((m) => (resolveStyleForMode(st, m === 'dark')?.palette || []).length > 0);

const ThemeManager = React.forwardRef(function ThemeManager({ isOpen, setIsOpen, embedded = false, tabs = null }, ref) {
  const [themes, setThemes] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [name, setName] = useState('');
  const [style, setStyle] = useState({});
  // Style as last loaded/saved — the Style panel's "Edited" badges compare against it.
  const [savedStyle, setSavedStyle] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const setField = (key, val) => setStyle((prev) => ({ ...prev, [key]: val }));
  // Colors are stored per mode (utils/themedStyle.js), everything else is shared — same rule the
  // chart editor and Dashboard Style popover follow. Palette stays shared (edited separately).
  const { theme: appTheme } = useTheme();
  const [styleMode, setStyleMode] = useState(appTheme === 'dark' ? 'dark' : 'light');
  // Color palette card (inside the colors box): open if this theme sets a palette, then user-controlled.
  const [paletteOpen, setPaletteOpen] = useState(() => MODES_HAVE_PALETTE(style));
  const setStyleField = (key, val) => setStyle((prev) => (
    THEME_COLOR_KEYS.has(key) ? setModeColor(prev, key, val, styleMode === 'dark', THEME_COLOR_KEYS) : { ...prev, [key]: val }
  ));
  // The series palette for the mode being edited (a legacy single palette counts as both).
  const palette = resolveStyleForMode(style, styleMode === 'dark')?.palette || [];
  const paletteEdited = !sameStyleValue(palette, resolveStyleForMode(savedStyle, styleMode === 'dark')?.palette);

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
    setSavedStyle({ palette: [...CHART_PALETTE] });
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
      setSavedStyle(theme.style || {});
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
      setSavedStyle(style);
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

  const previewPalette = palette.length ? palette : CHART_PALETTE;

  const content = (
    <div className={`flex ${embedded ? 'h-full gap-4' : 'h-[62vh] gap-5'}`}>
      {/* Left: identity + style cards, stacked, footer pinned below. Embedded (Settings tab): editor and
          library are two separate glass cards, like Dashboards / Charts. */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${embedded ? 'rounded-xl backdrop-blur-md border border-white/60 dark:border-line shadow-lg p-3' : ''}`} style={embedded ? { background: 'var(--glass)' } : undefined}>
        {/* OLD: overflow-y-auto here scrolled Identity + Style together. Now Identity (top) and the
            footer (bottom) stay fixed; only the Style card's content scrolls. */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {detailLoading && <div className="text-xs text-slate-400">Loading theme…</div>}

          {/* OLD: name input + one 176×96 preview (dark navy, read the flat style.bgColor — ignored the
              per-mode colors) → empty space under the input. Now one compact row: name on the left,
              a Light and a Dark mini widget tile on the right drawn from that mode's resolved colors.
              Clicking a tile switches the colors box below to that mode. */}
          <section className="shrink-0 rounded-xl bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex min-w-[220px] max-w-md flex-1 flex-col gap-1.5">
                <label htmlFor="theme-name" className="text-dbe-h1 font-semibold uppercase tracking-wider text-slate-400">Theme name</label>
                <input
                  id="theme-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Corporate Brand"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-dbe-body focus:border-[#EC7D09] focus:outline-none focus:ring-2 focus:ring-[#EC7D09]/25"
                />
                <p className="text-dbe-meta text-slate-400">Dashboards that pick this as their base theme follow later edits.</p>
              </div>
              <div className="ml-auto flex shrink-0 gap-2" role="group" aria-label="Theme preview">
                {[['light', 'Light'], ['dark', 'Dark']].map(([mode, label]) => {
                  const isDark = mode === 'dark';
                  const r = { ...dashboardColorDefaults(isDark), ...cardBorderDefaults(isDark), ...resolveStyleForMode(style, isDark) };
                  const cols = r.palette?.length ? r.palette : CHART_PALETTE;
                  const active = styleMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStyleMode(mode)}
                      title={`Edit ${label} colors`}
                      aria-pressed={active}
                      className={`flex w-36 flex-col gap-1 rounded-lg p-1.5 text-left transition-shadow ${active ? 'ring-2 ring-[#EC7D09]' : 'ring-1 ring-slate-200 hover:ring-slate-300'}`}
                      style={{ background: isDark ? '#1e2235' : '#f8fafc' }}
                    >
                      <span className={`px-0.5 text-dbe-meta font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                      <span
                        className="flex h-[52px] flex-col justify-between overflow-hidden rounded-md px-2 py-1.5"
                        style={{ background: r.bgColor || (isDark ? '#262b3d' : '#ffffff'), border: `1px solid ${r.cardBorderColor}` }}
                      >
                        <span className="truncate text-dbe-meta font-semibold" style={{ color: r.titleColor || (isDark ? '#e2e8f0' : '#1e293b') }}>
                          {name.trim() || 'Widget title'}
                        </span>
                        <span className="flex h-6 items-end gap-0.5">
                          {cols.slice(0, 8).map((c, i) => (
                            <span key={i} className="flex-1 rounded-t-[2px]" style={{ background: c, height: `${35 + ((i * 41) % 65)}%` }} />
                          ))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Style — every field a dashboard/widget can actually cascade from — the same
              DASHBOARD_STYLE_FIELDS list the "Dashboard Level Theme" popover edits local
              overrides against, so a theme can only ever set fields that are genuinely
              readable somewhere else, and anything configurable there is guaranteed to
              exist here too. */}
          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
            <div className="shrink-0 text-dbe-h1 font-semibold text-slate-400 uppercase tracking-wider mb-3">Style</div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {/* OLD: <StyleModeSwitch value={styleMode} onChange={setStyleMode} /> — moved onto the colors box header. */}
            <WidgetStyleFields
              colorMode={styleMode}
              onColorModeChange={setStyleMode}
              fields={DASHBOARD_STYLE_FIELDS}
              value={resolveStyleForMode(style, styleMode === 'dark')}
              savedValue={resolveStyleForMode(savedStyle, styleMode === 'dark')}
              onChange={setStyleField}
              resolvedDefaults={{ titleSize: 11, axisTextSize: 9, ...dashboardColorDefaults(styleMode === 'dark'), ...cardBorderDefaults(styleMode === 'dark') }}
              columns={3}
              // Series colors dashboards bound to this theme use by default — per mode, so inside the colors box.
              colorFooter={(
                // Collapsible like the other groups (same .dbe-style-subsection card from WidgetStyleFields);
                // starts open only when this theme sets a palette for the mode shown.
                // Held open with an "Edited" badge while this mode's palette differs from the saved one.
                <details className="dbe-style-subsection mt-1.5" open={paletteOpen || paletteEdited}>
                  {/* OLD: open={…this mode's palette is set…} — re-decided on every Light ↔ Dark switch, so the
                      card opened/closed by itself. Now its own state: starts open only if a palette is set,
                      then stays as the user leaves it across mode switches. */}
                  <summary onClick={(e) => { e.preventDefault(); if (!paletteEdited) setPaletteOpen((o) => !o); }}>
                    Color palette
                    {paletteEdited && <EditedBadge />}
                    <span className="ml-auto normal-case tracking-normal font-normal text-dbe-meta text-slate-400">Default series colors for charts using this theme</span>
                  </summary>
                  <div className="dbe-style-subsection-body">
                  <PaletteEditor value={palette} onChange={(next) => setStyleField('palette', next)} />
                  <div className="mt-3 flex h-14 items-end gap-1.5 border-t border-slate-100 pt-2">
                    {/* OLD: previewPalette.slice(0, 6) — showed 6 bars for an 8-color palette */}
                    {previewPalette.map((c, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ background: c, height: `${30 + ((i * 37) % 70)}%` }} />
                    ))}
                  </div>
                  </div>
                </details>
              )}
            />
            </div>
          </section>

          {/* OLD: a separate "Color palette" section here, with its own second Light/Dark switch. The palette
              is stored per mode like every other color, so it now lives inside the Style section's colors
              box (colorFooter above), driven by that box's one switch — same as the Dashboard Style popover. */}
        </div>

        {/* OLD: Create/Save on the left. Now right-aligned like the editor toolbars: messages left,
            Delete, then the primary Create/Save last (far right). */}
        <div className="shrink-0 pt-3 mt-1 border-t border-slate-100 flex items-center justify-end gap-2">
          {saveError && <div className="mr-auto text-xs text-red-500">{saveError}</div>}
          {deleteError && <div className="mr-auto text-xs text-red-500">{deleteError}</div>}
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
          <button
            type="button"
            onClick={save}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#EC7D09] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create theme'}
          </button>
        </div>
      </div>

      {/* Right: Theme Library — saved theme cards */}
      <div className={`w-64 shrink-0 flex flex-col gap-3 overflow-y-auto ${embedded ? 'rounded-xl backdrop-blur-md border border-white/60 dark:border-line shadow-lg p-3' : 'border-l border-slate-100 pl-4'}`} style={embedded ? { background: 'var(--glass)' } : undefined}>
        {tabs /* Settings → Themes | Color palettes switch (embedded only) */}
        <div className="flex items-center justify-between">
          <div className="text-dbe-h1 font-semibold text-slate-400 uppercase tracking-wider">Theme Library</div>
          <button type="button" onClick={resetForm} className="flex items-center gap-1 text-dbe-body font-semibold text-[#EC7D09] hover:opacity-80">
            <Plus size={13} /> New
          </button>
        </div>
        {listLoading && <div className="text-xs text-slate-400 text-center mt-4">Loading…</div>}
        {listError && <div className="text-xs text-red-500 px-1">{listError}</div>}
        <div className="flex flex-col gap-2">
          {themes.map((t) => {
            const themePalette = resolveStyleForMode(t.style, appTheme === 'dark')?.palette;
            // OLD: .slice(0, 4) — the library card showed only 4 of the theme's colors.
            const swatches = (themePalette?.length ? themePalette : CHART_PALETTE);
            const active = editingId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => editTheme(t)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                  active ? 'border-[#EC7D09] bg-orange-50/60 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                    style={{ background: resolveStyleForMode(t.style, appTheme === 'dark')?.accentColor || resolveStyleForMode(t.style, appTheme === 'dark')?.bgColor || '#94a3b8' }}
                  />
                  <div className={`text-xs font-semibold truncate ${active ? 'text-[#EC7D09]' : 'text-slate-700'}`}>{t.name}</div>
                </div>
                <div className="flex gap-1 mt-2">
                  {swatches.map((c, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
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
