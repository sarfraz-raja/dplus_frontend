  export const msalConfig = {
	  auth: {
		clientId:  import.meta.env.VITE_CLIENT_ID, // YOUR_CLIENT_ID_FROM_ENTRA -- Application (client) ID
		// authority: "https://login.microsoftonline.com/8dc", // YOUR_TENANT_ID_FROM_ENTRA --Directory (tenant) ID
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