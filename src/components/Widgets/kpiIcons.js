import {
  Ban, Shield, Database, Activity, Check, TriangleAlert, Signal, Wifi, Phone, Gauge, Users, Zap,
  Clock, TrendingUp, Server, Globe, Radio, BarChart3,
} from 'lucide-react';

// Curated icon set for KPI-style cards (Big Number's "Title icon"; StatCard already takes an
// `icon` node, so KPI Card can reuse this too). Stored in style as the short key, never the
// component, so it serializes into mapping.style / widget.style like any other field.
// `none` first = no icon (the default).
export const KPI_ICONS = {
  shield: Shield,
  database: Database,
  activity: Activity,
  check: Check,
  alert: TriangleAlert,
  signal: Signal,
  wifi: Wifi,
  phone: Phone,
  gauge: Gauge,
  users: Users,
  zap: Zap,
  clock: Clock,
  trend: TrendingUp,
  server: Server,
  globe: Globe,
  radio: Radio,
  chart: BarChart3,
};

const LABELS = {
  shield: 'Shield (availability)', database: 'Database (volume)', activity: 'Activity (traffic)',
  check: 'Check (success rate)', alert: 'Alert (drop rate)', signal: 'Signal', wifi: 'Wi-Fi',
  phone: 'Phone (voice)', gauge: 'Gauge', users: 'Users', zap: 'Zap (power)', clock: 'Clock (latency)',
  trend: 'Trend', server: 'Server', globe: 'Globe', radio: 'Radio', chart: 'Chart',
};

// Options for an `iconSelect` style field (WidgetStyleFields.jsx's IconSelectRow).
export const KPI_ICON_OPTIONS = [
  { value: 'none', label: 'No icon', icon: Ban },
  ...Object.entries(KPI_ICONS).map(([value, icon]) => ({ value, label: LABELS[value] || value, icon })),
];
