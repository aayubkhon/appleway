/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Use the shared package's TypeScript source, as Metro does, so tests never
  // run against a stale build.
  moduleNameMapper: {
    '^@appleway/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
