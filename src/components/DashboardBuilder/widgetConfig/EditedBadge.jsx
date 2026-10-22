import React from 'react';
import { cn } from '../../../utils/common';

// "Edited" marker for style sections changed since the last save — WidgetStyleFields' group
// headers + Shared / colors boxes, and the outer headers around them (Selected Widget, its Style
// sub-header, the Dashboard style button and its "This dashboard" / "Base theme" sections).
// Driven purely by comparing the current style against the saved one, so it comes back when a
// panel is closed and reopened, and disappears once the change is saved (or undone).

// Unset = undefined / null / '' / [] — the same "not set at this level" test FieldRow uses.
const isUnset = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export const sameStyleValue = (a, b) => {
  if (isUnset(a) && isUnset(b)) return true;
  if (isUnset(a) || isUnset(b)) return false;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return String(a) === String(b);
};

// Whole style objects (raw, incl. `colors.{light,dark}`): true when any key differs.
export const isStyleEdited = (current, saved) => {
  const cur = current || {};
  const old = saved || {};
  const keys = new Set([...Object.keys(cur), ...Object.keys(old)]);
  for (const k of keys) {
    if (k === 'colors') {
      for (const m of ['light', 'dark']) {
        const c = cur.colors?.[m] || {};
        const o = old.colors?.[m] || {};
        for (const ck of new Set([...Object.keys(c), ...Object.keys(o)])) {
          if (!sameStyleValue(c[ck], o[ck])) return true;
        }
      }
    } else if (!sameStyleValue(cur[k], old[k])) return true;
  }
  return false;
};

export default function EditedBadge({ className = '', title = 'Changed since the last save' }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-px text-dbe-meta font-semibold normal-case tracking-normal leading-tight',
        'bg-[#EC7D09]/15 text-[#EC7D09]',
        className,
      )}
    >
      Edited
    </span>
  );
}
