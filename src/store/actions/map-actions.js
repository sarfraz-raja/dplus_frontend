import Api from "../../utils/api"
import { Urls } from "../../utils/url"
import { SET_AUTHENTICATED, SET_COMMON_CONFIG, SET_TOKEN, SET_USER } from "../reducers/auth-reducer"
import { ALERTS } from "../reducers/component-reducer"
import { 
    // OLD TELECOM REDUCER IMPORTS
    GET_ALL_FILTER, 
    MARKER_CHART_LIST, 
    MARKER_LIST, 
    TECH_WITH_BAND,

    // NEW TELECOM REDUCER IMPORTS
    SET_RAW_CELLS,
    SET_VIEW_STATE,
    SET_FILTERS,
    SET_SYNC_ENABLED,
    SET_SELECTED_CELL,
    SET_MAP_CONFIG,
    SET_TELECOM_FILTER_META,
    SET_TELECOM_TECH_META,
     // Adding map layers as boundaries, related imports
    SET_BOUNDARY_GROUPS,
    SET_BOUNDARY_GEOJSON,
    CLEAR_BOUNDARY_GEOJSON,
    SET_HIGHLIGHTED_CELL,

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

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
    logoutCaller: (cb = () => { }) => async (dispatch, _) => {
        try {
            // console.log("CommonPostActions.postApiCaller")
            // const res = await Api.post({ url: urls, data })
            // if (res?.status !== 201 && res?.status !== 200) return

            localStorage.setItem("auth", false)
            localStorage.removeItem("token")
            localStorage.removeItem("user")

            dispatch(SET_TOKEN(""))
            dispatch(SET_USER(JSON.stringify({})))
            dispatch(SET_AUTHENTICATED(false))


            cb()


            // let msgdata = {
            //     show: true,
            //     icon: 'error',
            //     buttons: [
            //     ],
            //     text: "Your Session is Expired"
            // }
            // dispatch(ALERTS(msgdata))
        } catch (error) {
            console.log(error, "amit errorerror 37")

            // dispatch(Notify.error('something went wrong! please try again after a while'))
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

            // dispatch(Notify.error('something went wrong! please try again after a while'))
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

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
//     getMarkerChart: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
//         try {
//             console.log("CommonPostActions.postApiCaller")
//             const res = await Api.post({ url: Urls.map_getChart, data: data })
//             // let dataAll = res.data.data;
//             // ///////////////////////////////
//             // if (res?.status !== 201 && res?.status !== 200) {

//             //     let msgdata = {
//             //         show: true,
//             //         icon: res.data.icon,
//             //         buttons: [],
//             //         text: res.data.msg,
//             //         type: 1
//             //     }
//             //     dispatch(ALERTS(msgdata))
//             //     cb()
//             //     dispatch(MARKER_CHART_LIST({ parsed.data, reset }))
//             // } else {
//             //     dispatch(MARKER_CHART_LIST({ parsed.data, reset }))
//             // }

//  if (res?.status !== 200 && res?.status !== 201) {
//       dispatch(
//         ALERTS({
//           show: true,
//           icon: res?.data?.icon,
//           buttons: [],
//           text: res?.data?.msg || "Failed to fetch chart data",
//           type: 1,
//         })
//       );
//       cb();
//       return;
//     }

//     // ✅ SAFELY PARSE BACKEND RESPONSE
//     const parsedResponse =
//       typeof res.data === "string" ? JSON.parse(res.data) : res.data;

//     const dataAll = parsedResponse?.data || {};

//     // ✅ UPDATE REDUX
//     dispatch(MARKER_CHART_LIST({ dataAll, reset }));

//     cb();

//         } catch (error) {
//             console.log(error, "amit errorerror 37")
//    dispatch(
//       ALERTS({
//         show: true,
//         icon: "error",
//         buttons: [],
//         text: "Something went wrong while loading chart data",
//         type: 1,
//       })
//     );
//             // dispatch(Notify.error('something went wrong! please try again after a while'))
//         }
//     },
    ////// correction here
    
    getMarkerChart: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
        try {
            console.log("CommonPostActions.postApiCaller");

            const res = await Api.post({
            url: Urls.map_getChart,
            data: data,
            });

            if (res?.status !== 200 && res?.status !== 201) {
            let msgdata = {
                show: true,
                icon: res?.data?.icon,
                buttons: [],
                text: res?.data?.msg,
                type: 1,
            };
            dispatch(ALERTS(msgdata));
            cb();
            return;
            }

            // ✅ THIS IS THE KEY LINE — 
            dispatch(
                MARKER_CHART_LIST({
                dataAll: res.data.data,
                reset,
                })
            );

            cb();
        } catch (error) {
            console.log(error, "getMarkerChart error");
        }
    },

    postTechWithBand: (data, cb = () => {}, reset = true) => async (dispatch, _) => {
        try {
            console.log("CommonPostActions.postApiCaller")
            const res = await Api.post({ url: Urls.techwithband, data: data })
            if (res?.status !== 201 && res?.status !== 200) return
            let dataAll = res.data
            dispatch(MARKER_LIST({ dataAll, reset }))
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
    getTechWithBand: (reset = true, args = "") => async (dispatch, _) => {
        try {
            console.log("AuthActions.signin")
            const res = await Api.get({ url: `${Urls.techwithband}${args != "" ? "?" + args : ""}`, inst: 0 })
            if (res?.status !== 200) return
            console.log(res.data, "res.data")
            const dataAll = res.data.data
            dispatch(TECH_WITH_BAND({ dataAll, reset }))
        } catch (error) {
            console.log(error, "amit errorerror 37")

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
    getAllFilterList: (reset = true, args = "") => async (dispatch, _) => {
        try {
            console.log("AuthActions.signin")
            const res = await Api.get({ url: `${Urls.getAllFilterList}${args != "" ? "?" + args : ""}`, inst: 0 })
            if (res?.status !== 200) return
            console.log(res.data, "allres.data")
            const dataAll = res.data.data
            console.log(dataAll, "gggggggggsasaSsA")
            dispatch(GET_ALL_FILTER({ dataAll, reset }))
        } catch (error) {
            console.log(error, "amit errorerror 37")

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
    deleteApiCaller: (urls, cb= () => {}) => async (dispatch, _) => {
        try {
            console.log("CommonPostActions.postApiCaller")
            const res = await Api.delete({ url: urls })
            if (res?.status !== 201 && res?.status !== 200) return

            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
    commondownload: (urls, filename, method = "GET", data = {}, cb) => async (dispatch, _) => {
        // (reqUrl, data).then((response) => {

        const res = await Api.blobFile({ url: urls, method: method, data: data })

        console.log(res, "resresresres")

        filename = urls.split("/").pop()


        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}`);
        document.body.appendChild(link);
        link.click();
    },


     /* ============================================================
       NEW TELECOM MAP LOGIC
    ============================================================ */

    /**
     * Fetch Telecom Cells from Backend
     * This replaces old markerList usage for deck.gl maps
     */

    getMultiVendorCells: (filters = {}) => async (dispatch) => {

        try {
            const res = await Api.post({
                url: Urls.multiVendor,
                data:  {
                    dataValue: filters
                }
            });
            
            const apiData = res?.data?.data || [];
            // const adapted = res.data.data.map(item => ({
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

            // console.log("ADAPTED FIRST CELL:", adapted[0]);
            dispatch(SET_RAW_CELLS(adapted));

        } catch (err) {
            console.log("multiVendor error", err);
            // dispatch(SET_RAW_CELLS([]));
        }
    },

    /* ============================================================
    TELECOM FILTER METADATA (ISOLATED FROM OLD MAP)
    ============================================================ */
    getTelecomFilterMeta: () => async (dispatch) => {
    try {
        const res = await Api.get({
        url: Urls.getAllFilterList,
        inst: 0
        });

        if (res?.status !== 200) return;

        dispatch(SET_TELECOM_FILTER_META(res.data.data));

    } catch (err) {
        console.log("telecom filter meta error", err);
    }
    },

    getTelecomTechMeta: () => async (dispatch) => {
    try {
        const res = await Api.get({
        url: Urls.techwithband,
        inst: 0
        });

        if (res?.status !== 200) return;

        dispatch(SET_TELECOM_TECH_META(res.data.data));

    } catch (err) {
        console.log("telecom tech meta error", err);
    }
    },

    // Fetch boundary groups for map overlay (isolated from old map logic)
    getBoundaryGroups: () => async (dispatch) => {
    try {

        const res = await Api.get({
        url: Urls.boundary_groups,
        inst: 0
        });

        if (res?.status !== 200) return;

        const groups = res?.data?.data || [];
        dispatch(SET_BOUNDARY_GROUPS(groups));;

    } catch (err) {
        console.log("boundary groups error", err);
    }
    },

    // Fetch GeoJSON for a specific boundary group (isolated from old map logic)
    getBoundaryGeoJson: (country, level, names=[]) => async (dispatch) => {

    try {

        const query = `?country=${country}&level=${level}`;

        const res = await Api.get({
        url: `${Urls.boundaries}${query}`,
        inst: 0
        });

        if (res?.status !== 200) return;

        let geojson = res.data.data;

        // filter by shapename
        if (names.length > 0) {
        geojson.features = geojson.features.filter(
            f => names.includes(f.properties.name)
        );
        }

        dispatch(
        SET_BOUNDARY_GEOJSON(geojson)
        );

    } catch (err) {
        console.log("boundary geojson error", err);
    }
    },

    //  Update Map View State (for sync behavior)

    setViewState: (viewState) => (dispatch) => {
        dispatch(SET_VIEW_STATE(viewState))
    },

    //  Update Filters
    setFilters: (filters) => (dispatch) => {
        dispatch(SET_FILTERS(filters))
    },

    // Enable / Disable Sync
    setSyncEnabled: (value) => (dispatch) => {
        dispatch(SET_SYNC_ENABLED(value))
    },

    // Set Selected Cell (for popup/modal)
    setSelectedCell: (cell) => (dispatch) => {
        dispatch(SET_SELECTED_CELL(cell))
    },

    // Update Map Configuration (scale/style)
    setMapConfig: (config) => (dispatch) => {
        dispatch(SET_MAP_CONFIG(config))
    },

    // geojson layer related actions
    clearBoundaryLayer: () => (dispatch) => {
        dispatch(CLEAR_BOUNDARY_GEOJSON());
    },

    // search apply & zoom
    setHighlightedCell: (cellId) => (dispatch) => {
        dispatch(SET_HIGHLIGHTED_CELL(cellId));
    },

}

export default MapActions;