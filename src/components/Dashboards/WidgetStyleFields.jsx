import React from 'react';

/**
 * Renders the style controls for a selected widget, driven entirely by its type's
 * `styleFields` metadata (see widgetTypeRegistry.js) — one generic renderer instead of
 * hand-written fields per widget type. `value` is the widget's raw `style` object
 * (may be missing keys — falls back to each field's own `default` for display only;
 * `onChange` is only called with the field actually edited).
 */
export default function WidgetStyleFields({ fields = [], value = {}, onChange }) {
  if (!fields.length) {
    return <div className="dbe-style-empty">No style options for this widget.</div>;
  }

  return (
    <>
      {fields.map((field) => {
        const current = value?.[field.key] ?? field.default ?? '';
        if (field.type === 'color') {
          return (
            <label key={field.key}>
              {field.label}
              <input
                type="color"
                style={{ width: '100%', height: 28, padding: 2, cursor: 'pointer' }}
                value={current || '#000000'}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            </label>
          );
        }
        if (field.type === 'select') {
          return (
            <label key={field.key}>
              {field.label}
              <select value={current} onChange={(e) => onChange(field.key, e.target.value)}>
                {(field.options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          );
        }
        if (field.type === 'number') {
          return (
            <label key={field.key}>
              {field.label}
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={current}
                onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
          );
        }
        return null;
      })}
    </>
  );
}
