// import { WebMercatorViewport } from "@deck.gl/core"
// import Api from "../../utils/api"
// import { Urls } from "../../utils/url"
// import { SET_AUTHENTICATED, SET_COMMON_CONFIG, SET_TOKEN, SET_USER } from "../reducers/auth-reducer"
// import { ALERTS } from "../reducers/component-reducer"
// import { deepCopyRanges, KPI_RANGE_DEFAULTS } from "../../components/MapsUsingDeckgl/Utils/colorEngine";
// import { 
//     // OLD TELECOM REDUCER IMPORTS
//     GET_ALL_FILTER, 
//     MARKER_CHART_LIST, 
//     MARKER_LIST, 
//     TECH_WITH_BAND,

//     // NEW TELECOM REDUCER IMPORTS
//     SET_RAW_CELLS,
//     SET_VIEW_STATE,
//     SET_FILTERS,
//     SET_SYNC_ENABLED,
//     SET_SELECTED_CELL,
//     SET_MAP_CONFIG,
//     SET_TELECOM_FILTER_META,
//     SET_TELECOM_TECH_META,
//      // Adding map layers as boundaries, related imports
//     SET_BOUNDARY_GROUPS,
//     SET_BOUNDARY_GEOJSON,
//     CLEAR_BOUNDARY_GEOJSON,
//     SET_SELECTED_BOUNDARIES,
//     SET_HIGHLIGHTED_CELL,

//     SET_ACTIVE_THEMATIC,
//     SET_DRIVE_TEST_DATA,
//     SET_DRIVE_TEST_FILTERS,
//     SET_ACTIVE_DRIVE_SESSIONS,

//     SET_RF_PREDICTION_FILTERS,
//     SET_RF_PREDICTION_GEOJSON,
//     SET_RF_PREDICTION_SELECTION,

//     CLEAR_RF_PREDICTION_GEOJSON,
//     SET_LAYER_OPACITY,
//     RESET_LAYER_OPACITY,
//     SET_LAYER_VISIBILITY,
//     RESET_LAYER_VISIBILITY,

// } from "../reducers/map-reducer"

// const MapActions = {
//     /* ============================================================
//        OLD EXISTING LOGIC (UNCHANGED)
//     ============================================================ */

//     postApiCaller: (urls, data, cb= () => {}) => async (dispatch, _) => {
//         try {
//             console.log("CommonPostActions.postApiCaller")
//             const res = await Api.post({ url: urls, data })
//             if (res?.status !== 201 && res?.status !== 200) return

//             cb()
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
//     logoutCaller: (cb = () => { }) => async (dispatch, _) => {
//         try {
//             // console.log("CommonPostActions.postApiCaller")
//             // const res = await Api.post({ url: urls, data })
//             // if (res?.status !== 201 && res?.status !== 200) return

//             localStorage.setItem("auth", false)
//             localStorage.removeItem("token")
//             localStorage.removeItem("user")

//             dispatch(SET_TOKEN(""))
//             dispatch(SET_USER(JSON.stringify({})))
//             dispatch(SET_AUTHENTICATED(false))


//             cb()


//             // let msgdata = {
//             //     show: true,
//             //     icon: 'error',
//             //     buttons: [
//             //     ],
//             //     text: "Your Session is Expired"
//             // }
//             // dispatch(ALERTS(msgdata))
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
//     getMarkerList: (data, cb= () => {}, reset = true) => async (dispatch, _) => {
//         try {   
//             console.log("CommonPostActions.postApiCaller")
//             const res = await Api.post({ url: Urls.map_getmarker, data: data })
//             if (res?.status !== 201 && res?.status !== 200) return
//             let dataAll = res.data
//             dispatch(MARKER_LIST({ dataAll, reset }))
//             cb()
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
//     saveCurrentMapLatLong: (data, cb= () => {}, reset = true) => async (dispatch, _) => {
//         try {
//             console.log("CommonPostActions.postApiCaller")
//             const res = await Api.post({ url: Urls.map_savelatlong, data: data, inst:0})
//             if (res?.status !== 201 && res?.status !== 200) return
//             let dataAll = res.data.data
//             localStorage.setItem('config', JSON.stringify(dataAll))
//             dispatch(SET_COMMON_CONFIG(dataAll))
//             cb()
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
// //     getMarkerChart: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
// //         try {
// //             console.log("CommonPostActions.postApiCaller")
// //             const res = await Api.post({ url: Urls.map_getChart, data: data })
// //             // let dataAll = res.data.data;
// //             // ///////////////////////////////
// //             // if (res?.status !== 201 && res?.status !== 200) {

// //             //     let msgdata = {
// //             //         show: true,
// //             //         icon: res.data.icon,
// //             //         buttons: [],
// //             //         text: res.data.msg,
// //             //         type: 1
// //             //     }
// //             //     dispatch(ALERTS(msgdata))
// //             //     cb()
// //             //     dispatch(MARKER_CHART_LIST({ parsed.data, reset }))
// //             // } else {
// //             //     dispatch(MARKER_CHART_LIST({ parsed.data, reset }))
// //             // }

// //  if (res?.status !== 200 && res?.status !== 201) {
// //       dispatch(
// //         ALERTS({
// //           show: true,
// //           icon: res?.data?.icon,
// //           buttons: [],
// //           text: res?.data?.msg || "Failed to fetch chart data",
// //           type: 1,
// //         })
// //       );
// //       cb();
// //       return;
// //     }

// //     // ✅ SAFELY PARSE BACKEND RESPONSE
// //     const parsedResponse =
// //       typeof res.data === "string" ? JSON.parse(res.data) : res.data;

// //     const dataAll = parsedResponse?.data || {};

// //     // ✅ UPDATE REDUX
// //     dispatch(MARKER_CHART_LIST({ dataAll, reset }));

// //     cb();

// //         } catch (error) {
// //             console.log(error, "amit errorerror 37")
// //    dispatch(
// //       ALERTS({
// //         show: true,
// //         icon: "error",
// //         buttons: [],
// //         text: "Something went wrong while loading chart data",
// //         type: 1,
// //       })
// //     );
// //             // dispatch(Notify.error('something went wrong! please try again after a while'))
// //         }
// //     },
//     ////// correction here
    
//     getMarkerChart: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
//         try {
//             console.log("CommonPostActions.postApiCaller");

//             const res = await Api.post({
//             url: Urls.map_getChart,
//             data: data,
//             });

//             if (res?.status !== 200 && res?.status !== 201) {
//             let msgdata = {
//                 show: true,
//                 icon: res?.data?.icon,
//                 buttons: [],
//                 text: res?.data?.msg,
//                 type: 1,
//             };
//             dispatch(ALERTS(msgdata));
//             cb();
//             return;
//             }

//             // ✅ THIS IS THE KEY LINE — 
//             dispatch(
//                 MARKER_CHART_LIST({
//                 dataAll: res.data.data,
//                 reset,
//                 })
//             );

//             cb();
//         } catch (error) {
//             console.log(error, "getMarkerChart error");
//         }
//     },

//     postTechWithBand: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
//         try {
//             console.log("CommonPostActions.postApiCaller")
//             const res = await Api.post({ url: Urls.techwithband, data: data })
//             if (res?.status !== 201 && res?.status !== 200) return
//             let dataAll = res.data
//             dispatch(MARKER_LIST({ dataAll, reset }))
//             cb()
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
//     getTechWithBand: (reset = true, args = "") => async (dispatch, _) => {
//         try {
//             console.log("AuthActions.signin")
//             const res = await Api.get({ url: `${Urls.techwithband}${args != "" ? "?" + args : ""}`, inst: 0 })
//             if (res?.status !== 200) return
//             console.log(res.data, "res.data")
//             const dataAll = res.data.data
//             dispatch(TECH_WITH_BAND({ dataAll, reset }))
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
//     getAllFilterList: (reset = true, args = "") => async (dispatch, _) => {
//         try {
//             console.log("AuthActions.signin")
//             const res = await Api.get({ url: `${Urls.getAllFilterList}${args != "" ? "?" + args : ""}`, inst: 0 })
//             if (res?.status !== 200) return
//             console.log(res.data, "allres.data")
//             const dataAll = res.data.data
//             console.log(dataAll, "gggggggggsasaSsA")
//             dispatch(GET_ALL_FILTER({ dataAll, reset }))
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
//     deleteApiCaller: (urls, cb= () => {}) => async (dispatch, _) => {
//         try {
//             console.log("CommonPostActions.postApiCaller")
//             const res = await Api.delete({ url: urls })
//             if (res?.status !== 201 && res?.status !== 200) return

//             cb()
//         } catch (error) {
//             console.log(error, "amit errorerror 37")

//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
//     commondownload: (urls, filename, method = "GET", data = {}, cb) => async (dispatch, _) => {
//         // (reqUrl, data).then((response) => {

//         const res = await Api.blobFile({ url: urls, method: method, data: data })

//         console.log(res, "resresresres")

//         filename = urls.split("/").pop()


//         const url = window.URL.createObjectURL(new Blob([res.data]));
//         const link = document.createElement('a');
//         link.href = url;
//         link.setAttribute('download', `${filename}`);
//         document.body.appendChild(link);
//         link.click();
//     },


//      /* ============================================================
//        NEW TELECOM MAP LOGIC
//     ============================================================ */

//     /**
//      * Fetch Telecom Cells from Backend
//      * This replaces old markerList usage for deck.gl maps
//      */

//     getGisCells: (filters = {}) => async (dispatch) => {

//         try {
//             const res = await Api.post({
//                 url: Urls.gisCells,
//                 data:  {
//                     dataValue: filters
//                 }
//             });
            
//             const apiData = res?.data?.data || [];
//             // const adapted = res.data.data.map(item => ({
//             const adapted = apiData.map(item => ({
//                 cell_id: item.cell_name,
//                 site_name: item.site_name,
//                 technology: item.technology,
//                 operator: item.vendor,
//                 region: item.region,
//                 band: item.band,
//                 latitude: item.latitude,
//                 longitude: item.longitude,
//                 azimuth: item.azimuth,
//                 beam_width: item.beamwidth,
//                 radius_m: item.length,
//                 status: "active",
//                 color: item.color
//             }));

//             // console.log("ADAPTED FIRST CELL:", adapted[0]);
//             dispatch(SET_RAW_CELLS(adapted));

//         } catch (err) {
//             console.log("gisCells error", err);
//             // dispatch(SET_RAW_CELLS([]));
//         }
//     },

//     /* ============================================================
//     TELECOM FILTER METADATA (ISOLATED FROM OLD MAP)
//     ============================================================ */
//     getTelecomFilterMeta: () => async (dispatch) => {
//     try {
//         const res = await Api.get({
//         url: Urls.getAllFilterList,
//         inst: 0
//         });

//         if (res?.status !== 200) return;

//         dispatch(SET_TELECOM_FILTER_META(res.data.data));

//     } catch (err) {
//         console.log("telecom filter meta error", err);
//     }
//     },

//     getTelecomTechMeta: () => async (dispatch) => {
//     try {
//         const res = await Api.get({
//         url: Urls.techwithband,
//         inst: 0
//         });

//         if (res?.status !== 200) return;

//         dispatch(SET_TELECOM_TECH_META(res.data.data));

//     } catch (err) {
//         console.log("telecom tech meta error", err);
//     }
//     },

//     getUserMapSetup: () => async (dispatch, getState) => {
//         try {
//             const res = await Api.get({
//             url: Urls.setupConf,
//             inst: 0
//             });

//             if (res?.status !== 200) return;
//             const data = res?.data?.data || {};

//             /* ---------------- PARSE LAT LONG ---------------- */
//             let viewState = null;
//             if (data.saveLatLong) {
//                 const parsed = JSON.parse(data.saveLatLong);

//                 viewState = {
//                     longitude: Number(parsed.lng),
//                     latitude: Number(parsed.lat),
//                     zoom: Number(parsed.zoom),
//                     pitch: 0,
//                     bearing: 0
//                 };
//             }

//             /* ---------------- PARSE FILTERS ---------------- */

//             const filters = data.saveMapFilters
//             ? JSON.parse(data.saveMapFilters)
//             : {};

//             /* ---------------- PARSE THEMATICS ---------------- */

//             const thematics = data.saveThematics
//             ? JSON.parse(data.saveThematics)
//             : { type: "Default", colors: {} };

//             /* ---------------- MAP CONFIG ---------------- */

//             const config = {
//                 mapScale: Number(data.mapScale) || 1,
//                 mapView: data.mapView || "mapbox://styles/mapbox/streets-v11"
//             };

//             /* ---------------- DISPATCH ---------------- */

//             if (viewState) dispatch(SET_VIEW_STATE(viewState));

//             dispatch(SET_FILTERS(filters));
//             dispatch(SET_MAP_CONFIG(config));
//             dispatch(SET_ACTIVE_THEMATIC(thematics));

//             // LayerVisibilty settings
//             const layerVisibility = data.saveLayerVisibility
//                 ? JSON.parse(data.saveLayerVisibility)
//                 : null;

//             if (layerVisibility) {
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "CELLS", value: layerVisibility.CELLS }));
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "BOUNDARY", value: layerVisibility.BOUNDARY }));
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "RF", value: layerVisibility.RF }));
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "DRIVE_TEST", value: layerVisibility.DRIVE_TEST }));
//             } else {
//                 // Explicitly reset to false if nothing saved
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "CELLS", value: false }));
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "BOUNDARY", value: false }));
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "RF", value: false }));
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "DRIVE_TEST", value: false }));
//             }

//             const savedBoundaries = data.saveBoundaries
//                 ? JSON.parse(data.saveBoundaries)
//                 : {};

//             const savedDriveTestFilters = data.saveDriveTestFilters
//                 ? JSON.parse(data.saveDriveTestFilters)
//                 : null;

//             // convert "ALL" back to full arrays before storing in Redux
//             const normalizedBoundaries = Object.fromEntries(
//                 Object.entries(savedBoundaries).map(([group, value]) => {
//                     if (value === "ALL") {
//                         const groupObj = boundaryGroups.find(g => g.shapegroup === group);
//                         return [group, groupObj?.shapenames || []];
//                     }
//                     return [group, value];
//                 })
//             );

//             dispatch(SET_SELECTED_BOUNDARIES({
//                 ...normalizedBoundaries,
//                 RF: rfToRestore,
//                 DRIVE_TEST: savedDriveTestFilters?.sessions || []
//             }));
//             boundaryGroups.forEach(group => {
//                 const saved = savedBoundaries[group.shapegroup];
//                 if (!saved) return;

//                 // "ALL" means all children were selected
//                 const children = saved === "ALL" ? group.shapenames : saved;

//                 dispatch(SET_LAYER_VISIBILITY({ 
//                     layer: group.shapegroup, 
//                     value: saved === "ALL"
//                 }));

//                 if (children.length > 0) {
//                     dispatch(MapActions.getBoundaryGeoJson(
//                         group.shapegroup,
//                         group.shapetypes[0],
//                         children
//                     ));
//                 }
//             });

//             const savedRfParameter = data.saveRfParameter || "RSRP";
//             // const rfRegions = savedBoundaries["RF"] || [];
//             // rfRegions.forEach(region => {
//             //     dispatch(MapActions.getRfPredictionLayer(region, savedRfParameter));
//             // });

//             const savedRfRegions = data.saveRfRegions
//                 ? JSON.parse(data.saveRfRegions)
//                 : [];

//             const rfToRestore = savedRfRegions === "ALL"
//                 ? getState().map.rfPredictionFilters.map(f => f.name) // all regions
//                 : savedRfRegions;

//             rfToRestore.forEach(region => {
//                 dispatch(MapActions.getRfPredictionLayer(region, savedRfParameter));
//             });

//             if (rfToRestore.length > 0) {
//                 dispatch(SET_LAYER_VISIBILITY({ layer: "RF", value: true }));
//             }

//             // Restore Drive Test filters
            
//             // if (savedDriveTestFilters) {
//             //     dispatch(SET_DRIVE_TEST_FILTERS(savedDriveTestFilters));
//             //     dispatch(SET_ACTIVE_DRIVE_SESSIONS(savedDriveTestFilters.sessions || []));
//             // }
//             if (savedDriveTestFilters) {
//                 dispatch(SET_DRIVE_TEST_FILTERS({
//                     ...savedDriveTestFilters,
//                     // restore default ranges based on saved thematic (ranges not saved to backend)
//                     ranges: deepCopyRanges(KPI_RANGE_DEFAULTS[savedDriveTestFilters.thematic || "RSSI"])
//                 }));
//                 const sessions = savedDriveTestFilters.sessions || [];
//                 dispatch(SET_ACTIVE_DRIVE_SESSIONS(sessions));

//                 // re-fetch drive test data so it renders on map after reload
//                 if (sessions.length > 0) {
//                     dispatch(MapActions.getDriveTestData());
//                 }
//             }

//         } catch (err) {
//             console.log("setup config error", err);
//         }
//     },
//  /* ============================================================
//     ADD MAP LAYER
//     ============================================================ */

//     // Fetch boundary groups for map overlay (isolated from old map logic)
//     getBoundaryGroups: () => async (dispatch) => {
//         try {

//             const res = await Api.get({
//             url: Urls.boundary_groups,
//             inst: 0
//             });

//             if (res?.status !== 200) return;

//             const groups = res?.data?.data || [];
//             dispatch(SET_BOUNDARY_GROUPS(groups));;

//         } catch (err) {
//             console.log("boundary groups error", err);
//         }
//     },

//     // Fetch GeoJSON for a specific boundary group (isolated from old map logic)
//     getBoundaryGeoJson: (country, level, names=[]) => async (dispatch) => {
//         try {

//             const query = `?country=${country}&level=${level}`;
    
//             const res = await Api.get({
//             url: `${Urls.boundaries}${query}`,
//             inst: 0
//             }); 

//             if (res?.status !== 200) return;

//             let geojson = res.data.data;

//             // filter by shapename
//             if (names.length > 0) {
//             geojson.features = geojson.features.filter(
//                 f => names.includes(f.properties.name)
//             );
//             }

//             dispatch(
//             SET_BOUNDARY_GEOJSON(geojson)
//             );

//         } catch (err) {
//             console.log("boundary geojson error", err);
//         }
//     },

//     // RF Test drive data plotting
//     // getDriveTestData: () => async (dispatch) => {

//     //     try {

//     //         const res = await Api.get({
//     //         url: Urls.drive_test,
//     //         inst: 0
//     //         });

//     //         if (res?.status !== 200) return;

//     //         const raw = res?.data?.data?.[0];

//     //                 console.log("Drive test data", raw);

//     //         if (!raw) {
//     //         dispatch(SET_DRIVE_TEST_DATA([]));
//     //         return;
//     //         }

//     //         const { lat = [], lon = [], rssi = [], session_id } = raw;

//     //         const points = lat.map((latVal, i) => ({
//     //         latitude: Number(latVal),
//     //         longitude: Number(lon[i]),
//     //         rssi: Number(rssi[i]),
//     //         session_id
//     //         }));

//     //         dispatch(SET_DRIVE_TEST_DATA(points));

//     //     } catch (err) {

//     //         console.log("drive test data error", err);

//     //     }

//     //     },

//     getDriveTestData: () => async (dispatch) => {
//         try {

//             const res = await Api.get({
//             url: Urls.drive_test,
//             inst: 0
//             });

//             if (res?.status !== 200) return;

//             const sessions = res?.data?.data || [];

//             const allPoints = [];

//             sessions.forEach(session => {

//             const {
//                 lat = [],
//                 lon = [],
//                 rssi = [],
//                 session_id
//             } = session;

//             lat.forEach((latVal, i) => {

//                 allPoints.push({
//                 latitude: Number(latVal),
//                 longitude: Number(lon[i]),
//                 rssi: Number(rssi[i]),
//                 session_id
//                 });

//             });

//             });

//             dispatch(SET_DRIVE_TEST_DATA(allPoints));

//         } catch (err) {

//             console.log("drive test data error", err);

//         }
//     },

//         // RF Predictions geojson colored data plotting
//     getRfPredictionFilters: () => async (dispatch) => {
//     try {

//         const res = await Api.get({
//         url: Urls.rf_prediction_filters,
//         inst: 0
//         });

//     console.log("RF FILTERS API RESPONSE", res.data.data)

//         if (res?.status !== 200) return;

//         dispatch(
//         SET_RF_PREDICTION_FILTERS(res.data.data)
//         );

//     } catch (err) {

//         console.log("RF filters error", err);

//     }

//     },

//     getRfPredictionLayer:
//     (region, parameter, range_label) => async (dispatch) => {

//         console.log("Fetching RF layer for", region)
//     try {

//         const query =
//         `?region=${encodeURIComponent(region)}&parameter=${parameter}`;
//         //   `?region=${encodeURIComponent(region)}&parameter=${parameter}&range_label=${encodeURIComponent(range_label)}`;

//         const res = await Api.get({
//         url: `${Urls.rf_prediction_data}${query}`,
//         inst: 0
//         });
//         console.log("FULL RESPONSE RF Prediction", res);
//         console.log("FULL RESPONSE DATA", res.data);

//         if (res?.status !== 200) return;

//         dispatch(
//         SET_RF_PREDICTION_GEOJSON(res.data.data)
//         );

//     } catch (err) {

//         console.log("RF prediction error", err);

//     }

//     },

//     // fitToBounds: (points) => (dispatch) => {
//     //     if (!points || points.length === 0) return;

//     //     const viewport = new WebMercatorViewport({
//     //         width: window.innerWidth,
//     //         height: window.innerHeight
//     //     });

//     //     let { longitude, latitude, zoom } = viewport.fitBounds(points, { padding: 60 });
//     //     zoom = Math.min(zoom, 13);

//     //     dispatch(SET_VIEW_STATE({
//     //         longitude,
//     //         latitude,
//     //         zoom,
//     //         pitch: 0,
//     //         bearing: 0
//     //     }));
//     // },
// // getRfPredictionLayer:
// // (region, parameter, range_label) => async (dispatch) => {

// //   try {

// //     const res = await Api.get({
// //       url:
// //         `${Urls.rf_prediction_data}?region=${encodeURIComponent(region)}`
// //         + `&parameter=${parameter}`
// //         + `&range_label=${encodeURIComponent(range_label)}`,
// //       inst: 0
// //     });

// //     if (res?.status !== 200) return;

// //     dispatch(
// //       SET_RF_PREDICTION_GEOJSON(res.data.data)
// //     );

// //   } catch (err) {

// //     console.log("RF prediction fetch error", err);

// //   }

// // },

//     //  Update Map View State (for sync behavior)
//     setViewState: (viewState) => (dispatch) => {
//         dispatch(SET_VIEW_STATE(viewState))
//     },

//     //  Update Filters
//     setFilters: (filters) => (dispatch) => {
//         dispatch(SET_FILTERS(filters))
//     },

//     // Enable / Disable Sync
//     setSyncEnabled: (value) => (dispatch) => {
//         dispatch(SET_SYNC_ENABLED(value))
//     },

//     // Set Selected Cell (for popup/modal)
//     setSelectedCell: (cell) => (dispatch) => {
//         dispatch(SET_SELECTED_CELL(cell))
//     },

//     // Update Map Configuration (scale/style)
//     setMapConfig: (config) => (dispatch) => {
//         dispatch(SET_MAP_CONFIG(config))
//     },

//     // geojson layer related actions
//     clearBoundaryLayer: () => (dispatch) => {
//         dispatch(CLEAR_BOUNDARY_GEOJSON());
//     },

//     setSelectedBoundaries: (boundaries) => (dispatch) => {
//         dispatch(SET_SELECTED_BOUNDARIES(boundaries));
//     },

//     // search apply & zoom
//     setHighlightedCell: (cellId) => (dispatch) => {
//         dispatch(SET_HIGHLIGHTED_CELL(cellId));
//     },

//     setActiveThematic: (payload) => (dispatch) => {
//         dispatch(SET_ACTIVE_THEMATIC(payload));
//     },

//     setActiveDriveSessions: (sessions) => (dispatch) => {
//         dispatch( SET_ACTIVE_DRIVE_SESSIONS(sessions));
//     },

//     setDriveTestFilters: (filters) => (dispatch) => {
//         dispatch(
//             SET_DRIVE_TEST_FILTERS(filters)
//         );
//     },

//     setRfParameter: (param) => (dispatch) => {
//         dispatch(SET_MAP_CONFIG({ rfParameter: param }));
//     },

//     clearRfPredictionLayer: () => (dispatch) => {
//         dispatch(CLEAR_RF_PREDICTION_GEOJSON());
//     },

//     setLayerOpacity: (layer, value) => (dispatch) => {
//         dispatch(SET_LAYER_OPACITY({layer,value}));
//     },

//     resetLayerOpacity: () => (dispatch) => {
//         dispatch(RESET_LAYER_OPACITY());
//     },

//     setLayerVisibility: (layer, value) => (dispatch) => {
//         dispatch(SET_LAYER_VISIBILITY({ layer, value }));
//     },

//     resetLayerVisibility: () => (dispatch) => {
//         dispatch(RESET_LAYER_VISIBILITY());
//     },
// }

// export default MapActions;


import { WebMercatorViewport } from "@deck.gl/core"
import Api from "../../utils/api"
import { Urls } from "../../utils/url"
import { SET_COMMON_CONFIG } from "../reducers/auth-reducer"
import { ALERTS } from "../reducers/component-reducer"
import { deepCopyRanges, KPI_RANGE_DEFAULTS, generatePaletteColors, COLOR_SCHEMES, FIXED_COLORS } from "../../components/MapsUsingDeckgl/Utils/colorEngine";
import { 
    // OLD TELECOM REDUCER IMPORTS
    GET_ALL_FILTER, 
    MARKER_CHART_LIST, 
    MARKER_LIST, 
    TECH_WITH_BAND,

    // NEW TELECOM REDUCER IMPORTS
    SET_RAW_CELLS,
    SET_RAW_CELLS_PER_MAP,
    SET_VIEW_STATE,
    SET_FILTERS,
    SET_SYNC_ENABLED,
    SET_SELECTED_CELL,
    SET_MAP_CONFIG,
    SET_TELECOM_FILTER_META,
    SET_TELECOM_TECH_META,
    SET_BOUNDARY_GROUPS,
    SET_BOUNDARY_GEOJSON,
    CLEAR_BOUNDARY_GEOJSON,
    CLEAR_BOUNDARY_GROUP,

    SET_SELECTED_BOUNDARIES,
    SET_HIGHLIGHTED_CELL,

    SET_ACTIVE_THEMATIC,
    SET_AVAILABLE_CELL_KPIS,
    SET_CELL_KPI_DATA, //cell
    SET_SITE_KPI_DATA, //site
    SET_ACTIVE_SITE_THEMATIC,  //site
    SET_DRIVE_TEST_DATA,
    SET_DRIVE_TEST_FILTERS,
    SET_ACTIVE_DRIVE_SESSIONS,

    SET_RF_PREDICTION_FILTERS,
    SET_RF_COLOR_CONFIG,
    SET_RF_PREDICTION_GEOJSON,
    SET_RF_PREDICTION_SELECTION,

    CLEAR_RF_PREDICTION_GEOJSON,
    CLEAR_RF_PREDICTION_REGION,

    SET_LAYER_OPACITY,
    RESET_LAYER_OPACITY,
    SET_LAYER_VISIBILITY,
    RESET_LAYER_VISIBILITY,
    SET_RAW_SITES,
    SET_RULER_MODE,
    SET_RULER_POINTS,
    SET_LAYER_LEGEND,
    SET_BOUNDARY_COLORS,
    SET_TA_SECTOR_DATA,
    SET_NEIGHBOUR_RELATIONS,

} from "../reducers/map-reducer"

const MapActions = {
    /* ============================================================
       OLD EXISTING LOGIC (UNCHANGED)
    ============================================================ */

    postApiCaller: (urls, data, cb= () => {}) => async (dispatch, _) => {
        try {
            console.log("CommonPostActions.postApiCaller")
            const res = await Api.post({ url: urls, data })
            if (res?.status !== 201 && res?.status !== 200) return
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    },

    getMarkerList: (data, cb= () => {}, reset = true) => async (dispatch, _) => {
        try {   
            console.log("CommonPostActions.postApiCaller")
            const res = await Api.post({ url: Urls.map_getmarker, data: data })
            if (res?.status !== 201 && res?.status !== 200) return
            let dataAll = res.data
            dispatch(MARKER_LIST({ dataAll, reset }))
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    },

    saveCurrentMapLatLong: (data, cb= () => {}, reset = true) => async (dispatch, _) => {
        try {
            console.log("CommonPostActions.postApiCaller")
            const res = await Api.post({ url: Urls.map_savelatlong, data: data, inst:0})
            if (res?.status !== 201 && res?.status !== 200) return
            let dataAll = res.data.data
            localStorage.setItem('config', JSON.stringify(dataAll))
            dispatch(SET_COMMON_CONFIG(dataAll))
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    },

    getMarkerChart: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
        try {
            console.log("CommonPostActions.postApiCaller");
            const res = await Api.post({ url: Urls.map_getChart, data: data });
            if (res?.status !== 200 && res?.status !== 201) {
                let msgdata = { show: true, icon: res?.data?.icon, buttons: [], text: res?.data?.msg, type: 1 };
                dispatch(ALERTS(msgdata));
                cb();
                return;
            }
            dispatch(MARKER_CHART_LIST({ dataAll: res.data.data, reset }));
            cb();
        } catch (error) {
            console.log(error, "getMarkerChart error");
        }
    },

    postTechWithBand: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
        try {
            const res = await Api.post({ url: Urls.techwithband, data: data })
            if (res?.status !== 201 && res?.status !== 200) return
            let dataAll = res.data
            dispatch(MARKER_LIST({ dataAll, reset }))
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    },

    getTechWithBand: (reset = true, args = "") => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.techwithband}${args != "" ? "?" + args : ""}`, inst: 0 })
            if (res?.status !== 200) return
            const dataAll = res.data.data
            dispatch(TECH_WITH_BAND({ dataAll, reset }))
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    },

    getAllFilterList: (reset = true, args = "") => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.getAllFilterList}${args != "" ? "?" + args : ""}`, inst: 0 })
            if (res?.status !== 200) return
            const dataAll = res.data.data
            dispatch(GET_ALL_FILTER({ dataAll, reset }))
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    },

    deleteApiCaller: (urls, cb= () => {}) => async (dispatch, _) => {
        try {
            const res = await Api.delete({ url: urls })
            if (res?.status !== 201 && res?.status !== 200) return
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    },

    commondownload: (urls, filename, method = "GET", data = {}, cb) => async (dispatch, _) => {
        const res = await Api.blobFile({ url: urls, method: method, data: data })
        filename = urls.split("/").pop()
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}`);
        document.body.appendChild(link);
        link.click();
    },

    /* ============================================================
       ADD MAP LAYER
    ============================================================ */

    // Cell Layer
    getGisCells: (filters = {}) => async (dispatch) => {
        try {
            const res = await Api.post({
                url: Urls.gisCells,
                data: { dataValue: filters }
            });
            const apiData = res?.data?.data || [];
            const apiKpis = res?.data?.kpis || [];
            const adapted = apiData.map(item => ({
                cell_id: item.cell_name,
                site_name: item.site_name,
                technology: item.technology,
                operator: item.vendor,
                region: item.region,
                band: item.band,
                latitude: item.latitude,
                longitude: item.longitude,
                azimuth: item.azimuth,
                beam_width: item.beamwidth, // mapped but intentionally not used in sector rendering (see sectorLayer.getPolygon)
                radius_m: item.length,      // used as BOTH the beam sweep angle (antBW) and sector radius in generateCoordinates
                status: "active",
                color: item.color
                // item.len_height is not mapped — not needed for rendering
            }));
            dispatch(SET_RAW_CELLS(adapted));
            if (apiKpis.length > 0) {
                dispatch(SET_AVAILABLE_CELL_KPIS(apiKpis));
            }
        } catch (err) {
            console.log("gisCells error", err);
        }
    },

    // Fetch KPI values per cell — called on Apply when thematic type is KPIs
    // startDate / endDate must be YYYY-MM-DD strings
    getGisCellsKpi: (startDate, endDate, kpi) => async (dispatch) => {
        try {
            const res = await Api.get({
                url: `${Urls.gisCellsKpi}?start_date=${startDate}&end_date=${endDate}&kpi=${kpi}`,
                inst: 0
            });
            if (res?.status !== 200) return;
            const rows = res?.data?.data || [];
            // URL param is capitalized (e.g. "CSSR"), response field is lowercase (e.g. "cssr")
            const responseKey = kpi.toLowerCase();
            const lookup = {};
            rows.forEach(row => {
                if (row.cell_name != null) {
                    lookup[row.cell_name] = row[responseKey] ?? null;
                }
            });
            dispatch(SET_CELL_KPI_DATA(lookup));
        } catch (err) {
            console.log("gisCellsKpi error", err);
        }
    },

    // startDate / endDate must be YYYY-MM-DD strings
    getGisSitesKpi: (startDate, endDate, kpi) => async (dispatch) => {
        try {
            const res = await Api.get({
                url: `${Urls.gisSitesKpi}?start_date=${startDate}&end_date=${endDate}&kpi=${kpi}`,
                inst: 0
            });
            if (res?.status !== 200) return;
            const rows = res?.data?.data || [];
            // Response field is lowercase (e.g. "cssr") even though URL param is capitalized
            const responseKey = kpi.toLowerCase();
            const lookup = {};
            rows.forEach(row => {
                if (row.tower_id != null) {
                    lookup[row.tower_id] = row[responseKey] ?? null;
                }
            });
            dispatch(SET_SITE_KPI_DATA(lookup));
        } catch (err) {
            console.log("gisSitesKpi error", err);
        }
    },

    // Fetch cells for a specific multi-map slot (sends map_id to backend)
    getGisCellsForMap: (mapKey, filters = {}) => async (dispatch) => {
        try {
            const res = await Api.post({
                url: Urls.gisCells,
                data: { dataValue: filters, map_id: mapKey }
            });
            const apiData = res?.data?.data || [];
            const adapted = apiData.map(item => ({
                cell_id: item.cell_name,
                site_name: item.site_name,
                technology: item.technology,
                operator: item.vendor,
                region: item.region,
                band: item.band,
                latitude: item.latitude,
                longitude: item.longitude,
                azimuth: item.azimuth,
                beam_width: item.beamwidth,
                radius_m: item.length,
                status: "active",
                color: item.color
            }));
            dispatch(SET_RAW_CELLS_PER_MAP({ mapKey, cells: adapted }));
        } catch (err) {
            console.log("getGisCellsForMap error", mapKey, err);
        }
    },

    getTelecomFilterMeta: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.getAllFilterList, inst: 0 });
            if (res?.status !== 200) return;
            dispatch(SET_TELECOM_FILTER_META(res.data.data));
        } catch (err) {
            console.log("telecom filter meta error", err);
        }
    },

    getTelecomTechMeta: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.techwithband, inst: 0 });
            if (res?.status !== 200) return;
            dispatch(SET_TELECOM_TECH_META(res.data.data));
        } catch (err) {
            console.log("telecom tech meta error", err);
        }
    },

    // SITE Layer
    getSites: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.towers, inst: 0 });

            console.log("GET sites raw res.data:", res.data);
console.log("res.data.data:", res.data.data);
console.log("res.data.data length:", res.data.data?.length);

            if (res?.status !== 200) return;
            const adapted = (res.data.data || []).map(item => ({
                tower_id:  item.tower_id,
                site_name: item.site_name,        // ← was item.atoll_site_name, use site_name to match rawCells
                latitude:  Number(item.latitude),
                longitude: Number(item.longitude),
                vendor:    item.vendor,
                region:    item.region,
                technology: item.technology,
                band:      item.band,
                status:    item.status,
            }));
            dispatch(SET_RAW_SITES(adapted));
        } catch (err) {
            console.log("sites error", err);
        }
    },

    // Boundary Layer(KEN)
    getBoundaryGroups: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.boundary_groups, inst: 0 });
            if (res?.status !== 200) return;
            const groups = res?.data?.data || [];
            dispatch(SET_BOUNDARY_GROUPS(groups));
        } catch (err) {
            console.log("boundary groups error", err);
        }
    },

    getBoundaryGeoJson: (country, level, names=[]) => async (dispatch) => {
        try {
            const query = `?country=${country}&level=${level}`;
            const res = await Api.get({ url: `${Urls.boundaries}${query}`, inst: 0 }); 
            if (res?.status !== 200) return;
            let geojson = res.data.data;
            if (names.length > 0) {
                geojson.features = geojson.features.filter(
                    f => names.includes(f.properties.name)
                );
            }

            // tag each feature with the group name
            geojson.features = geojson.features.map(f => ({
                ...f,
                properties: { ...f.properties, shapegroup: country }
            }));
            dispatch(SET_BOUNDARY_GEOJSON(geojson));
        } catch (err) {
            console.log("boundary geojson error", err);
        }
    },

    // Drive Test Layer
    getDriveTestData: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.drive_test, inst: 0 });
            if (res?.status !== 200) return;
            const sessions = res?.data?.data || [];
            const allPoints = [];
            sessions.forEach(session => {
                const { lat = [], lon = [], rssi = [], session_id } = session;
                lat.forEach((latVal, i) => {
                    allPoints.push({
                        latitude: Number(latVal),
                        longitude: Number(lon[i]),
                        rssi: Number(rssi[i]),
                        session_id
                    });
                });
            });
            dispatch(SET_DRIVE_TEST_DATA(allPoints));
        } catch (err) {
            console.log("drive test data error", err);
        }
    },

    // RF Prediction Layer
    getRfPredictionFilters: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.rf_prediction_filters, inst: 0 });
            if (res?.status !== 200) return;
            dispatch(SET_RF_PREDICTION_FILTERS(res.data.data || []));
            dispatch(SET_RF_COLOR_CONFIG(res.data.rf_color_config || []));
        } catch (err) {
            console.log("RF filters error", err);
        }
    },

    getRfPredictionLayer: (region, parameter, range_label) => async (dispatch) => {
        console.log("Fetching RF layer for", region)
        try {
            const query = `?region=${encodeURIComponent(region)}&parameter=${parameter}`;
            const res = await Api.get({ url: `${Urls.rf_prediction_data}${query}`, inst: 0 });
            console.log("FULL RESPONSE RF Prediction", res);
            if (res?.status !== 200) return;
            dispatch(SET_RF_PREDICTION_GEOJSON(res.data.data));
        } catch (err) {
            console.log("RF prediction error", err);
        }
    },

    // Per user map configurations 
    getUserMapSetup: () => async (dispatch, getState) => {
        try {
            const [setupRes, techRes, filterRes] = await Promise.all([
                Api.get({ url: Urls.setupConf, inst: 0 }),
                Api.get({ url: Urls.techwithband, inst: 0 }),
                Api.get({ url: Urls.getAllFilterList, inst: 0 })
            ]);

            if (setupRes?.status !== 200) return;
            const data = setupRes?.data?.data || {};

            if (techRes?.status === 200) {
                dispatch(SET_TELECOM_TECH_META(techRes.data.data || []));
            }
            if (filterRes?.status === 200) {
                dispatch(SET_TELECOM_FILTER_META(filterRes.data.data));
            }

            const techMeta = techRes?.data?.data || [];

            // let viewState = { longitude: 37.9062, latitude: 0.0236, zoom: 6, pitch: 0, bearing: 0 };
            // if (data.saveLatLong) {
            //     const parsed = JSON.parse(data.saveLatLong);
            //     const lat = Number(parsed.lat);
            //     const lng = Number(parsed.lng);
            //     const zoom = Number(parsed.zoom);
            //     // only restore if it looks like a valid Kenya-region coordinate
            //     if (!isNaN(lat) && !isNaN(lng) && zoom > 0) {
            //         viewState = { longitude: lng, latitude: lat, zoom, pitch: 0, bearing: 0 };
            //     }
            // }

            // viewState intentionally not dispatched here — fitToData() in TelecomMap
            // auto-fits to the loaded rawCells on mount, so dispatching a fixed
            // Kenya viewport here would race against fitToData and reset the map
            // to zoom 6 (hiding individual cells/sectors that need zoom ≥ 10/12).

            /* ---------------- PARSE FILTERS ---------------- */
            const filters = data.saveMapFilters ? JSON.parse(data.saveMapFilters) : {};

            /* ---------------- PARSE THEMATICS ---------------- */
            const thematics = data.saveThematics
                ? JSON.parse(data.saveThematics)
                : null;

            const hasColors = thematics?.colors && Object.keys(thematics.colors).length > 0;

            /* ---------------- MAP CONFIG ---------------- */
            // const config = {
            //     mapScale: Number(data.mapScale) || 1,
            //     mapView: data.mapView || "voyager"
            //     // mapView:  "voyager"  // ← hardcode, ignore saved valu
            // };

            // normalize old mapbox URLs to new short keys
            const rawMapView = data.mapView || "voyager";
            const mapViewNormalized = rawMapView.startsWith("mapbox://") ? "voyager" : rawMapView;

            const config = {
                mapScale: Number(data.mapScale) || 1,
                mapView: mapViewNormalized
            };

            /* ---------------- DISPATCH BASE CONFIG ---------------- */
            dispatch(SET_FILTERS(filters));
            dispatch(SET_MAP_CONFIG(config));
            
            if (hasColors) {
                dispatch(SET_ACTIVE_THEMATIC(thematics));
            } else {
                const bandValues = [...new Set(techMeta.map(t => t.name))];
                const bandColors = generatePaletteColors(bandValues, COLOR_SCHEMES.Default);
                dispatch(SET_ACTIVE_THEMATIC({
                    type: "Band",
                    colors: bandColors,
                    opacity: 0.9
                }));
            }

            // Re-fetch cell KPI data on reload if KPI thematic was saved
            if (thematics?.type === "KPIs") {
                const { startDateTime: kpiStart, endDateTime: kpiEnd, kpi } = thematics.kpiConfig || {};
                if (kpiStart && kpiEnd && kpi) {
                    dispatch(MapActions.getGisCellsKpi(kpiStart.slice(0, 10), kpiEnd.slice(0, 10), kpi));
                }
            }

            /* ---------------- RESTORE LAYER OPACITY ---------------- */
            const savedLayerOpacity = data.saveLayerOpacity
                ? JSON.parse(data.saveLayerOpacity)
                : null;

            if (savedLayerOpacity) {
                Object.entries(savedLayerOpacity).forEach(([layer, value]) => {
                    dispatch(SET_LAYER_OPACITY({ layer, value }));
                });
            }

            /* ---------------- LAYER VISIBILITY ---------------- */
            const layerVisibility = data.saveLayerVisibility
                ? JSON.parse(data.saveLayerVisibility)
                : null;

            // cellsOn: saved preference for returning users; true by default for new users
            const cellsOn = layerVisibility ? Boolean(layerVisibility.CELLS) : true;

            if (layerVisibility) {
                dispatch(SET_LAYER_VISIBILITY({ layer: "CELLS", value: layerVisibility.CELLS }));
                dispatch(SET_LAYER_VISIBILITY({ layer: "SITES", value: layerVisibility.SITES }));
                dispatch(SET_LAYER_VISIBILITY({ layer: "BOUNDARY", value: layerVisibility.BOUNDARY }));
                dispatch(SET_LAYER_VISIBILITY({ layer: "RF", value: layerVisibility.RF }));
                dispatch(SET_LAYER_VISIBILITY({ layer: "DRIVE_TEST", value: layerVisibility.DRIVE_TEST }));
            } else {
                // New user — show cells by default, everything else off
                dispatch(SET_LAYER_VISIBILITY({ layer: "CELLS", value: true }));
                dispatch(SET_LAYER_VISIBILITY({ layer: "BOUNDARY", value: false }));
                dispatch(SET_LAYER_VISIBILITY({ layer: "RF", value: false }));
                dispatch(SET_LAYER_VISIBILITY({ layer: "DRIVE_TEST", value: false }));
            }

            /* ---------------- FETCH CELLS ---------------- */
            // TelecomMapsPage no longer calls getGisCells({}) unconditionally — this is the
            // single place that fetches cells, using saved filters for returning users or
            // empty filters (all cells) for new users.
            if (cellsOn) {
                dispatch(MapActions.getGisCells(filters));
            }

            /* ---------------- BOUNDARIES ---------------- */
            const savedBoundaries = data.saveBoundaries
                ? JSON.parse(data.saveBoundaries)
                : {};

            const savedDriveTestFilters = data.saveDriveTestFilters
                ? JSON.parse(data.saveDriveTestFilters)
                : null;

            const boundaryGroups = getState().map.boundaryGroups;
            const savedRfParameter = data.saveRfParameter || "RSRP";
            dispatch(SET_MAP_CONFIG({ rfParameter: savedRfParameter }));

            const savedBoundaryColors = data.saveBoundaryColors
                ? JSON.parse(data.saveBoundaryColors)
                : data.saveBoundaryColor
                    ? { [boundaryGroups[0]?.shapegroup]: data.saveBoundaryColor }
                    : {};

                dispatch(SET_BOUNDARY_COLORS(savedBoundaryColors));
            
            // RF is saved inside saveBoundaries["RF"]
          // ✅ RF is now saved in SEPARATE column (not inside saveBoundaries)
            const savedRfRegions = data.saveRfRegions
                ? JSON.parse(data.saveRfRegions)
                : [];
            const allRfRegions = [...new Set(getState().map.rfPredictionFilters.map(f => f.name))];
            const rfToRestore = savedRfRegions === "ALL"
                ? allRfRegions
                : (Array.isArray(savedRfRegions) ? savedRfRegions : []);

            // normalize boundaries — convert "ALL" string back to full arrays
           // ✅ saveBoundaries now ONLY has Kenya groups (RF removed from here)
            const normalizedBoundaries = Object.fromEntries(
                Object.entries(savedBoundaries)
                    .map(([group, value]) => {
                        if (value === "ALL") {
                            const groupObj = boundaryGroups.find(g => g.shapegroup === group);
                            return [group, groupObj?.shapenames || []];
                        }
                        return [group, value];
                    })
            );

            // store everything in selected Boundaries including RF and DRIVE_TEST
            dispatch(SET_SELECTED_BOUNDARIES({
                ...normalizedBoundaries,
                RF: rfToRestore, 
                DRIVE_TEST: savedDriveTestFilters?.sessions || [] //may need to be deleted
            }));

            // ✅ Store RF selection separately (you'll need to add this to Redux later)
            // For now, just restore the layers

            /* ---------------- RESTORE BOUNDARY LAYERS ---------------- */
            boundaryGroups.forEach(group => {
                const saved = savedBoundaries[group.shapegroup];
                if (!saved) return;

                const children = saved === "ALL" ? group.shapenames : saved;

                dispatch(SET_LAYER_VISIBILITY({
                    layer: group.shapegroup,
                    value: saved === "ALL"
                }));

                if (children.length > 0) {
                    dispatch(MapActions.getBoundaryGeoJson(
                        group.shapegroup,
                        group.shapetypes[0],
                        children
                    ));
                }
            });

            /* ---------------- RESTORE RF LAYER ---------------- */
            rfToRestore.forEach(region => {
                dispatch(MapActions.getRfPredictionLayer(region, savedRfParameter));
            });

            if (rfToRestore.length > 0) {
                dispatch(SET_LAYER_VISIBILITY({ layer: "RF", value: true }));
            }

            /* ---------------- RESTORE DRIVE TEST ---------------- */
            if (savedDriveTestFilters) {
                // dispatch(SET_DRIVE_TEST_FILTERS({
                //     ...savedDriveTestFilters,
                //     ranges: deepCopyRanges(KPI_RANGE_DEFAULTS[savedDriveTestFilters.thematic || "RSSI"])
                // }));
                dispatch(SET_DRIVE_TEST_FILTERS({
                    ...savedDriveTestFilters,
                    ranges: savedDriveTestFilters.ranges?.length
                        ? savedDriveTestFilters.ranges.map(r => ({ ...r }))
                        : deepCopyRanges(KPI_RANGE_DEFAULTS[savedDriveTestFilters.thematic || "RSSI"])
                }));
                const sessions = savedDriveTestFilters.sessions || [];
                dispatch(SET_ACTIVE_DRIVE_SESSIONS(sessions));
                if (sessions.length > 0) {
                    dispatch(MapActions.getDriveTestData());
                }
            }

              /* ---------------- RESTORE SITE THEMATICS ---------------- */
            const siteThematics = data.saveSiteThematics
                ? JSON.parse(data.saveSiteThematics)
                : { type: "Technology", colors: FIXED_COLORS.Technology };

            dispatch(SET_ACTIVE_SITE_THEMATIC(siteThematics));
            if (siteThematics.scale !== undefined) {
                dispatch(SET_MAP_CONFIG({ siteScale: siteThematics.scale }));
            }

            // Re-fetch site KPI data on reload if KPI thematic was saved
            if (siteThematics?.type === "KPIs") {
                const { startDateTime: kpiStart, endDateTime: kpiEnd, kpi } = siteThematics.kpiConfig || {};
                if (kpiStart && kpiEnd && kpi) {
                    dispatch(MapActions.getGisSitesKpi(kpiStart.slice(0, 10), kpiEnd.slice(0, 10), kpi));
                }
            }

            /* ---------------- RESTORE LEGENDs ---------------- */
            const legends = data.saveLayerLegends
                ? JSON.parse(data.saveLayerLegends)
                : {};
            dispatch(MapActions.setLayerLegend("SITES", legends.SITES));
            dispatch(MapActions.setLayerLegend("CELLS", legends.CELLS));
            dispatch(MapActions.setLayerLegend("BOUNDARY", legends.BOUNDARY));
            dispatch(MapActions.setLayerLegend("RF", legends.RF));
            dispatch(MapActions.setLayerLegend("DRIVE_TEST", legends.DRIVE_TEST));
            
        } catch (err) {
            console.log("setup config error", err);
        }
    },

    setViewState: (viewState) => (dispatch) => {
        dispatch(SET_VIEW_STATE(viewState))
    },

    setFilters: (filters) => (dispatch) => {
        dispatch(SET_FILTERS(filters))
    },

    setSyncEnabled: (value) => (dispatch) => {
        dispatch(SET_SYNC_ENABLED(value))
    },

    setSelectedCell: (cell) => (dispatch) => {
        dispatch(SET_SELECTED_CELL(cell))
    },

    setMapConfig: (config) => (dispatch) => {
        dispatch(SET_MAP_CONFIG(config))
    },

    clearBoundaryLayer: () => (dispatch) => {
        dispatch(CLEAR_BOUNDARY_GEOJSON());
    },

    setSelectedBoundaries: (boundaries) => (dispatch) => {
        dispatch(SET_SELECTED_BOUNDARIES(boundaries));
    },

    setHighlightedCell: (cellId) => (dispatch) => {
        dispatch(SET_HIGHLIGHTED_CELL(cellId));
    },

    setActiveThematic: (payload) => (dispatch) => {
        dispatch(SET_ACTIVE_THEMATIC(payload));
    },

    setActiveSiteThematic: (payload) => (dispatch) => { //site thematics
        dispatch(SET_ACTIVE_SITE_THEMATIC(payload));
    },

    setActiveDriveSessions: (sessions) => (dispatch) => {
        dispatch(SET_ACTIVE_DRIVE_SESSIONS(sessions));
    },

    setDriveTestFilters: (filters) => (dispatch) => {
        dispatch(SET_DRIVE_TEST_FILTERS(filters));
    },

    setRfParameter: (param) => (dispatch) => {
        dispatch(SET_MAP_CONFIG({ rfParameter: param }));
    },

    clearRfPredictionLayer: () => (dispatch) => {
        dispatch(CLEAR_RF_PREDICTION_GEOJSON());
    },
    clearRfPredictionRegion: (regionName) => (dispatch) => {
        dispatch(CLEAR_RF_PREDICTION_REGION(regionName));
    },

    setLayerOpacity: (layer, value) => (dispatch) => {
        dispatch(SET_LAYER_OPACITY({layer, value}));
    },

    resetLayerOpacity: () => (dispatch) => {
        dispatch(RESET_LAYER_OPACITY());
    },

    setLayerVisibility: (layer, value) => (dispatch) => {
        dispatch(SET_LAYER_VISIBILITY({ layer, value }));
    },

    resetLayerVisibility: () => (dispatch) => {
        dispatch(RESET_LAYER_VISIBILITY());
    },
    setRulerMode: (val) => (dispatch) => {
        dispatch(SET_RULER_MODE(val));
    },
    setRulerPoints: (points) => (dispatch) => {
        dispatch(SET_RULER_POINTS(points));
    },
    setLayerLegend: (layer, value) => (dispatch) => {
        dispatch(SET_LAYER_LEGEND({ layer, value }));
    },
    setBoundaryColors: (colors) => (dispatch) => {
        dispatch(SET_BOUNDARY_COLORS(colors));
    },
    clearBoundaryGroup: (shapegroup) => (dispatch) => {
        dispatch(CLEAR_BOUNDARY_GROUP(shapegroup));
    },

    setTaSectorData: (cellId, taData) => (dispatch) => {
        // taData = null to remove; or array of rings to add
        dispatch(SET_TA_SECTOR_DATA({ cellId, taData }));
    },

    fetchNeighbourRelations: (cellId) => async (dispatch) => {
        try {
            const url = `${Urls.neighbour_relations}?cell_name=${encodeURIComponent(cellId)}`;
            const res = await Api.get({ url, inst: 0 });

            if (res?.status === 404 || (res?.status !== 200 && !res?.data?.data?.length)) {
                dispatch(SET_NEIGHBOUR_RELATIONS({
                    cellId,
                    data: [],
                    typeCount: {},
                    hasNoData: true,
                    message: res?.data?.msg || "No neighbour relations found"
                }));
                return;
            }

            if (res?.status !== 200) return;
            dispatch(SET_NEIGHBOUR_RELATIONS({
                cellId,
                data: res.data?.data || [],
                typeCount: res.data?.typeCount || {},
                hasNoData: false
             }));
        } catch (err) {
            console.log("[NR] fetchNeighbourRelations error", err);
        }
    },

    clearNeighbourRelations: () => (dispatch) => {
        dispatch(SET_NEIGHBOUR_RELATIONS(null));
    },

    fetchTaSectors: (cellId, cellName, cellCoords, onError) => async (dispatch) => {
        try {
            const url = `${Urls.gis_ta}?cell_name=${encodeURIComponent(cellName)}`;
            const res = await Api.get({ url, inst: 0 });
            if (res?.status === 404 || (res?.status !== 200)) {
                onError?.(res?.data?.msg || "No TA data found for this cell.");
                return;
            }
            const data = res.data?.data || [];
            if (!data.length) {
                onError?.(res?.data?.msg || "No TA data found for this cell.");
                return;
            }
            dispatch(SET_TA_SECTOR_DATA({ cellId, taData: data, cellCoords }));
        } catch (err) {
            onError?.("Failed to load TA data.");
            console.log("[TA] fetchTaSectors error", err);
        }
    },

}

export default MapActions;
