import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// FR-10 (Export): CSV/PNG/PDF export for the Dashboard Builder. Kept as plain functions
// (not React hooks/components) so both a per-widget action button and a whole-dashboard
// toolbar button can call the same code — export doesn't need to know *why* it was
// triggered, only *what* to export.

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCSV(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

/**
 * Converts one widget's already-resolved data (the same `resolved` object
 * resolveWidgetProps computes from a mock/kpiLive/db source) into CSV rows. Each data
 * shape (see mockDataSources.js's `dataShape` values) has a genuinely different row
 * layout, so this switches on `type` — the same `type`-not-`dataShape` habit used
 * elsewhere in this file, since e.g. kpiTable/degradedCellsTable share a dataShape but not
 * a row shape.
 */
function widgetDataToRows(type, title, resolved) {
  if (type === 'statCard') {
    return [['Metric', 'Value', 'Delta'], [title, resolved.value ?? '', resolved.delta ?? '']];
  }
  if (type === 'gaugeCard') {
    return [['Metric', 'Value'], [title, resolved.value ?? '']];
  }
  if (type === 'kpiTable' || type === 'degradedCellsTable') {
    const rows = resolved.rows || [];
    if (!rows.length) return [['(no data)']];
    const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object');
    return [keys, ...rows.map((r) => keys.map((k) => r[k]))];
  }
  if (type === 'scatterChart') {
    const points = resolved.data || [];
    return [['Name', 'X', 'Y'], ...points.map((p) => [p.name, p.x, p.y])];
  }
  if (type === 'stackedBarChart') {
    const categories = resolved.categories || [];
    const series = resolved.series || [];
    const header = ['Category', ...series.map((s) => s.name)];
    return [header, ...categories.map((cat, i) => [cat, ...series.map((s) => s.data?.[i] ?? '')])];
  }
  if (type === 'heatmapChart') {
    const days = resolved.days || [];
    const hours = resolved.hours || [];
    return [['Day', 'Hour', 'Value'], ...(resolved.data || []).map(([h, d, v]) => [days[d] ?? d, hours[h] ?? h, v])];
  }
  // Real (Chart Library) widgets — resolveWidgetProps' 'chartLibrary' branch only ever
  // produces `resolved.rows` (raw column-object rows from the query), never `.data`, so the
  // {label,value} default below silently exported zero rows for every real chart placed on
  // a dashboard (only legacy mock widgets have `.data`). Same "each row's own keys, in
  // first-row order" shape exportRowsCSV already uses for the Chart Library list's own export.
  if (type === 'chartLibrary') {
    const rows = resolved.rows || [];
    if (!rows.length) return [['(no data)']];
    const keys = Object.keys(rows[0]);
    return [keys, ...rows.map((r) => keys.map((k) => r[k]))];
  }
  // Default: the {label, value}[] shape shared by bar/line/pie/funnel/waterfall/treemap/
  // horizontalBar/area/sparkline.
  const series = resolved.data || [];
  return [['Label', 'Value'], ...series.map((d) => [d.label, d.value])];
}

/** Exports one widget's data as a standalone CSV file. */
export function exportWidgetCSV(type, title, resolved) {
  const csv = rowsToCSV(widgetDataToRows(type, title, resolved));
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${title || type}.csv`);
}

/**
 * Exports raw {rows} straight from getStandaloneWidgetData (plain array of row objects, one
 * key per column) — for a Chart Library list item, which has no `resolved` widget-props
 * object like a placed dashboard widget does (resolveWidgetProps never runs for it until
 * it's actually placed), so widgetDataToRows above doesn't apply. Column order follows the
 * first row's own key order (whatever the backend returned it in).
 */
export function exportRowsCSV(rows, title) {
  const table = !rows || !rows.length
    ? [['(no data)']]
    : [Object.keys(rows[0]), ...rows.map((r) => Object.keys(rows[0]).map((k) => r[k]))];
  triggerDownload(new Blob([rowsToCSV(table)], { type: 'text/csv;charset=utf-8;' }), `${title || 'chart'}.csv`);
}

/** Exports every widget's data as sections within one combined CSV file, so a whole
 * dashboard's data is one download instead of N separate files/a zip. */
export function exportDashboardCSV(dashboardName, widgetEntries) {
  const sections = widgetEntries.map(({ type, title, resolved }) => {
    const rows = widgetDataToRows(type, title, resolved);
    return `${csvEscape(title || type)}\n${rowsToCSV(rows)}`;
  });
  triggerDownload(new Blob([sections.join('\n\n')], { type: 'text/csv;charset=utf-8;' }), `${dashboardName || 'dashboard'}.csv`);
}

// Screenshots a DOM node via html2canvas — used for single-widget PNG export. Each widget's
// own node is a normal, statically-flowing element; only its *ancestor* (the
// react-grid-layout item wrapping it) is positioned via CSS transform, so capturing a
// widget's node in isolation doesn't hit the issue below.
async function captureNode(node) {
  // Without this, html2canvas can capture before the app's custom webfont ("Aptos", see
  // Layout.jsx) has finished loading and falls back to its own glyph rendering for that
  // text — usually imperceptible at small chart-title sizes, but very visible on larger
  // text (e.g. StatCard's value/label), which is what produced the jagged, wrong-looking
  // text reported from a real export. document.fonts.ready resolves once every requested
  // font is actually usable, so waiting on it first guarantees the real font is captured.
  await document.fonts.ready;
  return html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
}

/** Exports a single widget's own DOM node as a PNG. */
export async function exportWidgetPNG(node, title) {
  const canvas = await captureNode(node);
  canvas.toBlob((blob) => triggerDownload(blob, `${title || 'widget'}.png`));
}

// Whole-dashboard PNG/PDF export deliberately does NOT screenshot the whole canvas
// container in one html2canvas call. react-grid-layout positions every widget via CSS
// `transform` (translate), and html2canvas is well-documented to render blank/incomplete
// content for elements positioned this way once there are many of them nested inside one
// captured root — confirmed live: chart widgets and plain-HTML widgets alike came back as
// empty boxes, only their directly-painted background survived. Capturing each widget's
// own node individually (see captureNode above) doesn't have this problem, so the fix is to
// do that per widget and composite the results onto one output canvas ourselves, at each
// widget's real position — rather than asking html2canvas to walk the whole transformed
// tree in one pass.
async function compositeDashboardCanvas(containerNode, widgetNodes) {
  const scale = 2;
  const width = containerNode.scrollWidth;
  const height = containerNode.scrollHeight;
  const out = document.createElement('canvas');
  out.width = width * scale;
  out.height = height * scale;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);

  const containerRect = containerNode.getBoundingClientRect();
  for (const node of widgetNodes) {
    if (!node) continue;
    const rect = node.getBoundingClientRect();
    // Position within the *full scrollable content*, not just the visible viewport — an
    // export should include everything, not only what's currently scrolled into view.
    const x = (rect.left - containerRect.left + containerNode.scrollLeft) * scale;
    const y = (rect.top - containerRect.top + containerNode.scrollTop) * scale;
    // eslint-disable-next-line no-await-in-loop -- must composite in order, not in parallel
    const widgetCanvas = await captureNode(node);
    ctx.drawImage(widgetCanvas, x, y, rect.width * scale, rect.height * scale);
  }
  return out;
}

/** `widgetNodes` is every widget's own DOM node (e.g. Object.values of the ref map
 * DashboardCanvasEditor keeps) — `containerNode` is the scrollable canvas wrapper used to
 * compute each widget's relative position and the full content size. */
export async function exportDashboardPNG(containerNode, widgetNodes, dashboardName) {
  const canvas = await compositeDashboardCanvas(containerNode, widgetNodes);
  canvas.toBlob((blob) => triggerDownload(blob, `${dashboardName || 'dashboard'}.png`));
}

export async function exportDashboardPDF(containerNode, widgetNodes, dashboardName) {
  const canvas = await compositeDashboardCanvas(containerNode, widgetNodes);
  const imgData = canvas.toDataURL('image/png');
  // Page orientation/size matched to the captured canvas's own aspect ratio, so a wide
  // dashboard doesn't get cropped into a narrow portrait page.
  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(`${dashboardName || 'dashboard'}.pdf`);
}
