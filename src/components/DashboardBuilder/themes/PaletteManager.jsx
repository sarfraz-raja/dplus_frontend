import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X, ChevronUp, ChevronDown, Copy, Lock } from 'lucide-react';
import Button from '../../Button';
import ConfirmModal from '../../ConfirmModal';
import { PALETTE_PRESETS } from '../../../theme/tokens';
import { createPalette, updatePalette, deletePalette } from '../../../store/actions/dashboardBuilder-actions';
import usePalettes, { refreshPalettes } from './usePalettes';

// Settings → Color palettes: the palette library (Built-in from tokens.js, read-only; Custom from
// GET /dashboard-builder/palettes) and an editor for custom ones (name + 1–24 hex colours, ordered).
// Picking a palette elsewhere COPIES its colours, so editing/deleting one here never changes existing
// themes or charts (backend Option A). Same page layout as ThemeManager (editor left, library right).
const MAX_COLORS = 24;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NEW_COLORS = ['#378add', '#10b981', '#8b5cf6', '#f59e0b'];
const sameList = (a, b) => JSON.stringify(a.map((c) => c.toLowerCase())) === JSON.stringify(b.map((c) => c.toLowerCase()));

function Swatches({ colors }) {
  return (
    <div className="mt-2 flex gap-1">
      {colors.map((c, i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: c }} />)}
    </div>
  );
}

export default function PaletteManager({ tabs = null }) {
  const custom = usePalettes();
  // selection: { kind: 'new', seed? } | { kind: 'custom', id } | { kind: 'builtin', name }
  const [sel, setSel] = useState({ kind: 'new' });
  const [name, setName] = useState('');
  const [colors, setColors] = useState(NEW_COLORS);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedCustom = sel.kind === 'custom' ? custom.find((p) => String(p.id) === String(sel.id)) : null;
  const selectedBuiltin = sel.kind === 'builtin' ? PALETTE_PRESETS.find((p) => p.name === sel.name) : null;
  const readOnly = sel.kind === 'builtin';

  // Load the selected palette into the editor.
  useEffect(() => {
    if (selectedCustom) { setName(selectedCustom.name); setColors(selectedCustom.colors); }
    else if (selectedBuiltin) { setName(selectedBuiltin.name); setColors(selectedBuiltin.colors); }
    else if (sel.kind === 'new') { setName(sel.seed?.name || ''); setColors(sel.seed?.colors || NEW_COLORS); }
  }, [sel, selectedCustom?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameError = !name.trim() ? 'Name is required' : name.trim().length > 128 ? 'At most 128 characters' : null;
  const badColor = colors.findIndex((c) => !HEX.test(c));
  const colorsError = colors.length === 0 ? 'Add at least one color' : badColor >= 0 ? `Color ${badColor + 1} isn't a valid hex (#RGB, #RRGGBB or #RRGGBBAA)` : null;
  const dirty = useMemo(() => (selectedCustom
    ? name.trim() !== selectedCustom.name || !sameList(colors, selectedCustom.colors)
    : sel.kind === 'new'), [selectedCustom, sel.kind, name, colors]);

  const setColor = (i, v) => setColors((prev) => prev.map((c, j) => (j === i ? v : c)));
  const move = (i, d) => setColors((prev) => {
    const next = [...prev]; const j = i + d;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  const save = async () => {
    if (readOnly || nameError || colorsError) return;
    setSaving(true);
    try {
      if (sel.kind === 'custom' && selectedCustom) {
        const patch = {};
        if (name.trim() !== selectedCustom.name) patch.name = name.trim();
        if (!sameList(colors, selectedCustom.colors)) patch.colors = colors;
        if (Object.keys(patch).length) await updatePalette(selectedCustom.id, patch);
        toast.success('Palette saved');
      } else {
        const created = await createPalette({ name: name.trim(), colors });
        toast.success('Palette created');
        if (created?.id) setSel({ kind: 'custom', id: created.id });
      }
      await refreshPalettes();
    } catch (e) {
      toast.error(e.message); // backend msg: duplicate name (409), invalid colours (400)…
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedCustom) return;
    setSaving(true);
    try {
      await deletePalette(selectedCustom.id);
      toast.success('Palette deleted');
      setConfirmDelete(false);
      setSel({ kind: 'new' });
      await refreshPalettes();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Built-ins are read-only: start a new custom palette pre-filled with this one's colours.
  const duplicateBuiltin = () => {
    if (!selectedBuiltin) return;
    setSel({ kind: 'new', seed: { name: `${selectedBuiltin.name} (custom)`, colors: [...selectedBuiltin.colors] } });
  };

  const libraryItem = (key, label, cols, active, onClick, locked) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${active ? 'border-[#EC7D09] bg-[#EC7D09]/[0.06]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className="flex items-center gap-1.5 text-dbe-body font-semibold text-slate-700">
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {locked && <Lock size={11} className="shrink-0 text-slate-400" aria-label="Built-in (read-only)" />}
      </div>
      <Swatches colors={cols} />
    </button>
  );

  return (
    <div className="flex h-full gap-4">
      {/* Left: editor — header fixed, colors scroll, footer fixed (same as the Themes page). Editor and
          library are two separate glass cards, like Dashboards / Charts. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 rounded-xl backdrop-blur-md border border-white/60 dark:border-line shadow-lg p-3" style={{ background: 'var(--glass)' }}>
        {/* OLD: name input across the full width + Light/Dark previews under the colors. Now one compact
            row like the Themes page: name (limited width) on the left, both previews on the right. */}
        <section className="shrink-0 rounded-xl bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[220px] max-w-md flex-1 flex-col gap-1.5">
              <label htmlFor="palette-name" className="flex items-center gap-2 text-dbe-h1 font-semibold uppercase tracking-wider text-slate-400">
                Palette name
                {readOnly && <span className="rounded bg-slate-100 px-1.5 py-px text-dbe-meta normal-case tracking-normal text-slate-500">Built-in · read-only</span>}
              </label>
              <input
                id="palette-name"
                type="text"
                value={name}
                disabled={readOnly}
                maxLength={128}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Corporate Blue"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-dbe-body focus:border-[#EC7D09] focus:outline-none focus:ring-2 focus:ring-[#EC7D09]/25 disabled:bg-slate-50 disabled:text-slate-500"
              />
              {!readOnly && nameError && name !== '' && <p className="text-dbe-meta text-red-600">{nameError}</p>}
            </div>
            {/* How the series colors read on both widget backgrounds. */}
            <div className="ml-auto flex shrink-0 gap-2" aria-label="Palette preview">
              {[['Light', '#f8fafc', '#ffffff', '#e2e8f0', 'text-slate-500'], ['Dark', '#1e2235', '#22273c', '#383d50', 'text-slate-400']].map(([label, frame, card, border, txt]) => (
                <div key={label} className="flex w-44 flex-col gap-1 rounded-lg p-1.5 ring-1 ring-slate-200" style={{ background: frame }}>
                  <span className={`px-0.5 text-dbe-meta font-semibold ${txt}`}>{label}</span>
                  <div className="flex h-[52px] items-end gap-0.5 rounded-md px-2 pb-1.5 pt-2" style={{ background: card, border: `1px solid ${border}` }}>
                    {colors.filter((c) => HEX.test(c)).map((c, i) => (
                      <div key={i} className="flex-1 rounded-t-[2px]" style={{ background: c, height: `${35 + ((i * 41) % 65)}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <span className="flex-1 text-dbe-h1 font-semibold uppercase tracking-wider text-slate-400">Colors ({colors.length}/{MAX_COLORS})</span>
            {!readOnly && (
              <button
                type="button"
                className="dbe-action-btn is-sm gap-1 px-2"
                disabled={colors.length >= MAX_COLORS}
                onClick={() => setColors((prev) => [...prev, prev[prev.length - 1] || '#378add'])}
              >
                <Plus size={11} aria-hidden="true" /> Add color
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[var(--dbe-surface-element)] px-2 py-1.5">
                  <span className="w-5 shrink-0 text-right text-dbe-meta text-slate-400">{i + 1}</span>
                  <label className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded border border-slate-300" style={{ background: HEX.test(c) ? c : '#fff' }}>
                    <input type="color" disabled={readOnly} value={/^#[0-9a-f]{6}$/i.test(c) ? c : '#000000'} onChange={(e) => setColor(i, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Color ${i + 1}`} />
                  </label>
                  <input
                    type="text"
                    value={c}
                    disabled={readOnly}
                    onChange={(e) => setColor(i, e.target.value.trim())}
                    className={`min-w-0 flex-1 rounded border bg-white px-1.5 py-0.5 font-mono text-dbe-body ${HEX.test(c) ? 'border-slate-200' : 'border-red-400'} disabled:bg-transparent`}
                    aria-label={`Color ${i + 1} hex`}
                  />
                  {!readOnly && (
                    <span className="flex shrink-0 items-center">
                      <button type="button" title="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp size={13} /></button>
                      <button type="button" title="Move down" onClick={() => move(i, 1)} disabled={i === colors.length - 1} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown size={13} /></button>
                      <button type="button" title="Remove color" onClick={() => setColors((prev) => prev.filter((_, j) => j !== i))} disabled={colors.length <= 1} className="rounded p-0.5 text-slate-400 hover:text-red-600 disabled:opacity-30"><X size={13} /></button>
                    </span>
                  )}
                </div>
              ))}
            </div>
            {colorsError && <p className="mt-2 text-dbe-meta text-red-600">{colorsError}</p>}
          </div>
        </section>

        {/* OLD: Create/Save on the left. Now right-aligned: note left, Delete, primary last (far right). */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <span className="mr-auto text-dbe-meta text-slate-400">Using a palette copies its colors — later edits here don&apos;t change existing themes or charts.</span>
          {readOnly ? (
            <Button size="sm" variant="secondary" onClick={duplicateBuiltin}><Copy size={13} /> Copy as custom palette</Button>
          ) : (
            <>
              {sel.kind === 'custom' && (
                <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)} disabled={saving}>Delete</Button>
              )}
              <Button size="sm" onClick={save} disabled={saving || !!nameError || !!colorsError || !dirty}>
                {saving ? 'Saving…' : sel.kind === 'custom' ? 'Save changes' : 'Create palette'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Right: palette library */}
      <div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl backdrop-blur-md border border-white/60 dark:border-line shadow-lg p-3" style={{ background: 'var(--glass)' }}>
        {tabs /* Settings → Themes | Color palettes switch */}
        <div className="flex items-center justify-between">
          <span className="text-dbe-h1 font-semibold uppercase tracking-wider text-slate-400">Palette library</span>
          <button type="button" onClick={() => setSel({ kind: 'new' })} className="flex items-center gap-1 text-dbe-body font-semibold text-[#EC7D09] hover:opacity-80">
            <Plus size={13} /> New
          </button>
        </div>
        <p className="text-dbe-h3 font-semibold uppercase tracking-wider text-slate-400">Custom</p>
        {custom.length === 0 && <p className="text-dbe-meta text-slate-400">No custom palettes yet — create one on the left.</p>}
        {custom.map((p) => libraryItem(`c:${p.id}`, p.name, p.colors, sel.kind === 'custom' && String(sel.id) === String(p.id), () => setSel({ kind: 'custom', id: p.id }), false))}
        <p className="mt-2 text-dbe-h3 font-semibold uppercase tracking-wider text-slate-400">Built-in</p>
        {PALETTE_PRESETS.map((p) => libraryItem(`b:${p.name}`, p.name, p.colors, sel.kind === 'builtin' && sel.name === p.name, () => setSel({ kind: 'builtin', name: p.name }), true))}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        tone="danger"
        title="Delete palette"
        message={<>Delete <strong>{selectedCustom?.name}</strong>?</>}
        detail="Themes and charts that already use its colors keep them."
        confirmLabel="Delete"
        busy={saving}
        busyLabel="Deleting…"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
