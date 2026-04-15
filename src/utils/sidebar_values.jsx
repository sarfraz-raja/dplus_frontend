
import React, { Suspense, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { UilReact, UilChannel, UilCheckCircle, UilChartLine, UilLayerGroup } from '@iconscout/react-unicons';
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
const SiteAnalyticsPro = lazy(() => import('../pages/DataPlusAnalytics/SiteAnalyticsPro'));
const CellAnalyticsPro = lazy(() => import('../pages/DataPlusAnalytics/CellAnalyticsPro'));
const ProRulesQuery = lazy(() => import('../pages/ProRules/ProRulesQuery'));
const ProRulesQueryOutput = lazy(() => import('../pages/ProRules/ProRulesQueryOutput'));
const CellProRulesQueryOutput = lazy(() => import('../pages/ProRules/CellProRulesQueryOutput'));
const SiteAnalyticsProPage = lazy(() => import('../pages/DataPlusAnalytics/SiteAnalyticsProPage'));
const CellAnalyticsProPage = lazy(() => import('../pages/DataPlusAnalytics/CellAnalyticsProPage'));
const SiteProRulesOutputPage = lazy(() => import('../pages/DataPlusAnalytics/SiteProRulesOutputPage'));
const CellProRulesPage = lazy(() => import('../pages/DataPlusAnalytics/CellProRulesPage'));
const KPICheckRulesPage = lazy(() => import('../pages/DataPlusAnalytics/KPICheckRulesPage'));
const ProRulesManagementPage = lazy(() => import('../pages/DataPlusAnalytics/ProRulesManagementPage'));

const MapChart = lazy(() => import('../pages/MapBox/MapChart'));
const Scripting = lazy(() => import('../pages/CX_IXSupport/Scripting'));
const ParameterAudit = lazy(() => import('../pages/CX_IXSupport/ParameterAudit'));
const ScriptingPattern = lazy(() => import('../pages/CX_IXSupport/ScriptingPattern'));
const DBUpdate = lazy(() => import('../pages/CX_IXSupport/DBUpdate'));
const ScriptingPatternList = lazy(() => import('../pages/CX_IXSupport/ScriptingPatternList'));
const AuditPatternList = lazy(() => import('../pages/CX_IXSupport/AuditPatternList'));
const AuditPattern = lazy(() => import('../pages/CX_IXSupport/AuditPattern'));
const NetworkDashboard = lazy(() => import('../pages/InsightsEngine/NetworkDashboard'));
const ParameterAuditDashboard = lazy(() => import('../pages/InsightsEngine/ParameterAuditDashboard'));
const MssDashboard = lazy(() => import('../pages/InsightsEngine/CoreDashboards/MssDashboard'));
const UgwDashboard = lazy(() => import('../pages/InsightsEngine/CoreDashboards/UgwDashboard'));
const MgwDashboard = lazy(() => import('../pages/InsightsEngine/CoreDashboards/MgwDashboard'));
const WorstCellsDashboard = lazy(() => import('../pages/InsightsEngine/RanDashboards/WorstCellsDashboard'));
const Huawei4GDashboard = lazy(() => import('../pages/InsightsEngine/RanDashboards/Huawei4GDashboard'));
const Huawei5GDashboard = lazy(() => import('../pages/InsightsEngine/RanDashboards/Huawei5GDashboard'));
const NSAtoSA5GPrePostDashboard = lazy(() => import('../pages/InsightsEngine/RanDashboards/NSAtoSA5GPrePostDashboard'));
const TelecomMapsPage = lazy(() => import('../pages/TelecomMapsPage'));
const TelecomMultipleMapsPage = lazy(() => import('../pages/TelecomMultipleMapsPage'));
const TicketsPage = lazy(() => import('../pages/Tickets/index'));

export const Sidebar_content = {
    temp: [],
    GlobalUrl: [
        {
            name: "Not Found",
            link: "*",
            subMenu: [],
            component: <>Coming Soon.</>,
        },{
            name: "Home",
            link: "/home",
            subMenu: [],
            component: <Home/>,
        },
        {
            name: "Profile",
            link: "/profile",
            subMenu: [],
            component: <Profile/>,
        },
        {
           name: "Dashboard Fullscreen",
            link: "/Filtered-cell-dashboard/:uuid",
            subMenu: [],
            component: <SupersetDashboard />
        },
        {
            name: "Map Chart",
            link: "/mapChart",
            subMenu: [],
            component: <MapChart/>,
            
        },
        {
            name: "Scripting Pattern",
            link: "/cx-ix-support/ScriptingPattern/:uid",
            subMenu: [],
            component: <ScriptingPattern/>,
            
        },
        {
            name: "Scripting Pattern Form",
            link: "/cx-ix-support/scripting-pattern-form/:uid",
            subMenu: [],
            component: <ScriptingPatternList/>,
            
        },
        {
            name: "Audit Pattern",
            link: "/cx-ix-support/AuditPattern/:uid",
            subMenu: [],
            component: <AuditPattern/>,
            
        },
        {
            name: "Audit Pattern Form",
            link: "/cx-ix-support/audit-pattern-form/:uid",
            subMenu: [],
            component: <AuditPatternList/>,
            
        },

        
    ],
    all_routes: [
        // {
        //     name: "Topology Layer",
        //     link: "/topology-layer",
        //     icon: <UilReact />,
        //     subMenu: [],
        //     component: <ComingSoon />,
        // },
        // {
        //     name: "Layer View",
        //     link: "/layer-view",
        //     icon: <UilReact />,
        //     subMenu: [{
        //         name: "Site Layer",
        //         link: "/layer-view/site-layer",
        //         subMenu: [],
        //         component: <LaverView />,
        //         icon: <UilChannel size="16" />
        //     },
        //     {
        //         name: "Carrier Layer",
        //         link: "/layer-view/carrier-layer",
        //         subMenu: [],
        //         component: <MapView />,
        //         icon: <UilChannel size="16" />
        //     },
        //     {
        //         name: "Cell Layer",
        //         link: "/map-box/carrier-layer",
        //         subMenu: [],
        //         component: <MapBoxView />,
        //         icon: <UilChannel size="16" />
        //     }],

        // },
        {
            name: "Analytics Pro",
            link: "/analytics-pro",
            subMenu: [{
                name: "Site Analytics",
                link: "/analytics-pro/site-analytics",
                subMenu: [],
                component: <SiteAnalyticsProPage />,
                icon:     <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-5 h-5 text-white"
                                fill="currentColor"
                                >
                                {/* Antenna dot */}
                                <circle cx="12" cy="10" r="1.6" /> 

                                {/* Antenna mast */}
                                <path d="M11 12h2l1.6 8h-5.2L11 12z" /> 

                                {/* Signal waves */}
                                <path d="M7.8 9.5a5 5 0 0 0 0 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M5.5 8a8 8 0 0 0 0 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M16.2 9.5a5 5 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M18.5 8a8 8 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg> 
            },{
                name: "Site Pro Rules",
                link: "/analytics-pro/site-pro-rules",
                subMenu: [],
                component: <SiteProRulesOutputPage />,
                icon: <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        >
                        {/* Antenna dot */}
                        <circle cx="12" cy="10" r="1.6" /> 

                        {/* Antenna mast */}
                        <path d="M11 12h2l1.6 8h-5.2L11 12z" />

                        {/* Signal waves */}
                        <path d="M7.8 9.5a5 5 0 0 0 0 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M5.5 8a8 8 0 0 0 0 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M16.2 9.5a5 5 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M18.5 8a8 8 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />

                            {/* + badge */}
                            <path
                            d="M20.2 2v4.2M18.2 4.1h4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            />
                    </svg> 
            },{
                name: "Cell Analytics",
                link: "/analytics-pro/cell-analytics",
                subMenu: [],
                component: <CellAnalyticsProPage />,
                icon: <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-5 h-5 text-white"
                        >
                        {/* Outlined signal fan */}
                        <path
                            d="M12 6C8.6 6 5.4 7.5 3 9.9L12 19l9-9.1C18.6 7.5 15.4 6 12 6Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </svg>
            },{
                name: "Cell Pro Rules",
                link: "/analytics-pro/cell-pro-rules",
                subMenu: [],
                component: <CellProRulesPage />,
                icon: <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-5 h-5 text-white"
                        >
                        {/* Outlined cell sector (pie) */}
                        <path
                            d="M12 6C8.6 6 5.4 7.5 3 9.9L12 19l9-9.1C18.6 7.5 15.4 6 12 6Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />

                        {/* + icon — right & up */}
                        <path
                            d="M20.2 2v4.2M18.2 4.1h4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
            },{
                name: "KPI Check Rules",
                link: "/analytics-pro/kpi-check-rules",
                subMenu: [],
                component: <KPICheckRulesPage />,
            },{
                name: "Pro Rules Management",
                link: "/analytics-pro/pro-rules-management",
                subMenu: [],
                component: <ProRulesManagementPage />,
            }],
        },
        {
            name: "Tickets",
            link: "/tickets",
            component: <TicketsPage />,
            subMenu: [],
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
            icon: <UilReact />,
            subMenu: [
            //     {
            //     name: "RAN Dashboard",
            //     link: "/insights-engine/ran-dashboard",
            //     subMenu: [],
            //     component: <CommonPowerBI reportId={"971a078b-5783-41e8-a676-fd154fe0e597"} src={"https://app.powerbi.com/reportEmbed?reportId=971a078b-5783-41e8-a676-fd154fe0e597&autoAuth=true&ctid=8d2d9b81-d0ec-49f4-9466-732d6e42831c"} />,
            //     icon: <UilChannel size="16" />
            // }, 
            // {
            //     name: "Access Dashboard",
            //     link: "/insights-engine/access-dashboard",
            //     subMenu: [],
            //     component: <CommonPowerBI reportId={"971a078b-5783-41e8-a676-fd154fe0e597"} src={"https://app.powerbi.com/reportEmbed?reportId=971a078b-5783-41e8-a676-fd154fe0e597&autoAuth=true&ctid=8d2d9b81-d0ec-49f4-9466-732d6e42831c"} />,
            //     icon: <UilChannel size="16" />
            // }, 
            {
                name: "Core Dashboards",
                link: "/insights-engine/core-dashboard",
                subMenu: [
                    {
                        name: "MSS Dashboard",
                        link: "/insights-engine/core-dashboard/mss",
                        subMenu: [],
                        component:  <MssDashboard /> ,
                        icon: <UilChartLine size="16" />
                    }, 
                     {
                        name: "UGW Dashboard",
                        link: "/insights-engine/core-dashboard/ugw",
                        subMenu: [],
                        component:  <UgwDashboard /> ,
                        icon: <UilChartLine size="16" />
                    }, 
                     {
                        name: "MGW Dashboard",
                        link: "/insights-engine/core-dashboard/mgw",
                        subMenu: [],
                        component:  <MgwDashboard /> ,
                        icon: <UilChartLine size="16" />
                    }, 
                ],
                // component:  ,
                icon: <UilLayerGroup size="16" />
            }, 
            {
                name: "RAN Dashboards",
                link: "/insights-engine/ran-dashboard",
                 subMenu: [
                    {
                        name: "Worst Cells Dashboard",
                        link: "/insights-engine/ran-dashboard/worstcells",
                        subMenu: [],
                        component:  <WorstCellsDashboard/>,
                        icon: <UilChartLine size="16" />
                    }, 
                    {
                        name: "4G Dashboard",
                        link: "/insights-engine/ran-dashboard/huawei4g",
                        subMenu: [],
                        component:  <Huawei4GDashboard/>,
                        icon: <UilChartLine size="16" />
                    }, 
                     {
                        name: "5G NSA to SA Pre-Post Dashboard",
                        link: "/insights-engine/ran-dashboard/5GNSAtoSAPrePostDashboard",
                        subMenu: [],
                        component:  <NSAtoSA5GPrePostDashboard/>,
                        icon: <UilChartLine size="16" />
                    }, 
                                         {
                        name: "5G Dashboard",
                        link: "/insights-engine/ran-dashboard/huawei5g",
                        subMenu: [],
                        component:  <Huawei5GDashboard/>,
                        icon: <UilChartLine size="16" />
                    }, 
                ],
                icon: <UilLayerGroup size="16" />
            },
            {
                name: "Network Dashboard",
                link: "/insights-engine/network-dashboard",
                subMenu: [],
                component:  <NetworkDashboard /> ,
                icon: <UilChartLine size="16" />
            },
             {
                name: "Parameter Audit Dashboard",
                link: "/insights-engine/parameter-audit-dashboard",
                subMenu: [],
                component:  <ParameterAuditDashboard /> ,
                icon: <UilChartLine size="16" />
            },
            // {
            //     name: "Map Testing",
            //     link: "/insights-engine/map-testing",
            //     subMenu: [],
            //     component:  <MapTesting /> ,
            //     icon: <UilChartLine size="16" />
            // },
             // {
            //     name: "Security Dashboard",
            //     link: "/insights-engine/security-dashboard",
            //     subMenu: [],
            //     component: <CommonPowerBI reportId={"971a078b-5783-41e8-a676-fd154fe0e597"} src={"https://app.powerbi.com/reportEmbed?reportId=971a078b-5783-41e8-a676-fd154fe0e597&autoAuth=true&ctid=8d2d9b81-d0ec-49f4-9466-732d6e42831c"} />,
            //     icon: <UilChannel size="16" />
            // },
        ]
        },
        // {
        //     name: "Reporting Suite",
        //     link: "/reporting-suite",
        //     icon: <UilReact />,
        //     subMenu: [{
        //         name: "Customized Report",
        //         link: "/reporting-suite/report-customization",
        //         subMenu: [],
        //         component: <ComingSoon />,
        //         icon: <UilChannel size="16" />
        //     }, {
        //         name: "Repository",
        //         link: "/reporting-suite/repository",
        //         subMenu: [],
        //         component: <ComingSoon />,
        //         icon: <UilChannel size="16" />
        //     },
        // ],
        // },
        {
            name: "GIS Engine",
            link: "/gis-engine",
            subMenu: [],
            component: <TelecomMapsPage />,
        },
        {
            name: "Configuration Management",
            link: "/configuration-management",
            icon: <UilReact />,
            subMenu: [{
                name: "Parameter Audit",
                link: "/configuration-management/parameter-audit",
                subMenu: [],
                component: <CommonPowerBI reportId={"35d0fc8b-6ef7-4c75-85a2-59e309ea6ff2"} src={""} />,
                icon: <UilChannel size="16" />
            }, {
                name: "Neighbour Audit",
                link: "/configuration-management/neighbour-audit",
                subMenu: [],
                component: <CommonPowerBI reportId={"0a37d9e6-571d-421b-98ac-0b37945c8037"} src={"https://app.powerbi.com/reportEmbed?reportId=0a37d9e6-571d-421b-98ac-0b37945c8037&autoAuth=true&ctid=8d2d9b81-d0ec-49f4-9466-732d6e42831c"} />,
                icon: <UilChannel size="16" />
            },
            // {
            //     name: "CM",
            //     link: "/configuration-management/cm",
            //     subMenu: [],
            //     icon: <UilChannel size="16" />
            // }, 
            {
                name: "Daily Parameter Audit",
                link: "/configuration-management/daily-parameter-audit",
                subMenu: [],
                component: <ComingSoon />,
                icon: <UilChannel size="16" />
            }],
        },{
            name: "iSON",
            link: "/ison",
            subMenu: [],
            component: <ISONForm />,
            icon: <UilReact />,
        },  {
            name: "Custom Query",
            link: "/custom-query",
            icon: <UilReact />,
            subMenu: [{
                name: "DB Config",
                link: "/custom-query/db-config",
                subMenu: [],
                component: <DBConfig />,
                icon: <UilChannel size="16" />
            }, 
            {
                name: "Query workbench",
                link: "/custom-query/workbench",
                subMenu: [],
                component: <QueryWorkbench />,
                // component: <AdvancedQueryBuilderComponent />,
                icon: <UilChannel size="16" />
            }, 
            // {
            //     name: "Run Query",
            //     link: "/custom-query/run-query",
            //     subMenu: [],
            //     component: <RunQuery />,
            //     icon: <UilChannel size="16" />
            // }, 
            // {
                //     name: "Query Builder",
                //     link: "/custom-query/query-builder",
                //     subMenu: [],
                //     component:<QueryBuilderComponent />,
                //     icon: <UilChannel size="16" />
            // },
            // {
            //     name: "Save Query",
            //     link: "/custom-query/save-query",
            //     subMenu: [],
            //     component: <AdvancedQueryBuilderComponent />,
            //     icon: <UilChannel size="16" />
            // }, 
            // {
            //     name: "Saved Query List",
            //     link: "/custom-query/saved-query-list",
            //     subMenu: [],
            //     component: <SavedQueries />,
            //     icon: <UilChannel size="16" />
            // },
        ],
        },
        {
            name: "xAlerts",
            link: "/xalerts",
            subMenu: [{
                name: "Configure Scheduler",
                link: "/xalerts/configure-scheduler",
                subMenu: [],
                // component: <AlertConfigure />,
                component: <XAlertConfigure />,
                icon: <UilChannel size="16" />
            }, {
                name: "Alert Scheduler",
                link: "/xalerts/alert-scheduler",
                subMenu: [],
                component: <XAlertScheduler />,
                // component: <AlertScheduler />,
                icon: <UilChannel size="16" />
            }

                // {
                //     name: "CM",
                //     link: "/configuration-management/cm",
                //     subMenu: [],
                //     icon: <UilChannel size="16" />
                // },
            ],
        },{
            name: "CX/IX Support",
            link: "/cx-ix-support",
            icon: <UilReact />,
            subMenu: [{
                name: "Scripting",
                link: "/cx-ix-support/scripting",
                subMenu: [],
                component: <Scripting />,
                icon: <UilChannel size="16" />
            }, {
                name: "Parameter Audit",
                link: "/cx-ix-support/parameteraudit",
                subMenu: [],
                component: <ParameterAudit />,
                icon: <UilChannel size="16" />
            }, {
                name: "DB Update",
                link: "/cx-ix-support/dbupdate",
                subMenu: [],
                component: <DBUpdate />,
                icon: <UilChannel size="16" />
            }],
        },
        // {
        //     name: "Network Complaints",
        //     link: "/network-complaints/view-network-complaints",
        //     subMenu: [],
        //     component: <ViewMtandaoComplaints />,
        //     icon: <UilReact />,
        // },
        


        // {

        // }
        
        // {
        //     name: "Fault Management",
        //     link: "/fault-management",
        //     icon: <UilReact />,
        //     subMenu: [],
        //     component: <ComingSoon />,
        // },
        // {
        //     name: "Capacity Management",
        //     link: "/capacity-management",
        //     icon: <UilReact />,
        //     subMenu: [{
        //         name: "Resource Utilization",
        //         link: "/capacity-management/resource-utilization",
        //         subMenu: [],
        //         component: <ComingSoon />,
        //         icon: <UilChannel size="16" />
        //     }],
        // },
        // {
        //     name: "Revenue Assurance",
        //     link: "/revenue-assurance",
        //     icon: <UilReact />,
        //     subMenu: [],
        //     component: <ComingSoon />,
        // },
        //     name: "DataPlus Analytics Pro",
        //     link: "/network-analytics",
        //     icon: <UilReact />,
        //     subMenu: [{
        //         name: "Pre Post Comparison",
        //         link: "/network-analytics/pre-post-comparison",
        //         subMenu: [],
        //         component: <DataPlusAnalytics />,
        //         icon: <UilChannel size="16" />
        //     }],
        // }, {
           
        // {
        //     name: "Work Force Management",
        //     link: "/work-force-management",
        //     icon: <UilReact />,
        //     subMenu: [{
        //         name: "Auto TT Dispatch",
        //         link: "/work-force-management/auto-tt-dispatch",
        //         subMenu: [],
        //         component: <ComingSoon />,
        //         icon: <UilChannel size="16" />
        //     }],
        // },
        // {
        //     name: "Change Management",
        //     link: "/change-management",
        //     icon: <UilReact />,
        //     subMenu: [{
        //         name: "Plan Work Order",
        //         link: "/change-management/plan-work-order",
        //         subMenu: [],
        //         component: <ComingSoon />,
        //         icon: <UilChannel size="16" />
        //     }],
        // },
        // {
        //     name: "Testing",
        //     link: "/testing",
        //     icon: <UilReact />,
        //     subMenu: [{
        //         name: "Table",
        //         link: "/testing/table",
        //         subMenu: [],
        //         component: <TestTable></TestTable>,
        //         icon: <UilChannel size="16" />
        //     }],
        // },
        {
            name: "Network Inventory",
            link: "/network-inventory",
            icon: <UilReact />,
            subMenu: [{
                name: "Site Database",
                link: "/network-inventory/site-database",
                subMenu: [],
                component: <ComingSoon />,
                icon: <UilChannel size="16" />
            }, {
                name: "Auto Discovery",
                link: "/network-inventory/auto-discovery",
                subMenu: [],
                component: <ComingSoon />,
                icon: <UilChannel size="16" />
            }],
        },
        // {
        //     name: "Nokia Tool Management Query",
        //     link: "/nokia-tool-management-query",
        //     component: <NokiaToolManagementQuery/>,
        //     icon: <UilReact />,
        //     subMenu: [],
        // },
        // {
        //     name: "Map Settings",
        //     link: "/selectSettings",
        //     icon: <UilReact />,
        //     subMenu: [],
        //     component:<SettingConfigForm />
        // },
        ],

    Admin:[
        {
            name: "Admin",
            link: "/admin",
            subMenu: [{
                name: "User Management",
                link: "/admin/user-management",
                subMenu: [],
                component: <UserManagement />,
                icon: <UilChannel size="16" />
            }, {
                name: "Role Management",
                link: "/admin/role-management",
                subMenu: [],
                component: <RoleManagement />,
                icon: <UilChannel size="16" />
            }],
            icon: <UilReact />,
        },
    ]
}