// STALE — not imported anywhere in the app.
// Map functionality is now handled by TelecomMapsPage.jsx and the MapsUsingDeckgl components.
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import Map from "react-map-gl";
import MapActions from "../../store/actions/map-actions"; //

// 🔹 Mapbox token from Vite
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
// const MAPBOX_TOKEN = "";

// Shares the same VITE_OFFLINE_MAPS_ENABLED flag as TelecomMap.jsx / DegradedCellsMap.jsx.
// Offline mode has no local PMTiles wiring here yet — this only swaps the online style
// out for a blank style so it doesn't silently call Mapbox while "offline" is intended.
const IS_OFFLINE_MODE = import.meta.env.VITE_OFFLINE_MAPS_ENABLED !== 'false';
const ONLINE_MAP_STYLE = "mapbox://styles/mapbox/light-v10";
const OFFLINE_MAP_STYLE = { version: 8, sources: {}, layers: [] };


const SyncedVendorMaps = () => {

  const dispatch = useDispatch();

  // 🔹 Get dataset from Redux (NOT local state anymore)
  const data = useSelector(
    (state) => state.map.supersetMapData || []
  );

  // 🔹 Shared view state (THIS syncs both maps)
  const [viewState, setViewState] = useState({
    longitude: 36.82,
    latitude: -1.29,
    zoom: 8,
    pitch: 0,
    bearing: 0,
  });

  // =====================================================
  // 🔹 Fetch Superset dataset once on mount
  // =====================================================
  useEffect(() => {
    dispatch(MapActions.getSupersetMapData());
  }, [dispatch]);

  // =====================================================
  // 🔹 Split dataset by vendor
  // =====================================================
const huaweiData = useMemo(
  () => data.filter(d => d.vendor?.toLowerCase() === "huawei"),
  [data]
);

const airtelData = useMemo(
  () => data.filter(d => d.vendor?.toLowerCase() === "airtel"),
  [data]
);

  // =====================================================
  // 🔹 Superset radius logic replication
  // =====================================================
  const getRadius = (value = 0) => {
    const scaled = value * 0.05;
    return Math.max(2, Math.min(20, scaled));
  };

  // =====================================================
  // 🔹 Create deck.gl layers (memoized)
  // =====================================================
  const huaweiLayer = useMemo(() =>
    new ScatterplotLayer({
      id: "huawei",
      data: huaweiData,
      getPosition: d => [d.longitude, d.latitude],
      getRadius: d => getRadius(d.dl_volume_daily),
      getFillColor: [0, 150, 255],
      pickable: true,
    }),
    [huaweiData]
  );

  const airtelLayer = useMemo(() =>
    new ScatterplotLayer({
      id: "airtel",
      data: airtelData,
      getPosition: d => [d.longitude, d.latitude],
      getRadius: d => getRadius(d.dl_volume_daily),
      getFillColor: [255, 0, 0],
      pickable: true,
    }),
    [airtelData]
  );

  console.log("MAPBOX TOKEN:", import.meta.env.VITE_MAPBOX_TOKEN);
console.log("Full Data:", data);
console.log("Huawei Data:", huaweiData);
console.log("Airtel Data:", airtelData);

  // =====================================================
  // 🔹 Render two synced maps
  // =====================================================
  return (
 <div
    style={{
      display: "flex",
      gap: "16px",
      padding: "16px",
      height: "calc(100vh - 120px)", // adjust based on header height
      boxSizing: "border-box",
    }}
  >
    {/* ================= LEFT CARD ================= */}
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "12px 16px",
          fontWeight: 600,
          borderBottom: "1px solid #eee",
        }}
      >
        Huawei
      </div>

      {/* Card Body (Map fills remaining height) */}
      <div style={{ flex: 1, position: "relative" }}>
        <DeckGL
          viewState={viewState}
          controller={true}
          layers={[huaweiLayer]}
          onViewStateChange={({ viewState }) => setViewState(viewState)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
        >
          <Map
            mapboxApiAccessToken={MAPBOX_TOKEN}
            mapStyle={IS_OFFLINE_MODE ? OFFLINE_MAP_STYLE : ONLINE_MAP_STYLE}
          />
        </DeckGL>
      </div>
    </div>

    {/* ================= RIGHT CARD ================= */}
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "12px 16px",
          fontWeight: 600,
          borderBottom: "1px solid #eee",
        }}
      >
        Airtel
      </div>

      {/* Card Body */}
      <div style={{ flex: 1, position: "relative" }}>
        <DeckGL
          viewState={viewState}
          controller={true}
          layers={[airtelLayer]}
          onViewStateChange={({ viewState }) => setViewState(viewState)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
        >
          <Map
            mapboxApiAccessToken={MAPBOX_TOKEN}
            mapStyle={IS_OFFLINE_MODE ? OFFLINE_MAP_STYLE : ONLINE_MAP_STYLE}
          />
        </DeckGL>
      </div>
    </div>
  </div>
  );
};

export default SyncedVendorMaps;