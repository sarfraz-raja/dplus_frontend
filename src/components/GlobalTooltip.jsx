import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// App-wide styled tooltip, mounted once in App.jsx. Takes over every native `title="…"` tooltip
// (the browser's plain box) without touching any page: on hover/focus the element's `title` is
// moved to `data-dp-title` (so the native one doesn't also appear) and shown in this bubble —
// app navy (same as the toasts), white text, an arrow pointing at the element. The `title` is put
// back when the tooltip hides, so code that reads it keeps working.
// Placement: above the element, or below when there's no room; kept inside the viewport.
// Opt out on one element with `data-no-tooltip` (it keeps the native title).
const SHOW_DELAY = 350;
const GAP = 8;
const MARGIN = 8;
// OLD: const BG = '#121833'; — now the --tooltip-bg / --tooltip-fg tokens in index.css.
const BG = 'var(--tooltip-bg)';
const FG = 'var(--tooltip-fg)';

const findTarget = (node) => {
  const el = node instanceof Element ? node.closest('[title], [data-dp-title]') : null;
  if (!el || el.closest('[data-no-tooltip]')) return null;
  const text = el.getAttribute('title') || el.getAttribute('data-dp-title');
  return text && text.trim() ? el : null;
};

// Text cut off with "…" (text-overflow: ellipsis, or a line clamp) shows its FULL text on hover, app-wide,
// with no code at the call site. Checked on the hovered element and up to 3 ancestors; only when the
// text really overflows. An element's own `title` still wins (it may say more than the text).
const findTruncated = (node) => {
  let el = node instanceof Element ? node : null;
  for (let i = 0; el && i < 4; i += 1, el = el.parentElement) {
    if (el.closest('[data-no-tooltip]')) return null;
    const cs = window.getComputedStyle(el);
    const clipped = cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
    if (clipped && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
      const text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el.value : el.innerText || '').trim();
      return text ? { el, text } : null;
    }
  }
  return null;
};

export default function GlobalTooltip() {
  const [tip, setTip] = useState(null); // { text, rect }
  const [pos, setPos] = useState(null); // { left, top, placement, arrowLeft }
  const activeRef = useRef(null);
  const timerRef = useRef(null);
  const bubbleRef = useRef(null);

  useEffect(() => {
    const restore = () => {
      const el = activeRef.current;
      if (el && el.hasAttribute('data-dp-title')) {
        if (!el.getAttribute('title')) el.setAttribute('title', el.getAttribute('data-dp-title'));
        el.removeAttribute('data-dp-title');
      }
      activeRef.current = null;
    };
    const hide = () => { clearTimeout(timerRef.current); restore(); setTip(null); setPos(null); };
    // `fullText`: given for cut-off text (findTruncated) — no title attribute to move aside.
    const show = (el, fullText = null) => {
      if (activeRef.current === el) return;
      hide();
      const text = fullText || el.getAttribute('title') || el.getAttribute('data-dp-title');
      if (!fullText) {
        el.setAttribute('data-dp-title', text);
        el.removeAttribute('title'); // suppress the native tooltip
      }
      activeRef.current = el;
      timerRef.current = setTimeout(() => {
        if (activeRef.current === el && el.isConnected) setTip({ text, rect: el.getBoundingClientRect() });
      }, SHOW_DELAY);
    };
    const onOver = (e) => {
      const el = findTarget(e.target);
      if (el) { show(el); return; }
      const cut = findTruncated(e.target);
      if (cut) show(cut.el, cut.text);
    };
    const onOut = (e) => {
      const el = activeRef.current;
      if (el && !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) hide();
    };
    const onFocusIn = (e) => { const el = findTarget(e.target); if (el && e.target === el) show(el); };
    const onKey = (e) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', hide, true);
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      hide();
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', hide, true);
      document.removeEventListener('mousedown', hide, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  // Measure the bubble, then place it: centered above the element, flipped below if it doesn't
  // fit, clamped to the viewport; the arrow keeps pointing at the element's center.
  useEffect(() => {
    if (!tip || !bubbleRef.current) return;
    const { width, height } = bubbleRef.current.getBoundingClientRect();
    const r = tip.rect;
    const center = r.left + r.width / 2;
    const placement = r.top - height - GAP < MARGIN ? 'bottom' : 'top';
    const top = placement === 'top' ? r.top - height - GAP : r.bottom + GAP;
    const left = Math.max(MARGIN, Math.min(center - width / 2, window.innerWidth - width - MARGIN));
    setPos({ left, top, placement, arrowLeft: Math.max(10, Math.min(center - left, width - 10)) });
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div
      ref={bubbleRef}
      role="tooltip"
      className="pointer-events-none fixed z-[10000] max-w-[280px] rounded-md px-2.5 py-1.5 text-[12px] font-semibold leading-snug shadow-lg backdrop-blur-sm"
      style={{
        background: BG,
        color: FG,
        left: pos ? pos.left : -9999,
        top: pos ? pos.top : -9999,
        whiteSpace: 'pre-line',
        transition: 'opacity .12s',
        opacity: pos ? 1 : 0,
      }}
    >
      {tip.text}
      {pos && (
        <span
          aria-hidden="true"
          className="absolute h-0 w-0"
          style={{
            left: pos.arrowLeft - 5,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            ...(pos.placement === 'top'
              ? { bottom: -5, borderTop: `5px solid ${BG}` }
              : { top: -5, borderBottom: `5px solid ${BG}` }),
          }}
        />
      )}
    </div>,
    document.body,
  );
}
