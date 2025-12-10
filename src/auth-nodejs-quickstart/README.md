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
2.  **Name**: `AuthQuickstart` (or similar).
3.  **Supported account types**: "Accounts in this organizational directory only" (Single Tenant).
4.  **Redirect URI**: Select **Single-page application (SPA)** and enter `http://localhost:3000` (or your frontend URL).
5.  Click **Register**.

#### Expose an API
1.  Go to **Expose an API**.
2.  Click **Set** next to Application ID URI and accept the default `api://<client-id>`.
3.  Click **Add a scope**:
    *   **Scope name**: `access`
    *   **Who can consent**: `Admins and users`
    *   **Admin consent display name**: `Access as Admin`
    *   **Admin consent description**: `Access as Admin`
    *   **User consent display name**: `Access as User`
    *   **User consent description**: `Access as User`
    *   **State**: `Enabled`
4.  Click **Add scope**.

#### Configure Token
*   Client can request the `access` scope: `api://<client-id>/access`

### C. Azure Managed Redis (Optional)

For production environments, use Azure Managed Redis instead of in-memory caching. Azure Managed Redis is built on Redis Enterprise and provides superior performance, reliability, and Microsoft Entra ID authentication.

1.  **Create Azure Managed Redis instance**:
    ```bash
    az managed-redis create \
      --name <your-redis-name> \
      --resource-group <your-resource-group> \
      --location <region> \
      --sku Balanced \
      --sku-capacity B1
    ```
    
    **SKU Options**:
    - `Memory Optimized` (M) - Best for memory-intensive workloads (8:1 memory-to-vCPU ratio)
    - `Balanced` (B) - Balanced memory and compute (4:1 ratio) - **Recommended for most workloads**
    - `Compute Optimized` (X) - Maximum throughput (2:1 ratio)
    - `Flash Optimized` (F) - Cost-effective with NVMe storage (Preview)

2.  **Assign Redis Data Contributor Access Policy**:
    
    Get your user's Object ID:
    ```bash
    az ad signed-in-user show --query id -o tsv
    ```
    
    Assign data access:
    ```bash
    az managed-redis access-policy-assignment create \
      --resource-group <your-resource-group> \
      --cache-name <your-redis-name> \
      --access-policy-assignment-name "MyUserAccess" \
      --access-policy-name "Data Contributor" \
      --object-id <your-object-id> \
      --object-id-alias "YourAlias"
    ```

3.  **Update your `.env` file**:
    ```env
    CACHE_ENABLED=true
    CACHE_TYPE=redis
    REDIS_URL=<your-redis-name>.redis.azure.net
    ```

**Note**: Azure Managed Redis uses Microsoft Entra ID authentication by default. For local development, the app uses `DefaultAzureCredential` which authenticates using your `az login` session. For production deployments, use Managed Identity.

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
npm run seed -- --owner-id <your-entra-object-id> --owner-email <your-email> --owner-name "Your Name"
```
*   Replace `<your-entra-object-id>` with your actual User Object ID from Entra ID (the `oid` claim from your token).
*   Replace `<your-email>` with your email address (the `upn` or `email` claim from your token).
*   Replace `"Your Name"` with your display name (the `name` claim from your token).

**Example:**
```bash
npm run seed -- --owner-id "8634b9ec-0ff8-4f23-a108-3b78989ece44" --owner-email "admin@contoso.com" --owner-name "John Doe"
```

**Tip:** You can get these values from your JWT token at https://jwt.ms by signing in and viewing the decoded token claims.

---

## 5. Running the Server

```bash
npm start
```
The server will start on `http://localhost:3001`.

---

## 6. Testing

### Using Swagger UI

The easiest way to test the API is using the built-in Swagger documentation:

1.  Start the server:
    ```bash
    npm run dev
    ```
2.  Open your browser to http://localhost:3001/api-docs
3.  Get an access token:
    *   Open the Next.js frontend at http://localhost:3000 (see `../auth-reactmsal-quickstart`)
    *   Sign in and click "Get Token & Copy"
    *   Or get a token from https://jwt.ms
4.  Authenticate in Swagger:
    *   Click the **Authorize** button (green lock icon)
    *   Enter your token in the format: `Bearer <your-token>`
    *   Click **Authorize**
5.  Test endpoints directly in the Swagger UI

### Using the Next.js Frontend

You can also test the API using the included Next.js frontend application with MSAL authentication:

1.  Navigate to the Next.js app directory:
    ```bash
    cd ../auth-reactmsal-quickstart
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure the app with your Entra ID settings (see the app's README).
4.  Start the app:
    ```bash
    npm run dev
    ```
5.  The app will handle authentication and provide tokens for API testing.

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
