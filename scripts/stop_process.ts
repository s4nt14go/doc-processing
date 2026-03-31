/**
 * Script to stop a document processing task.
 * Usage: node --env-file=.env scripts/stop_process.ts <process_id>
 */
import { getErrMsg, hasErrorProp } from '../src/shared/utils/utils.ts';

const API_URL = process.env.API_URL;

async function stopProcess() {
  const processId = process.argv[2];

  if (!API_URL) {
    console.error('API_URL not found in environment. Please check your .env file.');
    process.exit(1);
  }

  if (!processId) {
    console.error('Please provide a process ID.');
    console.log('Usage: node --env-file=.env scripts/stop_process.ts <process_id>');
    process.exit(1);
  }

  const url = `${API_URL}/process/stop/${processId}`;
  console.log(`Stopping process: ${processId} at ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await response.json() as any;

    if (response.ok) {
      console.log('Process successfully stopped:', JSON.stringify(result, null, 2));
    } else {
      const errorMessage = hasErrorProp(result) ? result.error : response.statusText;
      console.error(`Failed to stop process: ${errorMessage}`);
    }
  } catch (e: unknown) {
    console.error(`Error stopping process: ${getErrMsg(e)}`);
  }
}

stopProcess().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
