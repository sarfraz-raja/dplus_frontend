import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    dashboardList: [],
};

const insightsEngine = createSlice({
    name: "insightsEngine",
    initialState,
    reducers: {
        DASHBOARD_LIST: (state, { payload }) => {
            state.dashboardList = payload;
        },
        RESET_STATE: (state) => {
            state.dashboardList = [];
        },
    },
});

export const { DASHBOARD_LIST, RESET_STATE } = insightsEngine.actions;
export default insightsEngine.reducer;
