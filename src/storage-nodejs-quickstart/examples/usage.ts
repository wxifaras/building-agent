import { BlobServiceClient, BlockBlobClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Azure Blob Storage - Upload and Download Sample
 * 
 * This sample demonstrates how to:
 * 1. Connect to Azure Blob Storage using DefaultAzureCredential
 * 2. Upload a file to a blob container
 * 3. Download a file from a blob container
 * 4. List blobs in a container
 */

// Configuration - Update these values or use environment variables
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME || '<your-storage-account-name>';
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'sample-container';
const SAMPLE_IMAGE_NAME = process.env.SAMPLE_IMAGE_NAME || 'structural-arrangement.png';

async function main() {
  try {
    console.log('Azure Blob Storage Sample\n');

    // Create BlobServiceClient using DefaultAzureCredential
    const credential = new DefaultAzureCredential();
    const blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      credential
    );

    // Get container client
    const containerClient: ContainerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    // Ensure container exists
    await containerClient.createIfNotExists();
    console.log(`Container "${CONTAINER_NAME}" is ready\n`);

    // Example 1: Upload a file from local file system
    //await uploadFileExample(containerClient);

    // Example 2: Upload a file using stream
    await uploadStreamExample(containerClient);

    // Example 3: Download a blob to local file
    //await downloadFileExample(containerClient);

    // Example 4: Download a blob as a stream
    await downloadStreamExample(containerClient);

    console.log('\n✅ All operations completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Upload a file from the local file system to blob storage
 */
async function uploadFileExample(containerClient: ContainerClient): Promise<void> {
  console.log('--- Example 1: Upload Image File from Local File System ---');

  const localFilePath = path.join(__dirname, '..', 'sampleimages', SAMPLE_IMAGE_NAME);
  
  // Check if file exists
  if (!fs.existsSync(localFilePath)) {
    console.log(`⚠️  File not found: ${localFilePath}`);
    console.log('   Skipping upload example\n');
    return;
  }

  const blobName = SAMPLE_IMAGE_NAME;
  const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);

  console.log(`Uploading image file to blob: ${blobName}`);
  console.log(`  Source: ${localFilePath}`);
  const uploadResponse = await blockBlobClient.uploadFile(localFilePath, {
    blobHTTPHeaders: { blobContentType: 'image/png' }
  });
  
  console.log(`✓ Upload successful!`);
  console.log(`  Request ID: ${uploadResponse.requestId}`);
  console.log(`  Blob URL: ${blockBlobClient.url}`);
  
  // Get file size
  const stats = fs.statSync(localFilePath);
  console.log(`  File size: ${(stats.size / 1024).toFixed(2)} KB\n`);
}

/**
 * Upload a file using a readable stream
 */
async function uploadStreamExample(containerClient: ContainerClient): Promise<void> {
  console.log('--- Example 2: Upload Image File from Stream ---');

  const localFilePath = path.join(__dirname, '..', 'sampleimages', SAMPLE_IMAGE_NAME);
  
  // Check if file exists
  if (!fs.existsSync(localFilePath)) {
    console.log(`⚠️  File not found: ${localFilePath}`);
    console.log('   Skipping stream upload example\n');
    return;
  }

  // Create a readable stream
  const readStream = fs.createReadStream(localFilePath);
  
  const fileExtension = path.extname(SAMPLE_IMAGE_NAME);
  const baseName = path.basename(SAMPLE_IMAGE_NAME, fileExtension);
  const blobName = baseName + '-from-stream' + fileExtension;
  const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);

  console.log(`Uploading image from stream to blob: ${blobName}`);
  console.log(`  Source: ${localFilePath}`);
  
  // Get file size for the upload
  const stats = fs.statSync(localFilePath);
  const fileSize = stats.size;
  
  const uploadResponse = await blockBlobClient.uploadStream(
    readStream,
    4 * 1024 * 1024, // Buffer size: 4MB
    5, // Max concurrency: 5 concurrent uploads
    {
      blobHTTPHeaders: { blobContentType: 'image/png' }
    }
  );
  
  console.log(`✓ Stream upload successful!`);
  console.log(`  Request ID: ${uploadResponse.requestId}`);
  console.log(`  Blob URL: ${blockBlobClient.url}`);
  console.log(`  File size: ${(fileSize / 1024).toFixed(2)} KB\n`);
}

/**
 * Download a blob to a local file
 */
async function downloadFileExample(containerClient: ContainerClient): Promise<void> {
  console.log('--- Example 3: Download Image Blob to Local File ---');

  const blobName = SAMPLE_IMAGE_NAME;
  const downloadFileName = 'downloaded-' + SAMPLE_IMAGE_NAME;
  const downloadFilePath = path.join(__dirname, '..', 'sampleimages', downloadFileName);
  const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);

  console.log(`Downloading blob "${blobName}" to: ${downloadFilePath}`);
  
  try {
    await blockBlobClient.downloadToFile(downloadFilePath);

    console.log(`✓ Download successful!`);
    console.log(`  File saved to: ${downloadFilePath}`);
    
    // Get file size
    const stats = fs.statSync(downloadFilePath);
    console.log(`  File size: ${(stats.size / 1024).toFixed(2)} KB\n`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`⚠️  Blob not found. Make sure to run the upload example first.\n`);
    } else {
      throw error;
    }
  }
}

/**
 * Download a blob as a stream and save it to a file
 */
async function downloadStreamExample(containerClient: ContainerClient): Promise<void> {
  console.log('--- Example 4: Download Image Blob as Stream ---');

  const fileExtension = path.extname(SAMPLE_IMAGE_NAME);
  const baseName = path.basename(SAMPLE_IMAGE_NAME, fileExtension);
  const blobName = baseName + '-from-stream' + fileExtension;
  const downloadFileName = 'downloaded-stream-' + SAMPLE_IMAGE_NAME;
  const downloadFilePath = path.join(__dirname, '..', 'sampleimages', downloadFileName);
  const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);

  console.log(`Downloading blob "${blobName}" as stream to: ${downloadFilePath}`);
  
  try {
    // Download blob as a stream
    const downloadResponse = await blockBlobClient.download();
    
    if (!downloadResponse.readableStreamBody) {
      throw new Error('No readable stream body in download response');
    }

    // Create a write stream to save the downloaded content
    const writeStream = fs.createWriteStream(downloadFilePath);

    // Pipe the download stream to the file
    await new Promise<void>((resolve, reject) => {
      downloadResponse.readableStreamBody!
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    console.log(`✓ Stream download successful!`);
    console.log(`  File saved to: ${downloadFilePath}`);
    
    // Get file size
    const stats = fs.statSync(downloadFilePath);
    console.log(`  File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Content Type: ${downloadResponse.contentType || 'unknown'}\n`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`⚠️  Blob not found. Make sure to run the upload example first.\n`);
    } else {
      throw error;
    }
  }
}

// Run the main function
main();