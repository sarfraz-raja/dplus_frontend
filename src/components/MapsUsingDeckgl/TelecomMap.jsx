import React, { useMemo, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import DeckGL from "@deck.gl/react";
import { PolygonLayer, ScatterplotLayer, GeoJsonLayer } from "@deck.gl/layers";
import { WebMercatorViewport } from "@deck.gl/core";
import Map from "react-map-gl";
import { Popup } from "react-map-gl";
import CellInfoPopup from './CellInfoPopup'; 
import * as Unicons from "@iconscout/react-unicons";
import MapActions from "../../store/actions/map-actions";
import generateSectorPolygon from "./Utils/GenerateSectorPolygon";

// ADD to existing imports
import { useNavigate } from 'react-router-dom';
import CommonActions from '../../store/actions/common-actions';
import { ALERTS } from '../../store/reducers/component-reducer';


const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const TelecomMap = ({ operator, geojsonLayer = null }) => {

  const dispatch = useDispatch();
  const deckRef = useRef(null);
  // const debounceRef = useRef(null); //to not send viewport data to backend on every minor change, but only after user stops interacting for 500ms
  
  const navigate = useNavigate();

  /* ============================================================
     🔹 REDUX STATE
  ============================================================ */

  const rawCells = useSelector(state => state.map.rawCells);
  const filters = useSelector(state => state.map.filters);
  const viewState = useSelector(state => state.map.viewState);
  const syncEnabled = useSelector(state => state.map.syncEnabled);
  const config = useSelector(state => state.map.config);
  const selectedCell = useSelector(state => state.map.selectedCell);
  const boundaryGeoJson = useSelector(
    state => state.map.boundaryGeoJson
  );

  const highlightedCell = useSelector(state => state.map.highlightedCell);
  
  const [localViewState, setLocalViewState] = useState(viewState);

  const activeViewState =
  (syncEnabled ? viewState : localViewState) || {
    longitude: 77.209,
    latitude: 28.6139,
    zoom: 6,
    pitch: 0,
    bearing: 0
  };

  const currentZoom = activeViewState?.zoom ?? 6;

  /* ============================================================
     🔹 LOCAL VIEW STATE (used only if sync disabled)
  ============================================================ */

  // useEffect(() => {
  //   if (rawCells.length > 0) {
  //     fitToData();
  //   }
  // }, [rawCells]);

  // ------Geojson layer zoom based filtering  of data-------
  // useEffect(() => {
  //   const initialView = activeViewState;

  //   const viewport = new WebMercatorViewport({
  //     ...initialView,
  //     width: window.innerWidth,
  //     height: window.innerHeight
  //   });

  //   const bounds = viewport.getBounds();

  //   dispatch(MapActions.getMultiVendorCells({
  //     bounds: {
  //       west: bounds[0][0],
  //       south: bounds[0][1],
  //       east: bounds[1][0],
  //       north: bounds[1][1]
  //     },
  //     zoom: initialView.zoom
  //   }));

  // }, []);   // 🔥 only once on mount

 useEffect(() => {
  dispatch(MapActions.getMultiVendorCells({
    vendor: [operator]
    }));
  }, [operator]);

// const hasFitted = useRef(false);
// useEffect(() => {
//   if (rawCells.length > 0 && !hasFitted.current) {
//     hasFitted.current = true;
//     fitToData();
//   }
// }, [rawCells]);

  useEffect(() => {
  // Only fit on initial load
    if (rawCells.length > 0 && viewState.zoom === 6) {
      fitToData();
    }
  }, [rawCells]);


  useEffect(() => {
    if (!syncEnabled && viewState) {
      setLocalViewState(viewState);
    }
  }, [syncEnabled, viewState]);
/* ============================================================
     🔹 APPLY GLOBAL FILTERS
  ============================================================ */

  const globallyFiltered = useMemo(() => {
    return rawCells.filter(cell => {

    // REGION MULTISELECT
    if (
        filters.regions.length > 0 &&
        !filters.regions.includes(cell.region)
    ) return false;

    // TECHNOLOGY MULTISELECT
    if (
        filters.technologies.length > 0 &&
        !filters.technologies.includes(cell.technology)
        ) return false;

      return true;
    });
  }, [rawCells, filters.regions, filters.technologies]);

  /* ============================================================
     🔹 APPLY OPERATOR FILTER (PROP-BASED) 
  ============================================================ */
  // const operatorFiltered = useMemo(() => {
  //   return globallyFiltered.filter(
  //     cell => cell.operator === operator
  //   );
  // }, [globallyFiltered, operator]);
 
  // const operatorFiltered = globallyFiltered;

   const operatorFiltered = rawCells;  //cell dataset

   /* ============================================================
   🔹 SITE AGGREGATION (1 marker per site)  -> siet datacet
============================================================ */

const siteAggregated = useMemo(() => {

  const siteMap = {};

  operatorFiltered.forEach(cell => {

    if (!siteMap[cell.site_name]) {
      siteMap[cell.site_name] = {
        site_name: cell.site_name,
        latitude: Number(cell.latitude),
        longitude: Number(cell.longitude),
        cell_count: 1
      };
    } else {
      siteMap[cell.site_name].cell_count += 1;
    }

  });
console.log("SITE COUNT:", Object.keys(siteMap).length);
console.log("CELL COUNT:", operatorFiltered.length);
  return Object.values(siteMap);

}, [operatorFiltered]);

  // const operatorFiltered = useMemo(() => {
  //   return rawCells.filter(cell => cell.operator === operator);
  // }, [rawCells, operator]);

  /* ============================================================
     🔹 MARKER LAYER (deck.gl)
  ============================================================ */
  const markerLayer = useMemo(() => {
    console.log(
      "MARKER DATA:",
      currentZoom < 9 ? "SITES" : "CELLS",
      currentZoom < 9 ? siteAggregated.length : operatorFiltered.length
    );

    if (!operatorFiltered || operatorFiltered.length === 0) return null;

    return new ScatterplotLayer({
      id: `marker-layer-${operator}`,
      // data: operatorFiltered,
      data: currentZoom < 9 ? siteAggregated : operatorFiltered,
      pickable: true,

      getPosition: d => {
        const lng = Number(d.longitude);
        const lat = Number(d.latitude);
        if (isNaN(lng) || isNaN(lat)) return [0, 0];
        return [lng, lat];
      },

      // getRadius: 120,
      // getRadius: d => {
      //   const zoom = currentZoom;
      //   return zoom < 10 ? 500 : zoom < 13 ? 200 : 80;
      // },
      getRadius: d => {

      // Site markers (zoomed out)
      if (currentZoom < 9) {
        return 200 + (d.cell_count || 1) * 20;
      }

      // Cell markers (mid zoom)
      if (currentZoom < 13) {
        return 120;
      }

      // When sectors appear
      return 60;
    },

      getFillColor: [255, 0, 0, 200],
      getLineColor: [0, 0, 0],
      getLineWidth: 1,

      // visible: currentZoom < 9 || selectedCell !== null, // show markers only at low zooms

      onClick: info => {
        if (info.object) {
          // dispatch(MapActions.setSelectedCell({
          //   ...info.object,
          //   _lng: info.object.longitude,
          //   _lat: info.object.latitude
          // }));
          if (currentZoom < 9) {
            dispatch(MapActions.setViewState({
              longitude: info.object.longitude,
              latitude: info.object.latitude,
              zoom: 13,
              transitionDuration: 800
            }));

          } else {

            dispatch(MapActions.setSelectedCell({
              ...info.object,
              _lng: info.object.longitude,
              _lat: info.object.latitude
            }));

          }
        }
      }
    });

  }, [operatorFiltered, operator, dispatch, currentZoom, selectedCell]);

  /* ============================================================
     🔹 SECTOR LAYER (deck.gl)
  ============================================================ */

  const sectorLayer = useMemo(() => {

    if (!operatorFiltered || operatorFiltered.length === 0) return null;

    return new PolygonLayer({
      id: `sector-layer-${operator}`,
      data: operatorFiltered,

      pickable: true,
      stroked: true,
      filled: true,

        getPolygon: d =>
            generateSectorPolygon(
            d.latitude,
            d.longitude,
            d.azimuth,
            d.beam_width || 60,
            d.radius_m || 500,
            config.mapScale
            ),

        // getFillColor: d => {
        //     if (d.status === "down") return [255, 0, 0, 180];
        //     return [0, 150, 255, 160];
        // },

        getFillColor: d => {
          if (selectedCell && d.cell_id === selectedCell.cell_id) {
            return [255, 255, 0, 220]; // bright yellow highlight
          }
          if (d.status === "down") return [255, 0, 0, 180];
          return [0, 150, 255, 160];
        },

        getLineColor: [0, 0, 0, 80],
        getLineWidth: 0.5,

        visible: currentZoom >= 13, // show sectors only at higher zooms

        onClick: info => {
            if (info.object) {
                dispatch(MapActions.setSelectedCell({
                ...info.object,
                _lng: info.coordinate[0],
                _lat: info.coordinate[1]
                }));
            }
        }
    });

  }, [operatorFiltered, operator, config.mapScale, dispatch, currentZoom]);

// const sectorLayer = new PolygonLayer({
//   id: "test-layer",
//   data: [
//     {
//       polygon: [
//         [-53.43, -26.26],
//         [-53.42, -26.26],
//         [-53.42, -26.25],
//         [-53.43, -26.25]
//       ]
//     }
//   ],
//   getPolygon: d => d.polygon,
//   getFillColor: [255, 0, 0, 200],
// });

  /* ============================================================
     🔹 Highlight LAYER (deck.gl)
  ============================================================ */

const highlightLayer = new ScatterplotLayer({
  id: "highlighted-cell",

  data: operatorFiltered.filter(
    d => d.cell_id === highlightedCell
  ),

  pickable: false,

  getPosition: d => [
    Number(d.longitude),
    Number(d.latitude)
  ],

  getFillColor: [255, 255, 0, 255],

  getRadius: 10,

  radiusUnits: "pixels"
});

  /* ============================================================
     🔹 GEO Json LAYER (deck.gl)
  ============================================================ */
  // Testing from frontend file load
// const customGeoJsonLayer = useMemo(() => {
//   if (!geojsonLayer) return null;
//   return new GeoJsonLayer({
//     id: 'custom-geojson-layer',
//     data: geojsonLayer,
//     filled: true,
//     stroked: true,
//     getFillColor: [0, 229, 160, 60],      // moderate teal fill
//     getLineColor: [10, 40, 30, 220],      // dark near-black green borders 
//     lineWidthUnits: 'pixels',
//     pickable: true,
//   });
// }, [geojsonLayer]);

  const customGeoJsonLayer = useMemo(() => {

    if (!boundaryGeoJson) return null;

    return new GeoJsonLayer({
      id: 'boundary-layer',
      data: boundaryGeoJson,
      filled: false,
      stroked: true,
      getLineColor: [0, 0, 0, 200],
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 2,
      pickable: true,
    });

  }, [boundaryGeoJson]);

  // const layers = useMemo(() => {
  //   const baseLayers = [];

  //   if (currentZoom < 9 || highlightedCell) {
  //     baseLayers.push(markerLayer);
  //   }

  //   if (currentZoom >= 9 && sectorLayer) {
  //     baseLayers.push(sectorLayer);
  //   }

  //   if (customGeoJsonLayer) {
  //     baseLayers.push(customGeoJsonLayer);
  //   }

  //   return baseLayers;
  // }, [currentZoom, markerLayer, sectorLayer, customGeoJsonLayer]);
const layers = useMemo(() => {

  const baseLayers = [];

  // site markers
  if (currentZoom < 9 && markerLayer) {
    baseLayers.push(markerLayer);
  }

  // cell markers
  if (currentZoom >= 9 && currentZoom < 13 && markerLayer) {
    baseLayers.push(markerLayer);
  }

  // cell sectors
  if (currentZoom >= 13 && sectorLayer) {
    baseLayers.push(sectorLayer);
  }

  // highlight always visible
  if (highlightLayer) {
    baseLayers.push(highlightLayer);
  }

  if (customGeoJsonLayer) {
    baseLayers.push(customGeoJsonLayer);
  }

  return baseLayers;

}, [
  currentZoom,
  markerLayer,
  sectorLayer,
  highlightLayer,
  customGeoJsonLayer
]);
  const sameSite = operatorFiltered.filter(
    c => c.site_name === operatorFiltered[0]?.site_name
  );

  /* ============================================================
     🔹 VIEW STATE HANDLER (SYNC LOGIC)
  ============================================================ */

  // const handleViewStateChange = ({ viewState }) => {
  //   if (syncEnabled) {
  //     dispatch(MapActions.setViewState(viewState));
  //   } else {
  //     setLocalViewState(viewState);
  //   }
  // };

  const handleViewStateChange = ({ viewState }) => {

    const cleanedViewState = {
      longitude: viewState.longitude,
      latitude: viewState.latitude,
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing
    };

    //   const cleanViewState = (vs) => {
    //   const { longitude, latitude, zoom, pitch, bearing } = vs;
    //   return { longitude, latitude, zoom, pitch, bearing };
    // };
    if (syncEnabled) {
      dispatch(MapActions.setViewState(cleanedViewState));
    } else {
      setLocalViewState(cleanedViewState);
    }
  };

// const handleViewStateChange = ({ viewState }) => {
//   const cleanedViewState = {
//     longitude: viewState.longitude,
//     latitude: viewState.latitude,
//     zoom: viewState.zoom,
//     pitch: viewState.pitch,
//     bearing: viewState.bearing
//   };

//   if (syncEnabled) {
//     dispatch(MapActions.setViewState(cleanedViewState));
//   } else {
//     setLocalViewState(cleanedViewState);
//   }

//   // 🔥 Only fetch if zoom >= 9
//   if (cleanedViewState.zoom >= 9) {
//     fetchVisibleCells(cleanedViewState);
//   }
// };

//   if (debounceRef.current) {
//     clearTimeout(debounceRef.current);
//   }

//   debounceRef.current = setTimeout(() => {
//     const viewport = new WebMercatorViewport({
//       ...vs,
//       width: window.innerWidth,
//       height: window.innerHeight
//     });

//     const bounds = viewport.getBounds();
//     // [[west, south], [east, north]]

//     const payload = {
//       bounds: {
//         west: bounds[0][0],
//         south: bounds[0][1],
//         east: bounds[1][0],
//         north: bounds[1][1]
//       },
//       zoom: vs.zoom
//     };

//     dispatch(MapActions.getMultiVendorCells(payload));
//   }, 400); // 400ms debounce
// };


/* ============================================================
     🔹 Styling of popup dragger with cell details
  ============================================================ */
    // const cellStyle = {
    //     border: "1px solid #d1d5db",
    //     padding: "4px",
    //     fontWeight: "600",
    //     background: "#f9fafb"
    // };

    // const valueStyle = {
    //     border: "1px solid #d1d5db",
    //     padding: "4px"
    // };


/* ============================================================
     🔹 Go back to you dataset prefered location
  ============================================================ */
  //   const fitToData = () => {
  //     if (!rawCells || rawCells.length === 0) return;

  //     const bounds = rawCells.map(d => [
  //       Number(d.longitude),
  //       Number(d.latitude)
  //     ]);

  //     const viewport = new WebMercatorViewport({
  //       width: window.innerWidth,
  //       height: window.innerHeight
  //     });

  //     const { longitude, latitude, zoom } =
  //       viewport.fitBounds(bounds, { padding: 40 });

  //     dispatch(MapActions.setViewState({
  //       longitude,
  //       latitude,
  //       zoom,
  //       pitch: 0,
  //       bearing: 0
  //     }));
  // };

const fitToData = () => {
  if (!rawCells || rawCells.length === 0) return;

  const bounds = rawCells.map(d => [
    Number(d.longitude),
    Number(d.latitude)
  ]);

  const viewport = new WebMercatorViewport({
    width: window.innerWidth,
    height: window.innerHeight
  });

  let { longitude, latitude, zoom } =
    viewport.fitBounds(bounds, { padding: 40 });

  // 🔥 Prevent extreme zoom
  zoom = Math.min(zoom, 13);

  const newView = {
    longitude,
    latitude,
    zoom,
    pitch: 0,
    bearing: 0
  };

  dispatch(MapActions.setViewState(newView));

};
  /* ============================================================
     🔹 Draggable pop functions 
  ============================================================ */
  const copyToClipboarding = (data) => {
    const finalData = Object.entries(data)
        .map((itm) => `${itm[0]}: ${itm[1]}`)
        .join('; ');
    navigator.clipboard.writeText(finalData);
    dispatch(ALERTS({
        show: true,
        icon: 'info',
        buttons: [],
        type: 1,
        text: 'Text copied Successfully'
    }));
};

const moveToSiteAnalyticsWindow = (data, from) => {
    dispatch(CommonActions.setLastName(true, 'Site Analytics'));
    if (from === 'one') {
        navigate('/dataplus-analytics-pro/site-analytics?uniqueId=' + data.Physical_id);
    } else {
        const newWin = window.open('/dataplus-analytics-pro/site-analytics?uniqueId=' + data.Physical_id, '_blank', 'noopener,noreferrer');
        if (newWin) newWin.opener = null;
    }
};

const moveToCellAnalyticsWindow = (data, from) => {
    dispatch(CommonActions.setLastName(true, 'Cell Analytics'));
    if (from === 'one') {
        navigate('/dataplus-analytics-pro/cell-analytics?uniqueId=' + data.Cell_name);
    } else {
        const newWin = window.open('/dataplus-analytics-pro/cell-analytics?uniqueId=' + data.Cell_name, '_blank', 'noopener,noreferrer');
        if (newWin) newWin.opener = null;
    }
};

const moveToSiteProrulesWindow = (data, from) => {
    dispatch(CommonActions.setLastName(true, 'Site Pro Rules'));
    if (from === 'one') {
        navigate('/dataplus-analytics-pro/site-pro-rules?uniqueId=' + data.Physical_id);
    } else {
        const newWin = window.open('/dataplus-analytics-pro/site-pro-rules?uniqueId=' + data.Physical_id, '_blank', 'noopener,noreferrer');
        if (newWin) newWin.opener = null;
    }
};

const moveToCellProrulesWindow = (data, from) => {
    dispatch(CommonActions.setLastName(true, 'Cell Pro Rules'));
    if (from === 'one') {
        navigate('/dataplus-analytics-pro/cell-pro-rules?uniqueId=' + data.Cell_name);
    } else {
        const newWin = window.open('/dataplus-analytics-pro/cell-pro-rules?uniqueId=' + data.Cell_name, '_blank', 'noopener,noreferrer');
        if (newWin) newWin.opener = null;
    }
};

  /* ============================================================
     🔹 RENDER
  ============================================================ */

  return (
    <div style={{ position: "relative", width: "100%", height: "100%"}}>
      <button
        onClick={fitToData}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "white",
          padding: "6px 10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          cursor: "pointer"
        }}
      >
        📍
      </button>
      <DeckGL
        viewState={{ ...activeViewState }}
        controller={true}
        // layers={[
        //   ...(currentZoom < 9
        //     ? (markerLayer ? [markerLayer] : [])
        //     : (sectorLayer ? [sectorLayer] : [])),
        //       customGeoJsonLayer,
        // ].filter(Boolean)}
        // layers={[
        //   markerLayer,
        //   sectorLayer,
        //   customGeoJsonLayer
        // ].filter(Boolean)}

        layers={layers}
        onViewStateChange={handleViewStateChange}
        // getMapboxApiAccessToken={() => MAPBOX_TOKEN}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      >
       <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        // mapStyle={config.mapView}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          //  mapStyle="mapbox://styles/mapbox/light-v10"
        >
        </Map>
      </DeckGL>

        {/* ✅ ADD here, outside DeckGL */}
        {selectedCell && selectedCell.operator === operator && (
          <CellInfoPopup
            data={{
                cell_name:  selectedCell.cell_id,
                site_name:  selectedCell.site_name,
                technology: selectedCell.technology,
                operator:   selectedCell.operator,
                region:     selectedCell.region,
                band:       selectedCell.band,
                latitude:   selectedCell.latitude,
                longitude:  selectedCell.longitude,
                azimuth:    selectedCell.azimuth,
            }}
            mapH="100%"
            mapW="100%"
            onClose={() => dispatch(MapActions.setSelectedCell(null))}
            onCopy={copyToClipboarding}
            onSiteAnalytics={(d, mode) => moveToSiteAnalyticsWindow(d, mode === 'newTab' ? 'two' : 'one')}
            onCellAnalytics={(d, mode) => moveToCellAnalyticsWindow(d, mode === 'newTab' ? 'two' : 'one')}
            onSiteProRules={(d, mode) => moveToSiteProrulesWindow(d, mode === 'newTab' ? 'two' : 'one')}
            onCellProRules={(d, mode) => moveToCellProrulesWindow(d, mode === 'newTab' ? 'two' : 'one')}
            onChartClick={(d) => {
                // wire Superset modal here when ready
            }}
            onChartRightClick={(d) => {
                window.open(`/Filtered-cell-dashboard/${DASHBOARD_UUID}?cell=${d.Cell_name}&filterId=${FILTER_Id}`, '_blank');
            }}
            />
        )}

    </div>
  );
};

export default TelecomMap;
