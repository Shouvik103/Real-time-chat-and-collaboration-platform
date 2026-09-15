/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/prisma/**',
    '!src/config/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 65,
      lines: 60,
      statements: 60,
    },
  },
  clearMocks: true,
};
