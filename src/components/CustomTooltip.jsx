import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// `wrap` — opt-in for a longer, multi-sentence tooltip (e.g. a chart type's "best for" blurb):
// swaps the default single-line `whitespace-nowrap` bubble for a fixed-width, wrapped card
// instead of a bubble that would otherwise run off the edge of the panel on a long string.
//
// Portaled to document.body with a computed `position: fixed` rect, rather than a plain CSS
// `absolute` child of the trigger — an absolutely-positioned child can never escape an
// ancestor's `overflow: auto/hidden` clipping (e.g. ChartLibrary.jsx's scrollable Data tab
// panel), so the bubble was getting cut off mid-sentence there. A portal renders outside that
// DOM subtree entirely, so the clipping ancestor no longer applies at all.
// Fixed-width bubble estimate for `wrap` mode (matches its `w-56` class, 14rem = 224px) — a
// known width is needed up front so the clamp math below can keep the whole bubble on-screen
// in one pass, without a flicker-inducing measure-then-reposition second render. `nowrap`
// tooltips stay simply centered on the trigger, same as before — short single-line text is
// far less likely to run off the viewport edge, so it isn't worth the same clamping.
const WRAP_WIDTH = 224;
const VIEWPORT_MARGIN = 8;

const CustomTooltip = ({ text, children, wrap = false }) => {
  const [rect, setRect] = useState(null);
  const anchorRef = useRef(null);

  const show = () => setRect(anchorRef.current?.getBoundingClientRect() || null);
  const hide = () => setRect(null);

  // Bubble's own left edge, clamped so it never runs past either viewport edge — centered on
  // the trigger by default, same as before, but pulled back in whenever that would push it
  // off-screen (e.g. an icon near the panel's right edge — see the screenshot this was
  // reported from). `arrowOffset` keeps the little pointer arrow honest about which trigger
  // it's actually pointing at even once the bubble itself has been shifted off-center.
  let bubbleLeft = null;
  let arrowOffset = null;
  if (rect && wrap) {
    const centerX = rect.left + rect.width / 2;
    bubbleLeft = Math.max(VIEWPORT_MARGIN, Math.min(centerX - WRAP_WIDTH / 2, window.innerWidth - WRAP_WIDTH - VIEWPORT_MARGIN));
    arrowOffset = Math.max(10, Math.min(centerX - bubbleLeft, WRAP_WIDTH - 10));
  }

  return (
    <div
      ref={anchorRef}
      className="relative flex flex-col items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {rect && createPortal(
        // Anchored to the trigger's own viewport rect (fixed, not absolute — recalculated
        // fresh on every hover, so scrolling the panel between hovers can't leave a stale
        // position behind) rather than any ancestor's coordinate space.
        <div
          className="pointer-events-none fixed z-[9999] flex flex-col items-center"
          style={wrap
            ? { left: bubbleLeft, top: rect.top, width: WRAP_WIDTH, transform: 'translateY(calc(-100% - 8px))' }
            : { left: rect.left + rect.width / 2, top: rect.top, transform: 'translate(-50%, calc(-100% - 8px))' }}
        >
          <div className={`bg-gray-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-md shadow-lg ${wrap ? 'w-full leading-snug' : 'whitespace-nowrap'}`}>
            {text}
          </div>
          <div
            className="w-0 h-0"
            style={{
              ...(wrap ? { alignSelf: 'flex-start', marginLeft: arrowOffset - 5 } : {}),
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #1f2937',
            }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
};

export default CustomTooltip;
