# Azure Blob Storage Sample - Node.js/TypeScript

This sample demonstrates how to upload and download files to/from Azure Blob Storage using the Azure SDK for JavaScript/TypeScript.

## Features

- **Upload files** from local file system to Azure Blob Storage
- **Upload files using streams** for efficient large file handling
- **Download blobs** to local files
- **Download blobs as streams** for memory-efficient processing
- Uses **DefaultAzureCredential** for secure authentication

## Prerequisites

- Node.js 18 or higher
- An Azure Storage account
- Azure CLI installed and authenticated (`az login`)
- Appropriate permissions on the storage account (e.g., Storage Blob Data Contributor role)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.sample` to `.env` and update with your values:
   ```bash
   cp .env.sample .env
   ```
   
   Edit `.env`:
   ```
   STORAGE_ACCOUNT_NAME=your-storage-account-name
   CONTAINER_NAME=buildingimages
   SAMPLE_IMAGE_NAME=structural-arrangement.jpg
   ```

3. **Ensure authentication**:
   Make sure you're logged in with Azure CLI:
   ```bash
   az login
   ```

4. **Set up permissions**:
   Your Azure account needs the "Storage Blob Data Contributor" role on the storage account:
   ```bash
   az role assignment create \
     --role "Storage Blob Data Contributor" \
     --assignee your-email@example.com \
     --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/<storage-account-name>
   ```

## Running the Sample

Run the sample using:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## What the Sample Does

The sample demonstrates four key operations:

1. **Upload a file from the local file system**
   - Uploads an image file from `sampleimages` folder
   - Blob name is taken from `SAMPLE_IMAGE_NAME` environment variable
   - Displays the blob URL and file size

2. **Upload a file using a stream**
   - Creates a readable stream from the local image file
   - Uploads using `uploadStream()` method with configurable buffer size and concurrency
   - Saves blob with `-from-stream` suffix (e.g., `structural-arrangement-from-stream.jpg`)
   - Efficient for large files with lower memory footprint

3. **Download a blob to a local file**
   - Downloads the blob specified by `SAMPLE_IMAGE_NAME` to local file system
   - Saves to `sampleimages` folder with `downloaded-` prefix
   - Displays file size after download

4. **Download a blob as a stream**
   - Downloads the blob uploaded by the stream upload example (with `-from-stream` suffix)
   - Uses stream piping for memory-efficient download
   - Saves to `sampleimages` folder with `downloaded-stream-` prefix
   - Displays content type and file size

## Container Information

The sample uses the container name: **`buildingimages`** (configurable via `CONTAINER_NAME` environment variable)

The container will be created automatically if it doesn't exist.

## Sample Image

Place your image file in the `sampleimages` folder and configure the filename in the `.env` file using the `SAMPLE_IMAGE_NAME` variable. The default sample uses `structural-arrangement.jpg`.

## Authentication

This sample uses `DefaultAzureCredential`, which automatically tries multiple authentication methods in order:
1. Environment variables
2. Managed Identity (when deployed to Azure)
3. Azure CLI credentials
4. Visual Studio credentials
5. And more...

For local development, it typically uses your Azure CLI login credentials.

## Code Structure

- `examples/usage.ts` - Main sample code with all examples
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (not committed to git)
- `.env.sample` - Template for environment variables

## Learn More

- [Azure Storage samples using JavaScript client libraries](https://learn.microsoft.com/en-us/azure/storage/common/storage-samples-javascript?toc=%2Fazure%2Fstorage%2Fblobs%2Ftoc.json#blob-samples)
- [Azure Blob Storage documentation](https://docs.microsoft.com/azure/storage/blobs/)
- [Azure SDK for JavaScript/TypeScript](https://github.com/Azure/azure-sdk-for-js)
- [DefaultAzureCredential](https://docs.microsoft.com/javascript/api/@azure/identity/defaultazurecredential)