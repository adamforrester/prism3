// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommendedTypeChecked,

  // Prettier config to disable conflicting rules
  prettierConfig,

  // Global configuration
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // ES2018 Compatibility - Prevent ES2019+ features
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      // Type Safety - Reduce 'any' usage
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // Code Quality
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Best Practices
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['warn', 'all'],

      // Import organization
      'import/order': ['warn', {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      }],
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'test-examples/**',
      'tests/**',
      'src/legacy/**',
      '*.js',
      '**/*.js',
      'vite.config.ts',
      'vite.config.simple.ts',
    ],
  }
);
