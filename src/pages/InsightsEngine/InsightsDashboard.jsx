import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import UrlDashboard from '../SuperSet/UrlDashboard';

const flattenMenu = (items) =>
    (items || []).reduce((acc, item) => {
        acc.push(item);
        if (item.children?.length) acc.push(...flattenMenu(item.children));
        return acc;
    }, []);

const InsightsDashboard = () => {
    const { pathname } = useLocation();
    const menuList = useSelector(state => state.insightsEngine.dashboardList);

    const menuItem = useMemo(() => {
        const flat = flattenMenu(menuList);
        return flat.find(i => i.route === pathname || i.route === pathname.replace(/\/$/, ''));
    }, [menuList, pathname]);

    if (!menuItem?.dashboard_id) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Dashboard not configured
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

export default InsightsDashboard;
