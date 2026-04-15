# Backend Developer Guide — Page-Level Permission & Multi-User System

**For:** Backend Developer (Flask / dplus-apis)  
**From:** Frontend Team  
**Date:** April 14, 2026  
**Priority:** High  

---

## Goal

Build a complete page-level permission system so that:

1. **Admin** can control which sidebar pages each **role** can see/access
2. **Admin** can control which pages each **individual user** can see (override role defaults)
3. **Multi-user** support — one company/org can create multiple users with different permissions
4. **Default** — new roles see all pages unless restricted
5. Frontend sidebar and route protection will use this data — backend just needs to provide the right API responses

---

## What Already Exists (Current State)

### Current APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/login` | Login → returns `user`, `idToken`, `permission`, `confdata` |
| `GET` | `/me` | Returns `user` profile + `menu` (sidebar tree) |
| `PATCH` | `/me` | Update user profile |
| `GET` | `/admin/users` | List all users |
| `POST` | `/admin/users` | Create user |
| `PUT` | `/admin/users/{id}` | Update user |
| `GET` | `/admin/roles` | List all roles |
| `POST` | `/admin/roles` | Create role |
| `PUT` | `/admin/roles/{id}` | Update role |

### Current Data Flow

```
Login (POST /login)
  → Returns: { idToken, permission (string), confdata, rolename, ... }
  → Frontend stores in localStorage

GET /me (called after login)
  → Returns: { user: {...}, menu: [...] }
  → menu = array of sidebar items this user can see
  → Frontend sidebar renders from this menu
```

### Current Menu Format (from GET /me)

```json
{
  "user": { "username": "john", "rolename": "Operator", ... },
  "menu": [
    {
      "title": "Analytics Pro",
      "route": "/dataplus-analytics-pro",
      "is_active": true,
      "sequence": 1,
      "children": [
        {
          "title": "Site Analytics",
          "route": "/dataplus-analytics-pro/site-analytics",
          "is_active": true,
          "sequence": 1,
          "children": []
        },
        {
          "title": "Cell Analytics",
          "route": "/dataplus-analytics-pro/cell-analytics",
          "is_active": true,
          "sequence": 2,
          "children": []
        }
      ]
    }
  ]
}
```

### Current Role Permission Format (from Admin Panel)

When admin creates/edits a role, frontend sends this in `POST /admin/roles`:

```json
{
  "label": "Operator",
  "permission": "{\"Analytics Pro\":{\"Site Analytics\":true,\"Cell Analytics\":true},\"Insights Engine\":{\"Core Dashboards\":{\"MSS Dashboard\":true}}}"
}
```

The `permission` field is a JSON string with nested keys matching sidebar menu names. `true` = allowed.

---

## What Needs to Change

### 1. Role Permission — Enhanced (Existing API, Better Structure)

**Endpoint:** `POST /admin/roles` and `PUT /admin/roles/{id}`

The frontend already sends a `permission` JSON. The backend should:

- **Store** the permission JSON as-is in the database
- **Use it** when building the `menu` for `GET /me` — only include pages that the user's role allows

**Recommended DB schema for roles table:**

```sql
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    label       VARCHAR(100) NOT NULL UNIQUE,
    permission  JSONB DEFAULT '{}',     -- page permission tree
    is_default  BOOLEAN DEFAULT false,  -- if true, gets all pages
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

### 2. User-Level Permission Override (NEW)

**Problem:** Currently users only have a `roleId`. We need per-user page overrides.

**Add to users table:**

```sql
ALTER TABLE users ADD COLUMN page_permissions JSONB DEFAULT NULL;
-- NULL = use role defaults
-- {} with specific keys = override role for those pages
```

**Update `POST /admin/users` and `PUT /admin/users/{id}`** to accept:

```json
{
  "firstname": "John",
  "lastname": "Doe",
  "username": "john",
  "password": "...",
  "roleId": 2,
  "pagePermissions": {
    "Analytics Pro": {
      "Site Analytics": true,
      "Cell Analytics": false
    },
    "GIS Engine": false
  }
}
```

**Logic:**
- If `pagePermissions` is `null` → use role's permission (current behavior)
- If `pagePermissions` has specific keys → those override the role's permission
- Keys not in `pagePermissions` → fall back to role's permission

### 3. GET /me — Build Menu from Permissions (CRITICAL)

This is the **most important** API. The frontend sidebar renders entirely from this response.

**Logic for building `menu`:**

```python
def build_user_menu(user):
    role = get_role(user.role_id)
    
    # Start with role permissions
    role_perms = json.loads(role.permission) if role.permission else {}
    
    # Apply user-level overrides (if any)
    user_perms = user.page_permissions or {}
    effective_perms = deep_merge(role_perms, user_perms)
    
    # If role.is_default and no user overrides → return ALL pages
    if role.is_default and not user_perms:
        return get_all_menu_items()
    
    # Build menu tree from effective permissions
    return filter_menu_by_permissions(ALL_MENU_ITEMS, effective_perms)
```

**Expected `GET /me` response:**

```json
{
  "user": {
    "id": 1,
    "username": "john",
    "firstname": "John",
    "lastname": "Doe",
    "rolename": "Operator",
    "email": "john@example.com",
    "avatar": null
  },
  "menu": [
    {
      "title": "Analytics Pro",
      "route": "/dataplus-analytics-pro",
      "is_active": true,
      "sequence": 1,
      "children": [
        {
          "title": "Site Analytics",
          "route": "/dataplus-analytics-pro/site-analytics",
          "is_active": true,
          "sequence": 1,
          "children": []
        }
      ]
    }
  ],
  "allRoutes": [...]  
}
```

> **Note:** The `allRoutes` field (optional) would be useful for the Admin panel to show the full page list when configuring permissions. Only return this for Admin users.

### 4. GET /admin/roles — Return Permission Data

**Current:** Returns roles with `permission` as string.

**Keep as-is**, but ensure the response includes:

```json
{
  "data": [
    {
      "id": 1,
      "label": "Admin",
      "permission": "{...}",
      "is_default": true
    },
    {
      "id": 2,
      "label": "Operator",
      "permission": "{\"Analytics Pro\":{\"Site Analytics\":true}}",
      "is_default": false
    }
  ]
}
```

### 5. GET /admin/users — Return User Permissions

**Add `pagePermissions` to user response:**

```json
{
  "data": [
    {
      "id": 1,
      "firstname": "John",
      "lastname": "Doe",
      "username": "john",
      "rolename": "Operator",
      "roleId": 2,
      "pagePermissions": null
    },
    {
      "id": 2,
      "firstname": "Jane",
      "lastname": "Smith",
      "username": "jane",
      "rolename": "Operator",
      "roleId": 2,
      "pagePermissions": "{\"GIS Engine\": false}"
    }
  ]
}
```

---

## Complete Page/Route List (for reference)

These are ALL the routes that exist in the frontend sidebar. Use these as keys in the permission system:

```
all_routes (top-level groups):
├── Analytics Pro                         /dataplus-analytics-pro
│   ├── Site Analytics                    /dataplus-analytics-pro/site-analytics
│   ├── Site Pro Rules                    /dataplus-analytics-pro/site-pro-rules
│   ├── Cell Analytics                    /dataplus-analytics-pro/cell-analytics
│   ├── Cell Pro Rules                    /dataplus-analytics-pro/cell-pro-rules
│   ├── KPI Check Rules                   /dataplus-analytics-pro/kpi-check-rules
│   └── Pro Rules Management              /dataplus-analytics-pro/pro-rules-management
│
├── Insights Engine                       /insights-engine
│   ├── Core Dashboards                   /insights-engine/core-dashboard
│   │   ├── MSS Dashboard                 /insights-engine/core-dashboard/mss
│   │   ├── UGW Dashboard                 /insights-engine/core-dashboard/ugw
│   │   └── MGW Dashboard                 /insights-engine/core-dashboard/mgw
│   ├── RAN Dashboards                    /insights-engine/ran-dashboard
│   │   ├── Worst Cells Dashboard         /insights-engine/ran-dashboard/worstcells
│   │   ├── 4G Dashboard                  /insights-engine/ran-dashboard/huawei4g
│   │   ├── 5G NSA to SA Pre-Post         /insights-engine/ran-dashboard/5GNSAtoSAPrePostDashboard
│   │   └── 5G Dashboard                  /insights-engine/ran-dashboard/huawei5g
│   ├── Network Dashboard                 /insights-engine/network-dashboard
│   └── Parameter Audit Dashboard         /insights-engine/parameter-audit-dashboard
│
├── Discussions                           /discussions
├── GIS Engine                            /telecom-maps
├── Multi-Map View                        /telecom-multi-maps
│
├── Configuration Management              /configuration-management
│   ├── Parameter Audit                   /configuration-management/parameter-audit
│   ├── Neighbour Audit                   /configuration-management/neighbour-audit
│   └── Daily Parameter Audit             /configuration-management/daily-parameter-audit
│
├── iSON                                  /iSon/file-with-form
│
├── Custom Query                          /custom-query
│   ├── DB Config                         /custom-query/db-config
│   └── Query Workbench                   /custom-query/advanced-query-builder
│
├── xAlerts                               /report-scheduler
│   ├── Configure Scheduler               /xAlerts/configure-scheduler
│   └── Alert Scheduler                   /xAlerts/alert-scheduler
│
├── CX/IX Support                         /cx-ix-support
│   ├── Scripting                         /cx-ix-support/scripting
│   ├── Parameter Audit                   /cx-ix-support/parameteraudit
│   └── DB Update                         /cx-ix-support/dbupdate
│
└── Network Inventory                     /network-inventory
    ├── Site Database                     /network-inventory/site-database
    └── Auto Discovery                    /network-inventory/auto-discovery

Admin (only for Admin role):
├── User Management                       /admin/user-management
└── Role Management                       /admin/role-management

Global (always accessible):
├── Home                                  /home
├── Profile                               /profile
├── Map Chart                             /mapChart
└── Dashboard Fullscreen                  /Filtered-cell-dashboard/:uuid
```

---

## Permission JSON Example

### Role: "Full Access" (default)

```json
{
  "is_default": true,
  "permission": "{}"
}
```
Empty = all pages visible (is_default handles this).

### Role: "Operator" (limited)

```json
{
  "permission": {
    "Analytics Pro": {
      "Site Analytics": true,
      "Cell Analytics": true,
      "Site Pro Rules": true,
      "Cell Pro Rules": true,
      "KPI Check Rules": false,
      "Pro Rules Management": false
    },
    "Insights Engine": {
      "Core Dashboards": {
        "MSS Dashboard": true,
        "UGW Dashboard": true,
        "MGW Dashboard": true
      },
      "RAN Dashboards": {
        "Worst Cells Dashboard": true,
        "4G Dashboard": true,
        "5G Dashboard": true,
        "5G NSA to SA Pre-Post": true
      },
      "Network Dashboard": true,
      "Parameter Audit Dashboard": true
    },
    "GIS Engine": true,
    "Custom Query": false,
    "CX/IX Support": false,
    "xAlerts": false
  }
}
```

### User Override: "john" (Operator role, but no GIS access)

```json
{
  "pagePermissions": {
    "GIS Engine": false
  }
}
```

Result: John gets all Operator pages EXCEPT GIS Engine.

---

## API Route Protection (Important!)

**Hiding sidebar items is NOT enough.** Users can type URLs directly. The backend should also:

1. **Validate on API level** — Check if the requesting user has permission to access the data endpoint for that page
2. **Return 403** if unauthorized

For example, if a user doesn't have "GIS Engine" access, the backend should reject `GET /telecom/cells` with 403.

The frontend will also add route-level guards, but backend enforcement is the real security layer.

---

## Summary of Backend Changes Needed

| Priority | Change | API | Effort |
|----------|--------|-----|--------|
| **P0** | Build `menu` from role permissions in `GET /me` | `GET /me` | Medium |
| **P0** | Store and read `permission` JSON in roles | `GET/POST/PUT /admin/roles` | Already done |
| **P1** | Add `pagePermissions` column to users table | DB migration | Small |
| **P1** | Accept `pagePermissions` in user CRUD | `POST/PUT /admin/users` | Small |
| **P1** | Return `pagePermissions` in user list | `GET /admin/users` | Small |
| **P1** | Merge user + role permissions in `GET /me` | `GET /me` | Medium |
| **P2** | Add `is_default` flag to roles | DB + `GET /admin/roles` | Small |
| **P2** | Return `allRoutes` for admin users in `GET /me` | `GET /me` | Small |
| **P3** | API-level route protection (403 for unauthorized) | All data endpoints | Large |

---

## Frontend Will Handle

Once backend provides the above:

1. Sidebar rendering — **already works** from `GET /me` → `menu`
2. Route-level guards — will add `<ProtectedRoute>` that checks permission before rendering page
3. Role management form — **already has** NestedDropdown for page selection
4. User management form — will add page permission override UI
5. Redirect to "Access Denied" page for unauthorized URL access

---

## Testing Checklist (for Backend)

- [ ] Create a role "Operator" with limited permissions → `POST /admin/roles`
- [ ] Create a user with that role → `POST /admin/users`
- [ ] Login as that user → `POST /login` returns correct data
- [ ] `GET /me` returns only the allowed menu items
- [ ] Admin user's `GET /me` returns all menu items
- [ ] Update role permissions → `PUT /admin/roles/{id}` → user's menu changes on next login
- [ ] (P1) Add `pagePermissions` to user → overrides role defaults
- [ ] (P3) Unauthorized API calls return 403

---

*Questions? Discuss with the frontend team. The frontend code references are in:*
- `src/store/actions/auth-actions.js` — login + `/me` handling
- `src/store/actions/adminManagement-actions.js` — user/role CRUD
- `src/utils/sidebar_values.jsx` — complete page/route list
- `src/components/Sidebar.jsx` — sidebar rendering from `/me` menu
- `src/utils/meMenuToSidebar.js` — menu tree mapping
- `src/Navigation.jsx` — route registration
