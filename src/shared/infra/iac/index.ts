export default async function main() {
  // Database Connection String
  // SST reads from your local .env during 'sst deploy' or 'sst dev'.
  // The value is injected into the Lambda's environment variables.
  const { DATABASE_URL, GEMINI_API_KEY } = process.env;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in your environment or .env file.');
  }

  if (!GEMINI_API_KEY)
    throw new Error('GEMINI_API_KEY is not defined in your environment or .env file.');

  // Define the Dead Letter Queue
  const dlq = new sst.aws.Queue('ProcessDLQ');

  // Define the SQS Queue for document processing
  const queue = new sst.aws.Queue('Process', {
    visibilityTimeout: '150 seconds', // 150s (2.5 min) is 25% longer than 2 min worker lambda timeout
    dlq: {
      queue: dlq.arn,
      // The 'retry' property sets the maxReceiveCount for the DLQ.
      // 3 is the default value in SST v4 if omitted.
      retry: 3,
    },
  });

  // Define the REST API
  const api = new sst.aws.ApiGatewayV2('DocumentApi');

  // Common configuration for use case Lambdas
  const commonConfig = {
    environment: {
      DATABASE_URL,
      APP_STAGE: $app.stage,
    },
    // Sequelize requires pg and pg-hstore to be installed manually in the Lambda environment
    // because they are often not correctly bundled by esbuild.
    nodejs: {
      install: ['pg', 'pg-hstore'],
    },
  };

  queue.subscribe({
    handler: 'src/modules/documentProcessing/useCases/worker/index.handler',
    ...commonConfig,
    environment: {
      ...commonConfig.environment,
      GEMINI_API_KEY,
    },
    timeout: '2 minutes', // Allow enough time for processing multiple documents
  });

  // Register the StartProcess route
  api.route('POST /process/start', {
    handler: 'src/modules/documentProcessing/useCases/startProcess/index.handler',
    link: [queue],
    ...commonConfig,
  });

  // Register the GetStatus route
  api.route('GET /process/status/{id}', {
    handler: 'src/modules/documentProcessing/useCases/getStatus/index.handler',
    ...commonConfig,
  });

  // Register the GetResults route
  api.route('GET /process/results/{id}', {
    handler: 'src/modules/documentProcessing/useCases/getResults/index.handler',
    ...commonConfig,
  });

  // Register the ListProcesses route
  api.route('GET /process/list', {
    handler: 'src/modules/documentProcessing/useCases/listProcesses/index.handler',
    ...commonConfig,
  });

  // Register the StopProcess route
  api.route('POST /process/stop/{id}', {
    handler: 'src/modules/documentProcessing/useCases/stopProcess/index.handler',
    ...commonConfig,
  });
};
