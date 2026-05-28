import { PublicClientApplication } from "@azure/msal-browser";

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: "4331180f-965f-4e05-99b1-d70491451c65",
    authority: "https://login.microsoftonline.com/8d2d9b81-d0ec-49f4-9466-732d6e42831c",
    redirectUri: `${window.location.origin}/auth-callback.html`,
  },
  cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false },
});

msalInstance.initialize().then(() => {
  console.log("[auth-callback] MSAL popup response processed — parent loginPopup() will now resolve.");
});
