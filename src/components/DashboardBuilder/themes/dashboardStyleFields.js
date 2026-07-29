import { FONT_FAMILY_OPTIONS } from '../../../theme/tokens';
import { POSITION_OPTIONS } from '../../Widgets/titlePositions';

// Phase 19 — dashboard-level style defaults, rendered via the same generic WidgetStyleFields
// renderer every widget's own per-instance style already uses (no new mechanism). Shared
// between DashboardCanvasEditor.jsx's "Dashboard Style" popover (19a, per-dashboard local
// overrides) and ThemeManager.jsx (19b, a reusable Theme's own style) — both edit the exact
// same field shape, just persisted to a different place (dashboard.theme vs a Theme resource).
// Deliberately coarse ("brand" basics only) — anything more specific belongs at the chart
// level, which already has its own full styleFields per widget type.
const DASHBOARD_STYLE_FIELDS = [
  // Canvas-level background (the dashboard's own page background) — distinct from `bgColor`
  // below, which is each individual widget card's background.
  { key: 'dashboardBgColor', label: 'Dashboard background color', type: 'color', default: null },
  { key: 'bgColor', label: 'Widget background color', type: 'color', default: null },
  // Two-stop gradient, mutually exclusive with bgColor above (gradient wins if set) — same
  // key names as each widget type's own bgGradientFrom/bgGradientTo styleFields
  // (widgetTypeRegistry.js's BG_GRADIENT_FIELDS), so the cascade needs no separate naming.
  { key: 'bgGradientFrom', label: 'Widget background gradient from', type: 'color', default: null },
  { key: 'bgGradientTo', label: 'Widget background gradient to', type: 'color', default: null },
  { key: 'accentColor', label: 'Accent color', type: 'color', default: null },
  // Styles the widget titles' cascade (every widget's own title text) — not the dashboard's
  // own title, see the dashboardTitle* fields below for that.
  { key: 'titleColor', label: 'Widget title color', type: 'color', default: null },
  { key: 'titleWeight', label: 'Widget title weight', type: 'select', default: 'normal', options: [{ value: 'normal', label: 'Normal' }, { value: 'bold', label: 'Bold' }] },
  { key: 'titleSize', label: 'Widget title size (px)', type: 'number', default: null, min: 8, max: 32 },
  { key: 'titleFont', label: 'Widget title font', type: 'select', default: '', options: FONT_FAMILY_OPTIONS },
  // Universal — every widget renders its title as plain HTML outside the chart canvas (see
  // TitleValueOverlay.jsx), unlike value position which only a few widget types even have.
  { key: 'titlePosition', label: 'Widget title position', type: 'position', default: 'top-left', options: POSITION_OPTIONS },
  // The dashboard's own title heading, rendered above the widget grid — distinct from each
  // widget's own title styled above.
  { key: 'dashboardTitleColor', label: 'Dashboard title color', type: 'color', default: null },
  { key: 'dashboardTitleWeight', label: 'Dashboard title weight', type: 'select', default: 'bold', options: [{ value: 'normal', label: 'Normal' }, { value: 'bold', label: 'Bold' }] },
  { key: 'dashboardTitleSize', label: 'Dashboard title size (px)', type: 'number', default: null, min: 12, max: 48 },
  { key: 'dashboardTitleFont', label: 'Dashboard title font', type: 'select', default: '', options: FONT_FAMILY_OPTIONS },
  // Axis label styling — same key names as each chart widget's own axisText* styleFields
  // (widgetTypeRegistry.js's AXIS_TEXT_STYLE_FIELDS), so the existing `style.axisTextColor
  // || dashboardAxisTextColor` cascade pattern applies with no separate naming scheme.
  { key: 'axisTextColor', label: 'Axis text color', type: 'color', default: null },
  { key: 'axisTextWeight', label: 'Axis text weight', type: 'select', default: 'normal', options: [{ value: 'normal', label: 'Normal' }, { value: 'medium', label: 'Medium' }, { value: 'semibold', label: 'Semibold' }, { value: 'bold', label: 'Bold' }] },
  { key: 'axisTextSize', label: 'Axis text size (px)', type: 'number', default: null, min: 8, max: 24 },
  { key: 'axisTextFont', label: 'Axis text font', type: 'select', default: '', options: FONT_FAMILY_OPTIONS },
  // Same key as each widget type's own valueDecimals styleField (widgetTypeRegistry.js's
  // VALUE_DECIMALS_FIELD) — rounds every displayed value (KPI Card number, gauge %, tooltip
  // values, bar/pie/funnel/waterfall value labels) to this many decimal places by default.
  { key: 'valueDecimals', label: 'Value decimal places', type: 'number', default: 2, min: 0, max: 4 },
];

export default DASHBOARD_STYLE_FIELDS;
