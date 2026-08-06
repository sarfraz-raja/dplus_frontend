import React, { useEffect, useRef } from 'react';
import { ChevronsDown, ChevronsUp } from 'lucide-react';

/**
 * Right-click menu on a single chart point — "Drill down into X" / "Drill up", anchored at
 * the click coordinates (fixed positioning, viewport-relative, matching where the native
 * browser context menu it replaces would have appeared). Unlike the toolbar's up/down icons
 * (DashboardCanvasEditor.jsx's widget action row, which always drill into the top-ranked
 * category), "Drill down" here targets the EXACT point that was right-clicked — the actual
 * per-point drill interaction, not a chart-wide shortcut.
 */
export default function DrillContextMenu({ x, y, label, canDrillDown, canDrillUp, onDrillDown, onDrillUp, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handlePointerDown = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    // Scrolling/resizing invalidates the anchored (x, y) — closing rather than trying to
    // reposition matches how a native context menu behaves.
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg text-xs"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        disabled={!canDrillDown}
        onClick={onDrillDown}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <ChevronsDown size={13} className="shrink-0" />
        <span className="truncate">Drill down into "{label}"</span>
      </button>
      <button
        type="button"
        disabled={!canDrillUp}
        onClick={onDrillUp}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <ChevronsUp size={13} className="shrink-0" />
        <span>Drill up one level</span>
      </button>
    </div>
  );
}
