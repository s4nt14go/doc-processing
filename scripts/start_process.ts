/**
 * Script to start a document processing task.
 * Usage: node --env-file=.env scripts/start_process.ts <folder_path>
 */
import fs from 'node:fs';
import path from 'node:path';
import { getErrMsg, hasErrorProp } from '../src/shared/utils/utils.ts';

const API_URL = process.env.API_URL;
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit to stay safe (Lambda limit is 6MB)

async function startProcess() {
  if (!API_URL) {
    console.error('API_URL not found in environment. Please check your .env file.');
    process.exit(1);
  }

  const dirPath = process.argv[2];

  if (!dirPath) {
    console.error('Please provide a folder path.');
    console.log('Usage: node --env-file=.env scripts/start_process.ts <folder_path>');
    process.exit(1);
  }

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    console.error(`The path "${dirPath}" is not a valid directory.`);
    process.exit(1);
  }

  const allFiles: { name: string; content: string }[] = [];

  try {
    const dirFiles = fs.readdirSync(dirPath);
    for (const file of dirFiles) {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isFile() && file.endsWith('.txt')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        allFiles.push({ name: file, content });
      }
    }
  } catch (e: unknown) {
    console.error(`Error reading directory: ${getErrMsg(e)}`);
    process.exit(1);
  }

  if (allFiles.length === 0) {
    console.error('No valid .txt files found in the directory to process.');
    process.exit(1);
  }

  const url = `${API_URL}/process/start`;
  console.log(`Found ${allFiles.length} files. Starting upload to ${url} in batches...`);

  let currentBatch: { name: string; content: string }[] = [];
  let currentBatchSize = 0;

  for (const file of allFiles) {
    const fileSize = Buffer.byteLength(JSON.stringify(file));
    
    // Overhead check for the wrapping { files: [] }
    const overhead = Buffer.byteLength(JSON.stringify({ files: [] }));

    if (currentBatchSize + fileSize + overhead > MAX_PAYLOAD_SIZE) {
      if (currentBatch.length > 0) {
        await sendBatch(url, currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }

      // If a single file exceeds the limit, skip it
      if (fileSize + overhead > MAX_PAYLOAD_SIZE) {
        console.warn(`File "${file.name}" is too large to process (${(fileSize / 1024 / 1024).toFixed(2)}MB). Skipping.`);
        continue;
      }
    }

    currentBatch.push(file);
    currentBatchSize += fileSize;
  }

  if (currentBatch.length > 0) {
    await sendBatch(url, currentBatch);
  }

  console.log('All batches processed.');
}

async function sendBatch(url: string, files: { name: string; content: string }[]) {
  console.log(`Sending batch with ${files.length} files...`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Batch successfully started. ID:', (result as any).process_id);
    } else {
      const errorMessage = hasErrorProp(result) ? (result as any).error : response.statusText;
      console.error(`Failed to start batch: ${errorMessage}`);
    }
  } catch (e: unknown) {
    console.error(`Error sending batch: ${getErrMsg(e)}`);
  }
}

startProcess().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
