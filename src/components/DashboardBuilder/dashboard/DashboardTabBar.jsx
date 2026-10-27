import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Copy, Trash2, MoreVertical } from 'lucide-react'; // OLD: Plus, Pencil, Copy, X
import ConfirmModal from '../../ConfirmModal';
import FloatingPanel from '../../FloatingPanel';

let tabUid = 0;
const nextTabId = () => `tab${Date.now()}_${tabUid++}`;

/**
 * Horizontal dashboard-tab strip, shown above the canvas whenever `tabs.length > 0` — a
 * dashboard with zero tabs renders no bar at all (see DashboardCanvasEditor's own additive
 * requirement: tabs are opt-in, existing single-grid dashboards must render unchanged).
 * Deleting a tab removes every widget placed specifically on it (via the same per-widget
 * removeWidget a manual delete uses — see DashboardCanvasEditor's deleteTab), not just this
 * tab's placements: Chart Library widgets only get detached here and stay reusable in the
 * library list, slicers' own backend resource is deleted outright, everything else is fully
 * removed. Widgets with no tabId ("All Tabs") are never touched by a tab delete.
 */
// Underline tabs (option A): one full-width rule under the row, the active tab marked by orange text
// + a 2px orange underline on that rule, the rest plain slate text. Wraps when there are many tabs. `onDarkCanvas`: the dashboard background is dark (DashboardCanvasEditor's canvasIsDark)
// → light rule / text. OLD look: separate pill buttons, the active one solid orange.
// OLD: export default function DashboardTabBar({ tabs, activeTabId, onSelect, onAdd, onRename, onDelete, onCopy, editable }) {
// (Folder tabs joined to a bordered panel — "option B" — were tried 2026-10-21 and dropped in favor of
// these underline tabs.)
export default function DashboardTabBar({ tabs, activeTabId, onSelect, onAdd, onRename, onDelete, onCopy, editable, onDarkCanvas = false }) {
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const inputRef = useRef(null);
  // ⋮ menu: which tab it's open for + the clicked button as its anchor.
  const [menuTabId, setMenuTabId] = useState(null);
  const menuAnchorRef = useRef(null);
  const closeMenu = () => setMenuTabId(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (tab) => {
    setEditingId(tab.id);
    setDraftName(tab.name);
  };

  const commitRename = () => {
    if (editingId && draftName.trim()) {
      onRename(editingId, draftName.trim());
    }
    setEditingId(null);
  };

  const handleAdd = () => {
    const id = nextTabId();
    onAdd(id);
    setEditingId(id);
    setDraftName(`Tab ${tabs.length + 1}`);
  };

  const pendingDeleteTab = tabs.find((t) => t.id === pendingDeleteId);

  return (
    // OLD: <div className="flex items-center gap-1.5 mb-2 flex-wrap">
    // flex-wrap, not overflow-x-auto: a scroll container would clip the active tab's -1px underline.
    <div className={`flex flex-wrap items-end gap-x-4 mb-3 border-b ${onDarkCanvas ? 'border-white/15' : 'border-slate-200'}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isEditing = editingId === tab.id;
        return (
          <div
            key={tab.id}
            // OLD: rounded-lg border px-2.5 py-1.5 text-xs pill; active bg-pbutton text-white.
            className={`group -mb-px flex shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-1 pt-1 pb-2 text-ui-small font-semibold cursor-pointer transition-colors ${
                // OLD: isActive ? 'border-pbutton text-pbutton' — the active label read as black on a dark canvas.
                isActive
                  ? onDarkCanvas ? 'border-pbutton text-white' : 'border-pbutton text-pbutton'
                  : onDarkCanvas
                    ? 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            onClick={() => !isEditing && onSelect(tab.id)}
            onDoubleClick={() => editable && startRename(tab)}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                // OLD: "bg-transparent border-b border-current outline-none w-24 text-inherit" — a broader
                // input rule painted it white on the dark canvas. Forced transparent, tab's own color, accent underline.
                // keep-dark-input: opts out of index.css's dark-mode "every input white !important" rule.
                className={`keep-dark-input w-24 rounded-none border-0 border-b !border-[#EC7D09] px-1 py-0 shadow-none outline-none focus:ring-0 ${
                  onDarkCanvas ? '!bg-white/[0.06] !text-white caret-white' : '!bg-transparent !text-inherit'
                }`}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{tab.name}</span>
            )}
            {/* OLD: three hover icons (Rename pencil, Copy, Delete ×) — now one ⋮ button opening a menu. */}
            {editable && !isEditing && (
              <button
                type="button"
                title="Tab options"
                aria-label={`Options for ${tab.name}`}
                aria-haspopup="menu"
                aria-expanded={menuTabId === tab.id}
                className={`-mr-1 rounded p-0.5 transition-opacity hover:!opacity-100 ${menuTabId === tab.id ? 'opacity-100' : isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-60 focus-visible:opacity-100'} ${onDarkCanvas ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  menuAnchorRef.current = e.currentTarget;
                  setMenuTabId((cur) => (cur === tab.id ? null : tab.id));
                }}
              >
                <MoreVertical size={12} />
              </button>
            )}
          </div>
        );
      })}
      {editable && (
        <button
          type="button"
          title="Add tab"
          aria-label="Add tab"
          onClick={handleAdd}
          // OLD: h-7 w-7 dashed-border box — now a ghost icon sitting on the tab row's baseline.
          className={`mb-1.5 flex items-center justify-center h-6 w-6 rounded-md transition-colors ${onDarkCanvas ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-pbutton hover:bg-slate-100'}`}
        >
          <Plus size={13} />
        </button>
      )}
      {/* OLD: minWidth={150} — too wide for three short items. */}
      <FloatingPanel anchorRef={menuAnchorRef} open={!!menuTabId} onClose={closeMenu} minWidth={112} align="start">
        <div role="menu" className="flex flex-col py-1">
          {[
            { key: 'rename', label: 'Rename', icon: Pencil, run: (t) => startRename(t) },
            ...(onCopy ? [{ key: 'copy', label: 'Duplicate', icon: Copy, run: (t) => onCopy(t.id), hint: 'Widgets become independent copies' }] : []),
            { key: 'delete', label: 'Delete', icon: Trash2, run: (t) => setPendingDeleteId(t.id), danger: true },
          ].map(({ key, label, icon: Icon, run, hint, danger }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              title={hint}
              onClick={() => { const t = tabs.find((x) => x.id === menuTabId); closeMenu(); if (t) run(t); }}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-left text-dbe-body ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-[#EC7D09]/[0.08]'}`}
            >
              <Icon size={12} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </FloatingPanel>
      <ConfirmModal
        isOpen={!!pendingDeleteId}
        // The last tab is only a reference — removing it keeps every widget (see deleteTab in
        // DashboardCanvasEditor). Any other tab takes its own widgets with it.
        title={tabs.length === 1 ? 'Remove tabs?' : 'Delete tab?'}
        message={tabs.length === 1
          ? `"${pendingDeleteTab?.name || ''}" is the only tab. Removing it turns this back into a single-page dashboard — all its widgets are kept.`
          : `Delete "${pendingDeleteTab?.name || ''}"? Widgets placed on this tab will be removed from the dashboard (chart library widgets stay in Your Widgets and can be re-added). Widgets shown on All Tabs are unaffected.`}
        confirmLabel={tabs.length === 1 ? 'Remove tab' : 'Delete'}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          onDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
