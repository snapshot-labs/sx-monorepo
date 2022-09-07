module.exports = {
  roots: ['<rootDir>/test'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  extraGlobals: ['Math'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '/test(/(integration|unit))?/.*\\.test\\.ts$'
};
