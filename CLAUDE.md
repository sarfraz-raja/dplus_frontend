# CLAUDE.md

**NMS (dataplus)**: a telecom network management and analytics web app. React 18 (function components and hooks), Vite 7, Tailwind CSS 3 (theme tokens backed by CSS variables, dark mode via `data-theme="dark"`), Redux Toolkit, deck.gl + MapLibre maps, ECharts.

## Reference docs: read the one you need, when you need it

| Doc | What's in it | Read before… |
|---|---|---|
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | Libraries and versions, which ones are stale, feature module map | adding or removing a dependency |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | Shared components and helpers catalogue (`Button`, `FormModal`, `DataTable`, `Table`, `ConfirmModal`, `Select`, `FloatingPanel`, `FormPage`, `ActionButton`, Dashboard Builder helpers, `cn()`, `getApiErrorMessage`, …) | writing any new component, helper, modal, table, dropdown or popover |
| [docs/UI_PATTERNS.md](docs/UI_PATTERNS.md) | Page patterns (form/config page, wizard, list + modal CRUD, builder, kanban, dashboard, map) and `FormPage` layout rules | building or restyling a page |
| [docs/ENV_VARS.md](docs/ENV_VARS.md) | Every `VITE_*` variable and where it's used | adding or reading config |
| [docs/API_AND_DATA.md](docs/API_AND_DATA.md) | `Api` behaviour, error handling, dirty state, polling, Dashboard Builder data loading, Tickets/Assurance rules, toasts vs SweetAlert | API calls, Tickets/Assurance, dashboard loading |
| [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) | Coding standards in full: type scale, fonts, buttons, Dashboard Builder `dbe` scale and surfaces, brand orange, map geometry rule | changing text sizes, fonts, colors or buttons, or Dashboard Builder panels |
| [docs/DASHBOARD_BUILDER_STYLE_MATRIX.md](docs/DASHBOARD_BUILDER_STYLE_MATRIX.md) | Which Style control works for each chart type and level | adding, removing or wiring any Dashboard Builder style field (and update it) |
| [docs/HOUSEKEEPING.md](docs/HOUSEKEEPING.md) | Known gaps, parked and unrouted pages, leftover files, routing via the backend menu | touching CX/IX, ProRules, NokiaTool, routing, or "is this file used?" |
| [docs/MICROSOFT_SSO.md](docs/MICROSOFT_SSO.md) | Azure SSO setup | SSO work |

## Structure

- `src/pages/`: one folder or file per feature/route. `src/components/`: shared components plus feature subfolders (`DashboardBuilder/`, `MapsUsingDeckgl/`, `FormElements/`, …). `src/store/actions` + `src/store/reducers`: one pair per domain. `src/utils/`: `api.js`, `common.jsx`, `sidebar_values.jsx` (lazy-loaded routes), …; `src/context/`, `src/theme/`.
- Keep new code inside the module it belongs to. A new feature gets its own page folder or component subfolder and its own action/reducer pair. New routed pages are lazy-imported from `sidebar_values.jsx`.

## Must-follow rules (details in the docs above)

- **Never remove commented-out or unused code** unless asked. When fixing a formula, keep the old line as `// OLD` above the new one.
- **Never run `npm run build`** unless asked. Verify with the dev server: request `http://localhost:5173/src/<path>` and expect 200 (there's no ESLint config and no test runner).
- **Reuse shared components:** `Button` / `ActionButton` (row actions), `FormModal` (new modals), `ConfirmModal` (every confirm), `DataTable` / `Table`, `Select` for every dropdown (except in the GIS Engine: `MapsUsingDeckgl/`, `MapComponents/`, `GeoDrillDown/`, the Telecom map pages, `SyncedVendorMaps`), `FloatingPanel` for every list or popover (never `absolute top-full`), `FormPage` for config pages, `StatusPill`, `cn()`. Tooltips: just use `title` (`GlobalTooltip`). Check docs/COMPONENTS.md before adding a new shared piece.
- **API:** go through `Api` in `utils/api.js`. It **resolves** error responses instead of throwing, so check `res?.status` and show `getApiErrorMessage(res)`. Don't send a list row back as the save payload. Use `react-hot-toast` for new feedback.
- **Styling:** Tailwind first; inline `style` only for runtime values; theme tokens rather than hardcoded colors; the app type scale is `text-ui-*` and the Dashboard Builder editor scale is `text-dbe-*`, never ad-hoc `text-[Npx]`; one brand orange `#EC7D09`; top-level pages use `h-full` (never `h-[calc(100vh-…)]`) and only the inner region scrolls. Never put a backtick inside a `<style>{`…`}</style>` block.
- **Dashboard Builder:** reuse an existing widget's style keys first; check every level (theme → dashboard → chart → placement) and every chart type; wire **both** render paths (Charts-tab preview and the canvas `style` object in `DashboardCanvasEditor`); keep defaults identical; prefer one input with derived states over a picker per state; update the style matrix doc.
- **Map geometry:** divide longitude offsets by `cos(latitude)`.
- Responsive (sm to 2xl), accessible, PascalCase components, camelCase functions, Redux only for cross-page state, dev-only logging (`import.meta.env.DEV`), stable list keys.
- Don't touch **parked pages** (CX/IX Support, the `AdvancedTable` family) unless the user starts work on them.

## Working conventions

- Prefer editing existing files over new abstractions, and match the patterns of the module you're in.
- **Keep docs in sync:** a new or removed dependency → docs/TECH_STACK.md; a new `VITE_*` var → `.env`, `.env.example` and docs/ENV_VARS.md; a new page → docs/UI_PATTERNS.md; a new shared component → docs/COMPONENTS.md; a stale note → docs/HOUSEKEEPING.md. Topic how-tos go in their own `docs/<TOPIC>.md`. If unsure whether a doc update is needed, ask.
- `.env` holds the live deployment's values (gitignored; other deployments are kept as commented-out blocks). `.env.example` is the template.
- Backend source (read-only reference, ask before editing): `/data/lab/web/fb/nms-backend`.
- **Report token usage at the end of every reply** (approximate: tokens left at the start of the turn minus tokens left at the end).

## Git

Branching, commit messages and PR process are up to the user. Don't impose a convention; ask if one is wanted.
