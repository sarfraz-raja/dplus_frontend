// WCAG relative-luminance contrast math — shared by WidgetStyleFields.jsx's low-contrast
// warning (flags an explicitly-picked color that's near-invisible against its background) and
// TextBox.jsx's own default text color (picks black or white, whichever actually reads against
// its widget's *real* resolved background, rather than a single hardcoded default that goes
// invisible the moment that background is dark — see the conversation both of these were built
// in response to).
export function hexToRgb(hex) {
  // Accepts #rgb shorthand too (a hand-typed `#fff` would otherwise slip past every contrast check).
  const full = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.test(hex || '') ? hex.replace(/^#?(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function relativeLuminance([r, g, b]) {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

// Ratio from 1 (identical) to 21 (black-on-white). Returns null if either color isn't a valid
// hex string (e.g. still 'auto'/unset) — callers treat that as "nothing to check."
export function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Whichever of near-black/near-white actually reads better against `bgHex` — used as a
// computed *default*, not a stored value, so it stays correct even if the background changes
// later (unlike picking one fixed hex up front). Falls back to a theme-appropriate default
// when there's no real background to check against yet (bgHex is null/'auto'/transparent).
export function pickReadableTextColor(bgHex, isDark = false) {
  if (!bgHex) return isDark ? '#F1F5F9' : '#1E293B';
  const whiteRatio = contrastRatio(bgHex, '#FFFFFF') ?? 0;
  const blackRatio = contrastRatio(bgHex, '#0F172A') ?? 0;
  return whiteRatio >= blackRatio ? '#F1F5F9' : '#1E293B';
}
