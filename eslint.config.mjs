import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import diff from 'eslint-plugin-diff';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      diff: diff,
    },
    processor: diff.processors.diff,
  },
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      'semi': 'error',
      'prefer-const': 'error',
      'no-unused-expressions': 'error',
      'lines-between-class-members': 'error',
    },
  },
  {
    files: ['common/services/fyle/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['e2e/**/*.ts', 'integration-tests/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-nested-step': 'off',
      'playwright/no-skipped-test': 'off',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-commented-out-tests': 'error',
      'playwright/no-raw-locators': 'error',
      'playwright/no-useless-await': 'error',
      'playwright/no-useless-not': 'error',
      'playwright/prefer-native-locators': 'error',
      'playwright/expect-expect': 'error',
    },
  },
];
