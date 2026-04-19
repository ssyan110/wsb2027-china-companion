import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts'],
    },
  },
});
