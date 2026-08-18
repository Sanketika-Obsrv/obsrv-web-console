/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // web-console-v2 has its own react-scripts test runner; keep this config on the server.
  roots: ['<rootDir>/src'],
};
