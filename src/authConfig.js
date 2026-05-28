  export const msalConfig = {
	  auth: {
		clientId: "4331180f-965f-4e05-99b1-d70491451c65", // YOUR_CLIENT_ID_FROM_ENTRA -- Application (client) ID
		authority: "https://login.microsoftonline.com/8d2d9b81-d0ec-49f4-9466-732d6e42831c", // YOUR_TENANT_ID_FROM_ENTRA --Directory (tenant) ID
		redirectUri: window.location.origin,
	  },
	  cache: {
		cacheLocation: "sessionStorage", 
		storeAuthStateInCookie: false,
	  }
	};

	// Scopes define what data you want from the user
	export const loginRequest = {
	  scopes: ["openid", "profile", "email", "User.Read"],
	  redirectUri: `${window.location.origin}/auth-callback.html`,
	};