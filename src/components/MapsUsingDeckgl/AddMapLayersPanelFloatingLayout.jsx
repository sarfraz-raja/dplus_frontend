import React from "react";
import { ChevronDown, X, Settings } from "lucide-react";
import CellThematicsPanel from "./CellThematicsPanel";
import ColorPicker from "./ColorPicker";
import RangeFilter from "./RangeFilter";
import OpacitySlider from "./OpacitySlider";
import SiteThematicsPanel from "./SiteThematicsPanel";
import { KPI_RANGE_DEFAULTS, deepCopyRanges, RF_CATEGORY_COLORS, RF_CATEGORY_ORDER } from "./Utils/colorEngine";

const dy3LayerCb =
  "h-3 w-3 shrink-0 appearance-none rounded-[3px] border border-white/30 bg-transparent checked:border-[#F26522] checked:bg-[#F26522]";

/** Dark-theme overrides for legacy light panels inside the floating shell */
const floatingInner =
  "sidebar-scroll flex-1 overflow-y-auto px-2 py-1.5" +
  // checkboxes — orange accent, no bg change (native look)
  " [&_input[type=checkbox]]:accent-[#F26522] [&_input[type=checkbox]]:border-white/30" +
  // range sliders
  " [&_input[type=range]]:accent-[#F26522]" +
  // selects
  " [&_select]:rounded [&_select]:border [&_select]:border-white/25 [&_select]:bg-[#0a1428] [&_select]:px-2 [&_select]:py-1 [&_select]:text-xs [&_select]:text-white" +
  // datetime inputs
  " [&_input[type=datetime-local]]:rounded [&_input[type=datetime-local]]:border [&_input[type=datetime-local]]:border-white/25 [&_input[type=datetime-local]]:bg-[#0a1428] [&_input[type=datetime-local]]:text-xs [&_input[type=datetime-local]]:text-white" +
  // number inputs (Range Filter min/max fields etc.)
  " [&_input[type=number]]:rounded [&_input[type=number]]:border [&_input[type=number]]:border-white/25 [&_input[type=number]]:bg-[#0a1428] [&_input[type=number]]:text-xs [&_input[type=number]]:text-white [&_input[type=number]]:px-1 [&_input[type=number]]:py-0.5" +
  // text inputs
  " [&_input[type=text]]:rounded [&_input[type=text]]:border [&_input[type=text]]:border-white/25 [&_input[type=text]]:bg-[#0a1428] [&_input[type=text]]:text-xs [&_input[type=text]]:text-white [&_input[type=text]]:px-1 [&_input[type=text]]:py-0.5" +
  // text color overrides for generic gray Tailwind classes
  " [&_.text-gray-500]:text-white/45 [&_.text-gray-600]:text-white/70 [&_.text-gray-400]:text-white/50 [&_.text-gray-300]:text-white/60 [&_label]:text-white/80" +
  // border / bg overrides
  " [&_.border-gray-300]:border-white/20 [&_.bg-white]:bg-white/[0.06] [&_.border.rounded.p-2]:border-white/15 [&_.border.rounded.p-3]:border-white/15" +
  // button color overrides
  " [&_.bg-blue-600]:bg-[#F26522] [&_.border-blue-600]:border-[#F26522] [&_.text-blue-600]:text-[#F26522]" +
  " [&_.text-white]:text-white";

const SECTION_TITLE = {
  SITE: "Sites",
  CELL: "Cells",
  BOUNDARY: "Boundaries",
  RF: "RF predictions",
  DRIVE_TEST: "Drive test",
};

/**
 * Datayog-style two-column layers UI (matches `LeftFilters` floating filter shell).
 * State and apply/clear logic live in `AddMapLayersPanel`.
 */
const AddMapLayersPanelFloatingLayout = ({
  activeLayerSection,
  toggleFloatingSection,
  clearActiveLayerSectionDraft,
  applySelectedMapLayers,
  clearAllMapLayers,
  isDirty,
  markDirty,
  hasAppliedLayers,
  pendingVisibility,
  setPendingVisibility,
  setActiveLayerSection,
  pendingLegends,
  setPendingLegends,
  setSiteThematicsConfig,
  setCellThematicsConfig,
  boundaryGroups,
  anyBoundarySelected,
  allBoundariesSelected,
  expandedBoundaryGroup,
  setExpandedBoundaryGroup,
  pendingBoundarySelections,
  setPendingBoundarySelections,
  toggleBoundaryChild,
  toggleParentLayerSelection,
  pendingOpacity,
  setPendingOpacity,
  boundaryColors,
  setBoundaryColors,
  rfRegions,
  pendingRfRegions,
  setPendingRfRegions,
  toggleRfRegion,
  rfParameter,
  setRfParameter,
  rfParameterOptions,
  rfColorConfig,
  sessionIds,
  selectedDriveSessions,
  setSelectedDriveSessions,
  toggleDriveSession,
  startDateTime,
  setStartDateTime,
  endDateTime,
  setEndDateTime,
  selectedThematic,
  setSelectedThematic,
  thematicMode,
  setThematicMode,
  ranges,
  setRanges,
  driveThematicOptions,
  driveTestScale,
  setDriveTestScale,
}) => {
  // RF / Drive Test selection status (computed locally from props)
  const anyRfSelected = pendingRfRegions.length > 0;
  const allRfSelected = rfRegions.length > 0 && pendingRfRegions.length === rfRegions.length;
  const anyDriveSelected = selectedDriveSessions.length > 0;
  const allDriveSelected = sessionIds.length > 0 && selectedDriveSessions.length === sessionIds.length;

  const railCard =
    "group rounded-xl border border-[#27365C] bg-[linear-gradient(180deg,#0C1931_0%,#0B1730_100%)] px-2 py-1 text-white shadow-[0_8px_20px_rgba(3,8,24,0.35)]";

  const chevronBtn = (active) =>
    `inline-flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-md border transition-all duration-200 ${
      active
        ? "border-[#F26522]/35 bg-[rgba(43,19,37,0.88)] text-[#F26522]"
        : "border-white/10 text-white/45 hover:border-[#F26522]/35 hover:bg-white/5 hover:text-[#F26522]"
    }`;

  return (
    <div className="relative w-full min-w-0 text-white">
      <div className="flex w-full min-w-0 items-start gap-2">
        {/* ── LEFT RAIL ── */}
        <div className="flex w-[min(42vw,172px)] shrink-0 flex-col gap-1 overflow-visible pr-0.5 py-0.5">

          {/* Dirty indicator dot */}
          {isDirty && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#F26522]/40 bg-[#F26522]/10 px-2 py-1">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#F26522]" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#F26522]">
                Unsaved changes
              </span>
            </div>
          )}

          {/* ── Tier 1: Sites (Towers) ── */}
          <div className={railCard}>
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="inline-flex h-3.5 shrink-0 items-center justify-center self-center">
                  <input
                    type="checkbox"
                    checked={pendingVisibility.SITES || false}
                    onChange={() => {
                      const next = !pendingVisibility.SITES;
                      setPendingVisibility((prev) => ({ ...prev, SITES: next }));
                      if (next) setActiveLayerSection("SITE");
                      markDirty();
                    }}
                    className={`${dy3LayerCb} m-0 align-middle`}
                  />
                </span>
                <button
                  type="button"
                  onClick={() => toggleFloatingSection("SITE")}
                  className="flex min-w-0 flex-1 items-center py-0 text-left"
                >
                  <span
                    className={`truncate text-[9px] font-bold uppercase leading-[1.1] tracking-[0.12em] ${
                      activeLayerSection === "SITE" ? "text-[#F26522]" : "text-white"
                    }`}
                  >
                    Sites 
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleFloatingSection("SITE")}
                aria-label={activeLayerSection === "SITE" ? "Collapse sites" : "Expand sites"}
                className={chevronBtn(activeLayerSection === "SITE")}
              >
                <ChevronDown
                  className={`h-3 w-3 shrink-0 rotate-[-90deg] transition-all duration-300 ${
                    activeLayerSection === "SITE" ? "text-[#F26522]" : "text-inherit"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ── Tier 1: Cells ── */}
          <div className={railCard}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex h-3.5 shrink-0 items-center justify-center self-center">
                  <input
                    type="checkbox"
                    checked={pendingVisibility.CELLS || false}
                    onChange={() => {
                      const next = !pendingVisibility.CELLS;
                      setPendingVisibility((prev) => ({ ...prev, CELLS: next }));
                      if (next) setActiveLayerSection("CELL");
                      markDirty();
                    }}
                    className={`${dy3LayerCb} m-0 align-middle`}
                  />
                </span>
                <button
                  type="button"
                  onClick={() => toggleFloatingSection("CELL")}
                  className="flex min-w-0 flex-1 items-center py-0 text-left"
                >
                  <span
                    className={`truncate text-[9px] font-bold uppercase leading-[1.1] tracking-[0.12em] ${
                      activeLayerSection === "CELL" ? "text-[#F26522]" : "text-white"
                    }`}
                  >
                    Cells
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleFloatingSection("CELL")}
                aria-label={activeLayerSection === "CELL" ? "Collapse cells" : "Expand cells"}
                className={chevronBtn(activeLayerSection === "CELL")}
              >
                <ChevronDown
                  className={`h-3 w-3 shrink-0 rotate-[-90deg] transition-all duration-300 ${
                    activeLayerSection === "CELL" ? "text-[#F26522]" : "text-inherit"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ── Tier 2: Boundaries ── */}
          {boundaryGroups.length > 0 ? (
            <div className={railCard}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!anyBoundarySelected) return;
                      const cleared = {};
                      boundaryGroups.forEach((g) => { cleared[g.shapegroup] = []; });
                      setPendingBoundarySelections((prev) => ({ ...prev, ...cleared }));
                      boundaryGroups.forEach((g) => setPendingVisibility((prev) => ({ ...prev, [g.shapegroup]: false })));
                      markDirty();
                    }}
                    className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border transition-colors self-center"
                    style={{
                      borderColor: anyBoundarySelected ? '#F26522' : 'rgba(255,255,255,0.3)',
                      backgroundColor: allBoundariesSelected ? '#F26522' : anyBoundarySelected ? 'rgba(242,101,34,0.22)' : 'transparent',
                    }}
                  >
                    {allBoundariesSelected && (
                      <svg viewBox="0 0 8 8" className="h-2 w-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,4 3,6.5 7,1.5" /></svg>
                    )}
                    {anyBoundarySelected && !allBoundariesSelected && (
                      <span className="block h-px w-1.5 bg-[#F26522]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFloatingSection("BOUNDARY")}
                    className="flex min-w-0 flex-1 items-center gap-1 py-0 text-left"
                  >
                    <span
                      className={`truncate text-[9px] font-bold uppercase leading-[1.1] tracking-[0.12em] ${
                        activeLayerSection === "BOUNDARY" ? "text-[#F26522]" : "text-white"
                      }`}
                    >
                      Boundaries
                    </span>
                    <Settings className="h-2 w-2 shrink-0 text-white" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFloatingSection("BOUNDARY")}
                  aria-label={activeLayerSection === "BOUNDARY" ? "Collapse boundaries" : "Expand boundaries"}
                  className={chevronBtn(activeLayerSection === "BOUNDARY")}
                >
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 rotate-[-90deg] transition-all duration-300 ${
                      activeLayerSection === "BOUNDARY" ? "text-[#F26522]" : "text-inherit"
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Tier 2: RF predictions ── */}
          <div className={railCard}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                      if (!anyRfSelected) return;
                      setPendingVisibility((prev) => ({ ...prev, RF: false }));
                      setPendingRfRegions([]);
                      markDirty();
                    }}
                    className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border transition-colors self-center"
                    style={{
                      borderColor: anyRfSelected ? '#F26522' : 'rgba(255,255,255,0.3)',
                      backgroundColor: allRfSelected ? '#F26522' : anyRfSelected ? 'rgba(242,101,34,0.22)' : 'transparent',
                    }}
                  >
                    {allRfSelected && (
                      <svg viewBox="0 0 8 8" className="h-2 w-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,4 3,6.5 7,1.5" /></svg>
                    )}
                    {anyRfSelected && !allRfSelected && (
                      <span className="block h-px w-1.5 bg-[#F26522]" />
                    )}
                  </button>
                <button
                  type="button"
                  onClick={() => toggleFloatingSection("RF")}
                  className="flex min-w-0 flex-1 items-center gap-1 py-0 text-left"
                >
                  <span
                    className={`truncate text-[9px] font-bold uppercase leading-[1.1] tracking-[0.12em] ${
                      activeLayerSection === "RF" ? "text-[#F26522]" : "text-white"
                    }`}
                  >
                    RF predictions
                  </span>
                  <Settings className="h-2 w-2 shrink-0 text-white" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleFloatingSection("RF")}
                aria-label={activeLayerSection === "RF" ? "Collapse RF" : "Expand RF"}
                className={chevronBtn(activeLayerSection === "RF")}
              >
                <ChevronDown
                  className={`h-3 w-3 shrink-0 rotate-[-90deg] transition-all duration-300 ${
                    activeLayerSection === "RF" ? "text-[#F26522]" : "text-inherit"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ── Tier 2: Drive test ── */}
          <div className={railCard}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                      if (!anyDriveSelected) return;
                      setPendingVisibility((prev) => ({ ...prev, DRIVE_TEST: false }));
                      setSelectedDriveSessions([]);
                      markDirty();
                    }}
                    className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border transition-colors self-center"
                    style={{
                      borderColor: anyDriveSelected ? '#F26522' : 'rgba(255,255,255,0.3)',
                      backgroundColor: allDriveSelected ? '#F26522' : anyDriveSelected ? 'rgba(242,101,34,0.22)' : 'transparent',
                    }}
                  >
                    {allDriveSelected && (
                      <svg viewBox="0 0 8 8" className="h-2 w-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,4 3,6.5 7,1.5" /></svg>
                    )}
                    {anyDriveSelected && !allDriveSelected && (
                      <span className="block h-px w-1.5 bg-[#F26522]" />
                    )}
                  </button>
                <button
                  type="button"
                  onClick={() => toggleFloatingSection("DRIVE_TEST")}
                  className="flex min-w-0 flex-1 items-center gap-1 py-0 text-left"
                >
                  <span
                    className={`truncate text-[9px] font-bold uppercase leading-[1.1] tracking-[0.12em] ${
                      activeLayerSection === "DRIVE_TEST" ? "text-[#F26522]" : "text-white"
                    }`}
                  >
                    Drive test
                  </span>
                  <Settings className="h-2 w-2 shrink-0 text-white" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleFloatingSection("DRIVE_TEST")}
                aria-label={activeLayerSection === "DRIVE_TEST" ? "Collapse drive test" : "Expand drive test"}
                className={chevronBtn(activeLayerSection === "DRIVE_TEST")}
              >
                <ChevronDown
                  className={`h-3 w-3 shrink-0 rotate-[-90deg] transition-all duration-300 ${
                    activeLayerSection === "DRIVE_TEST" ? "text-[#F26522]" : "text-inherit"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ── Clear / Apply rail buttons ── */}
          <div className="mt-1 flex gap-1.5">
            <button
              type="button"
              onClick={clearAllMapLayers}
              disabled={!hasAppliedLayers}
              title="Clear all layers from map"
              className={`flex-1 rounded-lg border-0 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white transition-colors ${
                hasAppliedLayers ? "bg-[#F26522] hover:bg-[#d95f1a]" : "cursor-not-allowed bg-[#989898]"
              }`}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={applySelectedMapLayers}
              disabled={!isDirty}
              title="Apply pending changes to map"
              className={`flex-1 rounded-lg border-0 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white transition-colors ${
                isDirty ? "bg-[#F26522] hover:bg-[#d95f1a]" : "cursor-not-allowed bg-[#989898]"
              }`}
            >
              Apply
            </button>
          </div>
        </div>

        {/* ── RIGHT DETAIL PANEL ── */}
        {activeLayerSection ? (
          <div className="w-[min(56vw,220px)] shrink-0">
            <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#27365C] bg-[linear-gradient(180deg,#0C1931_0%,#0B1730_100%)] shadow-[0_16px_32px_rgba(3,8,24,0.4)] max-h-[80vh]">
              {/* Panel header — title + close only */}
              <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-[#27365C]/90 px-2">
                <div className="min-w-0 truncate text-[9px] font-bold uppercase leading-[1.1] tracking-[0.14em] text-[#F26522]">
                  {SECTION_TITLE[activeLayerSection]} layers
                </div>
                <button
                  type="button"
                  title="Close panel"
                  onClick={clearActiveLayerSectionDraft}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-0 bg-[rgba(13,24,49,0.92)] p-0 text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/80 focus:outline-none"
                >
                  <X className="h-[11px] w-[11px]" strokeWidth={2.5} aria-hidden />
                </button>
              </div>

              {activeLayerSection === "SITE" ? (
                <div className={floatingInner}>
                  <SiteThematicsPanel
                    setSiteThematicsConfig={setSiteThematicsConfig}
                    tempLegend={pendingLegends.SITES}
                    setTempLegend={(val) => { setPendingLegends((prev) => ({ ...prev, SITES: val })); markDirty(); }}
                  />
                </div>
              ) : null}

              {activeLayerSection === "CELL" ? (
                <div className={floatingInner}>
                  <CellThematicsPanel
                    setCellThematicsConfig={setCellThematicsConfig}
                    tempLegend={pendingLegends.CELLS}
                    setTempLegend={(val) => { setPendingLegends((prev) => ({ ...prev, CELLS: val })); markDirty(); }}
                  />
                </div>
              ) : null}

              {activeLayerSection === "BOUNDARY" ? (
                <div className={floatingInner}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 pt-1">
                    <span className="text-xs font-semibold text-gray-500">Show legend</span>
                    <input
                      type="checkbox"
                      checked={!!pendingLegends.BOUNDARY}
                      onChange={(e) => {
                        setPendingLegends((prev) => ({ ...prev, BOUNDARY: e.target.checked }));
                        markDirty();
                      }}
                    />
                  </div>
                  <OpacitySlider
                    value={pendingOpacity.BOUNDARY}
                    onChange={(val) => { setPendingOpacity((prev) => ({ ...prev, BOUNDARY: val })); markDirty(); }}
                  />
                  {boundaryGroups.map((group, index) => (
                    <div key={index} className="mb-2 rounded border border-white/10 bg-white/[0.06] p-2">
                      <div className="flex items-center gap-2 rounded p-1 hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={pendingVisibility[group.shapegroup] || false}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => { toggleParentLayerSelection(group.shapegroup); markDirty(); }}
                        />
                        <span className="flex-1 text-sm font-medium">{group.shapegroup}</span>
                        <ColorPicker
                          value={boundaryColors[group.shapegroup] || "#000000"}
                          onChange={(color) => {
                            setBoundaryColors((prev) => ({ ...prev, [group.shapegroup]: color }));
                            markDirty();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedBoundaryGroup(
                              expandedBoundaryGroup === group.shapegroup ? null : group.shapegroup
                            )
                          }
                          className="text-white/70"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedBoundaryGroup === group.shapegroup ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                      {expandedBoundaryGroup === group.shapegroup ? (
                        <div className="mt-2 max-h-[160px] overflow-y-auto rounded border border-white/10 p-2">
                          {group.shapenames.map((name, idx) => (
                            <label key={idx} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={pendingBoundarySelections[group.shapegroup]?.includes(name) || false}
                                onChange={() => { toggleBoundaryChild(group.shapegroup, name); markDirty(); }}
                              />
                              {name}
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {activeLayerSection === "RF" ? (
                <div className={floatingInner}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 pt-1">
                    <span className="text-xs font-semibold text-gray-500">Show legend</span>
                    <input
                      type="checkbox"
                      checked={!!pendingLegends.RF}
                      onChange={(e) => {
                        setPendingLegends((prev) => ({ ...prev, RF: e.target.checked }));
                        markDirty();
                      }}
                    />
                  </div>
                  <OpacitySlider
                    value={pendingOpacity.RF}
                    onChange={(val) => { setPendingOpacity((prev) => ({ ...prev, RF: val })); markDirty(); }}
                  />
                  <span className="text-xs font-semibold text-gray-500">Select layers</span>
                  <div className="mt-2 max-h-[140px] overflow-y-auto rounded border border-white/10 p-2">
                    {rfRegions.map((name, idx) => (
                      <label key={idx} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pendingRfRegions.includes(name)}
                          onChange={() => { toggleRfRegion(name); markDirty(); }}
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2">
                    <div className="mb-1 text-xs font-semibold text-gray-500">Apply thematic by</div>
                    <select
                      value={rfParameter}
                      onChange={(e) => { setRfParameter(e.target.value); markDirty(); }}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      {rfParameterOptions.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2">
                    <div className="mb-1 text-xs font-semibold text-gray-500">Range & colors</div>
                    <div className="space-y-2">
                      {(() => {
                        const apiEntries = rfColorConfig
                          .filter((c) => c.parameter_name === rfParameter)
                          .sort((a, b) => a.display_order - b.display_order);
                        if (apiEntries.length > 0) {
                          return apiEntries.map((entry) => (
                            <div
                              key={entry.range_label}
                              className="flex items-center justify-between rounded border border-white/10 px-2 py-1"
                            >
                              <span className="text-sm">{entry.range_label}</span>
                              <div
                                className="h-5 w-5 flex-shrink-0 rounded border border-white/20"
                                style={{ backgroundColor: entry.color_hex }}
                              />
                            </div>
                          ));
                        }
                        return RF_CATEGORY_ORDER.map((category) => (
                          <div
                            key={category}
                            className="flex items-center justify-between rounded border border-white/10 px-2 py-1"
                          >
                            <span className="text-sm">{category}</span>
                            <div
                              className="h-5 w-5 flex-shrink-0 rounded border border-white/20"
                              style={{ backgroundColor: RF_CATEGORY_COLORS[category] }}
                            />
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              ) : null}

              {activeLayerSection === "DRIVE_TEST" ? (
                <div className={floatingInner}>
                  <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2 pt-1">
                    <span className="text-xs font-semibold text-gray-500">Show legend</span>
                    <input
                      type="checkbox"
                      checked={!!pendingLegends.DRIVE_TEST}
                      onChange={(e) => {
                        setPendingLegends((prev) => ({ ...prev, DRIVE_TEST: e.target.checked }));
                        markDirty();
                      }}
                    />
                  </div>
                  <OpacitySlider
                    value={pendingOpacity.DRIVE_TEST}
                    onChange={(val) => { setPendingOpacity((prev) => ({ ...prev, DRIVE_TEST: val })); markDirty(); }}
                  />
                  <div className="pb-2 pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-500">Dot Scale</span>
                      <span className="text-xs text-gray-600">{driveTestScale}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={driveTestScale}
                      onChange={(e) => { setDriveTestScale(parseFloat(e.target.value)); markDirty(); }}
                      className="w-full"
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">Select layers</span>
                  <div className="max-h-[120px] overflow-y-auto rounded border border-white/10 p-2">
                    {sessionIds.map((session) => (
                      <label key={session} className="mb-1 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedDriveSessions.includes(session)}
                          onChange={() => { toggleDriveSession(session); markDirty(); }}
                        />
                        {session}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-500 mb-1">Start: Date</label>
                        <input
                          type="date"
                          value={startDateTime ? startDateTime.slice(0, 10) : ""}
                          onChange={(e) => { setStartDateTime(e.target.value); markDirty(); }}
                          className="border rounded px-1 py-1 text-[10px] w-full [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          style={{ backgroundColor: "#091428", color: "white" }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-500 mb-1">End: Date</label>
                        <input
                          type="date"
                          value={endDateTime ? endDateTime.slice(0, 10) : ""}
                          onChange={(e) => { setEndDateTime(e.target.value); markDirty(); }}
                          className="border rounded px-1 py-1 text-[10px] w-full [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          style={{ backgroundColor: "#091428", color: "white" }}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-semibold text-gray-500">Thematic</span>
                      <select
                        value={selectedThematic}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedThematic(v);
                          if (thematicMode === "Default") {
                            setRanges(deepCopyRanges(KPI_RANGE_DEFAULTS[v] || []));
                          }
                          markDirty();
                        }}
                        className="w-full rounded border px-2 py-1 text-sm"
                      >
                        {driveThematicOptions.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs font-semibold text-gray-500">Mode</div>
                    <div className="mb-2 flex gap-2">
                      {["Default", "Custom"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setThematicMode(m);
                            if (m === "Default") {
                              setRanges(deepCopyRanges(KPI_RANGE_DEFAULTS[selectedThematic]));
                            }
                            markDirty();
                          }}
                          className={`flex-1 rounded border px-3 py-1 text-sm ${
                            thematicMode === m
                              ? "border-[#F26522] bg-[#F26522] text-white"
                              : "border-white/25 bg-white/[0.04] text-white/80"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {thematicMode === "Default" ? (
                      <div className="mb-2 rounded border border-white/10 p-2">
                        <div className="mb-2 text-xs font-semibold text-gray-500">Preview</div>
                        <div className="space-y-1">
                          {(KPI_RANGE_DEFAULTS[selectedThematic] || []).map((range, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <div
                                className="h-3 w-3 flex-shrink-0 rounded-sm"
                                style={{ backgroundColor: range.color }}
                              />
                              <span className="text-gray-600">{range.label}</span>
                              <span className="ml-auto text-gray-400">
                                {range.max} to {range.min}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {thematicMode === "Custom" ? <RangeFilter value={ranges} onChange={(v) => { setRanges(v); markDirty(); }} /> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AddMapLayersPanelFloatingLayout;
