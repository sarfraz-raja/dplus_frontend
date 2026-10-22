import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Shared floating panel for every dropdown / popover / picker list. Rendered in a portal on
// <body> with fixed positioning, so NO ancestor's overflow (a scrolling side panel, a card with
// overflow-hidden) can ever clip it. Placed under its anchor, flipped above when there isn't
// room below, kept inside the viewport, at least as wide as the anchor (`minWidth` for more),
// scrolls internally past `maxHeight`. Follows the anchor on scroll/resize; closes on outside
// click (anchor clicks are ignored — the anchor's own onClick toggles) and on Escape.
//
// Usage:
//   const anchorRef = useRef(null);
//   <button ref={anchorRef} onClick={() => setOpen((o) => !o)}>…</button>
//   <FloatingPanel anchorRef={anchorRef} open={open} onClose={() => setOpen(false)}>…list…</FloatingPanel>
const GAP = 6;
const MARGIN = 8;

export default function FloatingPanel({
  anchorRef, open, onClose, children, minWidth = 0, maxHeight = 420, align = 'start', className = '',
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined; }
    let retry = 0;
    let tries = 0;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      // OLD: if (!r) return; — when the panel is rendered INSIDE its own anchor (e.g. FilterPanel's
      // popover), this layout effect runs before React attaches the parent's ref, so the anchor was
      // still null, nothing was placed and the panel never opened. Retry on the next frame instead.
      if (!r) { if (tries++ < 10) retry = requestAnimationFrame(place); return; }
      const width = Math.min(Math.max(r.width, minWidth), window.innerWidth - MARGIN * 2);
      const wantLeft = align === 'end' ? r.right - width : r.left;
      const left = Math.max(MARGIN, Math.min(wantLeft, window.innerWidth - width - MARGIN));
      const below = window.innerHeight - r.bottom - MARGIN - GAP;
      const above = r.top - MARGIN - GAP;
      const up = below < Math.min(maxHeight, 240) && above > below;
      setPos(up
        ? { left, width, bottom: window.innerHeight - r.top + GAP, maxHeight: Math.min(maxHeight, above) }
        : { left, width, top: r.bottom + GAP, maxHeight: Math.min(maxHeight, below) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { cancelAnimationFrame(retry); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, anchorRef, minWidth, maxHeight, align]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      // A click inside another floating panel (e.g. a dropdown nested in this one) isn't "outside".
      if (e.target instanceof Element && e.target.closest('[data-floating-panel]')) return;
      onClose?.();
    };
    // preventDefault: Esc closes this list only, not an enclosing modal (FormModal checks defaultPrevented).
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose?.(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, onClose, anchorRef]);

  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={panelRef}
      data-floating-panel=""
      // Opened from inside the Dashboard Builder (.dbe-font) → the portaled list uses the same UI font.
      className={`fixed z-[5000] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${anchorRef.current?.closest?.('.dbe-font') ? 'dbe-font' : ''} ${className}`}
      style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
    >
      {children}
    </div>,
    document.body,
  );
}
