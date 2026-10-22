import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Copy, X } from 'lucide-react';
import ConfirmModal from '../../ConfirmModal';

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
                isActive
                  ? 'border-pbutton text-pbutton'
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
                className="bg-transparent border-b border-current outline-none w-24 text-inherit"
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
            {editable && !isEditing && (
              <>
                <button
                  type="button"
                  title="Rename tab"
                  aria-label="Rename tab"
                  className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); startRename(tab); }}
                >
                  <Pencil size={11} />
                </button>
                {onCopy && (
                  <button
                    type="button"
                    title="Copy tab (widgets become independent copies)"
                    aria-label="Copy tab"
                    className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onCopy(tab.id); }}
                  >
                    <Copy size={11} />
                  </button>
                )}
                <button
                  type="button"
                  title="Delete tab"
                  aria-label="Delete tab"
                  className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setPendingDeleteId(tab.id); }}
                >
                  <X size={11} />
                </button>
              </>
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
