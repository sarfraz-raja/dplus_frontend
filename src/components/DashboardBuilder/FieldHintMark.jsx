import React from 'react';
import { HelpCircle } from 'lucide-react';
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
    // OLD marker: an orange "**" right after the label text. Now one "?" help icon, pushed to the far
    // right of the label row (ml-auto — callers put label + mark in a flex row), same everywhere.
    <span className="ml-auto inline-block shrink-0 pl-1.5 align-middle">
      <CustomTooltip text={hint} wrap>
        <span
          tabIndex={0}
          role="img"
          aria-label={hint}
          className="flex h-3.5 w-3.5 cursor-help items-center justify-center text-slate-400 hover:text-[#EC7D09] focus:text-[#EC7D09] focus:outline-none"
        >
          <HelpCircle size={13} aria-hidden="true" />
        </span>
      </CustomTooltip>
    </span>
  );
}
