module.exports = {
  setupFiles: ['<rootDir>/setup.ts'],
  sandboxInjectedGlobals: ['Math'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest']
  }
};
