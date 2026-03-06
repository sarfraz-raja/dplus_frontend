// import React, { useEffect, useState, useRef } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import MapActions from "../../store/actions/map-actions";
// import AuthActions from "../../store/actions/auth-actions";

// const TelecomGlobalFilters = () => {

//   const dispatch = useDispatch();

//   const allFilters = useSelector(state => state.map.telecomFilterMeta);
//   const techWithBand = useSelector(state => state.map.telecomTechMeta);
//   const mapConfig = useSelector(state => state.map.config);
//   const syncEnabled = useSelector(state => state.map.syncEnabled);
//   const rawCells = useSelector(state => state.map.rawCells || []);

//   const [openDropdown, setOpenDropdown] = useState(null);
//   const [selected, setSelected] = useState({});
//   const [siteSearch, setSiteSearch] = useState("");
//   const [showScale, setShowScale] = useState(false);
//   const scaleRef = useRef(null)

//   const siteSuggestions = [
//     ...new Set(rawCells.map(cell => cell.site_name))
//     ].filter(site =>
//     site?.toLowerCase().includes(siteSearch.toLowerCase())
//  );

//   /* -------------------------
//      LOAD FILTER METADATA
//   --------------------------*/
//   useEffect(() => {
//     dispatch(MapActions.getTelecomFilterMeta());
//     dispatch(MapActions.getTelecomTechMeta());
//     dispatch(MapActions.getMultiVendorCells({}));
//   }, []);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (scaleRef.current && !scaleRef.current.contains(event.target)) {
//         setShowScale(false);
//       }
//     };

//     if (showScale) {
//       document.addEventListener("mousedown", handleClickOutside);
//     }

//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [showScale]);

//   const toggleDropdown = (name) => {
//     setOpenDropdown(openDropdown === name ? null : name);
//   };

//   const handleCheck = (parent, value) => {
//     setSelected(prev => {
//       const existing = prev[parent] || [];
//       if (existing.includes(value)) {
//         return { ...prev, [parent]: existing.filter(v => v !== value) };
//       }
//       return { ...prev, [parent]: [...existing, value] };
//     });
//   };

//   /* -------------------------
//      SUBMIT (Backend Driven + Persisted)
//   --------------------------*/
//   const handleSubmit = () => {

//     const payload = { ...selected };

//     if (siteSearch.trim()) {
//       payload.site_name = [siteSearch.trim()];
//     }

//     dispatch(MapActions.getMultiVendorCells(payload));

//     dispatch(AuthActions.setupConf(true, {
//       mapScale: mapConfig.mapScale,
//       mapView: mapConfig.mapView,
//       saveMapFilters: JSON.stringify(payload)
//     }));
//   };

//   const handleClear = () => {
//     setSelected({});
//     setSiteSearch("");
//     dispatch(MapActions.getMultiVendorCells({}));
//   };

//   /* -------------------------
//      SAFE RENDER HELPERS
//   --------------------------*/

// //  const renderRegionDropdown = () => {
// //   if (!allFilters?.d1) return null;

// //   const regionBlock = allFilters.d1.find(
// //     item => item.parent === "Region"
// //   );

// //   if (!regionBlock) return null;

// //   return (
// //     <div className="absolute top-8 bg-white text-black p-3 rounded shadow z-50 w-48 max-h-60 overflow-y-auto">
// //       {/* {regionBlock.child.map(region => (
// //         <label key={region} className="block text-sm"> */}
// //         {regionBlock.child.map((region, index) => (
// //         <label key={`region-${region}-${index}`} className="block text-sm">
// //           <input
// //             type="checkbox"
// //             className="mr-2"
// //             onChange={() => handleCheck("Region", region)}
// //           />
// //           {region}
// //         </label>
// //       ))}
// //     </div>
// //   );
// // };

// // const renderTechDropdown = () => {
// //   if (!Array.isArray(techWithBand)) return null;

// //   return (
// //     <div className="absolute top-8 bg-white text-black p-4 rounded shadow z-50 w-64 max-h-72 overflow-y-auto">
// //       {techWithBand.map((block, blockIndex) => (
// //         <div key={`tech-${block.parent}-${blockIndex}`} className="mb-3">
// //           <p className="font-semibold">{block.parent}</p>

// //           {Array.isArray(block.child) &&
// //             block.child.map((band, bandIndex) => (
// //             <label key={`band-${block.parent}-${band}-${bandIndex}`} className="block text-sm">
// //                 <input
// //                   type="checkbox"
// //                   className="mr-2"
// //                   onChange={() => handleCheck(block.parent, band)}
// //                 />
// //                 {band}
// //               </label>
// //             ))}
// //         </div>
// //       ))}
// //     </div>
// //   );
// // };


//   return (
// //     <div className="flex items-center gap-6 bg-[#0f1f3d] px-4 py-2 text-white text-sm">

// //       {/* REGION */}
// //       {/* <div className="relative flex items-center gap-2">
// //         <span className="text-gray-300 text-xs uppercase">Region</span>
// //         <button onClick={() => toggleDropdown("region")}>
// //           Select ▾
// //         </button>
// //         {openDropdown === "region" && renderRegionDropdown()}
// //       </div> */}

// //       {/* TECHNOLOGY */}
// //       {/* <div className="relative flex items-center gap-2">
// //         <span className="text-gray-300 text-xs uppercase">Technology</span>
// //         <button onClick={() => toggleDropdown("tech")}>
// //           Select ▾
// //         </button>
// //         {openDropdown === "tech" && renderTechDropdown()}
// //       </div> */}

// //       {/* DYNAMIC BACKEND FILTERS */}
// //       {Array.isArray(allFilters?.d1) &&
// //         allFilters.d1.map((group, groupIndex) => (
// //           <div
// //             key={`filter-${group.parent}-${groupIndex}`}
// //             className="relative flex items-center gap-2"
// //           >
// //             <span className="text-gray-300 text-xs uppercase">
// //               {group.parent}
// //             </span>

// //             <button
// //               onClick={() => toggleDropdown(group.parent)}
// //               className="hover:text-white"
// //             >
// //               Select ▾
// //             </button>

// //             {openDropdown === group.parent && (
// //               <div className="absolute left-0 top-full mt-2 bg-white text-black p-4 rounded shadow z-50 w-64 max-h-72 overflow-y-auto">

// //                 {group.child?.map((item, itemIndex) => (
// //                   <div key={`item-${item.name}-${itemIndex}`} className="mb-3">

// //                     <p className="font-semibold">{item.name}</p>

// //                     {item.columnName?.map((band, bandIndex) => (
// //                       <label
// //                         key={`band-${band.name}-${bandIndex}`}
// //                         className="block text-sm"
// //                       >
// //                         <input
// //                           type="checkbox"
// //                           className="mr-2"
// //                           onChange={() => handleCheck(item.name, band.name)}
// //                         />
// //                         {band.name}
// //                       </label>
// //                     ))}

// //                   </div>
// //                 ))}

// //               </div>
// //             )}
// //           </div>
// //       ))}

// //       {/* SITE */}
// //       <div className="relative flex items-center gap-2">
// //         <span className="text-gray-300 text-xs uppercase">Site</span>

// //         <input
// //           type="text"
// //           value={siteSearch}
// //           onChange={(e) => setSiteSearch(e.target.value)}
// //           placeholder="Search site ID..."
// //           className="bg-[#1b2f55] px-2 py-1 rounded text-white text-sm"
// //         />

// //         {siteSearch && (
// //           <div className="absolute top-8 bg-white text-black w-48 max-h-60 overflow-y-auto rounded shadow z-50">
// //             {siteSuggestions.map((site, index) => (
// //               <div key={`site-${site}-${index}`}
// //                 onClick={() => setSiteSearch(site)}
// //                 className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
// //               >
// //                 {site}
// //               </div>
// //             ))}
// //           </div>
// //         )}
// //       </div>

// //       {/* MAP SCALE */}
// //       {/* <div className="flex items-center gap-2">
// //         <span className="text-gray-300 text-xs uppercase">Map Scale</span>
// //         <input
// //           type="range"
// //           min={0.5}
// //           max={3}
// //           step={0.1}
// //           value={mapConfig.mapScale}
// //           onChange={(e) =>
// //             dispatch(
// //               MapActions.setMapConfig({
// //                 mapScale: parseFloat(e.target.value)
// //               })
// //             )
// //           }
// //           className="w-24"
// //         />
// //         <span className="text-xs">{mapConfig.mapScale}x</span>
// //       </div> */}
// // <div
// //   ref={scaleRef}
// //   className="relative inline-block"
// // >

// //   {/* Trigger Button */}
// //   <button
// //     onClick={() => setShowScale(prev => !prev)}
// //     className="px-3 py-1 bg-gray-100 hover:bg-green-100 text-black text-xs rounded-md transition"
// //   >
// //     Scale
// //   </button>

// //   {/* Dropdown Panel */}
// //   {showScale && (
// //     <div className="absolute right-0 mt-2 bg-gray-900 p-3 rounded-lg shadow-xl border border-gray-700 z-50">

// //       <div className="flex flex-col items-center gap-2">

// //         <span className="text-gray-300 text-xs uppercase tracking-wide">
// //           Scale
// //         </span>

// //         <input
// //           type="range"
// //           min={0.5}
// //           max={3}
// //           step={0.1}
// //           value={mapConfig.mapScale}
// //           onChange={(e) =>
// //             dispatch(
// //               MapActions.setMapConfig({
// //                 mapScale: parseFloat(e.target.value)
// //               })
// //             )
// //           }
// //           className="h-24 cursor-pointer"
// //           style={{
// //             writingMode: 'vertical-lr',
// //             direction: 'rtl',
// //             appearance: 'slider-vertical',
// //             WebkitAppearance: 'slider-vertical',
// //           }}
// //         />

// //         <span className="text-xs text-gray-300 font-medium">
// //           {mapConfig.mapScale}x
// //         </span>

// //       </div>
// //     </div>
// //   )}

// // </div>

// //       {/* MAP VIEW */}
// //       <div className="flex items-center gap-2">
// //         <span className="text-gray-300 text-xs uppercase">Map View</span>
// //         <select
// //           value={mapConfig.mapView}
// //           onChange={(e) =>
// //             dispatch(
// //               MapActions.setMapConfig({
// //                 mapView: e.target.value
// //               })
// //             )
// //           }
// //           className="bg-[#1b2f55] text-white px-2 py-1 rounded"
// //         >
// //           <option value="mapbox://styles/mapbox/standard">Standard</option>
// //           <option value="mapbox://styles/mapbox/streets-v11">Streets</option>
// //           <option value="mapbox://styles/mapbox/outdoors-v11">Outdoors</option>
// //           <option value="mapbox://styles/mapbox/light-v10">Light</option>
// //           <option value="mapbox://styles/mapbox/dark-v10">Dark</option>
// //           <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
// //           <option value="mapbox://styles/mapbox/satellite-streets-v11">Satellite Streets</option>
// //           <option value="mapbox://styles/mapbox/navigation-day-v1">Navigation Day</option>
// //           <option value="mapbox://styles/mapbox/navigation-night-v1">Navigation Night</option>
// //         </select>
// //       </div>

// //       {/* MAPSYNC */}
// //       <div className="flex items-center gap-2">
// //         <span className="text-gray-300 text-xs uppercase">MapSync</span>
// //         <button
// //           onClick={() => dispatch(MapActions.setSyncEnabled(!syncEnabled))}
// //           className={`w-10 h-5 rounded-full p-1 transition ${
// //             syncEnabled ? "bg-blue-500" : "bg-gray-400"
// //           }`}
// //         >
// //           <div
// //             className={`bg-white w-4 h-4 rounded-full transform transition ${
// //               syncEnabled ? "translate-x-4" : ""
// //             }`}
// //           />
// //         </button>
// //       </div>

// //       {/* RIGHT SIDE BUTTONS */}
// //       <div className="flex gap-2 flex-wrap ml-auto">
// //         <button
// //           onClick={handleClear}
// //           className="bg-gray-500 px-3 py-1 rounded"
// //         >
// //           Clear
// //         </button>
// //         <button
// //           onClick={handleSubmit}
// //           className="bg-blue-500 px-4 py-1 rounded"
// //         >
// //           Submit
// //         </button>
// //       </div>

// //     </div>

// <div className="flex items-center gap-4 bg-[#0f1f3d] px-4 py-2 text-white text-sm">

//   {/* DYNAMIC BACKEND FILTERS */}
//   {Array.isArray(allFilters?.d1) &&
//     allFilters.d1.map((group, groupIndex) => (
//       <div
//         key={`filter-${group.parent}-${groupIndex}`}
//         className="relative"
//       >
//         <button
//           onClick={() => toggleDropdown(group.parent)}
//           className="px-3 py-1 bg-[#1b2f55] hover:bg-[#243b6b] text-white text-xs rounded-md transition"
//         >
//           {group.parent} ▾
//         </button>

//         {openDropdown === group.parent && (
//           <div
//             className="absolute left-0 mt-2 bg-white text-black p-4 rounded shadow z-50 w-64 max-h-72 overflow-y-auto"
//             onClick={(e) => e.stopPropagation()}
//           >
//             {group.child?.map((item, itemIndex) => (
//               <div key={`item-${item.name}-${itemIndex}`} className="mb-3">
//                 <p className="font-semibold text-sm mb-1">
//                   {item.name}
//                 </p>

//                 {item.columnName?.map((band, bandIndex) => (
//                   <label
//                     key={`band-${band.name}-${bandIndex}`}
//                     className="block text-sm"
//                   >
//                     <input
//                       type="checkbox"
//                       className="mr-2"
//                       onChange={() =>
//                         handleCheck(item.name, band.name)
//                       }
//                     />
//                     {band.name}
//                   </label>
//                 ))}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     ))}

//   {/* SITE DROPDOWN */}
//   <div className="relative">
//     <button
//       onClick={() => toggleDropdown("site")}
//       className="px-3 py-1 bg-[#1b2f55] hover:bg-[#243b6b] text-white text-xs rounded-md transition"
//     >
//       Site ▾
//     </button>

//     {openDropdown === "site" && (
//       <div
//         className="absolute left-0 mt-2 bg-white text-black p-3 rounded shadow z-50 w-64"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <input
//           type="text"
//           value={siteSearch}
//           onChange={(e) => setSiteSearch(e.target.value)}
//           placeholder="Search site..."
//           className="w-full border px-2 py-1 rounded mb-2 text-sm"
//         />

//         <div className="max-h-48 overflow-y-auto">
//           {siteSuggestions.map((site, index) => (
//             <div
//               key={`site-${index}`}
//               onClick={() => {
//                 setSiteSearch(site);
//                 setOpenDropdown(null);
//               }}
//               className="px-2 py-1 hover:bg-gray-200 cursor-pointer text-sm"
//             >
//               {site}
//             </div>
//           ))}
//         </div>
//       </div>
//     )}
//   </div>

//   {/* SCALE BUTTON (Already Styled Correctly) */}
//   <div ref={scaleRef} className="relative">
//     <button
//       onClick={() => setShowScale(prev => !prev)}
//       className="px-3 py-1 bg-gray-100 hover:bg-green-100 text-black text-xs rounded-md transition"
//     >
//       Scale
//     </button>

//     {showScale && (
//       <div
//         className="absolute right-0 mt-2 bg-gray-900 p-3 rounded-lg shadow-xl border border-gray-700 z-50"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <div className="flex flex-col items-center gap-2">
//           <span className="text-gray-300 text-xs uppercase">
//             Scale
//           </span>

//           <input
//             type="range"
//             min={0.5}
//             max={3}
//             step={0.1}
//             value={mapConfig.mapScale}
//             onChange={(e) =>
//               dispatch(
//                 MapActions.setMapConfig({
//                   mapScale: parseFloat(e.target.value)
//                 })
//               )
//             }
//             className="h-24 cursor-pointer"
//             style={{
//               writingMode: "vertical-lr",
//               direction: "rtl",
//               appearance: "slider-vertical",
//               WebkitAppearance: "slider-vertical",
//             }}
//           />

//           <span className="text-xs text-gray-300 font-medium">
//             {mapConfig.mapScale}x
//           </span>
//         </div>
//       </div>
//     )}
//   </div>

//   {/* MAP VIEW DROPDOWN */}
//   <div className="relative">
//     <button
//       onClick={() => toggleDropdown("mapView")}
//       className="px-3 py-1 bg-[#1b2f55] hover:bg-[#243b6b] text-white text-xs rounded-md transition"
//     >
//       Map View ▾
//     </button>

//     {openDropdown === "mapView" && (
//       <div
//         className="absolute left-0 mt-2 bg-white text-black p-2 rounded shadow z-50 w-56"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {[
//           { label: "Standard", value: "mapbox://styles/mapbox/standard" },
//           { label: "Streets", value: "mapbox://styles/mapbox/streets-v11" },
//           { label: "Outdoors", value: "mapbox://styles/mapbox/outdoors-v11" },
//           { label: "Light", value: "mapbox://styles/mapbox/light-v10" },
//           { label: "Dark", value: "mapbox://styles/mapbox/dark-v10" },
//           { label: "Satellite", value: "mapbox://styles/mapbox/satellite-v9" },
//           { label: "Satellite Streets", value: "mapbox://styles/mapbox/satellite-streets-v11" },
//           { label: "Navigation Day", value: "mapbox://styles/mapbox/navigation-day-v1" },
//           { label: "Navigation Night", value: "mapbox://styles/mapbox/navigation-night-v1" }
//         ].map((option) => (
//           <div
//             key={option.value}
//             onClick={() => {
//               dispatch(
//                 MapActions.setMapConfig({
//                   mapView: option.value
//                 })
//               );
//               setOpenDropdown(null);
//             }}
//             className="px-2 py-1 hover:bg-gray-200 cursor-pointer text-sm"
//           >
//             {option.label}
//           </div>
//         ))}
//       </div>
//     )}
//   </div>

//   {/* MAPSYNC */}
//   <div className="flex items-center gap-2 ml-2">
//     <span className="text-xs text-gray-300">Sync</span>
//     <button
//       onClick={() =>
//         dispatch(MapActions.setSyncEnabled(!syncEnabled))
//       }
//       className={`w-10 h-5 rounded-full p-1 transition ${
//         syncEnabled ? "bg-blue-500" : "bg-gray-400"
//       }`}
//     >
//       <div
//         className={`bg-white w-4 h-4 rounded-full transform transition ${
//           syncEnabled ? "translate-x-4" : ""
//         }`}
//       />
//     </button>
//   </div>

//   {/* RIGHT SIDE BUTTONS */}
//   <div className="flex gap-2 flex-wrap ml-auto">
//     <button
//       onClick={handleClear}
//       className="bg-gray-500 px-3 py-1 rounded text-xs"
//     >
//       Clear
//     </button>
//     <button
//       onClick={handleSubmit}
//       className="bg-blue-500 px-4 py-1 rounded text-xs"
//     >
//       Submit
//     </button>
//   </div>

// </div>
//   );
// };

// export default TelecomGlobalFilters;

import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import MapActions from "../../store/actions/map-actions";
import AuthActions from "../../store/actions/auth-actions";
import { UilAngleDown, UilAngleUp } from '@iconscout/react-unicons';

const TelecomGlobalFilters = () => {
  const dispatch = useDispatch();

  const allFilters = useSelector(state => state.map.telecomFilterMeta);
  const mapConfig = useSelector(state => state.map.config);
  const syncEnabled = useSelector(state => state.map.syncEnabled);
  const rawCells = useSelector(state => state.map.rawCells || []);
  const boundaryGroups = useSelector(
    state => state.map.boundaryGroups || []
  );
  console.log("BOUNDARY GROUPS STATE:", boundaryGroups);
  console.log("RENDERING BOUNDARY UI:", boundaryGroups);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selected, setSelected] = useState({});
  const [siteSearch, setSiteSearch] = useState("");

  const [selectedLayers, setSelectedLayers] = useState({});
  const [selectedBoundaries, setSelectedBoundaries] = useState({});
  const [expandedLayer, setExpandedLayer] = useState(null);

  const containerRef = useRef(null);

  const [searchMode, setSearchMode] = useState("site"); // "site" | "cell"
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    dispatch(MapActions.getTelecomFilterMeta());
    dispatch(MapActions.getMultiVendorCells({}));
  }, []);

  /* ----------- CLOSE DROPDOWN ON OUTSIDE CLICK ----------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // const handleBoundaryCheck = (group, name) => {

  //   setSelectedBoundaries(prev => {

  //     const existing = prev[group] || [];

  //     if (existing.includes(name)) {
  //       return {
  //         ...prev,
  //         [group]: existing.filter(n => n !== name)
  //       };
  //     }

  //     return {
  //       ...prev,
  //       [group]: [...existing, name]
  //     };

  //   });

  // };

  const toggleLayer = (group) => {

    setSelectedLayers(prev => ({
      ...prev,
      [group]: !prev[group]
    }));

    setExpandedLayer(prev =>
      prev === group ? null : group
    );

  };

  const handleBoundaryCheck = (group, name) => {

    setSelectedBoundaries(prev => {

      const existing = prev[group] || [];

      if (existing.includes(name)) {
        return {
          ...prev,
          [group]: existing.filter(n => n !== name)
        };
      }

      return {
        ...prev,
        [group]: [...existing, name]
      };

    });

  };

  // const applyBoundaryLayers = () => {

  //   Object.keys(selectedBoundaries).forEach(group => {

  //     const names = selectedBoundaries[group] || [];

  //     dispatch(
  //       MapActions.getBoundaryGeoJson(
  //         group,
  //         "ADM1",
  //         names
  //       )
  //     );

  //   });

  //   setOpenDropdown(null);

  // };

  const applyBoundaryLayers = () => {

    boundaryGroups.forEach(group => {

      const parentSelected = selectedLayers[group.shapegroup];
      const children = selectedBoundaries[group.shapegroup] || [];

      if (parentSelected) {

        dispatch(
          MapActions.getBoundaryGeoJson(
            group.shapegroup,
            group.shapetypes[0],
            []
          )
        );

      }

      else if (children.length > 0) {

        dispatch(
          MapActions.getBoundaryGeoJson(
            group.shapegroup,
            group.shapetypes[0],
            children
          )
        );

      }

    });

    setOpenDropdown(null);

  };

  const clearBoundaryLayers = () => {

    setSelectedLayers({});
    setSelectedBoundaries({});
    setExpandedLayer(null);

    dispatch(MapActions.clearBoundaryLayer());
    setOpenDropdown(null);

  };

  const handleCheck = (parent, value) => {
    setSelected(prev => {
      const existing = prev[parent] || [];
      if (existing.includes(value)) {
        return { ...prev, [parent]: existing.filter(v => v !== value) };
      }
      return { ...prev, [parent]: [...existing, value] };
    });
  };

  const handleSubmit = () => {
    const payload = { ...selected };
    if (siteSearch.trim()) {
      payload.site_name = [siteSearch.trim()];
    }

    dispatch(MapActions.getMultiVendorCells(payload));

    dispatch(AuthActions.setupConf(true, {
      mapScale: mapConfig.mapScale,
      mapView: mapConfig.mapView,
      saveMapFilters: JSON.stringify(payload)
    }));
  };

  // const handleClear = () => {
  //   setSelected({});
  //   setSiteSearch("");
  //   dispatch(MapActions.getMultiVendorCells({}));

  // };

  const handleClear = () => {

    setSelected({});
    setSiteSearch("");
    setSelectedSite(null);
    setSelectedCell(null);
    // setHighlightedCell(null);
    setOpenDropdown(null);

    dispatch(MapActions.setHighlightedCell(null));
    dispatch(MapActions.setSelectedCell(null));

    dispatch(
      MapActions.setViewState({
        longitude: 77.209,
        latitude: 28.6139,
        zoom: 6,
        pitch: 0,
        bearing: 0
      })
    );

    dispatch(MapActions.getMultiVendorCells({}));

  };

  const handleResetSearch = () => {

    setSelectedSite(null);
    setSelectedCell(null);
    setSiteSearch("");

    dispatch(MapActions.setHighlightedCell(null));
    dispatch(MapActions.setSelectedCell(null));
  };

  // const siteSuggestions = [
  //   ...new Set(rawCells.map(cell => cell.site_name))
  // ].filter(site =>
  //   site?.toLowerCase().includes(siteSearch.toLowerCase())
  // );

  const siteList = [...new Set(rawCells.map(cell => cell.site_name))];

  const filteredSites = siteList.filter(site =>
    site?.toLowerCase().includes(siteSearch.toLowerCase())
  );

  const filteredCells = rawCells
    .filter(cell =>
      (!selectedSite || cell.site_name === selectedSite) &&
      cell.cell_id?.toLowerCase().includes(siteSearch.toLowerCase())
    )
    .slice(0, 50); // limit for performance
  

  return (
    <div
      ref={containerRef}
  className="flex flex-wrap items-start
 gap-3 bg-[#0b1c38] px-4 py-3 text-white text-sm  w-full"
    >

       {/* ----------- SCALE ----------- */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown("scale")}
              className="px-4 py-2 bg-[#162a52] hover:bg-[#1e3a70] text-white text-sm rounded-lg border border-[#2c4a85] transition min-w-[120px] flex items-center justify-center"
        >
           Scale ▾
        </button>

        {openDropdown === "scale" && (
          <div className="absolute right-0 mt-3 bg-[#1b2f55] p-4 rounded-xl shadow-xl z-50 w-[120px]">
            <div className="flex flex-col items-center gap-3">
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={mapConfig.mapScale}
                onChange={(e) =>
                  dispatch(
                    MapActions.setMapConfig({
                      mapScale: parseFloat(e.target.value)
                    })
                  )
                }
                className="h-24 cursor-pointer"
                style={{
                  writingMode: "vertical-lr",
                  direction: "rtl",
                  appearance: "slider-vertical",
                  WebkitAppearance: "slider-vertical"
                }}
              />

              <span className="text-xs text-white font-medium">
                {mapConfig.mapScale}x
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ----------- DYNAMIC FILTERS ----------- */}
      {Array.isArray(allFilters?.d1) &&
        allFilters.d1.map((group, groupIndex) => (
          <div key={groupIndex} className="relative">

            <button
              onClick={() => toggleDropdown(group.parent)}
              className="px-4 py-2 bg-[#162a52] hover:bg-[#1e3a70] text-white text-sm rounded-lg border border-[#2c4a85] transition min-w-[120px] flex justify-between items-center"
            >
              {group.parent} ▾
            </button>

            {openDropdown === group.parent && (
              // <div className="absolute right-0 mt-3 bg-[#f8fafc] text-black p-5 rounded-xl shadow-2xl border border-gray-300 z-50 w-[300px] max-w-[90vw] max-h-[70vh] overflow-y-auto">
<div className="absolute left-0 mt-3 bg-white text-black p-5 rounded-xl shadow-2xl z-50
w-[260px] sm:w-[320px] max-w-[90vw] max-h-[70vh] overflow-y-auto">              {group.child?.map((techBlock, techIndex) => {

                  const isTechSelected =
                    selected[techBlock.name]?.length ===
                    techBlock.columnName?.length;

                  return (
                    <div key={techIndex} className="mb-4 border-b pb-3">

                      {/* Parent Technology */}
                      <div className="flex items-center justify-between mb-2">

                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isTechSelected}
                            onChange={() => {
                              const allBands =
                                techBlock.columnName.map(b => b.name);
                              setSelected(prev => ({
                                ...prev,
                                [techBlock.name]:
                                  isTechSelected ? [] : allBands
                              }));
                            }}
                          />
                          {techBlock.name}
                        </label>

                        <input
                          type="color"
                          className="w-6 h-6 cursor-pointer"
                          onChange={(e) =>
                            console.log("Tech Color:", techBlock.name, e.target.value)
                          }
                        />
                      </div>

                      {/* Bands */}
                      <div className="pl-5 space-y-1">
                        {techBlock.columnName?.map((band, bandIndex) => (
                          <div
                            key={bandIndex}
                            className="flex items-center justify-between"
                          >
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={
                                  selected[techBlock.name]?.includes(band.name) || false
                                }
                                onChange={() =>
                                  handleCheck(techBlock.name, band.name)
                                }
                              />
                              {band.name}
                            </label>

                            <input
                              type="color"
                              className="w-5 h-5 cursor-pointer"
                              onChange={(e) =>
                                console.log("Band Color:", band.name, e.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>

                    </div>
                  );
                })}

              </div>
            )}
          </div>
        ))}

      {/* ADD GeoJSON map Layers(Boundary Groups) */}
      {/* {boundaryGroups?.map((group, index) => (

        <div key={index} className="relative">

          <button
            onClick={() => toggleDropdown(group.shapegroup)}
            className="px-4 py-2 bg-[#162a52] hover:bg-[#1e3a70] text-white text-sm rounded-lg border border-[#2c4a85]"
          >
            {group.shapegroup} Boundaries ▾
          </button>

          {openDropdown === group.shapegroup && (

            <div className="absolute left-0 mt-3 bg-white text-black p-5 rounded-xl shadow-xl z-50 w-[320px] max-h-[400px] overflow-y-auto">

              {group.shapenames.map((name, idx) => (

                <label key={idx} className="flex items-center gap-2 text-sm">

                  <input
                    type="checkbox"
                    checked={
                      selectedBoundaries[group.shapegroup]?.includes(name) || false
                    }
                    onChange={() =>
                      handleBoundaryCheck(group.shapegroup, name)
                    }
                  />

                  {name}

                </label>

              ))}

              <button
                onClick={() => {

                  dispatch(
                    MapActions.getBoundaryGeoJson(
                      group.shapegroup,
                      group.shapetypes[0],
                      selectedBoundaries[group.shapegroup] || []
                    )
                  );

                  setOpenDropdown(null);

                }}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded"
              >
                Apply Layer
              </button>

            </div>

          )}

        </div>

      ))} */}

      {/* ----------- MAP VIEW ----------- */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown("mapView")}
          className="
          px-3 py-2
          bg-[#162a52]
          hover:bg-[#1e3a70]
          text-white text-sm
          rounded-lg
          border border-[#2c4a85]
          transition
          min-w-[80px]
          w-auto"        
        >
          Map View ▾
        </button>

        {openDropdown === "mapView" && (
        <div className="absolute left-0 mt-3 bg-white text-black p-2 rounded-xl shadow-xl z-50
          w-[200px] sm:w-[220px] max-w-[90vw]">
              {[
              { label: "Standard", value: "mapbox://styles/mapbox/standard" },
              { label: "Streets", value: "mapbox://styles/mapbox/streets-v11" },
              { label: "Satellite", value: "mapbox://styles/mapbox/satellite-v9" },
              { label: "Dark", value: "mapbox://styles/mapbox/dark-v10" },
              { label: "Outdoors", value: "mapbox://styles/mapbox/outdoors-v11" },
              { label: "Light", value: "mapbox://styles/mapbox/light-v10" },
              { label: "Satellite Streets", value: "mapbox://styles/mapbox/satellite-streets-v11" },
              { label: "Navigation Day", value: "mapbox://styles/mapbox/navigation-day-v1" },
              { label: "Navigation Night", value: "mapbox://styles/mapbox/navigation-night-v1" }
            ].map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  dispatch(
                    MapActions.setMapConfig({
                      mapView: option.value
                    })
                  );
                  setOpenDropdown(null);
                }}
                className="px-2 py-1 hover:bg-gray-200 cursor-pointer text-sm"
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* ----------- SMART SEARCH ----------- */}
      <div className="relative">

        <button
          onClick={() => toggleDropdown("site")}
          className="
          px-3 py-2
          bg-[#162a52]
          hover:bg-[#1e3a70]
          text-white text-sm
          rounded-lg
          border border-[#2c4a85]
          transition
          min-w-[110px]
          w-auto
          "        >
          Search ▾
        </button>

        {openDropdown === "site" && (
        <div className="absolute left-0 mt-3 bg-white text-black p-5 rounded-xl shadow-2xl z-50
        w-[280px] sm:w-[320px] max-w-[90vw]">
            {/* Toggle Site / Cell Mode */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSearchMode("site")}
                className={`px-3 py-1 rounded-md text-sm ${
                  searchMode === "site"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                Site
              </button>

              <button
                onClick={() => setSearchMode("cell")}
                className={`px-3 py-1 rounded-md text-sm ${
                  searchMode === "cell"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                Cell
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={siteSearch}
              onChange={(e) => setSiteSearch(e.target.value)}
              placeholder={`Search ${searchMode}...`}
              className="w-full border border-gray-300 px-3 py-2 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Suggestions */}
            <div className="max-h-48 overflow-y-auto border rounded-md">

              {searchMode === "site" &&
                filteredSites.map((site, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedSite(site);
                      setSiteSearch(site);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {site}
                  </div>
                ))}

              {searchMode === "cell" &&
                filteredCells.map((cell, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedCell(cell);
                      setSiteSearch(cell.cell_id);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {cell.cell_id}
                    <span className="text-xs text-gray-500 ml-2">
                      ({cell.site_name})
                    </span>
                  </div>
                ))}

            </div>

            {/* Submit Button */}
            {/* <button
              onClick={() => {

                let payload = {};

                if (searchMode === "site" && selectedSite) {
                  payload.site_name = [selectedSite];
                }

                if (searchMode === "cell" && selectedCell) {
                  payload.cell_id = [selectedCell.cell_id];
                }

                dispatch(MapActions.getMultiVendorCells(payload));

                // Zoom logic
                if (selectedCell) {
                  dispatch(
                    MapActions.setViewState({
                      longitude: Number(selectedCell.longitude),
                      latitude: Number(selectedCell.latitude),
                      zoom: 12,
                      pitch: 0,
                      bearing: 0
                    })
                  );
                }

                setOpenDropdown(null);

              }}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
            >
              Apply & Zoom
            </button> */}

            {/* <button
              onClick={() => {

                let target = null;

                if (searchMode === "site" && selectedSite) {
                  target = rawCells.find(c => c.site_name === selectedSite);
                }

                if (searchMode === "cell" && selectedCell) {
                  target = selectedCell;
                }

              if (target) {

                dispatch(MapActions.setHighlightedCell(target.cell_id));

                dispatch(
                  MapActions.setViewState({
                    longitude: Number(target.longitude),
                    latitude: Number(target.latitude),
                    zoom: searchMode === "cell" ? 18 : 16,
                    transitionDuration: 1200
                  })
                );

              }

                setOpenDropdown(null);

              }}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
              >
              Apply & Zoom
            </button> */}

            <div className="mt-4 flex gap-2">

  <button
    onClick={() => {

      let target = null;

      if (searchMode === "site" && selectedSite) {
        target = rawCells.find(c => c.site_name === selectedSite);
      }

      if (searchMode === "cell" && selectedCell) {
        target = selectedCell;
      }

      if (target) {

        dispatch(MapActions.setHighlightedCell(target.cell_id));

        dispatch(
          MapActions.setViewState({
            longitude: Number(target.longitude),
            latitude: Number(target.latitude),
            zoom: searchMode === "cell" ? 18 : 16,
            transitionDuration: 1200
          })
        );

      }

      setOpenDropdown(null);

    }}
    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
  >
    Apply & Zoom
  </button>

  <button
    onClick={handleResetSearch}
    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
  >
    Reset Search
  </button>

</div>
          </div>
        )}
      </div>

      {/* ----------- ACTION BUTTONS ----------- */}
      <div className="flex gap-2 flex-wrap ml-auto">
          <button
          onClick={handleClear}
          className="bg-gray-500 px-4 py-2 rounded-lg text-sm"
        >
          Clear
        </button>
        <button
          onClick={handleSubmit}
          className="bg-blue-600 px-5 py-2 rounded-lg text-sm"
        >
          Submit
        </button>
      </div>


      {/* ----------- Search SITE bar----------- */}
      {/* <div className="relative">
        <button
          onClick={() => toggleDropdown("site")}
          className="
          px-3 py-2
          bg-[#162a52]
          hover:bg-[#1e3a70]
          text-white text-sm
          rounded-lg
          border border-[#2c4a85]
          transition
          min-w-[110px]
          w-auto
          "        >
          Site ▾
        </button>

        {openDropdown === "site" && (
          <div className="absolute left-0 mt-3 bg-white text-black p-4 rounded-xl shadow-xl z-50 w-[280px] max-w-[90vw]">
            <input
              type="text"
              value={siteSearch}
              onChange={(e) => setSiteSearch(e.target.value)}
              placeholder="Search site..."
              className="w-full border px-2 py-1 rounded mb-2 text-sm"
            />

            <div className="max-h-48 overflow-y-auto">
              {siteSuggestions.map((site, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSiteSearch(site);
                    setOpenDropdown(null);
                  }}
                  className="px-2 py-1 hover:bg-gray-200 cursor-pointer text-sm"
                >
                  {site}
                </div>
              ))}
            </div>
          </div>
        )}
      </div> */}

    {/* MAp layers */}
    <div className="relative">

        {/* BUTTON */}

        <button
          onClick={() => toggleDropdown("layers")}
          className="px-4 py-2 bg-[#162a52] hover:bg-[#1e3a70] text-white text-sm rounded-lg border border-[#2c4a85]"
        >
          Add Map Layer ▾
        </button>

        {openDropdown === "layers" && (
<div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 bg-white text-black p-4 rounded-xl shadow-xl z-50 w-[300px] sm:w-[340px] max-w-[90vw] max-h-[70vh] overflow-y-auto">
            <div className="flex gap-3 mb-2 ml-auto flex-shrink-0">

              <button
                onClick={applyBoundaryLayers}
                className="flex-1 bg-blue-600 text-white py-1 rounded"
              >
                Apply
              </button>

              <button
                onClick={clearBoundaryLayers}
                className="flex-1 bg-gray-400 text-white py-1 rounded"
              >
                Clear
              </button>

            </div>


            {/* LAYER GROUPS */}

            {boundaryGroups.map((group, index) => (

              <div key={index} className="border rounded p-2 mb-2">

                <div
                  onClick={() =>
                    setExpandedLayer(
                      expandedLayer === group.shapegroup
                        ? null
                        : group.shapegroup
                    )
                  }
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-100 rounded p-1"
                >

                  {/* LEFT SIDE */}

                  <div className="flex items-center gap-2">

                    <input
                      type="checkbox"
                      checked={selectedLayers[group.shapegroup] || false}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleLayer(group.shapegroup)}
                    />

                    <span className="font-medium">
                      {group.shapegroup} boundaries
                    </span>

                  </div>

                  {/* DROPDOWN ARROW */}

                  <span className="text-xl select-none">
                    {expandedLayer === group.shapegroup 
                      ? <UilAngleUp size={22} />
                      : <UilAngleDown size={22} />
                    }
                  </span>

                </div>

                {/* CHILD LIST */}

                {expandedLayer === group.shapegroup && (

                  <div className="mt-2 ml-4 max-h-[200px] overflow-y-auto border rounded p-2">

                    {group.shapenames.map((name, idx) => (

                      <label
                        key={idx}
                        className="flex items-center gap-2 text-sm mb-1 cursor-pointer"
                      >

                        <input
                          type="checkbox"
                          checked={
                            selectedBoundaries[group.shapegroup]?.includes(name) || false
                          }
                          onChange={() =>
                            handleBoundaryCheck(group.shapegroup, name)
                          }
                        />

                        {name}

                      </label>

                    ))}

                  </div>

                )}

              </div>

            ))}

          </div>

        )}

      </div>

        {/* ----------- MAPSYNC ----------- */}
        <div className="flex items-center gap-2">

          <span className="text-sm text-gray-300">Sync Maps</span>

          <button
            onClick={() =>
              dispatch(MapActions.setSyncEnabled(!syncEnabled))
            }
            className={`
              relative
              w-14 h-7
              rounded-full
              transition-colors duration-300
              ${syncEnabled ? "bg-blue-500" : "bg-gray-500"}
            `}
          >
            <span
              className={`
                absolute top-0 left-0
                w-7 h-7
                bg-white
                rounded-full
                shadow-md
                transform transition-transform duration-300
                ${syncEnabled ? "translate-x-7" : "translate-x-0"}
              `}
            />
          </button>
        </div>

    </div>
  );
};

export default TelecomGlobalFilters;

  // <div className="relative">

  //       {/* Button */}

  //       <button
  //         onClick={() => toggleDropdown("layers")}
  //         className="px-4 py-2 bg-[#162a52] hover:bg-[#1e3a70] text-white text-sm rounded-lg border border-[#2c4a85] transition min-w-[140px]"
  //       >
  //         Add Map Layer ▾
  //       </button>

  //       {/* Dropdown */}

  //       {openDropdown === "layers" && (

  //         <div className="absolute left-0 mt-3 bg-white text-black p-4 rounded-xl shadow-xl z-50 w-[320px] max-h-[500px] overflow-y-auto">

  //           {/* Apply / Clear */}

  //           <div className="flex gap-2 mb-3">

  //             <button
  //               onClick={applyBoundaryLayers}
  //               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 rounded"
  //             >
  //               Apply
  //             </button>

  //             <button
  //               onClick={clearBoundaryLayers}
  //               className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-1 rounded"
  //             >
  //               Clear
  //             </button>

  //           </div>

  //           {/* Boundary Groups */}

  //           {boundaryGroups.map((group, index) => (

  //             <div key={index} className="mb-3 border rounded p-2">

  //               {/* Parent Layer */}

  //               <label className="flex items-center gap-2 font-semibold cursor-pointer">

  //                 <input
  //                   type="checkbox"
  //                   checked={selectedLayers[group.shapegroup] || false}
  //                   onChange={() => toggleLayer(group.shapegroup)}
  //                 />

  //                 {group.shapegroup} boundaries

  //               </label>

  //               {/* Child Dropdown */}

  //               {expandedLayer === group.shapegroup && (

  //                 <div className="mt-2 ml-4 max-h-[200px] overflow-y-auto border rounded p-2">

  //                   {group.shapenames.map((name, idx) => (

  //                     <label
  //                       key={idx}
  //                       className="flex items-center gap-2 text-sm mb-1 cursor-pointer"
  //                     >

  //                       <input
  //                         type="checkbox"
  //                         checked={
  //                           selectedBoundaries[group.shapegroup]?.includes(name) || false
  //                         }
  //                         onChange={() =>
  //                           handleBoundaryCheck(group.shapegroup, name)
  //                         }
  //                       />

  //                       {name}

  //                     </label>

  //                   ))}

  //                 </div>

  //               )}

  //             </div>

  //           ))}

  //         </div>

  //       )}

  //     </div>