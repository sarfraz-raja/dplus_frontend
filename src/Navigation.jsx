
import { useSelector } from 'react-redux';
import { Sidebar_content } from './utils/sidebar_values';
import { meMenuToSidebarItems } from './utils/meMenuToSidebar';
import { buildInsightsRootTree, INSIGHTS_ROOT_ROUTE } from './utils/insightsMenu';
import { Route, Routes } from 'react-router-dom';
import Layout from './pages/Layout';
import Profile from './pages/Profile';
import DynamicInsightsDashboard from './pages/InsightsEngine/DynamicInsightsDashboard';

// ─── Maps built once at module load from sidebar_values ──────────────────────

/** route → component  (used to look up what to render for a given path) */
const buildRouteToComponentMap = (items, map = {}) => {
    for (const item of (items || [])) {
        if (item.link && item.component) map[item.link] = item.component;
        if (Array.isArray(item.subMenu)) buildRouteToComponentMap(item.subMenu, map);
    }
    return map;
};

/** name → link  (mirrors overrideRoutes in Sidebar.jsx — resolves API titles to correct paths) */
const buildNameToLinkMap = (items, map = {}) => {
    for (const item of (items || [])) {
        if (item.name && item.link) map[item.name] = item.link;
        if (Array.isArray(item.subMenu)) buildNameToLinkMap(item.subMenu, map);
    }
    return map;
};

const ROUTE_TO_COMPONENT = buildRouteToComponentMap([
    ...(Sidebar_content.all_routes || []),
    ...(Sidebar_content.Admin || []),
    ...(Sidebar_content.GlobalUrl || []),
]);

const NAME_TO_LINK = buildNameToLinkMap([
    ...(Sidebar_content.all_routes || []),
    ...(Sidebar_content.Admin || []),
    ...(Sidebar_content.GlobalUrl || []),
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Override raw API routes with the correct sidebar_values routes (matched by title).
 * Mirrors the same logic in Sidebar.jsx so navigation and routes stay in sync.
 */
const resolveApiItems = (items) =>
    (items || []).map((item) => ({
        ...item,
        route: NAME_TO_LINK[item.title] || item.route,
        children: Array.isArray(item.children) ? resolveApiItems(item.children) : [],
    }));

/** Collect every route from a (possibly nested) sidebar item tree. */
const flattenRoutes = (items) => {
    const routes = [];
    for (const item of (items || [])) {
        if (item.route) routes.push(item.route);
        if (Array.isArray(item.children) && item.children.length > 0) {
            routes.push(...flattenRoutes(item.children));
        }
    }
    return routes;
};

const flattenDashboardRoutes = (items) => {
    const routes = [];
    for (const item of (items || [])) {
        if (item.route && item.route !== INSIGHTS_ROOT_ROUTE) routes.push(item.route);
        if (Array.isArray(item.children) && item.children.length > 0) {
            routes.push(...flattenDashboardRoutes(item.children));
        }
    }
    return routes;
};

const safeParse = (raw) => {
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
};

// ─── Component ───────────────────────────────────────────────────────────────

const Navigation = ({ sidebarOpen, sidebarPos, setSidebarPos }) => {
    const apiMenuRaw = useSelector((state) => state.auth.sidebarMenu);
    const insightsMenuRaw = useSelector((state) => state.insightsEngine.dashboardList);
    const authUser   = useSelector((state) => state.auth.user);

    const rolename = (safeParse(authUser) ?? safeParse(localStorage.getItem('user')))?.rolename;
    const isAdmin  = rolename?.toLowerCase() === 'admin';

    // Routes to register in React Router
    let contentRoutes;   // [{link, component, subMenu:[]}]
    const dynamicInsightsRoot = buildInsightsRootTree(insightsMenuRaw, { rolename });
    const dynamicInsightsRoutes = [...new Set(flattenDashboardRoutes(dynamicInsightsRoot ? [dynamicInsightsRoot] : []))]
        .map((route) => ({ link: route, component: <DynamicInsightsDashboard />, subMenu: [] }));

    if (Array.isArray(apiMenuRaw) && apiMenuRaw.length > 0) {
        // ── API-driven mode ──────────────────────────────────────────────────
        // 1. Convert raw API menu → sidebar items with resolved (sidebar_values) routes
        const resolvedItems = resolveApiItems(
            meMenuToSidebarItems(apiMenuRaw, { resolveTopIcon: () => null })
        );

        // 2. Collect all routes the API allows and look up their components
        const uniqueRoutes = [...new Set(flattenRoutes(resolvedItems))];
        contentRoutes = uniqueRoutes
            .filter((route) => ROUTE_TO_COMPONENT[route])
            .map((route) => ({ link: route, component: ROUTE_TO_COMPONENT[route], subMenu: [] }));

        // 3. Admin routes are added by the frontend (not in apiMenuRaw) — include if admin
        if (isAdmin) {
            const adminFlatRoutes = [];
            buildRouteToComponentMap(Sidebar_content.Admin || [], {});  // warm-up (no-op here)
            const adminMap = buildRouteToComponentMap(Sidebar_content.Admin || []);
            for (const [link, component] of Object.entries(adminMap)) {
                if (!contentRoutes.find((r) => r.link === link)) {
                    adminFlatRoutes.push({ link, component, subMenu: [] });
                }
            }
            contentRoutes = [...contentRoutes, ...adminFlatRoutes];
        }

        for (const dynamicRoute of dynamicInsightsRoutes) {
            if (!contentRoutes.find((route) => route.link === dynamicRoute.link)) {
                contentRoutes.push(dynamicRoute);
            }
        }
    } else {
        // ── Fallback (no API menu) ───────────────────────────────────────────
        contentRoutes = [
            ...(Sidebar_content.all_routes || []),
            ...(isAdmin ? Sidebar_content.Admin || [] : []),
            ...dynamicInsightsRoutes,
        ];
    }

    // GlobalUrl always included (catch-all *, deep-link routes, etc.)
    const allRouteItems = [...contentRoutes, ...(Sidebar_content.GlobalUrl || [])];

    // ── Route renderer (handles flat and nested subMenu items) ───────────────
    const RouteCreator = (itm) => {
        if (!itm) return [];
        if (Array.isArray(itm.subMenu) && itm.subMenu.length > 0) {
            return itm.subMenu.flatMap((child) => RouteCreator(child));
        }
        if (!itm.component || !itm.link) return [];
        return [
            <Route
                key={itm.link}
                path={itm.link}
                element={
                    <Layout
                        sidebarOpen={sidebarOpen}
                        child={itm.component}
                        sidebarPos={sidebarPos}
                        setSidebarPos={setSidebarPos}
                    />
                }
            />,
        ];
    };

    return (
        <Routes>
            <Route
                path="/profile"
                element={
                    <Layout
                        sidebarOpen={sidebarOpen}
                        child={<Profile />}
                        sidebarPos={sidebarPos}
                        setSidebarPos={setSidebarPos}
                    />
                }
            />
            {allRouteItems.flatMap((itm) => RouteCreator(itm))}
        </Routes>
    );
};

export default Navigation;
