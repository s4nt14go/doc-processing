import fs from 'fs';
import path from 'path';

/**
 * Script to upload .txt files from a folder to the Document Processing API.
 * Run this command from the project root:
 * node --experimental-strip-types --env-file=.env scripts/upload_txt.ts <folder_path>
 */

const API_URL = process.env.API_URL;
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit to stay safe (Lambda limit is 6MB)

if (!API_URL) {
  console.error('API_URL not found in environment. Please check your .env file.');
  process.exit(1);
}

async function uploadFiles() {
  const folderPath = process.argv[2];

  if (!folderPath) {
    console.error('Please provide a folder path.');
    console.log('Usage: node --experimental-strip-types --env-file=.env upload_txt.ts <folder_path>');
    process.exit(1);
  }

  const absoluteFolderPath = path.resolve(folderPath);

  if (!fs.existsSync(absoluteFolderPath)) {
    console.error(`Folder not found: ${absoluteFolderPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(absoluteFolderPath)
    .filter(file => file.endsWith('.txt'))
    .map(file => ({
      name: file,
      path: path.join(absoluteFolderPath, file)
    }));

  if (files.length === 0) {
    console.log('No .txt files found in the specified folder.');
    return;
  }

  console.log(`Found ${files.length} .txt files. Starting upload to ${API_URL}...`);

  let currentBatch: { name: string, content: string }[] = [];
  let currentBatchSize = 0;

  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');
    const fileDto = { name: file.name, content };
    const fileSize = Buffer.byteLength(JSON.stringify(fileDto));

    // Calculate overhead for the wrapping { files: [...] } structure
    const overhead = Buffer.byteLength(JSON.stringify({ files: [] }));
    
    if (currentBatchSize + fileSize + overhead > MAX_PAYLOAD_SIZE) {
      if (currentBatch.length > 0) {
        await sendBatch(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
      
      // If a single file exceeds the limit, we have to skip it or handle it specially
      if (fileSize + overhead > MAX_PAYLOAD_SIZE) {
        console.warn(`File ${file.name} is too large to process (${(fileSize / 1024 / 1024).toFixed(2)}MB). Skipping.`);
        continue;
      }
    }

    currentBatch.push(fileDto);
    currentBatchSize += fileSize;
  }

  if (currentBatch.length > 0) {
    await sendBatch(currentBatch);
  }

  console.log('All batches processed.');
}

async function sendBatch(files: { name: string, content: string }[]) {
  console.log(`Sending batch with ${files.length} files...`);
  
  try {
    const response = await fetch(API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files })
    });

    const result = await response.json() as any;

    if (response.ok) {
      console.log(`Successfully started process. ID: ${result.process_id}`);
    } else {
      console.error(`Failed to start process: ${result.error || response.statusText}`);
    }
  } catch (error: any) {
    console.error(`Error sending batch: ${error.message}`);
  }
}

uploadFiles().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
