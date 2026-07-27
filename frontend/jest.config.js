export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-dom/jest-globals', 'jest-axe/extend-expect'],
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(scss|css)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
}
