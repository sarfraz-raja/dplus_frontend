// Light/dark-aware widget style helpers.
//
// A style object keeps its shared settings (sizes, weights, fonts, positions, show/hide…) flat,
// exactly as before, and MAY carry per-mode colors next to them:
//   { titleSize: 11, titleColor: '#fff' /* legacy: both modes */,
//     colors: { light: { titleColor: '#1a1a18' }, dark: { titleColor: '#eef1f6' } } }
// `resolveStyleForMode` flattens that for the active theme, so every downstream consumer
// (cascade, chart components) keeps reading plain flat keys and never learns about modes.
// `guardStyleColors` is the render-time safety net for a color that can't be read against its
// background (e.g. a white title saved in dark mode, now shown on light mode's white card).
import { contrastRatio, pickReadableTextColor } from './contrast';

export const STYLE_COLORS_KEY = 'colors';
export const MODES = ['light', 'dark'];
// Same threshold WidgetStyleFields' "Barely visible against its background" warning uses.
export const LOW_CONTRAST_THRESHOLD = 1.8;

export const modeKey = (isDark) => (isDark ? 'dark' : 'light');
// Default widget surface per mode (same values ChartLibrary.jsx/DashboardCanvasEditor.jsx use
// for `resolvedBgColor`) — what text is actually drawn on when no bgColor/gradient is set.
export const surfaceBg = (isDark) => (isDark ? '#22273C' : '#ffffff');

const definedEntries = (obj) => Object.fromEntries(
  Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
);

// Shallow-merges style layers (later wins), but merges `colors.light`/`colors.dark` per key so a
// placement that only overrides its dark title color doesn't wipe the chart's light colors.
export function mergeStyleLayers(...layers) {
  const out = {};
  const colors = { light: {}, dark: {} };
  let hasColors = false;
  for (const layer of layers) {
    if (!layer) continue;
    const { [STYLE_COLORS_KEY]: layerColors, ...flat } = layer;
    Object.assign(out, flat);
    // A later layer's plain (both-modes) value for a key beats an earlier layer's per-mode
    // entries for it; the layer's own `colors` (merged just below) then win over that again.
    for (const [k, v] of Object.entries(flat)) {
      if (v === undefined || v === null || v === '') continue;
      for (const m of MODES) delete colors[m][k];
    }
    if (layerColors) {
      hasColors = true;
      for (const m of MODES) Object.assign(colors[m], definedEntries(layerColors[m]));
    }
  }
  if (hasColors) out[STYLE_COLORS_KEY] = colors;
  return out;
}

// Flat style for the active theme: this mode's colors override the flat/legacy keys.
export function resolveStyleForMode(style, isDark) {
  if (!style) return style;
  const { [STYLE_COLORS_KEY]: colors, ...flat } = style;
  const overlay = colors?.[modeKey(isDark)];
  return overlay ? { ...flat, ...definedEntries(overlay) } : flat;
}

const isUnreadable = (fg, bg) => {
  const ratio = contrastRatio(fg, bg);
  return ratio != null && ratio < LOW_CONTRAST_THRESHOLD;
};

// Drops any explicit text/line color that would be near-invisible on what it's drawn on, so the
// component falls back to its own theme-correct default instead. Non-hex values (rgba, 'auto',
// 'transparent') can't be measured and are left alone.
export function guardStyleColors(style, isDark) {
  if (!style) return style;
  const bg = style.bgColor || style.bgGradient?.[0] || style.bgGradientFrom || surfaceBg(isDark);
  const out = { ...style };
  const check = (key, against) => { if (out[key] && isUnreadable(out[key], against)) delete out[key]; };
  check('titleColor', style.titleBgColor || bg);
  check('valueTextColor', bg);
  check('axisTextColor', bg);
  check('color', bg);
  // Band/header text has no theme-aware fallback of its own to drop back to — unlike
  // title/value/axis text, which fall back to the component's own theme-matched default color
  // when dropped above, VirtualizedTable.jsx's <td>/<th> fall back to a FIXED Tailwind class
  // (`dark:text-white/70`) that has no idea what Band/Header background was actually picked.
  // So instead of just dropping an unreadable value and hoping the fallback works, these two are
  // actively COMPUTED whenever their background is set — text on a custom-colored band/header
  // row is then always readable in both modes, not only when the saved color happens to still
  // read fine in the mode it's viewed in.
  if (style.bandColor) {
    out.bandTextColor = (style.bandTextColor && !isUnreadable(style.bandTextColor, style.bandColor))
      ? style.bandTextColor
      : pickReadableTextColor(style.bandColor, isDark);
  } else {
    check('bandTextColor', bg);
  }
  if (style.headerBgColor) {
    out.headerTextColor = (style.headerTextColor && !isUnreadable(style.headerTextColor, style.headerBgColor))
      ? style.headerTextColor
      : pickReadableTextColor(style.headerBgColor, isDark);
  } else {
    check('headerTextColor', bg);
  }
  return out;
}

const pickWhere = (obj, pred) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => pred(k)));
const hasAnyColors = (colors) => MODES.some((m) => Object.keys(colors?.[m] || {}).length > 0);

// Splits a style into shared keys + per-mode colors. A legacy flat color (one hex meant for both
// modes) becomes an explicit entry in BOTH modes, unless that mode already has its own.
export function normalizeColors(style, colorKeys) {
  const { [STYLE_COLORS_KEY]: rawColors, ...flatAll } = style || {};
  const colors = { light: { ...(rawColors?.light || {}) }, dark: { ...(rawColors?.dark || {}) } };
  const flat = { ...flatAll };
  for (const k of colorKeys) {
    const v = flat[k];
    if (v !== undefined && v !== null && v !== '') {
      for (const m of MODES) if (colors[m][k] === undefined) colors[m][k] = v;
    }
    delete flat[k];
  }
  return { flat, colors };
}

// Sets (or, with an empty value, clears) ONE color for ONE mode, leaving the other mode alone.
// A legacy flat value for that key is first migrated into both modes, so editing it in light
// mode doesn't silently drop what dark mode was showing.
export function setModeColor(style, key, value, isDark, colorKeys) {
  const { flat, colors } = normalizeColors(style, colorKeys);
  const m = modeKey(isDark);
  // An empty palette (array) counts as "unset" too — same as clearing a single color.
  if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) delete colors[m][key];
  else colors[m][key] = value;
  return { ...flat, ...(hasAnyColors(colors) ? { [STYLE_COLORS_KEY]: colors } : {}) };
}

// "Copy style from another chart": REPLACES every style field this chart type has (`allowedKeys`)
// with the source's — shared settings and both modes' colors — so a field the source never set
// is cleared here too. Keys outside `allowedKeys` (column_widths, cellFormatRules…) are kept.
// Returns the new style plus what was copied / cleared / skipped, for the "View copied keys" panel.
export function copyStyleFields(baseStyle, sourceStyle, allowedKeys, colorKeys) {
  const base = normalizeColors(baseStyle, colorKeys);
  const src = normalizeColors(sourceStyle, colorKeys);
  const inField = (k) => allowedKeys.has(k);
  const copiedFlat = pickWhere(src.flat, inField);
  const copiedColors = { light: pickWhere(src.colors.light, inField), dark: pickWhere(src.colors.dark, inField) };
  const colors = {
    light: { ...pickWhere(base.colors.light, (k) => !inField(k)), ...copiedColors.light },
    dark: { ...pickWhere(base.colors.dark, (k) => !inField(k)), ...copiedColors.dark },
  };
  return {
    style: {
      ...pickWhere(base.flat, (k) => !inField(k)),
      ...copiedFlat,
      ...(hasAnyColors(colors) ? { [STYLE_COLORS_KEY]: colors } : {}),
    },
    copied: { ...copiedFlat, ...(hasAnyColors(copiedColors) ? { [STYLE_COLORS_KEY]: copiedColors } : {}) },
    cleared: [
      ...Object.keys(base.flat).filter((k) => inField(k) && !(k in copiedFlat)),
      ...MODES.flatMap((m) => Object.keys(base.colors[m]).filter((k) => inField(k) && !(k in copiedColors[m])).map((k) => `${m}.${k}`)),
    ],
    skipped: [
      ...Object.keys(src.flat).filter((k) => !inField(k)),
      ...MODES.flatMap((m) => Object.keys(src.colors[m]).filter((k) => !inField(k)).map((k) => `${m}.${k}`)),
    ],
  };
}

// Number of individual settings in a `copied` result (shared keys + each mode's color entries).
export const countCopiedSettings = (copied) => {
  const { [STYLE_COLORS_KEY]: colors, ...flat } = copied || {};
  return Object.keys(flat).length + MODES.reduce((n, m) => n + Object.keys(colors?.[m] || {}).length, 0);
};
