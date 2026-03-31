import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.unit.ts'],
    globals: true,
    environment: 'node',
    env: {
      APP_STAGE: 'test',
    },
  },
});
