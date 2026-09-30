import Api from "../../utils/api"
import { Urls } from "../../utils/url"
import { getApiErrorMessage } from "../../utils/common"
import { RULE_LIST, SLA_PROFILE_LIST, ESCALATION_POLICY_LIST } from "../reducers/assurance-reducer"

// Intelligent Telecom Assurance module — assurance_blueprint.py.
// Built up one step/one API at a time alongside the new Rule Builder wizard
// (see src/pages/Assurance/AssuranceRuleForm.jsx) — more thunks (createRule,
// getRule, updateRule, toggleRuleStatus) are added as each wizard step/screen
// is wired, not scaffolded ahead of time.

const AssuranceActions = {

    listRules: (args = "") => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.assurance_rules}${args !== "" ? "?" + args : ""}` })
            if (res?.status !== 200) return
            dispatch(RULE_LIST(res.data.data ?? []))
        } catch (error) {
            console.log(error, "AssuranceActions.listRules error")
        }
    },

    // Step 4 (Ticket Generation) dropdowns — both endpoints return every
    // profile/policy regardless of `enabled`, so we filter to enabled=true
    // client-side where these are consumed (per the API doc's own guidance).
    listSlaProfiles: () => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: Urls.assurance_slaProfiles })
            if (res?.status !== 200) return
            dispatch(SLA_PROFILE_LIST(res.data.data ?? []))
        } catch (error) {
            console.log(error, "AssuranceActions.listSlaProfiles error")
        }
    },

    listEscalationPolicies: () => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: Urls.assurance_escalationPolicies })
            if (res?.status !== 200) return
            dispatch(ESCALATION_POLICY_LIST(res.data.data ?? []))
        } catch (error) {
            console.log(error, "AssuranceActions.listEscalationPolicies error")
        }
    },

    // Step 8 submit. Api.post never rejects on an HTTP error status (its
    // interceptor resolves error responses instead of throwing — see
    // src/utils/api.js) so failure is read from res.status/res.data.msg,
    // not a catch block. validate_rule_payload stops at the FIRST error and
    // returns only one message per request (per the API doc) — onError
    // receives that single msg string as-is, for direct display.
    createRule: (data, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.post({ url: Urls.assurance_rules, data })
            if (res?.status === 201) {
                onSuccess && onSuccess(res.data?.data)
                return
            }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.createRule error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    // View/Edit prefill — GET /assurance-rules/<id>. 404 → onError so the
    // caller can redirect back to the list, per the API doc's guidance.
    getRule: (id, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.assurance_rules}/${id}` })
            if (res?.status === 200) {
                onSuccess && onSuccess(res.data?.data)
                return
            }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.getRule error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    // Edit save — PUT /assurance-rules/<id>. Full replace, not a partial
    // patch, same payload shape as createRule (per the API doc).
    updateRule: (id, data, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.put({ url: `${Urls.assurance_rules}/${id}`, data })
            if (res?.status === 200) {
                onSuccess && onSuccess(res.data?.data)
                return
            }
            onError && onError(getApiErrorMessage(res), res?.status)
        } catch (error) {
            console.log(error, "AssuranceActions.updateRule error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    // Enable/Disable toggle — PATCH /assurance-rules/<id>/status. Disabling
    // also suppresses every currently non-CLEARED alarm on this rule
    // server-side, with no reverse API — the caller must confirm before
    // calling this with enabled:false (see AssuranceRuleList.jsx).
    toggleRuleStatus: (id, enabled, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.patch({ url: `${Urls.assurance_rules}/${id}/status`, data: { enabled } })
            if (res?.status === 200) {
                onSuccess && onSuccess(res.data?.data)
                return
            }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.toggleRuleStatus error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    // Delete — DELETE /assurance-rules/<id>. Soft delete: the rule disappears from list/detail and
    // stops being evaluated; it is also force-disabled and its non-CLEARED alarms suppressed. Its
    // history (alarms/tickets) stays in the DB. 404 also means "already deleted". Callers must
    // confirm first, then drop it from the list / leave its detail screen.
    deleteRule: (id, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.delete({ url: `${Urls.assurance_rules}/${id}` })
            if (res?.status === 200) {
                onSuccess && onSuccess()
                return
            }
            onError && onError(getApiErrorMessage(res), res?.status)
        } catch (error) {
            if (import.meta.env.DEV) console.warn("[assurance] deleteRule failed", error)
            onError && onError('Something went wrong, please retry.')
        }
    },

    // ── SLA Profile CRUD (Admin > SLA Profiles screen) ─────────────────────
    // `enabled` has no DB default and must always be sent explicitly (per the
    // API doc) — both create/update forms default it to true, never omit it.
    createSlaProfile: (data, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.post({ url: Urls.assurance_slaProfiles, data })
            if (res?.status === 201) { onSuccess && onSuccess(res.data?.data); return }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.createSlaProfile error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    getSlaProfile: (id, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.assurance_slaProfiles}/${id}` })
            if (res?.status === 200) { onSuccess && onSuccess(res.data?.data); return }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.getSlaProfile error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    // Full replace — same shape as create. Does NOT retroactively affect
    // tickets already created/reopened (they keep their sla_snapshot).
    updateSlaProfile: (id, data, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.patch({ url: `${Urls.assurance_slaProfiles}/${id}`, data })
            if (res?.status === 200) { onSuccess && onSuccess(res.data?.data); return }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.updateSlaProfile error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    // ── Escalation Policy CRUD (Admin > Escalation Policies screen) ────────
    createEscalationPolicy: (data, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.post({ url: Urls.assurance_escalationPolicies, data })
            if (res?.status === 201) { onSuccess && onSuccess(res.data?.data); return }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.createEscalationPolicy error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    getEscalationPolicy: (id, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.assurance_escalationPolicies}/${id}` })
            if (res?.status === 200) { onSuccess && onSuccess(res.data?.data); return }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.getEscalationPolicy error")
            onError && onError('Something went wrong, please retry.')
        }
    },

    // Full replace, including the complete `levels[]` array — does NOT
    // retroactively affect tickets already created/reopened (escalation_snapshot).
    updateEscalationPolicy: (id, data, onSuccess, onError) => async (dispatch, _) => {
        try {
            const res = await Api.patch({ url: `${Urls.assurance_escalationPolicies}/${id}`, data })
            if (res?.status === 200) { onSuccess && onSuccess(res.data?.data); return }
            onError && onError(getApiErrorMessage(res))
        } catch (error) {
            console.log(error, "AssuranceActions.updateEscalationPolicy error")
            onError && onError('Something went wrong, please retry.')
        }
    },

}

export default AssuranceActions;
