import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    liveMonitoring: [],
    liveMonitoringCount: 0,
    liveMonitoringLoading: false,
    liveMonitoringError: null,
    /** Guards against out-of-order responses when multiple fetches (e.g. rapid filter changes) overlap. */
    latestRequestId: null,
};

const kpiEngine = createSlice({
    name: "kpiEngine",
    initialState,
    reducers: {
        LIVE_MONITORING_LOADING: (state, { payload }) => {
            state.liveMonitoringLoading = true;
            state.liveMonitoringError = null;
            state.latestRequestId = payload.requestId;
        },
        LIVE_MONITORING_SUCCESS: (state, { payload }) => {
            if (payload.requestId !== state.latestRequestId) return; // stale response, ignore
            state.liveMonitoring = payload.data;
            state.liveMonitoringCount = payload.count;
            state.liveMonitoringLoading = false;
            state.liveMonitoringError = null;
        },
        LIVE_MONITORING_ERROR: (state, { payload }) => {
            if (payload.requestId !== state.latestRequestId) return; // stale response, ignore
            state.liveMonitoring = [];
            state.liveMonitoringCount = 0;
            state.liveMonitoringLoading = false;
            // `null` is intentional (empty result → renders as "No Data Found"), only
            // fall back to a generic message when the caller didn't pass one at all.
            state.liveMonitoringError = payload.message === undefined ? "Something went wrong" : payload.message;
        },
    },
});

export const { LIVE_MONITORING_LOADING, LIVE_MONITORING_SUCCESS, LIVE_MONITORING_ERROR } = kpiEngine.actions;
export default kpiEngine.reducer;
