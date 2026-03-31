/**
 * Script to check the results of a document processing task.
 * Usage: node --env-file=.env scripts/get_results.ts <process_id>
 */
import { getErrMsg, hasErrorProp } from '../src/shared/utils/utils.ts';

const API_URL = process.env.API_URL;

async function getResults() {
  const processId = process.argv[2];

  if (!API_URL) {
    console.error('API_URL not found in environment. Please check your .env file.');
    process.exit(1);
  }

  if (!processId) {
    console.error('Please provide a process ID.');
    console.log('Usage: node --env-file=.env scripts/get_results.ts <process_id>');
    process.exit(1);
  }

  const url = `${API_URL}/process/results/${processId}`;
  console.log(`Checking results for process: ${processId} at ${url}...`);

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
      console.log('Process Results:', JSON.stringify(result, null, 2));
    } else {
      const errorMessage = hasErrorProp(result) ? result.error : response.statusText;
      console.error(`Failed to get results: ${errorMessage}`);
    }
  } catch (e: unknown) {
    console.error(`Error fetching results: ${getErrMsg(e)}`);
  }
}

getResults().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
