  export const msalConfig = {
	  auth: {
		clientId: "4331180f-965f-4e05-99b1-d70491451c65", // YOUR_CLIENT_ID_FROM_ENTRA -- Application (client) ID
		// authority: "https://login.microsoftonline.com/8d2d9b81-d0ec-49f4-9466-732d6e42831c", // YOUR_TENANT_ID_FROM_ENTRA --Directory (tenant) ID
		// authority: "https://login.microsoftonline.com/common", // Use "common" for multi-tenant applications
		authority: "https://login.microsoftonline.com/organizations", // Use "organizations" for multi-tenant applications that only allow work/school accounts
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
	};