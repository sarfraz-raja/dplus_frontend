# Microsoft SSO (Azure AD) — enable / disable

Turning "Sign in with Microsoft" on or off is **config only**. No code changes are needed.

## The switch

In `.env`:

```env
VITE_MICROSOFT_AUTH_ENABLED=true   # or false
VITE_CLIENT_ID=<Application (client) ID from the Azure AD app registration>
```

- The value must be lowercase `true` exactly. The code checks `=== 'true'`, so anything else counts as off.
- `false`: the login button is hidden and no MSAL code is loaded or run.
- `true`: the button shows, and MSAL handles the Microsoft redirect when the page loads.

### Where the flag is read

| File | What it does |
|---|---|
| `src/main.jsx` | When enabled, lazy-loads MSAL, runs `handleRedirectPromise()` and sends the Microsoft access token to the backend (`AuthActions.ssoSignIn`). When disabled, renders the app directly. |
| `src/pages/Login.jsx` | Shows or hides the "Sign in with Microsoft" button. `handleMicrosoftSSO` starts `loginRedirect`. |
| `src/authConfig.js` | MSAL config: `clientId` comes from `VITE_CLIENT_ID`, the authority is `organizations` and `redirectUri` is `window.location.origin`. |

## Checklist when enabling it for a deployment

1. **Restart or rebuild.** Vite reads `.env` only at dev-server start, and a build bakes the values in. Restart `npm run dev`, or rebuild and redeploy.
2. **Register the redirect URI in Azure.** The app redirects to `window.location.origin`. Add every URL users open the app from (for example `https://your-host`) as a **Single-page application (SPA)** redirect URI on the app registration matching `VITE_CLIENT_ID`. Without it, Microsoft refuses the login.
3. **Serve over HTTPS.** MSAL needs browser crypto, which only works on HTTPS or `localhost`. On plain `http://<ip>` the login page shows "Microsoft sign-in requires a secure (HTTPS) connection".
4. **Work or school accounts only.** The authority `organizations` rejects personal Microsoft accounts. To restrict sign-in to one tenant, change `authority` in `src/authConfig.js` to `https://login.microsoftonline.com/<tenant-id>`. This is the only case that needs a code change.
5. **Create users first.** The backend (`nms-backend` `blueprint_routes/auth_blueprint.py`, login with `login_type: "Microsoft"`) calls Microsoft Graph `/me` with the token, reads the email and looks it up in `web.Users`. If no user has that email, it returns 403 "Access denied. User not found in system." Create the user in the app with their Microsoft email before they sign in. The backend has no client ID or tenant setting to change.

## Known client IDs (from `.env`)

| Deployment | `VITE_CLIENT_ID` |
|---|---|
| dataplus-live | `4331180f-965f-4e05-99b1-d70491451c65` |
| TNM | `7db0eb7d-3816-4c55-9ed8-50077285eb27` |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No Microsoft button | The flag isn't exactly `true`, or the server wasn't restarted or rebuilt after the `.env` change |
| Azure error page after clicking (redirect URI mismatch) | The current origin isn't registered as a SPA redirect URI |
| "requires a secure (HTTPS) connection" | The app is served over plain HTTP |
| "Personal Microsoft accounts are not allowed" | A personal account was used, but `organizations` allows only work or school accounts |
| "Access denied. User not found in system." | The Microsoft email has no matching row in `web.Users` |
