import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsDown, ChevronsUp, Filter } from 'lucide-react';

/**
 * Right-click menu on a single chart point — "Drill down into X" / "Drill up" / "Cross-filter
 * by X", anchored at the click coordinates (fixed positioning, viewport-relative, matching
 * where the native browser context menu it replaces would have appeared). Unlike the toolbar's
 * up/down icons (DashboardCanvasEditor.jsx's widget action row, which always drill into the
 * top-ranked category), "Drill down" here targets the EXACT point that was right-clicked — the
 * actual per-point drill interaction, not a chart-wide shortcut. "Cross-filter by X" exists
 * here specifically so a widget configured for BOTH drill-down and cross-filter still has a
 * way to trigger cross-filter — left-click on such a widget always drills (see
 * DashboardCanvasEditor.jsx's handleWidgetPointClickRef priority), so this menu is the only
 * path to the non-default action; canCrossFilter/onCrossFilter are simply omitted (button
 * hidden) on a widget where cross-filter isn't configured at all.
 *
 * Rendered via a portal straight onto document.body — every widget tile sits inside a
 * react-grid-layout item positioned with a CSS `transform`, which creates its own containing
 * block for `position: fixed` descendants (a CSS quirk: `fixed` only anchors to the viewport
 * when no transformed ancestor exists). Without the portal this menu ends up "fixed" relative
 * to its own widget tile instead, clipped by that tile's overflow and barely visible at its
 * edge rather than floating over the whole dashboard at the actual click point.
 */
export default function DrillContextMenu({
  x, y, label, showDrillSection, canDrillDown, canDrillUp, canCrossFilter, onDrillDown, onDrillUp, onCrossFilter, onClose,
}) {
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

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg text-xs"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {showDrillSection && (
        <>
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
        </>
      )}
      {showDrillSection && canCrossFilter && (
        <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
      )}
      {canCrossFilter && (
        <button
          type="button"
          onClick={onCrossFilter}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Filter size={13} className="shrink-0" />
          <span className="truncate">Cross-filter by "{label}"</span>
        </button>
      )}
    </div>,
    document.body,
  );
}
