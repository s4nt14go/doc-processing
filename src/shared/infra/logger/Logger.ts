import { Logger } from '@aws-lambda-powertools/logger';

/**
 * Structured Logger for AWS Lambda environments.
 * It automatically handles JSON formatting and CloudWatch integration.
 */
export const logger = new Logger({
  serviceName: 'document-processing',
  logLevel: 'INFO',
});

// Example of how to add Lambda context (optional, call from your handler)
// logger.addContext(context);