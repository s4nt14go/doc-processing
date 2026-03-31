import { defineConfig } from 'vitest/config';
import * as dotenv from 'dotenv';

export default defineConfig(() => {
  const TEST_MODE = process.env.TEST_MODE || 'unit';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const test: any = {
    env: {
      APP_STAGE: 'test',
    },
  };

  switch (TEST_MODE) {
    case 'unit':
      test.include = ['**/*.unit.ts'];
      break;

    case 'e2e':
      dotenv.config({ path: '.env' });
      test.include = ['**/*.e2e.ts'];
      break;

    default:
      throw new Error(`Unknown TEST_MODE: ${TEST_MODE}`);
  }

  return { test };
});
