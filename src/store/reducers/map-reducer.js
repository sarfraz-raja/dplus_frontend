import { createSlice } from "@reduxjs/toolkit";

const initialState = {

    //  OLD STATE (EXISTING LOGIC)
    markerList:{
        data:[],
    },
    tech_with_band:[],
    get_all_filter:{},
    markerChartList:{},

    // 🔹 NEW TELECOM MAP STATE(FOR NEW ARCHITECTURE-> mapbox + deckgl)
    // 🔹 Raw telecom dataset from backend
    rawCells: [],

    // 🔹 UI Filters (shared across all maps)
    filters: {
        regions: [],
        technologies: [],
        technologyBands: {},   // 🔥 REQUIRED
    },

    // 🔹 Map configuration (scale + style)
    config: {
        mapScale: 1,
        mapView: "mapbox://styles/mapbox/light-v10",
    },

    // 🔹 Shared camera state (for sync behavior)
    viewState: {
        longitude: 77.2090,
        latitude: 28.6139,
        zoom: 6,
        pitch: 0,
        bearing: 0,
    },

    // 🔹 Toggle: Are maps synced?
    syncEnabled: true,

    // 🔹 Selected cell for popup / modal
    selectedCell: null,

    // 🔹 TELECOM FILTER METADATA
    telecomFilterMeta: {},
    telecomTechMeta: {},

    boundaryGroups: [],
    boundaryGeoJson: null,

    highlightedCell: null,

}


/* ============================================================
   SLICE
============================================================ */

const mapQuery = createSlice({
    name: "mapQuery",
    initialState,
    reducers: {

        // OLD REDUCERS (UNCHANGED)
        MARKER_LIST: (state, { payload }) => {
            console.log(payload,"MARKER_LIST")
            if(payload.reset){
                
                state.markerList = payload.dataAll
            }else{
                state.markerList = {
                    ...state.markerList, 
                    ...payload.dataAll
                };
            }
        },
        MARKER_CHART_LIST: (state, { payload }) => {
            console.log(payload,"MARKER_LIST")
            if(payload.reset){
                
                state.markerChartList = payload.dataAll
            }else{
                state.markerChartList = {
                    ...state.markerChartList, 
                    ...payload.dataAll
                };
            }
        },
        TECH_WITH_BAND: (state, { payload }) => {
            console.log(payload,"TECH_WITH_BAND")
            if(payload.reset){
                
                state.tech_with_band = payload.dataAll
            }else{
                state.tech_with_band = {
                    ...state.tech_with_band, 
                    ...payload.dataAll
                };
            }
        },
        GET_ALL_FILTER: (state, { payload }) => {
            console.log(payload,"GET_ALL_FILTER")
            console.log(payload,'load GET_ALL_FILTER')
            if(payload.reset){
                console.log(payload,'load')
                
                state.get_all_filter = payload.dataAll
            }else{
                state.tech_with_band = [
                    ...state.get_all_filter, 
                    ...payload.dataAll
                ];
            }
        },

        // NEW TELECOM MAP REDUCERS

        // 🔹 Set full telecom dataset
        SET_RAW_CELLS: (state, { payload }) => {
            state.rawCells = payload;
        },

        // 🔹 Update filters (region, tech, vendor)
        SET_FILTERS: (state, { payload }) => {
            state.filters = {
                ...state.filters,
                ...payload,
            };
        },

        // 🔹 Update shared camera (used for sync)
        SET_VIEW_STATE: (state, { payload }) => {
            state.viewState = payload;
        },

        // 🔹 Enable / Disable multi-map sync
        SET_SYNC_ENABLED: (state, { payload }) => {
            state.syncEnabled = payload;
        },

        // 🔹 Store selected cell for popup / modal
        SET_SELECTED_CELL: (state, { payload }) => {
            state.selectedCell = payload;
        },

        // 🔹 Update map configuration (scale / style)
        SET_MAP_CONFIG: (state, { payload }) => {
            state.config = {
                ...state.config,
                ...payload,
            };
        },
        // 🔹 TELECOM ONLY — FILTER METADATA
        SET_TELECOM_FILTER_META: (state, { payload }) => {
            state.telecomFilterMeta = payload;
        },

        // 🔹 TELECOM ONLY — TECH + BAND META
        SET_TELECOM_TECH_META: (state, { payload }) => {
            state.telecomTechMeta = payload;
        },

        SET_BOUNDARY_GROUPS: (state, { payload }) => {
            state.boundaryGroups = payload;
        },

        SET_BOUNDARY_GEOJSON: (state, { payload }) => {
            state.boundaryGeoJson = payload;
        },

        CLEAR_BOUNDARY_GEOJSON: (state) => {
            state.boundaryGeoJson = null;
        },

        SET_HIGHLIGHTED_CELL: (state, { payload }) => {
            state.highlightedCell = payload;
        },
        
    }
})

/* ============================================================
   EXPORTS
============================================================ */

export const { 
    // Old exports
    MARKER_LIST,
    MARKER_CHART_LIST,
    TECH_WITH_BAND,
    GET_ALL_FILTER,

    // New exports
    SET_RAW_CELLS,
    SET_FILTERS,
    SET_VIEW_STATE,
    SET_SYNC_ENABLED,
    SET_SELECTED_CELL,
    SET_MAP_CONFIG,
    SET_TELECOM_FILTER_META,
    SET_TELECOM_TECH_META,
    SET_BOUNDARY_GROUPS,
    SET_BOUNDARY_GEOJSON,
    CLEAR_BOUNDARY_GEOJSON,
    SET_HIGHLIGHTED_CELL,

} = mapQuery.actions

export default mapQuery.reducer
