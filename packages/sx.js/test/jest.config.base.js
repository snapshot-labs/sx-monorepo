module.exports = {
  setupFiles: ['<rootDir>/setup.ts'],
  extraGlobals: ['Math'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
