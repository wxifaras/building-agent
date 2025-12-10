# Next.js MSAL & Entra ID Quickstart

A Next.js 15 application using **MSAL.js** (Microsoft Authentication Library) to authenticate users with **Microsoft Entra ID** and retrieve access tokens for API calls.

## Features

*   🔐 **Microsoft Entra ID Authentication** using MSAL.js
*   🎫 **Access Token Retrieval** with automatic clipboard copy
*   ⚡ **Next.js 15 with App Router**
*   📘 **TypeScript** support
*   🎨 **Modern UI** with CSS Modules
*   🔄 **Migrated from Create React App**

---

## Prerequisites

1.  **Node.js** (v18+)
2.  **Azure Entra ID App Registration** (see setup below)

---

## 1. Azure Setup

### Single App Registration Architecture

This project uses **one App Registration** that serves both the Next.js frontend (SPA) and your Node.js API backend. This is the recommended approach when both components are part of the same application and managed by the same team.

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

### Create `.env.local` File

Copy the example environment file and update with your values:

```bash
cp .env.example .env.local
```

Update the `.env.local` file with your Azure configuration:

```env
# Entra ID Configuration (Next.js uses NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_ENTRA_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_ENTRA_TENANT_ID=<your-tenant-id>
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000

# API Scope (using the same client ID since it's one app registration)
NEXT_PUBLIC_API_SCOPE=api://<your-client-id>/access

# Node.js API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Important:**
*   Replace `<your-client-id>` with your App Registration's **Application (client) ID**
*   Replace `<your-tenant-id>` with your **Directory (tenant) ID**
*   The API scope uses the **same client ID** because Next.js app and the API share one app registration
*   Variables **must** start with `NEXT_PUBLIC_` for Next.js to expose them to the browser

### MSAL Configuration

The MSAL configuration is in `lib/authConfig.ts`:

```typescript
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
```

---

## 3. Running the App

### Development Mode

```bash
npm run dev
```

The app will open at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

### How to Use

1.  Click **"Sign In"**
2.  Sign in with your Microsoft account
3.  Click **"Get Token & Copy"**
4.  The access token is automatically copied to your clipboard
5.  Use the token in your API testing tools or with your backend API

---

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode with hot-reload.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will automatically reload when you make changes.

### `npm run build`

Builds the app for production to the `.next` folder.\
It optimizes the build for the best performance with automatic code splitting, image optimization, and more.

### `npm start`

Runs the production build created by `npm run build`.\
Use this to test the production version locally.

### `npm run lint`

Runs Next.js ESLint to check for code quality issues.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Project Structure

```
auth-reactmsal-quickstart/
├── app/
│   ├── components/
│   │   └── MsalProvider.tsx    # MSAL provider wrapper
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── page.module.css          # Page styles
├── lib/
│   ├── authConfig.ts            # MSAL configuration
│   └── apiClient.ts             # API client utilities
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
└── package.json
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure AD Documentation](https://docs.microsoft.com/azure/active-directory/)
