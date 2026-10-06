import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // tests/debug holds balance/diagnostic tools: run them with `npm run sim:batch` etc.
    include: process.env.SIM_TOOLS ? ['tests/debug/**/*.test.ts'] : ['tests/**/*.test.ts'],
    exclude: process.env.SIM_TOOLS ? ['node_modules/**'] : ['tests/debug/**', 'node_modules/**'],
    testTimeout: 600_000,
  },
});
