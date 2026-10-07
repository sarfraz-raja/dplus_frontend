# CLAUDE.md

General instructions for working in this repository.

**Contents:** [1. Basics](#1-basics) · [2. Tech & modules](#2-current-technology--module-usage) · [3. Modular approach](#3-modular-approach) · [4. Reusable components](#4-reusable-components--utilities-catalogue) · [5. UI patterns](#5-ui-patterns-catalogue) · [6. Env vars](#6-environment-variables) · [7. API/error/dirty-state](#7-api-calls-error-handling--dirty-state) · [8. Coding standards](#8-coding-standards) · [9. Working conventions](#9-working-conventions) · [10. Git](#10-git--version-control) · [11. Known gaps](#11-known-housekeeping-items--gaps)

## 1. Basics

This is **NMS (dataplus)** — a telecom network management and analytics web app built with:

- **React 18** — component-based UI, functional components + hooks (no class components in new code).
- **Vite 7** — dev server and build tool. Run `npm run dev` for local development (HMR enabled). Do **not** run `npm run build` unless explicitly required — the dev server already gives live reload.
- **Tailwind CSS 3** — primary styling approach. Utility classes are used directly in JSX; theme tokens (colors like `primaryLine`, `secLine`, `pbutton`) are defined in `tailwind.config.js` and backed by CSS variables (`--mainprimary`, `--mainsec`, `--topbar`) for light/dark theming (`data-theme="dark"` selector).
- **Plain CSS** — a small number of global/legacy stylesheets (`src/App.css`, `src/index.css`, `src/components/MapComponents/mapstyles.css`) for things Tailwind doesn't cover well (map/vendor widget overrides).

## 2. Current technology & module usage

| Category | Technology / Library | Version | Usage in this app |
|---|---|---|---|
| Framework | React | ^18.2.0 | Core UI library, functional components + hooks |
| Build tool | Vite | ^7.3.1 | Dev server, bundling (`vite-plugin-compression2` for gzip/brotli output) |
| Routing | react-router-dom | ^6.20.1 | Client-side routing/navigation (`Navigation.jsx`, `ProtectedRoute.jsx`) |
| State management | @reduxjs/toolkit + react-redux | ^2.0.0 / ^9.0.0 | Global app state, split by domain in `src/store/actions` & `src/store/reducers` |
| Styling | Tailwind CSS | ^3.3.5 | Primary utility-first styling, theme tokens via CSS vars |
| Styling | Plain CSS | — | Legacy/global styles and vendor overrides (`App.css`, `index.css`, `mapstyles.css`) |
| Styling utils | tailwind-merge, tailwind-scrollbar, clsx | ^2.2.0 / ^3.1.0 / ^2.1.0 | Conditional/merged class names, styled scrollbars |
| Maps / GIS | @deck.gl (core, layers, react, extensions, widgets) | ^9.2.11 | **Active — primary map engine.** WebGL layer rendering for the new map system: `components/MapsUsingDeckgl/TelecomMap.jsx`, `pages/GeoDrillDown/GeoDrillDownPage.jsx`, `pages/SuperSet/SyncedVendorMaps.jsx`, `components/DashboardBuilder/legacy/widgets/DegradedCellsMap.jsx`, `store/actions/map-actions.js` |
| Maps / GIS | maplibre-gl | ^4.7.1 | **Active — base map for deck.gl.** Supplies the underlying vector-tile base map that deck.gl's WebGL layers render on top of, via `react-map-gl`, in the same files as deck.gl above, plus loaded globally in `main.jsx` |
| Maps / GIS | react-map-gl | ^8.1.0 | **Active — React wrapper.** Bridges deck.gl + maplibre-gl into React components in the files listed above |
| Maps / GIS | pmtiles | ^4.4.1 | **Active — tile format.** PMTiles vector-tile source consumed by the maplibre-gl base map (`TelecomMap.jsx`, `DegradedCellsMap.jsx`, `telecomMapStyleOptions.js`, wired up in `main.jsx`) |
| Maps / GIS | mapbox-gl | ^2.15.0 | **Stale — not used.** Only reference is a commented-out import in `TelecomMap.jsx` (`// import mapboxgl from "mapbox-gl";`), left over from before the switch to maplibre-gl. Safe-to-remove candidate once confirmed with the team; kept in `package.json` for now per [[feedback_no_dead_code_removal]] (don't remove without an explicit ask) |
| Maps / GIS | leaflet, react-leaflet, leaflet.markercluster, leaflet-routing-machine | ^1.9.4 / ^4.2.1 / ^1.5.3 / ^3.2.12 | **Stale — not used.** Only consumer is `components/Map.jsx`, which is not imported by any page or component. Predates the deck.gl map system |
| Maps / GIS | ol (OpenLayers) | ^8.2.0 | **Stale — not used.** Only real consumer is `components/MapOpenLayer.jsx`, which is not imported by any page or component. `pages/CustomQuery/DBConfig.jsx` also references `ol` but only in a commented-out import |
| Charts | echarts, echarts-for-react | ^6.1.0 / ^3.0.6 | Primary charting engine (Dashboard Builder charts) |
| Charts | recharts | ^2.12.2 | React-native chart components |
| Charts | chart.js | ^4.5.1 | Additional/legacy charting |
| BI embedding | @superset-ui/embedded-sdk | ^0.3.0 | Embeds Apache Superset dashboards (`SuperSet` page) |
| BI embedding | powerbi-client-react | ^1.4.0 | Embeds Power BI reports (`PowerBi.jsx`, `CommonPowerBI.jsx`) |
| Auth | @azure/msal-browser | ^5.11.0 | Azure AD / MSAL authentication (`authConfig.js`) |
| Realtime | socket.io-client | ^4.7.1 | WebSocket-based realtime updates (`socket.js`, websocket actions/reducer) |
| HTTP | axios | ^1.6.2 | API requests (`utils/api.js`) |
| Forms | react-hook-form | ^7.48.2 | Form state/validation |
| Forms | react-querybuilder | ^6.5.4 | Visual query builder UI (`CustomQuery`, `ProRules`) |
| Forms | react-datepicker, react-datetime-picker | ^4.25.0 / ^5.6.0 | Date/time inputs |
| Forms | multiselect-react-dropdown | ^2.0.25 | Multi-select dropdowns |
| UI feedback | sweetalert, sweetalert2, react-sweetalert2 | various | Modal alerts/confirmations |
| UI feedback | react-hot-toast | ^2.6.0 | Toast notifications |
| Icons | @fortawesome/fontawesome-free, @iconscout/react-unicons, lucide-react | various | Icon sets used across UI |
| Layout | react-grid-layout | ^2.2.3 | Draggable/resizable dashboard grid (Dashboard Builder) |
| Utility | react-draggable | ^4.4.6 | Draggable UI elements (modals, panels) |
| Utility | react-reverse-portal | ^2.1.1 | Portal-based component reuse (map/dashboard widgets) |
| Utility | moment | ^2.29.4 | Date/time manipulation |
| Export | html2canvas, jspdf | ^1.4.1 / ^4.2.1 | Exporting dashboards/reports to image/PDF |
| Linting | eslint + react/react-hooks/react-refresh plugins | ^8.53.0 | Code linting (`npm run lint`) |
| CSS tooling | postcss, autoprefixer | ^8.4.32 / ^10.4.16 | Tailwind CSS processing pipeline |

### Feature module map

| Module (folder) | Purpose |
|---|---|
| `src/pages/*` | One folder/file per route/feature (Admin, AlertMonitoringSystem, DashboardBuilder, iSON, CustomQuery, GeoDrillDown, Tickets, Grafana, nifi, etc.) |
| `src/pages/Assurance/`, `src/pages/Tickets/`, `src/pages/Admin/SlaProfileManager/`, `src/pages/Admin/EscalationPolicyManager/` | Intelligent Telecom Assurance — rule builder and rule list, incident list, the ticket board/panel (shared with manual tickets), SLA profiles and escalation policies. Entirely separate from the older xAlerts module (`AlertMonitoringSystem/`). State in `store/actions/assurance-actions.js` |
| `src/components/MapsUsingDeckgl/` | New deck.gl + MapLibre based telecom map system (active development) — map canvas, layer panels, thematics, legends, filters |
| `src/components/MapComponents/` | Shared/legacy map UI pieces and map-specific CSS |
| `src/components/DashboardBuilder/` | Drag-and-drop dashboard builder — `charts/`, `filters/`, `datasource/`, `themes/`, `widgetConfig/`, `legacy/` |
| `src/components/FormElements/` | Reusable form input components |
| `src/components/Widgets/`, `src/components/Records/` | Shared dashboard widgets and record/table display components |
| `src/store/actions/`, `src/store/reducers/` | Redux Toolkit state, one action/reducer file pair per domain |
| `src/utils/` | Shared helpers: API client, common functions, query builder, sidebar/nav config, sockets |

## 3. Modular approach

The app follows a feature-oriented, modular folder structure under `src/`:

- `src/pages/` — one folder or file per feature/route (e.g. `AlertMonitoringSystem/`, `DashboardBuilder.jsx`, `iSON/`, `CustomQuery/`). Pages compose components; route-specific logic stays local to the page's folder.
- `src/components/` — shared and feature-scoped components. Large features get their own subfolder (`DashboardBuilder/`, `MapsUsingDeckgl/`, `MapComponents/`, `FormElements/`, `Widgets/`, `Records/`) with further subfolders by concern (e.g. `DashboardBuilder/charts`, `.../filters`, `.../datasource`, `.../themes`, `.../widgetConfig`).
- `src/store/` — Redux Toolkit state, split by domain into `actions/` and `reducers/` (e.g. `map-actions.js` / `map-reducer.js`, `dashboardBuilder-actions.js`, `alertConfiguration-reducer.js`). Each feature owns its own action/reducer pair rather than one monolithic slice.
- `src/utils/` — cross-cutting helpers (`api.js`, `commonFunnction.js`, `queryBuilder.js`, `url.js`, `socket.js`, `sidebar_values.jsx` for nav config).
- `src/context/` — React Context providers for cross-tree state not suited to Redux.
- `src/theme/` — theming support.

**Guideline:** keep new code inside the module it belongs to. New features should get their own page folder / component subfolder and their own action-reducer pair rather than growing an existing shared file.

## 4. Reusable components & utilities catalogue

Not something that was implicitly covered elsewhere — worth an explicit inventory, since it surfaced dead/near-dead duplicates the same way section 2's technology audit did for libraries. Check this list before writing a new shared component or helper; usage counts are import-site counts across `src/`.

| Component / function | File | Purpose | Usage |
|---|---|---|---|
| `Button` | `components/Button.jsx` | Primary/secondary styled button, the default for actions across pages | 63 — the most reused component in the app |
| `Modal` | `components/Modal.jsx` | Generic modal shell | 29 |
| `FormModal` | `components/FormModal.jsx` | Modal pre-wired with header/footer for Add/Edit forms — the standard for List + Modal CRUD (section 5) | 20 |
| `DataTable` | `components/DataTable.jsx` | Searchable/counted table used by most CRUD list pages | 15 |
| `CommonForm` | `components/CommonForm.jsx` | Shared form-field renderer | 12 |
| `DeleteButton` / `EditButton` | `components/DeleteButton.jsx` / `EditButton.jsx` | Standard row-action icon buttons | 10 each |
| `AdvancedTable` (+ `AdvancedTableExpandable`, `AdvancedTableExpandableOneRow`) | `components/AdvancedTable*.jsx` | Richer table variants (expandable rows) for pages needing more than `DataTable` | 10 |
| `ToggleButton` | `components/ToggleButton.jsx` | Standard on/off switch (note: `XAlertScheduler.jsx` currently defines its own local `Toggle` instead of using this — worth reusing this component the next time that file is touched) | 9 |
| `FIleUploader` | `components/FIleUploader.jsx` (filename typo, not `FileUploader`) | File upload UI | 6 |
| `Table` | `components/Table.jsx` | Plain table, simpler than `DataTable`/`AdvancedTable` | 7 |
| `EmailChipInput` | `components/EmailChipInput.jsx` | Chip-style multi-email input (report/alert recipients) | 4 |
| `ConfirmModal` | `components/ConfirmModal.jsx` | Shared delete/discard confirmation dialog — **under-used**, see section 7's "confirm-before-delete is duplicated" note | 3 |
| `CustomTooltip` | `components/CustomTooltip.jsx` | Shared tooltip | 2 |
| `Loaders` | `components/Loaders.jsx` | Global loading overlay, mounted once at `App.jsx` root (driven by `ComponentActions.loaders`, see section 7) | 1 (by design — singleton) |
| `CustomDropdown` | `components/CustomDropdown.jsx` | Single-select dropdown | 3 |
| `cn()` | `utils/common.jsx` | `clsx`/`tailwind-merge` class-name combiner — use this instead of manual template-string class concatenation | — |
| `getApiErrorMessage(res)` | `utils/common.jsx` | Turns a failed `Api.*` response into the text to show: the backend's `msg` for 4xx, a generic retry message for 5xx. Use it wherever a rejected call is surfaced (see section 7 — `Api` resolves error responses, it doesn't throw) | Assurance, Tickets, DB Config |
| `wholeNumber` | `utils/common.jsx` | `react-hook-form` `validate` rule for fields the backend requires to be integers | Assurance rule builder, SLA/escalation forms |
| `getDefaultDb(list)` / `dbOptionLabel(db)` | `utils/common.jsx` | Global default database (set by an Admin on Custom Query → DB Config; `GET /querybuilder/getDatabase` marks one item `is_default`). Every database dropdown uses these two: pre-select the default on **new** records only (an edit keeps its saved DB) and label it "(Default)" | Query Workbench (SQL + Visual Builder), `VisualQueryBuilder`, xAlerts Configure / Alert Scheduler forms, Assurance rule builder |
| `TELECOM_CONSTANTS` | `pages/Tickets/ticketConstants.js` | Single source for ticket/Assurance option lists. Severity is `Critical / Major / Minor / Warning` (the backend-enforced rule enum; older manual tickets may still hold `S1`–`S4`), priority is `Critical / High / Medium / Low` — used by the ticket forms, the Assurance rule builder, SLA profiles and escalation policies. Don't re-declare these lists locally | Tickets, Assurance, Admin SLA/Escalation |
| `StyleModeSwitch` | `components/DashboardBuilder/widgetConfig/StyleModeSwitch.jsx` | Light \| Dark switch above any style panel whose colors are stored per mode — used by the Charts-tab Style panel, the dashboard editor (pinned left-panel switch + Dashboard Style popover) and Settings → Themes | 4 (all inside `DashboardBuilder/`) |
| `ChartStylePicker` | `components/DashboardBuilder/charts/ChartStylePicker.jsx` | Searchable, type-filterable, themed picker for "Copy style from another chart" (replaces a native `<select>`) | 1 |
| `DashboardTabBar` | `components/DashboardBuilder/dashboard/DashboardTabBar.jsx` | Horizontal dashboard-tabs strip (add/rename/delete, reuses `ConfirmModal` for delete) rendered above `DashboardCanvasEditor`'s grid whenever a dashboard has `tabs.length > 0` — additive/opt-in, no bar at all for a dashboard with no tabs | 1 (inside `DashboardCanvasEditor`, also mounted read-only via `EmbeddedDashboard`) |
| `themedStyle.js` helpers | `components/DashboardBuilder/utils/themedStyle.js` | Per-mode style colors: widget/dashboard/theme styles keep shared settings flat and colors under `colors.{light,dark}`; `resolveStyleForMode` flattens for the active theme, `mergeStyleLayers`/`setModeColor`/`copyStyleFields` edit them, `guardStyleColors` drops unreadable saved colors at render. Old flat colors = both modes | — |
| `objectToQueryString`, `objectToArray`, `moreinfo` | `utils/commonFunnction.js` | Query-string building, object/array conversion, text truncation helpers | — |

**Stale/near-dead, don't build on these:**
- `components/CommonFormTwo.jsx` — not imported anywhere in `src/`. Likely superseded by `CommonForm.jsx`.
- `components/Map.jsx`, `components/MapOpenLayer.jsx` — already flagged stale in section 11 (Leaflet/OpenLayers, superseded by the deck.gl map system).
- `components/Records/` (`Index.jsx`, `NoData.jsx`, `Retry.jsx`) — not imported anywhere in `src/`. A dead "no data / retry" state module.

### Module-wise breakdown

The top-level shared components above aren't evenly spread — some are genuinely app-wide, others cluster in a handful of feature modules (worth knowing before assuming a component is "the standard" everywhere):

| Module | Shared top-level components it uses | Notes |
|---|---|---|
| `pages/CX_IXSupport/` | `Button`, `Modal`, `CommonForm`, `DeleteButton`, `EditButton`, `AdvancedTable`, `ToggleButton` | Heaviest user of the classic CRUD component set — closest thing to a reference implementation of List + Modal CRUD |
| `pages/ProRules/` | Same set as CX_IXSupport (`Button`, `Modal`, `DeleteButton`, `EditButton`, `AdvancedTable`, `ToggleButton`, `FIleUploader`) | Mirrors CX_IXSupport's component choices closely |
| `pages/NokiaToolManagement/` (+ dead `NokiaToolCategory/` duplicate) | Same CRUD set again (`Modal`, `CommonForm`, `DeleteButton`, `EditButton`, `AdvancedTable`, `FIleUploader`) | Third near-identical user of this exact component combination |
| `pages/AlertMonitoringSystem/` | `Button`, `FormModal`, `DataTable`, `EmailChipInput` | Uses `FormModal`+`DataTable` (the more modern CRUD pairing) rather than `Modal`+`AdvancedTable` |
| `pages/Admin/*` | `Button`, `FormModal`, `DataTable` | Same modern pairing as AlertMonitoringSystem |
| `pages/DataPlusAnalytics/*` | `Button`, `DataTable`, `FIleUploader`, `FormElements/*` | Also modern pairing; heaviest external user of `src/components/FormElements/` |
| `pages/CustomQuery/` | `Button`, `Modal`, `CommonForm`, `DeleteButton`, `EditButton`, `AdvancedTable`, `Table`, `FormElements/AutoSuggestion` | Mixes both the classic and modern component sets in one module |
| `components/DashboardBuilder/` | `Button`, `FormModal`, `ConfirmModal`, `CustomTooltip` | The only module actually using `ConfirmModal` as intended, plus its own internal-only `Widgets/*` chart set (see below) |
| `components/MapsUsingDeckgl/` | `CustomTooltip`; own local components otherwise | Mostly self-contained — builds its own panels/legends rather than reusing the generic CRUD components (expected, given it's a Map-based UI per section 5, not a CRUD page) |
| `pages/DiscussionForum/`, `pages/KPIProcessingEngine/`, `pages/Ericsson/`, `pages/iSON/`, `pages/InsightsEngine/`, `pages/Tickets/` | Light/one-off use of `Modal`/`Button`/`DataTable`/`FormModal` | Not heavy component consumers; nothing distinctive to standardize on yet |

**Module-scoped (not globally shared) reusable pieces:**
- `components/DashboardBuilder/Widgets/*` (chart components: `BarChart`, `PieChart`, `AreaChart`, `StatCard`, etc.) — used exclusively inside `DashboardBuilder/` (via `charts/renderChartWidget.jsx` and `widgetConfig/widgetTypeRegistry.js`), not imported by any other module. Treat these as DashboardBuilder-internal, not general-purpose chart components — a page outside DashboardBuilder needing a chart should use `echarts`/`recharts` directly (section 2), not reach into `Widgets/`.
- `components/FormElements/*` — genuinely cross-module (`AutoSuggestion` used in 8 files, `DatePicking` in 7, across `DataPlusAnalytics`, `CustomQuery`, `ProRules`, `MapBox`), but the remaining fields in that folder (`FilePicker`, `Multiselection`, `Password`, `RangeBar`, `TextArea`, `TextBox`) each have only 0-2 usages — check whether a form actually needs one of these before assuming it's a proven, load-bearing component.
- `components/MapComponents/MapFilters.jsx` — shared between `MapsUsingDeckgl/` and `TelecomMultipleMapsPage.jsx`; the rest of `MapComponents/` (besides `mapstyles.css`) has no other live consumer.

**Guideline:** when building a new CRUD page, follow whichever pairing the nearest similar module already uses (`FormModal`+`DataTable` for anything under Admin/AlertMonitoringSystem-style modules, `Modal`+`AdvancedTable` for anything extending CX_IXSupport/ProRules/NokiaToolManagement) rather than introducing a third combination — see section 5's "match existing patterns" principle.

**Guideline:** before adding a new shared component, check this table (and re-scan usage counts if it's been a while) — extend an existing component's props rather than adding a near-duplicate, per section 8's "reusable code" standard. Update this table when a new genuinely-reusable component/helper is added, or when one of these becomes stale.

## 5. UI patterns catalogue

The app's pages fall into a handful of recurring UI patterns. When building a new page, pick the pattern that matches its job instead of defaulting to List + Modal CRUD (the current default is the most-used but least distinctive pattern, and the first candidate for a future visual refresh).

| Pattern | Examples | Common features | When to prefer |
|---|---|---|---|
| **Single-form / config page** | `/xalerts/report-scheduler/new` (`XReportSchedulerFormPage.jsx`), `/admin/zoom-settings` (`ZoomSettingsManager.jsx`), `/custom-query/workbench` (`QueryWorkbench.jsx`) | One page, one focused form/config surface; no step wizard, no big module; local component state (`useState`) drives the form; a save/submit action posts to one or two APIs | The page's whole job is "configure/create/edit one thing" and it doesn't need to be broken into steps or a list |
| **Multi-step wizard** | `/xalerts/alert-scheduler/new` (`XAutomaticAlerts.jsx`), `/assurance/rules/new` + `/edit/:id` (`Assurance/AssuranceRuleForm.jsx` — 8-step rule builder; `/view/:id` renders the same component as a read-only summary) | Numbered step indicator with Previous/Next, a "Review & Create" final step, Cancel/Preview actions in a persistent header/footer, one step's content swapped in a content panel | Creating/editing something with enough distinct sections (data source, conditions, schedule, notifications, etc.) that one long form would be overwhelming |
| **List + Modal CRUD (table-based)** | Most of `AlertMonitoringSystem`, `Admin/UserManagement`, `Admin/RoleManagement`, `DataPlusAnalytics/*`, `NokiaToolManagement`, `CX_IXSupport/*`, `/assurance/rules` (`Assurance/AssuranceRuleList.jsx`), `Admin/SlaProfileManager`, `Admin/EscalationPolicyManager`; read-only variant: `/assurance/incidents` (`Assurance/IncidentList.jsx` — `DataTable` + `Tickets/IncidentModal` detail, no create/edit since incidents are fully automatic) | `DataTable` listing rows, a `FormModal` for Add/Edit reusing one form component, a delete-confirm modal, search/count header | Quick CRUD over one entity where there's no strong reason yet to invest in a richer layout — the "default"/plainest pattern, and the main candidate for future visual improvement |
| **Large builder/canvas module** | `/dashboard-builder` (`DashboardBuilder.jsx` + `components/DashboardBuilder/*`), `/admin/insights-dashboard-manager` (`InsightsDashboardManager.jsx`) | Not one form/list — a whole subsystem: drag-and-drop grid canvas (`react-grid-layout`), a widget palette/config panel, per-widget data source & chart-type config, theming, save/publish flow, its own `charts/`, `filters/`, `datasource/`, `themes/`, `widgetConfig/` submodules | Only for genuinely large, multi-part authoring tools — not a template to copy for a simple CRUD page |
| **Kanban / card board** | `/tickets` (`Tickets/index.jsx`) | Cards grouped into status columns, stat tiles header (`grid grid-cols-2 sm:grid-cols-4`), chat/detail modal per card (`ChatModal.jsx`: details, lifecycle buttons, activity, chat), no background board polling — see "Refresh / polling" in section 7 | Work-item / ticket-style data where status and flow matter more than tabular fields |
| **Dashboard / analytics view** | `NetworkComplaintsDashboard.jsx`, `Dashboard.jsx`, `InsightsEngine/BIDashboard.jsx`, embedded BI pages (`SuperSet/*`, `PowerBi.jsx`, `Grafana/GrafanaDashboard.jsx`) | KPI tiles + chart grid, mostly read-only, chart.js/echarts/recharts or an embedded BI iframe/SDK, little to no user-entered form data | Reporting/monitoring screens meant for viewing metrics, not editing records |
| **Map-based UI** (separate axis, can combine with any of the above) | `TelecomMapsPage.jsx`, `TelecomMultipleMapsPage.jsx`, `GeoDrillDown/GeoDrillDownPage.jsx`, `SuperSet/SyncedVendorMaps.jsx` | Full-canvas deck.gl/maplibre map, floating side panels/toolbars/legends instead of page scroll, layer/thematics controls | Any feature centered on geospatial visualization rather than records or metrics |

**Note for future work:** the List + Modal CRUD pattern is intentionally called out as the weakest/most generic of these — when asked to "improve" a page's UI, this is the pattern most likely to be replaced with something closer to the single-form/config or wizard patterns above, depending on how many fields/steps the underlying entity actually needs.

## 6. Environment variables

All runtime config is via Vite env vars (`import.meta.env.VITE_*`), never hardcoded URLs/flags in source. `.env` at the repo root is the source of truth — it holds the real, live values for whichever deployment is currently active (e.g. Malawi), and is gitignored (`.gitignore` says "NEVER PUSH") so it's never committed. `.env.example` is just the shareable template (structure/defaults) for someone setting up a new environment; it can lag behind `.env`, so check `.env` itself for what's actually driving the running app.

`.env` also doubles as a per-deployment config archive: other deployments' values (Gabon/Airtel, TNM/Malawi variants) are kept as commented-out blocks in the same file so switching target deployment is a matter of commenting/uncommenting blocks rather than hunting through history. Keep that pattern when adding a new deployment's config.

Current variables (see `.env` for the live values and `.env.example` for the template/comments):

| Variable | Used in | Purpose |
|---|---|---|
| `VITE_API_BASE_URL`, `VITE_ASSET_BASE_URL`, `VITE_SOCKET_URL` | `src/utils/url.js` | Backend API, static asset, and Socket.IO base URLs |
| `VITE_READ_ONLY_MODE` | `src/utils/url.js`, `src/utils/api.js` | Blocks write requests to a fixed list of API paths for safe frontend-only testing against a shared/prod DB |
| `VITE_BLOCK_SOCKET_EMIT` | `src/utils/url.js` | Disables outgoing socket emits (defaults to `VITE_READ_ONLY_MODE`) |
| `VITE_MAPBOX_TOKEN` | `src/components/MapsUsingDeckgl/TelecomMap.jsx` | Mapbox token, if that base map is ever re-enabled |
| `VITE_OFFLINE_MAPS_ENABLED` | `TelecomMap.jsx`, `DegradedCellsMap.jsx` | Toggles local PMTiles offline basemap vs online CARTO tiles |
| `VITE_PMTILES_PATH` | same as above | Path to the local `.pmtiles` basemap file |
| `VITE_CARTO_API_KEY` | same as above | API key for the online CARTO basemap fallback |
| `VITE_DEFAULT_MAP_LAT` / `VITE_DEFAULT_MAP_LNG` | `DegradedCellsMap.jsx` | Default map center when no data-driven center is available |
| `VITE_GEO_DRILLDOWN_ENABLED` | routing/sidebar config | Feature-flags the Geo Drill-Down module on/off |
| `VITE_MICROSOFT_AUTH_ENABLED`, `VITE_CLIENT_ID` | `src/main.jsx`, `src/authConfig.js` | Toggles Microsoft/Azure AD SSO login and its MSAL client ID |
| `VITE_TIME_ZONE` | `TopBar.jsx`, `resolveTimeRange.js` | Deployment display timezone (defaults to `Africa/Libreville`) |
| `VITE_NATIVE_FILTER_ID` | `TelecomMap.jsx` | Superset native filter ID used for cell-name filtering |
| `VITE_SUPERSET_UI_ORIGIN`, `VITE_SUPERSET_GUEST_TOKEN_URL` | `src/utils/url.js` | Embedded Superset dashboard origin + guest-token endpoint |
| `VITE_GRAFANA_URL` | `src/utils/url.js` | Embedded Grafana origin |

**Guideline:** when adding config that varies per environment/deployment, add a `VITE_*` var (with a commented default in `.env.example`), read it via `import.meta.env`, and add a row to the table above — don't hardcode URLs, tokens, or feature toggles in source.

## 7. API calls, error handling & dirty-state

Current state, as found in the code — mixed, not fully consistent yet:

- All HTTP goes through `src/utils/api.js`'s `Api` object (`get`/`post`/`patch`/`put`/`delete`/`upload`/`blobFile`), which wraps three axios instances. It already handles attaching the bearer token, a global loader spinner (`ComponentActions.loaders`), 401 → auto-logout, and `VITE_READ_ONLY_MODE` write-blocking for demo/read-only deployments. New API calls should go through `Api`, not raw `axios`.
- `src/store/actions/common-actions.js` provides generic `postApiCaller`/`getApiCaller`/`deleteApiCaller` thunks used by most List + Modal CRUD pages (see section 5). **Fixed** — their `catch` blocks now call a shared `handleApiError(err, phase)` helper that shows a `react-hot-toast` error (message from `err.response.data.message`, falling back to `err.message`, then a generic string) and, in dev only, logs `[common-actions:<phase>] <status> <url> <message>` via `console.warn` — the same dev-gated, no-full-body-logging pattern as `utils/api.js`'s `logApiError`. Any List + Modal CRUD page using these thunks now surfaces failures automatically.
- **`Api.*` does not throw on an HTTP error status** — its interceptor resolves the error response. A `try/catch` alone never sees a 4xx/5xx: check `res?.status` and show `getApiErrorMessage(res)` (section 4) on anything that isn't the expected success code. Code that only does `if (res?.status !== 200) return` fails silently — this was the cause of several "nothing happens" bugs (DB Config save, ticket create). `CommonActions.deleteApiCaller` has the same gap: on a rejected delete it returns without calling back or toasting, which can leave a "Deleting…" state stuck — call `Api.delete` directly where the refusal must be shown.
- **Don't send a list row back as the save payload.** Forms that fill themselves with `Object.keys(formValue).forEach(setValue)` also echo every read-only column the list returns (`create_time`, `is_default`, …). Some backend handlers write every key they receive straight into the table, so a new list column can start crashing an existing edit (DB Config did, with a 500). Strip read-only keys before saving, or build the payload from an explicit field list.
- **Confirm-before-delete is duplicated, not reused**: a shared `components/ConfirmModal.jsx` exists but is only actually used in 3 files (`ChartLibrary.jsx`, `DashboardCanvasEditor.jsx`, `pages/DashboardBuilder.jsx`). 13+ other pages hand-roll their own near-identical "Are you sure you want to delete?" `FormModal` instead of reusing it (`UserManagement.jsx`, `XAlertScheduler.jsx`, `GroupManagement.jsx`, `DBConfig.jsx`, `QueryWorkbench.jsx`, `ArcSettingManager.jsx`, `XReportSchedulerList.jsx`, `XAlertConfigure.jsx`, `ProRulesManagementPage.jsx`, `InsightsEngineDashboardManager.jsx`, `ProRulesQuery.jsx`, `ChartListItem.jsx`, and more). New delete-confirmation UI should reuse `ConfirmModal` rather than adding another copy of this markup — it's a clear case for the "reusable code" standard in section 8.
- **Form validation is mixed**: `react-hook-form` is used in ~35 files, but plenty of forms instead do manual validation (`required`/inline `validate:` checks, ~18 files) without it. No firm standard yet on which to pick for a new form — match whichever pattern the surrounding module already uses; default to `react-hook-form` for anything with more than a couple of fields.
- **Request cancellation isn't used almost anywhere**: `AbortController`/`CancelToken` appears only in `components/AiChatFab.jsx`. Fine for the current CRUD-style pages (one request per user action), but a gap to be aware of before adding anything with fast-typing search/autocomplete against the API — those should cancel in-flight requests, following `AiChatFab.jsx`'s pattern.

### Dirty-state / unsaved-changes tracking

Two different patterns are both in active use — pick based on what the dirty flag needs to drive:

| Pattern | How it works | Used in | Best for |
|---|---|---|---|
| **Snapshot-compare** | Serialize state once on load into a ref/const (`JSON.stringify({...})`), then compare current state against that snapshot on demand | `DashboardCanvasEditor.jsx` (`isDirty()`, checked before overwrite/close), `components/DashboardBuilder/filters/FilterPanel.jsx`, `pages/Admin/ZoomSettingsManager/ZoomSettingsManager.jsx` | Read-mostly forms/editors where you just need a point-in-time yes/no check (enable Save button, confirm before closing) without tracking every field |
| **Explicit dirty flag** | A `useState(false)` boolean (e.g. `isDirty`/`setIsDirty`) explicitly set to `true` inside every change handler (`markDirty()`) and reset to `false` on save | `components/MapsUsingDeckgl/AddMapLayersPanel.jsx` (`markDirty`, passed down to `AddMapLayersPanelFloatingLayout.jsx`) | Panels with many nested/derived state pieces where a full snapshot compare would be expensive or awkward, or where you want fine-grained control over exactly which actions count as "dirty" |

`window.beforeunload` is not used anywhere in the app — don't add it unless a specific page has a strong reason for browser-level unload warnings.

### Refresh / polling

No page polls in the background by default — a list loads once, then refreshes after the user's own actions and via a visible Refresh button. Poll only while something can change server-side without any user action, and only while the browser tab is visible:

| Where | Auto-refresh | Otherwise |
|---|---|---|
| Tickets board (`Tickets/index.jsx`) | None | On load, after own actions, header Refresh |
| Open ticket panel (`ChatModal.jsx`) | Every 30s only while the ticket is in `VERIFICATION` (server auto-closes/reopens it); plus one refresh whenever the tab/window is returned to | ↻ button; a 409 from a lifecycle action re-fetches |
| Incident view (`IncidentModal.jsx`) | Every 30s only while the incident is `CLEARING` | ↻ button |
| Incident list (`Assurance/IncidentList.jsx`) | None | ↻ button |

Follow the same approach for new pages: background refreshes use the no-loader axios instance (`inst: 0`) so they don't flash the app-wide loader.

### Tickets & Assurance rules of thumb

- **Ticket status changes only through the 7 lifecycle endpoints** (`POST /tickets/<id>/acknowledge|start|pending|resume|resolve|close|reopen`), never through `PATCH /tickets/update` — those endpoints also set SLA/verification fields and the event log. There is no `RESOLVED` status: Resolve goes straight to `VERIFICATION`. Buttons are gated by status in `ChatModal.jsx`'s `LIFECYCLE_ACTIONS`.
- **`PATCH /tickets/update` takes several fields in one call**, keyed like `POST /tickets/create` (`issuecategory`, `assignedteam`, …) — `EDITABLE_FIELDS[...].apiKey` in `ChatModal.jsx` maps each column to its key.
- **Alarm status, ticket status, incident status, data status and event type are five different things** — never render a data status (`HEALTHY`/`BREACHED`) or an event/decision (`RAISE`/`CLEAR`) as if it were a lifecycle state.
- **Incidents are read-only** (created/cleared by the backend only); a ticket belongs to one when it has `incident_id` (`ticket_type` `MASTER`/`CHILD`).
- **Assurance rule update is a full replace** (`PUT`), so fields the wizard has no UI for (`clear_condition_config`, `suppression_config`, `noise_control_config`) are carried over from the loaded rule and re-sent.

### User-feedback mechanisms

Two global mechanisms currently coexist for surfacing messages to the user:

| Mechanism | Where it's rendered | Where it's used |
|---|---|---|
| **`ALERTS` Redux action** (`component-reducer.js`) | `components/SweetAlerts.jsx` (global SweetAlert modal) | The older, more widely used mechanism (17+ dispatch sites) — `components/MapsUsingDeckgl/TelecomMap.jsx`, `pages/CustomQuery/DBConfig.jsx`, `pages/ProRules/*`, `pages/NokiaToolCategory/NokiaToolManagementQuery.jsx`, `store/actions/customQuery-actions.js`, `store/actions/component-actions.js`, etc. |
| **`react-hot-toast`** | `<Toaster/>` mounted in `App.jsx` | Also widely used, not just newer/isolated pages: `components/DashboardBuilder/charts/ChartLibrary.jsx`, `components/MapsUsingDeckgl/AddMapLayersPanel.jsx` & `AddMapLayersPanelFloatingLayout.jsx`, `pages/Admin/ZoomSettingsManager/ZoomSettingsManager.jsx`, `pages/Admin/ArcSettingManager/ArcSettingManager.jsx` & `ArcSettingForm.jsx`, `pages/AlertMonitoringSystem/XReportSchedulerFormPage.jsx`, `pages/Tickets/index.jsx`, `ChatModal.jsx`, `CreateTicket.jsx`, `CreateTicketModal.jsx`, `pages/DiscussionForum/components/CreateTopicModal.jsx` |

**Standard going forward:** prefer `react-hot-toast` for new code (lighter-weight, no extra modal/backdrop, and already the more common choice across recent modules including Dashboard Builder and MapsUsingDeckgl) unless the surrounding page already uses `ALERTS`/SweetAlert consistently — then match what's already there rather than mixing both in one page.

### Future approach for these gaps

Priority order — highest-impact/lowest-risk first. None of this is a mandate to go refactor now; it's the plan for *when* each is touched:

1. ~~**Fix silent error swallowing**~~ — **Done.** `common-actions.js`'s `postApiCaller`/`getApiCaller`/`deleteApiCaller` `catch` blocks now call `handleApiError` (toast + dev-gated log, see above) instead of swallowing silently.
2. **Unify on `react-hot-toast`** — Standardize new code on it; migrate existing `ALERTS`/SweetAlert call sites opportunistically (only when already touching that file for other work), not as a dedicated migration.
3. **Reuse `ConfirmModal`** — Same opportunistic approach: swap a page's hand-rolled delete-confirm for `ConfirmModal` when that page is next touched, rather than a mass refactor.
4. **Form validation** — No hard rule for existing forms. Standardize on `react-hook-form` going forward for anything non-trivial (3+ fields, cross-field validation); don't rewrite manually-validated forms unless already being reworked.
5. **Request cancellation** — Leave as-is until a feature actually needs it (search-as-you-type, autocomplete against the API); apply `AiChatFab.jsx`'s `AbortController` pattern then.
6. **Dirty-state (two patterns)** — Not a defect to fix — snapshot-compare and explicit-flag both have valid use cases (see table above); keep both rather than collapsing to one.

The common thread: only #1 is a real correctness/UX bug (failures hidden from users) worth a deliberate, scoped fix on its own. Everything else is fix-opportunistically-as-touched, not a dedicated cleanup task.

## 8. Coding standards

- **Never remove commented-out or unused code on your own initiative** — leave it in place unless the user explicitly asks for it to be removed.

- **Tailwind-first styling** — use Tailwind utility classes by default. Fall back to plain CSS only when Tailwind genuinely can't express something (vendor/map library overrides, complex keyframe animations, etc.), and keep that CSS scoped/local rather than adding to global stylesheets where possible.
- **Reusable code** — extract repeated UI/logic into shared components (`src/components/`) or hooks/utils instead of duplicating. Don't over-abstract for one-off cases.
- **Responsive design** — components must work across breakpoints (`sm`, `md`, `lg`, `xl`, `2xl` per `tailwind.config.js`); test mobile, tablet, and desktop layouts, not just desktop.
- **Accessibility** — use semantic HTML, provide `alt` text for images/icons, ensure keyboard navigability and ARIA attributes where interactive elements need them.
- **Consistent naming** — PascalCase for components/files, camelCase for functions/variables, one component per file, folder-per-feature matching the structure in section 3.
- **Single responsibility / component size** — keep components focused and JSX readable; split out subcomponents when a file grows too large or mixes unrelated concerns.
- **No inline styles** — use Tailwind classes; reserve inline `style={}` for values that are genuinely dynamic/computed at runtime (e.g. map coordinates, chart dimensions).
- **State management discipline** — keep UI-local state in component state (`useState`/`useReducer`); use Redux only for state shared across components/pages.
- **Lint compliance** — code must pass `npm run lint` cleanly before being considered done. (Currently it can't run — see section 11, "No ESLint config".)
- **Error handling at boundaries** — wrap API/network calls in try/catch and surface failures to the user (toast/sweetalert); don't fail silently.
- **Performance basics** — memoize expensive computations/renders (`useMemo`/`useCallback`) where profiling or clear cost justifies it, especially in map and dashboard components.
- **Dark mode support** — use theme tokens/CSS variables (`data-theme="dark"`) instead of hardcoded colors so new UI respects both themes.
- **No unnecessary scrollbars** — every page renders inside `Layout.jsx`'s `flex-1 overflow-y-auto` wrapper. A new top-level page container must use `h-full` (and `overflow-hidden` if it manages its own internal scroll regions), **not** a hardcoded `h-[calc(100vh-Nrem)]`. A hardcoded guess at the header height can exceed what Layout's wrapper actually gives the page, which makes the whole page scroll in addition to (or instead of) the page's own internal scroll area. Only the specific inner region that actually has more content than fits (e.g. a table body, a step-content panel) should get `overflow-auto`; the rest of the page should fit the viewport exactly with no scrollbar. See `src/pages/DashboardBuilder.jsx` for the reference pattern.

## 9. Working conventions

- Never run `npm run build` unless the user explicitly asks — the Vite dev server has HMR; use it to verify changes.
- Prefer editing existing files/modules over introducing new top-level abstractions. Assume this by default — only create a new file/module/abstraction when the user explicitly asks for something new, or the task genuinely doesn't fit any existing module.
- Match existing patterns in the module you're touching (e.g. follow the action/reducer style already used in `src/store` for new Redux state).
- **Keep documentation in sync with changes.** Whenever a task adds/removes a dependency (`package.json`), adds/removes an environment variable, or otherwise changes something this file documents:
  - Add the new `VITE_*` variable to both `.env` (with the value actually needed for the active deployment) and `.env.example` (as a template with comments), and add a row to the table in section 6.
  - Add/update the relevant row in section 2 (technology & module usage) for a new/removed library.
  - Update section 11 (housekeeping) if the change makes an existing note stale (e.g. a flagged-stale library becomes used, or gets removed).
  - Update the UI patterns catalogue (section 5) whenever a new page/feature is added: add it as an example under the pattern it follows, or — if it genuinely doesn't fit any existing pattern — add a new row/pattern to the table.
  - If it's unclear whether a change is significant enough to warrant a doc update, ask rather than skipping it silently.

## 10. Git & version control

Git workflow (branching, commit messages, PR process) is intentionally **not** dictated here — that stays under your personal control, not something this file or Claude should impose. If you ever want to adopt a formal convention (e.g. [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, or a trunk-based/feature-branch model for branching), that's worth a short discussion first so we pick something that fits how you actually work — ask if you'd like that conversation.

## 11. Known housekeeping items & gaps

Identified while auditing the codebase — not urgent, and per [[feedback_no_dead_code_removal]] none of this has been removed on our own initiative. Flagged here so it's tracked and can be cleaned up deliberately when convenient.

**See also:** section 7 has its own set of gaps specific to API calls/error handling/dirty-state (silent error swallowing, `ConfirmModal` duplication, mixed form validation, etc.), kept there rather than duplicated here since they're tied to the reference tables in that section — see its ["Future approach for these gaps"](#7-api-calls-error-handling--dirty-state) subsection.

Ordered highest-priority/highest-risk first:

- **JWT stored in `localStorage`** — the auth token lives in `localStorage` (12 read/write sites), which is readable by any injected script (XSS-exposure tradeoff vs. an httpOnly cookie). Not something to change without a real reason to revisit auth architecture — flagged here so it isn't "fixed" into something worse without understanding why it's this way.
- **`dangerouslySetInnerHTML` usage** — 2 sites (`components/EmailBodyBuilder.jsx`, `pages/Login.jsx`). Not necessarily wrong, but an XSS risk if the injected content isn't sanitized/trusted — worth double-checking the source of that HTML before extending either file.
- **Almost no error boundaries** — only one `ErrorBoundary` exists, at the very top of `App.jsx`. No per-module boundaries around risky areas (DashboardBuilder widgets, map panels, embedded BI iframes), so one crashing widget can blank the entire page instead of just that widget. Worth scoping boundaries around those areas when next touched.
- **`console.log`/`warn`/`error` hygiene** — 762 call sites across the codebase, mostly not gated behind `import.meta.env.DEV` (only `utils/api.js` does this consistently via `logApiError`). New logging should follow `api.js`'s dev-only pattern rather than leaving raw `console.*` calls in shipped code.
- **`key={index}` in list rendering** — 25 files key list items by array index instead of a stable ID, which can cause wrong-item re-renders/stale state if the list ever reorders or filters. Prefer a stable ID field for new list rendering.
- **No test setup** — there is no test runner in `devDependencies` (no Jest/Vitest/etc.). Don't assume a test suite exists; verify changes via the dev server instead.
- **No ESLint config** — `eslint` is installed and `npm run lint` is defined, but the repo has no ESLint config file, so the command fails before checking anything. Until one is added, the practical check is that the running Vite dev server compiles the changed file (request `http://localhost:5173/src/<path>` and expect 200) and then a manual check in the browser.
- **Routes are driven by the backend sidebar menu** — `Navigation.jsx` only registers the routes the API menu (`state.auth.sidebarMenu`) lists (plus Admin routes for admins). A new page added to `sidebar_values.jsx` alone shows "Coming Soon" until the backend menu includes its link. For a page that must work before then (or is never a menu item — `new`/`edit`/`view` screens), register an explicit `<Route>` in `Navigation.jsx`, as `/assurance/rules/*` and `/assurance/incidents` do.
- **Hardcoded white page backgrounds** — the Tickets and Assurance pages (and their modals) set `background: '#ffffff'` inline, so they stay white in dark mode instead of using theme tokens. Pre-existing pattern in those modules; fix when a page is next restyled.
- **Large unpaginated pickers** — `GET /tickets/cellList` returns every cell (16k+ items) and `siteList` ~600 kB on each Create Ticket open. Works, but worth server-side search/paging if it becomes slow.
- **No prop type-checking** — zero use of `PropTypes` or TypeScript anywhere. Not treated as a defect, just worth stating explicitly so nobody assumes props are validated/typed anywhere in this codebase.
- **Duplicate Tailwind configs** — `tailwind.config.js` and `tailwind.config.cjs` both exist with near-identical content. Only one is actually loaded (by PostCSS/Vite resolution order); the other is silently ignored. Confirm which is live before editing Tailwind theme config, and remove the stale one when ready.
- **Dead duplicate page folder** — `src/pages/NokiaToolCategory/` is never imported anywhere. Only `src/pages/NokiaToolManagement/` (a separate, routed copy) is wired up in `sidebar_values.jsx`.
- **Leftover copy/backup files** — classic "save a copy before editing" artifacts scattered across the codebase: `src/pages/CX_IXSupport/ScriptingPatternFormOld.jsx`, `src/pages/CX_IXSupport/ScriptingPatternList copy.jsx`, `src/pages/CustomQuery/QueryWorkbenchcopy.jsx`, `src/pages/ProRules/CellProRulesQueryOutput.1.jsx`, `src/components/MapsUsingDeckgl/AddMapLayersPanel.jsx.backup`. Check which one (if any) is actually imported/routed before touching the "real" version of any of these features.
- **Code-splitting is already done well, just undocumented** — `utils/sidebar_values.jsx` lazy-loads ~50 page components via `React.lazy()`. Not a gap to fix — the lowest-priority item here since it's a positive note, not an issue — but worth naming as the existing convention: new routed pages should be added the same way (lazy-imported from `sidebar_values.jsx`), not imported eagerly.
- **KPI/Stat card title wrapping** — `components/Widgets/TitleValueOverlay.jsx`'s title `<span>` has no `white-space`/`truncate` rule, unlike the value text next to it (`StatCard.jsx`'s `kpi-stat-value` is `whitespace-nowrap`). So the title wraps to a second line by plain browser text-wrap whenever it doesn't fit at the current Title size — not a fixed character/pixel threshold. Today the only controls are lowering "Title size (px)" or widening the widget; there's no single-line/truncate toggle. If asked to fix/control this, the likely fix is giving the title the same `whitespace-nowrap` + ellipsis treatment the value already has, not a new "gap" setting.
