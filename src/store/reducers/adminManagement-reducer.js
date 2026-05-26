import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    roleList: [],
    usersList: [],
    arcSettingList: [],
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

        RESET_STATE: (state) => {
            state.roleList = [];
            state.usersList = {};
            generatedSqlQuery:{}
        }
    }
})

export const { ROLE_LIST, USERS_LIST, REMOVE_USER, ARC_SETTING_LIST, RESET_STATE } = adminManagement.actions
export default adminManagement.reducer
