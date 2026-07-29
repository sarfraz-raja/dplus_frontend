// Shared 3x3 position vocabulary for a widget's title/value text — used by both the style-field
// definition (widgetTypeRegistry.js) and every Widgets/*.jsx component that renders a
// <TitleValueOverlay/> (see that file for how these are consumed).
export const POSITION_OPTIONS = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'mid-left', label: 'Middle left' },
  { value: 'center', label: 'Center' },
  { value: 'mid-right', label: 'Middle right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'bottom-right', label: 'Bottom right' },
];

// Maps a position key to the CSS Grid area name used by TitleValueOverlay.jsx's 3x3 grid.
export const POSITION_GRID_AREA = {
  'top-left': 'tl', 'top-center': 'tc', 'top-right': 'tr',
  'mid-left': 'ml', center: 'mc', 'mid-right': 'mr',
  'bottom-left': 'bl', 'bottom-center': 'bc', 'bottom-right': 'br',
};

// Text alignment that reads naturally for each column — a right-column item's own text
// should right-align, not just be positioned at the right edge with left-aligned text inside.
export const POSITION_TEXT_ALIGN = {
  'top-left': 'left', 'mid-left': 'left', 'bottom-left': 'left',
  'top-center': 'center', center: 'center', 'bottom-center': 'center',
  'top-right': 'right', 'mid-right': 'right', 'bottom-right': 'right',
};

// Flex alignment for the cell's own content box, derived from row (top/mid/bottom ->
// align-items) and column (left/center/right -> justify-content) — each position key is a
// single grid cell, so its own content just needs to hug the correct edge/center within it.
export const POSITION_ALIGN = {
  'top-left': { alignItems: 'flex-start', justifyContent: 'flex-start' },
  'top-center': { alignItems: 'flex-start', justifyContent: 'center' },
  'top-right': { alignItems: 'flex-start', justifyContent: 'flex-end' },
  'mid-left': { alignItems: 'center', justifyContent: 'flex-start' },
  center: { alignItems: 'center', justifyContent: 'center' },
  'mid-right': { alignItems: 'center', justifyContent: 'flex-end' },
  'bottom-left': { alignItems: 'flex-end', justifyContent: 'flex-start' },
  'bottom-center': { alignItems: 'flex-end', justifyContent: 'center' },
  'bottom-right': { alignItems: 'flex-end', justifyContent: 'flex-end' },
};
