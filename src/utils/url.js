const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const toFlag = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};


const envBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL);
const envAssetUrl = trimTrailingSlash(import.meta.env.VITE_ASSET_BASE_URL );
const envSocketUrl = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL );

export const baseUrl = envBaseUrl;
export const baseassetUrl = envAssetUrl;
export const socketUrl = envSocketUrl;
export const isReadOnlyFrontendMode = toFlag(import.meta.env.VITE_READ_ONLY_MODE, false);
export const shouldBlockSocketEmit = toFlag(import.meta.env.VITE_BLOCK_SOCKET_EMIT, isReadOnlyFrontendMode);

/** Superset embedded dashboards: UI origin (no trailing slash) + backend URL that mints guest tokens. */
export const supersetUiOrigin = trimTrailingSlash(
    import.meta.env.VITE_SUPERSET_UI_ORIGIN 
);
export const supersetGuestTokenUrl = trimTrailingSlash(
    import.meta.env.VITE_SUPERSET_GUEST_TOKEN_URL
);
export const grafanaOrigin = trimTrailingSlash(import.meta.env.VITE_GRAFANA_URL);

export const Urls={
    login:"/login",
    logout:"/logout",
    /** Current user + role-based sidebar menu (`GET /me`). Profile save tries `PATCH /me` when supported. */
    me:"/me",
    /** Profile endpoints — GET to fetch, PATCH to update */
    profile:"/profile",
    /** Avatar upload endpoint — POST with FormData */
    uploadAvatar:"/upload-avatar",
    // removeAvatar: "/remove-avatar", // added
    setupConf:"/setupConf",
    admin_userList:"/admin/users",
    admin_roleList:"/admin/roles",
    role_menu:"/sidebar-menu",
    querybuilder_userList:"/userList",
    querybuilder_getDatabase:"/querybuilder/getDatabase",
    querybuilder_getTables:"/querybuilder/getTables",
    querybuilder_getdbo:"/querybuilder/getdbo",
    querybuilder_DBConfig:"/querybuilder/DBConfig",
    querybuilder_testDBConfig:"/querybuilder/testDBConfig",
    querybuilder_sqlQueryGenerator:"/querybuilder/sqlQueryGenerator",
    querybuilder_runQuery:"/querybuilder/runQuery",
    querybuilder_downloadQuery:"/querybuilder/downloadQuery",
    querybuilder_saveQuery:"/querybuilder/saveQuery",
    querybuilder_getSavedQuery:"/querybuilder/getSavedQuery",
    querybuilder_updateQuery:"/querybuilder/saveQuery",
    querybuilder_deleteQuery:"/querybuilder/saveQuery",
    powerBI_tokenCreator:"/powerBI/tokenCreator",
    alertConfiguration_configureAlert:"/alertConfiguration/configureAlert",
    alertConfiguration_schedulerAlert:"/alertConfiguration/schedulerAlert",
    report_scheduler: "/xalerts/report-scheduler",
    mtandaoComplaints:"/mtandaoComplaints",
    isonForm:"/isonForm",
    nokiaprepost:"/nokiaprepost",

    kpiEngineLiveMonitoring:"/kpi-engine/live-monitoring",

    // Dashboard Builder's own datasource namespace — separate from /querybuilder/*, and the
    // database itself is fixed for now (no per-datasource connection selection, see
    // dashboardBuilder-actions.js). Confirmed against the backend team's full API doc.
    dashboardBuilder_previewDatasource:"/dashboard-builder/datasources/preview",
    dashboardBuilder_datasources:"/dashboard-builder/datasources", // POST (register) / GET (list)
    // Widgets are now their own standalone, globally-reusable resource (Superset-style),
    // separate from dashboards — /widgets for the definition itself, /dashboards/{id}/widgets
    // for attaching one to a specific dashboard (a join-row concern, not the widget itself).
    dashboardBuilder_dashboards:"/dashboard-builder/dashboards", // POST (create) / GET (list)
    dashboardBuilder_widgets:"/dashboard-builder/widgets", // POST (create) / GET (list)
    // Phase 19b — NOT YET CONFIRMED with the backend team (unlike the entries above, which
    // matched the real API doc). Standalone, reusable Theme resource mirroring the Widgets
    // pattern exactly: /themes for the definition, dashboard.theme_id for binding one to a
    // dashboard (a plain field on the dashboard, not a join table, since a dashboard can only
    // bind one theme at a time — unlike widgets, which are many-per-dashboard).
    dashboardBuilder_themes:"/dashboard-builder/themes", // POST (create) / GET (list)

    proRules:"/proRules",
    proRulesOutput:"/proRulesOutput",
    cellProRulesOutput:"/cellProRulesOutput",
    cell_pro_rules: "/kpi/multi-vendor/cell-pro-rules", // added
    
    networkAnalyticsPro:"/networkAnalyticsPro",
    sitenetworkAnalyticsPro:"/sitenetworkAnalyticsPro",
    cellnetworkAnalyticsPro:"/cellnetworkAnalyticsPro",
    PrePostBulkUpload:"/BulkUpload/PrePost",
    map_getmarker:"/map/getMarker",
    map_getChart:"/map/getChart",
    techwithband:"/techwithband",
    getAllFilterList:"/allFilterList",
    uniquePhysicalId:"/uniquePhysicalId",
    uniquecellname:"/uniquecellname",
    uniquecellid:"/uniquecellid",
    map_savelatlong:"/setupConf",

    telecom_getCells: "/telecom/cells",
    gisCells: "/map/gisCells",
    gisCellsKpi: "/map/gis-cells-kpi",
    gisSitesKpi: "/map/gis-sites-kpi",
    towers: "/map/towers",
    
    boundary_groups: "/map/boundary-groups",
    boundaries: "/map/boundaries",
    drive_test: "/map/drive-test",

    rf_prediction_filters: "/map/rf-predictions/filters",
    rf_prediction_data: "/map/rf-predictions/data",

    gis_ta: "/kpi/multi-vendor/gis-ta",
    neighbour_relations: "/map/neighbour-relations",
    cell_pro_rules: "/kpi/multi-vendor/cell-pro-rules",
    site_pro_rules: "/kpi/multi-vendor/site-pro-rules",

    kpi_counters:      "/kpi-engine/counters",
    kpi_process:       "/kpi-engine/kpi-process",
    kpi_measurements:  "/kpi-engine/measurements",

    cxix_scripting:"/cxix_scripting",
    cxix_audit:"/cxix_audit",
    cxix_scripting_form:"/cxix_scripting_form",
    dbUpdate:"/cxix_scripting/dbUpdate",
    cxix_audit_form:"/cxix_audit_form",
    
    cxix_scripting_getdata:"/cxix_scripting/getdata",
    cxix_audit_getdata:"/cxix_audit/getdata",

    insights_engine_dashboard_manager: "/sidebar-menu",
    arc_setting: "/map/arc-setting",
    zoom_config: "/api-for-nitika",

    gpl_audit_ericsson:"/gpl-audit-ericsson",
    compare_ericsson:"/compare-ericsson",

}

export const WebSocketUrls={
    siteAnalytics:"siteanalytics",
    proRules:"proRules"
}
