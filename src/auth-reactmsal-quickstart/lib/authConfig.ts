import { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_ENTRA_TENANT_ID}`,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : ''),
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: [process.env.NEXT_PUBLIC_API_SCOPE!],
};
