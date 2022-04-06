/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  // All imported modules in your tests should be mocked automatically
  // automock: false,

  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',

  // An array of regexp pattern strings used to skip coverage collection
  // coveragePathIgnorePatterns: [
  //   "/node_modules/"
  // ],

  moduleDirectories: ['node_modules', 'src'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  //setupFilesAfterEnv: ['<rootDir>src/setupTests.ts'],
  moduleFileExtensions: ['js', 'ts']
};
