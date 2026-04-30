import Api from "../../utils/api";
import { Urls } from "../../utils/url";
import { DASHBOARD_LIST } from "../reducers/insightsEngine-reducer";

const InsightsEngineActions = {
    getDashboardList: ({ includeInactive = false } = {}) => async (dispatch) => {
        try {
            const url = includeInactive
                ? `${Urls.insights_engine_dashboard_manager}?include_inactive=true`
                : Urls.insights_engine_dashboard_manager;
            const res = await Api.get({ url });
            if (res?.status !== 200) return;
            dispatch(DASHBOARD_LIST(res.data?.menu ?? []));
        } catch (err) {
            console.error("getDashboardList failed", err);
        }
    },

    saveDashboard: (data, id, cb) => async () => {
        try {
            let res;
            if (id) {
                const putData = { id, ...data };
                if (putData.dashboard_id  == null) delete putData.dashboard_id;
                if (putData.dashboard_uuid == null) delete putData.dashboard_uuid;
                res = await Api.put({ data: putData, url: Urls.insights_engine_dashboard_manager });
            } else {
                res = await Api.post({ data, url: Urls.insights_engine_dashboard_manager });
            }
            if (res?.status !== 200 && res?.status !== 201) return;
            cb?.(res.data?.data ?? res.data);
        } catch (err) {
            console.error("saveDashboard failed", err);
        }
    },

    deleteDashboard: (id, cb) => async () => {
        try {
            const res = await Api.delete({ data: { id }, url: Urls.insights_engine_dashboard_manager });
            if (res?.status !== 200) return;
            cb?.();
        } catch (err) {
            console.error("deleteDashboard failed", err);
        }
    },
};

export default InsightsEngineActions;
