import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Filter, Layers3, Link, Link2Off, GripVertical } from "lucide-react";
import MapActions from "../../store/actions/map-actions";
import LeftFilters from "./LeftFilters";
import AddMapLayersPanel from "./AddMapLayersPanel";

const BTN_BASE =
  "inline-flex h-7 items-center justify-center rounded-md border transition-colors text-xs font-semibold";
const BTN_DARK =
  "border-[#27365C] bg-[linear-gradient(180deg,#0C1931_0%,#0B1730_100%)] text-white/75 hover:border-[#F26522]/40 hover:text-[#F26522]";
const BTN_ACTIVE =
  "border-[#F26522]/45 bg-[rgba(31,21,26,0.96)] text-[#F26522]";

export const ALL_OPERATORS = [
  "Telkom",
  "Airtel",
  "Safaricom",
  "Huawei",
  "Ericsson",
  "Nokia",
];

const PRESETS = [2, 4, 6];

/** Returns responsive Tailwind grid-cols classes — 1 col on mobile, N cols on sm+. */
export const gridCols = (n) => {
  if (n <= 1) return "grid-cols-1";
  if (n <= 4) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
};

/**
 * Floating draggable GIS toolbar for the multi-map page.
 * Calls onLayoutChange({ selectedOperators, gridColsClass }) on change.
 */
const TelecomMultiMapFilters = ({ onLayoutChange }) => {
  const dispatch = useDispatch();
  const syncEnabled = useSelector((state) => state.map.syncEnabled);
  const saveMapFilters = useSelector((state) => state.auth?.commonConfig?.saveMapFilters);

  const [filterOpen, setFilterOpen] = useState(false);
  const [layerOpen, setLayerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [selectedOperators, setSelectedOperators] = useState(ALL_OPERATORS.slice(0, 4));

  // Draggable position — initial: 12px from left, 8px from top
  const [pos, setPos] = useState({ x: 12, y: 8 });
  const dragState = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const rootRef = useRef(null);

  const hasAppliedFilters = Boolean(
    saveMapFilters && saveMapFilters !== "{}" && saveMapFilters !== "null",
  );
  const filterActive = filterOpen || hasAppliedFilters;

  // ── Notify parent on operator change ──
  useEffect(() => {
    onLayoutChange?.({
      selectedOperators,
      gridColsClass: gridCols(selectedOperators.length),
    });
  }, [selectedOperators, onLayoutChange]);

  // ── Close all panels on outside click ──
  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      setFilterOpen(false);
      setLayerOpen(false);
      setPickerOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // ── Drag logic ──
  const onDragStart = useCallback((e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = { active: true, startX: clientX, startY: clientY, origX: pos.x, origY: pos.y };

    const onMove = (e) => {
      if (!dragState.current.active) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const container = rootRef.current?.parentElement;
      const toolbar = rootRef.current;
      const maxX = container ? container.offsetWidth - (toolbar?.offsetWidth ?? 0) : 9999;
      const maxY = container ? container.offsetHeight - (toolbar?.offsetHeight ?? 0) : 9999;
      setPos({
        x: Math.max(0, Math.min(maxX, dragState.current.origX + cx - dragState.current.startX)),
        y: Math.max(0, Math.min(maxY, dragState.current.origY + cy - dragState.current.startY)),
      });
    };

    const onEnd = () => {
      dragState.current.active = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [pos.x, pos.y]);

  // ── Operator helpers ──
  const toggleOperator = (op) => {
    setSelectedOperators((prev) =>
      prev.includes(op)
        ? prev.length > 1
          ? prev.filter((o) => o !== op)
          : prev
        : [...prev, op],
    );
  };

  const applyPreset = (n) => {
    setSelectedOperators(ALL_OPERATORS.slice(0, n));
    setPickerOpen(false);
  };

  return (
    <div
      ref={rootRef}
      style={{ position: "absolute", top: pos.y, left: pos.x, zIndex: 30 }}
      className="pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Strip row ── */}
      <div className="relative flex items-center gap-1.5 rounded-lg border border-[#27365C] bg-[linear-gradient(180deg,#0C1931_0%,#0B1730_100%)] px-1.5 py-1 shadow-[0_10px_22px_rgba(3,8,24,0.35)]">

        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          className="mr-0.5 flex h-7 w-4 shrink-0 cursor-grab items-center justify-center text-white/30 hover:text-white/60 active:cursor-grabbing"
          title="Drag to reposition"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </div>

        {/* Sync toggle */}
        <button
          type="button"
          title={syncEnabled ? "Sync ON — all maps move together" : "Sync OFF — maps move independently"}
          onClick={() => dispatch(MapActions.setSyncEnabled(!syncEnabled))}
          className={`${BTN_BASE} gap-1.5 px-2.5 ${syncEnabled ? BTN_ACTIVE : BTN_DARK}`}
        >
          {syncEnabled ? (
            <Link className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Link2Off className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">{syncEnabled ? "Synced" : "Unsynced"}</span>
        </button>

        {/* Map count / operator picker */}
        <div className="relative">
          <button
            type="button"
            title="Select operators / map count"
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((v) => !v);
              setFilterOpen(false);
              setLayerOpen(false);
            }}
            className={`${BTN_BASE} gap-1.5 px-2.5 ${pickerOpen ? BTN_ACTIVE : BTN_DARK}`}
          >
            <span className="tabular-nums">{selectedOperators.length}</span>
            <span className="hidden sm:inline">Maps</span>
            <span className="text-[10px] opacity-60">▾</span>
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-full z-[10070] mt-1.5 w-52 rounded-xl border border-[#27365C] bg-[linear-gradient(180deg,#0C1931_0%,#0B1730_100%)] p-3 shadow-[0_12px_28px_rgba(3,8,24,0.5)]">
              {/* Quick presets */}
              <div className="mb-2.5 flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">Quick</span>
                <div className="flex gap-1">
                  {PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => applyPreset(n)}
                      className={`inline-flex h-5 w-8 items-center justify-center rounded text-[10px] font-bold transition-colors ${
                        selectedOperators.length === n
                          ? "bg-[#F26522] text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operator checkboxes */}
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">Operators</div>
              <div className="flex flex-col gap-0.5">
                {ALL_OPERATORS.map((op) => (
                  <label
                    key={op}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOperators.includes(op)}
                      onChange={() => toggleOperator(op)}
                      className="h-3 w-3 shrink-0 appearance-none rounded-[3px] border border-white/30 bg-transparent checked:border-[#F26522] checked:bg-[#F26522]"
                    />
                    <span className="text-[11px] font-medium text-white/80">{op}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            type="button"
            title="Filters"
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen((v) => !v);
              setLayerOpen(false);
              setPickerOpen(false);
            }}
            className={`${BTN_BASE} w-7 ${filterActive ? BTN_ACTIVE : BTN_DARK}`}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
          </button>

          {filterOpen && (
            <div className="absolute left-0 top-full z-[10060] mt-1.5">
              <LeftFilters mode="floating" onClose={() => setFilterOpen(false)} />
            </div>
          )}
        </div>

        {/* Layers */}
        <div className="relative">
          <button
            type="button"
            title="Layers"
            onClick={(e) => {
              e.stopPropagation();
              setLayerOpen((v) => !v);
              setFilterOpen(false);
              setPickerOpen(false);
            }}
            className={`${BTN_BASE} w-7 ${layerOpen ? BTN_ACTIVE : BTN_DARK}`}
          >
            <Layers3 className="h-3.5 w-3.5" aria-hidden />
          </button>

          {layerOpen && (
            <div className="absolute left-0 top-full z-[10061] mt-1.5 w-max">
              <AddMapLayersPanel mode="floating" onClose={() => setLayerOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelecomMultiMapFilters;
