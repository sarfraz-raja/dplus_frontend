import Api from "../../utils/api";
import { Urls } from "../../utils/url";
import { LIVE_MONITORING_LOADING, LIVE_MONITORING_SUCCESS, LIVE_MONITORING_ERROR } from "../reducers/kpiEngine-reducer";

const KpiEngineActions = {
    /** args is a pre-built query string (see objectToQueryString), e.g. "region=Lilongwe&technology=4G". */
    getLiveMonitoring: (args = "") => async (dispatch) => {
        const requestId = `${Date.now()}_${Math.random()}`;
        dispatch(LIVE_MONITORING_LOADING({ requestId }));
        try {
            const res = await Api.get({ url: `${Urls.kpiEngineLiveMonitoring}${args ? "?" + args : ""}` });
            if (!res) {
                // Api's response interceptor returns `error?.response` on failure, which is
                // undefined for network-level failures (CORS blocked, host unreachable, timeout).
                dispatch(LIVE_MONITORING_ERROR({ requestId, message: "Network error — could not reach the KPI Engine API (check connectivity/CORS)." }));
                return;
            }
            if (res.status !== 200) {
                dispatch(LIVE_MONITORING_ERROR({ requestId, message: `KPI Engine API returned status ${res.status}.` }));
                return;
            }
            // Tolerate response shapes that don't exactly match the documented
            // { status, count, data: [...] } envelope. Observed actual shape from this
            // API is double-nested: { status, data: { status, msg, columns, data: [...] } }.
            const body = res.data;
            const rows = Array.isArray(body?.data) ? body.data
                : Array.isArray(body?.data?.data) ? body.data.data
                : Array.isArray(body) ? body
                : null;
            if (!rows) {
                console.warn("[kpi-engine/live-monitoring] Unexpected response shape:", body);
                dispatch(LIVE_MONITORING_ERROR({ requestId, message: "Unexpected API response shape (see console)." }));
                return;
            }
            if (rows.length === 0) {
                dispatch(LIVE_MONITORING_ERROR({ requestId, message: null })); // renders as "No Data Found"
                return;
            }
            const count = body?.count ?? body?.data?.count ?? rows.length;
            dispatch(LIVE_MONITORING_SUCCESS({ requestId, data: rows, count }));
        } catch (error) {
            dispatch(LIVE_MONITORING_ERROR({ requestId, message: error?.message || "Failed to fetch live monitoring data" }));
        }
    },
};

export default KpiEngineActions;
