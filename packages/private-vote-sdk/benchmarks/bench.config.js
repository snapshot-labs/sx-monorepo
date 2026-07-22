/**
 * Jest config for benchmarks. Picks up `*.bench.ts` under benchmarks/ and
 * does not touch the main `npm test` run.
 *
 * Usage: `npm run bench` (see package.json).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: ['<rootDir>/benchmarks/**/*.bench.ts'],
  // Benchmarks print to stdout; don't swallow output.
  silent: false,
  // Long-running ops (BSGS at 10^5, full ballot across grid) need more headroom.
  testTimeout: 300_000,
  // Reset caches but keep ts-jest's compile cache between files.
  clearMocks: false,
};
