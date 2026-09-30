import React from 'react';
import CustomTooltip from '../CustomTooltip';

/**
 * A field's `hint` (e.g. Band color's "alternating rows only" note, a timezone default) shown
 * as a small "**" marker instead of an always-visible caption line — hover/focus reveals the
 * full text via the shared CustomTooltip (portaled, so it isn't clipped by a scrollable style
 * panel). Replaces the identical always-on `<span>{field.hint}</span>` caption previously
 * duplicated across MappingFields.jsx (select/numberUnit fields) and WidgetStyleFields.jsx
 * (ColorRow) — same "make UI consistent" reasoning as ColumnMultiSelect's own extraction: one
 * shared hint treatment everywhere a field defines `hint`, not a per-file reimplementation.
 * Saves vertical space in these already-tight side panels, which a permanent caption line eats
 * into on every field that has one, whether or not the user cares to read it.
 */
export default function FieldHintMark({ hint }) {
  if (!hint) return null;
  return (
    // CustomTooltip's own root is a block-level `flex flex-col` div (fine for its other,
    // already-block callers) — wrapped in `inline-block` here so it lays out next to the
    // preceding label text instead of forcing a line break after it.
    <span className="inline-block align-middle shrink-0">
      <CustomTooltip text={hint} wrap>
        <span className="text-[10px] font-bold text-[#EC7D09] cursor-help select-none ml-1">**</span>
      </CustomTooltip>
    </span>
  );
}
