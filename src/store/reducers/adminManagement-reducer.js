import { createSlice } from "@reduxjs/toolkit";

export const ZOOM_CONFIG_DEFAULTS = {
    sectorVisibilityZoom: 9,
    markerHideZoom: 12,
};

const initialState = {
    roleList: [],
    usersList: [],
    arcSettingList: [],
    zoomConfig: { ...ZOOM_CONFIG_DEFAULTS },
}

const adminManagement = createSlice({
    name: "adminManagement",
    initialState,
    reducers: {
        ROLE_LIST: (state, { payload }) => {
            if(payload.reset){
                state.roleList = payload.dataAll
            }else{
                state.roleList = [...state.roleList, ...payload.dataAll];
            }
        },

        USERS_LIST: (state, { payload }) => {
            if(payload.reset){
                state.usersList = payload.dataAll
            }else{
                state.usersList = [...state.usersList, ...payload.dataAll];
            }
        },

        REMOVE_USER: (state, { payload }) => {
            state.usersList = state.usersList.filter((u) => u.id !== payload);
        },

        ARC_SETTING_LIST: (state, { payload }) => {
            state.arcSettingList = payload;
        },

        SET_ZOOM_CONFIG: (state, { payload }) => {
            state.zoomConfig = { ...ZOOM_CONFIG_DEFAULTS, ...payload };
        },

        RESET_STATE: (state) => {
            state.roleList = [];
            state.usersList = {};
            generatedSqlQuery:{}
        }
    }
})

export const { ROLE_LIST, USERS_LIST, REMOVE_USER, ARC_SETTING_LIST, SET_ZOOM_CONFIG, RESET_STATE } = adminManagement.actions
export default adminManagement.reducer
