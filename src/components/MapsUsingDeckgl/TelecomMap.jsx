import React, { useMemo, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { WebMercatorViewport } from "@deck.gl/core";
import { PolygonLayer, ScatterplotLayer, GeoJsonLayer,LineLayer, TextLayer  } from "@deck.gl/layers";
import { CompassWidget, ZoomWidget, FullscreenWidget } from '@deck.gl/widgets';
import '@deck.gl/widgets/stylesheet.css';

import CellInfoPopup from './CellInfoPopup'; 
import * as Unicons from "@iconscout/react-unicons";
import MapActions from "../../store/actions/map-actions";
import generateSectorPolygon from "./Utils/GenerateSectorPolygon";
// import {CompassWidget} from '@deck.gl/widgets';
// import generateCoordinates from  "./Utils/GenerateCoordinates";
// import { NavigationControl, FullscreenControl, ScaleControl } from "react-map-gl";
// import mapboxgl from "mapbox-gl";

// ADD to existing imports
import { useNavigate } from 'react-router-dom';
import CommonActions from '../../store/actions/common-actions';
import { ALERTS } from '../../store/reducers/component-reducer';
import { rsrpColorScale } from "./Utils/colorEngine";
import { FIXED_COLORS, getDriveTestColor } from "./Utils/colorEngine";
import LegendBox from "./LegendBox";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MAP_STYLES = {
  // outdoors: {
  //   tiles: ['https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}@2x.png'],
  //   attribution: '© Stadia Maps © OpenStreetMap'
  // },
  outdoors: {
    tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'], // ← use voyager as fallback
    attribution: '© CARTO © OpenStreetMap'
  },
  voyager: {
    tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],  // ← @2x
    attribution: '© CARTO © OpenStreetMap'
  },
  light: {
    tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
    attribution: '© CARTO © OpenStreetMap'
  },
  dark: {
    tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
    attribution: '© CARTO © OpenStreetMap'
  },
  osm: {
    // OSM doesn't support @2x, but this is already decent quality
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap Contributors'
  },
  satellite: {
    tiles: [`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`],
    attribution: '© Mapbox'
  },

};

const getMapStyle = (styleKey) => {
  const style = MAP_STYLES[styleKey] || MAP_STYLES.voyager;
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: style.tiles,
        tileSize: 256,        // ← change from 256 to 512 for @2x tiles
        attribution: style.attribution
      }
    },
    layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }]
  };
};

// const MAP_STYLES = {
//   streets:   `https://api.mapbox.com/styles/v1/mapbox/streets-v12/style.json?access_token=${MAPBOX_TOKEN}`,
//   light:     `https://api.mapbox.com/styles/v1/mapbox/light-v11/style.json?access_token=${MAPBOX_TOKEN}`,
//   dark:      `https://api.mapbox.com/styles/v1/mapbox/dark-v11/style.json?access_token=${MAPBOX_TOKEN}`,
//   satellite: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/style.json?access_token=${MAPBOX_TOKEN}`,
//   outdoors:  `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/style.json?access_token=${MAPBOX_TOKEN}`,
// };

// const getMapStyle = (styleKey) => 
//   MAP_STYLES[styleKey] || MAP_STYLES.streets;

const hexToRgba = (hex, opacity = 1) => {

  if (!hex) return [0,150,255,255];

  const bigint = parseInt(hex.replace("#", ""), 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const a = Math.round(opacity * 255);

  return [r,g,b,a];

};

const haversineKm = ([lng1, lat1], [lng2, lat2]) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
              Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

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
  const boundaryGeoJson = useSelector(state => state.map.boundaryGeoJson);
  const activeThematic = useSelector(state => state.map.activeThematic);
  const highlightedCell = useSelector(state => state.map.highlightedCell);

  const driveTestData = useSelector(state => state.map.driveTestData);
  const driveTestFilters = useSelector(state => state.map.driveTestFilters);
  const activeDriveSessions = useSelector(state => state.map.activeDriveSessions);

  const rfPredictionGeoJson = useSelector(state => state.map.rfPredictionGeoJson);
  const layerOpacity = useSelector(state => state.map.layerOpacity);
  const layerVisibility = useSelector(state => state.map.layerVisibility);

  const rawSites = useSelector(state => state.map.rawSites);
  const activeSiteThematic = useSelector(state => state.map.activeSiteThematic);

  const rulerMode = useSelector(state => state.map.rulerMode);
  const rulerPoints = useSelector(state => state.map.rulerPoints);

  const [localViewState, setLocalViewState] = useState(viewState);
  const [rulerHover, setRulerHover] = useState(null);

  const layerLegends = useSelector(state => state.map.layerLegends);
  const boundaryGroups = useSelector(state => state.map.boundaryGroups || []);
  const boundaryColors = useSelector(state => state.map.boundaryColors || {});

  const driveTestThematic = driveTestFilters
    ? {
        type: "KPIs",
        kpiConfig: {
          kpi: driveTestFilters.thematic,
          ranges: driveTestFilters.ranges
        }
      }
    : null;
    
const selectedBoundaries = useSelector(state => state.map.selectedBoundaries || {});

const boundaryLegendThematic = useMemo(() => {
    // Build colors object: one entry per group that has selections
    const colors = {};
    boundaryGroups.forEach(group => {
        const selections = selectedBoundaries[group.shapegroup];
        const hasSelections = Array.isArray(selections) && selections.length > 0;
        if (hasSelections) {
            colors[group.shapegroup] = boundaryColors[group.shapegroup] || "#000000";
        }
    });
    if (Object.keys(colors).length === 0) return null;
    return { type: "Boundary", colors };
}, [boundaryGroups, selectedBoundaries, boundaryColors]);


  const activeViewState =
  (syncEnabled ? viewState : localViewState) || {
     longitude: 37.9062,
    latitude: 0.0236,
    zoom: 6,
    pitch: 0,
    bearing: 0
  };

  const currentZoom = activeViewState?.zoom ?? 6;

  const THEMATIC_FIELD_MAP = {
    Technology: "technology",
    Band: "band",
    Region: "region"
  };

  useEffect(() => {
  if (!activeThematic?.colors || Object.keys(activeThematic.colors).length === 0) {
    dispatch(MapActions.setActiveThematic({
      type: "Technology",
      colors: FIXED_COLORS.Technology,
      opacity: 0.9
    }));
  }
}, []); // ← run only once on mount, not on every activeThematic change


  /* ============================================================
     🔹 LOCAL VIEW STATE (used only if sync disabled)
  ============================================================ */

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

  useEffect(() => {
    dispatch(MapActions.getDriveTestData());
  }, []);
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
    return Object.values(siteMap);

  }, [operatorFiltered]);

   /* ============================================================
   🔹 GENERATE COORDINATES FOR DRAWING
============================================================ */
const generateCoordinates = (x, y, Dir, antBW, c_length, scale = 20) => {
    const coords = [];
    coords.push([x, y]);

    for (let j = 10; j >= 1; j--) {
        const angle = (Dir - antBW / 2 + (antBW / 10) * j) * 0.01745329252;
        
        const x1 = x + Math.sin(angle) / (69.093 / c_length) / ((110 - scale) * 100);
        const y1 = y + Math.cos(angle) / (69.093 / c_length) / ((110 - scale) * 100);
        
        coords.push([x1, y1]);
    }

    coords.push([x, y]);
    return coords;
};
  /* ============================================================
     🔹 MARKER LAYER (deck.gl) for CELLS
  ============================================================ */
  const markerLayer = useMemo(() => {
    // console.log(
    //   "MARKER DATA:",
    //   currentZoom < 9 ? "SITES" : "CELLS",
    //   currentZoom < 9 ? siteAggregated.length : operatorFiltered.length
    // );
    // console.log("MAP SCALE IN MAP:", config.mapScale);

    if (!layerVisibility.CELLS) return null; 

    if (!operatorFiltered || operatorFiltered.length === 0) return null;
    const mapScale = config.mapScale || 1;

    return new ScatterplotLayer({
      id: `marker-layer-${operator}`,
      data: (currentZoom < 9 ? siteAggregated : operatorFiltered)
              .filter(d => !isNaN(Number(d.longitude)) && !isNaN(Number(d.latitude))),
      pickable: true,
      getPosition: d => {
        const lng = Number(d.longitude);
        const lat = Number(d.latitude);
        if (isNaN(lng) || isNaN(lat)) return null;
        return [lng, lat];
      },
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
      radiusScale: config.mapScale,
      // getFillColor: [255, 0, 0, 200],
      getFillColor: d => {
        const opacity =
          (layerOpacity.CELLS ?? 1) *
          (activeThematic?.opacity ?? 1);

        // highlight selected
        if (selectedCell && d.cell_id === selectedCell.cell_id) {
          return [255, 255, 0, 255];
        }

        // DEFAULT thematic
        if (activeThematic?.type === "Default") {
          const hex =
            activeThematic.colors?.[d.band] ||
            activeThematic.colors?.[d.technology] ||
            activeThematic.colors?.[d.region];

          if (hex) return hexToRgba(hex, opacity);
        }

        // Generic thematics
        const field = THEMATIC_FIELD_MAP[activeThematic?.type];

        if (field) {
          const hex = activeThematic.colors?.[d[field]];
          if (hex) return hexToRgba(hex, opacity);
        }

        // fallback
        return hexToRgba("#ff0000", opacity);
      },
      getLineColor: [0, 0, 0],
      getLineWidth: 1,
      updateTriggers: {
        getFillColor: [
          activeThematic?.type,
          activeThematic?.colors,
          activeThematic?.opacity, 
          layerOpacity.CELLS,  
        ]
      },
      visible: layerVisibility.CELLS && currentZoom < 13,
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
      },

    });
  }, [operatorFiltered, 
      operator, 
      dispatch, 
      currentZoom, 
      selectedCell, 
      siteAggregated, 
      config.mapScale, 
      layerVisibility.CELLS,

      activeThematic?.type,
      activeThematic?.colors,
      activeThematic?.opacity, 
      layerOpacity.CELLS
    ]);

  /* ============================================================
     🔹 SECTOR LAYER (deck.gl) for CELLS
  ============================================================ */
  const sortedCells = useMemo(() => {

    if (!operatorFiltered) return [];
    const order = { "2G":1,"3G":2,"4G":3,"5G":4 };
    return [...operatorFiltered].sort(
      (a,b) => (order[a.technology]||0)-(order[b.technology]||0)
    );
  }, [operatorFiltered]);
  
  const sectorLayer = useMemo(() => {

    if (!layerVisibility.CELLS) return null;
    if (!sortedCells.length) return null; 

    return new PolygonLayer({
      id: `sector-layer-${operator}`,
      data: sortedCells,
      // data: sectorCells,

      pickable: true,
      stroked: true,
      filled: false,

        // getPolygon: d =>
        //     generateSectorPolygon(
        //     d.latitude,
        //     d.longitude,
        //     d.azimuth,
        //     d.beam_width || 60,
        //     d.radius_m || 500,
        //     config.mapScale
        //     ),

        getPolygon: d => {

          const techRadius = {
            "2G": 80,
            "3G": 150,
            "4G": 260,
            "5G": 380
          };

          const radius = techRadius[d.technology] || 200;

          return generateCoordinates(
            d.longitude,
            d.latitude,
            d.azimuth, // each cell has unique azimuth → no overlap
            d.radius_m,        // antBW — already mapped from backend beamwidth
            d.radius_m,         // c_length — per-cell radius already mapped from backend length
            config.mapScale*20,
          );
        },

        // getFillColor: d => {
        //   if (selectedCell && d.cell_id === selectedCell.cell_id) {
        //     return [255, 255, 0, 220]; // bright yellow highlight
        //   }
        //   if (d.status === "down") return [255, 0, 0, 180];
        //   return [0, 150, 255, 160];
        // },
        // getFillColor: d => {
        //   if (selectedCell && d.cell_id === selectedCell.cell_id) {
        //     return [255,255,0,220];
        //   }

        //   if (activeThematic?.type === "Technology") {
        //     const hex = activeThematic.colors?.[d.technology];
        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (activeThematic?.type === "Default") {
        //     const hex = activeThematic.colors?.[d.band] ||
        //                 activeThematic.colors?.[d.technology] ||
        //                 activeThematic.colors?.[d.region];

        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (activeThematic?.type === "Band") {
        //     const hex = activeThematic.colors?.[d.band];
        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (activeThematic?.type === "Region") {
        //     const hex = activeThematic.colors?.[d.region];
        //     if (hex) return hexToRgba(hex, activeThematic?.opacity ?? 0.9);
        //   }

        //   if (d.status === "down") return [255,0,0,180];

        //   return [0,150,255,160];
        // },

        updateTriggers: {
          // getFillColor: activeThematic
          // getLineColor: activeThematic
          getPolygon: config.mapScale, 
          getLineColor: [
            activeThematic?.type,
            activeThematic?.colors,
            activeThematic?.opacity,
            layerOpacity.CELLS,
          ]
        },

        getLineColor: d => {

          // highlight selected cell
          if (selectedCell && d.cell_id === selectedCell.cell_id) {
            return [255,255,0,255];
          }

          const opacity =
            (layerOpacity.CELLS ?? 1) *
            (activeThematic?.opacity ?? 1);

          // DEFAULT thematic (special logic)
          if (activeThematic?.type === "Default") {

            const hex =
              activeThematic.colors?.[d.band] ||
              activeThematic.colors?.[d.technology] ||
              activeThematic.colors?.[d.region];

            if (hex) return hexToRgba(hex, opacity);

          }
          
          // Generic thematics
          const field = THEMATIC_FIELD_MAP[activeThematic?.type];

          if (field) {
            const hex = activeThematic.colors?.[d[field]];
            if (hex) return hexToRgba(hex, opacity);
          }

          // Cell down fallback
          if (d.status === "down") return [255,0,0,255];

          // Default fallback
          return [0,150,255,255]; // fallback color instead of black
        },
        getLineWidth: 5,
        lineWidthUnits: "pixels",
        lineJointRounded: true,
        lineCapRounded: true,

        visible: layerVisibility.CELLS && currentZoom >= 13, // show sectors only at higher zooms

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

  }, 
      [operatorFiltered, 
      operator, 
      config.mapScale, 
      dispatch, 
      currentZoom, 
      activeThematic?.type,
      activeThematic?.colors,
      activeThematic?.opacity, 
      layerOpacity.CELLS,
      layerVisibility.CELLS,
    ]);

const siteLayer = useMemo(() => {
    if (!layerVisibility.SITES) return null;
    if (!rawSites || rawSites.length === 0) return null;

    return new ScatterplotLayer({
        id: `site-layer-${operator}`,
        data: rawSites.filter(
            d => !isNaN(Number(d.longitude)) && !isNaN(Number(d.latitude))
        ),
        pickable: true,
        getPosition: d => [Number(d.longitude), Number(d.latitude)],
        radiusUnits: "pixels",
        getRadius: 6,
        radiusScale: config.siteScale || 1,
        radiusMinPixels: 4,
        radiusMaxPixels: 14,
        getFillColor: d => {
            if (selectedCell && d.site_name === selectedCell.site_name)
                return [255, 255, 0, 255];

            const opacity = activeSiteThematic?.opacity ?? 1;

            const field = THEMATIC_FIELD_MAP[activeSiteThematic?.type];
            if (field) {
                const hex = activeSiteThematic.colors?.[d[field]];
                if (hex) return hexToRgba(hex, opacity);
            }

            if (d.status === "Deactivated") return [255, 0, 0, 180];
            return [255, 140, 0, 220];
        },
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 1,
        lineWidthUnits: "pixels",
        updateTriggers: {
            getFillColor: [
                selectedCell,
                activeSiteThematic?.type,
                activeSiteThematic?.colors,
                activeSiteThematic?.opacity,
            ]
        },
        onClick: info => {
            if (info.object) {
                dispatch(MapActions.setViewState({
                    longitude: Number(info.object.longitude),
                    latitude: Number(info.object.latitude),
                    zoom: 14,
                    transitionDuration: 800
                }));
            }
        }
    });
}, [
    rawSites,
    operator,
    dispatch,
    selectedCell,
    layerVisibility.SITES,
    config.siteScale,
    activeSiteThematic?.type,
    activeSiteThematic?.colors,
    activeSiteThematic?.opacity,
]);
  /* ============================================================
     🔹 Highlight LAYER (deck.gl) - highlighting cell/site
  ============================================================ */

  const highlightLayer = useMemo(() => {

     if (!highlightedCell || !operatorFiltered) return null;

    return new ScatterplotLayer({
      id: "highlighted-cell",

      data: operatorFiltered.filter(
        d => d.cell_id === highlightedCell &&
          !isNaN(Number(d.longitude)) &&
          !isNaN(Number(d.latitude))
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
  }, [operatorFiltered, highlightedCell]);

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
      id: `boundary-layer-${Object.keys(boundaryColors).length}`,
      data: boundaryGeoJson,
      dataComparator: () => false,
      filled: false,
      stroked: true,
      getFillColor: [0,0,0,0],
      getLineColor: feature => {
        // Get the group name from the feature properties
        const groupName = feature.properties?.shapegroup;
        // Look up the color for this group
        const hex = boundaryColors[groupName] || "#000000";

        const [r,g,b] = hexToRgba(hex);
        return [r, g, b, 200];
      },
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 2,
      pickable: true,
      opacity: layerOpacity.BOUNDARY,
      updateTriggers: {
        getLineColor: [boundaryColors],
        getFillColor: [boundaryColors, layerOpacity.BOUNDARY]
      }
    });
  }, [boundaryGeoJson, boundaryColors, layerOpacity.BOUNDARY]);

  const rfPredictionLayer = useMemo(() => {
    if (!rfPredictionGeoJson) return null;

    return new GeoJsonLayer({
      id: "rf-prediction-layer",
      data: rfPredictionGeoJson,
      filled: true,
      stroked: false,
      getFillColor: feature => {
        const range = feature.properties.range;
        return rsrpColorScale[range] || [200,200,200,50];
      },
      pickable: true,
      opacity: layerOpacity.RF,
    });
  }, [rfPredictionGeoJson, layerOpacity.RF]);

  /* ============================================================
     🔹 RF Drive TEST LAYER (deck.gl)
  ============================================================ */
  const drivetestLayer = useMemo(() => {

    if (!activeDriveSessions.length) return null;
    const filtered = driveTestData.filter(
      d => activeDriveSessions.includes(d.session_id)
    );

    if (!filtered.length) return null;
    // if (!driveTestData || driveTestData.length === 0) return null;

    return new ScatterplotLayer({
      id: "drivetest-layer",
      data: filtered,
      pickable: true,
      opacity: layerOpacity.DRIVE_TEST,

      getPosition: d => [
        Number(d.longitude),
        Number(d.latitude)
      ],

      // radiusUnits: "meters",
      // getRadius: 20,

      radiusUnits: "pixels",
      getRadius: 5,
      radiusMinPixels: 3,

      getFillColor: d => {
        const quality = getSignalQuality(d.rssi);
        return quality.colorRGB;
      },
      updateTriggers: {
        getFillColor: [driveTestFilters?.thematic, driveTestFilters?.thematicMode, driveTestFilters?.ranges]
      }
      // opacity: 0.9
    });

  }, [driveTestData, activeDriveSessions, driveTestFilters]);

  // for hover values(color of string), dot colors
  const getSignalQuality = (rssi) => {
      const { color, label } = getDriveTestColor(
          rssi,
          driveTestFilters?.thematic || "RSSI",
          driveTestFilters?.thematicMode || "Default",
          driveTestFilters?.ranges || []
      );
      return {
          label,
          colorText: color,
          colorRGB: hexToRgba(color).slice(0, 3)
      };
  };

  /* ============================================================
     🔹 Ruler ---> Line LAYER (deck.gl)
  ============================================================ */
// Line layer — black, thick, round caps
const rulerLineLayer = useMemo(() => {
    if (!rulerMode || rulerPoints.length === 0) return null;
    const end = rulerPoints[1] ?? rulerHover;
    if (!end) return null;

    return new LineLayer({
        id: "ruler-line",
        data: [{ from: rulerPoints[0], to: end }],
        getSourcePosition: d => d.from,
        getTargetPosition: d => d.to,
        getColor: [20, 20, 20, 220],
        getWidth: 2,
        widthUnits: "pixels",
    });
}, [rulerMode, rulerPoints, rulerHover]);

// Endpoint dots — white fill, black border
const rulerDotsLayer = useMemo(() => {
    if (!rulerMode || rulerPoints.length === 0) return null;
    const end = rulerPoints[1] ?? rulerHover;
    const points = end
        ? [{ position: rulerPoints[0] }, { position: end }]
        : [{ position: rulerPoints[0] }];

    return new ScatterplotLayer({
        id: "ruler-dots",
        data: points,
        getPosition: d => d.position,
        getFillColor: [255, 255, 255, 255],
        getLineColor: [20, 20, 20, 255],
        getRadius: 6,
        radiusUnits: "pixels",
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        pickable: false,
    });
}, [rulerMode, rulerPoints, rulerHover]);

// Distance label — shown at midpoint of the line
const rulerLabelLayer = useMemo(() => {
    if (!rulerMode || rulerPoints.length === 0) return null;
    const end = rulerPoints[1] ?? rulerHover;
    if (!end) return null;

    const mid = [
        (rulerPoints[0][0] + end[0]) / 2,
        (rulerPoints[0][1] + end[1]) / 2,
    ];
    const dist = haversineKm(rulerPoints[0], end);
    const label = dist >= 1
        ? `${dist.toFixed(2)} km`
        : `${(dist * 1000).toFixed(0)} m`;

    return new TextLayer({
        id: "ruler-label",
        data: [{ position: mid, text: label }],
        getPosition: d => d.position,
        getText: d => d.text,
        getSize: 13,
        getColor: [20, 20, 20, 255],
        getBackgroundColor: [255, 255, 255, 220],
        background: true,
        backgroundPadding: [6, 3, 6, 3],
        getBorderColor: [20, 20, 20, 180],
        getBorderWidth: 1,
        fontWeight: 600,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        pickable: false,
        fontFamily: "sans-serif",
    });
}, [rulerMode, rulerPoints, rulerHover]);


  
  /* ============================================================
     🔹 ALL LAyers Dispatching logic
  ============================================================ */
  const layers = useMemo(() => {
    const baseLayers = [];
    if (layerVisibility.CELLS) {
      if (currentZoom < 9 && markerLayer) baseLayers.push(markerLayer); // site markers
      if (currentZoom >= 9 && currentZoom < 13 && markerLayer) baseLayers.push(markerLayer); // cell markers
      if (currentZoom >= 13 && sectorLayer) baseLayers.push(sectorLayer); // cell sectors

      if (highlightLayer) baseLayers.push(highlightLayer);
    }
    // if (highlightLayer) baseLayers.push(highlightLayer);  // highlight always visible

    if (siteLayer) baseLayers.push(siteLayer);
    if (rulerLineLayer) baseLayers.push(rulerLineLayer);
    if (rulerDotsLayer) baseLayers.push(rulerDotsLayer);
    if (rulerLabelLayer) baseLayers.push(rulerLabelLayer);

     // NON-CELL layers
    if (customGeoJsonLayer) baseLayers.push(customGeoJsonLayer); // kenya and other boundaries (when selected)
    if (rfPredictionLayer) baseLayers.push(rfPredictionLayer); // RF PRediction Layer (when selected)
    if (drivetestLayer) baseLayers.push(drivetestLayer); // RF drive test layer (when selected)

    return baseLayers;
  }, [ currentZoom, markerLayer, sectorLayer, highlightLayer, 
      customGeoJsonLayer, rfPredictionLayer, drivetestLayer, 
      layerVisibility.CELLS, siteLayer, rulerLineLayer, 
      rulerDotsLayer, rulerLabelLayer]);

  /* ============================================================
     🔹 VIEW STATE HANDLER (SYNC LOGIC)
  ============================================================ */

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

/* ============================================================
     🔹 Go back to you dataset prefered location
  ============================================================ */

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

  // Handle Closing of Legends
  const handleLegendClose = (layer) => {
    dispatch(MapActions.setLayerLegend(layer, false));
  };
  /* ============================================================
     🔹 RENDER
  ============================================================ */
  return (
    <div style={{ position: "relative", width: "100%", height: "100%"}}>
      {/* <button
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
      </button> */}
      <DeckGL
        viewState={{ ...activeViewState }}
        controller={true}
        // getMapboxApiAccessToken={() => MAPBOX_TOKEN}
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
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        widgets={[
          new ZoomWidget({ 
            placement: 'bottom-right',
            style: {  marginRight: '12px', marginBottom: '50px' }
          }),
          new FullscreenWidget({ 
            placement: 'bottom-right',
            style: {  marginRight: '12px', marginBottom: '120px' }
          }),
          new CompassWidget({ 
            placement: 'bottom-right',
            style: { marginRight: '12px', marginBottom: '148px' },
            viewId: 'default'
          }),
        ]}
        //  Tooltip on Drivetest layer points on hover
        getTooltip={({ object, layer }) => {
            // Only show tooltip for drive test points
          if (!object || layer?.id !== "drivetest-layer") return null;

          const signal = getSignalQuality(object.rssi);
          return {
            html: `
              <div style="font-size:12px">
                <div>
                  <b>Signal:</b>
                  <span style="
                    font-weight:bold;
                    color:${signal.colorText};
                  ">
                    ${signal.label}
                  </span>
                </div>
                <div><b>RSSI:</b> ${object.rssi} dBm</div>
                <div><b>Latitude:</b> ${object.latitude}</div>
                <div><b>Longitude:</b> ${object.longitude}</div>
                <div><b>Session:</b> ${object.session_id}</div>
              </div>
            `
          };

        }}

        // Ruler Layer for Measurement of distance
        onHover={({ coordinate }) => {
          if (rulerMode && rulerPoints.length === 1 && coordinate) {
              setRulerHover(coordinate);
          }
        }}
        onClick={({ coordinate, object, layer }) => {
          // let existing layer clicks (cells, sectors) still work when NOT in ruler mode
          if (!rulerMode || !coordinate) return;
          // in ruler mode, suppress cell selection and handle ruler clicks
          if (rulerPoints.length === 0) {
              dispatch(MapActions.setRulerPoints([coordinate]));
          } else if (rulerPoints.length === 1) {
              dispatch(MapActions.setRulerPoints([rulerPoints[0], coordinate]));
              setRulerHover(null);
          } else {
              // third click = fresh measurement
              dispatch(MapActions.setRulerPoints([coordinate]));
              setRulerHover(null);
          }
        }}
        getCursor={({ isDragging }) =>
            rulerMode ? "crosshair" : isDragging ? "grabbing" : "grab"
        }
      >
       {/* <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          // mapStyle={config.mapView}
          mapStyle={config.mapView || "mapbox://styles/mapbox/streets-v11"}
          style={{ pointerEvents: "auto" }}
          //  mapStyle="mapbox://styles/mapbox/light-v10"
        >
          {/* <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          <ScaleControl position="bottom-right" unit="metric" /> */}
        {/* </Map>  */}
        {/* <Map
          mapStyle={{
            version: 8,
            sources: {
              "basemap": {
                type: "raster",
                tiles: [
                  `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`
                ],
                tileSize: 256,
                attribution: "© Mapbox © OpenStreetMap"
              }
            },
            layers: [{ id: "basemap-layer", type: "raster", source: "basemap" }]
          }}
          style={{ pointerEvents: "auto" }}
        /> */}

          <Map
              mapStyle={getMapStyle(config.mapView || "voyager")}
              style={{ pointerEvents: "auto" }}
            // language="en"
          />
        </DeckGL>

        {/* ✅ LEGENDs */}
        {layerLegends.SITES && (
          <LegendBox
            layer="SITES"
            thematic={activeSiteThematic}
            onClose={() => handleLegendClose("SITES")}
          />
        )}

        {layerLegends?.CELLS && (
          <LegendBox
            layer="CELLS"
            thematic={activeThematic}   // ⚠️ important
            onClose={() => handleLegendClose("CELLS")}
          />
        )}

        {layerLegends?.DRIVE_TEST && driveTestThematic && (
          <LegendBox
            layer="DRIVE TEST"
            thematic={driveTestThematic}
            onClose={() => handleLegendClose("DRIVE_TEST")}
          />
        )}

        {layerLegends?.BOUNDARY && boundaryLegendThematic && (
          <LegendBox
              layer="BOUNDARY"
              thematic={boundaryLegendThematic}
              onClose={() => handleLegendClose("BOUNDARY")}
          />
        )}

        {/* Cell info popup */}
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

      <div style={{
          position: "absolute",
          bottom: 270,   // sits above the 3 deck.gl widgets
          right: 12,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          border: "1px solid rgba(0,0,0,0.15)",
        }}>
          {/* Fit to data */}
          <button
            title="Fit to data"
            onClick={fitToData}
            style={{
              width: 32, height: 32,
              background: "white", border: "none",
              borderBottom: "1px solid rgba(0,0,0,0.1)",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", padding: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
            onMouseLeave={e => e.currentTarget.style.background = "white"}
          >
            {/* <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg> */}
            📍
          </button>

          {/* Ruler */}
          <button
            title={rulerMode ? "Disable ruler" : "Measure distance"}
            onClick={() => dispatch(MapActions.setRulerMode(!rulerMode))}
            style={{
              width: 32, height: 32,
              background: rulerMode ? "#1a1a1a" : "white",
              border: "none",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", padding: 0,
            }}
            onMouseEnter={e => { if (!rulerMode) e.currentTarget.style.background = "#f0f0f0"; }}
            onMouseLeave={e => { if (!rulerMode) e.currentTarget.style.background = rulerMode ? "#1a1a1a" : "white"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={rulerMode ? "#facc15" : "#333"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="10" rx="1"/>
              <line x1="6"  y1="7"  x2="6"  y2="11"/>
              <line x1="10" y1="7"  x2="10" y2="13"/>
              <line x1="14" y1="7"  x2="14" y2="11"/>
              <line x1="18" y1="7"  x2="18" y2="11"/>
            </svg>
          </button>
        </div>

    </div>
  );
};

export default TelecomMap;
