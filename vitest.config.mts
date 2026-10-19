import { defineConfig } from 'vitest/config';

// Pure-logic tests only; anything touching `wx` stubs it with vi.stubGlobal.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
