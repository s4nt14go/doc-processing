/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST v3 Configuration.
 * This file defines the AWS infrastructure for the Document Processing System.
 */
export default $config({
  app(input) {
    return {
      name: 'doc-processing',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
    };
  },
  async run() {
    // 1. Database Connection String
    // SST reads from your local .env during 'sst deploy' or 'sst dev'.
    // The value is injected into the Lambda's environment variables.
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in your environment or .env file.');
    }

    // 2. Define the SQS Queue for document processing
    const queue = new sst.aws.Queue('Process');

    // 3. Define the REST API
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

    // 4. Register the StartProcess route
    api.route('POST /process/start', {
      handler: 'src/modules/documentProcessing/useCases/startProcess/index.handler',
      link: [queue],
      ...commonConfig,
    });

    // 5. Register the GetStatus route
    api.route('GET /process/{id}', {
      handler: 'src/modules/documentProcessing/useCases/getStatus/index.handler',
      ...commonConfig,
    });

    // 6. Output the API URL
    return {
      apiUrl: api.url,
    };
  },
});
