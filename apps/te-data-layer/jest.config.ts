export default {
  clearMocks: true,
  collectCoverage: false,
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  testPathIgnorePatterns: ['dist/', '/node_modules/'],
  verbose: true
};
