import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { pickReadableTextColor } from '../DashboardBuilder/utils/contrast';
import useInlineTextEdit from './useInlineTextEdit';

/**
 * A basic static shape — Power BI's own Shapes flyout, scoped to a handful of the most-used
 * ones (a background panel, an accent marker, a divider line, a callout/pointer, a status
 * marker) rather than its full ~12-shape gallery. One widget type (`shape`) with a `shapeKind`
 * select rather than a separate palette entry per shape (Rectangle button, Ellipse button,
 * Line button) — switching shape is just another style field, the same way Title position is a
 * field, not nine separate widget types. No datasource (dataShape: null, same as Text Box) —
 * every prop here is pure style.
 *
 * Triangle/Diamond/Arrow are drawn with `clip-path: polygon(...)` rather than actual SVG —
 * enough for a flat-filled shape at any size, and it keeps using the exact same div (fill,
 * opacity, rotation, text overlay) every other kind already uses instead of a second rendering
 * path. The tradeoff: `border`/`cornerRadius` don't really apply to a clipped polygon (a CSS
 * border still draws as a plain rectangle underneath, then gets clipped along with everything
 * else), so those two fields stay meaningful only for Rectangle/Ellipse — see their own hints
 * in widgetTypeRegistry.js.
 *
 * Every kind but Line can also hold text — the same "any shape can be a labeled box" capability
 * Word/PowerPoint's own shapes have (double-click to edit, Insert > Text Box is really just a
 * borderless rectangle under the hood there too). Line has no text — a bare divider has no
 * "inside" for a label to sit in, same as Word's own line shapes never offering Add Text.
 * Editing reuses TextBox.jsx's own useInlineTextEdit hook rather than re-deriving the same
 * draft/commit/cancel state machine here.
 */
const CLIP_PATHS = {
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  cross: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)',
  arrow: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
};
export default function Shape({
  shapeKind = 'rectangle', fillColor = '#EC7D09', borderColor = null, borderWidth = 0,
  cornerRadius = 0, rotation = 0, opacity = 100,
  text = '', fontFamily = '', fontSize = 14, fontWeight = 'normal', textColor = null, textAlign = 'center',
  isDark: isDarkProp = null, editable = false, onTextChange,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { editing, draft, setDraft, startEditing, commit, cancel } = useInlineTextEdit(text, onTextChange);
  const box = { opacity: (opacity ?? 100) / 100 };

  if (shapeKind === 'line') {
    // A line is just a thin, full-width bar — `borderWidth` doubles as its thickness here
    // (there's no separate fill to speak of), `rotation` tilts it in place around its own
    // center so it can read as horizontal, vertical, or diagonal.
    return (
      <div className="h-full w-full flex items-center justify-center" style={box}>
        <div
          style={{
            width: '100%',
            height: Math.max(1, borderWidth || 2),
            background: borderColor || fillColor,
            transform: rotation ? `rotate(${rotation}deg)` : undefined,
          }}
        />
      </div>
    );
  }

  // Same "compute a readable default from the actual background" approach TextBox.jsx uses —
  // a single hardcoded default would go invisible the moment fillColor is dark.
  const resolvedTextColor = textColor || pickReadableTextColor(fillColor, isDark);
  const textStyle = {
    fontFamily: fontFamily || undefined,
    fontSize: `${fontSize}px`,
    fontWeight: fontWeight === 'bold' ? 700 : fontWeight === 'semibold' ? 600 : fontWeight === 'medium' ? 500 : 400,
    color: resolvedTextColor,
    textAlign,
  };
  const clipPath = CLIP_PATHS[shapeKind];
  const shapeStyle = {
    ...box,
    background: fillColor,
    // Border/corner-radius only really read correctly on a plain box — see this file's own
    // doc comment on why a clipped polygon (Triangle/Diamond/Arrow) skips both.
    border: !clipPath && borderWidth ? `${borderWidth}px solid ${borderColor || fillColor}` : undefined,
    borderRadius: clipPath ? undefined : shapeKind === 'ellipse' ? '50%' : (cornerRadius || 0),
    clipPath,
    // Rotation applies to every shape, not just Line — every real shape tool (Word, PowerPoint,
    // Power BI) treats it as universal.
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  };

  if (editing) {
    return (
      <div className="h-full w-full box-border" style={shapeStyle}>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
          // A rectangular editing surface centered within the (possibly non-rectangular)
          // shape, inset from the edges so typing doesn't immediately collide with an
          // ellipse's own curve — matches where the read-view's centered text sits too.
          className="w-full h-full box-border resize-none border-none outline-none bg-transparent p-3"
          style={textStyle}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full w-full box-border flex items-center justify-center p-3 whitespace-pre-wrap"
      style={shapeStyle}
      onDoubleClick={editable ? startEditing : undefined}
      title={editable ? 'Double-click to add/edit text' : undefined}
    >
      {text && <span style={textStyle}>{text}</span>}
    </div>
  );
}
