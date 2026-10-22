import { useEffect, useState } from 'react';
import { listPalettes } from '../../../store/actions/dashboardBuilder-actions';

// One shared list of CUSTOM colour palettes (GET /dashboard-builder/palettes) for every palette
// dropdown (Theme, Dashboard style, Charts tab) and the Settings → Color palettes page. Fetched
// once per session (quietly, no global loader); `refreshPalettes()` after a create / edit / delete
// updates every mounted dropdown. Built-in palettes stay in theme/tokens.js (PALETTE_PRESETS).
let cache = null;          // array once loaded
let inFlight = null;       // promise while loading
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(cache));

export function refreshPalettes() {
  inFlight = listPalettes({ quiet: true })
    .then((list) => { cache = list; notify(); return list; })
    .catch(() => { cache = cache || []; notify(); return cache; })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export default function usePalettes() {
  const [palettes, setPalettes] = useState(cache);
  useEffect(() => {
    listeners.add(setPalettes);
    if (!cache && !inFlight) refreshPalettes();
    return () => { listeners.delete(setPalettes); };
  }, []);
  return palettes || [];
}
