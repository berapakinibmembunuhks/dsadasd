export default {
  preset: 'ts-jest',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/spec/**',
    '!src/**/*.cli.ts',  // Exclude CLI-specific functionality
    '!src/**/*.d.ts',    // Exclude type definitions
    '!src/**/*.spec.ts', // Exclude tests
    '!src/**/index.ts',
    '!src/**/main.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'target/coverage',
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: 'run-z',
        outputDirectory: './target/test-results',
        classNameTemplate: '{classname}: {title}',
        titleTemplate: '{classname}: {title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
      },
    ],
  ],
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      packageJson: 'package.json',
      tsConfig: 'tsconfig.spec.json',
    },
  },
};
