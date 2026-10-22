/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
