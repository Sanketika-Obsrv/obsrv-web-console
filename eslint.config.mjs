import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-plugin-prettier/recommended';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'public/',
      'web-console-v2/',
      'coverage/',
      '.eslintcache',
      '*.tgz',
      '*.tsbuildinfo',
      '*.log',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  security.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2021,
      },
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      jest,
    },
    rules: {
      ...jest.configs.recommended.rules,
      'no-var': 'error',
      semi: 'error',
      'no-multi-spaces': 'error',
      'space-in-parens': 'error',
      'no-multiple-empty-lines': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
      'lines-between-class-members': ['error', 'always'],
      'no-ex-assign': 'off',
      'security/detect-object-injection': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // TODO later we need to check
      '@typescript-eslint/no-unsafe-assignment': 'off', // TODO later we need to check
      '@typescript-eslint/no-unsafe-call': 'off', // TODO later we need to check
      '@typescript-eslint/no-unsafe-member-access': 'off', // TODO later we need to check
      '@typescript-eslint/no-unsafe-argument': 'off', // TODO later we need to check
      '@typescript-eslint/no-unsafe-return': 'off', // TODO later we need to check
    },
  },
);
