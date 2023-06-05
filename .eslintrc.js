module.exports = {
  env: {
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jest/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:security/recommended',
  ],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    project: ['./tsconfig.json'], // Specify it only for TypeScript files
  },
  plugins: ['@typescript-eslint', 'jest', 'prettier', 'security'],
  rules: {
    'no-var': 'error',
    semi: 'error',
    'no-multi-spaces': 'error',
    'space-in-parens': 'error',
    'no-multiple-empty-lines': 'error',
    'prefer-const': 'error',
    'no-console': 'error',
    'lines-between-class-members': ['error', 'always'],
    'no-ex-assign': 0,
    'security/detect-object-injection': 0,
    '@typescript-eslint/no-explicit-any': 0, // TODO later we need to check
    '@typescript-eslint/no-unsafe-assignment': 0, // TODO later we need to check
    '@typescript-eslint/no-unsafe-call': 0, // TODO later we need to check
    '@typescript-eslint/no-unsafe-member-access': 0, // TODO later we need to check
    '@typescript-eslint/ban-types': 0, // TODO later we need to check
    '@typescript-eslint/no-unsafe-argument': 0, // TODO later we need to check
    '@typescript-eslint/no-unsafe-return': 0, // TODO later we need to check
  },
};
