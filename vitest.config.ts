import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    // Database tests build a whole Postgres with every migration; it grows with each one.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
