// ESLint flat config. `BUILD_ENV=production` (set by build.sh) turns console usage into an error.
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const isProduction = process.env.BUILD_ENV === 'production';

export default defineConfig(
  {
    ignores: ['dist/', 'node_modules/', '.preview/', 'coverage/', '.claude/'],
  },
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': isProduction ? 'error' : 'warn',
    },
  },
  {
    // Build tooling reports to the terminal by design.
    files: ['scripts/**/*.mjs', 'pack-tools/**/*.mts'],
    rules: {
      'no-console': 'off',
    },
  },
);
