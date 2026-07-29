import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import UrlDashboard from '../SuperSet/UrlDashboard';
import GrafanaDashboard from '../Grafana/GrafanaDashboard';
import EmbeddedDashboard from '../../components/DashboardBuilder/dashboard/EmbeddedDashboard';

const flattenMenu = (items) =>
    (items || []).reduce((acc, item) => {
        acc.push(item);
        if (item.children?.length) acc.push(...flattenMenu(item.children));
        return acc;
    }, []);

const DynamicInsightsDashboard = () => {
    const { pathname } = useLocation();
    const menuList = useSelector(state => state.insightsEngine.dashboardList);

    const menuItem = useMemo(() => {
        const flat = flattenMenu(menuList);
        return flat.find(i => i.route === pathname || i.route === pathname.replace(/\/$/, ''));
    }, [menuList, pathname]);

    const isGrafana = menuItem?.dashboard_platform === 'grafana';
    const isBuilder = menuItem?.dashboard_platform === 'dashboard_builder';
    const isConfigured = isGrafana ? !!menuItem?.dashboard_uuid : !!menuItem?.dashboard_id;

    if (!isConfigured) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Dashboard not configured
            </div>
        );
    }

    if (isGrafana) {
        return (
            <div className="w-full h-full flex flex-col">
                <div className="flex-1">
                    {/* <GrafanaDashboard  dashboard_name={menuItem.dashboard_id} dashboard_uid={menuItem.dashboard_uuid} /> */}
                    <GrafanaDashboard access_token={menuItem.dashboard_id || menuItem.dashboard_uuid} />
                </div>
            </div>
        );
    }

    if (isBuilder) {
        return (
            <div className="w-full h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-auto">
                    <EmbeddedDashboard dashboardId={menuItem.dashboard_id} />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1">
                <UrlDashboard dashboardId={Number(menuItem.dashboard_id)} />
            </div>
        </div>
    );
};

export default DynamicInsightsDashboard;
