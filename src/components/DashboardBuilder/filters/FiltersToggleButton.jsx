import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import FilterEditorModal from './FilterEditorModal';

/**
 * The "Filters" button + its modal, as ONE shared component — previously this button (icon,
 * label, styling) and its modal wiring were separately hand-coded in both
 * DashboardCanvasEditor.jsx's toolbar and DashboardBuilder.jsx's read-only preview header,
 * which drifted out of sync (one got a text label added, the other didn't) until this. Both
 * now render this exact same component; a future style/behavior change only needs to happen
 * once here.
 */
// `isOpen`/`setIsOpen` — optional controlled-open pair, so a sibling component (FilterPanel's
// own "Edit in Filters" links, for a date-range filter this button's modal is the only place
// that can actually edit) can open this same modal from outside. Falls back to fully
// self-contained internal state when omitted, unchanged from before — DashboardBuilder.jsx's
// own usage doesn't pass these and keeps working exactly as-is.
export default function FiltersToggleButton({ filters, datasourceOptions, onSave, isOpen: isOpenProp, setIsOpen: setIsOpenProp }) {
  const [openState, setOpenState] = useState(false);
  const open = isOpenProp !== undefined ? isOpenProp : openState;
  const setOpen = setIsOpenProp || setOpenState;
  return (
    <>
      <button
        type="button"
        title="Add and edit filters"
        aria-label="Add and edit filters"
        onClick={() => setOpen(true)}
        className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
      >
        <Settings size={14} /> Filters
        {/* Count badge — FilterPanel's own collapsed row used to duplicate this exact button
            (a second "Filters N" pill sitting right next to this one, see the conversation
            this was reported in) just to show a count; the count belongs on the ONE button
            that actually opens "add/edit filters," not a second control. */}
        {filters.length > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-semibold bg-orange-100 text-[#EC7D09]">
            {filters.length}
          </span>
        )}
      </button>
      <FilterEditorModal
        isOpen={open}
        setIsOpen={setOpen}
        initialFilters={filters}
        datasourceOptions={datasourceOptions}
        onSave={onSave}
      />
    </>
  );
}
