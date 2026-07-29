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
export default function FiltersToggleButton({ filters, datasourceOptions, onSave }) {
  const [open, setOpen] = useState(false);
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
