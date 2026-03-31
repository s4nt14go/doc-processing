/**
 * Script to list all document processing tasks.
 * Usage: node --env-file=.env scripts/list_processes.ts
 */
import { getErrMsg, hasErrorProp } from '../src/shared/utils/utils.ts';

const API_URL = process.env.API_URL;

async function listProcesses() {
  if (!API_URL) {
    console.error('API_URL not found in environment. Please check your .env file.');
    process.exit(1);
  }

  const url = `${API_URL}/process/list`;
  console.log(`Listing processes from ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await response.json() as any;

    if (response.ok) {
      console.log('Processes List:');
      console.table(result);
    } else {
      const errorMessage = hasErrorProp(result) ? result.error : response.statusText;
      console.error(`Failed to list processes: ${errorMessage}`);
    }
  } catch (e: unknown) {
    console.error(`Error listing processes: ${getErrMsg(e)}`);
  }
}

listProcesses().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
