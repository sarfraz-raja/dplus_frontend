import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { pickReadableTextColor } from '../DashboardBuilder/utils/contrast';
import useInlineTextEdit from './useInlineTextEdit';

/**
 * A plain static text widget — Power BI's own "Text box" (Insert ribbon). Unlike every other
 * widget in this registry, it binds to no datasource at all: its content is typed directly by
 * the user and stored on the widget's own `style.text` (see DashboardCanvasEditor.jsx's
 * addWidget 'textBox' branch, which skips the generic WidgetCreateWizard entirely — there's no
 * data source step to run). Edited in place: double-click enters a plain textarea; blur/Escape
 * commits back to `style.text` via `onTextChange` and returns to the read view.
 */
export default function TextBox({
  text = '', fontFamily = '', fontSize = 14, fontWeight = 'normal', color = null,
  textAlign = 'left', bgColor = null, isDark: isDarkProp = null, editable = false, onTextChange,
}) {
  const { theme } = useTheme();
  const isDark = typeof isDarkProp === 'boolean' ? isDarkProp : theme === 'dark';
  const { editing, draft, setDraft, startEditing, commit, cancel } = useInlineTextEdit(text, onTextChange);

  // `color` has no field.default of its own (see widgetTypeRegistry.js's textBox entry) — a
  // single hardcoded default here would go invisible the moment this widget's own bgColor
  // is dark (exactly the bug reported: a plain "always dark slate" default over an inherited
  // dark dashboard background). Computed from the widget's *actual* resolved background
  // instead, so it stays legible regardless of theme or a dashboard-level bgColor override.
  const resolvedColor = color || pickReadableTextColor(bgColor, isDark);

  const textStyle = {
    fontFamily: fontFamily || undefined,
    fontSize: `${fontSize}px`,
    fontWeight: fontWeight === 'bold' ? 700 : fontWeight === 'semibold' ? 600 : fontWeight === 'medium' ? 500 : 400,
    color: resolvedColor,
    textAlign,
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
        className="h-full w-full box-border resize-none border-none outline-none p-2"
        style={{ ...textStyle, background: bgColor || 'transparent' }}
      />
    );
  }

  return (
    <div
      className="h-full w-full box-border overflow-auto p-2 whitespace-pre-wrap"
      style={{ ...textStyle, background: bgColor || 'transparent' }}
      onDoubleClick={editable ? startEditing : undefined}
      title={editable ? 'Double-click to edit' : undefined}
    >
      {text || (editable ? <span className="opacity-40">Double-click to add text…</span> : '')}
    </div>
  );
}
