import { describe, it, expect } from 'vitest';
import { PROCESS_STATUS } from '../domain/ProcessStatus.ts';

const API_URL = process.env.API_URL;
if (!API_URL)
  throw new Error('API_URL is not defined in the environment. E2E test cannot run.');

describe('Document Processing System E2E', () => {

  it('should complete the full document processing lifecycle', async () => {
    // 1. Start the process
    console.log('E2E: Starting process...');
    const startResponse = await fetch(`${API_URL}/process/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          {
            name: 'e2e_test.txt',
            content: 'This is a test document for the end-to-end flow. It contains multiple words to verify statistics.'
          }
        ]
      })
    });

    expect(startResponse.status).toBe(201);
    const startResult = await startResponse.json() as { process_id: string };
    const processId = startResult.process_id;
    expect(processId).toBeDefined();

    // 2. Poll for status until COMPLETED
    console.log(`E2E: Polling for status of process ${processId}...`);
    let status = 'PENDING';
    let attempts = 0;
    const maxAttempts = 15;

    while (status !== PROCESS_STATUS.COMPLETED && status !== PROCESS_STATUS.FAILED && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s between polls
      
      const statusResponse = await fetch(`${API_URL}/process/status/${processId}`);
      const statusResult = await statusResponse.json() as { status: string };
      status = statusResult.status;
      attempts++;
      console.log(`E2E: Attempt ${attempts}, current status: ${status}`);
    }

    expect(status).toBe(PROCESS_STATUS.COMPLETED);

    // 3. Retrieve and validate final results
    console.log('E2E: Fetching results...');
    const resultsResponse = await fetch(`${API_URL}/process/results/${processId}`);
    expect(resultsResponse.status).toBe(200);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await resultsResponse.json() as any;
    console.log(`E2E: Finished process ${processId} results...`, results);
    
    // Validate statistics
    expect(results.totalWords).toBeGreaterThan(0);
    expect(results.totalLines).toBeGreaterThan(0);
    expect(results.totalCharacters).toBeGreaterThan(0);
    expect(results.filesProcessed).toContain('e2e_test.txt');
    
    // Validate AI Summary presence
    expect(results.fileSummaries['e2e_test.txt']).toBeDefined();
    expect(typeof results.fileSummaries['e2e_test.txt']).toBe('string');
    expect(results.fileSummaries['e2e_test.txt'].length).toBeGreaterThan(10);

    console.log('E2E: Test completed successfully!');
  });
});
