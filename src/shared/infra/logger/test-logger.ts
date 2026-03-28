// node --experimental-strip-types src/shared/infra/logger/test-logger.ts
import { logger } from './Logger.ts';

/**
 * Test script to demonstrate structured logging
 */
function testLogger(): void {
  // Simple info log
  logger.info('Starting test script...');

  // Structured log with additional context (JSON)
  logger.info('Processing a mock document', {
    documentId: 'doc_12345',
    metadata: {
      size: 1024,
      format: 'pdf',
    },
    tags: ['test', 'lambda', 'structured-logging'],
  });

  // Error log with context
  try {
    throw new Error('Something went wrong during processing');
  } catch (error) {
    logger.error('Caught an expected error', { 
      error, 
      operation: 'database-sync' 
    });
  }

  logger.info('Test completed successfully!');
}

testLogger();