import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    ruleList: [],
    slaProfileList: [],
    escalationPolicyList: [],
}

const assurance = createSlice({
    name: "assurance",
    initialState,
    reducers: {

        RULE_LIST: (state, { payload }) => {
            state.ruleList = payload
        },

        SLA_PROFILE_LIST: (state, { payload }) => {
            state.slaProfileList = payload
        },

        ESCALATION_POLICY_LIST: (state, { payload }) => {
            state.escalationPolicyList = payload
        },

    },
})

export const { RULE_LIST, SLA_PROFILE_LIST, ESCALATION_POLICY_LIST } = assurance.actions
export default assurance.reducer
