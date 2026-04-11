import React, { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import MapActions from "../store/actions/map-actions";
import TelecomMapCard from "../components/MapsUsingDeckgl/TelecomMapCard";
import TelecomMultiMapFilters from "../components/MapsUsingDeckgl/TelecomMultiMapFilters";

const TelecomMultipleMapsPage = () => {
  const dispatch = useDispatch();

  const [layout, setLayout] = useState({
    selectedOperators: ["Telkom", "Airtel", "Safaricom", "Huawei"],
    gridColsClass: "grid-cols-1 sm:grid-cols-2",
  });

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

  // Same init as TelecomMapsPage — loads all shared map data into Redux
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          dispatch(MapActions.getBoundaryGroups()),
          dispatch(MapActions.getRfPredictionFilters()),
          dispatch(MapActions.getUserMapSetup()),
          dispatch(MapActions.getMultiVendorCells({})),
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
          <TelecomMapCard key={op} operator={op} />
        ))}
      </div>

      {/* ── Draggable floating toolbar ── */}
      <TelecomMultiMapFilters onLayoutChange={handleLayoutChange} />
    </div>
  );
};

export default TelecomMultipleMapsPage;
