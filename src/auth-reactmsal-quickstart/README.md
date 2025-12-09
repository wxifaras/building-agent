# React MSAL & Entra ID Quickstart

A minimal React TypeScript application using **MSAL.js** (Microsoft Authentication Library) to authenticate users with **Microsoft Entra ID** and retrieve access tokens for API calls.

## Features

*   🔐 **Microsoft Entra ID Authentication** using MSAL.js
*   🎫 **Access Token Retrieval** with automatic clipboard copy
*   ⚛️ **React with TypeScript**
*   🎨 **Clean, minimal UI** with debugging capabilities

---

## Prerequisites

1.  **Node.js** (v18+)
2.  **Azure Entra ID App Registration** (see setup below)

---

## 1. Azure Setup

### Single App Registration Architecture

This project uses **one App Registration** that serves both the React frontend (SPA) and your Node.js API backend. This is the recommended approach when both components are part of the same application and managed by the same team.

### Create Entra ID App Registration

1.  Go to **Microsoft Entra ID** > **App registrations** > **New registration**
2.  **Name**: `AuthQuickstart` (or your preferred name)
3.  **Supported account types**: "Accounts in this organizational directory only" (Single Tenant)
4.  **Redirect URI**: Select **Single-page application (SPA)** and enter `http://localhost:3000`
5.  Click **Register**
6.  **Copy the Application (client) ID and Directory (tenant) ID** - you'll need these for configuration

### Expose an API

1.  Go to **Expose an API**
2.  Click **Set** next to Application ID URI and accept the default `api://<client-id>`
3.  Click **Add a scope**:
    *   **Scope name**: `access`
    *   **Who can consent**: `Admins and users`
    *   **Admin consent display name**: `Access as Admin`
    *   **Admin consent description**: `Access as Admin`
    *   **User consent display name**: `Access as User`
    *   **User consent description**: `Access as User`
    *   **State**: `Enabled`
4.  Click **Add scope**

---

## 2. Local Configuration

### Install Dependencies

```bash
npm install
```

### Create `.env` File

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Update the `.env` file with your Azure configuration:

```env
# Entra ID Configuration (same client ID for both React and API)
REACT_APP_ENTRA_CLIENT_ID=<your-client-id>
REACT_APP_ENTRA_TENANT_ID=<your-tenant-id>
REACT_APP_REDIRECT_URI=http://localhost:3000

# API Scope (using the same client ID since it's one app registration)
REACT_APP_API_SCOPE=api://<your-client-id>/access
```

**Important:**
*   Replace `<your-client-id>` with your App Registration's **Application (client) ID**
*   Replace `<your-tenant-id>` with your **Directory (tenant) ID**
*   The API scope uses the **same client ID** because React and the API share one app registration
*   Variables **must** start with `REACT_APP_` for Create React App to expose them

### MSAL Configuration

The MSAL configuration is in `src/authConfig.ts`:

```typescript
import { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_ENTRA_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_ENTRA_TENANT_ID}`,
    redirectUri: process.env.REACT_APP_REDIRECT_URI!,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: [process.env.REACT_APP_API_SCOPE!],
};
```

---

## 3. Running the App

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

### How to Use

1.  Click **"Sign In"**
2.  Sign in with your Microsoft account
3.  Click **"Get Token & Copy"**
4.  The access token is automatically copied to your clipboard
5.  Use the token in your API testing tools (Bruno, Postman, etc.)

---

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
