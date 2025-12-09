# Node.js Auth & Cosmos DB Quickstart

This project demonstrates a secure Node.js/Express backend using **Azure Cosmos DB** (NoSQL) for data storage and **Microsoft Entra ID** (formerly Azure AD) for authentication.

## Features

*   **Authentication**: Validates Azure AD JWT Access Tokens (RS256).
*   **Authorization**: Role-based access control (RBAC) using custom logic.
*   **Database**: Azure Cosmos DB with Hierarchical Partition Keys (`/client_name`, `/slug`).
*   **Security**: Uses `DefaultAzureCredential` (Managed Identity) - No keys in code!
*   **Caching**: In-memory or Redis caching layer.

---

## Prerequisites

1.  **Node.js** (v18+)
2.  **Azure CLI** (`az login` required for local development)
3.  **Azure Subscription**

---

## 1. Azure Setup

### A. Cosmos DB
1.  Create an **Azure Cosmos DB for NoSQL** account.
2.  **Important**: Assign yourself the necessary RBAC roles. We have provided a script to create a custom role with all necessary permissions and assign it to your user.
    *   Get your User Object ID (Principal ID):
        ```bash
        az ad signed-in-user show --query id -o tsv
        ```
    *   Run the RBAC setup script (PowerShell):
        ```powershell
        ./scripts/setup-cosmos-rbac.ps1 -resourceGroupName "<your-resource-group>" -accountName "<your-cosmos-account-name>" -principalId "<your-principal-id>"
        ```
    *   *Note: This creates a custom role "AllActionsRole" and assigns it to you. This allows your local `az login` credential to read/write data.*

### B. Entra ID (App Registration)
1.  Go to **Microsoft Entra ID** > **App registrations** > **New registration**.
2.  **Name**: `NodeAuthQuickstart` (or similar).
3.  **Supported account types**: "Accounts in this organizational directory only" (Single Tenant).
4.  **Redirect URI**: Select **Single-page application (SPA)** and enter `http://localhost:3000` (or your frontend URL).
5.  Click **Register**.

#### Configure Token
1.  Go to **Expose an API**.
2.  **Set** the Application ID URI (accept the default `api://<client-id>`).
3.  **Scopes**: You can skip creating a custom scope if you use the `.default` scope on the client side.
    *   Client Scope to request: `api://<client-id>/.default`
    *   This will issue a valid token for your API audience.

---

## 2. Local Configuration

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create your environment file:
    ```bash
    cp .env.example .env
    ```
4.  Update `.env` with your values:

    ```env
    # Cosmos DB
    COSMOS_ENDPOINT=https://<your-account>.documents.azure.com:443/
    # Defaults to "MyDatabase" and "Items" if omitted
    COSMOS_DATABASE=<your-database-name>
    COSMOS_CONTAINER=<your-container-name>

    # Entra ID
    ENTRA_TENANT_ID=<your-tenant-id>
    ENTRA_CLIENT_ID=<your-client-id-guid>    
    ENTRA_AUDIENCE=api://<your-client-id-guid>
    ```

---

## 3. Database Initialization

Before running the app, you must create the Database and Container. We use a script for this to ensure the correct **Hierarchical Partition Key** (`/client_name`, `/slug`) is set.

*Note: If your Database and Container already exist with the correct configuration, you can skip this step.*

1.  Ensure you are logged in:
    ```bash
    az login
    ```
2.  Run the setup script:
    ```bash
    npm run setup
    ```
    *Output should show: "Setup completed successfully!"*

---

## 4. Seeding Data

Populate the database with a sample project and user.

```bash
npm run seed -- --owner-id <your-entra-object-id>
```
*   Replace `<your-entra-object-id>` with your actual User Object ID from Entra ID.

---

## 5. Running the Server

```bash
npm start
```
The server will start on `http://localhost:3001`.

---

## 6. Testing

### Using Real Azure Tokens
1.  Use a tool like **Bruno** or **Postman**.
2.  Configure OAuth 2.0 Authorization Code Flow (PKCE).
    *   **Auth URL**: `https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/authorize`
    *   **Token URL**: `https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token`
    *   **Client ID**: `<your-client-id>`
    *   **Scope**: `api://<client-id>/.default`
3.  Get the token and call the API.

---

## API Endpoints

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health check | Public |
| `GET` | `/api/projects` | List user's projects | Auth Required |
| `POST` | `/api/projects` | Create a new project | Auth Required |
| `GET` | `/api/projects/:client/:slug` | Get project details | Project Member |
| `PUT` | `/api/projects/:client/:slug` | Update project | Editor/Owner |
| `DELETE` | `/api/projects/:client/:slug` | Delete project | Owner |
| `GET` | `/api/projects/:client/:slug/members` | List project members | Owner |
| `POST` | `/api/projects/:client/:slug/members` | Add project member | Owner |
| `PATCH` | `/api/projects/:client/:slug/members/:userId` | Update member role | Owner |
| `DELETE` | `/api/projects/:client/:slug/members/:userId` | Remove member | Owner |
