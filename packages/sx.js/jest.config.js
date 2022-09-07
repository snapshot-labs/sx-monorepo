module.exports = {
  roots: ['<rootDir>/test'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '/test(/(integration|unit))?/.*\\.test\\.ts$'
};
