/**
 * Script to list all document processing tasks.
 * Usage: node --env-file=.env scripts/list_processes.ts
 */

const API_URL = process.env.API_URL;

async function listProcesses() {
  if (!API_URL) {
    console.error('API_URL not found in environment. Please check your .env file.');
    process.exit(1);
  }

  const url = `${API_URL}/process/list`;
  console.log(`Fetching all processes from ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json() as any[];

    if (response.ok) {
      console.log('--- Current Processes ---');
      if (result.length === 0) {
        console.log('No processes found.');
      } else {
        console.table(result.map(p => ({
          id: p.id,
          status: p.status,
          progress: p.progress ? `${p.progress.percentage}%` : 'N/A',
          startedAt: p.startedAt || 'N/A'
        })));
      }
    } else {
      console.error(`Failed to list processes: ${(result as any).error || response.statusText}`);
    }
  } catch (error: any) {
    console.error(`Error fetching processes: ${error.message}`);
  }
}

listProcesses().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
