// // Global filters for all maps 

// import React from "react";
// import { useDispatch, useSelector } from "react-redux";
// import MapActions from "../../store/actions/map-actions";

// const TelecomFiltersPanel = () => {

//   const dispatch = useDispatch();
//   const filters = useSelector(state => state.map.filters);

//   /* ============================================================
//      🔹 Handle Filter Change
//   ============================================================ */

//   const handleChange = (key, value) => {
//     dispatch(MapActions.setFilters({ [key]: value }));
//   };

//   /* ============================================================
//      🔹 Available Options (Later can come from backend)
//   ============================================================ */

//   const regionsList = ["North", "South", "East", "West"];
//   const technologiesList = ["2G", "3G", "4G", "5G"];

//   /* ============================================================
//      🔹 Toggle Region
//   ============================================================ */

//   const handleRegionToggle = (region) => {
//     let updated = [...filters.regions];

//     if (updated.includes(region)) {
//       updated = updated.filter(r => r !== region);
//     } else {
//       updated.push(region);
//     }

//     dispatch(MapActions.setFilters({ regions: updated }));
//   };

//   /* ============================================================
//      🔹 Toggle Technology
//   ============================================================ */

//   const handleTechnologyToggle = (tech) => {
//     let updated = [...filters.technologies];

//     if (updated.includes(tech)) {
//       updated = updated.filter(t => t !== tech);
//     } else {
//       updated.push(tech);
//     }

//     dispatch(MapActions.setFilters({ technologies: updated }));
//   };
  
//  return ( 
//   <div style={{ display: "flex", gap: "16px", padding: "12px 16px", background: "#ffffff", borderBottom: "1px solid #e5e5e5" }} >
//      {/* REGION FILTER */} 
//      <select 
//      value={filters.region || ""} 
//      onChange={(e) => handleChange("region", e.target.value || null)} > <option value="">All Regions</option> <option value="North">North</option> <option value="South">South</option> <option value="East">East</option> <option value="West">West</option> </select> {/* TECHNOLOGY FILTER */} <select value={filters.technology || ""} onChange={(e) => handleChange("technology", e.target.value || null)} > <option value="">All Technologies</option> <option value="2G">2G</option> <option value="3G">3G</option> <option value="4G">4G</option> <option value="5G">5G</option> </select> </div> );
// };

// export default TelecomFiltersPanel;

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import MapActions from "../../store/actions/map-actions";

const TelecomFiltersPanel = () => {

  const dispatch = useDispatch();

  const filters = useSelector(state => state.map.filters);
  const techWithBand = useSelector(state => state.map.tech_with_band);

  /* ============================================================
     🔹 Convert Redux Filters → Backend Payload
     Required format:
     {
        Region: [],
        "2G": ["GSM900","GSM1800"],
        "3G": ["U2100-C1"]
     }
  ============================================================ */

  const buildBackendPayload = () => {

    const payload = {};

    // Regions
    if (filters.regions.length > 0) {
      payload["Region"] = filters.regions;
    }

    // Technology → Band
    Object.keys(filters.technologyBands || {}).forEach(tech => {
      if (filters.technologyBands[tech]?.length > 0) {
        payload[tech] = filters.technologyBands[tech];
      }
    });

    return payload;
  };

  /* ============================================================
     🔹 Apply Filters (API Call)
  ============================================================ */

  const applyFilters = () => {
    const backendPayload = buildBackendPayload();
    dispatch(MapActions.getMultiVendorCells(backendPayload));
  };

  /* ============================================================
     🔹 On First Load → Fetch Data
  ============================================================ */

  useEffect(() => {
    applyFilters();
  }, []);

  /* ============================================================
     🔹 Toggle Region
  ============================================================ */

  const toggleRegion = (region) => {
    let updated = [...filters.regions];

    if (updated.includes(region)) {
      updated = updated.filter(r => r !== region);
    } else {
      updated.push(region);
    }

    dispatch(MapActions.setFilters({ regions: updated }));
    setTimeout(applyFilters, 0);
  };

  /* ============================================================
     🔹 Toggle Band under Technology
  ============================================================ */

  const toggleBand = (tech, band) => {

    const updatedTechBands = {
      ...filters.technologyBands
    };

    if (!updatedTechBands[tech]) {
      updatedTechBands[tech] = [];
    }

    if (updatedTechBands[tech].includes(band)) {
      updatedTechBands[tech] =
        updatedTechBands[tech].filter(b => b !== band);
    } else {
      updatedTechBands[tech].push(band);
    }

    dispatch(MapActions.setFilters({
      technologyBands: updatedTechBands
    }));

    setTimeout(applyFilters, 0);
  };

  /* ============================================================
     🔹 UI
  ============================================================ */

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e5e5",
        display: "flex",
        gap: "32px",
        flexWrap: "wrap"
      }}
    >

      {/* ================= REGION FILTER ================= */}
      <div>
        <strong>Region</strong>
        <div style={{ marginTop: "6px" }}>
          {["Pernambuco","Bahia","Ceara","Parana","Sao_Paulo","Rio_Grande_do_Sul","Rio_de_Janeiro"]
            .map(region => (
            <label key={region} style={{ marginRight: "12px" }}>
              <input
                type="checkbox"
                checked={filters.regions.includes(region)}
                onChange={() => toggleRegion(region)}
              />
              {region}
            </label>
          ))}
        </div>
      </div>

      {/* ================= TECHNOLOGY + BAND ================= */}
      <div>
        <strong>Technology / Band</strong>

        {techWithBand && Object.keys(techWithBand).map(tech => (
          <div key={tech} style={{ marginTop: "8px" }}>

            <div style={{ fontWeight: 600 }}>{tech}</div>

            <div style={{ marginLeft: "10px", marginTop: "4px" }}>
              {techWithBand[tech].map(band => (
                <label key={band} style={{ marginRight: "10px" }}>
                  <input
                    type="checkbox"
                    checked={
                      filters.technologyBands?.[tech]?.includes(band) || false
                    }
                    onChange={() => toggleBand(tech, band)}
                  />
                  {band}
                </label>
              ))}
            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default TelecomFiltersPanel;