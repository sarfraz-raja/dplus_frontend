export const INSIGHTS_ROOT_ROUTE = '/insights-engine';

const normalizePath = (value = '') => String(value || '').replace(/\/+$/, '') || '/';

export const isInsightsRoute = (route) => {
    const normalized = normalizePath(route);
    return normalized === INSIGHTS_ROOT_ROUTE || normalized.startsWith(`${INSIGHTS_ROOT_ROUTE}/`);
};

export const isInsightsRootNode = (item) =>
    normalizePath(item?.route) === INSIGHTS_ROOT_ROUTE ||
    String(item?.title || '').toLowerCase().trim() === 'insights engine';

export const sortBySequence = (items) =>
    [...(items || [])].sort((a, b) => (a?.sequence ?? 999) - (b?.sequence ?? 999));

const canViewNode = (item, rolename) => {
    const allowRole = String(item?.allow_role || 'Both').toLowerCase();
    if (allowRole === 'both') return true;
    if (!rolename) return true;
    return allowRole === String(rolename).toLowerCase();
};

const isActiveNode = (item) => item?.is_active !== false;

const isBlankParent = (value) => {
    if (value == null) return true;
    const normalized = String(value).trim().toLowerCase();
    return normalized === '' || normalized === 'null' || normalized === 'undefined';
};

const flattenTree = (items) =>
    (items || []).reduce((acc, item) => {
        acc.push(item);
        if (item.children?.length) acc.push(...flattenTree(item.children));
        return acc;
    }, []);

export const buildInsightsRootTree = (menuList, { rolename, includeInactive = false } = {}) => {
    if (!Array.isArray(menuList) || !menuList.length) return null;

    const root = menuList.find(isInsightsRootNode);
    if (!root || !canViewNode(root, rolename) || (!includeInactive && !isActiveNode(root))) return null;

    const cloneNode = (node) => ({
        ...node,
        children: sortBySequence(node.children || [])
            .filter((child) => canViewNode(child, rolename) && (includeInactive || isActiveNode(child)))
            .map(cloneNode),
    });

    const rootClone = cloneNode(root);
    const existingIds = new Set(flattenTree(rootClone.children).map((item) => item.id).filter(Boolean));
    const allIds = new Set(flattenTree(menuList).map((item) => item.id).filter(Boolean));
    const orphanRootChildren = sortBySequence(menuList)
        .filter((item) => {
            if (!item || item.id === root.id || existingIds.has(item.id)) return false;
            if (!canViewNode(item, rolename)) return false;
            if (!includeInactive && !isActiveNode(item)) return false;
            if (!isInsightsRoute(item.route)) return false;
            return isBlankParent(item.parent_id) || item.parent_id === root.id || !allIds.has(item.parent_id);
        })
        .map(cloneNode);

    rootClone.children = sortBySequence([...rootClone.children, ...orphanRootChildren]);
    return rootClone;
};
