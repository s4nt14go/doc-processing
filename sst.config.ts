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
    const infra = await import('./src/shared/infra/iac/index.ts');
    return infra.default();
  },
});
