import React, { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import MapActions from "../store/actions/map-actions";
import TelecomMapCard from "../components/MapsUsingDeckgl/TelecomMapCard";
import TelecomMultiMapFilters, { OPERATOR_TO_MAP_KEY } from "../components/MapsUsingDeckgl/TelecomMultiMapFilters";

const TelecomMultipleMapsPage = () => {
  const dispatch = useDispatch();

  const [layout, setLayout] = useState({
    selectedOperators: ["Telkom", "Airtel", "Safaricom", "Huawei"],
    gridColsClass: "grid-cols-1 sm:grid-cols-2",
  });

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

  // Shared setup (boundaries, RF filters, user config, sites) — cell data is loaded per-card
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          dispatch(MapActions.getBoundaryGroups()),
          dispatch(MapActions.getRfPredictionFilters()),
          dispatch(MapActions.getUserMapSetup()),
          dispatch(MapActions.getSites()),
        ]);
      } catch (e) {
        if (import.meta.env.DEV) console.warn("Multi-map GIS init:", e?.message ?? e);
      }
    };
    init();
  }, [dispatch]);

  const { selectedOperators, gridColsClass } = layout;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ── Map grid (full area, auto-rows so each row gets equal height) ── */}
      <div
        className={`grid h-full w-full auto-rows-fr gap-1.5 p-1.5 ${gridColsClass}`}
        style={{ background: "#f3f4f6" }}
      >
        {selectedOperators.map((op) => (
          <TelecomMapCard key={op} operator={op} mapKey={OPERATOR_TO_MAP_KEY[op]} />
        ))}
      </div>

      {/* ── Draggable floating toolbar ── */}
      <TelecomMultiMapFilters onLayoutChange={handleLayoutChange} />
    </div>
  );
};

export default TelecomMultipleMapsPage;
