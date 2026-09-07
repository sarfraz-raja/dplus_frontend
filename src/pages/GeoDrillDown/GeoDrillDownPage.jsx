import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import { ChevronRight, ChevronLeft, Home, Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, AlertCircle, List, X } from "lucide-react";
import { baseUrl } from "../../utils/url";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════════════════════════ */
const GEO_BASE = baseUrl; // from VITE_API_BASE_URL

/** All geo API calls need Bearer token from localStorage */
function geoFetch(url) {
  const token = localStorage.getItem("token");
  return fetch(url, {
    headers: {
      "Authorization": token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
}

/** Light/voyager map style */
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY;
const CARTO_KEY_PARAM = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : '';
// OpenStreetMap keyless fallback used while CARTO required a key we didn't
// have yet. Now that VITE_CARTO_API_KEY is set, CARTO is back in use below.
// Uncomment to fall back to OSM again if the CARTO key stops working.
// const MAP_STYLE = {
//   version: 8,
//   sources: {
//     "osm": {
//       type: "raster",
//       tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
//       tileSize: 256,
//       attribution: "© OpenStreetMap Contributors",
//     },
//   },
//   layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
// };
const MAP_STYLE = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${CARTO_KEY_PARAM}`],
      tileSize: 256,
      attribution: "© CARTO © OpenStreetMap",
    },
  },
  layers: [{ id: "carto-voyager-layer", type: "raster", source: "carto-voyager" }],
};

const INITIAL_VIEW = { latitude: 0.5, longitude: 37.9, zoom: 5.5, pitch: 0, bearing: 0 };

/* ═══════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════ */
/** "County" → "Counties", "Sub-County" → "Sub-Counties", "Ward" → "Wards" */
function pluralize(s) {
  if (!s) return "";
  if (s.endsWith("y")) return s.slice(0, -1) + "ies";
  return s + "s";
}

function fmtNumber(val) {
  if (val == null || isNaN(val)) return "—";
  const n = Number(val);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(2);
}
function fmtDataVolume(mb) {
  if (mb == null || isNaN(mb)) return "—";
  const n = Number(mb);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " TB";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + " GB";
  return n.toFixed(0) + " MB";
}

function extractFeatures(raw, shapeid, node) {
  console.log(`[GeoDrillDown] boundary raw for ${shapeid}:`, JSON.stringify(raw)?.slice(0, 400));

  if (!raw) return [];
  const tag = (f) => ({ ...f, properties: { ...f.properties, _shapeid: shapeid, _node: node } });

  // 1. Already a FeatureCollection
  if (raw.type === "FeatureCollection") return (raw.features || []).map(tag);

  // 2. Already a Feature
  if (raw.type === "Feature") return [tag(raw)];

  // 3. Geometry object (Point/Polygon/MultiPolygon etc.) — wrap it
  if (raw.type && raw.coordinates) return [tag({ type: "Feature", geometry: raw, properties: {} })];

  // 4. Nested: { data: { geojson: ... } } or { data: { boundary: ... } }
  const d = raw?.data;
  if (d) {
    const inner = d.geojson ?? d.boundary ?? d.geometry ?? d.feature ?? d;
    if (inner && inner !== d) return extractFeatures(inner, shapeid, node);
    // d itself might be the geojson
    if (d.type) return extractFeatures(d, shapeid, node);
  }

  // 5. { geojson: ... } or { boundary: ... } at top level
  const top = raw.geojson ?? raw.boundary ?? raw.geometry ?? raw.feature;
  if (top) return extractFeatures(top, shapeid, node);

  // 6. Array of features
  if (Array.isArray(raw)) return raw.flatMap((item) => extractFeatures(item, shapeid, node));

  // 7. String-encoded JSON
  if (typeof raw === "string") {
    try { return extractFeatures(JSON.parse(raw), shapeid, node); } catch {}
  }

  console.warn(`[GeoDrillDown] Could not parse boundary for ${shapeid}, keys:`, Object.keys(raw));
  return [];
}

/* ═══════════════════════════════════════════════════════════════
   KPI THEMATIC CONFIG
   field      – exact key in the node object
   direction  – "higher" (green=high) | "lower" (green=low)
   domain     – [min, max] for the color gradient
════════════════════════════════════════════════════════════════ */
const KPI_CONFIG = {
  Voice_Traffic:     { field: "Voice_Traffic",      direction: "higher", domain: [0, 5000] },
  Data_Volume:       { field: "Data_Volume_in_MB",  direction: "higher", domain: [0, 50000] },
  Call_Drop_Rate:    { field: "Call Crop Rate",      direction: "lower",  domain: [0, 0.005] },
  Voice_CSSR:        { field: "Voice_CSSR",          direction: "higher", domain: [85, 100] },
  Data_Success_Rate: { field: "Data_Success_Rate",   direction: "higher", domain: [80, 100] },
  Site_Availability: { field: "Site_Availability",   direction: "higher", domain: [90, 100] },
};

/** Map a KPI value → [r, g, b, a]  red → yellow → green (or reversed for lower-is-better) */
function kpiColor(value, kpiKey, alpha = 80) {
  const cfg = KPI_CONFIG[kpiKey];
  if (!cfg || value == null || isNaN(value)) return [160, 160, 160, 40];
  const [min, max] = cfg.domain;
  let t = Math.max(0, Math.min(1, (Number(value) - min) / (max - min)));
  if (cfg.direction === "lower") t = 1 - t;
  // t=0 → red [239,68,68], t=0.5 → yellow [234,179,8], t=1 → green [16,185,129]
  let r, g, b;
  if (t < 0.5) {
    const s = t * 2;
    r = Math.round(239 + (234 - 239) * s);
    g = Math.round(68  + (179 - 68)  * s);
    b = Math.round(68  + (8   - 68)  * s);
  } else {
    const s = (t - 0.5) * 2;
    r = Math.round(234 + (16  - 234) * s);
    g = Math.round(179 + (185 - 179) * s);
    b = Math.round(8   + (129 - 8)   * s);
  }
  return [r, g, b, alpha];
}

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE
════════════════════════════════════════════════════════════════ */
const SPARK_H = [30, 45, 35, 55, 40, 62, 50, 68, 45, 72, 58, 65];
function Sparkline({ color = "#F26522" }) {
  const bw = 3, gap = 2, n = 12, tw = n * (bw + gap) - gap;
  return (
    <svg width={tw} height={22} className="opacity-60">
      {SPARK_H.map((h, i) => (
        <rect key={i} x={i * (bw + gap)} y={22 - h * 0.3} width={bw} height={h * 0.3} rx={1} fill={color} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KPI CARD
════════════════════════════════════════════════════════════════ */
function KPICard({ label, value, unit, goal, status = "neutral", sparkColor, active, onClick }) {
  const palette = {
    good:    { bg: "bg-emerald-50 border-emerald-200",  val: "text-emerald-600" },
    bad:     { bg: "bg-red-50 border-red-200",          val: "text-red-600" },
    neutral: { bg: "bg-blue-50 border-blue-200",        val: "text-blue-700" },
  };
  const p = palette[status] ?? palette.neutral;
  const Icon = status === "good" ? TrendingUp : status === "bad" ? TrendingDown : Minus;
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border p-3 flex flex-col gap-1 cursor-pointer select-none transition-all ${p.bg} ${
        active
          ? "ring-2 ring-[#F26522] ring-offset-1 shadow-md scale-[1.02]"
          : "hover:shadow-sm hover:scale-[1.01]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-[9px] uppercase tracking-wide">{label}</span>
        <Icon size={10} className={p.val} />
      </div>
      <div className="flex items-baseline gap-1 leading-none">
        <span className={`text-lg font-bold ${p.val}`}>{value}</span>
        {unit && <span className="text-gray-400 text-[10px]">{unit}</span>}
      </div>
      {goal != null && <div className="text-[9px] text-gray-400">Goal: {goal}</div>}
      <Sparkline color={sparkColor ?? (status === "good" ? "#10b981" : status === "bad" ? "#ef4444" : "#3b82f6")} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════ */
const SESSION_NAV_KEY  = "geo_nav_stack";
const SESSION_VIEW_KEY = "geo_view_state";

const GeoDrillDownPage = () => {
  const [nodes, setNodes]           = useState([]);
  const [boundaries, setBoundaries] = useState({});
  const [hoveredId, setHoveredId]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [tooltip, setTooltip]       = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [mobileTab, setMobileTab]           = useState("map");
  const [showRegions, setShowRegions]       = useState(false);
  const [activeKpi, setActiveKpi]           = useState(null); // key from KPI_CONFIG, or null
  const [thematicLoading, setThematicLoading] = useState(false);

  // rootLabel: name of the top-level entity (e.g. "Kenya"), populated from API after root loads
  const [rootLabel, setRootLabel] = useState("Kenya");
  // levelTypes: shapeid → shapetype of its children (e.g. { kenya_id: "County" })
  // Tells us what to call each drilled level: "Kenya Counties", "Garissa Sub-Counties", etc.
  const [levelTypes, setLevelTypes] = useState({});

  // Restore viewState from session (map position persists across navigations)
  const [viewState, setViewState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_VIEW_KEY);
      return saved ? JSON.parse(saved) : INITIAL_VIEW;
    } catch { return INITIAL_VIEW; }
  });

  /**
   * navStack — single source of truth for navigation + KPI.
   * Persisted in sessionStorage so navigating away and back restores the last state.
   */
  const [navStack, setNavStack] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_NAV_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Keep sessionStorage in sync whenever navStack or viewState changes
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_NAV_KEY, JSON.stringify(navStack)); } catch {}
  }, [navStack]);

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_VIEW_KEY, JSON.stringify(viewState)); } catch {}
  }, [viewState]);


  // Derived: current selected node for KPI panel = top of stack
  const selectedNode = navStack[navStack.length - 1] ?? null;

  // Ref-based busy lock — never stale in async callbacks
  const loadingRef = useRef(false);

  // The auto-drilled "home" node (e.g. Kenya). Clicking root breadcrumb returns here, not to /geo/root.
  // Populated on mount from sessionStorage (or set fresh on first load).
  const autoRootRef = useRef(null);

  // Signals that we're waiting for DeckGL to finish drawing thematic colors.
  // Set true in the click handler; cleared in onAfterRender (not a timeout).
  const waitingThematicRef = useRef(false);


  /* ── Load a geo level ── */
  const loadLevel = useCallback(async (parentShapeid = null) => {
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const url = parentShapeid
        ? `${GEO_BASE}/geo/drilldown/${parentShapeid}`
        : `${GEO_BASE}/geo/root`;

      console.log("[GeoDrillDown] fetching:", url);
      const res = await geoFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);

      const json = await res.json();
      console.log("[GeoDrillDown] response:", json);

      // Response shape: { data: { data: [...] } }  OR  { data: [...] }
      const list = json?.data?.data ?? json?.data ?? json?.results ?? [];
      const nodeList = Array.isArray(list) ? list : [];
      console.log("[GeoDrillDown] nodes found:", nodeList.length);
      setNodes(nodeList);

      // Root load: the single root node (e.g. Kenya) becomes the root breadcrumb label
      if (!parentShapeid && nodeList.length === 1) {
        setRootLabel(nodeList[0].shapename);
      }
      // Store this level's children shapetype so breadcrumbs can say "Kenya Counties" etc.
      const childType = nodeList[0]?.shapetype;
      if (childType) {
        const key = parentShapeid ?? "__root__";
        setLevelTypes((prev) => ({ ...prev, [key]: childType }));
      }

      // Fetch boundary for each child node
      const bMap = {};
      await Promise.allSettled(
        nodeList.map(async (node) => {
          try {
            const bRes = await geoFetch(`${GEO_BASE}/geo/boundary/${node.shapeid}`);
            if (!bRes.ok) { bMap[node.shapeid] = []; return; }
            const bJson = await bRes.json();
            console.log(`[GeoDrillDown] boundary RAW for ${node.shapeid}:`, bJson);
            const feats = extractFeatures(bJson, node.shapeid, node);
            bMap[node.shapeid] = feats;
            console.log(`[GeoDrillDown] boundary PARSED for ${node.shapeid}: ${feats.length} features`);
          } catch (e) {
            console.warn(`[GeoDrillDown] boundary fetch failed for ${node.shapeid}`, e);
            bMap[node.shapeid] = [];
          }
        })
      );

      // Leaf level: no children returned — fetch + show the parent's own boundary
      if (nodeList.length === 0 && parentShapeid) {
        try {
          const bRes = await geoFetch(`${GEO_BASE}/geo/boundary/${parentShapeid}`);
          if (bRes.ok) {
            const bJson = await bRes.json();
            const feats = extractFeatures(bJson, parentShapeid, null);
            bMap[parentShapeid] = feats;
            console.log(`[GeoDrillDown] leaf boundary for ${parentShapeid}: ${feats.length} features`);
          }
        } catch (e) {
          console.warn(`[GeoDrillDown] leaf boundary failed for ${parentShapeid}`, e);
        }
      }

      setBoundaries(bMap);
      return nodeList;

    } catch (err) {
      console.error("[GeoDrillDown] loadLevel error:", err);
      setError(err.message ?? "Failed to load geo data");
      return [];
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  /**
   * On mount: auto-drill strategy
   *
   * navStack[0] is ALWAYS the country node (Kenya). It is never rendered as a crumb —
   * it lives silently in the stack so KPI always shows Kenya data when at the home level.
   * Back button only appears when navStack.length > 1 (i.e. drilled past counties).
   *
   * Session restore: if navStack had [Kenya, Garissa, ...], resume at Garissa's children.
   * Fresh start:     load /geo/root → if single country → push it, load its children.
   */
  useEffect(() => {
    // Always (re)populate autoRootRef from session so root-crumb navigation works
    try {
      const saved = sessionStorage.getItem("geo_auto_root");
      if (saved) autoRootRef.current = JSON.parse(saved);
    } catch {}

    // Clear any stale session where Kenya was incorrectly stored in navStack without being
    // the auto-root — this forces a clean re-init on first load after this code change
    try {
      const savedStack = sessionStorage.getItem(SESSION_NAV_KEY);
      const savedRoot  = sessionStorage.getItem("geo_auto_root");
      if (savedStack && !savedRoot) {
        // Old session: Kenya was in navStack but no auto-root recorded — clear to force fresh start
        sessionStorage.removeItem(SESSION_NAV_KEY);
      }
    } catch {}

    const restoredStack = (() => {
      try {
        const s = sessionStorage.getItem(SESSION_NAV_KEY);
        return s ? JSON.parse(s) : [];
      } catch { return []; }
    })();

    if (restoredStack.length > 0) {
      // Session restore — navStack already initialised from useState; just reload the level
      const last = restoredStack[restoredStack.length - 1];
      loadLevel(last.shapeid);
    } else {
      // Fresh start: hit /geo/root, auto-drill single country
      (async () => {
        const rootNodes = await loadLevel(null);
        if (rootNodes.length === 1) {
          const country = rootNodes[0];
          autoRootRef.current = country;
          try { sessionStorage.setItem("geo_auto_root", JSON.stringify(country)); } catch {}
          // Push Kenya into navStack[0] — provides KPI data; hidden from crumb display
          setNavStack([country]);
          await loadLevel(country.shapeid);
        }
      })();
    }
  }, [loadLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Drill into a region ── */
  const handleSelect = useCallback(async (shapeid) => {
    if (loadingRef.current) return;
    const node = nodes.find((n) => n.shapeid === shapeid);
    if (!node) return;

    if (navStack.length > 0 && navStack[navStack.length - 1].shapeid === shapeid) return;

    const existingIdx = navStack.findIndex((n) => n.shapeid === shapeid);
    if (existingIdx !== -1) {
      setNavStack(navStack.slice(0, existingIdx + 1));
      await loadLevel(shapeid);
      return;
    }

    setNavStack((prev) => [...prev, node]);
    await loadLevel(shapeid);
  }, [nodes, loadLevel, navStack]);

  /* ── Drill up one level (never past navStack[0] = country) ── */
  const handleBack = useCallback(async () => {
    if (loadingRef.current) return;
    if (navStack.length <= 1) return;             // already at home (county) level
    const newStack = navStack.slice(0, -1);
    setNavStack(newStack);
    const parent = newStack[newStack.length - 1];
    await loadLevel(parent.shapeid);
  }, [navStack, loadLevel]);

  /* ── Jump to root (Kenya / county level) or a specific ancestor ── */
  const handleBreadcrumbNav = useCallback(async (idx) => {
    if (loadingRef.current) return;
    if (idx === -1) {
      // Root button: go back to country/county level — navStack = [Kenya]
      const country = autoRootRef.current;
      if (!country) return;
      setNavStack([country]);
      await loadLevel(country.shapeid);
      return;
    }
    // Jump to ancestor at idx (idx is relative to the VISIBLE crumbs, i.e. navStack[idx+1])
    const absIdx = idx + 1;
    const newStack = navStack.slice(0, absIdx + 1);
    setNavStack(newStack);
    await loadLevel(newStack[newStack.length - 1].shapeid);
  }, [navStack, loadLevel]);

  /* ── DeckGL features ── */
  const features = useMemo(() => {
    const all = Object.values(boundaries).flat();
    console.log("[GeoDrillDown] total features for DeckGL:", all.length, all.slice(0, 2));
    return all;
  }, [boundaries]);

  const geoLayer = useMemo(() => new GeoJsonLayer({
    id: "geo-drilldown",
    data: { type: "FeatureCollection", features },
    pickable: true,
    stroked: true,
    filled: true,
    getFillColor: (f) => {
      const sid  = f.properties?._shapeid;
      const node = f.properties?._node;
      if (activeKpi && node) {
        // Thematic mode: color by KPI value
        const val = node[KPI_CONFIG[activeKpi].field];
        const alpha = sid === hoveredId ? 140 : 80;
        return kpiColor(val, activeKpi, alpha);
      }
      // Default mode
      if (sid === selectedNode?.shapeid) return [242, 101, 34, 140];
      if (sid === hoveredId)             return [242, 101, 34, 60];
      return [59, 130, 246, 50];
    },
    getLineColor: (f) => {
      const sid = f.properties?._shapeid;
      if (activeKpi) return [255, 255, 255, 120];
      return sid === selectedNode?.shapeid ? [242, 101, 34, 255] : [59, 130, 246, 180];
    },
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    updateTriggers: {
      getFillColor: [selectedNode?.shapeid, hoveredId, activeKpi],
      getLineColor: [selectedNode?.shapeid, activeKpi],
    },
    onClick: ({ object }) => {
      const sid = object?.properties?._shapeid;
      if (sid) handleSelect(sid);
    },
    onHover: ({ object, x, y }) => {
      const sid = object?.properties?._shapeid;
      setHoveredId(sid ?? null);
      if (sid) {
        // _node is the full node object stored on the feature
        const node = object?.properties?._node ?? nodes.find((n) => n.shapeid === sid);
        setTooltip({ x, y, node, shapeid: sid });
      } else {
        setTooltip(null);
      }
    },
  }), [features, selectedNode, hoveredId, handleSelect, nodes, activeKpi]);

  /* ── KPI cards ── */
  const kpiCards = useMemo(() => {
    if (!selectedNode) return [];
    const { Voice_Traffic, Voice_CSSR, Data_Volume_in_MB, Site_Availability, Data_Success_Rate } = selectedNode;
    const callDrop = selectedNode["Call Crop Rate"] ?? selectedNode["Call_Drop_Rate"];
    return [
      { kpiKey: "Voice_Traffic",     label: "Voice Traffic",     value: fmtNumber(Voice_Traffic),               unit: "Erl",  status: "neutral", sparkColor: "#3b82f6" },
      { kpiKey: "Data_Volume",       label: "Data Volume",       value: fmtDataVolume(Data_Volume_in_MB),        unit: "",     status: "neutral", sparkColor: "#8b5cf6" },
      { kpiKey: "Call_Drop_Rate",    label: "Call Drop Rate",    value: callDrop != null ? (callDrop * 100).toFixed(4) : "—",   unit: "%", goal: "0.20",  status: callDrop != null ? (callDrop * 100 <= 0.2 ? "good" : "bad") : "neutral" },
      { kpiKey: "Voice_CSSR",        label: "Voice CSSR",        value: Voice_CSSR != null ? Number(Voice_CSSR).toFixed(2) : "—",         unit: "%", goal: "98.00", status: Voice_CSSR != null ? (Voice_CSSR >= 98 ? "good" : "bad") : "neutral" },
      { kpiKey: "Data_Success_Rate", label: "Data Success Rate", value: Data_Success_Rate != null ? Number(Data_Success_Rate).toFixed(2) : "—", unit: "%", goal: "95.00", status: Data_Success_Rate != null ? (Data_Success_Rate >= 95 ? "good" : "bad") : "neutral" },
      { kpiKey: "Site_Availability", label: "Site Availability", value: Site_Availability != null ? Number(Site_Availability).toFixed(3) : "—", unit: "%", goal: "99.70", status: Site_Availability != null ? (Site_Availability >= 99.7 ? "good" : "bad") : "neutral" },
    ];
  }, [selectedNode]);

  const groupedNodes = useMemo(() => {
    const map = {};
    nodes.forEach((n) => {
      const key = n.shapetype || n.shapegroup || "Regions";
      if (!map[key]) map[key] = [];
      map[key].push(n);
    });
    return map;
  }, [nodes]);

  /* ═══ RENDER ═══════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden" style={{ fontFamily: "inherit" }}>

      {/* ── Mobile tab bar ── */}
      <div className="flex md:hidden border-b border-gray-200 bg-white shrink-0">
        {[["map","Map"],["kpi","KPIs"]].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              mobileTab === tab
                ? "text-[#F26522] border-b-2 border-[#F26522]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Three-panel body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── CENTER: Map — 60% on desktop, full tab on mobile ── */}
        <div className={`
          relative min-w-0
          md:flex md:w-1/2
          ${mobileTab === "map" ? "flex flex-1" : "hidden md:flex"}
        `}>
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) => setViewState(vs)}
            controller
            layers={[geoLayer]}
            style={{ position: "absolute", inset: 0 }}
            getCursor={({ isDragging }) => isDragging ? "grabbing" : hoveredId ? "pointer" : "grab"}
            onAfterRender={() => {
              if (waitingThematicRef.current) {
                waitingThematicRef.current = false;
                // Give WebGL one extra frame to flush to screen before hiding the overlay
                requestAnimationFrame(() => setThematicLoading(false));
              }
            }}
          >
            <Map mapStyle={MAP_STYLE} reuseMaps attributionControl={false} />
            <style>{`.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.mapboxgl-ctrl-bottom-left,.mapboxgl-ctrl-bottom-right{display:none!important}`}</style>
          </DeckGL>

          {/* ── Floating nav bar — overlaid on map, top-left ── */}
          <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex items-start gap-2">
            <div className="pointer-events-auto flex items-center gap-1 bg-[#0d1629]/90 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg px-2.5 py-1.5 max-w-full overflow-x-auto scrollbar-none">

              {/* Back button — only when drilled past the county (home) level */}
              {navStack.length > 1 && (
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center gap-1 text-[11px] text-white hover:text-[#F26522] border border-white/20 hover:border-[#F26522]/40 rounded-md px-2 py-0.5 transition-colors disabled:opacity-40 shrink-0 mr-1"
                >
                  <ChevronLeft size={11} />
                  <span>Back</span>
                </button>
              )}

              {/* Divider */}
              {navStack.length > 1 && <div className="w-px h-4 bg-white/10 shrink-0" />}

              {/* Root crumb — always shows country name (e.g. "Kenya"), clicking resets to county level */}
              <button
                onClick={() => handleBreadcrumbNav(-1)}
                className="flex items-center gap-1 text-[11px] text-white hover:text-[#F26522] transition-colors shrink-0 whitespace-nowrap px-1"
              >
                <Home size={10} />
                <span>{rootLabel}</span>
              </button>

              {/* Path crumbs — navStack[0] is Kenya (hidden); crumbs start from navStack[1] */}
              {navStack.slice(1).map((node, idx) => {
                const isLast = idx === navStack.length - 2; // -2 because slice removes first entry
                const childTypePlural = pluralize(levelTypes[node.shapeid]);
                const label = childTypePlural
                  ? `${node.shapename} ${childTypePlural}`
                  : node.shapename;
                return (
                  <React.Fragment key={node.shapeid}>
                    <ChevronRight size={10} className="text-white/40 shrink-0" />
                    {isLast ? (
                      <span className="text-[11px] font-semibold text-[#F26522] shrink-0 whitespace-nowrap px-1 flex items-baseline gap-1">
                        <span>{node.shapename}</span>
                        {childTypePlural && <span className="text-[9px] font-normal text-white/30">{childTypePlural}</span>}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBreadcrumbNav(idx)}
                        className="text-[11px] text-white hover:text-[#F26522] transition-colors shrink-0 whitespace-nowrap px-1 flex items-baseline gap-1"
                      >
                        <span>{node.shapename}</span>
                        {childTypePlural && <span className="text-[9px] text-white/25">{childTypePlural}</span>}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Spinner */}
              {loading && (
                <>
                  <div className="w-px h-4 bg-white/10 shrink-0 ml-1" />
                  <Loader2 size={12} className="text-[#F26522] animate-spin shrink-0 ml-1" />
                </>
              )}

              {/* Regions toggle */}
              <div className="w-px h-4 bg-white/10 shrink-0 ml-1" />
              <button
                onClick={() => setShowRegions(v => !v)}
                className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                  showRegions
                    ? "bg-[#F26522]/20 text-[#F26522]"
                    : "text-white hover:text-white/80"
                }`}
              >
                <List size={12} />
                <span>Regions</span>
                {nodes.length > 0 && (
                  <span className="bg-white/10 text-white/60 text-[9px] px-1 rounded">{nodes.length}</span>
                )}
              </button>
            </div>

            {/* Error pill */}
            {error && (
              <div className="pointer-events-auto flex items-center gap-2 bg-red-900/80 backdrop-blur-sm border border-red-500/30 text-red-300 text-[11px] px-3 py-1.5 rounded-lg shadow-lg">
                <AlertCircle size={12} />
                <span>{error}</span>
                <button onClick={() => loadLevel(null)} className="underline hover:no-underline ml-1">Retry</button>
              </div>
            )}
          </div>

          {/* ── Floating regions panel ── */}
          {showRegions && (
            <div className="pointer-events-auto absolute top-12 left-3 z-20 w-52 bg-[#0d1629]/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl flex flex-col max-h-[70%]">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
                <span className="text-white/70 text-[10px] uppercase tracking-widest font-medium">
                  Regions {nodes.length > 0 && <span className="text-white/30">({nodes.length})</span>}
                </span>
                <button onClick={() => setShowRegions(false)} className="text-white/30 hover:text-white/70 transition-colors">
                  <X size={12} />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {loading && nodes.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-3 text-white/40 text-xs">
                    <Loader2 size={11} className="animate-spin" /> Loading…
                  </div>
                )}
                {!loading && nodes.length === 0 && (
                  <div className="px-3 py-3 text-center">
                    <p className="text-white/30 text-xs">Deepest level reached</p>
                  </div>
                )}
                {Object.entries(groupedNodes).map(([group, items]) => (
                  <div key={group}>
                    <button
                      onClick={() => setExpandedGroups(p => ({ ...p, [group]: !p[group] }))}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-white/30 hover:text-white/50 text-[9px] uppercase tracking-wider transition-colors"
                    >
                      <span>{group}</span>
                      <ChevronDown size={10} className={`transition-transform ${expandedGroups[group] === false ? "-rotate-90" : ""}`} />
                    </button>
                    {expandedGroups[group] !== false && items.map((node) => (
                      <button
                        key={node.shapeid}
                        onClick={() => { handleSelect(node.shapeid); setShowRegions(false); }}
                        onMouseEnter={() => !loadingRef.current && setHoveredId(node.shapeid)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors border-l-2 ${
                          selectedNode?.shapeid === node.shapeid
                            ? "border-[#F26522] bg-[#F26522]/10 text-[#F26522]"
                            : hoveredId === node.shapeid
                            ? "border-[#F26522]/40 bg-white/5 text-white/80"
                            : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: selectedNode?.shapeid === node.shapeid ? "#F26522" : "#3b82f6" }} />
                        <span className="truncate">{node.shapename}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading overlay on map */}
          {(loading || thematicLoading) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] pointer-events-none">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow text-sm text-gray-500">
                <Loader2 size={14} className="text-[#F26522] animate-spin" />
                {thematicLoading && !loading ? "Applying colors…" : "Loading…"}
              </div>
            </div>
          )}

          {/* Hover KPI tooltip card */}
          {tooltip && tooltip.node && (
            <div
              className="pointer-events-none absolute z-20 bg-white border border-gray-200 rounded-lg shadow-lg text-xs"
              style={{ left: tooltip.x + 16, top: tooltip.y - 20, minWidth: 200, maxWidth: 240 }}
            >
              {/* Header */}
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <p className="font-semibold text-gray-700 text-[11px]">{tooltip.node.shapename ?? tooltip.shapeid}</p>
                <p className="text-gray-400 text-[9px] uppercase tracking-wide">{tooltip.node.shapetype || tooltip.node.shapegroup}</p>
              </div>
              {/* KPI rows */}
              <div className="px-3 py-2 space-y-1.5">
                {[
                  ["Voice Traffic",    fmtNumber(tooltip.node.Voice_Traffic),                    "Erl"],
                  ["Data Volume",      fmtDataVolume(tooltip.node.Data_Volume_in_MB),             ""],
                  ["Voice CSSR",       tooltip.node.Voice_CSSR != null ? Number(tooltip.node.Voice_CSSR).toFixed(2) : "—",  "%"],
                  ["Data SR",          tooltip.node.Data_Success_Rate != null ? Number(tooltip.node.Data_Success_Rate).toFixed(2) : "—", "%"],
                  ["Availability",     tooltip.node.Site_Availability != null ? Number(tooltip.node.Site_Availability).toFixed(2) : "—", "%"],
                  ["Call Drop Rate",   tooltip.node["Call Crop Rate"] != null ? (tooltip.node["Call Crop Rate"] * 100).toFixed(4) : "—", "%"],
                ].map(([label, val, unit]) => (
                  <div key={label} className="flex justify-between items-center gap-4">
                    <span className="text-gray-400 text-[9px] uppercase tracking-wide shrink-0">{label}</span>
                    <span className="text-gray-700 font-semibold text-[11px]">
                      {val}{unit && <span className="text-gray-400 font-normal text-[9px] ml-0.5">{unit}</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 border-t border-gray-100 text-[9px] text-gray-400 text-center rounded-b-lg">
                Click to drill down
              </div>
            </div>
          )}

          {/* Hint */}
          {!selectedNode && !loading && nodes.length > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 border border-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
              Click a region to drill down
            </div>
          )}
        </div>

        {/* ── RIGHT: KPI Panel — 40% on desktop, full tab on mobile ── */}
        <div className={`
          flex flex-col overflow-y-auto bg-white border-l border-gray-200
          md:flex md:w-1/2
          ${mobileTab === "kpi" ? "flex flex-1" : "hidden md:flex"}
        `}>
          {/* Header */}
          <div className="px-4 py-3 shrink-0 bg-gray-50 border-b border-gray-200">
            <p className="text-gray-800 font-semibold text-sm leading-tight">
              {selectedNode ? selectedNode.shapename : "KPI Dashboard"}
            </p>
            <p className="text-gray-400 text-[10px] mt-0.5 uppercase tracking-wide">
              {selectedNode ? `${selectedNode.shapetype || "Region"} · KPI Overview` : "Select a region"}
            </p>
          </div>

          {/* Empty state */}
          {!selectedNode ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-6 gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M3 3v18h18" /><path d="m7 16 4-4 4 4 5-5" />
              </svg>
              <p className="text-center text-xs text-gray-400 leading-relaxed">
                Click a region on the map or in the list to view KPI details
              </p>
            </div>
          ) : (
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              {activeKpi && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-[10px] text-orange-600">
                  <span className="w-2 h-2 rounded-full bg-[#F26522] shrink-0" />
                  Map colored by <strong className="ml-0.5">{kpiCards.find(c => c.kpiKey === activeKpi)?.label}</strong>
                  <button onClick={() => setActiveKpi(null)} className="ml-auto text-orange-400 hover:text-orange-600 underline">Clear</button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {kpiCards.map((card) => (
                  <KPICard
                    key={card.label}
                    {...card}
                    active={activeKpi === card.kpiKey}
                    onClick={() => {
                      const next = activeKpi === card.kpiKey ? null : card.kpiKey;
                      if (next) {
                        // Show overlay before the render that recolors DeckGL polygons
                        waitingThematicRef.current = true;
                        setThematicLoading(true);
                      }
                      setActiveKpi(next);
                    }}
                  />
                ))}
              </div>

              {/* Metadata */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-400 space-y-1.5 mt-2">
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 font-medium">Details</p>
                {[
                  ["Shape ID",   selectedNode.shapeid],
                  ["Group",      selectedNode.shapegroup],
                  ["ISO",        selectedNode.shapeiso],
                  ["Parent",     selectedNode.parent_id],
                  ["Country",    selectedNode.country_name],
                  ["County",     selectedNode.county_name],
                  ["Sub-County", selectedNode.subcounty_name],
                  ["Ward",       selectedNode.ward_name],
                ].filter(([, v]) => v != null).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span>{k}</span>
                    <span className="text-gray-600 truncate text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default GeoDrillDownPage;
