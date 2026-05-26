
import React, { Suspense, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { LOADERS } from '../store/reducers/component-reducer';

function ChunkLoader() {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(LOADERS(true));
        return () => dispatch(LOADERS(false));
    }, []);
    return null;
}

function lazy(importFn) {
    const LazyComp = React.lazy(importFn);
    return function LazyWrapper(props) {
        return <Suspense fallback={<ChunkLoader />}><LazyComp {...props} /></Suspense>;
    };
}

const Home = lazy(() => import('../pages/Home'));
const Profile = lazy(() => import('../pages/Profile'));
const ComingSoon = lazy(() => import('../pages/ComingSoon'));
const CommonPowerBI = lazy(() => import('../pages/CommonPowerBI'));
const SupersetDashboard = lazy(() => import('../pages/SuperSet/SupersetDashboard'));
const DBConfig = lazy(() => import('../pages/CustomQuery/DBConfig'));
const QueryWorkbench = lazy(() => import('../pages/CustomQuery/QueryWorkbench'));
const XAlertConfigure = lazy(() => import('../pages/AlertMonitoringSystem/XAlertConfigure'));
const XAlertScheduler = lazy(() => import('../pages/AlertMonitoringSystem/XAlertScheduler'));
const ISONForm = lazy(() => import('../pages/iSON/iSonForm'));
const UserManagement = lazy(() => import('../pages/Admin/UserManagement/UserManagement'));
const RoleManagement = lazy(() => import('../pages/Admin/RoleManagement/RoleManagement'));
const NokiaToolManagementQuery = lazy(() => import('../pages/NokiaToolManagement/NokiaToolManagementQuery'));
const ProRulesQuery = lazy(() => import('../pages/ProRules/ProRulesQuery'));
const ProRulesQueryOutput = lazy(() => import('../pages/ProRules/ProRulesQueryOutput'));
const CellProRulesQueryOutput = lazy(() => import('../pages/ProRules/CellProRulesQueryOutput'));
const SiteAnalyticsProPage = lazy(() => import('../pages/DataPlusAnalytics/SiteAnalyticsProPage'));
const CellAnalyticsProPage = lazy(() => import('../pages/DataPlusAnalytics/CellAnalyticsProPage'));
const SiteProRulesOutputPage = lazy(() => import('../pages/DataPlusAnalytics/SiteProRulesOutputPage'));
const CellProRulesPage = lazy(() => import('../pages/DataPlusAnalytics/CellProRulesPage'));
const KPICheckRulesPage = lazy(() => import('../pages/DataPlusAnalytics/KPICheckRulesPage'));
const ProRulesManagementPage = lazy(() => import('../pages/DataPlusAnalytics/ProRulesManagementPage'));
const KPICounters = lazy(() => import('../pages/KPIProcessingEngine/KPICounters'));
const KPIProcess = lazy(() => import('../pages/KPIProcessingEngine/KPIProcess'));
const KPIMeasurements = lazy(() => import('../pages/KPIProcessingEngine/KPIMeasurements'));

const MapChart = lazy(() => import('../pages/MapBox/MapChart'));
const Scripting = lazy(() => import('../pages/CX_IXSupport/Scripting'));
const ParameterAudit = lazy(() => import('../pages/CX_IXSupport/ParameterAudit'));
const ScriptingPattern = lazy(() => import('../pages/CX_IXSupport/ScriptingPattern'));
const DBUpdate = lazy(() => import('../pages/CX_IXSupport/DBUpdate'));
const ScriptingPatternList = lazy(() => import('../pages/CX_IXSupport/ScriptingPatternList'));
const AuditPatternList = lazy(() => import('../pages/CX_IXSupport/AuditPatternList'));
const AuditPattern = lazy(() => import('../pages/CX_IXSupport/AuditPattern'));
const InsightsDashboardManager = lazy(() => import('../pages/Admin/InsightsDashboardManager'));
const ArcSettingManager = lazy(() => import('../pages/Admin/ArcSettingManager/ArcSettingManager'));
const DynamicInsightsDashboard = lazy(() => import('../pages/InsightsEngine/DynamicInsightsDashboard'));
const TelecomMapsPage = lazy(() => import('../pages/TelecomMapsPage'));
const TelecomMultipleMapsPage = lazy(() => import('../pages/TelecomMultipleMapsPage'));
const TicketsPage = lazy(() => import('../pages/Tickets/index'));
const GeoDrillDownPage = lazy(() => import('../pages/GeoDrillDown/GeoDrillDownPage'));
const NetworkComplaintsDashboard = lazy(() => import('../pages/NetworkComplaintsDashboard'));

export const Sidebar_content = {
    temp: [],
    GlobalUrl: [
        {
            name: "Geo Drill-Down",
            link: "/geo-drilldown",
            subMenu: [],
            component: <GeoDrillDownPage />,
        }, {
            name: "Not Found",
            link: "*",
            subMenu: [],
            component: <ComingSoon />,
        }, {
            name: "Home",
            link: "/home",
            subMenu: [],
            component: <Home />,
        }, {
            name: "Profile",
            link: "/profile",
            subMenu: [],
            component: <Profile />,
        }, {
            name: "Dashboard Fullscreen",
            link: "/Filtered-cell-dashboard/:uuid",
            subMenu: [],
            component: <SupersetDashboard />
        }, {
            name: "Map Chart",
            link: "/mapChart",
            subMenu: [],
            component: <MapChart />,
        }, {
            name: "Scripting Pattern",
            link: "/cx-ix-support/ScriptingPattern/:uid",
            subMenu: [],
            component: <ScriptingPattern />,
        }, {
            name: "Scripting Pattern Form",
            link: "/cx-ix-support/scripting-pattern-form/:uid",
            subMenu: [],
            component: <ScriptingPatternList />,
        }, {
            name: "Audit Pattern",
            link: "/cx-ix-support/AuditPattern/:uid",
            subMenu: [],
            component: <AuditPattern />,
        }, {
            name: "Audit Pattern Form",
            link: "/cx-ix-support/audit-pattern-form/:uid",
            subMenu: [],
            component: <AuditPatternList />,
        },
    ],
    all_routes: [
        {
            name: "Analytics Pro",
            link: "/analytics-pro",
            subMenu: [{
                name: "Site Analytics",
                link: "/analytics-pro/site-analytics",
                subMenu: [],
                component: <SiteAnalyticsProPage />,
            }, {
                name: "Site Pro Rules",
                link: "/analytics-pro/site-pro-rules",
                subMenu: [],
                component: <SiteProRulesOutputPage />,
            }, {
                name: "Cell Analytics",
                link: "/analytics-pro/cell-analytics",
                subMenu: [],
                component: <CellAnalyticsProPage />,
            }, {
                name: "Cell Pro Rules",
                link: "/analytics-pro/cell-pro-rules",
                subMenu: [],
                component: <CellProRulesPage />,
            }, {
                name: "KPI Check Rules",
                link: "/analytics-pro/kpi-check-rules",
                subMenu: [],
                component: <KPICheckRulesPage />,
            }, {
                name: "Pro Rules Management",
                link: "/analytics-pro/pro-rules-management",
                subMenu: [],
                component: <ProRulesManagementPage />,
            }],
        },
        {
            name: "KPI Processing Engine",
            link: "/kpi-processing-engine",
            subMenu: [{
                name: "Counters",
                link: "/kpi-processing-engine/counters",
                subMenu: [],
                component: <KPICounters />,
            }, {
                name: "KPI Process",
                link: "/kpi-processing-engine/kpi-process",
                subMenu: [],
                component: <KPIProcess />,
            }, {
                name: "Measurements",
                link: "/kpi-processing-engine/measurements",
                subMenu: [],
                component: <KPIMeasurements />,
            }],
        },
        {
            name: "Tickets",
            link: "/tickets",
            subMenu: [],
            component: <TicketsPage />,
        },
        {
            name: "Network Complaints Dashboard",
            link: "/network-complaints-dashboard",
            subMenu: [],
            component: <NetworkComplaintsDashboard />,
        },
        {
            name: "Multi-Map View",
            link: "/multi-map-view",
            subMenu: [],
            component: <TelecomMultipleMapsPage />,
        },
        {
            name: "Insights Engine",
            link: "/insights-engine",
            subMenu: [
                {
                    name: "Core Dashboards",
                    link: "/insights-engine/core-dashboard",
                    subMenu: [
                        {
                            name: "MSS Dashboard",
                            link: "/insights-engine/core-dashboard/mss",
                            subMenu: [],
                            component: <DynamicInsightsDashboard />,
                        },
                        {
                            name: "UGW Dashboard",
                            link: "/insights-engine/core-dashboard/ugw",
                            subMenu: [],
                            component: <DynamicInsightsDashboard />,
                        },
                        {
                            name: "MGW Dashboard",
                            link: "/insights-engine/core-dashboard/mgw",
                            subMenu: [],
                            component: <DynamicInsightsDashboard />,
                        },
                    ],
                },
                {
                    name: "RAN Dashboards",
                    link: "/insights-engine/ran-dashboard",
                    subMenu: [
                        {
                            name: "Worst Cells Dashboard",
                            link: "/insights-engine/ran-dashboard/worstcells",
                            subMenu: [],
                            component: <DynamicInsightsDashboard />,
                        },
                        {
                            name: "4G Dashboard",
                            link: "/insights-engine/ran-dashboard/huawei4g",
                            subMenu: [],
                            component: <DynamicInsightsDashboard />,
                        },
                        {
                            name: "5G NSA to SA Pre-Post Dashboard",
                            link: "/insights-engine/ran-dashboard/5GNSAtoSAPrePostDashboard",
                            subMenu: [],
                            component: <DynamicInsightsDashboard />,
                        },
                        {
                            name: "5G Dashboard",
                            link: "/insights-engine/ran-dashboard/huawei5g",
                            subMenu: [],
                            component: <DynamicInsightsDashboard />,
                        },
                    ],
                },
                {
                    name: "Network Dashboard",
                    link: "/insights-engine/network-dashboard",
                    subMenu: [],
                    component: <DynamicInsightsDashboard />,
                },
                {
                    name: "Parameter Audit Dashboard",
                    link: "/insights-engine/parameter-audit-dashboard",
                    subMenu: [],
                    component: <DynamicInsightsDashboard />,
                },
            ],
        },
        {
            name: "GIS Engine",
            link: "/gis-engine",
            subMenu: [],
            component: <TelecomMapsPage />,
        },
        {
            name: "Configuration Management",
            link: "/configuration-management",
            subMenu: [{
                name: "Parameter Audit",
                link: "/configuration-management/parameter-audit",
                subMenu: [],
                component: <CommonPowerBI reportId={"35d0fc8b-6ef7-4c75-85a2-59e309ea6ff2"} src={""} />,
            }, {
                name: "Neighbour Audit",
                link: "/configuration-management/neighbour-audit",
                subMenu: [],
                component: <CommonPowerBI reportId={"0a37d9e6-571d-421b-98ac-0b37945c8037"} src={"https://app.powerbi.com/reportEmbed?reportId=0a37d9e6-571d-421b-98ac-0b37945c8037&autoAuth=true&ctid=8d2d9b81-d0ec-49f4-9466-732d6e42831c"} />,
            }, {
                name: "Daily Parameter Audit",
                link: "/configuration-management/daily-parameter-audit",
                subMenu: [],
                component: <ComingSoon />,
            }],
        },
        {
            name: "iSON",
            link: "/ison",
            subMenu: [],
            component: <ISONForm />,
        },
        {
            name: "Custom Query",
            link: "/custom-query",
            subMenu: [{
                name: "DB Config",
                link: "/custom-query/db-config",
                subMenu: [],
                component: <DBConfig />,
            }, {
                name: "Query workbench",
                link: "/custom-query/workbench",
                subMenu: [],
                component: <QueryWorkbench />,
            }],
        },
        {
            name: "xAlerts",
            link: "/xalerts",
            subMenu: [{
                name: "Configure Scheduler",
                link: "/xalerts/configure-scheduler",
                subMenu: [],
                component: <XAlertConfigure />,
            }, {
                name: "Alert Scheduler",
                link: "/xalerts/alert-scheduler",
                subMenu: [],
                component: <XAlertScheduler />,
            }],
        },
        {
            name: "CX/IX Support",
            link: "/cx-ix-support",
            subMenu: [{
                name: "Scripting",
                link: "/cx-ix-support/scripting",
                subMenu: [],
                component: <Scripting />,
            }, {
                name: "Parameter Audit",
                link: "/cx-ix-support/parameteraudit",
                subMenu: [],
                component: <ParameterAudit />,
            }, {
                name: "DB Update",
                link: "/cx-ix-support/dbupdate",
                subMenu: [],
                component: <DBUpdate />,
            }],
        },
        {
            name: "Network Inventory",
            link: "/network-inventory",
            subMenu: [{
                name: "Site Database",
                link: "/network-inventory/site-database",
                subMenu: [],
                component: <ComingSoon />,
            }, {
                name: "Auto Discovery",
                link: "/network-inventory/auto-discovery",
                subMenu: [],
                component: <ComingSoon />,
            }],
        },
    ],

    Admin: [
        {
            name: "Admin",
            link: "/admin",
            subMenu: [{
                name: "User Management",
                link: "/admin/user-management",
                subMenu: [],
                component: <UserManagement />,
            }, {
                name: "Role Management",
                link: "/admin/role-management",
                subMenu: [],
                component: <RoleManagement />,
            }, {
                name: "Insights Dashboard Manager",
                link: "/admin/insights-dashboard-manager",
                subMenu: [],
                component: <InsightsDashboardManager />,
            }, {
                name: "Arc Setting Manager",
                link: "/admin/arc-setting-manager",
                subMenu: [],
                component: <ArcSettingManager />,
            }],
        },
    ]
}
