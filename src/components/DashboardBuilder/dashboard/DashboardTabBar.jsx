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
export default function DashboardTabBar({ tabs, activeTabId, onSelect, onAdd, onRename, onDelete, onCopy, editable }) {
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
    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isEditing = editingId === tab.id;
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              isActive
                ? 'bg-pbutton text-white border-pbutton'
                : 'bg-white dark:bg-[var(--topbar)] text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
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
          className="flex items-center justify-center h-7 w-7 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-pbutton hover:border-pbutton transition-colors"
        >
          <Plus size={13} />
        </button>
      )}
      <ConfirmModal
        isOpen={!!pendingDeleteId}
        title="Delete tab?"
        message={`Delete "${pendingDeleteTab?.name || ''}"? Widgets placed on this tab will be removed from the dashboard (chart library widgets stay in Your Widgets and can be re-added). Widgets shown on All Tabs are unaffected.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          onDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
