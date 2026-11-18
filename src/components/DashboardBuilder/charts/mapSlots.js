import { useEffect, useRef, useState } from 'react';

// Page-wide cap on how many Map charts draw at once. Each live map holds 2 WebGL contexts
// (<DeckGL> + MapLibre's <Map>) and browsers keep only ~16 per page — past that the oldest canvas
// goes blank. Slots go to the maps on screen in reading order (top → bottom, then left → right),
// so the first MAX_LIVE_MAPS always draw and the rest wait — never a random pick. Re-ranked
// once per frame whenever a map comes on/off screen, so a zoom or re-render can't reshuffle them.
// 6 maps = 12 contexts, leaving headroom under the ~16 cap.
// OLD: export const MAX_LIVE_MAPS = 4;
export const MAX_LIVE_MAPS = 6;

// Rows within this many px count as the same row (cards in one grid row can be a pixel apart).
const ROW_TOLERANCE = 8;

const entries = new Map(); // id -> { el, grant, granted }
let frame = null;

function allocate() {
  frame = null;
  const ranked = [...entries.values()].map((e) => {
    const r = e.el?.getBoundingClientRect?.();
    return { e, top: r ? Math.round(r.top / ROW_TOLERANCE) : Infinity, left: r ? r.left : Infinity };
  }).sort((a, b) => a.top - b.top || a.left - b.left);
  ranked.forEach(({ e }, i) => {
    const granted = i < MAX_LIVE_MAPS;
    if (e.granted !== granted) { e.granted = granted; e.grant(granted); }
  });
}

function scheduleAllocate() {
  if (frame !== null) return;
  frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(allocate) : setTimeout(allocate, 0);
}

// true while this map holds a slot. `wanted` = the map is on screen; `elRef` = its container,
// used for its position in the reading order.
export function useMapSlot(wanted, elRef) {
  const idRef = useRef(null);
  if (!idRef.current) idRef.current = Symbol('map-chart');
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    if (!wanted) return undefined;
    const id = idRef.current;
    entries.set(id, { el: elRef?.current, grant: setGranted, granted: false });
    scheduleAllocate();
    return () => { entries.delete(id); setGranted(false); scheduleAllocate(); };
  }, [wanted, elRef]);
  return granted;
}
