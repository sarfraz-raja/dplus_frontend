import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Antenna,
  AreaChart,
  BarChart2,
  BarChart,
  Bell,
  BellRing,
  Box,
  Building,
  Building2,
  CalendarCheck,
  CalendarCog,
  ChartColumn,
  ChartLine,
  ClipboardCheck,
  Cpu,
  Database,
  DatabaseZap,
  FileCode,
  FolderOpen,
  Gauge,
  GitBranch,
  Globe,
  Grid,
  HardDrive,
  Layers,
  Layout,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  MapPin,
  MapPinned,
  MessageSquare,
  Monitor,
  Network,
  PhoneCall,
  PieChart,
  Play,
  Radio,
  Radar,
  Rss,
  Satellite,
  SearchCheck,
  Server,
  Settings,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  SignalHigh,
  Signal,
  Sliders,
  ScatterChart,
  Terminal,
  Timer,
  Target,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
  Upload,
  Download,
  Waves,
  Wifi,
  WifiHigh,
  Wrench,
  Zap,
  Eye,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { Sidebar_content } from '../utils/sidebar_values';
import { meMenuToSidebarItems } from '../utils/meMenuToSidebar';
import { buildInsightsRootTree, isInsightsRoute } from '../utils/insightsMenu';

/** Build a flat name→link lookup from all sidebar_values items (all_routes + Admin + GlobalUrl). */
const buildNameToLinkMap = (items, map = {}) => {
  for (const item of (items || [])) {
    if (item.name && item.link) map[item.name] = item.link;
    if (Array.isArray(item.subMenu)) buildNameToLinkMap(item.subMenu, map);
  }
  return map;
};
const SIDEBAR_VALUES_LINK_MAP = buildNameToLinkMap([
  ...(Sidebar_content.all_routes || []),
  ...(Sidebar_content.Admin || []),
  ...(Sidebar_content.GlobalUrl || []),
]);

/** Override API-provided routes with sidebar_values routes (matched by title) so Navigation.jsx routes always match. */
const overrideRoutes = (items) =>
  items.map((item) => ({
    ...item,
    route: SIDEBAR_VALUES_LINK_MAP[item.title] || item.route,
    children: Array.isArray(item.children) ? overrideRoutes(item.children) : item.children,
  }));

const TOP_LEVEL_ICON_MAP = {
  Dashboard: LayoutDashboard,
  'Insights Engine': Activity,
  'GIS Engine': MapIcon,
  'Geo Drill-Down': MapPinned,
  'Analytics Pro': BarChart2,
  Discussions: MessageSquare,
  'Configuration Management': Settings,
  'Custom Query': Database,
  xAlerts: Bell,
  iSON: Cpu,
  'CX/IX Support': Wrench,
  'Network Inventory': HardDrive,
  'KPI Processing Engine': Gauge,
  Tickets: ListChecks,
  'Multi-Map View': Layers,
  'Map Chart': MapPinned,
  'Topology Layer': Network,
  'Layer View': Layers,
  'Nokia Tool Management Query': Terminal,
  'Map Settings': MapPin,
  'Reporting Suite': ChartColumn,
  NiFi: Terminal,
  'Network Complaints': MessageSquare,
  'Network Complaints Dashboard': TriangleAlert,
  'Fault Management': BellRing,
  'Capacity Management': Gauge,
  'Revenue Assurance': ShieldCheck,
  'Work Force Management': Wrench,
  'Change Management': GitBranch,
  Admin: Settings2,
};

/**
 * Case-insensitive + punctuation-normalised lookup map built from TOP_LEVEL_ICON_MAP.
 * Used as a fallback when the API returns a title with different casing/punctuation
 * than the canonical key (e.g. "Gis Engine" → "GIS Engine", "Xalerts" → "xAlerts").
 */
const normTitle = (s) => String(s || '').toLowerCase().replace(/[-/]/g, ' ').trim();
const TOP_LEVEL_ICON_MAP_CI = Object.fromEntries(
  Object.entries(TOP_LEVEL_ICON_MAP).map(([k, v]) => [normTitle(k), v])
);

const REFERENCE_MENU = [
  {
    name: 'Insights Engine',
    children: [
      { name: 'Core Dashboards', children: ['MSS Dashboard', 'UGW Dashboard', 'MGW Dashboard'] },
      { name: 'RAN Dashboards', children: ['Worst Cells Dashboard', '4G Dashboard', '5G Dashboard', '5G NSA to SA Pre-Post Dashboard'] },
      { name: 'Network Dashboard' },
      { name: 'Parameter Audit Dashboard' },
    ],
  },
  { name: 'GIS Engine' },
  { name: 'Geo Drill-Down' },
  {
    name: 'Analytics Pro',
    children: ['Site Analytics', 'Site Pro Rules', 'Cell Analytics', 'Cell Pro Rules', 'KPI Check Rules', 'Pro Rules Management'],
  },
  {
    name: 'KPI Processing Engine',
    children: ['Counters', 'KPI Process', 'Measurements'],
  },
  { name: 'Tickets' },
  { name: 'Multi-Map View' },
  { name: 'Discussions' },
  {
    name: 'Configuration Management',
    children: ['Parameter Audit', 'Neighbour Audit', 'Daily Parameter Audit'],
  },
  {
    name: 'Custom Query',
    children: ['DB Config', 'Advanced Query Builder', 'Run Query', 'Saved Query List'],
  },
  {
    name: 'xAlerts',
    children: ['Configure Scheduler', 'Alert Scheduler'],
  },
  { name: 'iSON' },
  {
    name: 'CX/IX Support',
    children: ['Scripting', 'Parameter Audit', 'DB Update'],
  },
  {
    name: 'Network Inventory',
    children: ['Site Database', 'Auto Discovery'],
  },
  { name: 'Topology Layer' },
  {
    name: 'Layer View',
    children: ['Site Layer', 'Carrier Layer', 'Cell Layer'],
  },
  { name: 'Nokia Tool Management Query' },
  { name: 'Map Settings' },
  { name: 'Reporting Suite' },
  { name: 'NiFi' },
  { name: 'Network Complaints' },
  { name: 'Fault Management' },
  { name: 'Capacity Management' },
  { name: 'Revenue Assurance' },
  { name: 'Work Force Management' },
  { name: 'Change Management' },
  { name: 'Admin' },
];

const ACTIVE_ITEM_STORAGE_KEY = 'dy3-sidebar-active';
const OPEN_CATEGORY_STORAGE_KEY = 'dy3-sidebar-open';

const SIDEBAR_CHILD_ICON_MAP = {
  'Core Dashboards': Layers,
  'MSS Dashboard': ChartLine,
  'UGW Dashboard': Gauge,
  'MGW Dashboard': Network,
  'RAN Dashboards': Radio,
  'Worst Cells Dashboard': TriangleAlert,
  '4G Dashboard': SignalHigh,
  '5G Dashboard': WifiHigh,
  '5G NSA to SA Pre-Post Dashboard': WifiHigh,
  'Network Dashboard': Activity,
  'Parameter Audit Dashboard': ClipboardCheck,
  'Dashboard Manager': LayoutDashboard,
  'Site Analytics': MapPinned,
  'Site Pro Rules': ShieldCheck,
  'Cell Analytics': ChartColumn,
  'Cell Pro Rules': ShieldCheck,
  'KPI Check Rules': ListChecks,
  'Pro Rules Management': Settings2,
  'Parameter Audit': ClipboardCheck,
  'Neighbour Audit': GitBranch,
  'Daily Parameter Audit': CalendarCheck,
  'DB Config': DatabaseZap,
  'Query workbench': FileCode,
  'Advanced Query Builder': FileCode,
  'Run Query': Play,
  'Saved Query List': FolderOpen,
  'Configure Scheduler': CalendarCog,
  'Alert Scheduler': BellRing,
  Scripting: Terminal,
  'DB Update': Database,
  'Site Database': Server,
  'Auto Discovery': SearchCheck,
  'Site Layer': MapPinned,
  'Carrier Layer': Layers,
  'Cell Layer': Layers,
  /* API `/me` submenu titles (Postman / backend) → same icons as curated menu */
  Worstcells: TriangleAlert,
  Huawei4G: SignalHigh,
  Huawei5G: WifiHigh,
  Mss: ChartLine,
  Ugw: Gauge,
  Mgw: Network,
  '5Gnsatosaprepostdashboard': WifiHigh,
  Parameteraudit: ClipboardCheck,
  Dbupdate: Database,
  'Map Testing': Activity,
  'Customized Report': ChartColumn,
  Repository: FolderOpen,
  Counters: BarChart2,
  'KPI Process': Cpu,
  Measurements: ChartLine,
  'User Management': Settings,
  'Role Management': ShieldCheck,
  'Insights Dashboard Manager': LayoutDashboard,
  'Resource Utilization': Gauge,
  'Auto TT Dispatch': Play,
  'Plan Work Order': ClipboardCheck,
  // API may return a shortened title — add explicit aliases here when the name differs
  Workbench: FileCode,
};

/**
 * Case-insensitive fallback map for child icon resolution.
 * Handles API titles with different casing (e.g. "Db Config" → "DB Config").
 * Uses the same normTitle() helper defined above for top-level icons.
 */
const SIDEBAR_CHILD_ICON_MAP_CI = Object.fromEntries(
  Object.entries(SIDEBAR_CHILD_ICON_MAP).map(([k, v]) => [normTitle(k), v])
);

const DASHBOARD_ICON_MAP = {
  BarChart2,
  LineChart: ChartLine,
  PieChart,
  Activity,
  TrendingUp,
  TrendingDown,
  AreaChart,
  BarChart,
  ScatterChart,
  Gauge,
  Globe,
  Map: MapIcon,
  Layers,
  Network,
  Database,
  Server,
  Cpu,
  Wifi,
  Signal,
  Radio,
  Rss,
  Satellite,
  Monitor,
  Layout,
  Box,
  Sliders,
  Grid,
  Radar,
  Building2,
  Building,
  PhoneCall,
  AlertCircle,
  Bell,
  ChartLine,
  SignalHigh,
  WifiHigh,
  TriangleAlert,
  ClipboardCheck,
  /* Analytics / KPI */
  ChartColumn,
  ListChecks,
  Target,
  Timer,
  /* Site / Location */
  MapPin,
  MapPinned,
  Antenna,
  /* Telecom / RF */
  Waves,
  Zap,
  Download,
  Upload,
  /* Compliance / Security */
  ShieldCheck,
  ShieldAlert,
  /* Dashboard / Navigation */
  LayoutDashboard,
  Settings,
  Settings2,
  /* Operations / Monitoring */
  Eye,
  RefreshCw,
  HardDrive,
  Terminal,
  FileCode,
  SearchCheck,
  GitBranch,
  /* Alerts / Scheduling */
  BellRing,
  CalendarCheck,
};

const normalizePath = (value = '') => value.replace(/\/+$/, '') || '/';

const isSamePath = (candidate, pathname) => normalizePath(candidate) === normalizePath(pathname);

const hasActiveItemInChildren = (children, activeTitle) => {
  if (!Array.isArray(children)) return false;
  return children.some((child) => child.title === activeTitle || hasActiveItemInChildren(child.children, activeTitle));
};

const buildOrderedChildren = (rawChildren = [], childSpec = []) => {
  if (!Array.isArray(rawChildren)) return [];

  // const childMap = new Map(rawChildren.map((child) => [child.name, child]));
  const childMap = new Map(
  rawChildren.map((child) => [normTitle(child.name), child])
);
  const used = new Set();
  const ordered = [];

  childSpec.forEach((specEntry) => {
    const spec = typeof specEntry === 'string' ? { name: specEntry } : specEntry;
    // const rawChild = childMap.get(spec.name);
    const rawChild = childMap.get(normTitle(spec.name));
    if (!rawChild) return;

    used.add(spec.name);
    let nextItem = { ...rawChild };

    if (Array.isArray(rawChild.subMenu) && rawChild.subMenu.length > 0) {
      const nextChildren = buildOrderedChildren(rawChild.subMenu, spec.children || []);
      const remainingChildren = rawChild.subMenu.filter((item) => !nextChildren.some((orderedChild) => orderedChild.name === item.name));

      nextItem = {
        ...rawChild,
        subMenu: [...nextChildren, ...remainingChildren],
      };
    }

    ordered.push(nextItem);
  });

  const remaining = rawChildren.filter((child) => !used.has(child.name));
  return [...ordered, ...remaining];
};

const buildOrderedMenu = (sourceMenu) => {
  // const sourceMap = new Map(sourceMenu.map((item) => [item.name, item]));
  const sourceMap = new Map(
  sourceMenu.map((item) => [normTitle(item.name), item])
);
  const used = new Set();
  const ordered = [];

  REFERENCE_MENU.forEach((specEntry) => {
    // const rawItem = sourceMap.get(specEntry.name);
    const rawItem = sourceMap.get(normTitle(specEntry.name));
    if (!rawItem) return;

    used.add(specEntry.name);
    ordered.push({
      ...rawItem,
      subMenu: buildOrderedChildren(rawItem.subMenu, specEntry.children || []),
    });
  });

  const remaining = sourceMenu.filter((item) => !used.has(item.name) && item.name !== 'Home');
  return [...ordered, ...remaining];
};

const transformMenuItems = (items, isTopLevel = true) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const children = transformMenuItems(item.subMenu, false);
    return {
      title: item.name,
      route: item.link,
      type: children.length > 0 ? 'dropdown' : 'link',
      icon: isTopLevel ? TOP_LEVEL_ICON_MAP[item.name] || LayoutDashboard : undefined,
      children,
    };
  });

const findRouteMatch = (items, pathname, trail = []) => {
  for (const item of items) {
    if (isSamePath(item.route, pathname)) {
      return { item, trail };
    }

    if (Array.isArray(item.children)) {
      const nestedMatch = findRouteMatch(item.children, pathname, [...trail, item.title]);
      if (nestedMatch) return nestedMatch;
    }
  }

  return null;
};

const readStoredOpenCategories = () => {
  const rawValue = localStorage.getItem(OPEN_CATEGORY_STORAGE_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) return parsed;
    return typeof parsed === 'string' ? [parsed] : [];
  } catch {
    return rawValue ? [rawValue] : [];
  }
};


const persistOpenCategories = (categories) => {
  if (!categories.length) {
    localStorage.removeItem(OPEN_CATEGORY_STORAGE_KEY);
    return;
  }

  localStorage.setItem(OPEN_CATEGORY_STORAGE_KEY, JSON.stringify(categories));
};

const getSidebarChildIcon = (title) =>
  SIDEBAR_CHILD_ICON_MAP[title] || SIDEBAR_CHILD_ICON_MAP_CI[normTitle(title)] || null;

const getDashboardIcon = (item) =>
  DASHBOARD_ICON_MAP[item?.icon] || getSidebarChildIcon(item?.title) || null;

const dashboardNodeToSidebarItem = (node, isTopLevel = false) => {
  const children = (node.children || []).map((child) => dashboardNodeToSidebarItem(child, false));
  return {
    title: node.title,
    route: node.route,
    type: children.length ? 'dropdown' : 'link',
    icon: isTopLevel ? TOP_LEVEL_ICON_MAP['Insights Engine'] : getDashboardIcon(node),
    children,
  };
};

const applyDynamicInsightsMenu = (items, dynamicRoot) => {
  if (!dynamicRoot) return items;

  const dynamicItem = dashboardNodeToSidebarItem(dynamicRoot, true);
  const filtered = (items || []).filter((item) => {
    if (item.title === 'Insights Engine') return false;
    if (item.route && isInsightsRoute(item.route)) return false;
    return true;
  });

  const originalIndex = (items || []).findIndex((item) => item.title === 'Insights Engine');
  if (originalIndex < 0) return [...filtered, dynamicItem];
  const next = [...filtered];
  next.splice(Math.min(originalIndex, next.length), 0, dynamicItem);
  return next;
};

const normalizeStoredUser = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
};

const InsightsTreeNode = ({ item, activeItem, openInsightsGroups, toggleInsightsGroup, handleChild, topLevelTitle }) => {
  const isGroup = Array.isArray(item.children) && item.children.length > 0;
  const isSelected = item.title === activeItem || hasActiveItemInChildren(item.children, activeItem);
  const isOpen = !!openInsightsGroups[item.title];
  const ItemIcon = item.icon || getSidebarChildIcon(item.title);

  if (isGroup) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => toggleInsightsGroup(item.title)}
          className={`
            group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] transition-all duration-200
            ${isSelected
              ? 'bg-orange-50 text-slate-900 dark:bg-[rgba(43,19,37,0.7)] dark:text-white'
              : 'text-slate-800 hover:bg-[#F26522]/5 hover:pl-4 dark:text-white dark:hover:bg-white/5'
            }
          `}
        >
          <div className="flex min-w-0 items-center gap-3">
            {ItemIcon ? (
              <ItemIcon
                className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                  isSelected ? 'text-[#F26522]' : 'text-slate-600 group-hover:text-[#F26522] dark:text-white dark:group-hover:text-[#F26522]'
                }`}
              />
            ) : null}
            <span className={`min-w-0 truncate text-slate-800 dark:text-white ${isSelected ? 'font-bold' : 'font-medium'}`}>
              {item.title}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-all duration-300 ${
              isOpen ? 'rotate-180 text-[#F26522]' : 'text-slate-500 group-hover:text-[#F26522] dark:text-white dark:group-hover:text-[#F26522]'
            }`}
          />
        </button>
        {isOpen ? (
          <div className="space-y-1 border-l border-slate-200 pl-4 dark:border-white/10">
            {item.children.map((child) => (
              <InsightsTreeNode
                key={child.title}
                item={child}
                activeItem={activeItem}
                openInsightsGroups={openInsightsGroups}
                toggleInsightsGroup={toggleInsightsGroup}
                handleChild={handleChild}
                topLevelTitle={topLevelTitle}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => handleChild(topLevelTitle, item)}
      className={`
        group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[12.5px] transition-all duration-200
        ${activeItem === item.title
          ? 'bg-orange-50 text-slate-900 dark:bg-[rgba(43,19,37,0.7)] dark:text-white'
          : 'text-slate-800 hover:bg-[#F26522]/5 hover:pl-4 dark:text-white dark:hover:bg-white/5'
        }
      `}
    >
      {ItemIcon ? (
        <ItemIcon
          className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
            activeItem === item.title ? 'text-[#F26522]' : 'text-slate-600 group-hover:text-[#F26522] dark:text-white dark:group-hover:text-[#F26522]'
          }`}
        />
      ) : null}
      <span className={`min-w-0 truncate text-slate-800 dark:text-white ${activeItem === item.title ? 'font-bold' : 'font-medium'}`}>
        {item.title}
      </span>
    </button>
  );
};

export default function Sidebar({ sidebarOpen, isMobileViewport, mobileVisible, onMobileClose, onOpen }) {
  const apiMenuRaw = useSelector((state) => state.auth.sidebarMenu);
  const insightsMenuRaw = useSelector((state) => state.insightsEngine.dashboardList);
  const authUser = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [isHydrated, setIsHydrated] = useState(false);
  const [openCategory, setOpenCategory] = useState([]);
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [openInsightsGroups, setOpenInsightsGroups] = useState({});

  const rolename = useMemo(() => {
    const fromStore = normalizeStoredUser(authUser);
    if (fromStore?.rolename) return fromStore.rolename;
    try {
      return normalizeStoredUser(localStorage.getItem('user'))?.rolename;
    } catch {
      return undefined;
    }
  }, [authUser]);

  const menu = useMemo(() => {
    const dynamicInsightsRoot = buildInsightsRootTree(insightsMenuRaw, { rolename });

    // Primary path: GET /me returned a menu (works for any role — admin or user).
    // Backend is the source of truth for what items each role can see.
    if (Array.isArray(apiMenuRaw) && apiMenuRaw.length > 0) {
      let apiItems = overrideRoutes(meMenuToSidebarItems(apiMenuRaw, {
        // Resolve icon: exact match first, then case-insensitive/punctuation-normalised fallback.
        // This handles API titles like "Gis Engine", "Xalerts", "Ison", "Multi Map View" etc.
        resolveTopIcon: (iconKey, rawTitle) =>
          TOP_LEVEL_ICON_MAP[iconKey] ||
          TOP_LEVEL_ICON_MAP[rawTitle] ||
          TOP_LEVEL_ICON_MAP_CI[normTitle(iconKey)] ||
          TOP_LEVEL_ICON_MAP_CI[normTitle(rawTitle)] ||
          LayoutDashboard,
      }));
      apiItems = applyDynamicInsightsMenu(apiItems, dynamicInsightsRoot);
      console.log("[Sidebar] Final rendered menu order:", apiItems.map((i) => i.title));
      // Admin always gets the Admin panel appended — but only if the API didn't already include it.
      if (rolename?.toLowerCase() === 'admin') {
        const apiTitles = new Set(apiItems.map((i) => i.title.toLowerCase()));
        const adminItems = transformMenuItems(Sidebar_content.Admin || []).filter(
          (i) => !apiTitles.has(i.title.toLowerCase())
        );
        return adminItems.length > 0 ? [...apiItems, ...adminItems] : apiItems;
      }
      return apiItems;
    }

    // Fallback: GET /me returned no menu (network error, backend not yet updated, or dev mode).
    // Renders the full static sidebar from sidebar_values.jsx.
    const allRoutes = Sidebar_content.all_routes || [];
    const roleRoutes = rolename?.toLowerCase() === 'admin' ? Sidebar_content.Admin || [] : [];
    return applyDynamicInsightsMenu(transformMenuItems(buildOrderedMenu([...allRoutes, ...roleRoutes])), dynamicInsightsRoot);
  }, [rolename, apiMenuRaw, insightsMenuRaw]);

  useEffect(() => {
    setIsHydrated(true);
    setOpenCategory(readStoredOpenCategories());
    setActiveItem(localStorage.getItem(ACTIVE_ITEM_STORAGE_KEY) || 'Dashboard');
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const matchedRoute = findRouteMatch(menu, location.pathname);
    if (matchedRoute) {
      const nextActive = matchedRoute.item.title;
      const nextOpenCategory = matchedRoute.trail.length > 0 ? [matchedRoute.trail[0]] : readStoredOpenCategories();

      localStorage.setItem(ACTIVE_ITEM_STORAGE_KEY, nextActive);
      if (matchedRoute.trail.length > 0) {
        persistOpenCategories(nextOpenCategory);
      }

      setActiveItem(nextActive);
      setOpenCategory(nextOpenCategory);

      if (matchedRoute.trail[0] === 'Insights Engine') {
        const insightsTrail = matchedRoute.trail.slice(1);
        if (insightsTrail.length > 0) {
          setOpenInsightsGroups((current) => {
            const next = { ...current };
            insightsTrail.forEach((t) => { next[t] = true; });
            return next;
          });
        }
      }

      return;
    }

    if (location.pathname === '/' || location.pathname === '/home') {
      localStorage.setItem(ACTIVE_ITEM_STORAGE_KEY, 'Dashboard');
      setActiveItem('Dashboard');
      setOpenCategory(readStoredOpenCategories());
      return;
    }

    if (location.pathname === '/profile') {
      setActiveItem('');
      setOpenCategory([]);
      return;
    }

    setActiveItem('');
    setOpenCategory([]);
  }, [isHydrated, location.pathname, menu]);

  const isExpanded = isMobileViewport ? true : sidebarOpen;

  const closeMobileIfNeeded = () => {
    if (isMobileViewport) {
      onMobileClose?.();
    }
  };

  const handleLink = (item) => {
    const targetRoute = item.route || '/home';
    localStorage.setItem(ACTIVE_ITEM_STORAGE_KEY, item.title);
    localStorage.removeItem(OPEN_CATEGORY_STORAGE_KEY);
    setActiveItem(item.title);
    setOpenCategory([]);
    navigate(targetRoute, { state: { name: item.title } });
    closeMobileIfNeeded();
  };

  const handleDashboard = () => {
    localStorage.setItem(ACTIVE_ITEM_STORAGE_KEY, 'Dashboard');
    localStorage.removeItem(OPEN_CATEGORY_STORAGE_KEY);
    setActiveItem('Dashboard');
    setOpenCategory([]);
    navigate('/home', { state: { name: 'Dashboard' } });
    closeMobileIfNeeded();
  };

  const handleDropdown = (title) => {
    if (!sidebarOpen) {
      onOpen?.();
      const nextOpen = [title];
      persistOpenCategories(nextOpen);
      setOpenCategory(nextOpen);
      return;
    }

    const nextOpen = openCategory.includes(title)
      ? openCategory.filter((itemTitle) => itemTitle !== title)
      : [...openCategory, title];

    persistOpenCategories(nextOpen);
    setOpenCategory(nextOpen);
  };

  const handleChild = (parentTitle, child) => {
    localStorage.setItem(ACTIVE_ITEM_STORAGE_KEY, child.title);
    const nextOpen = openCategory.includes(parentTitle) ? openCategory : [...openCategory, parentTitle];

    persistOpenCategories(nextOpen);
    setActiveItem(child.title);
    setOpenCategory(nextOpen);
    navigate(child.route || '/home', { state: { name: child.title } });
    closeMobileIfNeeded();
  };

  const toggleInsightsGroup = (title) => {
    setOpenInsightsGroups((current) => ({
      ...current,
      [title]: !current[title],
    }));
  };

  return (
    <>
      <div
        onClick={() => onMobileClose?.()}
        className={`fixed inset-x-0 bottom-0 top-[78px] z-30 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          mobileVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        data-dy3-sidebar
        className={`
          fixed bottom-0 left-0 top-[78px] z-[35] h-[calc(100vh-78px)] overflow-hidden
          border-r border-slate-200 text-slate-800 dark:border-r-0 dark:text-white
          w-[290px] transition-transform duration-300 ease-in-out
          ${mobileVisible ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:absolute lg:inset-y-0 lg:left-0 lg:z-30 lg:h-full lg:rounded-none
          lg:transition-none
          ${sidebarOpen ? 'lg:w-[290px] lg:shadow-[4px_0_24px_rgba(0,0,0,0.12)]' : 'lg:w-[88px]'}
        `}
      >
        <div className="flex h-full min-h-0 flex-col items-stretch">
          <div className={`hidden items-center px-4 py-3 lg:flex lg:px-2 lg:py-0 ${isExpanded ? 'justify-end lg:min-h-[12px]' : 'justify-center lg:min-h-[12px]'}`} />

          <div className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-0 pb-3 pt-3 pr-4 lg:pt-0 lg:pr-4">
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={handleDashboard}
                  title={!isExpanded ? 'Dashboard' : undefined}
                  className={`group flex w-full items-center rounded-xl border transition-all duration-200 ${
                    isExpanded ? 'justify-start gap-3 px-3 py-3 ml-2 mr-3' : 'justify-center px-2 py-3 ml-2 mr-3'
                  } ${
                    activeItem === 'Dashboard'
                      ? 'border-[#F26522]/40 bg-orange-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(242,101,34,0.12)] dark:bg-[rgba(43,19,37,0.88)] dark:text-[#ffffff] dark:shadow-[inset_0_0_0_1px_rgba(242,101,34,0.1)]'
                      : 'border-transparent text-slate-800 hover:border-[#F26522]/20 hover:bg-[#F26522]/5 dark:text-white dark:hover:border-white/10 dark:hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard
                    className={`h-5 w-5 shrink-0 transition-all duration-200 ${
                      activeItem === 'Dashboard' ? 'text-[#F26522]' : 'text-slate-600 group-hover:text-[#F26522] dark:text-white dark:group-hover:text-[#F26522]'
                    }`}
                  />
                  {isExpanded ? (
                    <span
                      className={`min-w-0 flex-1 truncate text-left text-[18px] tracking-[0.01em] text-slate-800 dark:text-white ${
                        activeItem === 'Dashboard' ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      Dashboard
                    </span>
                  ) : null}
                </button>
              </li>

              {menu.map((item) => {
                const Icon = item.icon;
                const isDropdownOpen = openCategory.includes(item.title);
                const hasActiveChild = hasActiveItemInChildren(item.children, activeItem);
                const isSelected = activeItem === item.title || hasActiveChild;
                const isActive = item.type === 'link' ? activeItem === item.title : isSelected;

                if (item.type === 'link') {
                  return (
                    <li key={item.title}>
                      <button
                        type="button"
                        onClick={() => handleLink(item)}
                        title={!isExpanded ? item.title : undefined}
                        className={`
                          group flex w-full items-center rounded-xl border transition-all duration-200
                          ${isExpanded ? 'justify-start gap-3 px-3 py-3 ml-2 mr-3' : 'justify-center px-2 py-3 ml-2 mr-3'}
                          ${
                            isActive
                              ? 'border-[#F26522]/40 bg-orange-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(242,101,34,0.12)] dark:bg-[rgba(43,19,37,0.88)] dark:text-[#ffffff] dark:shadow-[inset_0_0_0_1px_rgba(242,101,34,0.1)]'
                              : 'border-transparent text-slate-800 hover:border-[#F26522]/20 hover:bg-[#F26522]/5 dark:text-white dark:hover:border-white/10 dark:hover:bg-white/5'
                          }
                        `}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-all duration-200 ${
                            isActive ? 'text-[#F26522]' : 'text-slate-600 group-hover:text-[#F26522] dark:text-white dark:group-hover:text-[#F26522]'
                          }`}
                        />
                        {isExpanded ? (
                          <span
                            className={`min-w-0 flex-1 truncate text-left text-[18px] tracking-[0.01em] text-slate-800 dark:text-white ${
                            isActive ? 'font-bold' : 'font-medium'
                          }`}
                          >
                            {item.title}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.title} className="rounded-xl">
                    <div
                      className={`
                        group flex w-full items-center rounded-xl border transition-all duration-200
                        ${sidebarOpen ? 'justify-between px-3 py-3 ml-2 mr-3' : 'justify-center px-2 py-3 ml-2 mr-3'}
                        ${
                          isSelected
                            ? 'border-[#F26522]/40 bg-orange-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(242,101,34,0.12)] dark:bg-[rgba(43,19,37,0.88)] dark:text-[#ffffff] dark:shadow-[inset_0_0_0_1px_rgba(242,101,34,0.1)]'
                            : 'border-transparent text-slate-800 hover:border-[#F26522]/20 hover:bg-[#F26522]/5 dark:text-white dark:hover:border-white/10 dark:hover:bg-white/5'
                        }
                      `}
                    >
                      <button
                        type="button"
                        onClick={() => handleDropdown(item.title)}
                        title={!isExpanded ? item.title : undefined}
                        className={`flex min-w-0 flex-1 items-center ${isExpanded ? 'gap-3 text-left' : 'justify-center'}`}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-all duration-200 ${
                            isSelected ? 'text-[#F26522]' : 'text-slate-600 group-hover:text-[#F26522] dark:text-white dark:group-hover:text-[#F26522]'
                          }`}
                        />
                        {isExpanded ? (
                          <span
                            className={`min-w-0 flex-1 truncate text-left text-[18px] tracking-[0.01em] text-slate-800 dark:text-white ${
                              isSelected ? 'font-bold' : 'font-medium'
                            }`}
                          >
                            {item.title}
                          </span>
                        ) : null}
                      </button>

                      {isExpanded ? (
                        <button
                          type="button"
                          onClick={() => handleDropdown(item.title)}
                          aria-label={isDropdownOpen ? `Collapse ${item.title}` : `Expand ${item.title}`}
                          className={`ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                            isDropdownOpen || isSelected
                              ? 'border-[#F26522]/35 bg-orange-100 text-[#F26522] dark:bg-[rgba(43,19,37,0.88)]'
                              : 'border-slate-200 text-slate-600 hover:border-[#F26522]/35 hover:bg-[#F26522]/5 hover:text-[#F26522] dark:border-white/10 dark:text-white dark:hover:bg-white/5'
                          }`}
                        >
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-all duration-300 ${
                              isDropdownOpen ? 'rotate-180 text-[#F26522]' : 'text-slate-500 dark:text-white'
                            }`}
                          />
                        </button>
                      ) : null}
                    </div>

                    {isExpanded && isDropdownOpen && item.children ? (
                      item.title === 'Insights Engine' ? (
                        <div className="ml-4 mt-2 border-l border-slate-200 pl-3 dark:border-white/10">
                          <div className="space-y-1">
                            {item.children.map((child) => (
                              <InsightsTreeNode
                                key={child.title}
                                item={child}
                                activeItem={activeItem}
                                openInsightsGroups={openInsightsGroups}
                                toggleInsightsGroup={toggleInsightsGroup}
                                handleChild={handleChild}
                                topLevelTitle={item.title}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="ml-4 mt-2 border-l border-slate-200 pl-3 dark:border-white/10">
                          <div className="space-y-1">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon || getSidebarChildIcon(child.title);
                              return (
                                <button
                                  key={child.title}
                                  type="button"
                                  onClick={() => handleChild(item.title, child)}
                                  className={`
                                    group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[12.5px] transition-all duration-200
                                    ${
                                      activeItem === child.title
                                        ? 'bg-orange-50 text-slate-900 dark:bg-[rgba(43,19,37,0.7)] dark:text-white'
                                        : 'text-slate-800 hover:bg-[#F26522]/5 hover:pl-4 dark:text-white dark:hover:bg-white/5'
                                    }
                                  `}
                                >
                                  {ChildIcon ? (
                                    <ChildIcon
                                      className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                                        activeItem === child.title ? 'text-[#F26522]' : 'text-slate-600 group-hover:text-[#F26522] dark:text-white dark:group-hover:text-[#F26522]'
                                      }`}
                                    />
                                  ) : null}
                                  <span
                                    className={`min-w-0 truncate text-slate-800 dark:text-white ${
                                      activeItem === child.title ? 'font-bold' : 'font-medium'
                                    }`}
                                  >
                                    {child.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
