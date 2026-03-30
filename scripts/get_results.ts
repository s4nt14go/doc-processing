/**
 * Script to retrieve the analysis results of a completed document processing task.
 * Usage: node --env-file=.env scripts/get_results.ts <process_id>
 */

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
  console.log(`Fetching results for process: ${processId} from ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json() as any;

    if (response.ok) {
      console.log('--- Process Results ---');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`Failed to get results: ${result.error || response.statusText}`);
      if (result.status) {
        console.log(`Current process status is: ${result.status}`);
      }
    }
  } catch (error: any) {
    console.error(`Error fetching results: ${error.message}`);
  }
}

getResults().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
