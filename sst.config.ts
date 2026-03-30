/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST v3 Configuration.
 * This file defines the AWS infrastructure for the Document Processing System.
 */
export default $config({
  app() {
    return {
      name: 'doc-processing',
      home: 'aws',
    };
  },
  async run() {
    // Database Connection String
    // SST reads from your local .env during 'sst deploy' or 'sst dev'.
    // The value is injected into the Lambda's environment variables.
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in your environment or .env file.');
    }

    // Define the SQS Queue for document processing
    const queue = new sst.aws.Queue('Process', {
      visibilityTimeout: '150 seconds', // 150s (2.5 min) is 25% longer than 2 min worker lambda timeout
    });

    // Define the REST API
    const api = new sst.aws.ApiGatewayV2('DocumentApi');

    // Common configuration for use case Lambdas
    const commonConfig = {
      environment: {
        DATABASE_URL: databaseUrl,
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
      timeout: '2 minutes', // Allow enough time for processing multiple documents
    });

    // Register the StartProcess route
    api.route('POST /process/start', {
      handler: 'src/modules/documentProcessing/useCases/startProcess/index.handler',
      link: [queue],
      ...commonConfig,
    });

    // Register the GetStatus route
    api.route('GET /process/{id}', {
      handler: 'src/modules/documentProcessing/useCases/getStatus/index.handler',
      ...commonConfig,
    });

    // Output the API URL
    return {
      apiUrl: api.url,
    };
  },
});
